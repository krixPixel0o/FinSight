# FinSight

FinSight is a personal finance application with a Spring Boot REST API, PostgreSQL persistence, JWT authentication, and a React/Vite client.

## Current functionality

- Registration, login, profile and password updates
- User-owned accounts, categories, transactions, and budgets
- User-entered savings goals and liability snapshots with ownership checks
- Transaction filters, pagination, and CSV export
- Dashboard totals, cash-flow summaries, and deterministic rule-based insights
- Explainable six-month financial health score with coverage status and per-factor evidence
- Category-based unusual expense signals with historical baselines and disclosed thresholds
- Six-month average cash-flow forecasts with uncertainty labels and deterministic what-if scenarios
- Evidence-based spending and budget recommendations
- Optional authenticated AI assistant using only aggregate, read-only finance context
- Currency consistency checks and account transfers

The health score uses savings rate, recent expense trend, cash-flow stability, active budget adherence, cash-like reserve coverage, recorded liability payment burden, and average active goal progress. Goal balances and liabilities are manually entered and not independently verified; unavailable dimensions are excluded and disclosed rather than filled by assumption. Expense anomaly signals compare recent expenses to the same user's earlier category history; they are statistical prompts for review, not fraud determinations. Forecasts repeat the six fully completed months' arithmetic mean and disclose their limits. Goal completion estimates use each entered planned monthly contribution separately; they do not model competing goals or prove that the planned contribution is affordable. Liability payoff estimates assume a fixed rate, fixed payment, and no new charges or fees. Scenario calculations are deterministic; investment returns and behavior changes are not modeled. Recommendations cite user-owned budget and transaction aggregates. The optional assistant uses fixed backend read-only services, never arbitrary SQL or transaction actions, and returns a clear disabled response if no API key is configured. It does not persist conversations. When enabled, the user's question and aggregate financial context are sent to Google Gemini; Google's API data controls and retention apply.

Score thresholds and weights are controlled by `finsight.health-score.*` properties in `backend/src/main/resources/application.properties`; key thresholds can be overridden with environment variables listed in `.env.example`.

## Requirements

- Java 25
- Maven (or the included Maven wrapper)
- PostgreSQL
- Node.js and npm

## Local configuration

Copy `.env.example` to `.env` at the repository root and set the PostgreSQL credentials and a private, randomly generated `JWT_SECRET` of at least 32 bytes. Keep `.env` private; it is ignored by Git. The backend imports this file when launched from `backend/`.

Create a PostgreSQL database (the default local database name is `finsight2`) and set `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` accordingly. Local development keeps Hibernate `ddl-auto=update`; this is for local convenience only. The production profile uses Liquibase changesets and Hibernate validation. Enable it with `SPRING_PROFILES_ACTIVE=prod`, set `CORS_ALLOWED_ORIGINS` to your deployed frontend origin(s), and take a database backup before the first migration. The initial changesets create missing tables and mark tables already present as baselined; they do not drop or rewrite existing business data. The Liquibase changelog has a separate tracking table from the legacy Flyway history found in the local database.

## Run locally

Backend, from a terminal:

```powershell
cd backend
mvn spring-boot:run
```

Frontend, from a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

The API listens on port `8081` by default. The Vite client uses a development proxy for `/API`, so it can run on another available port without browser CORS errors. The proxy removes the browser `Origin` header because the API call is forwarded server-to-server. Set `VITE_API_PROXY_TARGET` if the backend is not at `http://localhost:8081`. Set `VITE_API_BASE_URL` when the frontend should call an API directly instead of using the same-origin `/API` path; in that case, add the frontend origin to `CORS_ALLOWED_ORIGINS`. Set `SERVER_PORT` to override the API port.

For a production-style PowerShell session, set required secrets and origins in the environment, then run `$env:SPRING_PROFILES_ACTIVE='prod'` before starting the backend. Keep `JWT_SECRET` private and set it to a newly generated value for each environment.

## Test and build

```powershell
cd backend
mvn test
cd ..\frontend
npm run build
```

Backend tests use an isolated in-memory H2 database in PostgreSQL compatibility mode. They do not connect to the developer's PostgreSQL database.

## API overview

Public endpoints:

- `POST /API/auth/register`
- `POST /API/auth/login`
- `GET /API/healthio`

Other API routes require `Authorization: Bearer <token>`. Core routes include `/API/auth`, `/API/accounts`, `/API/categories`, `/API/transactions`, `/API/budgets`, `/API/goals`, `/API/liabilities`, `/API/dashboard`, `/API/intelligence/health-score`, `/API/intelligence/anomalies`, `/API/intelligence/forecast`, `/API/intelligence/scenario`, `/API/intelligence/recommendations`, `POST /API/intelligence/assistant`, and `/API/reports/transactions.csv`.

The assistant calls the Gemini `generateContent` API only when `GEMINI_API_KEY` is configured on the backend. Set `GEMINI_MODEL` to a model enabled for your Google AI project and `GEMINI_MAX_REQUESTS_PER_HOUR` to change the default limit of 10 requests per user per hour. The frontend requires explicit consent before submitting. The backend sends the question plus aggregate score/forecast/recommendation/anomaly signals; it omits account credentials, transaction descriptions, and raw transaction rows. It applies a 15-second request timeout and does not log or persist prompts/replies. The rate limit is in memory per application instance. Google's API data controls and retention apply. Without a key, the endpoint responds with `DISABLED` and deterministic features continue to work.

## Roadmap

Work proceeds in stages: stabilize configuration/security and financial invariants; add migrations and deterministic health, anomaly, forecast, scenario, and recommendation features; then provide an optional backend-only Gemini assistant over allowlisted aggregate reads. Remaining release work includes broader endpoint-wide isolation tests, provider contract testing when an API key is available, migration checks for every supported legacy schema, and final performance/security review. The application is not foolproof; its scores and estimates depend on user-entered records and stated assumptions.
