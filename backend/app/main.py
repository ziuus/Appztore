import json
import logging
import os
import platform
import re
import subprocess
import time
from functools import lru_cache, wraps
from threading import Lock

from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError
from flask import Flask, jsonify, request, Response
from flask_cors import CORS
import litellm
from litellm import completion

load_dotenv()

# Simple in-memory cache with TTL
_cache_lock = Lock()
_result_cache = {}  # key: (func_name, args_tuple), value: (result, timestamp)
CACHE_TTL_SECONDS = 120  # 2 minutes


def cached_with_ttl(ttl_seconds=CACHE_TTL_SECONDS):
    """Decorator to cache function results with TTL."""

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Create a cache key from function name and args
            key = (func.__name__, str(args), str(sorted(kwargs.items())))

            with _cache_lock:
                # Check if cached and not expired
                if key in _result_cache:
                    result, timestamp = _result_cache[key]
                    if time.time() - timestamp < ttl_seconds:
                        return result

            # Call the function
            result = func(*args, **kwargs)

            with _cache_lock:
                _result_cache[key] = (result, time.time())

            return result

        return wrapper

    return decorator


def clear_cache():
    """Clear the search cache."""
    global _result_cache
    with _cache_lock:
        _result_cache = {}


# Configure LiteLLM to not send telemetry
litellm.telemetry = False
litellm.drop_params = True  # Auto-drop unsupported params per provider

# Setup Logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("appztore-backend")

app = Flask(__name__)


def _parse_csv_env(name, default=""):
    raw = os.environ.get(name, default)
    return [x.strip() for x in raw.split(",") if x.strip()]


# Security: Content Type Check
@app.before_request
def check_content_type():
    if request.method == "POST" and not request.is_json:
        return jsonify({"error": "Content-Type must be application/json"}), 415


# Setup CORS with explicit support for Tauri and Auth headers
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "tauri://localhost",
                "http://tauri.localhost",
            ],
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
        }
    },
)

# ... existing code ...


@app.errorhandler(500)
def handle_500(e):
    logger.error(f"Internal Server Error: {e}")
    return jsonify({"error": "Internal server error"}), 500


@app.errorhandler(404)
def handle_404(e):
    return jsonify({"error": "Not found"}), 404


# =============================================================================
# AI Provider System - Powered by LiteLLM (100+ Providers Unified)
# =============================================================================
#
# LiteLLM provides a single OpenAI-compatible interface for 100+ LLMs:
# - OpenAI, Anthropic, Groq, Google Gemini, Mistral, Together AI
# - AWS Bedrock, Azure OpenAI, Ollama, vLLM, Fireworks, Perplexity
# - And many more...
#
# Model Format: "provider/model_name"
# Examples:
# - "groq/llama-3.3-70b-versatile"
# - "openai/gpt-4o"
# - "anthropic/claude-3-5-sonnet-20241022"
# - "gemini/gemini-2.0-flash"
# - "ollama/llama3.1:8b" (local)
#
# Environment Variables (auto-detected by LiteLLM):
# - GROQ_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY
# - AZURE_API_KEY, AWS_ACCESS_KEY_ID, etc.
# =============================================================================

DEVELOPMENT = os.environ.get("DEVELOPMENT", "false").lower() == "true"
MOCK = os.environ.get("MOCK", "false").lower() == "true"

# Provider priority order for default model
PROVIDER_PRIORITY = [
    ("GROQ_API_KEY", "groq/llama-3.3-70b-versatile"),
    ("OPENAI_API_KEY", "openai/gpt-4o-mini"),
    ("ANTHROPIC_API_KEY", "anthropic/claude-3-5-sonnet-20241022"),
    ("GOOGLE_API_KEY", "gemini/gemini-2.0-flash"),
]

# Find first available provider for default model
DEFAULT_AI_MODEL = None
for env_var, default_model in PROVIDER_PRIORITY:
    if os.environ.get(env_var):
        DEFAULT_AI_MODEL = default_model
        print(
            f"AI: Default provider detected - {default_model.split('/')[0].upper()}",
            flush=True,
        )
        break

if not DEFAULT_AI_MODEL:
    print("AI: No default API keys found. Using keyword fallback.", flush=True)
else:
    print(f"AI: Default model: {DEFAULT_AI_MODEL}", flush=True)


def detect_provider_from_key(api_key: str) -> str:
    """
    Try to detect the provider from an API key format.
    Returns the provider prefix for LiteLLM.
    """
    if not api_key:
        return None

    # Groq keys: gsk_...
    if api_key.startswith("gsk_"):
        return "groq"

    # Anthropic keys often start with sk-ant- (check BEFORE generic sk-)
    if api_key.startswith("sk-ant-"):
        return "anthropic"

    # OpenAI keys: sk-...
    # sk-proj-... is OpenAI project key
    if api_key.startswith("sk-"):
        # Default to OpenAI for sk-*, but user can override with explicit provider
        return "openai"

    # Google AI Studio keys: AI...
    if api_key.startswith("AI"):
        return "gemini"

    # Mistral keys often start with "uk-" or "bb-"
    if api_key.startswith("uk-") or api_key.startswith("bb-"):
        return "mistral"

    return None


def get_ai_config(api_key: str = None, provider: str = None, model: str = None):
    """
    Unified AI configuration using LiteLLM.

    Args:
        api_key: Optional API key for BYOK
        provider: Optional provider override (e.g., "groq", "openai", "anthropic")
        model: Optional full model string or model name without provider

    Returns:
        Tuple of (model_string, api_key_dict) for use with litellm.completion()
        Returns (None, None) if no AI available
    """
    if MOCK:
        return None, None

    # Case 1: BYOK with explicit key
    if api_key:
        # Detect provider if not specified
        if not provider:
            provider = detect_provider_from_key(api_key)

        # If model is provided with provider prefix, use it directly
        if model and "/" in model:
            full_model = model
        elif model and provider:
            full_model = f"{provider}/{model}"
        elif provider:
            # Use default models per provider
            default_models = {
                "groq": "groq/llama-3.3-70b-versatile",
                "openai": "openai/gpt-4o-mini",
                "anthropic": "anthropic/claude-3-5-sonnet-20241022",
                "gemini": "gemini/gemini-2.0-flash",
                "mistral": "mistral/mistral-large-latest",
                "together": "together_ai/meta-llama/Llama-3-70b-chat-hf",
                "perplexity": "perplexity/llama-3.1-sonar-large-128k-online",
                "fireworks": "fireworks_ai/llama-v3p1-405b-instruct",
            }
            full_model = default_models.get(provider, f"{provider}/default")
        else:
            # Couldn't determine provider, default to OpenAI format
            full_model = "openai/gpt-4o-mini"

        # Return config with explicit API key
        api_kwargs = {"api_key": api_key}

        # Add base_url for providers that need it (OpenAI-compatible endpoints)
        if provider == "groq":
            api_kwargs["api_base"] = "https://api.groq.com/openai/v1"

        return full_model, api_kwargs

    # Case 2: Use default provider from environment
    if DEFAULT_AI_MODEL:
        # Check if model override was provided
        if model:
            if "/" in model:
                return model, {}  # Full model string provided
            # Try to use same provider with different model
            provider_prefix = DEFAULT_AI_MODEL.split("/")[0]
            return f"{provider_prefix}/{model}", {}

        return DEFAULT_AI_MODEL, {}

    # No AI available
    return None, None


