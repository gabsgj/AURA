.PHONY: help venv install-backend install-frontend install-dev run-backend run-frontend test lint format build clean

# Default target
help:
	@echo "Available targets:"
	@echo "  venv              - Create Python virtual environment"
	@echo "  install-backend   - Install backend dependencies"
	@echo "  install-frontend  - Install frontend dependencies"
	@echo "  install-dev       - Install development dependencies"
	@echo "  run-backend       - Run backend development server"
	@echo "  run-frontend      - Run frontend development server"
	@echo "  test              - Run all tests"
	@echo "  lint              - Run linters"
	@echo "  format            - Format code"
	@echo "  build             - Build frontend for production"
	@echo "  clean             - Clean build artifacts"

# Python virtual environment
venv:
	python -m venv .venv
	@echo "Virtual environment created. Activate with:"
	@echo "  Windows: .venv\\Scripts\\activate"
	@echo "  Unix/Mac: source .venv/bin/activate"

# Backend dependencies
install-backend:
	cd backend && pip install -r requirements.txt

install-dev:
	cd backend && pip install -r requirements-dev.txt

# Frontend dependencies
install-frontend:
	cd frontend && npm ci

# Development servers
run-backend:
	cd backend && python -m backend.app

run-frontend:
	cd frontend && npm run dev

# Testing
test:
	cd backend && pytest -q
	cd frontend && npm run test --silent

# Linting and formatting
lint:
	cd backend && black --check .
	cd backend && isort --check-only .
	cd backend && flake8 .
	cd frontend && npm run typecheck

format:
	cd backend && black .
	cd backend && isort .

# Build
build:
	cd frontend && npm run build

# Clean
clean:
	rm -rf backend/__pycache__
	rm -rf backend/**/__pycache__
	rm -rf frontend/dist
	rm -rf frontend/node_modules/.cache
