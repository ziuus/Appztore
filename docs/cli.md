# CLI & TUI Workflows

In addition to the graphical desktop app, Appztore supports scriptable terminal workflows and seamless integration with command-line tools.

---

## 💻 Pure OS Fallback Mode

Appztore can operate in environments without external internet API keys or LLM backends.

When running in pure OS mode, Appztore uses native distribution binaries:
- `pacman -Ss <query>` for Arch official packages.
- `yay -Ss <query>` or `paru -Ss <query>` for AUR packages.
- `flatpak search <query>` for Flathub remotes.
- `snap find <query>` for Canonical Snap Store.
- `docker search <query>` for Docker Hub images.

---

## 🛡️ Input Sanitization & Security

All commands constructed or suggested by Appztore pass through strict regex verification:

```python
# Disallowed characters & patterns:
# - Shell chaining: ; && ||
# - Redirection: | > <
# - Command substitution: ` $( )
```

This prevents accidental or malicious command execution when escalating permissions via `pkexec` or `sudo`.

---

## 🚀 Environment Flags

You can customize backend behaviors using environment variables:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `LITELLM_MODEL` | AI model to use for intent extraction | `groq/llama-3.3-70b-versatile` |
| `GROQ_API_KEY` | API key for Groq LLM queries | None |
| `PORT` | Backend service HTTP port | `5001` |
| `DEBUG` | Enable debug logging | `false` |
