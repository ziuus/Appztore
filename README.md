# 🌌 Appztore AI: The Universal Software Engine

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Build: Tauri](https://img.shields.io/badge/Build-Tauri-blue.svg)](https://tauri.app/)
[![Backend: Flask](https://img.shields.io/badge/Intelligence-Groq_LLM-purple.svg)](https://groq.com/)

Appztore is a **next-generation application orchestrator** for Linux. It replaces fragmented package managers with a unified, high-fidelity neural interface. Built for the 2030 standard of software discovery, Appztore bridges the gap between local system registries, global container hubs, and source-build repositories.

---

## ✨ The Premium Experience

Appztore isn't just a package manager; it's a **Product Showcase**.
- **Lush Forest Theme:** A sophisticated, deep-emerald aesthetic using Glassmorphism and Backdrop-Blur.
- **Dynamic Spotlights:** Cursor-tracking light effects and staggered Framer Motion entrances.
- **High-Fidelity Assets:** Auto-fetching of 4K hero images and high-resolution SVG icons for every application.
- **SaaS Dashboard:** A dedicated Search View separate from the Discover Home, providing a focused, professional workspace.

---

## 🧠 Neural Orchestration

Powered by **Llama 3.3 (via Groq)**, Appztore understands *intent*, not just keywords.
- **Natural Language Search:** Ask for "a professional video editor for cinematic color grading" and get ranked suggestions across all registries.
- **AI System Insights:** Real-time analysis of installation risks, dependency conflicts, and kernel compatibility.
- **Automated Categorization:** Dynamic sorting of apps into Gaming, Development, Design, AI Tools, and more based on deep metadata analysis.

---

## 🛠️ The Universal Engine

Appztore unifies the most powerful Linux distribution methods into a single, cohesive API.

| Registry | Status | Support Level |
| :--- | :--- | :--- |
| **Flatpak / Flathub** | ✅ Native | Full Metadata & Remote Icons |
| **Arch / Pacman** | ✅ Native | Official Repositories |
| **AUR / Yay** | ✅ Native | Community Driven Builds |
| **Docker Hub** | ✅ Container | Official Image Discovery |
| **GitHub / Git** | ✅ Source | Automated Clone & Build Pipelines |
| **Snapcraft** | ✅ Universal | Canonical Snap Support |
| **APT / DNF / Zypper** | ✅ Distro | Core System Integration |

---

## 🚀 Quick Start

### 1. Prerequisites
Ensure you have the following installed on your Linux system:
- **Rust & Cargo** (for Tauri)
- **Node.js 20+** (for Vite)
- **Python 3.12+** (for the AI Backend)
- **Flatpak / Yay / Docker** (depending on which registries you wish to use)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/ziuus/Appztore.git
cd Appztore

# Setup Backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Setup Frontend
cd ../desktop-app
npm install
```

### 3. Configuration
Create a `.env` file in the `backend/` directory:
```env
GROQ_API_KEY=your_key_here
```

### 4. Launch
Use the production-ready launcher:
```bash
./RUN_APP.sh
```

---

## 🏗️ Architecture

- **Frontend:** React 19 + TypeScript + Framer Motion (State-of-the-art UI).
- **Native Bridge:** Rust (Tauri v2). Handles secure OS command execution via `pkexec` and `std::process`.
- **Intelligent Core:** Python Flask. Manages the parallel search engine, LLM orchestration, and high-fidelity asset mapping.

---

## 🛡️ Security & Integrity
- **Privileged Context:** All system modifications require explicit authentication via standard Linux `pkexec` or `sudo` prompts.
- **Command Sanitization:** Strict regex-based validation of all terminal inputs within the Rust layer to prevent shell injection.
- **Privacy-First:** User data remains local; only anonymized queries are sent to the AI engine for discovery.

---

<p align="center">
  <i>Built for the next decade of Linux Desktop Engineering.</i><br>
  <b>Appztore Labs © 2026</b>
</p>