def ai_complete(model: str, messages: list, api_kwargs: dict = None, **kwargs):
    """
    Unified AI completion using LiteLLM.

    Works with 100+ providers through a single interface.
    Response format is OpenAI-compatible.

    Example:
        response = ai_complete(
            model="groq/llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": "Hello"}],
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content

    Args:
        model: Full LiteLLM model string (provider/model)
        messages: List of message dicts
        api_kwargs: Dict with api_key, api_base, etc.
        **kwargs: Additional args for completion (temperature, response_format, etc.)

    Returns:
        OpenAI-compatible response object
    """
    if api_kwargs is None:
        api_kwargs = {}

    return completion(model=model, messages=messages, **api_kwargs, **kwargs)


# Backward compatibility aliases (for code that still uses old get_ai_client pattern)
# These will be phased out
def get_ai_client(api_key=None):
    """
    Deprecated: Use get_ai_config() and ai_complete() instead.
    Kept for backward compatibility during transition.
    """
    model, api_kwargs = get_ai_config(api_key)
    if not model:
        return None, None
    # Return a "client" that's actually just the model + kwargs tuple
    # We'll handle this specially in the calling code
    return (model, api_kwargs), model


# For backward compatibility - we'll need to update call sites
# The old pattern was: client.chat.completions.create(...)
# New pattern is: ai_complete(model, messages, ...)


API_TOKEN = os.environ.get("APP_API_TOKEN")


def _require_auth():
    if not API_TOKEN:
        return None
    auth = request.headers.get("Authorization", "")
    if auth == f"Bearer {API_TOKEN}":
        return None
    return jsonify({"error": "unauthorized"}), 401


# Mock Database (will be replaced by dynamic search)
MOCK_REGISTRY = []


# Specific high-fidelity image mapping to avoid broken/generic images
APP_ASSETS = {
    "org.videolan.VLC": {
        "icon": "https://upload.wikimedia.org/wikipedia/commons/e/e6/VLC_Icon.svg",
        "hero": "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=1200",
    },
    "org.mozilla.firefox": {
        "icon": "https://upload.wikimedia.org/wikipedia/commons/a/a0/Firefox_logo%2C_2019.svg",
        "hero": "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=1200",
    },
    "com.visualstudio.code": {
        "icon": "https://upload.wikimedia.org/wikipedia/commons/9/9a/Visual_Studio_Code_1.35_icon.svg",
        "hero": "https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=1200",
    },
    "com.valvesoftware.Steam": {
        "icon": "https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg",
        "hero": "https://images.unsplash.com/photo-1580234797602-22c37b2a6230?q=80&w=1200",
    },
    "org.gimp.GIMP": {
        "icon": "https://upload.wikimedia.org/wikipedia/commons/4/45/The_GIMP_icon_-_gnome.svg",
        "hero": "https://images.unsplash.com/photo-1558655146-d09347e92766?q=80&w=1200",
    },
    "org.inkscape.Inkscape": {
        "icon": "https://upload.wikimedia.org/wikipedia/commons/0/0d/Inkscape_logo.svg",
        "hero": "https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=1200",
    },
    "org.kde.krita": {
        "icon": "https://upload.wikimedia.org/wikipedia/commons/7/73/Krita-logo.svg",
        "hero": "https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?q=80&w=1200",
    },
    "md.obsidian.Obsidian": {
        "icon": "https://upload.wikimedia.org/wikipedia/commons/1/10/Obsidian_logo.svg",
        "hero": "https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=1200",
    },
    "org.blender.Blender": {
        "icon": "https://upload.wikimedia.org/wikipedia/commons/0/0c/Blender_logo_no_text.svg",
        "hero": "https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=1200",
    },
    "org.gimp.GIMP": {
        "icon": "https://upload.wikimedia.org/wikipedia/commons/4/45/The_GIMP_icon_-_gnome.svg",
        "hero": "https://images.unsplash.com/photo-1558655146-d09347e92766?q=80&w=1200",
    },
    "org.kde.krita": {
        "icon": "https://upload.wikimedia.org/wikipedia/commons/7/73/Krita-logo.svg",
        "hero": "https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?q=80&w=1200",
    },
    "org.inkscape.Inkscape": {
        "icon": "https://upload.wikimedia.org/wikipedia/commons/0/0d/Inkscape_logo.svg",
        "hero": "https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=1200",
    },
    "org.videolan.VLC": {
        "icon": "https://upload.wikimedia.org/wikipedia/commons/e/e6/VLC_Icon.svg",
        "hero": "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=1200",
    },
    "com.obsproject.Studio": {
        "icon": "https://upload.wikimedia.org/wikipedia/commons/d/d3/OBS_Studio_logo.svg",
        "hero": "https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?q=80&w=1200",
    },
    "org.mozilla.firefox": {
        "icon": "https://upload.wikimedia.org/wikipedia/commons/a/a0/Firefox_logo%2C_2019.svg",
        "hero": "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=1200",
    },
    "org.gnome.Terminal": {
        "icon": "https://upload.wikimedia.org/wikipedia/commons/0/00/Terminal_icon.svg",
        "hero": "https://images.unsplash.com/photo-1629654297299-c8506221ca97?q=80&w=1200",
    },
    "org.gnome.Nautilus": {
        "icon": "https://upload.wikimedia.org/wikipedia/commons/e/ec/Nautilus_icon.svg",
        "hero": "https://images.unsplash.com/photo-1544391496-1ca7c97457cd?q=80&w=1200",
    },
    "org.kde.dolphin": {
        "icon": "https://upload.wikimedia.org/wikipedia/commons/3/36/Dolphin-icon.svg",
        "hero": "https://images.unsplash.com/photo-1544391496-1ca7c97457cd?q=80&w=1200",
    },
    "org.gnome.Calculator": {
        "icon": "https://upload.wikimedia.org/wikipedia/commons/4/4c/Calculator_icon.svg",
        "hero": "https://images.unsplash.com/photo-1554224155-1696413565d3?q=80&w=1200",
    },
    "com.discordapp.Discord": {
        "icon": "https://upload.wikimedia.org/wikipedia/commons/7/73/Discord_Color_Logo.svg",
        "hero": "https://images.unsplash.com/photo-1614680376593-902f74cf0d41?q=80&w=1200",
    },
}


