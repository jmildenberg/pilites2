.PHONY: help install test lint dev clean \
        backend-install backend-dev backend-test backend-lint \
        frontend-install frontend-dev

# ── Config ─────────────────────────────────────────────────────────────────────

PYTHON        := python3
VENV          := backend/.venv
PIP           := $(abspath $(VENV)/bin/pip)
PYTEST        := $(abspath $(VENV)/bin/pytest)
UVICORN       := $(abspath $(VENV)/bin/uvicorn)

DATA_DIR      ?= ./backend/data
PORT          ?= 8000
FPS_TARGET    ?= 30

# ── Help ───────────────────────────────────────────────────────────────────────

help:
	@echo ""
	@echo "PiLites — available targets"
	@echo ""
	@echo "  install            Install backend and frontend dependencies"
	@echo "  dev                Run backend (mock hardware) + frontend dev server"
	@echo "  test               Run all tests"
	@echo "  lint               Lint backend source"
	@echo "  clean              Remove generated files and build artifacts"
	@echo ""
	@echo "  backend-install    Create Python venv and install backend deps"
	@echo "  backend-dev        Run backend with mock hardware"
	@echo "  backend-test       Run backend test suite"
	@echo "  backend-lint       Lint backend source with ruff"
	@echo ""
	@echo "  frontend-install   Install frontend npm dependencies"
	@echo "  frontend-dev       Run frontend dev server"
	@echo ""

# ── Top-level ──────────────────────────────────────────────────────────────────

install: backend-install frontend-install

test: backend-test

lint: backend-lint

dev:
	@echo "Starting backend and frontend..."
	@$(MAKE) backend-dev &
	@$(MAKE) frontend-dev

clean:
	find backend -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find backend -name "*.pyc" -delete 2>/dev/null || true
	rm -rf backend/.venv backend/.pytest_cache backend/htmlcov backend/.coverage
	rm -rf frontend/node_modules frontend/dist 2>/dev/null || true

# ── Backend ────────────────────────────────────────────────────────────────────

backend-install:
	$(PYTHON) -m venv $(VENV)
	$(PIP) install --quiet --upgrade pip
	$(PIP) install --quiet -r backend/requirements.txt
	@echo "Backend ready. Activate with: source backend/.venv/bin/activate"

backend-dev: $(VENV)
	cd backend && \
	  MOCK_HARDWARE=true \
	  DATA_DIR=$(DATA_DIR) \
	  FPS_TARGET=$(FPS_TARGET) \
	  $(UVICORN) main:app --reload --host 0.0.0.0 --port $(PORT)

backend-test: $(VENV)
	cd backend && $(PYTEST) -v

backend-lint: $(VENV)
	$(VENV)/bin/ruff check backend/

$(VENV):
	$(MAKE) backend-install

# ── Frontend ───────────────────────────────────────────────────────────────────

frontend-install:
	@if [ -d frontend ]; then cd frontend && npm install; \
	else echo "frontend/ not yet created — skipping"; fi

frontend-dev:
	@if [ -d frontend ]; then cd frontend && npm run dev; \
	else echo "frontend/ not yet created — skipping"; fi
