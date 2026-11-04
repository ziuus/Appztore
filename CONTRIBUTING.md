# Contributing to Appztore

Thank you for your interest in contributing to **Appztore**! We welcome contributions from developers of all skill levels, from documentation improvements and bug fixes to new registry drivers and UI features.

---

## 📜 Code of Conduct

This project adheres to an open, respectful, and inclusive code of conduct. Please treat all community members with kindness and respect.

---

## 🚀 Getting Started

1. **Fork the Repository**: Click the **Fork** button on GitHub to create your own copy of the repository.
2. **Clone your fork**:
   ```bash
   git clone https://github.com/<your-username>/Appztore.git
   cd Appztore
   ```
3. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   # or for bug fixes:
   git checkout -b fix/issue-description
   ```

---

## 🛠️ Development Setup

Appztore is composed of two primary layers:
- **Backend**: Python 3.10+ service managing registry queries, command validation, and telemetry.
- **Frontend / Desktop**: Tauri v2 + React 19 + TypeScript + Vite.

### 1. Python Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate a virtual environment
python -m venv .venv
# On Linux/macOS:
source .venv/bin/activate
# On Windows (PowerShell):
.\.venv\Scripts\Activate.ps1

# Install runtime and development dependencies
pip install -r requirements.txt
pip install pytest flake8

# Run backend test suite
pytest test_backend.py

# Run the backend locally
python app/main.py
```

### 2. Desktop Frontend Setup

```bash
# Navigate to desktop app directory
cd desktop-app

# Install dependencies with pnpm (or npm)
pnpm install

# Run Vite dev server in browser mode
pnpm dev

# Run linter
pnpm run lint

# Build frontend assets
pnpm run build
```

### 3. Running with Tauri (Desktop Window)

To run the complete Tauri desktop app:

```bash
# Ensure Rust and Cargo (v1.77+) are installed
cd desktop-app
pnpm tauri dev
```

---

## 📁 Repository Structure

```
Appztore/
├── backend/                  # Python Flask core service
│   ├── app/                  # Application code (main.py, drivers, security validation)
│   ├── requirements.txt      # Production dependencies
│   ├── requirements-dev.txt  # Dev & testing dependencies
│   └── test_backend.py       # Unit tests for endpoints and security filters
├── desktop-app/              # React + TypeScript + Tauri desktop frontend
│   ├── src/                  # React components, hooks, and types
│   ├── src-tauri/            # Rust native bridge & Tauri configuration
│   └── package.json          # Node dependencies and scripts
├── docs/                     # MkDocs documentation site
│   ├── index.md              # Documentation home
│   ├── desktop.md            # Desktop App guide
│   ├── cli.md                # CLI / TUI guide
│   ├── mcp.md                # Model Context Protocol guide
│   └── architecture.md       # Architecture & design documentation
├── mkdocs.yml                # MkDocs Material configuration
├── RUN_APP.sh                # Linux launcher script
└── CONTRIBUTING.md           # Contribution guidelines
```

---

## 🛡️ Coding Guidelines & Security

- **Command Safety Validation**: Any changes touching command execution or registry drivers must pass `validate_command_safety()` checks to prevent shell injection vulnerabilities.
- **Code Style**:
  - Python: Follow PEP 8 guidelines.
  - TypeScript/React: Follow ESLint rules and ensure TypeScript type safety (`pnpm run lint`).
- **Tests**: When adding a new API endpoint or modifying registry parsers, include corresponding unit tests in `backend/test_backend.py`.
- **Documentation**: Update relevant markdown files in `docs/` or `README.md` if your change affects user-facing behavior or API endpoints.

---

## 📬 Pull Request Guidelines

1. Ensure all backend tests pass:
   ```bash
   pytest backend/test_backend.py
   ```
2. Ensure frontend builds cleanly without lint errors:
   ```bash
   cd desktop-app && pnpm run lint && pnpm run build
   ```
3. Commit your changes with clear, descriptive commit messages (e.g. `feat: add health check endpoint` or `docs: update setup instructions in CONTRIBUTING.md`).
4. Push your branch to GitHub:
   ```bash
   git push origin feature/your-feature-name
   ```
5. Open a Pull Request against the `main` branch with a summary of the changes and link any related issues.

---

## ❓ Questions & Help

If you have questions, encounter an issue, or want to propose a feature idea, feel free to open a [GitHub Issue](https://github.com/ziuus/Appztore/issues) or reach out to the maintainers.

---

## ⚖️ License

By contributing to Appztore, you agree that your contributions will be licensed under the [MIT License](LICENSE).
