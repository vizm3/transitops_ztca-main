# Case Study — TransitOps ZTCA Integration

## 1. Executive Summary

TransitOps is a production-ready Smart Fleet Operations platform that integrates a Zero Trust Continuous Authorization (ZTCA) engine to secure high-value operational flows (dispatch, vehicle/driver management, financial transactions). This case study documents the problem statement, architecture, implementation, enforcement outcomes, and lessons learned from implementing the ZTCA middleware, admin security panel, and simulation-driven validation workflow.

## 2. Business Challenge

- Real-time operational systems require continuous assessment of risk for every action, not just at login.
- Fleet operators must prevent unauthorized modifications (e.g., dispatch or vehicle deletion) while preserving operational velocity.
- Administrators need a single-pane view that reflects live decisions, simulated scenarios, and administrative actions (suspensions, policy changes) for audit and compliance.

Key requirements:
- Continuous, request-level risk scoring (0–100)
- Policy Decision Point (PDP) capable of returning ALLOW / STEP_UP / READ_ONLY / BLOCK
- Auditable, searchable logs and a Security Admin UI
- Simulation tooling to test policies and reflect simulated outcomes in the admin panel

## 3. Solution Overview

We built an Express middleware (`ztcaAuthorizationMiddleware`) that computes a `ZTCARequestContext` for every API request and evaluates risk via a `ZTCAEngine`. The engine returns a `RiskEvaluation` which the PDP uses to produce an enforcement `ZTCADecision`.

Core capabilities implemented:
- Device fingerprint and known-device registry
- Known-location checks and geo-anomaly detection
- Time-window (odd-hours) checks
- Action sensitivity scoring (dispatch, driver/vehicle CRUD, financial writes)
- Policy repository with editable rules surfaced in the Admin Panel
- Audit repository persisting the last 500 events to `backend/data/ztcaAuditLogs.json`
- Simulation endpoint (`/api/ztca/simulation/context-check`) that logs simulated runs and updates KPIs in real time

## 4. Architecture & Data Flow

1. Client sends API request (or simulation) with contextual headers (user id/name/role, device info, geolocation).
2. `ztcaAuthorizationMiddleware` builds `ZTCARequestContext` and calls `ZTCAEngine.evaluateRisk()`.
3. `ZTCAEngine.makeDecision()` evaluates active policies from `ZTCAPolicyRepository` and returns an enforcement decision.
4. Middleware logs an audit entry via `ZTCAAuditRepository` and enforces the decision (block, require step-up, or allow).
5. Admin Panel polls `/api/admin/metrics` and `/api/admin/audit-logs`; simulation runs also broadcast metric snapshots via `BroadcastChannel('ztca-updates')` so KPIs update instantly.

Diagram (high-level): Client → Express Middleware → ZTCA Engine → Policy Repo → Audit Store → Admin Panel

## 5. Implementation Details

- ZTCA Engine scoring rules (examples):
  - Unrecognized device: +25
  - Geographic anomaly: +20
  - Off-hours: +15
  - Dispatch / vehicle modification sensitivity: +20
  - Privilege mismatch (e.g., `Driver` attempting admin operation): +25

- Policy types: `BLOCK`, `STEP_UP`, `READ_ONLY` with thresholds (`maxAllowedRisk`). Policies are editable via the Admin Panel and persisted in `ztcaPolicies.json`.

- Audit storage: lightweight JSON-backed store (`JSONStore<T>`) with read/write helpers. Kept intentionally small (max 500 entries) for demo/test environments.

- Simulation enhancements:
  - Simulation runs now create audit entries with `context.simulation = true` and `decision.simulation = true`.
  - If a simulation yields `risk.totalScore === 100`, the endpoint forces a `BLOCK` decision and tags it `SIMULATION_FORCED_BLOCK` so it increments the blocked KPI.
  - Simulation endpoint returns an updated metrics snapshot which the simulation widget broadcasts via `BroadcastChannel` so the Admin Panel updates immediately.

## 6. Admin Security Panel — Reflection & Features

The Admin Panel (`src/components/AdminPanel.tsx`) shows:
- Live Request Stream with outcome badges (ALLOW, STEP-UP, READ-ONLY, BLOCK)
- KPIs: Total Requests, Allowed, Step-Up MFA, Read-Only, Blocked, Avg Context Risk
- Inspector drawer with full context, risk factor breakdown, decision reason, and whether event was simulated
- Device registry, policy configurator, and ability to trust/revoke devices

Enhancements made to reflect administrative actions:
- Driver/device/user status changes and policy CRUD operations now write ZTCA audit entries including the actor (from `x-ztca-user-*` headers) so admin actions appear in the same live stream and are auditable.

## 7. Validation Cases & Results

Representative test cases executed:

1. BLOCK (Unprivileged high-risk modification)
   - Input: `Driver` role, unknown device, foreign city, off-hours, modify driver record
   - Outcome: `BLOCK` or `STEP_UP` depending on policy; audit entry shows risk=100, inspector displays contributing risk factors

2. STEP_UP (MFA required)
   - Input: Fleet Manager in high-risk context for dispatch
   - Outcome: `STEP_UP` returned; after `POST /api/ztca/verify-stepup` and re-request with `x-ztca-stepup-token`, action allowed; both events recorded

3. Simulated forced block
   - Input: Simulation designed to reach 100/100 (unknown device + geo anomaly + odd-hours + admin endpoint + privilege mismatch)
   - Outcome: Decision forced to `BLOCK` with `policyTriggered=SIMULATION_FORCED_BLOCK`; blocked KPI increments and admin panel shows simulated badge

Metrics observed (example):
- Blocked KPI increments immediately after simulation because simulation endpoint now returns metrics and widget broadcasts updates.

## 8. Lessons Learned

- Auditing simulated runs alongside live events is valuable for policy tuning but must be clearly labeled (`simulation: true`) to avoid confusion in compliance reports.
- Returning a metrics snapshot from simulation calls allows immediate KPI updates; for production-grade systems, add SSE or WebSockets for scalable real-time updates.
- Device and location trust registries must be carefully curated; false positives (new device) can generate unnecessary friction unless mitigated by step-up flows.

## 9. Recommendations & Next Steps

Short-term:
- Add an Admin toggle to hide/show simulated logs.
- Expose a one-click link from the simulation widget to open the inspector for the generated `auditLogId`.

Medium-term:
- Replace JSON store with a persistent DB to support larger audit history, search, and retention policies.
- Add SSE/WebSocket push for metrics and stream updates to reduce polling.

Long-term:
- Add role-based policy templates, automated policy suggestion via ML, and anomaly detection enrichment.

## 10. Appendix — How to reproduce key tests

1. Start dev server:
```bash
npm run dev
```
2. Simulate a 100/100 block (example):
```bash
curl -s -X POST http://localhost:3000/api/ztca/simulation/context-check \
  -H "Content-Type: application/json" \
  -d '{
    "userId":"u_test_driver",
    "userName":"Test Driver",
    "userEmail":"driver@example.com",
    "userRole":"Driver",
    "deviceId":"dev-rogue-999",
    "deviceBrowser":"Firefox",
    "deviceOS":"Linux",
    "lat":55.7558,
    "lng":37.6173,
    "city":"Moscow",
    "country":"Russia",
    "isOddHours": true,
    "endpoint": "/api/admin/policies",
    "method": "PUT",
    "actionName":"Attempt Policy Change"
  }'
```

3. Verify Admin Panel KPIs and inspector for the returned `auditLogId`.

---

_Document generated from TransitOps repository state — intended to match the structure used in pages 33–42 of the provided BATCH_14_CSM_DOC_FINAL PDF._