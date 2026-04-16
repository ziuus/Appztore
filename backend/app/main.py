import json
import logging
import os
import platform
import re
import subprocess

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from openai import OpenAI

load_dotenv()

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


# Initialize AI client
DEVELOPMENT = os.environ.get("DEVELOPMENT", "false").lower() == "true"
MOCK = os.environ.get("MOCK", "false").lower() == "true"
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

client = None
MODEL = None

if not MOCK:
    openai_api_key = os.environ.get("OPENAI_API_KEY")
    # Prioritize Groq if key is present
    if GROQ_API_KEY:
        client = OpenAI(base_url="https://api.groq.com/openai/v1", api_key=GROQ_API_KEY)
        MODEL = "llama-3.3-70b-versatile"
        print(f"AI: Groq Backend Initialized ({MODEL})", flush=True)
    elif openai_api_key:
        client = OpenAI(api_key=openai_api_key)
        MODEL = "gpt-4o"
        print(f"AI: OpenAI Backend Initialized ({MODEL})", flush=True)
    else:
        client = None
        MODEL = None
        print("AI: No API keys found. Using keyword fallback.", flush=True)


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


def get_flatpak_apps(search_term=None):
    """Fetch apps from Flathub using flatpak search command."""
    try:
        cmd = [
            "flatpak",
            "--system",
            "search",
            "--columns=name,application,description",
        ]
        if search_term:
            cmd.append(search_term)
        # Removed --app flag as it may not be supported in all versions

        print(f"Running flatpak command: {' '.join(cmd)}", flush=True)
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=4)
        print(f"Flatpak command result: returncode={result.returncode}", flush=True)
        if result.stdout:
            print(
                f"Flatpak stdout (first 200 chars): {result.stdout[:200]}", flush=True
            )
        if result.stderr:
            print(f"Flatpak stderr: {result.stderr}", flush=True)

        if result.returncode != 0:
            print(f"Flatpak search failed: {result.stderr}")
            return []

        apps = []
        lines = result.stdout.strip().split("\n")
        print(f"Flatpak output lines: {len(lines)}", flush=True)
        if len(lines) < 1:  # No data at all
            print("No lines from flatpak output")
            return []

        # Skip header line if it exists
        data_lines = lines[1:] if len(lines) > 1 else lines
        print(f"Data lines to process: {len(data_lines)}", flush=True)

        # Process each line
        for line in data_lines:
            if not line.strip():
                continue
            parts = line.split("\t")
            if len(parts) >= 3:
                name, app_id, description = parts[0], parts[1], parts[2]
                # Determine category from app_id or name (simplified)
                category = "Utilities"  # default
                if any(x in app_id.lower() for x in ["game", "steam"]):
                    category = "Gaming"
                elif any(x in app_id.lower() for x in ["code", "dev", "ide", "studio"]):
                    category = "Development"
                elif any(
                    x in app_id.lower()
                    for x in ["gimp", "paint", "design", "draw", "photo", "image"]
                ):
                    category = "Design"
                elif any(
                    x in app_id.lower() for x in ["vlc", "video", "media", "player"]
                ):
                    category = "Media Player"
                elif any(x in app_id.lower() for x in ["blender", "3d", "model"]):
                    category = "3D Creation"
                elif any(x in app_id.lower() for x in ["music", "audio", "sound"]):
                    category = "Audio & Music"
                elif any(
                    x in app_id.lower()
                    for x in ["chat", "message", "talk", "discord", "slack", "telegram"]
                ):
                    category = "Communication"

                apps.append(
                    {
                        "id": app_id,
                        "name": name,
                        "developer": "Flathub",  # Simplified
                        "category": category,
                        "description": description.strip(),
                        "icon_url": get_system_icon(name),
                        "install_tier": 2,  # Default tier
                        "hero_image": f"https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=800&auto=format&fit=crop",
                        "install_command": f"flatpak install --system flathub {app_id}",
                        "source": "flatpak",
                    }
                )
        print(f"Found {len(apps)} apps from flatpak search", flush=True)
        return apps
    except Exception as e:
        print(f"Error fetching flatpak apps: {e}", flush=True)
        import traceback

        traceback.print_exc()
        return []