def categorize_app(name, description, app_id=""):
    """Categorize an application based on its name, description and ID."""
    text = f"{name} {description} {app_id}".lower()

    if any(x in text for x in ["game", "steam", "gaming", "kart", "retroarch", "emu"]):
        return "Gaming"
    elif any(
        x in text
        for x in ["code", "dev", "ide", "studio", "vim", "git", "compiler", "terminal"]
    ):
        return "Development"
    elif any(
        x in text
        for x in [
            "gimp",
            "krita",
            "paint",
            "design",
            "draw",
            "photo",
            "image",
            "inkscape",
            "blender",
            "3d",
        ]
    ):
        return "Design"
    elif any(
        x in text
        for x in ["vlc", "video", "media", "player", "movie", "obs-studio", "handbrake"]
    ):
        return "Video"
    elif any(
        x in text for x in ["music", "audio", "sound", "spotify", "audacity", "ardour"]
    ):
        return "Audio & Music"
    elif any(
        x in text
        for x in [
            "chat",
            "message",
            "discord",
            "slack",
            "telegram",
            "whatsapp",
            "signal",
            "zoom",
            "teams",
        ]
    ):
        return "Communication"
    elif any(
        x in text for x in ["browser", "firefox", "chrome", "web", "internet", "brave"]
    ):
        return "Web Browser"
    elif any(
        x in text
        for x in [
            "office",
            "document",
            "spreadsheet",
            "libreoffice",
            "onlyoffice",
            "obsidian",
            "notion",
        ]
    ):
        return "Productivity"
    elif any(
        x in text
        for x in ["ai", "gpt", "llama", "stable-diffusion", "neural", "tensor"]
    ):
        return "AI Tools"
    else:
        return "Utilities"


def get_app_assets(app_id, name):
    """Retrieve high-fidelity assets for a specific app_id."""
    if app_id in APP_ASSETS:
        return APP_ASSETS[app_id]

    # Check if a substring match exists for common IDs
    for key, assets in APP_ASSETS.items():
        if key.lower() in app_id.lower() or app_id.lower() in key.lower():
            return assets

    # Use Flathub remote icons directly if app_id looks like a Flatpak ID
    if "." in app_id and len(app_id.split(".")) >= 3:
        icon_url = (
            f"https://dl.flathub.org/repo/appstream/x86_64/icons/128x128/{app_id}.png"
        )
    else:
        # Dynamic generation fallback (Initials look like sleek app logos)
        from urllib.parse import quote

        encoded_name = quote(name)
        icon_url = f"https://api.dicebear.com/7.x/initials/svg?seed={encoded_name}&backgroundColor=030303&fontSize=45&fontFamily=Arial"

    return {
        "icon": icon_url,
        "hero": "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=1200",
    }


@cached_with_ttl(ttl_seconds=180)  # 3 minutes cache for flatpak (slow network call)
def get_flatpak_apps(search_term=None):
    """Fetch apps from Flathub using flatpak search command."""
    try:
        cmd = ["flatpak", "search", "--columns=name,application,description"]
        if search_term:
            cmd.extend(search_term.split())
        else:
            cmd.append("editor")

        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=10
        )  # Increased: 3s -> 10s
        if result.returncode != 0:
            return []

        apps = []
        lines = result.stdout.strip().split("\n")
        if not lines or "No matches found" in lines[0]:
            return []

        for line in lines[:30]:  # Limit results
            if not line.strip() or "Name\tApplication ID" in line or "Name " in line:
                continue
            parts = line.split("\t")
            if len(parts) >= 3:
                name, app_id, description = parts[0], parts[1], parts[2]

                # Skip runtimes/extensions
                if any(
                    x.lower() in app_id.lower()
                    for x in [".platform", ".sdk", ".locale", ".debug", ".runtime"]
                ):
                    continue

                assets = get_app_assets(app_id, name)
                apps.append(
                    {
                        "id": app_id,
                        "name": name,
                        "developer": "Flathub",
                        "category": categorize_app(name, description, app_id),
                        "description": description.strip(),
                        "icon_url": assets["icon"],
                        "install_tier": 2,
                        "hero_image": assets["hero"],
                        "install_command": f"flatpak install -y flathub {app_id}",
                        "source": "flatpak",
                        "rating": 4.8,
                        "downloads": "1M+",
                    }
                )
        return apps
    except Exception as e:
        logger.error(f"Flatpak error: {e}")
        return []


def get_system_icon(name):
    """Try to find a local icon for a given package name."""
    from urllib.parse import quote

    encoded_name = quote(name)
    # Using DiceBear as a high-quality fallback that looks like a modern app icon
    return f"https://api.dicebear.com/7.x/initials/svg?seed={encoded_name}&backgroundColor=030303&fontSize=45&fontFamily=Arial"


@cached_with_ttl(ttl_seconds=120)
def get_pacman_apps(search_term=None):
    """Fetch applications from Arch Linux official repositories."""
    try:
        cmd = ["pacman", "-Ss"]
        if search_term:
            cmd.extend(search_term.split())
        else:
            cmd = ["pacman", "-Ssq"]

        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=5
        )  # 8s -> 5s
        if result.returncode != 0:
            return []

        apps = []
        if search_term:
            # Pacman -Ss output format:
            # repo/name version [installed]
            #     description
            lines = result.stdout.strip().split("\n")
            for i in range(0, len(lines), 2):
                if i + 1 >= len(lines):
                    break
                header = lines[i]
                description = lines[i + 1].strip()

                # Extract repo and name from "repo/name version ..."
                match = re.match(r"^([^/]+)/([^\s]+)\s+", header)
                if match:
                    repo = match.group(1)
                    name = match.group(2)

                    apps.append(
                        {
                            "id": f"arch:{name}",
                            "name": name,
                            "developer": f"Arch Linux {repo}",
                            "category": categorize_app(name, description),
                            "description": description,
                            "icon_url": get_system_icon(name),
                            "install_tier": 1,
                            "hero_image": f"https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=800&auto=format&fit=crop",
                            "install_command": f"pkexec pacman -S --noconfirm {name}",
                            "source": "arch",
                        }
                    )

        else:
            # Sample popular ones
            names = result.stdout.strip().split("\n")[:5]
            for name in names:
                if not name.strip():
                    continue
                info_result = subprocess.run(
                    ["pacman", "-Si", name], capture_output=True, text=True, timeout=5
                )
                if info_result.returncode == 0:
                    info = {}
                    for line in info_result.stdout.split("\n"):
                        if ":" in line:
                            k, v = line.split(":", 1)
                            info[k.strip()] = v.strip()

                    apps.append(
                        {
                            "id": f"arch:{name}",
                            "name": info.get("Name", name),
                            "developer": f"Arch Linux {info.get('Repository', 'unknown')}",
                            "category": categorize_app(
                                name, info.get("Description", "")
                            ),
                            "description": info.get("Description", ""),
                            "icon_url": "https://via.placeholder.com/128",
                            "install_tier": 1,
                            "hero_image": "https://via.placeholder.com/800x400",
                            "install_command": f"pkexec pacman -S --noconfirm {name}",
                            "source": "arch",
                        }
                    )

        return apps
    except Exception:
        return []


def get_system_icon(name):
    """Try to find a local icon for a given package name."""
    from urllib.parse import quote

    encoded_name = quote(name)
    return f"https://api.dicebear.com/7.x/identicon/svg?seed={encoded_name}&backgroundColor=030303"


