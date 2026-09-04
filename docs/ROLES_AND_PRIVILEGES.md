# Roles and Privileges in TransitOps ZTCA Backend

This summary is derived from the backend authorization model in:
- `backend/types.ts`
- `backend/ztca/types.ts`
- `backend/ztca/middleware.ts`
- `backend/ztca/engine.ts`
- `backend/ztca/store.ts`

## 1. Defined Roles

The backend currently defines these roles:

- Fleet Manager
- Driver
- Safety Officer
- Financial Analyst
- Admin

Source: `backend/types.ts`

## 2. Privilege Model Used by the Backend

The ZTCA middleware does not assign fixed privilege buckets to each role in a static RBAC map. Instead, it derives the required privilege from the request path and HTTP method.

These are the privilege values used in the code:

- `READ_OPERATIONS`
- `WRITE_VEHICLES`
- `WRITE_DRIVERS`
- `DISPATCH_TRIP`
- `MANAGE_EXPENSES`
- `ADMIN_POLICIES`
- `SUPER_USER`

The mapping is implemented in `backend/ztca/middleware.ts`:

- `/api/admin` -> `ADMIN_POLICIES`
- `/api/trips` + modification request -> `DISPATCH_TRIP`
- `/api/vehicles` + modification request -> `WRITE_VEHICLES`
- `/api/drivers` + modification request -> `WRITE_DRIVERS`
- `/api/expenses` + modification request -> `MANAGE_EXPENSES`
- Otherwise -> `READ_OPERATIONS`

## 3. Role-to-Privilege Interpretation

| Role | Effective interpretation in backend | Notes |
| --- | --- | --- |
| Fleet Manager | Allowed general operational access and fleet management actions | Default fallback user in middleware; can perform dispatch, vehicles, and driver modifications if not blocked by risk checks |
| Driver | Normal read operations only by default | If a driver attempts a higher-privilege action such as dispatching or admin-related operations, the risk engine marks it as `rf_privilege_mismatch` |
| Safety Officer | Role exists in enum, but not separately enforced in middleware | Treated as a recognized identity, though no explicit route-based privilege mapping is hardcoded for it |
| Financial Analyst | Role exists in enum, but not separately enforced in middleware | Likely intended for financial oversight; expense-related policies are enforced by endpoint risk logic rather than role-based checks |
| Admin | Full administrative access | Special-case rule enforces that only `Admin` can access `/api/admin` and modify policy settings |

## 4. Explicit Security Rules in the ZTCA Engine

The risk engine in `backend/ztca/engine.ts` adds risk when role and privilege do not align.

### Driver privilege mismatch rule

If:
- `context.userRole === 'Driver'`
- and `context.requiredPrivilege !== 'READ_OPERATIONS'`

then the system penalizes the request with:

- score: `25`
- rule: `rf_privilege_mismatch`
- name: `Elevated Privilege Access Attempt`
- description: `User role 'Driver' attempting administrative or financial action ...`

This means a Driver is considered high risk when trying to access operations beyond general read access.

## 5. Security Policies Triggered by Risk and Endpoint

The default active policies in `backend/ztca/store.ts` are:

### Policy 1: `pol_1_admin_protection`
- Name: `Super User / Admin Area Lockdown`
- Scope: `/api/admin`
- Restriction: only Admin / Super User can access admin panel
- Risk threshold: `30`
- Action on violation: `BLOCK`

### Policy 2: `pol_2_dispatch_stepup`
- Name: `High Risk Dispatch & Trip Scheduling Safeguard`
- Scope: `/api/trips`
- Restriction: requires step-up verification if dispatching or modifying trips when risk exceeds `40`
- Risk threshold: `40`
- Action on violation: `STEP_UP`

### Policy 3: `pol_3_vehicle_driver_mod`
- Name: `Fleet Configuration Change Protection`
- Scope: `/api/(vehicles|drivers)`
- Restriction: blocks modifications from unknown devices or unauthorized locations when risk exceeds `50`
- Risk threshold: `50`
- Action on violation: `BLOCK`

### Policy 4: `pol_4_financial_readonly`
- Name: `Financial Expenses Read-Only Downgrade`
- Scope: `/api/expenses`
- Restriction: expense modifications downgraded to read-only if risk is greater than `45`
- Risk threshold: `45`
- Action on violation: `READ_ONLY`

### Policy 5: `pol_5_general_risk_cap`
- Name: `Universal Critical Threat Interceptor`
- Scope: all API routes
- Restriction: blocks any request if risk reaches `>= 75`
- Risk threshold: `75`
- Action on violation: `BLOCK`

## 6. Effective Access Summary

### Admin
- Can access admin endpoints
- Can manage ZTCA policies
- Protected by strict lockdown rule

### Fleet Manager
- Standard operational access
- Can likely manage trips, vehicles, and driver records if context risk is acceptable
- Subject to trip/vehicle/driver policy thresholds

### Driver
- Intended for operational read access
- Not allowed to perform elevated/admin/financial actions under the risk model
- Risk-based step-up or block will trigger if privilege exceeds safe threshold

### Safety Officer / Financial Analyst
- Enum exists, but explicit privilege enforcement is not hardcoded to those names in the middleware
- Their access is effectively normalized through the generic policy engine and endpoint-based privilege checks

## 7. Short Rule of Thumb

The backend behaves like this:

- Role is recognized, but privilege is mainly inferred from the endpoint and request type.
- Sensitive actions require a matching privilege and a low-risk environment.
- Admin access is locked to the `Admin` role.
- Drivers are specially monitored for privilege mismatch.
- Policies enforce additional risk thresholds for dispatch, fleet changes, expense logic, and general critical risk.
