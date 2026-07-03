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
*modular formulation* built from **pre-approved, real generic drugs** (not abstract "roles" or bare
percentages, and not a novel unapproved molecule). As the patient reports outcomes over time, we **re-enrich the graph** (`improve`) so
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

**Latest iteration (Jul 2026 UI + formulation pass):** **real-drug regimen generation**
(named generics — acetaminophen, naproxen, azathioprine, warfarin, etc. — with exact mg doses,
dosage forms, routes, sigs, lot numbers, and structured pharmacogenomic risk cards); **minimal
DNA-helix landing page** (black canvas, slow-spinning white helix, cursor-local particle emission);
**clinical light theme** after login (`.theme-clinical` on Vault + patient workspace); **redesigned
Formulation tab** (Genetic Risks panel, Regimen Ledger, Clinical Report with Export-only JSON,
Patient AI chat grounded in Cognee recall); **Timeline redesign**; **enriched mock patient files**
(§10); new **`POST /api/patients/{id}/chat`** endpoint. See [§6.0](#screen-0--hero-landing---public),
[§6.4](#screen-4--synthesis-console), [§8.4](#84-formulation-generation), [§9](#9-backend-api-fastapi).

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
| App should hard-fail if Cognee/Supabase are down | The app **degrades gracefully**. Cognee failures never 500 the request: ingest still uploads+tracks the file (`status: remember_failed`), feedback still records, formulate still returns a deterministic regimen (PGx rules fire on any recalled text; empty recall → standard dosing with no flags). Supabase failures surface as `502`. | Keeps the demo usable before the Cloud key is fixed. |
| Minimal hardcoded "demo clinician", no landing page | **Superseded** (see §6.0/§6.05): the product now gets a public **hero landing page** with scroll-storytelling and a real **login/auth gate** in front of the clinical workspace, because not everyone should reach patient data. The Vault moves behind auth. | Product direction change requested this session. |
| Formulation = abstract MOD_* blocks + percentages | **Superseded (Jul 2026):** output is now a **real oral regimen** — named generic APIs with `dose_mg`, `form`, `route`, `sig`, `daily_dose_mg`, `lot_number`, structured `genetic_risks[]`, and medically formatted `rationale`. Composition `ratio` is derived from daily active mass (for the bar chart), not the primary clinical display. Dosing is **deterministic** from `blocks.py`; Cognee `recall` supplies PGx context for safety rules + chat, not LLM-invented doses. | Prior output read like fiction ("Anti-inflammatory adjuvant 50%") rather than a dispensable order. |
| Dark theme everywhere | **Split theme:** public landing + login stay **dark** (`zinc-950`); authenticated app uses **`.theme-clinical`** light palette (white surfaces, slate text). See §7. | Product direction: marketing stays cinematic; clinical workspace reads like an EHR. |

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
- All §9 endpoints return `200`: patients CRUD, ingest, graph, formulate, feedback, timeline, **chat**. `DELETE /api/patients/{id}` also calls `forget_patient`.
- **Cognee Cloud is LIVE** (Blocker A fixed): `serve` + `remember` + `recall` + `forget` verified against the tenant via smoke test §12.1 (`remember` → `completed` in ~16s; `recall` → real GRAPH_COMPLETION text). All four lifecycle ops run server-side on the tenant LLM.
- Formulation uses **deterministic real-drug composition** from `blocks.py` + Cognee `recall` for pharmacogenomic context — always returns a contraindication-safe `Formulation` with named agents, exact `dose_mg`, `sig`, `genetic_risks[]`, and monitoring plan. Maya: **Codeine/Tramadol** flagged; **Celecoxib** excluded (sulfa) → naproxen chosen.
- **`POST /api/patients/{id}/chat`** — recall-grounded clinician Q&A (Formulation tab). Verified live against Maya's graph.
- **UI/UX (Jul 2026):** DNA helix landing; `.theme-clinical` light workspace; formulation components `GeneticRisks`, `RegimenLedger`, `ClinicalReport`, `PatientChat`; timeline vertical layout; graph colors for light canvas.
- Supabase provisioned via the Supabase tooling: tables `patients` / `documents` / `formulations` / `feedback` (§11) + private `patient-documents` bucket + a permissive demo storage policy for `anon`/`authenticated`. Insert / select / delete / upload all verified with the anon key.
- **Supabase Auth** enabled: a demo clinician user (`clinician@theragraph.ai`) is seeded (pre-confirmed, bcrypt via `auth.users` + `auth.identities`); password sign-in returns a valid access token. See §11.1.
- `backend/requirements.txt` pinned to the installed versions (§13). `run.sh` executable.
- Frontend built on **Next.js 16.2.10 (Turbopack)**: `npm run build` and `npm run lint` both pass. Installed `@xyflow/react@^12.11.1`, `@supabase/supabase-js`, and `@supabase/ssr`. `NEXT_PUBLIC_API_BASE_URL="http://localhost:8000"` in `.env.local`.
- **Public hero landing page** at `/` (minimal copy, DNA helix canvas, compact lifecycle strip) — built (§6.0).
- **Auth gate** (§6.05/§11.1) — built: `proxy.ts` (Next 16 middleware) guards `/vault` + `/patients/*`; unauth → `307 /login?next=…`; `/login` page + `LoginForm`; sign-out control in the app shell; `@supabase/ssr` browser + server clients + cookie handling.
- **UI/UX polish** (§6.6) — built: shared primitives (`Input`, `Skeleton`, `Toast`/`useToast`/`Toaster`, `Modal`; `Button`/`Card`/`Badge` kept backward-compatible + `Badge` `warning` tone + `Button` focus ring), graph legend + "DEMO DATA" marker + extended node colors, formulation ratio bar + prominent `mass_mg` + excluded-contraindication badges + rationale, per-file ingest spinner + non-blocking `remember_failed` warning, empty states + skeleton loaders, motion tokens with `prefers-reduced-motion`.
- 3 mock patients (Maya Okafor / Daniel Reyes / Aisha Karim) seeded via the API; **enriched** genome + history files in `backend/app/data/mock_patients/` (§10). Re-upload via Intake after file updates to refresh Cognee graphs.
- Graceful degradation still wired end-to-end (see §1 table): if Cognee is ever down again, the demo stays usable.

**Next.js 16 specifics discovered (respect these)**
- Dynamic route `params` is a **`Promise`**: `params: Promise<{ id: string }>` then `await params`. Sync access is removed.
- Turbopack is the default for `dev`/`build`. `next lint` is removed — the project runs `eslint` directly.
- `middleware` is renamed to **`proxy`**: the file is `frontend/proxy.ts` exporting `export async function proxy(request: NextRequest)` + `export const config.matcher`. Confirmed against `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`; build reports `ƒ Proxy (Middleware)`.
- `@supabase/ssr` cookie handling uses the **async** `cookies()` (`const cookieStore = await cookies()`) with getAll/setAll adapters, both in `proxy.ts` and the server client.
- Interactive screens use thin `*PageClient.tsx` wrappers so pages stay Server Components. Key components: `ControlVault.tsx`, `PatientNav.tsx`, `PatientScreenLabel.tsx`, `components/landing/*` (Hero, DnaHelix, Nav, Footer, Reveal), `components/formulation/*` (GeneticRisks, RegimenLedger, ClinicalReport, PatientChat), `components/auth/*`, `components/ui/*`.

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
composes a therapy from a library of **pre-approved generic agents** (real drug names, strengths,
forms, and sigs — assembled into a patient-specific oral regimen). The output is a structured spec that a **compounding pharmacy or CDMO partner** can
prepare. Long-term vision: as regulatory science for personalized therapeutics matures, the same
platform supports increasingly individualized medicines.

**Judging-criteria alignment** (from the hackathon page):
- *Potential Impact* — safer, personalized prescribing; avoids adverse drug reactions from genetics.
- *Creativity* — memory-first medical agent; graph beats RAG for causal medical chains.
- *Technical Excellence* — clean FastAPI + typed schemas + real Cognee lifecycle usage.
- *Best Use of Cognee* — all four ops (`remember`/`recall`/`improve`/`forget`) map to real product
  features, not gimmicks.
- *User Experience* — cinematic dark landing; clean **white clinical workspace** after login; credible regimen display + AI chat.
- *Presentation* — end-to-end demo: upload → graph → formulation → feedback → adapted graph.

---

## 4. High-level architecture

```
┌───────────────────────────────────────────────────────────────────────────┐
│  Next.js 16 Web App  (App Router, React 19, Tailwind v4)                    │
│  Public: Landing (DNA helix, dark) · Login (Supabase Auth)                  │
│  Authed: Vault · Intake · Topology · Synthesis · Timeline  (light theme)  │
└───────────────┬───────────────────────────────────────────────┬───────────┘
                │ fetch (JSON / multipart)                        │ supabase-js
                ▼                                                 ▼
┌───────────────────────────────────────────────┐   ┌───────────────────────┐
│  FastAPI backend (Python 3.12)                 │   │  Supabase              │
│  routers: patients, ingest, graph, formulate,  │   │  - Postgres (metadata) │
│           feedback, chat                       │   │  - Storage (raw files) │
│  services: cognee_engine, parser, formulator,  │   └───────────────────────┘
│            supabase_client, blocks             │
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
    │   ├── blocks.py                 ← real generic drug library + PGx safety rules
    │   ├── formulator.py             ← recall context + deterministic regimen builder
    │   └── supabase_client.py        ← supabase-py client + table helpers
    ├── routers/
    │   ├── __init__.py
    │   ├── patients.py               ← CRUD patient metadata (Supabase)
    │   ├── ingest.py                 ← upload → Storage → cognee.remember
    │   ├── graph.py                  ← recall structured nodes/edges for viz
    │   ├── formulate.py              ← generate formulation
    │   ├── feedback.py               ← remember(observation) + improve
    │   └── chat.py                   ← recall-grounded clinician Q&A
    └── data/
        └── mock_patients/            ← §10 mock files live here (also uploadable via UI)
```

Target frontend layout (App Router). All ✅ = built + verified (`npm run lint` + `npm run build` pass):

```
frontend/
├── proxy.ts                          ✅ Next 16 "proxy" (formerly middleware): guards /vault + /patients/*, unauth → 307 /login?next=…; signed-in on /login → /vault
└── app/
    ├── layout.tsx                    ✅ fonts, root shell (landing/login inherit dark :root tokens)
    ├── globals.css                   ✅ dual theme: dark :root + `.theme-clinical` light override (§7)
    ├── page.tsx                      ✅ Screen 0: PUBLIC hero LANDING (DNA helix, minimal copy)
    ├── login/page.tsx                ✅ Screen 0.5: login/auth gate (Supabase Auth) — renders <LoginForm/>
    ├── vault/page.tsx                ✅ Screen 1: Control Vault (`.theme-clinical` light shell)
    ├── lib/
    │   ├── api.ts                    ✅ typed fetch wrappers (+ chatWithPatient)
    │   ├── supabase.ts               ✅ simple browser supabase client (anon key) — legacy, kept
    │   ├── supabase-browser.ts       ✅ @supabase/ssr createBrowserClient (memoized getBrowserClient())
    │   ├── supabase-server.ts        ✅ @supabase/ssr createServerClient (async cookies(), getAll/setAll)
    │   ├── auth.ts                   ✅ signIn / signOut / getSession (browser)
    │   └── types.ts                  ✅ shared TS types (Formulation w/ real-drug fields, GeneticRisk, ChatMessage)
    ├── components/
    │   ├── landing/                  ✅ Nav, Hero, DnaHelix (canvas), Reveal, Footer
    │   ├── formulation/              ✅ GeneticRisks, RegimenLedger, ClinicalReport, PatientChat
    │   ├── auth/                     ✅ LoginForm, SignUpForm, SignOutButton
    │   ├── ControlVault.tsx          ✅ Screen 1 client shell (`.theme-clinical`)
    │   ├── Dropzone.tsx              ✅ multi-file upload ("use client"); spinner + remember_failed warning
    │   ├── GraphCanvas.tsx           ✅ React Flow visualizer; light-theme node colors
    │   ├── Timeline.tsx              ✅ vertical outcome timeline + observation composer
    │   ├── PatientNav.tsx            ✅ breadcrumb (→ /vault) + tab nav (helper)
    │   ├── PatientScreenLabel.tsx    ✅ (helper)
    │   └── ui/                       ✅ Button, Card, Badge, CommandBar, Input, Skeleton, Toast, Modal
    └── patients/[id]/                (all behind auth via proxy.ts; layout wraps `.theme-clinical`)
        ├── layout.tsx                ✅ workspace shell w/ breadcrumb + tab nav + sign-out
        ├── intake/page.tsx (+IntakePageClient.tsx)            ✅ Screen 2
        ├── graph/page.tsx (+GraphPageClient.tsx)              ✅ Screen 3
        ├── formulation/page.tsx (+FormulationPageClient.tsx)  ✅ Screen 4 (+ GeneticRisks / Regimen / Report / Chat)
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
   (public, DNA helix)                         (gate)                 │  select/create
                                                                    ▼
[2 Intake Canvas] --process--> [3 Neural Topology]
                                     │
                        [4 Synthesis Console]
                                     │
                        [5 Longitudinal Matrix]
```

**Screen 0 — Hero Landing** (`/`, public)
Full-viewport **black** canvas with a slowly rotating **DNA double helix** (`DnaHelix.tsx` — HTML
canvas, whitish strands, rungs, base-pair nodes). **Cursor-local particles** emit from the nearest
strand segment when the pointer hovers the helix (throttled to movement; disabled under
`prefers-reduced-motion`). Minimal copy: headline, one-line value prop, Get started / Sign in CTAs,
demo-credentials hint. Below the fold: a **compact 4-item lifecycle strip** (Remember / Recall /
Improve / Forget) — no long scroll-story sections. Sticky nav solidifies on scroll. Footer: dual CTA
+ "prototype — not for clinical use".

**Built (Jul 2026 redesign):**
- **`DnaHelix`** — canvas animation; slow spin (~0.16 rad/s); hover-radius particle emission.
- **`Hero`** — centered headline over radial vignette for readability; white primary CTA on black.
- **`Nav`** — simplified: logo + Sign in + Get started (no anchor links to removed sections).
- **Removed** (prior session components deleted): `CausalChain`, `Section`, `LifecycleSection`,
  `UseCases`, scroll-story Problem/Insight/Solution/Regulatory blocks.

**Screen 0.5 — Login / Auth gate** (`/login`)
Not everyone should reach patient data, so the Vault and every `/patients/*` route sit behind
authentication. Use **Supabase Auth** (already have the project + client): email + password sign-in
for the demo (optionally magic-link). A centered card on the dark canvas: email, password,
"Sign in", inline error states, and a subtle link back to the landing page. On success → redirect
to `/vault`. `proxy.ts` (Next 16 middleware) guards protected routes and redirects unauthenticated
users to `/login`; signed-in users hitting `/login` **or `/signup`** are bounced to `/vault`.
Provide a sign-out control in the app shell. See §11 for the auth/RLS note.

**Self-serve account creation (`/signup`) — built this session.** New visitors can create their own
clinician account instead of relying on a hardcoded user. `components/auth/SignUpForm.tsx` collects
name / email / password (+ confirm), calls `signUp()` (`app/lib/auth.ts` → Supabase
`auth.signUp`), and: (a) if a session comes back, redirects to `next`/`/vault`; (b) if the project
enforces email confirmation, shows a "check your inbox" notice. `/signup` is public (not guarded by
`proxy.ts`); a signed-in user visiting it is redirected to `/vault`. The **login form** also carries
a one-click **"Try the demo"** helper that fills the demo credentials, and a "Create one" link to
`/signup`.

**Seeded demo login (documented, throwaway):** `demo@gmail.com` / `Demo123`. Seeded directly in
Postgres the same way as the clinician account (`auth.users` with an `extensions.crypt(..,
gen_salt('bf'))` password + `email_confirmed_at=now()` + a matching `auth.identities` row, token
columns backfilled to `''`). Password grant verified against
`POST /auth/v1/token?grant_type=password` (returns an access token). These are prototype creds, not
real secrets.

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
Top bar: indication input + **Generate regimen** button. Three columns below:

| Column | Component | Purpose |
|---|---|---|
| Left | `GeneticRisks` | Severity-coded PGx cards (gene, genotype, phenotype, implication, affected agents, recommendation) + contraindicated-drug block |
| Center | `RegimenLedger` | Real-drug regimen: composition bar (by daily active mass), per-agent cards with **dose_mg**, **sig**, route, mechanism, dose-adjustment notes |
| Right | `ClinicalReport` | Medically formatted rationale, directions (℞ lines), monitoring plan, safety notes, metadata (formulation ID, lot, generated_at). **Delivery JSON hidden** — revealed only via **Export** button (modal + copy / "Send to manufacturing partner") |

Below the grid: **`PatientChat`** — clinician Q&A grounded in the patient's Cognee graph (+ optional
current indication context). Calls `POST /api/patients/{id}/chat`. Suggested prompts on empty state.

**Example output (Maya, chronic inflammatory joint pain):** Acetaminophen 500 mg q8h PRN, Naproxen
250 mg q12h with food, Duloxetine 30 mg daily, Pantoprazole 20 mg daily — with Codeine/Tramadol
flagged and Celecoxib excluded (sulfa allergy). See §8.4.

**Screen 5 — Longitudinal Matrix** (`/patients/[id]/timeline`)
Vertical outcome timeline (newest first, "Latest" marker, relative timestamps). Top: observation
composer ("Add to memory") → POST `/feedback` → `remember` (+ best-effort `improve`) → toast +
`graph-updated-pulse`. Replaces the prior terminal-style bottom input.

### 6.6 UI / UX improvements (polish pass)

The core screens work; this pass raises the product from "functional prototype" to "credible tool".
Apply across the authenticated app (wrapped in `.theme-clinical` — see §7):

- **Dual theme** — landing + login stay dark; Vault + patient workspace use **clinical light**
  (`#f5f7fa` canvas, white surfaces, slate text, teal accent `#0e7490`).
- **Navigation & shell** — persistent breadcrumb, sign-out, `Cmd+K` command bar, active tab state.
- **Loading & async states** — skeleton loaders; per-file ingest progress with `remember_failed` warning.
- **Empty states** — friendly placeholders on all core screens.
- **Error handling** — toast notifications; backend-unavailable degradation pattern.
- **Feedback & motion** — subtle transitions; graph-updated pulse; Export modal copy confirmation.
- **Graph readability** — legend, DEMO DATA marker, **light-theme node colors** on clinical canvas.
- **Formulation clarity** — real drug names + sigs; genetic risk cards; JSON behind Export only.
- **Patient AI chat** — recall-grounded Q&A on Formulation tab (§9 chat endpoint).
- **Accessibility** — keyboard-navigable, focus rings, `prefers-reduced-motion` on DNA helix.
- **Consistency** — shared UI primitives on 8px grid.

---

## 7. Visual design system

**Dual theme:** public surfaces stay dark; the authenticated clinical app switches to a light
"EHR-adjacent" palette via a `.theme-clinical` wrapper on Vault + patient workspace shells.
Implement both as CSS variable overrides in `globals.css` (`:root` + `.theme-clinical`).

### Public / landing (dark)

| Role | Hex | Tailwind | Use |
|---|---|---|---|
| Canvas background | `#09090B` | `zinc-950` | landing, login |
| Surface | `#18181B` | `zinc-900` | cards on dark pages |
| Border | `#27272A` | `zinc-800` | dividers |
| Text primary | `#FAFAFA` | `zinc-50` | headlines |
| Text secondary | `#A1A1AA` | `zinc-400` | labels |
| Accent | `#06B6D4` | `cyan-500` | DNA glow, links |
| Danger | `#F43F5E` | `rose-500` | — |
| Success | `#10B981` | `emerald-500` | — |

### Clinical workspace (light — `.theme-clinical`)

| Role | Hex | Use |
|---|---|---|
| Canvas background | `#F5F7FA` | page bg |
| Surface | `#FFFFFF` | cards, header |
| Border | `#E2E8F0` | dividers |
| Text primary | `#0F172A` | slate-900 |
| Text secondary | `#64748B` | slate-500 |
| Accent | `#0E7490` | teal-700 CTAs, links |
| Danger | `#E11D48` | rose-600 contraindications |
| Success | `#059669` | emerald-600 |

Typography: `Inter`. Micro-labels 12px uppercase tracked; headers ~20px medium. 8px spacing grid.
Breadcrumb top-left ("Patient / {name} / {screen}").

Tailwind v4: `@import "tailwindcss"` + `@theme inline` in `globals.css`. Utilities like `bg-bg`,
`text-text`, `border-border` map to whichever theme's CSS variables are active on the ancestor.

**Landing aesthetic (§6.0):** black canvas, whitish DNA helix, minimal copy, white primary CTA.
**Clinical aesthetic:** white surfaces, dense information layout, teal accent — professional post-login.

**Motion tokens:** micro-interactions 120–150ms; DNA helix respects `prefers-reduced-motion`
(static frame, no particles). Clinical workspace motion communicates state (graph updated, processing).

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

**Design (Jul 2026 — real-drug regimens):** Cognee `recall` supplies **pharmacogenomic context**
from the patient's graph; **dosing and drug selection are deterministic** in `blocks.py` +
`formulator.py`. The LLM does not invent doses or pick mystery "modules" — it only enriches the
recall corpus used to fire safety rules and power chat.

**Pipeline:**
1. `recall_text()` with `ASSESSMENT_SYSTEM_PROMPT` — "What PGx risks and contraindications apply
   for this indication?" (graceful empty list if Cognee down).
2. `matched_rules()` / `banned_blocks()` / `dose_limits()` / `genetic_risks()` — scan recalled
   text for trigger tokens (CYP2D6 PM, TPMT PM, sulfa allergy, etc.).
3. `_pick_ids(indication, banned)` — map indication → ordered list of real `component_id`s
   (e.g. pain → acetaminophen + naproxen|celecoxib + duloxetine + pantoprazole).
4. `build_module(id, dose_fraction?)` — compute `dose_mg`, `daily_dose_mg`, `sig`, form, route,
   mechanism, monitoring from `BLOCK_LIBRARY` entry + PGx dose ceiling.
5. Renormalize `ratio` by daily active mass (for composition bar UI only).
6. Attach `rationale` (medical prose), `monitoring`, `lot_number`, `formulation_id`.

**Key helpers in `blocks.py`:** `block_meta`, `matched_rules`, `banned_blocks`,
`flagged_contraindications`, `dose_limits`, `genetic_risks`, `build_module`, `monitoring_plan`.
Legacy aliases kept: `contraindicated_blocks`, `rule_based_formulation`.

**`BLOCK_LIBRARY` keys (real generics):** `ACETAMINOPHEN`, `NAPROXEN`, `CELECOXIB`, `DULOXETINE`,
`PANTOPRAZOLE`, `AZATHIOPRINE`, `WARFARIN`, `APIXABAN`. Each entry carries `strength_mg`, `form`,
`route`, `frequency`, `default_daily_mg`, `max_daily_mg`, `mechanism`, `monitoring`, etc.

**Indication → regimen mapping (deterministic):**
| Indication keywords | Agents chosen |
|---|---|
| inflam / pain / arthrit / rheumat / joint | Acetaminophen + (Celecoxib **or** Naproxen if sulfa) + Duloxetine if "chronic" + Pantoprazole |
| immun / ibd / autoimmune / crohn / colitis | Azathioprine (dose-limited by TPMT) + Pantoprazole |
| anticoag / fib / clot / thromb / stroke prevention | Warfarin (dose-limited by CYP2C9/VKORC1) |
| default | Acetaminophen monotherapy |

**PGx rules (`CONTRA_RULES`):**
| Trigger | Effect |
|---|---|
| CYP2D6 + Poor Metabolizer | Flag Codeine, Tramadol; recommend non-prodrug analgesics |
| sulfonamide (allergy) | Ban CELECOXIB; prefer naproxen |
| TPMT + Poor Metabolizer | Cap AZATHIOPRINE at 10% of standard daily dose |
| CYP2C9 + Poor Metabolizer | Cap WARFARIN at 35% of standard daily dose |

**Delivery payload shape** (Export modal / CDMO handoff — see `ClinicalReport.tsx`):

```json
{
  "patient_id": "dd87d28e-0b08-4d55-9936-4e9fecc86916",
  "formulation_id": "tx_b6e67196_v1",
  "lot_number": "LOT-EF7334",
  "indication": "chronic inflammatory joint pain (rheumatoid-type)",
  "dosage_form": "Oral multi-agent regimen (4 agents)",
  "route": "Oral (PO)",
  "total_daily_mg": 2050.0,
  "modules": [
    {
      "component_id": "ACETAMINOPHEN",
      "ingredient": "Acetaminophen",
      "brand_examples": "Tylenol",
      "dose_mg": 500.0,
      "daily_dose_mg": 1500.0,
      "strength_mg": 500.0,
      "form": "Tablet",
      "route": "Oral (PO)",
      "sig": "Take 500 mg (1 tablet) by mouth every 8 hours as needed",
      "ratio": 0.732,
      "mechanism": "Central, COX-independent analgesia; requires no CYP2D6 prodrug activation."
    },
    {
      "component_id": "NAPROXEN",
      "ingredient": "Naproxen",
      "dose_mg": 250.0,
      "sig": "Take 250 mg (1 tablet) by mouth every 12 hours with food",
      "ratio": 0.244
    }
  ],
  "contraindications_flagged": ["Codeine", "Tramadol", "Sulfamethoxazole"],
  "contraindication_details": [
    { "drug": "Codeine", "reason": "CYP2D6 PM — prodrug cannot activate", "severity": "high" }
  ],
  "genetic_risks": [
    {
      "gene": "CYP2D6",
      "genotype": "*4/*4",
      "phenotype": "Poor metabolizer",
      "implication": "Cannot convert prodrug opioids…",
      "severity": "high",
      "affected": ["Codeine", "Tramadol"],
      "recommendation": "Use non-prodrug analgesics (acetaminophen, NSAID, duloxetine)."
    }
  ],
  "safety_notes": ["…"],
  "monitoring": ["Hepatic function; keep total acetaminophen < 3 g/day.", "…"],
  "rationale": "Indication: …\n\nPharmacogenomic assessment — …\n\nRegimen — …",
  "generated_at": "2026-07-03T19:42:31Z"
}
```

> **PROTOTYPE ONLY** — doses and rules are a coherent teaching model, not validated clinical
> decision support. Always label the UI "prototype — not for clinical use."

### 8.4A Patient AI chat (Formulation tab)

`POST /api/patients/{id}/chat` — recall-grounded Q&A for the clinician.

```python
# app/routers/chat.py
CHAT_SYSTEM_PROMPT = """You are TheraGraph's clinical co-pilot… Ground every answer in the
patient's genomic and clinical knowledge graph…"""

@router.post("/api/patients/{patient_id}/chat")
async def chat(patient_id: str, body: ChatIn) -> ChatOut:
    # body: { message, history: [{role, content}], indication? }
    # recall_text(..., system_prompt=CHAT_SYSTEM_PROMPT, GRAPH_COMPLETION)
    # returns { reply, grounded: bool }
```

Frontend: `PatientChat.tsx` on Formulation tab; `chatWithPatient()` in `lib/api.ts`.

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
| POST | `/api/patients/{id}/formulate` | `{indication}` | `Formulation` | §8.4 — real-drug regimen |
| POST | `/api/patients/{id}/feedback` | `{observation, ts?}` | `{status, updated}` | `remember` + best-effort `improve` |
| GET | `/api/patients/{id}/timeline` | — | `FeedbackEntry[]` | from Supabase |
| POST | `/api/patients/{id}/chat` | `{message, history[], indication?}` | `{reply, grounded}` | §8.4A — recall Q&A |

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
    ingredient: str | None = None
    name: str | None = None
    brand_examples: str | None = None
    drug_class: str | None = None
    strength_mg: float | None = None
    form: str | None = None
    route: str | None = None
    frequency: str | None = None
    dose_mg: float | None = None
    daily_dose_mg: float | None = None
    sig: str | None = None
    dose_note: str | None = None
    mechanism: str | None = None
    mass_mg: float | None = None  # per-dose mass (legacy compat for bar chart)

class ContraindicationDetail(BaseModel):
    drug: str
    reason: str
    severity: str = "high"

class GeneticRisk(BaseModel):
    gene: str
    genotype: str | None = None
    phenotype: str | None = None
    implication: str
    severity: str = "info"
    affected: list[str] = []
    recommendation: str | None = None

class Formulation(BaseModel):
    patient_id: str
    formulation_id: str
    lot_number: str | None = None
    indication: str
    dosage_form: str | None = None
    route: str | None = None
    modules: list[Module]
    total_daily_mg: float | None = None
    contraindications_flagged: list[str]
    contraindication_details: list[ContraindicationDetail] = []
    genetic_risks: list[GeneticRisk] = []
    safety_notes: list[str] = []
    monitoring: list[str] = []
    rationale: str
    generated_at: datetime

class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str

class ChatIn(BaseModel):
    message: str
    history: list[ChatMessage] = []
    indication: str | None = None

class ChatOut(BaseModel):
    reply: str
    grounded: bool = False
```

---

## 10. Mock data (the demo hero)

Ship 3 mock patients so the demo tells a story. **Hero patient = P1 (CYP2D6 poor metabolizer)** —
it makes the "avoid codeine" catch obvious and dramatic. Files go in `backend/app/data/mock_patients/`
and are also uploadable through the Intake UI for the live demo.

Ship 3 mock patients so the demo tells a story. **Hero patient = P1 (CYP2D6 poor metabolizer)** —
it makes the "avoid codeine" catch obvious and dramatic. Files go in `backend/app/data/mock_patients/`
and are also uploadable through the Intake UI for the live demo.

> **Jul 2026 enrichment:** genome + history files expanded with additional genes (COMT, HLA-B,
> NUDT15, CYP4F2), drug-metabolism tables, prior medication trials, labs, and clinical goals —
> giving Cognee more entities/edges for graph viz and chat. **Re-upload via Intake** after updating
> files on disk to refresh each patient's Cognee dataset.

### P1 — Maya Okafor — CYP2D6 poor metabolizer + sulfa allergy (HERO)

`p1_genome.txt` — CYP2D6 *4/*4 PM, CYP2C19/2C9/TPMT normal, COMT Val/Val, HLA-B*57:01 negative;
explicit CODEINE/TRAMADOL contraindication; sulfonamide allergy → CELECOXIB avoid.

`p1_history.txt` — Seropositive RA, moderate–severe joint pain; failed codeine (no analgesia +
nausea); ibuprofen/naproxen partial response; labs (CRP, RF, anti-CCP); goal: non-prodrug analgesia
+ anti-inflammatory therapy.

**Expected regimen (indication: chronic inflammatory joint pain):** Acetaminophen + Naproxen +
Duloxetine + Pantoprazole; Codeine/Tramadol flagged; Celecoxib excluded.

### P2 — Daniel Reyes — TPMT deficiency

`p2_genome.txt` — TPMT *3A/*3A PM (~10% activity), NUDT15 normal; thiopurine dose-limit rules;
CPIC monitoring note.

`p2_history.txt` — Crohn's ileocolonic, moderate activity; failed mesalamine/budesonide; baseline
CBC/LFTs/calprotectin; goal: azathioprine at TPMT-adjusted dose with PPI protection.

**Expected regimen (indication: autoimmune IBD immunomodulation):** Azathioprine ~10 mg/day (10% of
standard) + Pantoprazole; intensive CBC monitoring in `monitoring[]`.

### P3 — Aisha Karim — CYP2C9/VKORC1 warfarin-sensitive

`p3_genome.txt` — CYP2C9 *2/*3 PM, VKORC1 AA high sensitivity, CYP4F2 *1/*3; warfarin ~35% dose;
apixaban listed as CYP2C9-independent alternative.

`p3_history.txt` — Non-valvular AF, CHA₂DS₂-VASc 4; HTN + T2DM; prior rivaroxaban stopped (bruising);
goal: genotype-guided warfarin ~2 mg/day or DOAC discussion.

**Expected regimen (indication: anticoagulation for atrial fibrillation):** Warfarin ~2 mg/day with
dose_note; INR monitoring in plan.

### Real generic drug library

`app/services/blocks.py` — pre-approved **named generic APIs** + deterministic PGx safety rules.
PROTOTYPE ONLY — not validated CDS.

**`BLOCK_LIBRARY` keys:** `ACETAMINOPHEN`, `NAPROXEN`, `CELECOXIB`, `DULOXETINE`, `PANTOPRAZOLE`,
`AZATHIOPRINE`, `WARFARIN`, `APIXABAN`. Each entry includes `strength_mg`, `form`, `route`,
`frequency`, `default_daily_mg`, `max_daily_mg`, `mechanism`, `monitoring`, `brand_examples`.

**`CONTRA_RULES` triggers → effects:**
| Trigger | avoid_drugs | avoid_blocks | dose_limit_blocks |
|---|---|---|---|
| CYP2D6 + Poor Metabolizer | Codeine, Tramadol | — | — |
| sulfonamide (allergy) | Sulfamethoxazole | CELECOXIB | — |
| TPMT + Poor Metabolizer | — | — | AZATHIOPRINE: 0.1 |
| CYP2C9 + Poor Metabolizer | — | — | WARFARIN: 0.35 |

**Key helpers:** `build_module()`, `genetic_risks()`, `flagged_contraindications()`,
`dose_limits()`, `banned_blocks()`, `monitoring_plan()`, `_pick_ids()`.
See §8.4 for the full pipeline. Source of truth: `backend/app/services/blocks.py`.

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
- Email provider is usable; two seeded users exist (throwaway prototype creds, documented in the
  README — not real secrets):
  - **Primary demo login:** `demo@gmail.com` / `Demo123` (seeded this session).
  - **Clinician:** `clinician@theragraph.ai` / `TheraGraph!2026`.
  Both were created directly in Postgres (`auth.users` with a bcrypt password via
  `extensions.crypt(..., gen_salt('bf'))` + `email_confirmed_at=now()` + a matching
  `auth.identities` row); token columns were backfilled to `''` to avoid the GoTrue "Database error
  querying schema" on sign-in. Password grant verified for `demo@gmail.com`:
  `POST /auth/v1/token?grant_type=password` returns an access token.
- **Self-serve sign-up (new):** `/signup` (`components/auth/SignUpForm.tsx`) calls `signUp()`
  (`app/lib/auth.ts` → Supabase `auth.signUp`). Redirects to `/vault` when a session is returned, or
  shows a "confirm your email" notice when the project enforces confirmation. The login form fills
  the demo creds on one click and links to `/signup`.
- Frontend: `@supabase/ssr` provides browser (`getBrowserClient`) + server (`createServerClient`)
  clients; `frontend/proxy.ts` (Next 16 renamed middleware) reads the session cookie and redirects
  unauthenticated `/vault` and `/patients/*` requests to `/login?next=<path>`; a signed-in user
  hitting `/login` **or `/signup`** is bounced to `/vault`. Verified via curl: `/` 200, `/login` 200,
  unauth `/vault` → 307 `/login?next=%2Fvault`. Sign-out control is in the app shell
  (`SignOutButton`).
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
   `/graph`. Confirm P1 formulation flags Codeine/Tramadol and never includes them in the regimen.
4. **Hours 14–22 · Frontend shell + Vault + Intake.** Palette/tokens (§7), layout, `lib/api.ts`,
   `lib/supabase.ts`, Control Vault, patient workspace layout, Intake dropzone with live status.
5. **Hours 22–30 · Topology + Synthesis screens.** Install `@xyflow/react`. `GraphCanvas` from
   `/graph`. Formulation tab: `GeneticRisks` + `RegimenLedger` + `ClinicalReport` (Export JSON) +
   `PatientChat`.
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

9. ✅ **Landing page (§6.0).** Public hero at `/` (DNA helix, minimal copy); Vault at `/vault`.
10. ✅ **Auth gate (§6.05, §11.1).** Supabase Auth email/password; `/login`; `proxy.ts` route guard
    for `/vault` + `/patients/*`; sign-out in the shell; demo clinician account seeded.
13. ✅ **UI/UX + formulation pass (Jul 2026).** DNA helix landing; clinical light theme; real-drug
    regimen generation; formulation redesign + chat; enriched mock data; timeline vertical layout.

---

## 15. Demo script (the winning 3 minutes)

1. **Hook (15s):** the amnesia line from §3.
2. **Intake (30s):** open Vault → create/select "Maya Okafor" → drag her `.txt`/genome files into
   Intake → watch `Extracting → Remembering → Done`.
3. **Topology (30s):** open Graph → point at
   `[Maya] → [CYP2D6 *4/*4] → [Poor Metabolizer] → [Codeine cannot activate]`. "This causal chain
   is exactly what plain vector RAG loses."
4. **Synthesis (45s):** Generate regimen → indication "chronic inflammatory joint pain" → left column
   shows CYP2D6 + sulfa risk cards; center shows **Acetaminophen 500 mg**, **Naproxen 250 mg**, etc.
   with sigs; Codeine/Tramadol flagged red; click **Export** for JSON → "this goes to a compounding
   pharmacy / CDMO". Ask chat: "Can this patient take codeine?" → grounded No from graph.
5. **Longitudinal (45s):** Timeline → "Day 3: mild nausea, inflammation down 40%" → graph pulses,
   re-generate → adapted regimen. "It remembers and adapts across infinite sessions."
6. **Close (15s):** delete a patient → `forget` → "and when a patient invokes their right to be
   forgotten, the memory is surgically removed. That's the full Cognee lifecycle."

---

## 16. Risks & mitigations

- **Cloud LLM latency** on `remember` (entity extraction can take seconds to tens of seconds):
  ingest with `run_in_background=True` and poll, or pre-ingest the 3 mock patients before the demo
  and only live-demo one small file. Have a recorded backup video.
- **LLM non-determinism** in chat answers: formulation dosing is **fully deterministic** (§8.4);
  chat uses recall but formulation never depends on LLM JSON parsing.
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
- [x] Formulate P1 — real-drug regimen (Acetaminophen, Naproxen, …) with exact doses + sigs; Codeine/Tramadol flagged; Celecoxib excluded (sulfa).
- [x] Feedback loop — observation records ✅; `remember` shifts future recall; `/feedback` → `{"status":"optimized","updated":true}`. `improve` best-effort (404 on Cloud).
- [x] Delete patient → `forget` wired and live (dataset drop verified against Cloud).
- [~] Cognee ops live: `remember` ✅, `recall` ✅, `forget` ✅. `improve` returns 404 on this tenant — non-fatal.
- [x] Dual theme UI — dark landing + light clinical workspace (§7); build + lint clean.
- [x] Hero landing (§6.0) — DNA helix canvas, minimal copy, lifecycle strip.
- [x] Auth/login gate (§6.05, §11.1) built; demo user seeded.
- [x] UI/UX polish (§6.6) + Jul 2026 pass: formulation redesign, PatientChat, timeline vertical layout.
- [x] `COGNEE_API_KEY` is a real Cloud API key (Blocker A resolved).
- [~] Submission README ✅ current; demo/backup video not yet recorded.
- [x] Self-serve signup + demo login (`demo@gmail.com` / `Demo123`).
- [x] Real-drug formulation generation + Export-only JSON + recall-grounded chat (§8.4 / §8.4A).
- [x] Enriched mock patient genome/history files (§10).

---

## 18. How it could be useful in real life

This is a **credible direction, not a production clinical system**. Real-world value would come from
five reinforcing places — this is the honest framing to give judges or stakeholders (and the copy
that drives the landing page's lifecycle strip and §18 framing).

**1. Pharmacogenomics-guided prescribing.** Many adverse drug reactions come from genetic variation
(CYP2D6, TPMT, CYP2C9, VKORC1, etc.). A system that remembers a patient's genotype and links it to
drug metabolism could help avoid:
- Ineffective prodrugs (e.g. codeine in poor CYP2D6 metabolizers).
- Toxic accumulation (e.g. thiopurines in TPMT-deficient patients).
- Bleeding risk (e.g. warfarin in CYP2C9/VKORC1-sensitive patients).

These three cases are exactly what the demo's `CONTRA_RULES` + `dose_limit_blocks` encode (§10).

**2. Longitudinal adaptation.** As patients report outcomes, the graph improves over time — closer
to how real care works than a one-shot LLM consult. (Maps to the feedback loop → `remember`/
`improve`, §9.)

**3. Regulatory framing (real generic regimens).** The product doesn't invent new molecules. It
outputs a **structured spec** (named agents, doses, sigs, lot number) for a compounding pharmacy or
CDMO — a plausible path as personalized-therapeutics regulation evolves. (Export payload, §8.4.)

**4. Privacy and compliance.** `forget` maps to the **right to be forgotten** / data deletion —
important for HIPAA and similar regimes. (Delete patient → `forget_patient`, §9.)

**5. Why graph memory beats chunk RAG here.** Medical decisions often need **multi-hop reasoning**
(variant → enzyme → drug → outcome). A knowledge graph preserves those links across sessions; vector
RAG can miss them when facts sit in different chunks. (The demo graph + chat dramatize exactly this.)

> Honesty guardrail: keep saying "prototype / not for clinical use." The value proposition above is
> a *direction*, and the safety filter is deterministic-demo logic — not validated clinical decision
> support.
```