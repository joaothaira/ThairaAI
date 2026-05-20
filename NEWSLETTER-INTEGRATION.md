# Newsletter Pipeline × AionUi — Integration Notes

## Goal
Wrap the `/Volumes/server-ssd/newsletter` Claude Code pipeline in AionUi so non-technical users can run it via GUI, and optionally use local Ollama models instead of the Anthropic API.

---

## What's already done

### 1. Two extensions installed at `~/.aionui/extensions/`

#### `ollama/` — Local model provider
Registers all locally-installed Ollama models as a `custom` platform provider at `http://localhost:11434`.

```
~/.aionui/extensions/ollama/
├── aion-extension.json
└── contributes/
    └── model-providers.json      ← 10 models listed (gemma4:e4b, qwen3.5:9b, etc.)
```

Key config: `platform: "custom"`, `baseUrl: "http://localhost:11434"`.  
No API key required. After AionUi restart, models appear in Settings → Models.

#### `newsletter-pipeline/` — The 3 newsletter assistants
Ports the existing Claude Code subagents to AionUi assistant format.

```
~/.aionui/extensions/newsletter-pipeline/
├── aion-extension.json
├── contributes/
│   └── assistants.json            ← 3 assistant definitions
└── assistants/
    ├── newsletter-writer-context.md   ← full system prompt, SCQA framework
    ├── researcher-context.md          ← research instructions + source list
    └── social-writer-context.md       ← Instagram/Twitter/LinkedIn formats
```

Assistants defined:
- `newsletter-writer` — reads research.md, outputs newsletter.md
- `newsletter-researcher` — searches AI news + GitHub trending
- `newsletter-social` — adapts newsletter to 5 social files

All use `presetAgentType: "claude"` currently. To switch to Ollama, change this to whatever ACP adapter ID handles Ollama chat (needs investigation — see open questions below).

---

### 2. Quality test: gemma4:e4b vs Claude Sonnet

Ran `gemma4:e4b` (9.6 GB, local) against the real `editions/2026-05-18/research.md` using the newsletter-writer system prompt.

**Result: 7.5/10 — good enough for demo, not quite shippable without edits.**

What worked:
- Natural pt-br, correct tone, no translation artifacts
- SCQA structure followed correctly
- Good "👉 O que você pode fazer" CTAs
- Subject line on-point: `Claude Opus 4.7 e o fim da IA vaga`

What differed vs Claude:
- Added emojis to section titles (minor, acceptable)
- Slightly more verbose/flowery
- "Dica da Semana" example prompt less precise
- Used `*italic*` markdown in body

Raw output saved at `/tmp/ollama_newsletter_test.json` (may be cleared on reboot).

---

## Extension system: how it works

Extensions live in `~/.aionui/extensions/<name>/` and are auto-scanned on startup.

**Manifest** (`aion-extension.json`):
```json
{
  "name": "unique-id",
  "displayName": "Human Name",
  "version": "1.0.0",
  "engine": { "aionui": "^1.0.0" },
  "permissions": {
    "filesystem": "extension-only"   // MUST be: extension-only | workspace | full
  },
  "contributes": {
    "assistants": "$file:contributes/assistants.json",
    "modelProviders": "$file:contributes/model-providers.json"
  }
}
```

**Assistant definition** (`contributes/assistants.json`):
```json
[{
  "id": "my-assistant",
  "name": "Display Name",
  "description": "...",
  "presetAgentType": "claude",       // execution engine: claude | gemini | codex | etc.
  "contextFile": "assistants/my-context.md"
}]
```

**Model provider** (`contributes/model-providers.json`):
```json
[{
  "id": "ollama-local",
  "platform": "custom",
  "name": "Ollama (Local)",
  "baseUrl": "http://localhost:11434",
  "models": ["gemma4:e4b", "qwen3.5:9b", ...]
}]
```

Key source files in this repo:
- `src/process/extensions/types.ts` — full Zod schemas for all contribution types
- `src/process/extensions/ExtensionLoader.ts` — scans `~/.aionui/extensions/`
- `src/process/extensions/constants.ts` — path resolution logic
- `src/process/bridge/modelBridge.ts:106` — where extension providers are merged into model list
- `src/renderer/utils/model/modelPlatforms.ts` — all built-in platform configs (UI dropdown)
- `examples/hello-world-extension/` — working reference extension

---

## Open questions / next steps

1. **`presetAgentType` for Ollama** — `"claude"` works but requires Anthropic API key. To use Ollama natively, need to find or create an ACP adapter that routes to Ollama's OpenAI-compatible endpoint (`/v1/chat/completions`). Check `src/process/extensions/resolvers/AcpAdapterResolver.ts` and `examples/hello-world-extension/contributes/acp-adapters.json` for reference.

2. **File I/O for the pipeline** — The newsletter agents need to read `research.md` and write `newsletter.md` to `editions/[DATE]/`. In Claude Code this is handled by the `Read`/`Write` tools. In AionUi the assistant gets the content pasted in chat. Options:
   - Keep it manual: user pastes research.md, copies output to file
   - Use AionUi's filesystem skills to automate file read/write
   - Create a skill that wraps the full pipeline as a single action

3. **Wiring the 3 agents as a pipeline** — AionUi's "Team Mode" can chain agents. Research → Newsletter → Social could run as one coordinated flow. See `docs/prds/conversations/` for Team Mode specs.

4. **Install AionUi** — Repo is at `/Volumes/server-ssd/AionUi`. Run:
   ```
   bun install
   bun run dev      # dev mode
   # or
   bun run build    # production build
   ```

---

## Original newsletter pipeline (for reference)
Source: `/Volumes/server-ssd/newsletter/`  
Agent definitions: `/Volumes/server-ssd/newsletter/.claude/agents/`  
Editions: `/Volumes/server-ssd/newsletter/editions/YYYY-MM-DD/`
