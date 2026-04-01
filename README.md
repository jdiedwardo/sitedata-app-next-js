# Site Data App (Next.js)

A Next.js application that **crawls a same-origin website** (breadth-first), runs **pluggable HTML analyzers** on the fetched pages, and presents results in a **tabbed UI** with charts and **JSON/CSV export**. Each run is also **persisted as JSON** on disk.

## Requirements

- **Node.js** (LTS recommended)
- **npm** (or pnpm / yarn)

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Other scripts

| Command         | Description                     |
|-----------------|---------------------------------|
| `npm run dev`   | Development server (hot reload) |
| `npm run build` | Production build                |
| `npm start`     | Serve production build          |
| `npm run lint`  | Run ESLint                      |

## What it does

1. You provide a **target URL** (and optionally how many pages to crawl).
2. The server **fetches HTML** from that origin only, following internal links up to a **page limit**.
3. Multiple **analyzer modules** run on the crawl (metadata, headings, links, content, images).
4. The UI shows **tabs** per module, **summary metrics**, and lets you **download** results.

### Crawl behavior

- **Same-origin only**: only URLs with the same **origin** as the start URL are crawled.
- **HTML pages**: responses are treated as crawlable when the `Content-Type` suggests HTML (see `src/server/crawler/site-crawler.ts`).
- **Normalization**: URLs are normalized (e.g. fragment stripped, trailing slashes on paths) to avoid duplicate fetches.
- **Limits**:
  - Default **50** pages per run; configurable via API/UI, **clamped between 1 and 200**.
  - Per-request fetch **timeout** (default 10s in the crawler).
  - Queue size cap to avoid runaway memory use.

### Analyzers (default registry)

Registered in `src/server/modules/register-default-modules.ts`:

| Module              | Purpose (high level)                                            |
|---------------------|-----------------------------------------------------------------|
| Page metadata       | Title, description, and related page signals                    |
| Heading structure   | Heading hierarchy / structure analysis                          |
| Link analysis       | Internal vs external links; **link probing** for reachability   |
| Content analysis    | Text extraction (best-effort “visible” text heuristics) and stats |
| Image analysis      | Images discovered across crawled pages                          |

**Link probing**: up to **120** unique `http(s)` URLs are probed; internal and external candidates are **interleaved** so the budget is shared (not all internals first). Remaining links appear as “not checked” in the UI where applicable.

**Content text**: analysis uses server-side HTML parsing (Cheerio). It does **not** execute JavaScript or apply external stylesheets, so it cannot match **pixel-perfect** “only what’s on screen” without a headless browser (e.g. Playwright).

## API

### `POST /api/analyze`

**Body (JSON):**

```json
{
  "targetUrl": "https://example.com",
  "maxPages": 50
}
```

- **`targetUrl`** (required): string — starting URL for the crawl/analysis.
- **`maxPages`** (optional): number — pages to crawl (default **50**, hard max **200**). Use **`1`** to analyze only the entry page without following links.

**Success:** `200` — full analysis payload (see `src/server/types/analysis.ts`).

**Errors:**

- `400` — missing/invalid input (e.g. no `targetUrl`, invalid URL).
- `502` — crawl/fetch failure (e.g. no pages could be crawled).
- `500` — unexpected server error.

Example with `curl`:

```bash
curl -s -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d "{\"targetUrl\":\"https://example.com\",\"maxPages\":10}"
```

## Persistence

Each completed analysis is written under:

`data/analyses/`

Filenames are derived from **`completedAtIso`** (sanitized for the filesystem). The directory is created automatically if missing.

## Project layout (overview)

- `src/app/` — App Router pages and API routes (`/`, `/api/analyze`).
- `src/server/crawler/` — Same-origin BFS crawler.
- `src/server/modules/analyzers/` — Individual analyzer implementations.
- `src/server/services/analysis-service.ts` — Orchestrates crawl → modules → summary → save.
- `src/server/storage/` — JSON repository for saved runs.
- `public/` — Static assets (e.g. branding).

## Tech stack

- **Next.js** (App Router)
- **React**
- **TypeScript**
- **Cheerio** — HTML parsing on the server
- **Recharts** — charts in the UI

## Limitations & notes

- **No cross-origin crawling** — by design; only the start URL’s origin is visited.
- **No JS rendering** — SPAs that need client-side rendering may show incomplete HTML to the crawler.
- **Robots / rate limits** — the app does not implement robots.txt policy or polite throttling beyond timeouts; use responsibly on sites you own or have permission to test.
- **Link probes** issue HTTP requests to external URLs — be mindful of privacy and load when pointing at third-party sites.

## License

Add a `LICENSE` file if you distribute this project.
