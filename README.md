# ⚡ Token Buster

> **Reduce your AI coding assistant token usage by 5x–10x.**
> A local, privacy-first tool that tracks file changes, logs prompts, and generates compact context summaries so your AI always has exactly what it needs — nothing more.

---

**Author:** Muhammad Faizan
**GitHub:** [github.com/faizzyhon](https://github.com/faizzyhon)
**Instagram:** [instagram.com/faizzyhon](https://instagram.com/faizzyhon)

---

## Why Token Buster?

Every time you start a new AI session, you re-paste hundreds or thousands of tokens of context. Token Buster solves this:

- **Auto-watches** your project directory for file changes after each AI edit
- **Logs every prompt/response** with before-and-after diffs and token counts
- **Generates a compact context log** — a single copy-pasteable block that gives the AI 100% context in 10–20% of the tokens
- **Dashboard** to track usage, costs, and savings across all your projects

---

## Architecture

```
token_buster/
├── backend/
│   └── app.py           Flask REST API (12 endpoints)
├── core/
│   ├── tokenizer.py     tiktoken / HuggingFace / fallback
│   ├── watcher.py       Watchdog-based file monitor
│   └── summarizer.py    Context log generator
├── db/
│   └── database.py      SQLite (WAL mode, 4 tables)
└── frontend/
    └── src/
        ├── App.js
        ├── api.js
        └── components/
            ├── Sidebar.js
            ├── Dashboard.js
            ├── ProjectView.js
            ├── TokenCounter.js
            ├── LogEditor.js
            └── ContextLogModal.js
```

---

## Quick Start

### Option A — One command (Mac/Linux)

```bash
bash start.sh
```

### Option B — Windows

```bat
start.bat
```

### Option C — Manual

```bash
# 1. Install Python deps
pip install -r requirements.txt

# 2. Build the React frontend
cd token_buster/frontend
npm install
npm run build
cd ../..

# 3. Launch
python main.py --port 5000
```

Open: **http://localhost:5000**

---

## Features

### Dashboard
- Global token usage + savings across all projects
- Per-project stats: input/output tokens, prompts, file changes
- One-click start/stop file watching

### Project View
- Real-time token efficiency bar
- Prompt log timeline with event types (manual, ai-edit, refactor, debug)
- Auto-tracked file changes with token counts

### Context Log Generator
- Auto-generated copy-paste block with all recent changes
- Shows token count before vs. after compression
- Add custom notes to inject into context

### Token Counter
- Count tokens for any text with cost estimates
- Side-by-side diff: compare before/after an AI edit
- Supports: Claude 3.5 Sonnet, Claude 3 Opus, Haiku, GPT-4o, etc.

### Log Editor
- Edit prompt summaries and response summaries
- Update "after content" to capture what changed
- Full CRUD on all prompt records

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check + version |
| GET | `/api/stats/global` | Global token stats |
| GET/POST | `/api/projects` | List / create projects |
| GET/PUT/DELETE | `/api/projects/:id` | Project CRUD |
| POST/DELETE | `/api/projects/:id/watch` | Start/stop file watcher |
| GET/POST | `/api/projects/:id/logs` | Prompt log CRUD |
| PUT/DELETE | `/api/logs/:id` | Update / delete log |
| GET | `/api/projects/:id/changes` | File change history |
| GET | `/api/projects/:id/context-log` | Generate context block |
| POST | `/api/tokenize` | Count tokens + cost estimate |
| POST | `/api/diff` | Diff two texts |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TOKEN_BUSTER_PORT` | `5000` | Server port |
| `TOKEN_BUSTER_DEBUG` | `0` | Debug mode |
| `TOKEN_BUSTER_DB` | `~/.token_buster/token_buster.db` | SQLite path |

---

## Token Savings Example

```
Before Token Buster:
  You paste: 3,200 tokens of file contents + history

After Token Buster:
  Context log: 320 tokens — same information, 10x less

Monthly savings (100 sessions/day):
  ~28,800,000 tokens → ~$86 saved on Claude 3.5 Sonnet
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.10+, Flask 3, Flask-CORS |
| Tokenizer | tiktoken (cl100k_base) + HuggingFace fallback |
| File Monitor | Watchdog 4 |
| Database | SQLite (WAL mode) |
| Frontend | React 18, CSS Variables |
| Packaging | setup.py, pip |

---

## License

MIT © 2025 Muhammad Faizan — [github.com/faizzyhon](https://github.com/faizzyhon)