@cached_with_ttl(ttl_seconds=120)
def get_yay_apps(search_term=None):
    """Fetch applications from Arch User Repository (AUR) via yay."""
    try:
        cmd = ["yay", "-Ss"]
        if search_term:
            cmd.extend(search_term.split())
        else:
            return get_popular_aur_apps()

        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=8
        )  # 20s -> 8s
        if result.returncode != 0:
            return []

        apps = []
        lines = result.stdout.strip().split("\n")
        # Yay output is also multi-line: header then description
        for i in range(0, len(lines), 2):
            if i + 1 >= len(lines):
                break
            header = lines[i]
            description = lines[i + 1].strip()

            # Match aur/name or similar
            match = re.match(r"^(aur/)?([^\s]+)\s+", header)
            if match:
                name = match.group(2)

                apps.append(
                    {
                        "id": f"aur:{name}",
                        "name": name,
                        "developer": "AUR Community",
                        "category": categorize_app(name, description),
                        "description": description,
                        "icon_url": get_system_icon(name),
                        "install_tier": 2,
                        "hero_image": f"https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=800&auto=format&fit=crop",
                        "install_command": f"yay -S --noconfirm {name}",
                        "source": "aur",
                    }
                )

        return apps
    except Exception:
        return []


def get_popular_aur_apps():
    """Return some popular AUR apps when no search term is provided."""
    popular_aur = [
        {
            "name": "yay",
            "desc": "Yet another yogurt. Pacman wrapper and AUR helper written in go",
        },
        {"name": "paru", "desc": "Feature packed AUR helper"},
        {
            "name": "visual-studio-code-bin",
            "desc": "Visual Studio Code (Binary Package)",
        },
        {"name": "google-chrome", "desc": "The popular web browser by Google"},
        {"name": "discord", "desc": "All-in-one voice and text chat for gamers"},
    ]

    apps = []
    for app_info in popular_aur:
        apps.append(
            {
                "id": f"aur:{app_info['name']}",
                "name": app_info["name"],
                "developer": "AUR Community",
                "category": categorize_app(app_info["name"], app_info["desc"]),
                "description": app_info["desc"],
                "icon_url": "https://via.placeholder.com/128",
                "install_tier": 2,
                "hero_image": "https://via.placeholder.com/800x400",
                "install_command": f"yay -S --noconfirm {app_info['name']}",
                "source": "aur",
            }
        )
    return apps


def get_docker_apps(search_term=None):
    """Fetch popular Docker images from Docker Hub."""
    try:
        popular_images = [
            {"name": "nginx", "desc": "Official NGINX Docker image"},
            {"name": "mysql", "desc": "Official MySQL Docker image"},
            {"name": "postgres", "desc": "Official PostgreSQL Docker image"},
            {"name": "redis", "desc": "Official Redis Docker image"},
            {"name": "mongo", "desc": "Official MongoDB Docker image"},
            {"name": "wordpress", "desc": "Official WordPress Docker image"},
            {"name": "python", "desc": "Official Python Docker image"},
            {"name": "node", "desc": "Official Node.js Docker image"},
        ]

        apps = []
        for img in popular_images:
            if (
                not search_term
                or search_term.lower() in img["name"].lower()
                or search_term.lower() in img["desc"].lower()
            ):
                apps.append(
                    {
                        "id": f"docker:{img['name']}",
                        "name": img["name"],
                        "developer": "Docker Hub Official",
                        "category": categorize_app(
                            img["name"], img["desc"], f"docker:{img['name']}"
                        ),
                        "description": img["desc"],
                        "icon_url": f"https://api.dicebear.com/7.x/identicon/svg?seed=docker-{img['name']}&backgroundColor=030303",
                        "install_tier": 2,
                        "hero_image": "https://images.unsplash.com/photo-1605745341112-85968b193ef5?q=80&w=800",
                        "install_command": f"docker run -d -p 8080:80 {img['name']}",
                        "source": "docker",
                        "is_container": True,
                    }
                )

        return apps
    except Exception as e:
        logger.error(f"Docker error: {e}")
        return []


def get_custom_build_apps(search_term=None):
    """Fetch applications that need to be built from source (from popular repos like GitHub trending)."""
    custom_apps = [
        {
            "id": "github:neovim/neovim",
            "name": "Neovim",
            "developer": "Neovim Team",
            "category": "Development",
            "description": "Vim-fork focused on extensibility and usability",
            "icon_url": "https://api.dicebear.com/7.x/initials/svg?seed=neovim&backgroundColor=030303&fontSize=45&fontFamily=Arial",
            "install_tier": 3,
            "hero_image": "https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=800",
            "install_command": "git clone https://github.com/neovim/neovim.git && cd neovim && make CMAKE_BUILD_TYPE=RelWithDebInfo && sudo make install",
            "source": "github",
        },
        {
            "id": "github:photoflare/photoflare",
            "name": "Photoflare",
            "developer": "Photoflare Team",
            "category": "Design",
            "description": "Quick, simple but powerful Cross Platform image editor.",
            "icon_url": "https://upload.wikimedia.org/wikipedia/commons/e/ec/Nautilus_icon.svg",
            "install_tier": 3,
            "hero_image": "https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=800",
            "install_command": "git clone https://github.com/photoflare/photoflare.git && cd photoflare && qmake && make && sudo make install",
            "source": "github",
        },
        {
            "id": "github:pixelitor/pixelitor",
            "name": "Pixelitor",
            "developer": "Pixelitor Devs",
            "category": "Design",
            "description": "Advanced image editor with support for layers, layer masks, text layers, multiple undo, blending modes, etc.",
            "icon_url": "https://api.dicebear.com/7.x/initials/svg?seed=pixelitor&backgroundColor=030303&fontSize=45&fontFamily=Arial",
            "install_tier": 3,
            "hero_image": "https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?q=80&w=800",
            "install_command": "git clone https://github.com/pixelitor/pixelitor.git && cd pixelitor && ./gradlew build",
            "source": "github",
        },
        {
            "id": "github:rapidraw/rapidraw",
            "name": "Rapidraw",
            "developer": "Rapidraw Org",
            "category": "Design",
            "description": "GPU-accelerated RAW image editor for fast processing.",
            "icon_url": "https://api.dicebear.com/7.x/initials/svg?seed=rapidraw&backgroundColor=030303&fontSize=45&fontFamily=Arial",
            "install_tier": 3,
            "hero_image": "https://images.unsplash.com/photo-1558655146-d09347e92766?q=80&w=800",
            "install_command": "git clone https://github.com/rapidraw/rapidraw.git && cd rapidraw && cmake . && make && sudo make install",
            "source": "github",
        },
    ]

    if search_term:
        search_lower = search_term.lower()
        return [
            app
            for app in custom_apps
            if search_lower in app["name"].lower()
            or search_lower in app["description"].lower()
        ]
    return custom_apps


