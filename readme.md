# ThairaAI

Your AI-powered office assistant for documents, email, calendar, and productivity.

[![License](https://img.shields.io/badge/license-Apache--2.0-32CD32?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-6C757D?style=flat-square)](https://github.com/joaothaira/ThairaAI/releases)

> Built on top of [AionUi](https://github.com/iOfficeAI/AionUi) — a huge thanks to the AionUi team for their open-source work.

---

## What it does

- **Built-in AI agent** — file read/write, web search, image generation, MCP tools. No CLI to install.
- **Google integration** — sign in with Google to access Calendar and Gmail directly from the assistant
- **Multi-agent** — auto-detects Claude Code, Codex, Gemini CLI and other installed CLI agents
- **Remote access** — WebUI mode lets you use the assistant from any browser or phone
- **Scheduled tasks** — cron-based automation, runs 24/7 unattended
- **Office documents** — generate and edit PPT, Word, and Excel files via built-in skills
- **20+ AI platforms** — Anthropic, Gemini, OpenAI, DeepSeek, Ollama, and more

---

## Setup

### Prerequisites

- [Bun](https://bun.sh)
- Node.js 18+
- A Google Cloud project with OAuth 2.0 credentials (for Google integration)

### Environment

Copy `.env.example` to `.env` and fill in your Google OAuth credentials:

```bash
cp .env.example .env
```

```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

To get these credentials: [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → Create OAuth 2.0 Client ID.

### Run

```bash
bun install
bun run start        # dev mode
bun run test         # unit tests
bun run dist:mac     # build for macOS
bun run dist:win     # build for Windows
bun run dist:linux   # build for Linux
```

---

## Tech stack

Electron · Vite · React · Bun · TypeScript

---

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR.

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit: `git commit -m 'feat: add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

[Report a bug](https://github.com/joaothaira/ThairaAI/issues) · [Request a feature](https://github.com/joaothaira/ThairaAI/issues)

---

## License

[Apache-2.0](LICENSE)
