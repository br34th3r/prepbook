# Mealplan — one-command local stack.
#
# Two processes run on the mini PC:
#   1. Supabase (Postgres/Auth/Storage) via the Supabase CLI + Docker.
#   2. The Next.js app (dev: `make dev`, prod: `make up`).

.PHONY: help install supabase db dev build start up down backup test stop reset

help:
	@echo "Mealplan targets:"
	@echo "  make install   Install Node dependencies (pnpm)"
	@echo "  make supabase  Start the local Supabase stack"
	@echo "  make db        Apply migrations + seed (supabase db reset)"
	@echo "  make dev       Run the Next.js dev server (after make supabase)"
	@echo "  make up        Build + run the app container (after make supabase)"
	@echo "  make down      Stop the app container"
	@echo "  make stop      Stop Supabase"
	@echo "  make backup    Dump the database to ./backups"
	@echo "  make test      Run unit tests"

install:
	pnpm install

supabase:
	supabase start

db:
	supabase db reset

dev:
	pnpm dev

build:
	pnpm build

start: build
	pnpm start

# Production-ish: bring up Supabase, then the app container.
up: supabase
	docker compose up --build -d
	@echo "App running at http://localhost:3000 (and your LAN IP)."

down:
	docker compose down

stop:
	supabase stop

backup:
	./scripts/backup.sh

test:
	pnpm test
