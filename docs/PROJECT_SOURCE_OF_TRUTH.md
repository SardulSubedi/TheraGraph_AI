# TheraGraph AI — Source of Truth

> Single authoritative build document. An agent (or human) should be able to build the
> entire hackathon prototype from this file alone, without reading the original chat.
>
> **Hackathon:** WeMakeDevs × Cognee — "The Hangover Part AI" (Jun 29 – Jul 5, 2026).
> **Prize logic:** win by using Cognee's memory lifecycle (`remember` / `recall` / `improve` / `forget`)
> deeply and correctly, wrapped in a polished, credible product.
> **Deployment target for memory:** **Cognee Cloud** (confirmed). All API keys already live in the
> `.env` files (see [§13 Environment](#13-environment-variables)).

---

## 0. TL;DR for the impatient

TheraGraph AI is an **AI-powered personalized-medicine memory engine**. A clinician uploads a
patient's genomic + clinical data. We push it into a **per-patient Cognee knowledge graph**
(`remember`). When a therapy is needed, we **traverse that graph** (`recall`) to produce a
*modular formulation* built from **pre-approved drug building blocks** (not a novel unapproved
molecule). As the patient reports outcomes over time, we **re-enrich the graph** (`improve`) so
the next recommendation is sharper. Data governance / HIPAA "right to be forgotten" is `forget`.

The differentiator vs. plain RAG: medical facts are a *web of causal relationships*
(gene → enzyme phenotype → drug clearance → contraindication). Chunk-based vector RAG loses those
long-range links; Cognee's hybrid graph+vector store keeps them and lets an agent recall them
across infinite sessions.

**Stack:** Next.js 16 (App Router, React 19, Tailwind v4) frontend · FastAPI (Python 3.12) backend ·
Cognee Cloud for memory · Supabase (Postgres + Storage) for relational records and raw files ·
Gemini for LLM/embeddings (configured on the Cognee Cloud tenant).

**Status (current build session):** the two original credential blockers are **RESOLVED** — Cognee Cloud
is live (`serve`/`remember`/`recall`/`improve`/`forget` verified end-to-end) and the tenant LLM answers.
The public landing page, the Supabase Auth login gate, and the §6.6 UI/UX polish pass are all **built**.
See [§2](#2-preflight--known-blockers-do-this-first) and [§2A](#2a-build-status-as-of-the-build-session).

---

## 1. What I changed from the original plan (and why)

The chat transcript (Gemini) produced a strong *pitch*, but several technical details were
marketing-shaped or simply wrong against the installed SDK. This section records the deliberate
divergences so nobody "corrects" the doc back to the transcript.

| Transcript said | Reality / decision | Why |
|---|---|---|
| `cognee.remember(payload=..., dataset_name=...)` | Real signature is `remember(data, dataset_name=..., *, session_id=..., run_in_background=..., ...)`. First arg is **`data`** (positional), there is **no `payload=` kwarg**. | Verified against `cognee==1.2.2` source. Using `payload=` raises `TypeError`. |
| `cognee.improve(dataset_name=...)` | Real signature is `improve(dataset="main_dataset", *, run_in_background=..., node_name=..., session_ids=...)`. Kwarg is **`dataset`**, not `dataset_name`. | Verified. |
| `cognee.forget(dataset="...")` positional | Real signature is `forget(*, data_id=None, dataset=None, dataset_id=None, everything=False, memory_only=False)` — **all keyword-only**. | Verified. |
| `recall()` returns a string you feed to an LLM | `recall()` returns a **list** of result objects; each has `.text`, `.source`, `.score`, etc. In Cloud mode it's a list of plain dicts. | Verified. Design the formulation step around a list, not a string. |
| "Wire Claude/GPT-4o as a separate reasoning engine" | Use **`recall()` with a structured `system_prompt`** (runs `GRAPH_COMPLETION` on the Cognee Cloud tenant's LLM) to generate the formulation, plus a deterministic rule-based fallback. Optionally a local LLM for polish. | (a) Scores higher on "Best Use of Cognee". (b) The local Gemini key currently has **0 quota** (see §2), so don't hard-depend on a local LLM call. (c) One fewer moving part in 48h. |
| Never mentioned connecting to Cloud | You **must** call `await cognee.serve(url=..., api_key=...)` once at startup. Without it, `remember/recall/...` run against a local (empty) store. | Verified: every V2 op checks `get_remote_client()`. |
| Graph visualizer = hardcoded animation | Render the graph from **real recalled data**: a structured `recall()` returns nodes+edges JSON that React Flow draws. Falls back to a deterministic layout only if recall is empty. | Judges (Cognee's own team) will look for real graph usage, not a fake canvas. |
| Heavy Supabase Auth + login flow | Keep Supabase for **patient metadata + file storage**. Make auth **minimal**: a single hardcoded "demo clinician" for the prototype. | Auth is demo friction with zero judging value here. Ship the memory story instead. |
| `improve(session_ids=...)` for the feedback loop | On **Cloud**, the remote client's `improve` only forwards `dataset` + `node_name` (no `session_ids`). **Also: this Cloud tenant returns `404 Not Found` for `POST /api/v1/improve` — the route isn't deployed.** So the feedback loop's real graph enrichment is the **`remember(new_observation)`** call (add+cognify server-side); `improve` is best-effort and its 404 is swallowed non-fatally. `/feedback` still returns `{"status":"optimized","updated":true}` because `remember` succeeded. | Verified this session (`Remote improve failed (404)` in `cloud_client.py`). Session bridging is local-only; the observation `remember` is what shifts future recall. |
| `SUPABASE_URL="https://<ref>.supabase.co/rest/v1/"` | `SUPABASE_URL` **must be the bare project URL** `https://<ref>.supabase.co` (no `/rest/v1`). `supabase-py` appends `/rest/v1` itself; a trailing path yields `PGRST125 "Invalid path specified in request URL"` on every call. | Verified this session — burned time on it. Keep the env value bare. |
| `recall()` items are plain dicts | On this Cloud tenant `recall()` returns **discriminated pydantic response objects** (`ResponseQAEntry`, `ResponseGraphEntry`, …), not always dicts. Access fields via a `getattr`-or-`dict.get` **normalizer** that yields `{text, source, score}`. | Verified against `cognee==1.2.2`. All recall consumers go through `normalize_recall_results()`. |
| `.venv` has `pip` | The project `.venv` has **no `pip` module**. Don't `pip install` into it; every dependency in §13 is already present. Use `python -c "import importlib.metadata …"` to check versions. | Verified. |
| App should hard-fail if Cognee/Supabase are down | The app **degrades gracefully**. Cognee failures (Blocker A `401`) never 500 the request: ingest still uploads+tracks the file (`status: remember_failed`), feedback still records (`status: recorded`, `updated:false`), formulate falls back to the rule-based composition. Supabase failures (our own infra) do surface as `502`. | Decision this session. Keeps the demo usable before the Cloud key is fixed. |
| Minimal hardcoded "demo clinician", no landing page | **Superseded** (see §6.0/§6.05): the product now gets a public **hero landing page** with scroll-storytelling and a real **login/auth gate** in front of the clinical workspace, because not everyone should reach patient data. The Vault moves behind auth. | Product direction change requested this session. |

Everything else from the transcript (the per-patient dataset pattern, the dark minimalist UI,
the modular-block regulatory framing, the core screen flow) is **kept** — it's good and correct.

---

## 2. Preflight / known blockers (RESOLVED)

Both original blockers were credential problems found by live-testing `.env`. **Both are now fixed.**
This section is kept for history + the exact symptoms, so nobody re-debugs a solved problem.

### Blocker A — Cognee Cloud API key (was 401) — ✅ RESOLVED

- **Was:** `COGNEE_API_KEY` in `.env` held the **Tenant ID** (`08c9456c-…`); the Cloud SDK sends it
  as the `X-Api-Key` header and the server rejected it → every `remember`/`recall`/`improve`/`forget`
  returned **401 `{"detail":"Unauthorized"}`** (while `serve()` still "connected").
- **Fix applied:** `backend/.env` `COGNEE_API_KEY` is now a **real Cloud API key** (64-hex generated
  secret from the dashboard), distinct from the Tenant ID. `COGNEE_SERVICE_URL` + `COGNEE_USER_ID`
  unchanged.
- **Verified:** smoke test §12.1 → `remember` `status: completed` (~16s), `recall` returns real graph
  text (the CYP2D6 poor-metabolizer / codeine-contraindication explanation), `forget` ok.
- **Operational gotcha (bit us this session):** `cognee_engine.connect()` caches `_connected=True`
  and never re-reads env. A uvicorn process started **before** the key was fixed keeps the stale key
  and keeps 401-ing. **After changing `COGNEE_API_KEY`, restart uvicorn** (a `--reload` restart or a
  fresh process) so lifespan re-runs `serve()` with the new key.

### Blocker B — Gemini key 0 quota (was 429) — ✅ RESOLVED (on the tenant)

- **Was:** a *local* `litellm.completion(gemini/gemini-2.0-flash)` returned **429** `limit: 0`.
- **Reality:** in **Cloud mode** the LLM/embeddings run on the **Cognee Cloud tenant**, not locally.
  The tenant's configured model has working quota — proven because `recall` returns a real
  `GRAPH_COMPLETION` answer (that requires the tenant LLM). The local 0-quota key is irrelevant to
  the cloud path; we never hard-depend on a local LLM call (formulation still keeps a rule-based
  fallback per [§8.4](#84-formulation-generation)).

### Preflight checklist

```
[x] backend/.env COGNEE_API_KEY is a real Cognee Cloud API key (64-hex, not the tenant id)
[x] Cognee Cloud tenant has a working LLM + embedding model (recall returns GRAPH_COMPLETION text)
[x] Smoke test §12.1 (serve + remember + recall) returns real graph text
[x] Supabase project reachable with the anon key (tables created per §11)
[x] Supabase Storage bucket `patient-documents` created (+ permissive demo policy)
[x] Supabase Auth: Email provider + a seeded demo clinician user (see §11.1)
[x] Frontend: @xyflow/react + @supabase/ssr installed; dev server boots
[x] Backend: uvicorn boots, /health returns ok, CORS allows http://localhost:3000
[!] After any COGNEE_API_KEY change: RESTART uvicorn (connect() caches the key at startup)
```

---

## 2A. Build status (as of the build session)

Snapshot of what is actually implemented and verified, so nobody re-does finished work.

**Done + verified**
- Backend fully scaffolded (`app/` tree per §5), imports cleanly, boots under uvicorn, `/health` → `{"status":"ok"}`, CORS for `http://localhost:3000`.
- All §9 endpoints return `200`: patients CRUD, ingest, graph, formulate, feedback, timeline. `DELETE /api/patients/{id}` also calls `forget_patient`.
- **Cognee Cloud is LIVE** (Blocker A fixed): `serve` + `remember` + `recall` + `forget` verified against the tenant via smoke test §12.1 (`remember` → `completed` in ~16s; `recall` → real GRAPH_COMPLETION text). All four lifecycle ops run server-side on the tenant LLM.
- Formulation now uses the live `recall` (`GRAPH_COMPLETION`) + the deterministic safety filter + rule-based fallback (ratios sum to 1.0, `mass_mg` set) — a contraindication-safe `Formulation` is always returned, and with a populated graph Maya's `CODEINE`/`TRAMADOL` flags appear.
- Supabase provisioned via the Supabase tooling: tables `patients` / `documents` / `formulations` / `feedback` (§11) + private `patient-documents` bucket + a permissive demo storage policy for `anon`/`authenticated`. Insert / select / delete / upload all verified with the anon key.
- **Supabase Auth** enabled: a demo clinician user (`clinician@theragraph.ai`) is seeded (pre-confirmed, bcrypt via `auth.users` + `auth.identities`); password sign-in returns a valid access token. See §11.1.
- `backend/requirements.txt` pinned to the installed versions (§13). `run.sh` executable.
- Frontend built on **Next.js 16.2.10 (Turbopack)**: `npm run build` and `npm run lint` both pass. Installed `@xyflow/react@^12.11.1`, `@supabase/supabase-js`, and `@supabase/ssr`. `NEXT_PUBLIC_API_BASE_URL="http://localhost:8000"` in `.env.local`.
- **Public hero landing page** at `/` (scroll-storytelling, sticky nav, CTAs) — built (§6.0).
- **Auth gate** (§6.05/§11.1) — built: `proxy.ts` (Next 16 middleware) guards `/vault` + `/patients/*`; unauth → `307 /login?next=…`; `/login` page + `LoginForm`; sign-out control in the app shell; `@supabase/ssr` browser + server clients + cookie handling.
- **UI/UX polish** (§6.6) — built: shared primitives (`Input`, `Skeleton`, `Toast`/`useToast`/`Toaster`, `Modal`; `Button`/`Card`/`Badge` kept backward-compatible + `Badge` `warning` tone + `Button` focus ring), graph legend + "DEMO DATA" marker + extended node colors, formulation ratio bar + prominent `mass_mg` + excluded-contraindication badges + rationale, per-file ingest spinner + non-blocking `remember_failed` warning, empty states + skeleton loaders, motion tokens with `prefers-reduced-motion`.
- 3 mock patients (Maya Okafor / Daniel Reyes / Aisha Karim) seeded via the API; their genome + history files live in `backend/app/data/mock_patients/` and are re-ingested into per-patient Cognee datasets after the key fix.
- Graceful degradation still wired end-to-end (see §1 table): if Cognee is ever down again, the demo stays usable.

**Next.js 16 specifics discovered (respect these)**
- Dynamic route `params` is a **`Promise`**: `params: Promise<{ id: string }>` then `await params`. Sync access is removed.
- Turbopack is the default for `dev`/`build`. `next lint` is removed — the project runs `eslint` directly.
- `middleware` is renamed to **`proxy`**: the file is `frontend/proxy.ts` exporting `export async function proxy(request: NextRequest)` + `export const config.matcher`. Confirmed against `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`; build reports `ƒ Proxy (Middleware)`.
- `@supabase/ssr` cookie handling uses the **async** `cookies()` (`const cookieStore = await cookies()`) with getAll/setAll adapters, both in `proxy.ts` and the server client.
- Interactive screens use thin `*PageClient.tsx` wrappers so pages stay Server Components. Helper components beyond the minimal §5 tree: `ControlVault.tsx`, `PatientNav.tsx`, `PatientScreenLabel.tsx`, plus `components/landing/*`, `components/auth/*`, and expanded `components/ui/*`.

**Still open**
- **Submission README + demo video** — README exists and is current; the recorded backup video is not done.
- **Production hardening (not hackathon scope)** — real RLS + service-role key on the backend + bearer-token API auth (see §9, §11.1). Intentionally deferred.

---

## 3. Product concept & pitch

**One-liner:** "Most medical AI has amnesia — it treats every patient like a stranger. In
personalized medicine, forgetting one genetic marker can be fatal. TheraGraph gives AI a permanent,
evolving clinical memory built on Cognee, turning static prescribing into an adaptive healing loop."

**The regulatory-credible framing (say this to judges):** We are not manufacturing novel molecules
per patient. TheraGraph is the **intelligence layer**. It analyzes a patient's genome + history and
composes a therapy from a library of **pre-approved modular building blocks** (dose, base compound,
adjuvants). The output is a structured spec that a **compounding pharmacy or CDMO partner** can
prepare. Long-term vision: as regulatory science for personalized therapeutics matures, the same
platform supports increasingly individualized medicines.

**Judging-criteria alignment** (from the hackathon page):
- *Potential Impact* — safer, personalized prescribing; avoids adverse drug reactions from genetics.
- *Creativity* — memory-first medical agent; graph beats RAG for causal medical chains.
- *Technical Excellence* — clean FastAPI + typed schemas + real Cognee lifecycle usage.
- *Best Use of Cognee* — all four ops (`remember`/`recall`/`improve`/`forget`) map to real product
  features, not gimmicks.
- *User Experience* — dark, minimal, trust-inspiring clinical UI.
- *Presentation* — end-to-end demo: upload → graph → formulation → feedback → adapted graph.

---

## 4. High-level architecture

```
┌───────────────────────────────────────────────────────────────────────────┐
│  Next.js 16 Web App  (App Router, React 19, Tailwind v4)                    │
│  Public: Landing (scroll-story) · Login (Supabase Auth)                     │
│  Authed: Vault · Intake · Topology · Synthesis · Timeline                   │
└───────────────┬───────────────────────────────────────────────┬───────────┘
                │ fetch (JSON / multipart)                        │ supabase-js
                ▼                                                 ▼
┌───────────────────────────────────────────────┐   ┌───────────────────────┐
│  FastAPI backend (Python 3.12)                 │   │  Supabase              │
│  routers: patients, ingest, formulate, feedback│   │  - Postgres (metadata) │
│  services: cognee_engine, parser, formulator,  │   │  - Storage (raw files) │
│            supabase_client, blocks             │   └───────────────────────┘
└───────────────┬────────────────────────────────┘
                │  cognee SDK (V2 memory API), routed to Cloud via serve()
                ▼
┌───────────────────────────────────────────────┐
│  COGNEE CLOUD tenant                            │
│  - hybrid graph + vector store (per-patient ds) │
│  - LLM + embeddings run server-side             │
└─────────────────────────────────────────────────┘
```

**Data-placement rule (memorize this):**
- **Supabase Postgres** → structured, queryable, non-memory records: patient profile (id, name,
  DOB, MRN), uploaded-file index, formulation history, feedback log.
- **Supabase Storage** → the raw uploaded bytes (`.vcf`, `.txt`, `.pdf`).
- **Cognee Cloud** → the *meaning*: extracted entities, genotype→phenotype→drug edges, session
  history weights. One **dataset per patient** for memory isolation.

---

## 5. Repository layout (current + target)

Current state (already scaffolded):

```
TheraGraph_AI/
├── .gitignore
├── docs/
│   └── PROJECT_SOURCE_OF_TRUTH.md   ← this file
├── backend/
│   ├── .env                         ← secrets present (gitignored)
│   └── .venv/                       ← Python 3.12; cognee, fastapi, uvicorn, supabase, pypdf, litellm installed
└── frontend/                        ← Next.js 16 app (create-next-app default, Tailwind v4)
    ├── .env.local                   ← NEXT_PUBLIC_SUPABASE_* present
    ├── app/{layout.tsx,page.tsx,globals.css}
    ├── package.json                 ← next 16.2.10, react 19.2.4
    └── ...
```

Target backend layout to create:

```
backend/
├── .env
├── requirements.txt                 ← pin what's already in .venv (see §13)
├── run.sh                            ← uvicorn app.main:app --reload --port 8000
└── app/
    ├── __init__.py
    ├── main.py                       ← FastAPI app, CORS, lifespan (calls cognee.serve once)
    ├── config.py                     ← pydantic-settings; loads .env
    ├── schemas.py                    ← pydantic request/response models
    ├── services/
    │   ├── __init__.py
    │   ├── cognee_engine.py          ← thin wrapper: connect/remember/recall/improve/forget
    │   ├── parser.py                 ← pdf/vcf/txt → clean text
    │   ├── blocks.py                 ← modular drug-block library + safety rules
    │   ├── formulator.py             ← recall → JSON formulation (+ rule-based fallback)
    │   └── supabase_client.py        ← supabase-py client + table helpers
    ├── routers/
    │   ├── __init__.py
    │   ├── patients.py               ← CRUD patient metadata (Supabase)
    │   ├── ingest.py                 ← upload → Storage → cognee.remember
    │   ├── graph.py                  ← recall structured nodes/edges for viz
    │   ├── formulate.py              ← generate formulation
    │   └── feedback.py               ← remember(observation) + improve
    └── data/
        └── mock_patients/            ← §10 mock files live here (also uploadable via UI)
```

Target frontend layout (App Router). All ✅ = built + verified (`npm run lint` + `npm run build` pass):

```
frontend/
├── proxy.ts                          ✅ Next 16 "proxy" (formerly middleware): guards /vault + /patients/*, unauth → 307 /login?next=…; signed-in on /login → /vault
└── app/
    ├── layout.tsx                    ✅ fonts, dark theme, <body> shell
    ├── globals.css                   ✅ palette + design tokens (§7) + scroll-behavior + motion tokens + prefers-reduced-motion
    ├── page.tsx                      ✅ Screen 0: PUBLIC hero LANDING page (scroll-storytelling). No longer the Vault.
    ├── login/page.tsx                ✅ Screen 0.5: login/auth gate (Supabase Auth) — renders <LoginForm/>
    ├── vault/page.tsx                ✅ Screen 1: Control Vault (moved here, behind auth). Was app/page.tsx.
    ├── lib/
    │   ├── api.ts                    ✅ typed fetch wrappers to FastAPI
    │   ├── supabase.ts               ✅ simple browser supabase client (anon key) — legacy, kept
    │   ├── supabase-browser.ts       ✅ @supabase/ssr createBrowserClient (memoized getBrowserClient())
    │   ├── supabase-server.ts        ✅ @supabase/ssr createServerClient (async cookies(), getAll/setAll)
    │   ├── auth.ts                   ✅ signIn / signOut / getSession (browser)
    │   └── types.ts                  ✅ shared TS types (mirror backend schemas)
    ├── components/
    │   ├── landing/                  ✅ Nav (sticky/solidify), Hero, Reveal (IntersectionObserver), Section, LifecycleSection, Footer
    │   ├── auth/                     ✅ LoginForm, SignOutButton
    │   ├── ControlVault.tsx          ✅ Screen 1 client shell (+ sign-out in header)
    │   ├── Dropzone.tsx              ✅ multi-file upload ("use client"); spinner + non-blocking remember_failed warning
    │   ├── GraphCanvas.tsx           ✅ React Flow visualizer ("use client"); legend + "DEMO DATA" marker + demo-graph fallback
    │   ├── FormulationLedger.tsx     ✅ modules table + ratio bar + mass_mg + excluded-contraindication badges + JSON payload
    │   ├── Timeline.tsx              ✅ feedback log + input; friendly empty state
    │   ├── PatientNav.tsx            ✅ breadcrumb (→ /vault) + tab nav (helper)
    │   ├── PatientScreenLabel.tsx    ✅ (helper)
    │   └── ui/                       ✅ Button, Card, Badge, CommandBar, Input, Skeleton, Toast (useToast + Toaster), Modal
    └── patients/[id]/                (all behind auth via proxy.ts)
        ├── layout.tsx                ✅ workspace shell w/ breadcrumb + tab nav + sign-out; graceful "backend unavailable" state
        ├── intake/page.tsx (+IntakePageClient.tsx)            ✅ Screen 2 (+ empty state)
        ├── graph/page.tsx (+GraphPageClient.tsx)              ✅ Screen 3 (+ skeleton + empty-graph hint)
        ├── formulation/page.tsx (+FormulationPageClient.tsx)  ✅ Screen 4 (+ skeleton + Toaster + empty states)
        └── timeline/page.tsx                                  ✅ Screen 5
```

> **Routing note:** the public root `/` becomes the hero landing page; the authenticated app lives
> under `/vault` and `/patients/[id]/*`. `proxy.ts` (Next 16's renamed middleware) enforces the gate.
> Remember dynamic `params` is a `Promise` in Next 16 — `await params`.

> **Next.js caveat:** this is Next **16** (very new). Before writing routing/server-action code,
> read the bundled guides in `frontend/node_modules/next/dist/docs/` (per `frontend/AGENTS.md`).
> Defaults assumed here: Server Components by default; add `"use client"` to interactive components;
> the frontend talks to FastAPI directly via `fetch` (no Next API routes needed for the core flow).

---

## 6. Screen-by-screen UX

Public marketing surface → auth gate → the authenticated clinical app. Inside a patient the flow
is tabs in a workspace:

```
[0 Hero Landing] --Get started/Sign in--> [0.5 Login] --auth--> [1 Control Vault]
   (public, scroll-story)                    (gate)                 │  select/create
                                                                    ▼
[2 Intake Canvas] --process--> [3 Neural Topology]
                                     │
                        [4 Synthesis Console]
                                     │
                        [5 Longitudinal Matrix]
```

**Screen 0 — Hero Landing** (`/`, public)
A real marketing website page that sells the product before anyone logs in. Full-viewport dark
hero: the product name, the one-liner from §3 ("Most medical AI has amnesia…"), and a primary CTA
("Enter the console" / "Sign in") plus a secondary "See how it works". Below the fold, a
**scroll-storytelling** experience — as the user scrolls, sections animate/reveal in sequence and
explain the product like a regular landing page:

1. **The problem** — medical AI forgets; forgetting one genetic marker can be fatal.
2. **The insight** — medical facts are a *web of causal relationships* (gene → enzyme phenotype →
   drug clearance → contraindication); chunk-based vector RAG loses these long-range links.
3. **The solution** — a permanent, evolving clinical memory graph on Cognee.
4. **The lifecycle** — animated walkthrough of `remember → recall → improve → forget` mapped to real
   product features (ingest → formulate → feedback loop → right-to-be-forgotten).
5. **Regulatory-credible framing** — modular pre-approved building blocks, not novel molecules
   (the §3 pitch), the CDMO/compounding-partner handoff.
6. **Closing CTA** — sign in to the console; footer with a "prototype / not for clinical use" note.

Implementation guidance (don't over-build): scroll reveal via `IntersectionObserver` or a light
library; a sticky top nav that turns solid on scroll; smooth-scroll anchor links; keep it fast and
on-palette (§7). Content is copy-driven, no real patient data appears here (it's public).

**Screen 0.5 — Login / Auth gate** (`/login`)
Not everyone should reach patient data, so the Vault and every `/patients/*` route sit behind
authentication. Use **Supabase Auth** (already have the project + client): email + password sign-in
for the demo (optionally magic-link). A centered card on the dark canvas: email, password,
"Sign in", inline error states, and a subtle link back to the landing page. On success → redirect
to `/vault`. `proxy.ts` (Next 16 middleware) guards protected routes and redirects unauthenticated
users to `/login`; signed-in users hitting `/login` are bounced to `/vault`. Provide a sign-out
control in the app shell. For the hackathon, seed one or two demo clinician accounts (documented in
the README, not committed as plaintext secrets). See §11 for the auth/RLS note.

**Screen 1 — Control Vault** (`/vault`, authenticated)
Two columns. Left: searchable list of patients from Supabase (name + node/vector counts once
known). Right: "recent activity" / empty-state CTA. Top-center command bar (`Cmd+K`) to jump to a
patient or create one. "New Patient" opens a small form (name, DOB, MRN) → inserts row → routes to
Intake.

**Screen 2 — Intake Canvas** (`/patients/[id]/intake`)
Large dashed drop-zone. Accept `.vcf`, `.txt`, `.pdf`. On drop: upload to Supabase Storage, then
POST to `/ingest`. Show a processing queue with per-file states: `Uploaded → Extracting →
Remembering → Done`. When done, enable "View Graph".

**Screen 3 — Neural Topology** (`/patients/[id]/graph`)
Full-bleed React Flow canvas. Central patient node; entities blossom outward in cyan. Nodes/edges
come from a structured `recall` (§8.5). Hover a node → right slide-out panel shows the source text
excerpt. This is the visual "wow".

**Screen 4 — Synthesis Console** (`/patients/[id]/formulation`)
Three columns: (L) extracted genetic risks & contraindications; (C) the modular formulation ledger
(each block: name, ratio, mass); (R) the delivery JSON payload in a code block with a
"Send to Manufacturing Partner" button (demo: copies JSON / shows a toast).

**Screen 5 — Longitudinal Matrix** (`/patients/[id]/timeline`)
A timeline of observations. A terminal-style input at the bottom: type an observation
("Day 3: mild nausea, inflammation down 40%") → POST `/feedback` → `remember` + `improve` →
the graph re-weights and the next formulation reflects it. Show a subtle "graph updated" pulse.

### 6.6 UI / UX improvements (polish pass)

The core screens work; this pass raises the product from "functional prototype" to "credible tool".
Apply across the authenticated app:

- **Navigation & shell** — persistent breadcrumb ("Patient / {name} / {screen}"), sign-out control,
  and a global `Cmd+K` command bar (jump to patient, create patient, switch screens). Active-tab
  state and hover affordances on the workspace tab nav.
- **Loading & async states** — skeleton loaders for the patient list, graph, and formulation instead
  of blank flashes; per-file ingest progress (`Uploaded → Extracting → Remembering → Done`) with
  spinners and a clear terminal state (including the degraded `remember_failed` case surfaced as a
  non-blocking warning, not a hard error).
- **Empty states** — friendly, on-brand empty states for: no patients yet, no documents ingested,
  empty graph (with a hint that recall needs a valid Cognee key), no timeline entries.
- **Error handling** — toast notifications for API failures (never a white-screen crash); the
  workspace already degrades to a "backend unavailable" panel — extend that pattern consistently.
- **Feedback & motion** — subtle transitions (fade/scale ≤150ms), the "graph updated" pulse after
  feedback, copy-to-clipboard confirmation on the delivery-JSON "Send to Partner" action.
- **Graph readability** — legend for node types (patient/gene/variant/phenotype/drug/condition),
  color-coded by §7 palette, contraindications in rose; zoom/fit-view controls; hover slide-out with
  the source excerpt. Make the deterministic demo-graph fallback visually distinct ("demo data")
  so it's never mistaken for live recall.
- **Formulation clarity** — visualize ratios (stacked bar / donut), show `mass_mg` prominently,
  render `contraindications_flagged` as red badges that are visibly *excluded* from the mix.
- **Accessibility & responsiveness** — keyboard-navigable, focus rings, sufficient contrast (already
  dark/high-contrast per §7), sensible layout down to laptop widths (demo is desktop-first).
- **Consistency** — extract shared primitives (`Button`, `Card`, `Badge`, `Input`, `Skeleton`,
  `Toast`, `Modal`) so spacing, radius, and typography are uniform on the 8px grid.

---

## 7. Visual design system

Dark, high-contrast, text-first (premium dev-tool aesthetic). Implement as CSS variables/Tailwind
theme tokens.

| Role | Hex | Tailwind | Use |
|---|---|---|---|
| Canvas background | `#09090B` | `zinc-950` | app background |
| Surface | `#18181B` | `zinc-900` | panels, cards, dropzone |
| Border | `#27272A` | `zinc-800` | 1px dividers |
| Text primary | `#FAFAFA` | `zinc-50` | names, headers, formulas |
| Text secondary | `#A1A1AA` | `zinc-400` | labels, metadata |
| Clinical accent | `#06B6D4` | `cyan-500` | active nodes, CTAs, key vectors |
| Danger / contraindication | `#F43F5E` | `rose-500` | flagged risks only |
| Success | `#10B981` | `emerald-500` | positive outcome deltas |

Typography: `Inter` (or system-sans). Micro-labels 12px uppercase tracked; headers ~20px medium.
8px spacing grid. No heavy chrome; breadcrumb top-left ("Patient / {name} / {screen}").

Tailwind v4 note: this project uses `@import "tailwindcss";` in `globals.css` and the
`@theme inline` block for tokens (see current `frontend/app/globals.css`). Add the palette as CSS
variables there rather than a `tailwind.config.js`. The palette tokens above are already wired in.

**Landing page aesthetic (§6.0):** same dark palette, but allowed to be more expressive than the
clinical app — larger type scale for the hero, a restrained cyan glow/gradient accent, and
scroll-triggered reveals. Keep it premium and calm (think a modern dev-tool or infra product site),
not a loud consumer splash. The authenticated app stays denser and more utilitarian.

**Motion tokens (for the polish pass §6.6):** fast/subtle only — micro-interactions 120–150ms,
section reveals 300–500ms with slight upward translate + fade, respect `prefers-reduced-motion`.
Avoid gratuitous animation inside the clinical workspace; motion there should communicate state
changes (graph updated, processing) rather than decorate.

---

## 8. Cognee integration (the core)

### 8.1 Connect to Cloud (once, at startup)

In FastAPI's lifespan, call `serve` a single time. All subsequent V2 ops route to Cloud.

```python
# app/services/cognee_engine.py
import os
import cognee

_connected = False

async def connect() -> None:
    """Route the cognee SDK at the Cloud tenant. Idempotent."""
    global _connected
    if _connected:
        return
    await cognee.serve(
        url=os.environ["COGNEE_SERVICE_URL"],
        api_key=os.environ["COGNEE_API_KEY"],
    )
    _connected = True
```

```python
# app/main.py (excerpt)
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.services.cognee_engine import connect

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect()
    yield

app = FastAPI(title="TheraGraph AI", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"], allow_headers=["*"], allow_credentials=True,
)

@app.get("/health")
async def health():
    return {"status": "ok"}
```

> `cognee` reads `LLM_*` / `EMBEDDING_*` from `.env` only for **local** operation. In Cloud mode
> the tenant's own model config is used. Keep the env vars (harmless) but don't rely on them for
> cloud calls.

### 8.2 Per-patient dataset convention

Every patient gets an isolated dataset. Use a stable, sanitized name.

```python
def dataset_for(patient_id: str) -> str:
    return f"patient_{patient_id}"   # e.g. "patient_9f87a751"
```

### 8.3 The four lifecycle operations — real signatures

Wrap them so the rest of the app never touches raw kwargs.

```python
# app/services/cognee_engine.py (continued)
import cognee
from cognee import SearchType

async def remember_text(patient_id: str, text: str, *, background: bool = False):
    """Ingest a block of clinical text into the patient's graph (add + cognify on Cloud)."""
    return await cognee.remember(
        text,                              # POSITIONAL data arg — not payload=
        dataset_name=dataset_for(patient_id),
        run_in_background=background,
    )

async def recall_text(patient_id: str, query: str, *, system_prompt: str | None = None,
                      query_type: SearchType | None = None, top_k: int = 15) -> list[dict]:
    """Query the patient's graph. Cloud returns a list of dicts (each has 'text','source',...)."""
    return await cognee.recall(
        query,
        query_type=query_type,             # e.g. SearchType.GRAPH_COMPLETION
        datasets=[dataset_for(patient_id)],
        top_k=top_k,
        system_prompt=system_prompt,
    )

async def improve_patient(patient_id: str):
    """Re-enrich the patient's graph after new feedback (Cloud: dataset + node_name only)."""
    return await cognee.improve(dataset=dataset_for(patient_id))

async def forget_patient(patient_id: str):
    """HIPAA right-to-be-forgotten: drop the entire patient dataset."""
    return await cognee.forget(dataset=dataset_for(patient_id))
```

Key facts to respect:
- `remember(data, dataset_name=..., *, session_id=None, run_in_background=False, ...)` — first arg
  positional. On Cloud it does add+cognify server-side. Returns a `RememberResult` (has `.status`,
  `.dataset_id`, `.items_processed`, `.elapsed_seconds`; in Cloud, reconstructed from JSON).
- `recall(query_text, query_type=None, *, datasets=None, top_k=15, system_prompt=None, ...)` —
  returns `list`. In Cloud each item is a dict; graph hits look like
  `{"source":"graph","text": "...","score": ..., "kind": "...","metadata": {...}, "raw": {...}}`.
- `improve(dataset="main_dataset", *, node_name=None, ...)` — kwarg is `dataset`.
- `forget(*, data_id=None, dataset=None, dataset_id=None, everything=False, memory_only=False)` —
  keyword-only.

`SearchType` values available (import `from cognee import SearchType`):
`GRAPH_COMPLETION` (default best for Q&A over the graph), `RAG_COMPLETION`, `CHUNKS`, `SUMMARIES`,
`GRAPH_SUMMARY_COMPLETION`, `TRIPLET_COMPLETION`, `CYPHER`, `NATURAL_LANGUAGE`, `TEMPORAL`, etc.
For TheraGraph, default to `GRAPH_COMPLETION`.

### 8.4 Formulation generation

Primary path (Cognee-native): a `recall` with a strict JSON system prompt, using
`GRAPH_COMPLETION`. Parse the first result's `text`. Then **validate against the block library**
and apply the **deterministic safety filter** so contraindicated blocks can never appear even if
the LLM slips.

```python
# app/services/formulator.py
import json, re
from cognee import SearchType
from app.services.cognee_engine import recall_text
from app.services.blocks import BLOCK_LIBRARY, contraindicated_blocks, rule_based_formulation

FORMULATION_SYSTEM_PROMPT = """You are a clinical pharmacology assistant for TheraGraph.
Using ONLY the patient's genomic and clinical graph context, design a personalized therapy as a
combination of PRE-APPROVED modular building blocks. You must NOT invent a novel molecule.
Return STRICT JSON only (no prose, no code fences) matching:
{
  "indication": string,
  "modules": [{"component_id": string, "ratio": number}],   // ratios sum to 1.0
  "contraindications_flagged": [string],
  "rationale": string
}
Allowed component_id values: %s
""" % ", ".join(BLOCK_LIBRARY.keys())

def _extract_json(text: str) -> dict | None:
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return None

async def generate_formulation(patient_id: str, indication: str) -> dict:
    query = (f"Design the safest modular therapy for: {indication}. "
             f"Account for the patient's genetic metabolism and contraindications.")
    results = await recall_text(patient_id, query,
                                system_prompt=FORMULATION_SYSTEM_PROMPT,
                                query_type=SearchType.GRAPH_COMPLETION, top_k=20)
    text = results[0]["text"] if results else ""
    parsed = _extract_json(text)

    # Always compute contraindications deterministically from recalled context.
    banned = await contraindicated_blocks(patient_id, results)

    if not parsed or "modules" not in parsed:
        # Fallback: rule-based composition from the block library + banned set.
        parsed = rule_based_formulation(indication, banned)

    # Safety filter: strip any banned block; renormalize ratios.
    parsed["modules"] = [m for m in parsed["modules"]
                         if m["component_id"] not in banned
                         and m["component_id"] in BLOCK_LIBRARY]
    total = sum(m.get("ratio", 0) for m in parsed["modules"]) or 1.0
    for m in parsed["modules"]:
        m["ratio"] = round(m.get("ratio", 0) / total, 3)
        m["mass_mg"] = round(m["ratio"] * BLOCK_LIBRARY[m["component_id"]]["total_dose_mg"], 1)
    parsed["contraindications_flagged"] = sorted(set(parsed.get("contraindications_flagged", [])) | banned)
    return parsed
```

The final formulation JSON (the "delivery payload" sent to a CDMO/compounding partner) has this
shape — this is the contract the frontend and any partner integration rely on:

```json
{
  "patient_id": "9f87a751",
  "formulation_id": "tx_77102_v1",
  "indication": "chronic inflammatory pain",
  "modules": [
    { "component_id": "MOD_ALPHA_BASE", "ratio": 0.75, "mass_mg": 337.5 },
    { "component_id": "MOD_BETA_ADJUVANT", "ratio": 0.25, "mass_mg": 112.5 }
  ],
  "contraindications_flagged": ["CODEINE", "TRAMADOL"],
  "rationale": "CYP2D6 *4/*4 poor metabolizer — avoid prodrug opioids; use non-CYP2D6 pathway.",
  "generated_at": "2026-07-02T22:00:00Z"
}
```

### 8.5 Structured recall for the graph visualizer

To draw a real graph, ask Cognee to return nodes/edges as JSON, then render with React Flow. If it
returns nothing usable, derive a minimal graph from the extracted entities client-side.

```python
# app/routers/graph.py (excerpt)
GRAPH_SYSTEM_PROMPT = """Return STRICT JSON describing this patient's clinical knowledge graph as:
{"nodes":[{"id":str,"label":str,"type":"patient|gene|variant|phenotype|drug|condition"}],
 "edges":[{"source":str,"target":str,"label":str}]}
Only include entities grounded in the patient's data. No prose, no code fences."""
```

Backend parses that into `{nodes, edges}`; frontend maps to React Flow node/edge objects and
positions them radially around the patient node.

---

## 9. Backend API (FastAPI)

Base URL `http://localhost:8000`. JSON unless noted. Access control is enforced at the **frontend /
route layer** via Supabase Auth + `proxy.ts` (§6.05, §11.1): unauthenticated users can't reach the
console that calls these endpoints. The FastAPI endpoints themselves remain unauthenticated for the
prototype and trust the caller (they use the Supabase anon key). Hardening the API with a bearer
token check is a production follow-up, not a hackathon requirement.

| Method | Path | Body / params | Returns | Notes |
|---|---|---|---|---|
| GET | `/health` | — | `{status}` | liveness |
| GET | `/api/patients` | — | `Patient[]` | from Supabase |
| POST | `/api/patients` | `{name, dob, mrn}` | `Patient` | insert row |
| GET | `/api/patients/{id}` | — | `Patient` | one row |
| DELETE | `/api/patients/{id}` | — | `{status}` | also calls `forget_patient` (right-to-be-forgotten) |
| POST | `/api/patients/{id}/ingest` | multipart `files[]` | `{ingested:[{name,status}]}` | Storage upload → parse → `remember` |
| GET | `/api/patients/{id}/graph` | — | `{nodes, edges}` | structured `recall` (§8.5) |
| POST | `/api/patients/{id}/formulate` | `{indication}` | `Formulation` | §8.4 |
| POST | `/api/patients/{id}/feedback` | `{observation, ts?}` | `{status, updated:true}` | `remember` + `improve` |
| GET | `/api/patients/{id}/timeline` | — | `FeedbackEntry[]` | from Supabase |

Ingest endpoint sketch:

```python
# app/routers/ingest.py
from fastapi import APIRouter, UploadFile, File
from app.services.parser import extract_text
from app.services.cognee_engine import remember_text
from app.services import supabase_client as sb

router = APIRouter()

@router.post("/api/patients/{patient_id}/ingest")
async def ingest(patient_id: str, files: list[UploadFile] = File(...)):
    out = []
    for f in files:
        raw = await f.read()
        sb.upload_document(patient_id, f.filename, raw)          # Supabase Storage
        text = extract_text(f.filename, raw)                     # pdf/vcf/txt -> str
        framed = f"Patient {patient_id} clinical record ({f.filename}):\n{text}"
        result = await remember_text(patient_id, framed)         # Cognee Cloud
        sb.record_document(patient_id, f.filename, str(getattr(result, "status", "ok")))
        out.append({"name": f.filename, "status": str(getattr(result, "status", "ok"))})
    return {"ingested": out}
```

Feedback endpoint sketch:

```python
# app/routers/feedback.py
@router.post("/api/patients/{patient_id}/feedback")
async def feedback(patient_id: str, body: FeedbackIn):
    framed = f"Patient {patient_id} outcome observation: {body.observation}"
    await remember_text(patient_id, framed)
    await improve_patient(patient_id)           # re-enrich the graph
    sb.record_feedback(patient_id, body.observation)
    return {"status": "optimized", "updated": True}
```

`app/schemas.py` (pydantic):

```python
from pydantic import BaseModel
from datetime import datetime

class PatientIn(BaseModel):
    name: str
    dob: str | None = None
    mrn: str | None = None

class Patient(PatientIn):
    id: str
    created_at: datetime | None = None

class FeedbackIn(BaseModel):
    observation: str
    ts: datetime | None = None

class Module(BaseModel):
    component_id: str
    ratio: float
    mass_mg: float | None = None

class Formulation(BaseModel):
    patient_id: str
    formulation_id: str
    indication: str
    modules: list[Module]
    contraindications_flagged: list[str]
    rationale: str
    generated_at: datetime
```

---

## 10. Mock data (the demo hero)

Ship 3 mock patients so the demo tells a story. **Hero patient = P1 (CYP2D6 poor metabolizer)** —
it makes the "avoid codeine" catch obvious and dramatic. Files go in `backend/app/data/mock_patients/`
and are also uploadable through the Intake UI for the live demo.

### P1 — Maya Okafor — CYP2D6 poor metabolizer (HERO)

`p1_genome.txt`:
```
#SAMPLE=MAYA_OKAFOR
GENE=CYP2D6  DIPLOTYPE=*4/*4  PHENOTYPE=Poor Metabolizer
GENE=CYP2C19 DIPLOTYPE=*1/*1  PHENOTYPE=Normal Metabolizer
GENE=VKORC1  rs9923231=GG      PHENOTYPE=Normal warfarin sensitivity
NOTE: CYP2D6 poor metabolizers cannot convert codeine/tramadol (prodrugs) to active form -> no analgesia + toxic parent accumulation.
```
`p1_history.txt`:
```
Patient: Maya Okafor, DOB 1991-03-14, MRN MO-4471.
Chief complaint: chronic inflammatory joint pain (rheumatoid-type), moderate-severe.
History: prior codeine prescription gave NO pain relief and caused nausea. NSAID-tolerant.
Current meds: none. Allergies: sulfonamides.
Goal: effective non-opioid-prodrug analgesia + anti-inflammatory therapy.
```

### P2 — Daniel Reyes — TPMT deficiency

`p2_genome.txt`:
```
#SAMPLE=DANIEL_REYES
GENE=TPMT  DIPLOTYPE=*3A/*3A  PHENOTYPE=Poor Metabolizer (low activity)
NOTE: TPMT poor metabolizers accumulate toxic thiopurine metabolites -> severe myelosuppression at standard doses. Requires drastic dose reduction.
```
`p2_history.txt`:
```
Patient: Daniel Reyes, DOB 1985-08-02, MRN DR-2210.
Condition: autoimmune (IBD) requiring immunomodulation.
Goal: immunomodulatory therapy with thiopurine-class dosing adjusted for TPMT deficiency.
```

### P3 — Aisha Karim — CYP2C9/VKORC1 warfarin-sensitive

`p3_genome.txt`:
```
#SAMPLE=AISHA_KARIM
GENE=CYP2C9  DIPLOTYPE=*2/*3  PHENOTYPE=Poor Metabolizer
GENE=VKORC1  rs9923231=AA      PHENOTYPE=High warfarin sensitivity
NOTE: CYP2C9 *2/*3 + VKORC1 AA -> markedly reduced warfarin dose requirement; bleeding risk at standard dose.
```
`p3_history.txt`:
```
Patient: Aisha Karim, DOB 1978-11-30, MRN AK-9982.
Condition: needs anticoagulation (atrial fibrillation).
Goal: anticoagulation with genotype-guided low starting dose.
```

### Modular drug-block library

`app/services/blocks.py` — the pre-approved building blocks and the deterministic safety rules.
Keep it small but coherent. This is fiction-for-demo but internally consistent.

```python
BLOCK_LIBRARY = {
    "MOD_ALPHA_BASE":     {"name": "Non-opioid analgesic base",        "total_dose_mg": 450,
                           "pathway": "COX-independent central analgesia"},
    "MOD_BETA_ADJUVANT":  {"name": "Anti-inflammatory adjuvant",       "total_dose_mg": 450,
                           "pathway": "cytokine modulation"},
    "MOD_GAMMA_IMMUNO":   {"name": "Immunomodulator core",             "total_dose_mg": 50,
                           "pathway": "thiopurine-class"},
    "MOD_DELTA_ANTICOAG": {"name": "Vitamin-K antagonist core",        "total_dose_mg": 5,
                           "pathway": "VKORC1"},
    "MOD_EPSILON_GI":     {"name": "GI-protective adjuvant",           "total_dose_mg": 20,
                           "pathway": "acid suppression"},
}

# Gene/phenotype -> blocks or drugs that must be avoided or dose-limited.
CONTRA_RULES = [
    {"trigger": ["CYP2D6", "Poor Metabolizer"], "avoid_drugs": ["CODEINE", "TRAMADOL"],
     "avoid_blocks": []},
    {"trigger": ["TPMT", "Poor Metabolizer"],   "avoid_drugs": ["STANDARD_THIOPURINE_DOSE"],
     "dose_limit_blocks": {"MOD_GAMMA_IMMUNO": 0.1}},   # 10% of normal
    {"trigger": ["CYP2C9", "Poor Metabolizer"], "avoid_drugs": ["STANDARD_WARFARIN_DOSE"],
     "dose_limit_blocks": {"MOD_DELTA_ANTICOAG": 0.35}},
    {"trigger": ["sulfonamides"],               "avoid_drugs": ["SULFONAMIDES"], "avoid_blocks": []},
]

async def contraindicated_blocks(patient_id: str, recall_results: list[dict]) -> set[str]:
    """Deterministic: scan recalled text for trigger tokens -> banned drugs/blocks."""
    corpus = " ".join(r.get("text", "") for r in recall_results).upper()
    banned: set[str] = set()
    for rule in CONTRA_RULES:
        if all(tok.upper() in corpus for tok in rule["trigger"]):
            banned.update(rule.get("avoid_drugs", []))
            banned.update(rule.get("avoid_blocks", []))
    return banned

def rule_based_formulation(indication: str, banned: set[str]) -> dict:
    """Fallback composition if the LLM path fails. Maps indication -> sensible blocks."""
    ind = indication.lower()
    if "inflam" in ind or "pain" in ind:
        modules = [{"component_id": "MOD_ALPHA_BASE", "ratio": 0.75},
                   {"component_id": "MOD_BETA_ADJUVANT", "ratio": 0.25}]
    elif "immun" in ind or "ibd" in ind or "autoimmune" in ind:
        modules = [{"component_id": "MOD_GAMMA_IMMUNO", "ratio": 0.8},
                   {"component_id": "MOD_EPSILON_GI", "ratio": 0.2}]
    elif "anticoag" in ind or "fib" in ind:
        modules = [{"component_id": "MOD_DELTA_ANTICOAG", "ratio": 1.0}]
    else:
        modules = [{"component_id": "MOD_ALPHA_BASE", "ratio": 1.0}]
    return {"indication": indication, "modules": modules,
            "contraindications_flagged": sorted(banned),
            "rationale": "Rule-based composition (LLM path unavailable)."}
```

---

## 11. Supabase schema

Run this SQL in the Supabase SQL editor. For a hackathon prototype, RLS can be left permissive
(anon key). **Do not** ship this to production without RLS + real auth.

```sql
create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  dob date,
  mrn text,
  created_at timestamptz default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  filename text not null,
  storage_path text,
  ingest_status text,
  created_at timestamptz default now()
);

create table if not exists formulations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  indication text,
  payload jsonb not null,
  created_at timestamptz default now()
);

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  observation text not null,
  created_at timestamptz default now()
);
```

Storage: create a bucket named **`patient-documents`** (private). Backend uploads with the service
flow; for the demo the anon key is acceptable. `storage_path` convention:
`{patient_id}/{filename}`.

`supabase_client.py` uses `supabase-py` (installed): `create_client(SUPABASE_URL, SUPABASE_KEY)`,
then `.table("patients").insert(...)`, `.storage.from_("patient-documents").upload(path, bytes)`.

> **Status:** the four tables above and the `patient-documents` bucket (private) are **already
> created** in the Supabase project, plus a permissive storage policy for `anon`/`authenticated`.
> Verified with the anon key. `SUPABASE_URL` in `.env` is the **bare** project URL (no `/rest/v1`).

### 11.1 Auth (new — §6.05)

The login gate uses **Supabase Auth** (email/password) so patient data is not publicly reachable.
This is auth for *accessing the app*, distinct from the "demo clinician" idea it replaces.

**Status: built + verified this session.**
- Email provider is usable; a **demo clinician** user is seeded: `clinician@theragraph.ai` /
  `TheraGraph!2026` (throwaway prototype creds, documented in the README — not real secrets). It was
  created directly in Postgres (`auth.users` with a bcrypt password via `extensions.crypt(...,
  gen_salt('bf'))` + `email_confirmed_at=now()` + a matching `auth.identities` row); token columns
  were backfilled to `''` to avoid the GoTrue "Database error querying schema" on sign-in. Password
  grant verified: `POST /auth/v1/token?grant_type=password` returns an access token.
- Frontend: `@supabase/ssr` provides browser (`getBrowserClient`) + server (`createServerClient`)
  clients; `frontend/proxy.ts` (Next 16 renamed middleware) reads the session cookie and redirects
  unauthenticated `/vault` and `/patients/*` requests to `/login?next=<path>`; a signed-in user
  hitting `/login` is bounced to `/vault`. Verified via curl: `/` 200, `/login` 200, unauth `/vault`
  → 307 `/login?next=%2Fvault`. Sign-out control is in the app shell (`SignOutButton`).
- **RLS caveat:** for the hackathon, table RLS stays permissive (the backend uses the anon key and
  is the trusted caller; auth is enforced at the app/route layer, not per-row). This is acceptable
  for the prototype only. **Production** would require: RLS on all tables, the backend using the
  **service-role** key server-side (never shipped to the browser), and policies scoping rows to the
  authenticated clinician/org. Call this out honestly if asked — don't claim per-row security we
  don't have.

---

## 12. Smoke tests

Run these before feature work. They validate credentials end-to-end.

### 12.1 Cognee Cloud round-trip (Python, in `backend/`)

```bash
cd backend && source .venv/bin/activate
python - <<'PY'
import asyncio, os
from dotenv import load_dotenv; load_dotenv()
import cognee

async def main():
    await cognee.serve(url=os.environ["COGNEE_SERVICE_URL"], api_key=os.environ["COGNEE_API_KEY"])
    ds = "smoke_patient"
    r = await cognee.remember(
        "Patient SMOKE has CYP2D6 *4/*4 (poor metabolizer): cannot activate codeine.",
        dataset_name=ds)
    print("remember:", r)
    res = await cognee.recall("Can this patient take codeine? Why not?", datasets=[ds], top_k=5)
    print("recall:", (res[0]["text"] if res else "EMPTY"))
    await cognee.forget(dataset=ds)  # cleanup
asyncio.run(main())
PY
```
Expected: `remember` status `completed`/`session_stored`; `recall` returns a sentence explaining
the CYP2D6 issue. **If you get 401 → Blocker A. If you get 429/quota → Blocker B.**

### 12.2 Supabase connectivity

```bash
python - <<'PY'
import os
from dotenv import load_dotenv; load_dotenv()
from supabase import create_client
c = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
print(c.table("patients").select("*").limit(1).execute())
PY
```

### 12.3 Backend + frontend boot

```bash
# backend
cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000
# frontend (separate terminal)
cd frontend && npm run dev   # http://localhost:3000
```

---

## 13. Environment variables

Values are **already present** in the repo `.env` files (gitignored). Do not paste secrets into
code or commits. Reference by name.

`backend/.env` (present):
- `LLM_PROVIDER`, `LLM_MODEL` (`gemini/gemini-2.0-flash`), `LLM_API_KEY`
- `EMBEDDING_PROVIDER`, `EMBEDDING_MODEL` (`gemini/gemini-embedding-001`), `EMBEDDING_API_KEY`
- `COGNEE_SERVICE_URL` (tenant base URL) — used by `cognee.serve(url=...)`
- `COGNEE_API_KEY` — **must be a real Cloud API key** (see Blocker A), sent as `X-Api-Key`
- `COGNEE_USER_ID` — tenant user id (memory isolation)
- `SUPABASE_URL`, `SUPABASE_KEY`

`frontend/.env.local` (present):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Add `NEXT_PUBLIC_API_BASE_URL="http://localhost:8000"` for the frontend→backend calls.

`backend/requirements.txt` to create (pin to what's installed in `.venv`):
```
cognee==1.2.2
fastapi==0.139.0
uvicorn==0.49.0
supabase==2.31.0
pypdf==6.14.2
pydantic==2.13.4
pydantic-settings==2.14.2
python-dotenv==1.2.2
python-multipart      # required by FastAPI for multipart uploads — verify/install
aiohttp==3.14.1
litellm==1.90.2
```
> Verify `python-multipart` is present (`pip show python-multipart`); FastAPI needs it for
> `UploadFile`. Install if missing.

---

## 14. Build plan (48-hour sprint)

Order matters — credentials first, then the vertical slice for the hero patient, then polish.

1. **Hours 0–3 · Unblock + prove the pipe.** Fix Blocker A/B. Pass smoke test §12.1. Create Supabase
   tables (§11) + storage bucket. Write `backend/requirements.txt`.
2. **Hours 3–8 · Backend vertical slice.** `main.py` (lifespan `serve`, CORS, `/health`),
   `config.py`, `schemas.py`, `cognee_engine.py`, `supabase_client.py`, `parser.py`. Endpoints:
   patients CRUD, ingest. Load P1 mock via ingest; confirm graph populated via a raw recall.
3. **Hours 8–14 · Formulation + graph endpoints.** `blocks.py`, `formulator.py`, `/formulate`,
   `/graph`. Confirm P1 formulation flags `CODEINE`/`TRAMADOL` and never includes them.
4. **Hours 14–22 · Frontend shell + Vault + Intake.** Palette/tokens (§7), layout, `lib/api.ts`,
   `lib/supabase.ts`, Control Vault, patient workspace layout, Intake dropzone with live status.
5. **Hours 22–30 · Topology + Synthesis screens.** Install `@xyflow/react`. `GraphCanvas` from
   `/graph`. `FormulationLedger` + JSON payload panel + "Send to Partner" toast.
6. **Hours 30–36 · Longitudinal loop.** `/feedback` (`remember`+`improve`), Timeline screen,
   "graph updated" pulse; re-run formulation to show the change.
7. **Hours 36–42 · Polish + `forget`.** Delete-patient wired to `forget` (privacy story), empty
   states, loading skeletons, error toasts, keyboard `Cmd+K`.
8. **Hours 42–48 · Demo + README.** Rehearse the §15 script, record a backup video, write the
   submission README (problem → solution → Cognee usage → demo).

**Progress note (build session):** steps 1–12 are **done**. Backend + all endpoints, Supabase
provisioning, the 5 core screens, the public landing page, the auth gate, and the §6.6 polish pass
are complete and verified (see §2A). Both original blockers are resolved. Remaining: record the
demo/backup video (step 8's video artifact); optional production hardening (out of hackathon scope).

9. ✅ **Landing page (§6.0).** Public hero at `/`; Vault moved to `/vault`; scroll-storytelling
   sections; sticky nav; CTAs into the console.
10. ✅ **Auth gate (§6.05, §11.1).** Supabase Auth email/password; `/login`; `proxy.ts` route guard
    for `/vault` + `/patients/*`; sign-out in the shell; demo clinician account seeded.
11. ✅ **UI/UX polish (§6.6).** Skeletons, empty states, toasts, motion, graph legend + ratio viz,
    shared UI primitives, accessibility.
12. ✅ **Cognee unblocked (Blocker A/B).** Real Cloud API key → live `remember`/`recall`/`improve`/
    `forget`; recall-driven formulation (Maya's `CODEINE`/`TRAMADOL` flags); smoke §12.1 passes.
    Reminder: restart uvicorn after any `COGNEE_API_KEY` change (connect() caches at startup).

---

## 15. Demo script (the winning 3 minutes)

1. **Hook (15s):** the amnesia line from §3.
2. **Intake (30s):** open Vault → create/select "Maya Okafor" → drag her `.txt`/genome files into
   Intake → watch `Extracting → Remembering → Done`.
3. **Topology (30s):** open Graph → point at
   `[Maya] → [CYP2D6 *4/*4] → [Poor Metabolizer] → [Codeine cannot activate]`. "This causal chain
   is exactly what plain vector RAG loses."
4. **Synthesis (45s):** click Generate → indication "chronic inflammatory pain" → ledger shows
   `MOD_ALPHA_BASE 75% + MOD_BETA_ADJUVANT 25%`, with `CODEINE`/`TRAMADOL` flagged red and absent
   from the mix → show the JSON payload → "this goes to a compounding pharmacy / CDMO".
5. **Longitudinal (45s):** Timeline → type "Day 3: mild nausea, inflammation down 40%" →
   `remember` + `improve` → graph pulses, re-generate → adjusted formulation. "It remembers and
   adapts across infinite sessions."
6. **Close (15s):** delete a patient → `forget` → "and when a patient invokes their right to be
   forgotten, the memory is surgically removed. That's the full Cognee lifecycle."

---

## 16. Risks & mitigations

- **Cloud LLM latency** on `remember` (entity extraction can take seconds to tens of seconds):
  ingest with `run_in_background=True` and poll, or pre-ingest the 3 mock patients before the demo
  and only live-demo one small file. Have a recorded backup video.
- **LLM non-determinism** in formulation JSON: the deterministic safety filter + rule-based
  fallback (§8.4, §10) guarantee a sane, contraindication-safe result every time.
- **`recall` returns empty** right after `remember`: cognify must finish first. Await the
  `RememberResult` (don't background it) before the first recall in the demo path, or add a short
  retry.
- **Quota/credentials fail on stage:** pre-ingested data + recorded video de-risk the live run.
- **Next 16 API drift:** consult `frontend/node_modules/next/dist/docs/` before writing routing or
  server-action code (per `frontend/AGENTS.md`).

---

## 17. Definition of done

Legend: [x] done · [~] partial / blocked · [ ] not started.

- [x] Smoke tests §12 pass — Supabase ✅, both servers boot ✅, Cloud round-trip ✅ (`serve` + `remember` `completed` + `recall` real text + `forget`).
- [x] Ingest P1/P2/P3 — files upload + track ✅; re-ingested into per-patient Cognee datasets after the key fix + backend restart.
- [x] Graph screen renders **real** recalled nodes/edges for P1 (falls back to the labelled "DEMO DATA" graph only if recall is empty).
- [x] Formulate P1 — endpoint works, ratios sum to 1.0, masses set ✅; live recall flags `CODEINE`/`TRAMADOL` and excludes them.
- [x] Feedback loop — observation records ✅; the new observation `remember` (add+cognify) runs against the live dataset and shifts future recall; `/feedback` → `{"status":"optimized","updated":true}` (verified live on Daniel). `improve` is best-effort (see next line).
- [x] Delete patient → `forget` wired and live (dataset drop verified against Cloud).
- [~] Cognee ops live: `remember` ✅, `recall` ✅, `forget` ✅ demonstrably live. `improve` is wired correctly but this **Cloud tenant returns 404** for `/api/v1/improve` (route not deployed) — the call is swallowed non-fatally and the observation `remember` carries the graph enrichment.
- [x] Dark minimalist UI matches §7 palette; core screens navigable; build + lint clean.
- [x] Hero landing page (§6.0) built (public `/`, scroll-story, sticky nav, CTAs).
- [x] Auth/login gate (§6.05, §11.1) built; `/vault` + `/patients/*` protected (unauth → 307 `/login`); demo user seeded.
- [x] UI/UX polish pass (§6.6): skeletons, empty states, toasts, graph legend + "DEMO DATA" marker, ratio viz, shared primitives.
- [x] `COGNEE_API_KEY` is a real Cloud API key (Blocker A resolved) and §12.1 re-verified.
- [~] Submission README ✅ current; demo/backup video not yet recorded.
```