def get_system_icon(name):
    """Try to find a local icon for a given package name."""
    from urllib.parse import quote

    encoded_name = quote(name)
    # Using DiceBear as a high-quality fallback that looks like a modern app icon
    return f"https://api.dicebear.com/7.x/initials/svg?seed={encoded_name}&backgroundColor=030303&fontSize=45&fontFamily=Arial"


def get_pacman_apps(search_term=None):
    """Fetch applications from Arch Linux official repositories."""
    try:
        cmd = ["pacman", "-Ss"]
        if search_term:
            cmd.append(search_term)
        else:
            cmd = ["pacman", "-Ssq"]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=8)
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


def get_yay_apps(search_term=None):
    """Fetch applications from Arch User Repository (AUR) via yay."""
    try:
        cmd = ["yay", "-Ss"]
        if search_term:
            cmd.append(search_term)
        else:
            return get_popular_aur_apps()

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
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
        # For Docker Hub, we'll search popular images
        # Note: Docker Hub API requires authentication for extensive use, so we'll use a curated approach
        popular_images = [
            {"name": "nginx", "desc": "Official NGINX Docker image"},
            {"name": "mysql", "desc": "Official MySQL Docker image"},
            {"name": "postgres", "desc": "Official PostgreSQL Docker image"},
            {"name": "redis", "desc": "Official Redis Docker image"},
            {"name": "mongo", "desc": "Official MongoDB Docker image"},
            {"name": "elasticsearch", "desc": "Official Elasticsearch Docker image"},
            {"name": "wordpress", "desc": "Official WordPress Docker image"},
            {"name": "python", "desc": "Official Python Docker image"},
            {"name": "node", "desc": "Official Node.js Docker image"},
            {"name": "golang", "desc": "Official Go Docker image"},
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
                        "category": categorize_app(img["name"], img["desc"]),
                        "description": img["desc"],
                        "icon_url": "https://via.placeholder.com/128",
                        "install_tier": 2,  # Docker images - medium tier
                        "hero_image": "https://via.placeholder.com/800x400",
                        "install_command": f"docker run -d -p 8080:80 {img['name']}",  # Simplified run command
                        "source": "docker",
                        "is_container": True,
                    }
                )

        return apps if search_term else apps[:5]  # Return first 5 if no search
    except Exception as e:
        print(f"Error fetching docker apps: {e}", flush=True)
        return []


def categorize_app(name, description):
    """Categorize an application based on its name and description."""
    text = f"{name} {description}".lower()

    if any(x in text for x in ["game", "steam", "gaming", "2d", "3d"]):
        return "Gaming"
    elif any(
        x in text
        for x in [
            "code",
            "dev",
            "ide",
            "studio",
            "editor",
            "program",
            "ide",
            "vim",
            "neovim",
            "emacs",
        ]
    ):
        return "Development"
    elif any(
        x in text
        for x in [
            "gimp",
            "paint",
            "design",
            "draw",
            "photo",
            "image",
            "photoshop",
            "illustrator",
            "sketch",
            "grafik",
        ]
    ):
        return "Design"
    elif any(
        x in text
        for x in [
            "vlc",
            "video",
            "media",
            "player",
            "movie",
            "music",
            "audio",
            "spotify",
            "netflix",
            "youtube",
        ]
    ):
        return "Media Player"
    elif any(x in text for x in ["blender", "3d", "model", "animation", "cad", "maya"]):
        return "3D Creation"
    elif any(
        x in text
        for x in ["music", "audio", "sound", "spotify", "audacity", "rhythmbox"]
    ):
        return "Audio & Music"
    elif any(
        x in text
        for x in [
            "chat",
            "message",
            "talk",
            "discord",
            "slack",
            "telegram",
            "whatsapp",
            "signal",
        ]
    ):
        return "Communication"
    elif any(x in text for x in ["browser", "firefox", "chrome", "web", "internet"]):
        return "Web Browser"
    elif any(
        x in text
        for x in [
            "office",
            "document",
            "spreadsheet",
            "presentation",
            "libreoffice",
            "onlyoffice",
        ]
    ):
        return "Productivity"
    elif any(
        x in text
        for x in [
            "terminal",
            "console",
            "shell",
            "tmux",
            "screen",
            "alacritty",
            "kitty",
        ]
    ):
        return "Development"  # Terminals are dev tools
    else:
        return "Utilities"


