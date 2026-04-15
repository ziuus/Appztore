# Appztore AI - Next Gen Software Hub

Appztore is an AI-powered desktop application manager for Linux that unifies multiple software sources into a single, premium visual experience.

## 🚀 Core Features
- **AI-Driven Search:** Uses Groq (Llama 3.3) to understand installation intent and resolve package names across registries.
- **Unified Repositories:** Manage Pacman, AUR (Yay), Flatpak, Docker, and AppImages from one interface.
- **AI Spotlight:** Discover the latest machine learning and AI-first applications.
- **Detailed Insights:** Toggleable "Insight" mode to see AI thoughts on dependencies, risks, and real-time process logs.
- **System Dashboard:** Unified view of all installed apps on your OS, categorized by source.
- **Premium UI:** Lush Forest theme with dynamic cursor-tracking spotlights and glassmorphism.

## 🛠️ Architecture
- **Frontend:** React + TypeScript + Framer Motion + Tailwind CSS.
- **Native Bridge:** Rust (Tauri) for secure system command execution and privileged access (`pkexec`).
- **Backend Intelligence:** Python (Flask) for AI processing, system discovery, and collection management.

## 🏁 Getting Started
1. Install dependencies:
   ```bash
   cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
   cd ../desktop-app && npm install
   ```
2. Setup environment:
   - Add your `GROQ_API_KEY` to `backend/.env`.
3. Launch:
   ```bash
   ./RUN_APP.sh
   ```

## 🔒 Security
- Commands are whitelisted and validated in the Rust layer.
- Uses `pkexec` for GUI-based privileged operations.
- Content Security Policy (CSP) restricted to local and verified AI endpoints.
