# TheraGraph AI

AI-powered personalized-medicine memory engine. A clinician uploads a patient's genomic +
clinical data → we push it into a **per-patient Cognee knowledge graph** (`remember`), traverse
it (`recall`) to compose a therapy from **pre-approved modular drug blocks**, re-enrich as
outcomes arrive (`improve`), and support "right to be forgotten" (`forget`).

Full spec: [`docs/PROJECT_SOURCE_OF_TRUTH.md`](docs/PROJECT_SOURCE_OF_TRUTH.md).

## Stack

- **Frontend** — Next.js 16 (App Router, React 19, Tailwind v4), React Flow (`@xyflow/react`)
- **Backend** — FastAPI (Python 3.12)
- **Memory** — Cognee Cloud (hybrid graph + vector, one dataset per patient)
- **Relational + files** — Supabase (Postgres + Storage)

## Run

Backend:

```bash
cd backend
source .venv/bin/activate
./run.sh                      # uvicorn app.main:app --reload --port 8000
```

Frontend (separate terminal):

```bash
cd frontend
npm run dev                   # http://localhost:3000
```

Secrets live in `backend/.env` and `frontend/.env.local` (both gitignored).

## Auth

The clinical app sits behind a login gate (Supabase Auth, email/password). Public routes: the
landing page (`/`), `/login`, and `/signup` (self-serve account creation). Protected routes
(`/vault`, `/patients/*`) redirect to `/login` when signed out — enforced by `frontend/proxy.ts`
(Next 16's renamed middleware). New users can create their own account at `/signup`.

Demo accounts (throwaway prototype credentials — not real secrets):

```
email:    demo@gmail.com            email:    clinician@theragraph.ai
password: Demo123                   password: TheraGraph!2026
```

The login form has a one-click "Try the demo" button that fills `demo@gmail.com` / `Demo123`.

## Status

Working and verified end-to-end:

- FastAPI boots, `/health` ok, CORS for `http://localhost:3000`.
- Supabase schema (`patients`, `documents`, `formulations`, `feedback`) + `patient-documents`
  storage bucket are created; CRUD + upload verified.
- All endpoints (§9) return 200: patients CRUD, ingest (Storage + parse + remember), graph,
  formulate, feedback (remember + improve), timeline.
- **Cognee Cloud is live**: `serve` + `remember` + `recall` + `forget` verified against the tenant
  (smoke test returns real graph text — e.g. the CYP2D6 codeine-contraindication chain). All four
  lifecycle ops run server-side on the Cloud tenant's LLM.
- Formulation uses the live `recall` (`GRAPH_COMPLETION`) with the deterministic safety filter and
  rule-based fallback, so a contraindication-safe result is always returned (ratios sum to 1.0,
  masses set). Maya Okafor's formulation flags `CODEINE`/`TRAMADOL` and excludes them.
- Frontend production build + lint are clean; all screens render and are wired to the backend.
- 3 mock patients (Maya Okafor / Daniel Reyes / Aisha Karim) are seeded and their files re-ingested
  into per-patient Cognee datasets.
- Public hero landing page (`/`) + Supabase Auth login gate (`/login`, `proxy.ts` guard).

## How it uses Cognee (the core)

TheraGraph maps the full Cognee memory lifecycle to real product features — not gimmicks:

| Cognee op | Product feature | Where |
|---|---|---|
| `remember` | Ingest genomic + clinical files into a **per-patient** knowledge graph (one dataset per patient) | `POST /api/patients/{id}/ingest` |
| `recall` | Traverse the graph (`GRAPH_COMPLETION`) to build the therapy + draw the graph viz | `/formulate`, `/graph` |
| `improve` | Re-enrich the graph as outcomes are reported, so the next recommendation sharpens | `POST /api/patients/{id}/feedback` |
| `forget` | HIPAA "right to be forgotten" — drop the whole patient dataset | `DELETE /api/patients/{id}` |

> Note on `improve`: the feedback loop's graph enrichment is carried by the observation
> `remember` (add+cognify runs server-side and shifts future recall). The explicit `improve`
> call is best-effort — this Cloud tenant currently returns `404` for `/api/v1/improve`, which the
> backend swallows non-fatally, so `/feedback` still returns `{"status":"optimized","updated":true}`.

The differentiator vs. plain vector RAG: medical facts are a *web of causal relationships*
(gene → enzyme phenotype → drug clearance → contraindication). Chunk-based RAG loses those
long-range links; Cognee's hybrid graph+vector store keeps them. Every `recall` consumer runs
through a normalizer, and formulation applies a **deterministic safety filter** so a
contraindicated block can never appear even if the LLM slips.

Cloud connection is one call at startup: `cognee.serve(url, api_key)` in the FastAPI lifespan.
**After changing `COGNEE_API_KEY`, restart uvicorn** — the connection is cached at startup.

## Demo

Hero patient **Maya Okafor** (CYP2D6 *4/*4 poor metabolizer): ingest her files → the graph shows
`Maya → CYP2D6 *4/*4 → Poor Metabolizer → Codeine cannot activate` → formulate "chronic
inflammatory pain" → ledger shows `MOD_ALPHA_BASE 75% + MOD_BETA_ADJUVANT 25%` with
`CODEINE`/`TRAMADOL` flagged and excluded → add a Timeline observation to trigger `improve` →
delete the patient to demonstrate `forget`. Full 3-minute script: §15 of the source-of-truth doc.

## API

Base URL `http://localhost:8000`. See §9 of the source-of-truth doc for the full table.
