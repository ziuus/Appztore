# Model Context Protocol (MCP)

Appztore provides native compatibility with the **Model Context Protocol (MCP)**, allowing AI assistants and coding agents to query package registries, check installation statuses, and safely manage applications on Linux systems.

---

## 🤖 Available Tools

### `search_packages`
Search across Pacman, Flatpak, AUR, Snapcraft, and Docker Hub.

**Parameters:**
- `query` *(string, required)*: Package name or descriptive intent (e.g., `"audio workstation"`).
- `registry` *(string, optional)*: Specific registry filter (`"pacman"`, `"flatpak"`, `"aur"`, `"snap"`, `"docker"`, or `"all"`).

### `get_app_details`
Retrieve detailed metadata, security scores, and installation command recipes for an application.

**Parameters:**
- `app_id` *(string, required)*: Identifier of the application (e.g., `"org.videolan.VLC"` or `"arch:neovim"`).

### `verify_command`
Check whether a package installation command adheres to strict command sanitization rules.

**Parameters:**
- `command` *(string, required)*: Shell command string to validate.

---

## ⚙️ Configuration Example

Add Appztore as an MCP server in your MCP client configuration (e.g. Claude Desktop or Antigravity):

```json
{
  "mcpServers": {
    "appztore": {
      "command": "python",
      "args": ["backend/app/main.py"],
      "env": {
        "PORT": "5001"
      }
    }
  }
}
```
