# FinSight — Submission Stabilization Notes

## Changes in this submission package

- Hardened the deterministic recommendation engine against legacy/incomplete budget records. Invalid active budgets (missing dates/category/amount or non-positive amount) are ignored instead of causing recommendation generation to fail with arithmetic/null errors.
- Added a regression test covering a zero-value legacy budget so recommendation generation remains available.
- Improved the Insights Recommendations UI with a non-blocking unavailable state and a retry action.
- Removed the local `.env` file from the submission package. Use `.env.example` to create a local `.env` with your own credentials/secrets.

## Verification note

The source was statically reviewed in the submission environment. Full Maven execution was not possible in the isolated environment because the Maven wrapper could not download its Maven distribution and no system Maven installation was available. The frontend build was also blocked by a missing platform-specific optional Rolldown native binding in the uploaded `node_modules`; run `npm install` on the target Windows machine before `npm run build`.

## Local run

1. Copy `.env.example` to `.env` and set PostgreSQL/JWT values.
2. In `backend/`, run `mvn spring-boot:run` (or `./mvnw spring-boot:run`).
3. In `frontend/`, run `npm install` and then `npm run dev`.
4. Open `http://localhost:5173`.