def get_custom_build_apps(search_term=None):
    """Fetch applications that need to be built from source (from popular repos like GitHub trending)."""
    # For now, we'll return a curated list of popular open-source projects that users might want to build
    # In a production system, this could integrate with GitHub API, GitLab API, etc.
    custom_apps = [
        {
            "id": "neovim/neovim",
            "name": "Neovim",
            "developer": "Neovim Team",
            "category": "Development",
            "description": "Vim-fork focused on extensibility and usability",
            "icon_url": "https://via.placeholder.com/128",
            "install_tier": 3,  # Higher tier for custom builds
            "hero_image": "https://via.placeholder.com/800x400",
            "install_command": "git clone https://github.com/neovim/neovim.git && cd neovim && make CMAKE_BUILD_TYPE=RelWithDebInfo && sudo make install",
            "build_required": True, "repo_type": "web", "source": "Custom",
        },
        {
            "id": "vim/vim",
            "name": "Vim",
            "developer": "Vim Team",
            "category": "Development",
            "description": "Highly configurable text editor built to enable efficient text editing",
            "icon_url": "https://via.placeholder.com/128",
            "install_tier": 3,
            "hero_image": "https://via.placeholder.com/800x400",
            "install_command": "git clone https://github.com/vim/vim.git && cd vim && ./configure --with-features=huge --enable-multibyte --enable-python3interp=yes && make && sudo make install",
            "build_required": True, "repo_type": "web", "source": "Custom",
        },
        {
            "id": "tmux/tmux",
            "name": "Tmux",
            "developer": "Tmux Developers",
            "category": "Development",
            "description": "Terminal multiplexer - switch easily between several programs in one terminal",
            "icon_url": "https://via.placeholder.com/128",
            "install_tier": 3,
            "hero_image": "https://via.placeholder.com/800x400",
            "install_command": "git clone https://github.com/tmux/tmux.git && cd tmux && sh autogen.sh && ./configure && make && sudo make install",
            "build_required": True, "repo_type": "web", "source": "Custom",
        },
        {
            "id": "ristretto/ristretto",
            "name": "Ristretto",
            "developer": "Xfce Developers",
            "category": "Graphics and Design",
            "description": "Fast and lightweight picture-viewer for Xfce Desktop Environment",
            "icon_url": "https://via.placeholder.com/128",
            "install_tier": 3,
            "hero_image": "https://via.placeholder.com/800x400",
            "install_command": "git clone https://git.xfce.org/xfapps/ristretto && cd ristretto && ./autogen.sh --prefix=/usr && make && sudo make install",
            "build_required": True, "repo_type": "web", "source": "Custom",
        },
    ]

    # Filter by search term if provided
    if search_term:
        search_lower = search_term.lower()
        filtered_apps = [
            app
            for app in custom_apps
            if search_lower in app["name"].lower()
            or search_lower in app["description"].lower()
            or search_lower in app["category"].lower()
        ]
        return (
            filtered_apps if filtered_apps else custom_apps[:2]
        )  # Return first 2 if no matches

    # Return a subset to avoid overwhelming (in real implementation, we'd fetch trending/popular)
    return custom_apps[:3]


from concurrent.futures import ThreadPoolExecutor, as_completed