def get_generic_linux_apps(cmd_name, search_term, source_label, install_template):
    """Generic helper for simple package manager searches."""
    import shutil

    if not shutil.which(cmd_name):
        return []

    try:
        if not search_term:
            return []

        cmd = []
        if cmd_name == "apt":
            cmd = ["apt-cache", "search", search_term]
        elif cmd_name == "dnf":
            cmd = ["dnf", "search", search_term]
        elif cmd_name == "snap":
            cmd = ["snap", "find", search_term]
        elif cmd_name == "zypper":
            cmd = ["zypper", "search", search_term]
        else:
            return []

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        if result.returncode != 0:
            return []

        apps = []
        lines = result.stdout.strip().split("\n")

        for line in lines[:20]:  # Limit results per source
            if not line.strip():
                continue

            name = ""
            description = ""

            if cmd_name == "apt":
                parts = line.split(" - ", 1)
                name = parts[0].strip()
                description = parts[1].strip() if len(parts) > 1 else ""
            elif cmd_name == "dnf":
                parts = line.split(" : ", 1)
                name = parts[0].strip()
                description = parts[1].strip() if len(parts) > 1 else ""
            elif cmd_name == "snap":
                # snap find output: Name  Version  Publisher  Notes  Summary
                parts = re.split(r"\s{2,}", line)
                if len(parts) >= 2 and parts[0] != "Name":
                    name = parts[0]
                    description = parts[-1]
                else:
                    continue
            elif cmd_name == "zypper":
                parts = line.split("|")
                if len(parts) >= 3:
                    name = parts[1].strip()
                    description = parts[2].strip()
                else:
                    continue

            if name:
                apps.append(
                    {
                        "id": f"{cmd_name}:{name}",
                        "name": name,
                        "developer": f"{source_label.upper()} Repository",
                        "category": categorize_app(name, description),
                        "description": description,
                        "icon_url": get_system_icon(name),
                        "install_tier": 1,
                        "hero_image": "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=800",
                        "install_command": install_template.format(name),
                        "source": source_label,
                    }
                )
        return apps
    except Exception as e:
        logger.error(f"Error in {cmd_name} search: {e}")
        return []


def get_snap_apps(search_term=None):
    return get_generic_linux_apps("snap", search_term, "snap", "sudo snap install {}")


def get_apt_apps(search_term=None):
    return get_generic_linux_apps("apt", search_term, "apt", "sudo apt install -y {}")


def get_dnf_apps(search_term=None):
    return get_generic_linux_apps("dnf", search_term, "dnf", "sudo dnf install -y {}")


def get_zypper_apps(search_term=None):
    return get_generic_linux_apps(
        "zypper", search_term, "zypper", "sudo zypper install -y {}"
    )


def get_appimage_apps(search_term=None):
    """Fetch apps that are available as AppImages (mock for now)."""
    # In a real impl, we'd query appimage.github.io or similar
    if not search_term:
        return []
    return []


def get_fast_apps(search_term=None):
    """Fetch apps from fast, local-first sources in parallel."""
    fast_funcs = [
        ("Pacman", get_pacman_apps),
        ("Yay", get_yay_apps),
        ("Docker", get_docker_apps),
        ("Custom", get_custom_build_apps),
    ]

    apps = []
    with ThreadPoolExecutor(max_workers=len(fast_funcs)) as executor:
        future_to_source = {
            executor.submit(func, search_term): source for source, func in fast_funcs
        }
        try:
            for future in as_completed(future_to_source, timeout=4):
                source = future_to_source[future]
                try:
                    results = future.result()
                    if results:
                        logger.info(f"[{source}] Found {len(results)} fast results")
                        apps.extend(results)
                except Exception as e:
                    logger.error(f"[{source}] Fast search failed: {e}")
        except Exception as e:
            logger.error(f"Fast parallel search timeout or error: {e}")

    return apps


def get_slow_apps(search_term=None):
    """Fetch apps from slow, network-dependent sources, yielding results as they complete."""
    slow_funcs = [
        ("Flatpak", get_flatpak_apps),
        ("Snap", get_snap_apps),
        ("APT", get_apt_apps),
        ("DNF", get_dnf_apps),
        ("Zypper", get_zypper_apps),
        ("AppImage", get_appimage_apps),
    ]

    with ThreadPoolExecutor(max_workers=len(slow_funcs)) as executor:
        future_to_source = {
            executor.submit(func, search_term): source for source, func in slow_funcs
        }
        try:
            for future in as_completed(future_to_source, timeout=15):
                source = future_to_source[future]
                try:
                    results = future.result()
                    if results:
                        logger.info(f"[{source}] Found {len(results)} slow results")
                        yield results  # Yield results as soon as they are ready
                except Exception as e:
                    logger.error(f"[{source}] Slow search failed: {e}")
        except Exception as e:
            logger.error(f"Slow parallel search timeout or error: {e}")


def get_all_available_apps(search_term=None):
    """DEPRECATED: Use get_fast_apps and get_slow_apps instead."""
    # This function is kept for reference but should not be used directly for new search logic.
    # The new two-stage search provides a better user experience.
    all_apps = get_fast_apps(search_term) + list(get_slow_apps(search_term))

    # Remove duplicates
    seen_ids = set()
    unique_apps = []
    for app in all_apps:
        if app["id"] not in seen_ids:
            seen_ids.add(app["id"])
            unique_apps.append(app)

    return unique_apps


# Initialize AI client
@app.route("/api/v1/search", methods=["POST"])
def search_apps():
    """
    New Two-Stage Search:
    1. Immediately returns fast, local results.
    2. Initiates a background task for slower, network-based searches.
    3. The frontend will use a separate streaming endpoint to get the slow results.
    """
    auth_err = _require_auth()
    if auth_err:
        return auth_err

    data = request.json or {}
    query_str = data.get("query", "")
    target_os = data.get("os", "linux").lower()

    print(f"Fast search started for: '{query_str}'", flush=True)

    # --- Stage 1: Get Fast, Local Results ---
    fast_apps = get_fast_apps(query_str if query_str else None)

    # Remove duplicates
    seen_ids = set()
    unique_fast_apps = []
    for app in fast_apps:
        if app["id"] not in seen_ids:
            seen_ids.add(app["id"])
            unique_fast_apps.append(app)

    # --- AI Ranking for Fast Results ---
    api_key = data.get("api_key")
    provider = data.get("provider")
    model_override = data.get("model")
    model, api_kwargs = get_ai_config(api_key, provider, model_override)

    final_results = unique_fast_apps
    intent = "fast_search"
    category = "unknown"

    if model and unique_fast_apps:
        try:
            registry_apps_text = ""
            for app in unique_fast_apps:
                registry_apps_text += f'- id: "{app["id"]}", name: "{app["name"]}", category: "{app["category"]}", description: "{app["description"][:100]}..."\n'

            system_prompt = f'You are an AI App Store engine. Rank apps from this registry for the query "{query_str}". Respond in JSON: {{"intent": "search", "category": "string", "matched_app_ids": []}}'

            response = ai_complete(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": query_str},
                ],
                api_kwargs=api_kwargs,
                response_format={"type": "json_object"},
                timeout=10.0,
            )

            ai_response = json.loads(response.choices[0].message.content)
            ai_matched_ids = ai_response.get("matched_app_ids", [])

            # Create a ranked list
            ranked_apps = []
            seen_ranked_ids = set()
            for app_id in ai_matched_ids:
                for app in unique_fast_apps:
                    if app["id"] == app_id and app_id not in seen_ranked_ids:
                        ranked_apps.append(app)
                        seen_ranked_ids.add(app_id)
                        break

            # Add remaining unranked apps
            for app in unique_fast_apps:
                if app["id"] not in seen_ranked_ids:
                    ranked_apps.append(app)

            final_results = ranked_apps
            intent = ai_response.get("intent", "ranked_search")
            category = ai_response.get("category", "unknown")

        except Exception as e:
            logger.error(f"AI ranking for fast results failed: {e}")

    return jsonify(
        {
            "intent": intent,
            "category": category,
            "results": final_results,
            "search_phase": "fast",
        }
    )


