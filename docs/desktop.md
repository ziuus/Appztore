# Desktop Application

The Appztore desktop client is built on **Tauri v2** with **React 19**, **TypeScript**, and **Tailwind CSS**. It provides a fast, lightweight, and modern graphical interface for discovering, inspecting, and installing Linux software.

---

## 🎨 User Interface Features

### 1. Unified Search Bar
- **Keyword Search**: Type any package name (e.g. `vlc`, `neovim`, `firefox`).
- **Natural Language Intent**: Query by description (e.g., *"video editor with GPU acceleration"* or *"markdown note-taking tool"*).
- **Fast Local Indexing**: Results from cached and local binary searches appear instantaneously.

### 2. Registry Filter Tabs
Easily toggle or isolate results from specific package sources:
- **All Sources**: Merged view deduplicating identical applications across sources.
- **Pacman**: Arch Linux official binary repositories.
- **AUR**: Community packages built from source via `yay`/`paru`.
- **Flatpak**: Sandboxed applications from Flathub.
- **Snapcraft**: Snaps with canonical confinement.
- **Docker**: Containerized applications and server utilities.

### 3. Security Audit Badges
Every package card displays a security rating and verification badge:
- **Arch Official (95%)**: GPG-signed binary package from official maintainers.
- **Docker Official (90%)**: Verified Docker Hub official image.
- **Flathub (88%)**: Sandboxed flatpak with security manifest inspection.
- **Snapcraft (85%)**: Canonical snap with confinement guarantees.
- **AUR Community (75%)**: User-submitted PKGBUILD requiring community review.

### 4. Real-Time Installation Telemetry
When an installation is triggered:
- An inline terminal modal opens.
- Output from `pkexec` / `pacman` / `flatpak` is streamed line-by-line using Server-Sent Events (SSE).
- Errors and warnings are highlighted automatically for quick troubleshooting.

---

## ⌨️ Desktop Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + K` / `Cmd + K` | Focus search bar |
| `Escape` | Close modals / Clear active search |
| `Ctrl + R` | Refresh registry indexes |
| `Tab` | Cycle through registry filter tabs |