def get_all_available_apps(search_term=None):
    """Fetch apps from all available sources in parallel and merge them."""
    all_apps = []

    # List of search functions to run
    search_funcs = [
        ("Flatpak", get_flatpak_apps),
        ("Pacman", get_pacman_apps),
        ("Yay", get_yay_apps),
        ("Docker", get_docker_apps),
        ("Custom", get_custom_build_apps),
    ]

    with ThreadPoolExecutor(max_workers=len(search_funcs)) as executor:
        # Submit all tasks
        future_to_source = {
            executor.submit(func, search_term): source for source, func in search_funcs
        }

        for future in as_completed(future_to_source):
            source = future_to_source[future]
            try:
                results = future.result()
                if results:
                    print(f"[{source}] Found {len(results)} results", flush=True)
                    all_apps.extend(results)
            except Exception as e:
                print(f"[{source}] Search failed: {e}", flush=True)

    # Remove duplicates based on app id (keeping first occurrence)
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
    auth_err = _require_auth()
    if auth_err:
        return auth_err
    print("=== SEARCH ENDPOINT HIT ===", flush=True)
    data = request.json or {}
    query_str = data.get("query", "")
    target_os = data.get("os", "linux").lower()
    print(f"Query received: '{query_str}' for OS: {target_os}", flush=True)

    # Fetch apps from ALL available sources dynamically
    all_apps = get_all_available_apps(query_str if query_str else None)

    # Adapt commands for target OS if not Linux
    if target_os != "linux":
        for app in all_apps:
            if target_os == "windows":
                win_id = app["id"].split(".")[-1]
                app["install_command"] = f"winget install {win_id} --silent"
                app["source"] = "WinGet"
            elif target_os == "macos":
                mac_id = app["id"].split(".")[-1].lower()
                app["install_command"] = f"brew install {mac_id}"
                app["source"] = "Homebrew"

    # Limit to a reasonable number to avoid overwhelming the AI
    # Take first 20 apps or all if less than 20
    registry_to_search = all_apps[:20] if len(all_apps) > 20 else all_apps
    print(
        f"Total apps from all sources: {len(all_apps)}, searching with AI on: {len(registry_to_search)}",
        flush=True,
    )

    if MOCK:
        print("MOCK mode: Returning sampled registry")
        return jsonify(
            {"intent": "mock_search", "category": "all", "results": registry_to_search}
        )

    if not client:
        print("Warning: OPENAI_API_KEY not set. Using fallback keyword search.")
        q_lower = query_str.lower()
        results = [
            app
            for app in registry_to_search
            if q_lower in app["name"].lower()
            or q_lower in app["category"].lower()
            or q_lower in app["description"].lower()
        ]

        if not results:
            # Fallback logic - return a few apps if no matches
            if len(registry_to_search) > 0:
                results = registry_to_search[
                    : min(5, len(registry_to_search))
                ]  # Return first few apps
            else:
                results = []

        return jsonify(
            {"intent": "fallback_search", "category": "unknown", "results": results}
        )

    try:
        # Build a simplified registry description for the AI prompt
        registry_apps_text = ""
        for i, app in enumerate(registry_to_search):
            source_info = (
                f" [{app.get('source', 'unknown')}]" if "source" in app else ""
            )
            build_info = " (BUILD REQUIRED)" if app.get("build_required") else ""
            registry_apps_text += f'- id: "{app["id"]}", name: "{app["name"]}", category: "{app["category"]}", description: "{app["description"][:100]}..."{source_info}{build_info}\n'

        system_prompt = f"""
        You are the AI brain for a next-generation App Store that has access to multiple software sources including:
        - Official repositories (Flatpak, Arch PACMAN)
        - Community repositories (AUR/YAY)
        - Container platforms (Docker Hub)
        - Source-build applications (GitHub projects)
        - And more...

        You receive a user's natural language query and must extract their intent and desired software category.
        Also, you must recommend the BEST app ID from the provided registry that matches their need.

        AVAILABLE REGISTRY APPS (showing first {len(registry_to_search)} apps from multiple sources):
        {registry_apps_text}

        Respond with ONLY a JSON object containing:
        {{
            "intent": "install" | "search",
            "category": "string (the general category of software)",
            "matched_app_ids": ["string (the id of the best matching apps)"]
        }}
        """

        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query_str},
            ],
            response_format={"type": "json_object"},
        )

        ai_response = json.loads(response.choices[0].message.content)

        matched_apps = []
        if "matched_app_ids" in ai_response:
            for app_id in ai_response["matched_app_ids"]:
                for app in registry_to_search:
                    if app["id"] == app_id:
                        matched_apps.append(app)
                        break

        if not matched_apps:
            # Fallback to keyword search if LLM returns no matches
            q_lower = query_str.lower()
            keyword_results = [
                app
                for app in registry_to_search
                if q_lower in app["name"].lower()
                or q_lower in app["category"].lower()
                or q_lower in app["description"].lower()
            ]
            if keyword_results:
                matched_apps = keyword_results
            else:
                # If still no matches, return a sample of apps
                matched_apps = (
                    registry_to_search[: min(5, len(registry_to_search))]
                    if registry_to_search
                    else []
                )

        return jsonify(
            {
                "intent": ai_response.get("intent", "search"),
                "category": ai_response.get("category", "unknown"),
                "results": matched_apps,
            }
        )

    except Exception as e:
        import traceback

        traceback.print_exc()
        print(f"Error calling LLM: {e}", flush=True)
        # Fallback to returning some apps on error
        fallback_apps = (
            registry_to_search[: min(5, len(registry_to_search))]
            if registry_to_search
            else []
        )
        return jsonify(
            {"intent": "error", "category": "error", "results": fallback_apps}
        )


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
            "install_command": get_cmd("vlc", "flatpak install flathub org.videolan.VLC", "VideoLAN.VLC", "vlc"),
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
            "install_command": get_cmd("firefox", "flatpak install flathub org.mozilla.firefox", "Mozilla.Firefox", "firefox"),
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
            "install_command": get_cmd("vscode", "flatpak install flathub com.visualstudio.code", "Microsoft.VisualStudioCode", "visual-studio-code"),
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
            "install_command": get_cmd("steam", "flatpak install flathub com.valvesoftware.Steam", "Valve.Steam", "steam"),
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
            "install_command": get_cmd("stk", "flatpak install flathub org.supertuxkart.SuperTuxKart", "STK.SuperTuxKart", "supertuxkart"),
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
            "install_command": get_cmd("libreoffice", "flatpak install flathub org.libreoffice.LibreOffice", "TheDocumentFoundation.LibreOffice", "libreoffice"),
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
            "install_command": get_cmd("obsidian", "flatpak install flathub md.obsidian.Obsidian", "Obsidian.Obsidian", "obsidian"),
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
            "install_command": get_cmd("anki", "flatpak install flathub net.ankiweb.Anki", "Anki.Anki", "anki"),
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
            "install_command": get_cmd("stellarium", "flatpak install flathub org.stellarium.Stellarium", "Stellarium.Stellarium", "stellarium"),
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

    return jsonify({
        "trending": trending, 
        "games": games,
        "productivity": productivity,
        "education": education,
        "spotlight": spotlight, 
        "our_apps": our_apps
    })


