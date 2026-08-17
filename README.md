# sourdough-milk-quant — quant dashboard frontend

React (Vite + TypeScript) frontend for the real-time quant dashboard. Backend
lives in [salt-bread-quant](https://github.com/najibuhuy/salt-bread-quant) —
system design is documented there in `ARCHITECTURE.md`.

Three menus: **Home** (live news, stocks, currency pair picker, crypto),
**Statistics** (order book + prediction methods, milestone 2), **Learning**
(prediction history & outcomes, milestone 3).

## Quickstart

Run the backend first (in ../salt-bread-quant):

```bash
cargo run                    # or: MOCK_SOURCES=1 cargo run  (simulated data)
```

Then (this repo uses [Bun](https://bun.sh)):

```bash
bun install
bun run dev                  # http://localhost:5173 (proxies /api and /ws to :8080)
```

## How data flows

One WebSocket (`/ws`) feeds the whole app: the server replays a full snapshot on
connect, then streams every event. `src/state/store.tsx` holds the single store
(auto-reconnect with backoff); components subscribe via `useMarket()`. No
polling anywhere in the client.

## Build / Docker

```bash
bun run build                # type-check + production bundle in dist/
docker build -t sourdough-milk-quant .   # Bun build stage + nginx runtime
```

The image serves the static build with nginx and proxies `/api` + `/ws` to
`$BACKEND_URL` (default `http://backend:8080`), so the same image works in
docker-compose and Kubernetes. For the full stack, use the `docker-compose.yml`
in the backend repo.

## Configuration

| Env (build-time) | Meaning |
|---|---|
| `VITE_API_URL` | REST base URL (default: same origin, dev-proxied) |
| `VITE_WS_URL` | WebSocket URL (default: same origin `/ws`) |
| `BACKEND_URL` (runtime, Docker) | where nginx proxies `/api` and `/ws` |
