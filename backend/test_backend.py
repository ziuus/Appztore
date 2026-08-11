import pytest
from app.main import app as flask_app, validate_command_safety, normalize_app_object


@pytest.fixture
def client():
    flask_app.config["TESTING"] = True
    with flask_app.test_client() as client:
        yield client


def test_command_safety_validation():
    """Test regex sanitization of installation commands."""
    assert validate_command_safety("flatpak install -y flathub org.videolan.VLC") is True
    assert validate_command_safety("pkexec pacman -S --noconfirm vlc") is True
    assert validate_command_safety("yay -S --noconfirm google-chrome") is True
    
    # Malicious injection attempts must be rejected
    assert validate_command_safety("pacman -S vlc; rm -rf /") is False
    assert validate_command_safety("yay -S vlc && echo hacked") is False
    assert validate_command_safety("flatpak install vlc | bash") is False
    assert validate_command_safety("sudo pacman -S `whoami`") is False
    assert validate_command_safety("") is False
    assert validate_command_safety(None) is False


def test_normalize_app_object():
    """Test that all returned package objects have standard non-null fields."""
    raw_app = {
        "id": "arch:vlc",
        "name": "vlc",
        "description": "VLC Media Player",
        "source": "pacman",
        "install_command": "pkexec pacman -S --noconfirm vlc",
    }
    normalized = normalize_app_object(raw_app)

    required_fields = [
        "id",
        "name",
        "description",
        "registry",
        "source",
        "package_name",
        "version",
        "icon_url",
        "security_score",
        "developer",
        "hero_image",
        "install_command",
        "category",
        "rating",
        "downloads",
        "install_tier",
    ]

    for field in required_fields:
        assert field in normalized
        assert normalized[field] is not None

    assert normalized["security_score"] == 95
    assert normalized["registry"] == "pacman"
    assert normalized["package_name"] == "vlc"


def test_api_search_pure_os_fallback(client):
    """Test /api/search and /api/v1/search fallback without LLM key."""
    res = client.post("/api/v1/search", json={"query": "vlc", "os": "linux"})
    assert res.status_code == 200
    data = res.get_json()
    assert "results" in data
    assert "intent" in data

    if len(data["results"]) > 0:
        item = data["results"][0]
        assert "id" in item
        assert "name" in item
        assert "security_score" in item
        assert "registry" in item
        assert "package_name" in item


def test_api_categories(client):
    """Test /api/categories endpoint."""
    res = client.get("/api/categories")
    assert res.status_code == 200
    data = res.get_json()
    assert "categories" in data
    assert "Gaming" in data["categories"]
    assert "Development" in data["categories"]


def test_api_system_info(client):
    """Test /api/system-info endpoint."""
    res = client.get("/api/system-info")
    assert res.status_code == 200
    data = res.get_json()
    assert "os" in data
    assert "available_sources" in data


def test_api_app_details(client):
    """Test /api/app-details endpoint."""
    res = client.post("/api/app-details", json={"app_id": "org.videolan.VLC", "name": "VLC Media Player"})
    assert res.status_code == 200
    data = res.get_json()
    assert "app" in data
    assert "security_audit" in data
    assert data["app"]["name"] == "VLC Media Player"


def test_api_install_endpoint(client):
    """Test /api/install endpoint command validation."""
    # Valid command
    res_valid = client.post(
        "/api/install",
        json={
            "app_id": "org.videolan.VLC",
            "install_command": "flatpak install -y flathub org.videolan.VLC",
            "package_name": "org.videolan.VLC",
            "registry": "flatpak",
        },
    )
    assert res_valid.status_code == 200
    assert res_valid.get_json()["status"] == "validated"

    # Unsafe command injection
    res_unsafe = client.post(
        "/api/install",
        json={
            "app_id": "org.videolan.VLC",
            "install_command": "flatpak install org.videolan.VLC; rm -rf /",
        },
    )
    assert res_unsafe.status_code == 400
    assert "error" in res_unsafe.get_json()
