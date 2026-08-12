# 📦 Appztore

> **Universal Package & Application Orchestrator for Linux.**  
> Unifies Pacman, AUR, Flatpak, Snapcraft, and Docker into a single, high-density desktop interface.

[![Version](https://img.shields.io/github/v/release/ziuus/Appztore?color=68BA7F&label=version)](https://github.com/ziuus/Appztore/releases/tag/v1.0.1)
[![License](https://img.shields.io/github/license/ziuus/Appztore?color=blue)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20macOS%20%7C%20Windows-informational)](https://github.com/ziuus/Appztore/releases)

---

## Overview

Linux software installation is often fragmented across multiple package managers (`pacman`, `yay`, `flatpak`, `snap`, `docker`). **Appztore** acts as a unified control plane for Linux desktop software — enabling intent-based search, multi-registry discovery, security audit scoring, and real-time installation telemetry in one native desktop app.

---

## Key Features

- **Unified Registry Search:** Query **Pacman**, **AUR (Yay)**, **Flatpak (Flathub)**, **Snapcraft**, and **Docker Hub** simultaneously.
- **Pure OS Fallback:** Full offline search capability using native system binaries (`pacman -Ss`, `flatpak search`, `yay -Ss`) without requiring external API keys.
- **Security Audit Scoring:** Automated package safety verification displaying registry verification tiers (Arch Official 95%, Flathub 88%, AUR Community 75%).
- **Command Injection Guard:** Strict regex-based input sanitization blocking command injection risks (`;&|` operators) prior to `pkexec` / `sudo` execution.
- **Real-Time Telemetry:** Terminal viewer streaming live stdout output during package installation.
- **Optional Intent Intelligence:** Optional LiteLLM/Groq integration for natural language intent queries (e.g. *"lightweight terminal file manager with vim bindings"*).

---

## Universal Registry Support

| Registry Source | Driver | Package Resolution | Security Verification |
| :--- | :--- | :--- | :--- |
| **Arch / Pacman** | Native `pacman` | Official Repositories | GPG Verified (95%) |
| **Arch / AUR** | Native `yay` / `paru` | User Repository Builds | Community Scanned (75%) |
| **Flatpak** | Native `flatpak` | Flathub Remotes | Sandbox Verified (88%) |
| **Snapcraft** | Native `snap` | Canonical Snap Store | Strict Confinement (85%) |
| **Docker Hub** | Native `docker` | Container Images | Official Image Check (90%) |

---

## ⚡ Quick Start

### 1. Download Pre-Built Release (Recommended)

Get the latest release binary for your Linux distribution from [GitHub Releases](https://github.com/ziuus/Appztore/releases/latest):

```bash
# Universal Linux (AppImage)
chmod +x appztore_1.0.1_amd64.AppImage
./appztore_1.0.1_amd64.AppImage

# Arch Linux (Local build)
git clone https://github.com/ziuus/Appztore.git
cd Appztore
./RUN_APP.sh

# Debian / Ubuntu (.deb)
sudo dpkg -i appztore_1.0.1_amd64.deb

# Fedora / RHEL (.rpm)
sudo rpm -i appztore-1.0.1-1.x86_64.rpm
```

---

## 🏗️ System Architecture

Appztore is structured as a light native shell with a Python core service:

```
Appztore Engine
├── Frontend UI         React 19 + TypeScript + Framer Motion (Vite)
├── Native Window       Tauri v2 (Rust) — System tray & OS bridge
└── Backend Core        Python 3.12+ Flask (LiteLLM + Parallel Registry Drivers)
```

- **Frontend:** High-density dark UI with responsive filter tabs, telemetry logs, and security badges.
- **Native Bridge (Rust/Tauri):** Low-overhead windowing, native notifications, and secure privileged process execution.
- **Backend Service (Python/Flask):** Multi-threaded registry query orchestrator, package metadata normalization, and optional LLM intent resolution.

---

## 🛠️ Building from Source

### Prerequisites

- **Rust & Cargo** (v1.77+)
- **Node.js** (v20+) & **pnpm**
- **Python** (v3.10+)

### Setup

```bash
# 1. Clone repo
git clone https://github.com/ziuus/Appztore.git
cd Appztore

# 2. Setup Python Backend Environment
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 3. Setup Frontend & Launch App
cd ../desktop-app
pnpm install
cd ..
./RUN_APP.sh
```

---

## 🧪 Testing

Run backend security and integration unit tests:

```bash
cd backend
source .venv/bin/activate
python -m pytest
```

---

## 🛡️ Security Policy

Appztore prioritizes local system security:
- **No Unsanitized Inputs:** Shell parameters are validated against strict whitelist patterns (`^[a-zA-Z0-9_\-\.\:\/]+$`).
- **Privilege Separation:** Privileged operations utilize standard Linux `pkexec` prompts without storing passwords in memory.
- **Local Privacy:** Registry queries remain strictly local unless optional LLM intent resolution is manually enabled.

---

## 📄 License

Distributed under the [MIT License](LICENSE). Copyright © 2026 Noel Paul Tomy (ziuus).