# Global settings for sources (would be persisted in a DB/JSON in real production)
USER_SOURCES = {
    "system": ["pacman", "yay"],
    "universal": ["flatpak", "appimage"],
    "dev": ["npm", "pip"],
    "gaming": ["steam", "wine"],
}


@app.route("/api/v1/system/apps", methods=["GET"])
def get_installed_system_apps():
    """Scan the OS for all installed applications from all sources."""
    installed = []

    # 1. Scan Flatpaks
    try:
        res = subprocess.run(
            ["flatpak", "list", "--columns=name,application,version"],
            capture_output=True,
            text=True,
        )
        if res.returncode == 0:
            for line in res.stdout.strip().split("\n"):
                parts = line.split("\t")
                if len(parts) >= 2:
                    installed.append(
                        {
                            "name": parts[0],
                            "id": parts[1],
                            "source": "flatpak",
                            "version": parts[2] if len(parts) > 2 else "unknown",
                            "type": "appztore",
                        }
                    )
    except:
        pass

    # 2. Scan Native Pacman
    try:
        res = subprocess.run(["pacman", "-Q"], capture_output=True, text=True)
        if res.returncode == 0:
            for line in res.stdout.strip().split("\n")[:100]:  # Limit for performance
                parts = line.split(" ")
                if len(parts) >= 2:
                    installed.append(
                        {
                            "name": parts[0],
                            "id": parts[0],
                            "source": "pacman",
                            "version": parts[1],
                            "type": "system",
                        }
                    )
    except:
        pass

    return jsonify({"apps": installed})


@app.route("/api/v1/install/insight", methods=["POST"])
def get_install_insight():
    """AI provides insight and potential issues for a specific installation."""
    data = request.json or {}
    app_id = data.get("app_id", "")

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

    if not client:
        return jsonify(
            {
                "insights": ["Standard installation process"],
                "ai_thought": "Using keyword matching for safe install.",
            }
        )

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": "You are a Linux System Expert."},
            {"role": "user", "content": prompt},
        ],
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

    if not client:
        return jsonify({"analysis": "Manual verification required.", "fix_suggestion": None})

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

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": "You are an expert Linux System Troubleshooter."},
            {"role": "user", "content": prompt},
        ],
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
        "version": None
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
            res = subprocess.run(["pacman", "-Qi", name.split(":")[ -1 ] if ":" in name else name], capture_output=True)
            if res.returncode == 0:
                verification_results["installed"] = True
                verification_results["method"] = "pacman_registry"

    return jsonify(verification_results)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
