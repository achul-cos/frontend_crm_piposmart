@AGENTS.md

## Sprint workflow

This project follows the sprint cycle defined in `FRONTEND_PLAN_SPRINT.md` (weekly, stakeholders:
Developer/Project Manager/CTO), an adapted counterpart to the backend's `BACKEND_PLAN_SPRINT.md`
(`../BACKEND_PLAN_SPRINT.md`).

Before declaring a frontend sprint (FE-XX) done, and before starting the next one:

- Audit the just-finished sprint against `FRONTEND_PLAN_SPRINT.md`'s roadmap (scope creep / under-delivery)
  — same audit discipline as `backend_crm_piposmart/CLAUDE.md`.
- **Additionally**, cross-check the sprint's implementation against the backend's *current* actual
  contract — `../backend_crm_piposmart/internal/platform/httpserver/openapi.yaml` and the relevant
  handler code — not against what was true when the sprint started. The backend ships weekly and its
  contract can change mid-sprint (e.g. new response fields added same-day).
- Report using the format in `FRONTEND_PLAN_SPRINT.md`'s "Format Laporan Sprint" section, filed under
  `docs/sprint-fe-XX/`.
- A sprint item is not done on passing automated tests alone — manually verify in a browser
  (`npm run dev`) before reporting complete.
