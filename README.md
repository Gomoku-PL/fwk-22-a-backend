
# fwk-22-a-backend

Node.js/Express backend for Gomoku-PL. Handles game logic, user data, GDPR compliance, and multiplayer via Socket.IO.

## Features
- REST API for Gomoku game management
- Socket.IO for real-time multiplayer
- In-memory and MongoDB support
- GDPR endpoints: data access, data portability, consent, retention, deletion
- Comment-stripping and formatting scripts for codebase hygiene

## Setup
1. Install dependencies:
	```sh
	npm install
	```
2. Start development server (in-memory):
	```sh
	npm run dev:memory
	```
3. For MongoDB:
	```sh
	npm run start:mongo
	npm run dev:mongodb
	```

## Scripts
- `npm run strip:comments` — Remove comments from all source files
- `npm run format:repo` — Format all code/config files with Prettier
- `npm run test:xss` — Run XSS protection tests

## Key API Endpoints
- `/api/games` — Create, get, move, undo games
- `/api/data-access` — Download all personal data (JSON)
- `/api/data-portability` — Export personal data (JSON/CSV)
- `/api/consent` — Manage user consent
- `/api/data-retention` — Data retention info
- `/api/data-deletion` — Request data deletion

## GDPR Compliance
- Data access, portability, consent, retention, deletion endpoints
- Data export supports JSON and CSV formats

## Development
- All source code in `src/`
- Scripts in `scripts/`
- Tests in `tests/`

## License
ISC
