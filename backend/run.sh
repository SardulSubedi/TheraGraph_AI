#!/usr/bin/env bash
# Activate venv first: source .venv/bin/activate
exec uvicorn app.main:app --reload --port 8000