@app.route("/api/v1/search/stream", methods=["GET"])
def search_stream():
    """
    SSE endpoint to stream results from slow, network-based searches.
    Reads parameters from the query string.
    """
    query_str = request.args.get("query", "")
    # os = request.args.get("os", "linux") # os is not used in get_slow_apps
    # api_key = request.args.get("api_key") # api_key is not used in get_slow_apps
    # provider = request.args.get("provider") # provider is not used in get_slow_apps
    # model = request.args.get("model") # model is not used in get_slow_apps

    def generate():
        try:
            print(f"Background search stream started for: '{query_str}'", flush=True)
            # get_slow_apps is now a generator
            for app_batch in get_slow_apps(query_str if query_str else None):
                if not app_batch:
                    continue

                # Remove duplicates within the batch
                seen_ids = set()
                unique_apps = []
                for app in app_batch:
                    if app["id"] not in seen_ids:
                        seen_ids.add(app["id"])
                        unique_apps.append(app)

                if unique_apps:
                    event_data = json.dumps(
                        {
                            "intent": "background_search_result",
                            "category": "various",
                            "results": unique_apps,
                            "search_phase": "slow",
                        }
                    )
                    yield f"data: {event_data}\n\n"
                    print(
                        f"Sent {len(unique_apps)} slow results from '{unique_apps[0]['source']}' to client.",
                        flush=True,
                    )

        except Exception as e:
            print(f"Error in background search stream: {e}", flush=True)
            error_data = json.dumps(
                {"error": "Background search failed", "details": str(e)}
            )
            yield f"event: error\ndata: {error_data}\n\n"

        # Signal end of stream
        finally:
            complete_data = json.dumps({"search_phase": "slow_complete"})
            yield f"event: complete\ndata: {complete_data}\n\n"
            print("Background search stream completed.", flush=True)

    return Response(generate(), mimetype="text/event-stream")


@app.route("/api/v1/system/info", methods=["GET"])
def get_system_info():
    """Get system information for device-specific filtering."""
    auth_err = _require_auth()
    if auth_err:
        return auth_err
    try:
        import socket

        import psutil

        # Get system specs
        system_info = {
            "hostname": socket.gethostname(),
            "os": platform.system(),
            "os_version": platform.version(),
            "architecture": platform.machine(),
            "cpu": platform.processor(),
            "cpu_cores": psutil.cpu_count(logical=True),
            "cpu_physical_cores": psutil.cpu_count(logical=False),
            "memory_total_gb": round(psutil.virtual_memory().total / (1024**3), 2),
            "memory_available_gb": round(
                psutil.virtual_memory().available / (1024**3), 2
            ),
            "disk_total_gb": round(psutil.disk_usage("/").total / (1024**3), 2),
            "disk_used_gb": round(psutil.disk_usage("/").used / (1024**3), 2),
            "disk_free_gb": round(psutil.disk_usage("/").free / (1024**3), 2),
            "python_version": platform.python_version(),
            "available_sources": [],
        }

        # Check which package managers are available
        import shutil

        sources = []
        for cmd, name in [
            ("flatpak", "Flatpak"),
            ("pacman", "Pacman"),
            ("yay", "AUR"),
            ("docker", "Docker"),
        ]:
            if shutil.which(cmd):
                sources.append(name)
        system_info["available_sources"] = sources

        return jsonify(system_info)
    except Exception as e:
        print(f"Error getting system info: {e}", flush=True)
        return jsonify({"error": str(e)})


