# Split — Self-hosted expense splitter

Split bills with friends and family. No subscriptions, no data harvesting, runs on your own server.

**Stack:** SvelteKit + SQLite (no backend setup needed)
**Demo:** [split.example.com](http://localhost:3480)

---

## Features

- **Multi-currency** — Record expenses in any currency, convert to each user's base currency at historical rates via ECB exchange rates
- **Debt simplification** — Greedy algorithm reduces N×M transfers to minimum possible
- **Recurring expenses** — Weekly, monthly, yearly. Auto-generates future instances
- **Item-level splitting** — Break expenses into line items, assign each to different people
- **Offline PWA** — Add expenses offline, queue syncs when back online
- **Multi-language** — English and Spanish, switchable in one tap
- **Three themes** — Dark navy, OLED true black, warm light
- **Invite links** — Share a `/groups/{id}/join` link to add members
- **CSV export** — Download full group expense history

---

## Quick Start

```bash
# Clone and install
npm install

# Start dev server
npm run dev
```

Open [http://localhost:3480](http://localhost:3480), create an account, and start splitting.

---

## Production Deploy

### Docker

```bash
docker build -t split .
docker run -d -p 3480:3480 -v $(pwd)/data:/app/data split
```

Or with Docker Compose:

```bash
docker compose up -d
```

### Home Assistant Addon

The `ha-addon/` directory contains a Home Assistant addon configuration with Ingress support. Point your addon repository to this directory.

### GitHub Actions

Push a version tag to trigger the CI/CD pipeline:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Builds amd64 + arm64, pushes to `ghcr.io/<owner>/split`.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| UI | SvelteKit (Svelte 5) |
| Database | SQLite + better-sqlite3 |
| Auth | Session cookies + scrypt |
| Styling | Custom CSS (dark glassmorphism) |
| i18n | JSON-based, EN/ES |
| Fonts | Self-hosted (JetBrains Mono, Libre Baskerville) |
| PWA | Service worker + offline queue |

---

## Supported Currencies

EUR, GBP, USD, CHF, JPY, CAD, AUD, NZD, SEK, NOK, DKK, PLN, CZK, HUF, RON, BGN, HRK, TRY, BRL, MXN, CNY, INR, KRW, THB, SGD, HKD, ZAR, AED, ILS, PHP, TWD, MYR, IDR

Exchange rates fetched from ECB and cached locally.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3480` | Server port |
| `SESSION_SECRET` | (auto-generated) | Session signing key — set a persistent one for production |
| `NODE_ENV` | `development` | `production` for production builds |

---

## API

All API routes are under `/api/`:

- `POST /api/auth/login` — Login
- `POST /api/auth/register` — Register
- `POST /api/auth/logout` — Logout
- `GET /api/currencies` — List supported currencies
- `GET/POST /api/rates` — Fetch exchange rates
- `GET /api/search?q=` — Search groups, expenses, people
- `GET/POST /api/groups/{id}` — Group CRUD
- `POST /api/settle` — Record a settlement
- `POST /api/groups/{id}/export` — Download CSV

---

## License

MIT
