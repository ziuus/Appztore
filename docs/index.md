# Appztore Documentation

Welcome to the **Appztore** documentation!

**Appztore** is an open-source, universal package and application orchestrator for Linux desktops. It bridges the gap across fragmented software distribution channels by unifying:

- **Arch Linux / Pacman** (Official Repositories)
- **AUR (Arch User Repository)** via `yay` / `paru`
- **Flatpak / Flathub**
- **Snapcraft**
- **Docker Hub**

---

## 🌟 Key Highlights

- **Multi-Registry Search**: Search packages across all supported package managers simultaneously in real time.
- **Pure OS Fallback**: Zero external API dependencies needed for core registry searches; utilizes native binaries (`pacman`, `flatpak`, `yay`, etc.).
- **Security Audit Scoring**: Visual safety tiers based on repository provenance, confinement levels, and integrity checks.
- **Strict Command Injection Guard**: Regex-driven input validation preventing malicious operators (`;&|`) from executing in root/privileged contexts.
- **Telemetry Stream**: Live terminal output streaming directly into the desktop UI during installations.
- **AI Intent Search (Optional)**: Natural language querying to discover tools by intent using LiteLLM/Groq.

---

## 🚀 Quick Navigation

- [Desktop Application Guide](desktop.md): Explore the desktop UI, package filters, and telemetry viewer.
- [CLI & TUI Guide](cli.md): Work with command-line workflows and system integration.
- [Model Context Protocol (MCP)](mcp.md): Connect Appztore with LLM agents.
- [System Architecture](architecture.md): Deep-dive into the Tauri v2, Python backend, and IPC design.

---

## 🛠️ Quick Installation

For pre-built releases:

```bash
# AppImage (Universal Linux)
chmod +x appztore_1.0.1_amd64.AppImage
./appztore_1.0.1_amd64.AppImage

# Debian / Ubuntu (.deb)
sudo dpkg -i appztore_1.0.1_amd64.deb

# Fedora / RHEL (.rpm)
sudo rpm -i appztore-1.0.1-1.x86_64.rpm
```