@app.route("/api/v1/system/apps", methods=["GET"])
@app.route("/api/v1/installed", methods=["GET"])
def get_installed_apps():
    """Get all installed applications from all available sources."""
    auth_err = _require_auth()
    if auth_err:
        return auth_err
    installed = []

    # Get installed Flatpak apps
    try:
        result = subprocess.run(
            [
                "flatpak",
                "--system",
                "list",
                "--app",
                "--columns=application,name,version",
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode == 0:
            for line in result.stdout.strip().split("\n"):
                if line.strip():
                    parts = line.split("\t")
                    if len(parts) >= 2:
                        installed.append(
                            {
                                "id": parts[0],
                                "name": parts[1],
                                "version": parts[2] if len(parts) > 2 else "unknown",
                                "source": "flatpak",
                                "install_method": "flatpak install --system "
                                + parts[0],
                            }
                        )
    except Exception as e:
        print(f"Error getting flatpak apps: {e}", flush=True)

    # Get installed Pacman apps
    try:
        result = subprocess.run(
            ["pacman", "-Qq"], capture_output=True, text=True, timeout=15
        )
        if result.returncode == 0:
            for line in result.stdout.strip().split("\n")[:50]:  # Limit to first 50
                if line.strip():
                    # Get version info
                    ver_result = subprocess.run(
                        ["pacman", "-Q", line.strip()],
                        capture_output=True,
                        text=True,
                        timeout=5,
                    )
                    version = "unknown"
                    if ver_result.returncode == 0 and " " in ver_result.stdout:
                        version = ver_result.stdout.strip().split()[1]

                    installed.append(
                        {
                            "id": f"arch:{line.strip()}",
                            "name": line.strip(),
                            "version": version,
                            "source": "pacman",
                            "install_method": f"sudo pacman -S {line.strip()}",
                        }
                    )
    except Exception as e:
        print(f"Error getting pacman apps: {e}", flush=True)

    # Get installed Docker containers
    try:
        result = subprocess.run(
            ["docker", "ps", "--format", "{{.ID}}|{{.Image}}|{{.Status}}|{{.Names}}"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0:
            for line in result.stdout.strip().split("\n"):
                if line.strip():
                    parts = line.split("|")
                    if len(parts) >= 4:
                        installed.append(
                            {
                                "id": f"docker:{parts[3]}",
                                "name": parts[3],
                                "version": parts[2],  # Status as version info
                                "source": "docker",
                                "image": parts[1],
                                "is_container": True,
                                "install_method": f"docker run -d {parts[1]}",
                            }
                        )
    except Exception as e:
        print(f"Error getting docker containers: {e}", flush=True)

    return jsonify({"total": len(installed), "apps": installed})


@app.route("/api/v1/resources", methods=["GET"])
def get_resource_usage():
    """Get current resource usage of the system."""
    auth_err = _require_auth()
    if auth_err:
        return auth_err
    try:
        import psutil

        # CPU usage per core
        cpu_per_core = psutil.cpu_percent(interval=1, percpu=True)

        # Memory details
        memory = psutil.virtual_memory()

        # Top CPU consuming processes
        top_cpu = []
        for proc in psutil.process_iter(["pid", "name", "cpu_percent"]):
            try:
                if proc.info["cpu_percent"] and proc.info["cpu_percent"] > 0.1:
                    top_cpu.append(
                        {
                            "pid": proc.info["pid"],
                            "name": proc.info["name"],
                            "cpu_percent": round(proc.info["cpu_percent"], 1),
                        }
                    )
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        top_cpu = sorted(top_cpu, key=lambda x: x["cpu_percent"], reverse=True)[:10]

        # Top memory consuming processes
        top_memory = []
        for proc in psutil.process_iter(["pid", "name", "memory_percent"]):
            try:
                if proc.info["memory_percent"] and proc.info["memory_percent"] > 0.1:
                    top_memory.append(
                        {
                            "pid": proc.info["pid"],
                            "name": proc.info["name"],
                            "memory_percent": round(proc.info["memory_percent"], 1),
                        }
                    )
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        top_memory = sorted(
            top_memory, key=lambda x: x["memory_percent"], reverse=True
        )[:10]

        return jsonify(
            {
                "cpu": {
                    "usage_percent": psutil.cpu_percent(interval=1),
                    "per_core": cpu_per_core,
                    "count": psutil.cpu_count(logical=True),
                },
                "memory": {
                    "total_gb": round(memory.total / (1024**3), 2),
                    "available_gb": round(memory.available / (1024**3), 2),
                    "used_gb": round(memory.used / (1024**3), 2),
                    "usage_percent": memory.percent,
                },
                "top_cpu_processes": top_cpu,
                "top_memory_processes": top_memory,
            }
        )
    except Exception as e:
        print(f"Error getting resource usage: {e}", flush=True)
        return jsonify({"error": str(e)})


@app.route("/api/v1/storage", methods=["GET"])
def get_storage_info():
    """Get storage usage information."""
    auth_err = _require_auth()
    if auth_err:
        return auth_err
    try:
        import psutil

        partitions = []
        for partition in psutil.disk_partitions():
            try:
                usage = psutil.disk_usage(partition.mountpoint)
                partitions.append(
                    {
                        "device": partition.device,
                        "mountpoint": partition.mountpoint,
                        "filesystem": partition.fstype,
                        "total_gb": round(usage.total / (1024**3), 2),
                        "used_gb": round(usage.used / (1024**3), 2),
                        "free_gb": round(usage.free / (1024**3), 2),
                        "usage_percent": usage.percent,
                    }
                )
            except PermissionError:
                pass

        # Flatpak disk usage
        flatpak_size = "unknown"
        try:
            result = subprocess.run(
                ["flatpak", "--system", "size"],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                flatpak_size = result.stdout.strip()
        except:
            pass

        return jsonify({"partitions": partitions, "flatpak_size": flatpak_size})
    except Exception as e:
        print(f"Error getting storage info: {e}", flush=True)
        return jsonify({"error": str(e)})


@app.route("/api/v1/featured", methods=["GET"])
def get_featured_collections():
    """Return trending, spotlight, and category-specific apps based on OS."""
    target_os = request.args.get("os", "linux").lower()

    def get_cmd(app_id, linux_cmd, win_id=None, mac_id=None):
        if target_os == "windows" and win_id:
            return f"winget install --id {win_id} --silent --accept-source-agreements"
        elif target_os == "macos" and mac_id:
            return f"brew install {mac_id}"
        return linux_cmd

    trending = [
        {
            "id": "org.videolan.VLC",
            "name": "VLC Media Player",
            "developer": "VideoLAN",
            "description": "The world's most popular open-source media player.",
            "category": "Media Player",
            "icon_url": "https://api.dicebear.com/7.x/identicon/svg?seed=vlc&backgroundColor=030303",
            "hero_image": "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=800",
            "install_command": get_cmd(
                "vlc", "flatpak install flathub org.videolan.VLC", "VideoLAN.VLC", "vlc"
            ),
            "source": "Official",
            "install_tier": 1,
            "rating": 4.9,
            "downloads": "50M+",
        },
        {
            "id": "org.mozilla.firefox",
            "name": "Firefox Browser",
            "developer": "Mozilla",
            "description": "Privacy-focused web browser that respects your data.",
            "category": "Web Browser",
            "icon_url": "https://api.dicebear.com/7.x/identicon/svg?seed=firefox&backgroundColor=030303",
            "hero_image": "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=800",
            "install_command": get_cmd(
                "firefox",
                "flatpak install flathub org.mozilla.firefox",
                "Mozilla.Firefox",
                "firefox",
            ),
            "source": "Official",
            "install_tier": 1,
            "rating": 4.7,
            "downloads": "100M+",
        },
        {
            "id": "com.visualstudio.code",
            "name": "VS Code",
            "developer": "Microsoft",
            "description": "Powerful code editor with an extensive extension ecosystem.",
            "category": "Development",
            "icon_url": "https://api.dicebear.com/7.x/identicon/svg?seed=vscode&backgroundColor=030303",
            "hero_image": "https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=800",
            "install_command": get_cmd(
                "vscode",
                "flatpak install flathub com.visualstudio.code",
                "Microsoft.VisualStudioCode",
                "visual-studio-code",
            ),
            "source": "Official",
            "install_tier": 1,
            "rating": 4.8,
            "downloads": "25M+",
        },
    ]

    games = [
        {
            "id": "com.valvesoftware.Steam",
            "name": "Steam",
            "developer": "Valve",
            "description": "The ultimate destination for playing, discussing, and creating games.",
            "category": "Gaming",
            "icon_url": "https://api.dicebear.com/7.x/identicon/svg?seed=steam&backgroundColor=030303",
            "hero_image": "https://images.unsplash.com/photo-1580234797602-22c37b2a6230?q=80&w=800",
            "install_command": get_cmd(
                "steam",
                "flatpak install flathub com.valvesoftware.Steam",
                "Valve.Steam",
                "steam",
            ),
            "source": "Official",
            "install_tier": 1,
            "rating": 4.9,
            "downloads": "200M+",
        },
        {
            "id": "org.supertuxkart.SuperTuxKart",
            "name": "SuperTuxKart",
            "developer": "STK Team",
            "description": "A 3D open-source arcade racer with various characters, tracks, and modes.",
            "category": "Gaming",
            "icon_url": "https://api.dicebear.com/7.x/identicon/svg?seed=stk&backgroundColor=030303",
            "hero_image": "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=800",
            "install_command": get_cmd(
                "stk",
                "flatpak install flathub org.supertuxkart.SuperTuxKart",
                "STK.SuperTuxKart",
                "supertuxkart",
            ),
            "source": "Official",
            "install_tier": 1,
            "rating": 4.5,
            "downloads": "5M+",
        },
    ]

    productivity = [
        {
            "id": "org.libreoffice.LibreOffice",
            "name": "LibreOffice",
            "developer": "The Document Foundation",
            "description": "The powerful open-source personal productivity suite.",
            "category": "Productivity",
            "icon_url": "https://api.dicebear.com/7.x/identicon/svg?seed=libreoffice&backgroundColor=030303",
            "hero_image": "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?q=80&w=800",
            "install_command": get_cmd(
                "libreoffice",
                "flatpak install flathub org.libreoffice.LibreOffice",
                "TheDocumentFoundation.LibreOffice",
                "libreoffice",
            ),
            "source": "Official",
            "install_tier": 1,
            "rating": 4.6,
            "downloads": "80M+",
        },
        {
            "id": "md.obsidian.Obsidian",
            "name": "Obsidian",
            "developer": "Obsidian",
            "description": "A powerful knowledge base that works on top of a local folder of plain text Markdown files.",
            "category": "Productivity",
            "icon_url": "https://api.dicebear.com/7.x/identicon/svg?seed=obsidian&backgroundColor=030303",
            "hero_image": "https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=800",
            "install_command": get_cmd(
                "obsidian",
                "flatpak install flathub md.obsidian.Obsidian",
                "Obsidian.Obsidian",
                "obsidian",
            ),
            "source": "Official",
            "install_tier": 1,
            "rating": 4.9,
            "downloads": "2M+",
        },
    ]

    education = [
        {
            "id": "net.ankiweb.Anki",
            "name": "Anki",
            "developer": "Damien Elmes",
            "description": "Powerful, intelligent flashcards. Remembering things just became much easier.",
            "category": "Education",
            "icon_url": "https://api.dicebear.com/7.x/identicon/svg?seed=anki&backgroundColor=030303",
            "hero_image": "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=800",
            "install_command": get_cmd(
                "anki", "flatpak install flathub net.ankiweb.Anki", "Anki.Anki", "anki"
            ),
            "source": "Official",
            "install_tier": 1,
            "rating": 4.8,
            "downloads": "10M+",
        },
        {
            "id": "org.stellarium.Stellarium",
            "name": "Stellarium",
            "developer": "Stellarium Team",
            "description": "A free open source planetarium for your computer.",
            "category": "Education",
            "icon_url": "https://api.dicebear.com/7.x/identicon/svg?seed=stellarium&backgroundColor=030303",
            "hero_image": "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=800",
            "install_command": get_cmd(
                "stellarium",
                "flatpak install flathub org.stellarium.Stellarium",
                "Stellarium.Stellarium",
                "stellarium",
            ),
            "source": "Official",
            "install_tier": 1,
            "rating": 4.9,
            "downloads": "3M+",
        },
    ]

    spotlight = {
        "title": "Build Smarter with AI-First Apps",
        "description": "Experience the next generation of applications powered by advanced machine learning models.",
        "apps": [
            {
                "id": "ai/chatgenius",
                "name": "ChatGenius",
                "icon": "https://api.dicebear.com/7.x/identicon/svg?seed=chatgenius",
                "color": "blue",
            },
            {
                "id": "ai/imagecraft",
                "name": "ImageCraft",
                "icon": "https://api.dicebear.com/7.x/identicon/svg?seed=imagecraft",
                "color": "pink",
            },
            {
                "id": "ai/codepilot",
                "name": "CodePilot",
                "icon": "https://api.dicebear.com/7.x/identicon/svg?seed=codepilot",
                "color": "green",
            },
            {
                "id": "ai/voicemaster",
                "name": "VoiceMaster",
                "icon": "https://api.dicebear.com/7.x/identicon/svg?seed=voicemaster",
                "color": "purple",
            },
        ],
    }

    our_apps = [
        {
            "id": "app/noteflow",
            "name": "NoteFlow AI",
            "desc": "Context-aware note taking",
        },
        {
            "id": "app/taskmaster",
            "name": "TaskMaster Pro",
            "desc": "Autonomous task scheduling",
        },
        {
            "id": "app/zenith",
            "name": "Zenith Browser",
            "desc": "Privacy-first AI browsing",
        },
    ]

    return jsonify(
        {
            "trending": trending,
            "games": games,
            "productivity": productivity,
            "education": education,
            "spotlight": spotlight,
            "our_apps": our_apps,
        }
    )


# Global settings for sources (would be persisted in a DB/JSON in real production)
USER_SOURCES = {
    "system": ["pacman", "yay"],
    "universal": ["flatpak", "appimage"],
    "dev": ["npm", "pip"],
    "gaming": ["steam", "wine"],
}


@app.route("/api/v1/install/insight", methods=["POST"])
def get_install_insight():
    """AI provides insight and potential issues for a specific installation."""
    data = request.json or {}
    app_id = data.get("app_id", "")
    api_key = data.get("api_key")
    provider = data.get("provider")
    model_override = data.get("model")

    # Get AI config using LiteLLM
    model, api_kwargs = get_ai_config(api_key, provider, model_override)

    prompt = f"""
    Analyze the installation of '{app_id}'.
    Identify potential dependency conflicts, system requirements, and 'AI Thoughts' on the process.
    Respond in JSON: {{
        "insights": ["string"],
        "risks": ["string"],
        "ai_thought": "string",
        "requires_user_decision": true|false,
        "decision_prompt": "string"
    }}
    """

    if not model:
        return jsonify(
            {
                "insights": ["Standard installation process"],
                "ai_thought": "Using keyword matching for safe install.",
            }
        )

    response = ai_complete(
        model=model,
        messages=[
            {"role": "system", "content": "You are a Linux System Expert."},
            {"role": "user", "content": prompt},
        ],
        api_kwargs=api_kwargs,
        response_format={"type": "json_object"},
    )
    return response.choices[0].message.content


@app.route("/api/v1/install/analyze-error", methods=["POST"])
def analyze_install_error():
    """AI analyzes installation logs to identify specific failures and suggest fixes."""
    data = request.json or {}
    app_id = data.get("app_id", "")
    command = data.get("command", "")
    error_logs = data.get("logs", "")
    api_key = data.get("api_key")
    provider = data.get("provider")
    model_override = data.get("model")

    # Get AI config using LiteLLM
    model, api_kwargs = get_ai_config(api_key, provider, model_override)

    if not model:
        return jsonify(
            {"analysis": "Manual verification required.", "fix_suggestion": None}
        )

    prompt = f"""
    The installation of '{app_id}' failed.
    COMMAND: {command}
    ERROR LOGS:
    {error_logs[-2000:]}

    Analyze the error logs and identify:
    1. EXACT REASON for failure (Dependency, Network, Permission, Conflict).
    2. A suggested FIX command if possible.
    3. AI perspective on why this happened.

    Respond with ONLY a JSON object:
    {{
        "reason": "string",
        "fix_command": "string or null",
        "ai_insight": "string",
        "severity": "critical" | "warning"
    }}
    """

    response = ai_complete(
        model=model,
        messages=[
            {
                "role": "system",
                "content": "You are an expert Linux System Troubleshooter.",
            },
            {"role": "user", "content": prompt},
        ],
        api_kwargs=api_kwargs,
        response_format={"type": "json_object"},
    )
    return response.choices[0].message.content


@app.route("/api/v1/install/verify", methods=["POST"])
def verify_installation():
    """Verify if an application was correctly installed on the system."""
    data = request.json or {}
    app_id = data.get("app_id", "")
    name = data.get("name", "").lower()
    source = data.get("source", "linux").lower()

    verification_results = {
        "installed": False,
        "method": "unknown",
        "binary_path": None,
        "version": None,
    }

    # 1. Check common binary paths
    try:
        binary_check = subprocess.run(["which", name], capture_output=True, text=True)
        if binary_check.returncode == 0:
            verification_results["installed"] = True
            verification_results["binary_path"] = binary_check.stdout.strip()
            verification_results["method"] = "binary_search"
    except:
        pass

    # 2. Source-specific checks
    if not verification_results["installed"]:
        if "flatpak" in source or "flatpak" in app_id:
            res = subprocess.run(["flatpak", "info", app_id], capture_output=True)
            if res.returncode == 0:
                verification_results["installed"] = True
                verification_results["method"] = "flatpak_registry"
        elif "arch" in source or "aur" in source:
            res = subprocess.run(
                ["pacman", "-Qi", name.split(":")[-1] if ":" in name else name],
                capture_output=True,
            )
            if res.returncode == 0:
                verification_results["installed"] = True
                verification_results["method"] = "pacman_registry"

    return jsonify(verification_results)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
