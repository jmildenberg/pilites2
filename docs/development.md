# Development Setup

## Prerequisites

- Python 3.11 or later
- Node.js 20 or later
- A Raspberry Pi is **not** required for local development — mock hardware mode skips GPIO output.

## Repository Layout

```text
/
  backend/       # Python FastAPI application
  frontend/      # React + TypeScript application
  docs/          # Documentation
```

## Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Running Locally

```bash
MOCK_HARDWARE=true DATA_DIR=./data uvicorn main:app --reload --port 8000
```

- `MOCK_HARDWARE=true` — skips GPIO and hardware output. Required on non-Pi hardware.
- `DATA_DIR=./data` — stores play and channel data in a local `data/` directory instead of `/var/lib/pilites`.
- `--reload` — restarts the server on file changes.

### Environment Variables

| Variable | Default | Description |
| ---------- | --------- | ------------- |
| `DATA_DIR` | `/var/lib/pilites` | Base directory for stored data. |
| `MOCK_HARDWARE` | `false` | Set to `true` to skip hardware output. |
| `HARDWARE_TEST_TIMEOUT_SEC` | `30` | Seconds before a hardware test signal auto-clears. |
| `FPS_TARGET` | `30` | Target frames per second for the render loop. |
| `HOST` | `0.0.0.0` | Host the server binds to. |
| `PORT` | `8000` | Port the server listens on. |

## Frontend Setup

```bash
cd frontend
npm install
```

### Running Frontend Locally

```bash
npm run dev
```

The frontend dev server runs on port 5173 by default and proxies API and WebSocket requests to the backend at `http://localhost:8000`. Proxy configuration lives in `vite.config.ts`.

## Running Both Together

Start the backend first, then the frontend in a separate terminal:

```bash
# Terminal 1
cd backend && MOCK_HARDWARE=true DATA_DIR=./data uvicorn main:app --reload --port 8000

# Terminal 2
cd frontend && npm run dev
```

Open `http://localhost:5173` in a browser.

## On Raspberry Pi

The backend must run as root to access PWM hardware:

```bash
sudo DATA_DIR=/var/lib/pilites uvicorn main:app --host 0.0.0.0 --port 8000
```

For production use, install as a systemd service (see the readme for deployment notes).

## Data Directory Initialization

The backend creates the required directory structure under `DATA_DIR` on startup if it does not exist:

```text
DATA_DIR/
  channels.json
  plays/
  backups/plays/
  exports/plays/
  imports/plays/
```

## Running Tests

```bash
# Backend
cd backend && pytest

# Frontend
cd frontend && npm test
```
