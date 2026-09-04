import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Gauge,
  Lock,
  ShieldCheck,
  ShieldX,
  UserRound,
  XCircle
} from 'lucide-react';
import { SimulatedContext } from './ZTCAContextWidget';
import { User, UserRole } from '../types';

interface TrustCenterProps {
  currentUser: User;
  context: SimulatedContext;
}

type ActionStatus = 'ALLOWED' | 'RESTRICTED' | 'CONDITIONAL';

interface RoleAction {
  action: string;
  resource: string;
  status: ActionStatus;
  condition: string;
}

interface PolicySummary {
  id: string;
  name: string;
  implemented: boolean;
  enforcement: string;
  justified: string;
}

const roles: Array<{ role: UserRole; summary: string; actions: RoleAction[] }> = [
  {
    role: 'Admin',
    summary: 'Owns security administration and platform-wide configuration.',
    actions: [
      { action: 'Manage policies and audit logs', resource: 'ZTCA Admin', status: 'ALLOWED', condition: 'Admin role required; risk cap still applies.' },
      { action: 'Delete vehicles or drivers', resource: 'Fleet records', status: 'CONDITIONAL', condition: 'Known device and low context risk.' },
      { action: 'Dispatch and update trips', resource: 'Operations', status: 'CONDITIONAL', condition: 'Step-Up MFA can authorize elevated risk.' },
      { action: 'Use all operational reports', resource: 'Reports', status: 'ALLOWED', condition: 'Authenticated session.' }
    ]
  },
  {
    role: 'Fleet Manager',
    summary: 'Runs the fleet and dispatch workflow without security administration.',
    actions: [
      { action: 'Create and edit vehicles', resource: 'Fleet records', status: 'CONDITIONAL', condition: 'Known device, authorized location, and risk below 50.' },
      { action: 'Register drivers', resource: 'Driver records', status: 'CONDITIONAL', condition: 'Step-Up may be required for elevated context.' },
      { action: 'Dispatch and update trips', resource: 'Operations', status: 'CONDITIONAL', condition: 'Risk above 40 triggers Step-Up.' },
      { action: 'Manage ZTCA policies', resource: 'ZTCA Admin', status: 'RESTRICTED', condition: 'Admin / Super User only.' }
    ]
  },
  {
    role: 'Driver',
    summary: 'Updates assigned trip activity and submits operational records.',
    actions: [
      { action: 'View fleet and driver roster', resource: 'Operations', status: 'ALLOWED', condition: 'Authenticated session.' },
      { action: 'Update assigned trip status', resource: 'Trips', status: 'CONDITIONAL', condition: 'Continuous context evaluation.' },
      { action: 'Log fuel or expense', resource: 'Expenses', status: 'CONDITIONAL', condition: 'Elevated risk can downgrade the session.' },
      { action: 'Edit vehicles, drivers, or policies', resource: 'Protected records', status: 'RESTRICTED', condition: 'Elevated privilege mismatch is blocked.' }
    ]
  },
  {
    role: 'Safety Officer',
    summary: 'Reviews driver safety, maintenance signals, and compliance evidence.',
    actions: [
      { action: 'Review drivers and safety alerts', resource: 'Safety', status: 'ALLOWED', condition: 'Read access for authenticated sessions.' },
      { action: 'Open maintenance tickets', resource: 'Maintenance', status: 'CONDITIONAL', condition: 'Subject to endpoint policy and context risk.' },
      { action: 'Change driver status', resource: 'Driver records', status: 'CONDITIONAL', condition: 'Known device and risk threshold required.' },
      { action: 'Manage expenses or policies', resource: 'Finance / ZTCA', status: 'RESTRICTED', condition: 'Outside the role privilege boundary.' }
    ]
  },
  {
    role: 'Financial Analyst',
    summary: 'Analyzes operating costs and revenue while protecting the ledger.',
    actions: [
      { action: 'View expenses, fuel, and reports', resource: 'Finance', status: 'ALLOWED', condition: 'Authenticated session.' },
      { action: 'Add expense records', resource: 'Expense ledger', status: 'CONDITIONAL', condition: 'Risk above 45 becomes Read-Only.' },
      { action: 'Edit fleet or dispatch trips', resource: 'Operations', status: 'RESTRICTED', condition: 'Fleet or dispatch privilege required.' },
      { action: 'Manage ZTCA policies', resource: 'ZTCA Admin', status: 'RESTRICTED', condition: 'Admin / Super User only.' }
    ]
  }
];

const policies: PolicySummary[] = [
  { id: 'ZT-01', name: 'Admin area lockdown', implemented: true, enforcement: 'Blocks non-Admin access to /api/admin.', justified: 'Protects policy changes, audit streams, and security controls from privilege escalation.' },
  { id: 'ZT-02', name: 'Dispatch Step-Up', implemented: true, enforcement: 'Requires MFA when trip risk exceeds 40 or the device is unknown.', justified: 'Dispatch changes can move vehicles, people, and cargo, so identity assurance should rise with context risk.' },
  { id: 'ZT-03', name: 'Fleet record protection', implemented: true, enforcement: 'Blocks risky vehicle and driver writes; requires a known device.', justified: 'Prevents unauthorized asset, license, and safety record tampering.' },
  { id: 'ZT-04', name: 'Financial Read-Only downgrade', implemented: true, enforcement: 'Rejects expense writes when risk exceeds 45.', justified: 'Preserves ledger integrity while still allowing analysts to inspect operational data.' },
  { id: 'ZT-05', name: 'Universal critical risk cap', implemented: true, enforcement: 'Blocks any API request at critical risk (75+).', justified: 'A multi-factor threat should stop before it reaches any protected resource.' },
  { id: 'ZT-06', name: 'Least-privilege role matrix', implemented: false, enforcement: 'Documented in the UI, but not consistently enforced for every role by backend endpoints.', justified: 'Needed to ensure role permissions cannot be bypassed by a direct API request.' },
  { id: 'ZT-07', name: 'Continuous session revocation', implemented: false, enforcement: 'No token/session revocation or timeout service is currently connected.', justified: 'Needed to revoke a compromised session immediately after device, identity, or behavior changes.' }
];

const riskRules = [
  ['Unknown device', '+25', 'Device fingerprint is absent from the trusted-device registry.'],
  ['Location anomaly', '+20', 'City is outside the user\'s registered trusted locations.'],
  ['Odd hours', '+15', 'Request occurs between 11:00 PM and 05:00 AM.'],
  ['Sensitive write', '+15 to +20', 'Trips, fleet records, expenses, or admin routes carry action sensitivity.'],
  ['Driver privilege mismatch', '+25', 'A Driver attempts a privilege other than READ_OPERATIONS.'],
  ['Verified Step-Up', '-30', 'A valid temporary MFA/PIN token reduces the calculated score.']
];

const scoreLabel = (score: number) => score >= 75 ? 'CRITICAL' : score >= 55 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW';

export default function TrustCenter({ currentUser, context }: TrustCenterProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentUser.role);
  const [openPolicy, setOpenPolicy] = useState<string | null>(null);
  const selected = roles.find(item => item.role === selectedRole) || roles[0];

  useEffect(() => {
    setSelectedRole(currentUser.role);
  }, [currentUser.role]);

  return (
    <div className="space-y-6">
      <section className="bg-neutral-900 text-white rounded-xl p-6 border border-neutral-800 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-widest"><ShieldCheck className="w-4 h-4" /> Trust Center</div>
            <h1 className="text-3xl font-black mt-2 tracking-tight">Access is earned per request.</h1>
            <p className="text-neutral-300 mt-2 text-sm leading-6">A working reference for role boundaries, seven zero-trust policy decisions, contextual risk scoring, and the limits of this prototype.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 min-w-[280px]">
            <div className="bg-neutral-800 rounded-lg p-3 border border-neutral-700"><div className="text-2xl font-black text-emerald-400">5/7</div><div className="text-[10px] uppercase text-neutral-400 font-bold">Policies live</div></div>
            <div className="bg-neutral-800 rounded-lg p-3 border border-neutral-700"><div className="text-2xl font-black text-amber-400">6</div><div className="text-[10px] uppercase text-neutral-400 font-bold">Risk rules</div></div>
            <div className="bg-neutral-800 rounded-lg p-3 border border-neutral-700"><div className="text-2xl font-black text-cyan-400">JSON</div><div className="text-[10px] uppercase text-neutral-400 font-bold">Persistence</div></div>
          </div>
        </div>
      </section>

      <section className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div><h2 className="text-lg font-black text-neutral-900 flex items-center gap-2"><UserRound className="w-5 h-5 text-emerald-600" /> Role action matrix</h2><p className="text-xs text-neutral-500 mt-1">Select any role to inspect possible and restricted actions.</p></div>
          <select value={selectedRole} onChange={event => setSelectedRole(event.target.value as UserRole)} className="border border-neutral-300 rounded-lg px-3 py-2 text-sm font-bold bg-white">
            {roles.map(item => <option key={item.role} value={item.role}>{item.role}</option>)}
          </select>
        </div>
        <p className="text-sm text-neutral-600 mb-4">{selected.summary}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {selected.actions.map(item => <div key={item.action} className="border border-neutral-200 rounded-lg p-3 flex gap-3"><div className="mt-0.5">{item.status === 'ALLOWED' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : item.status === 'RESTRICTED' ? <XCircle className="w-5 h-5 text-red-600" /> : <AlertTriangle className="w-5 h-5 text-amber-600" />}</div><div><div className="flex flex-wrap items-center gap-2"><span className="font-bold text-sm text-neutral-800">{item.action}</span><span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${item.status === 'ALLOWED' ? 'bg-emerald-100 text-emerald-700' : item.status === 'RESTRICTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{item.status}</span></div><div className="text-xs text-neutral-500 mt-1">{item.resource} · {item.condition}</div></div></div>)}
        </div>
      </section>

      <section className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
        <div className="mb-4"><h2 className="text-lg font-black text-neutral-900 flex items-center gap-2"><Lock className="w-5 h-5 text-cyan-700" /> Seven-policy implementation review</h2><p className="text-xs text-neutral-500 mt-1">Implemented means the current backend engine actively evaluates and enforces it.</p></div>
        <div className="space-y-2">
          {policies.map(policy => <div key={policy.id} className="border border-neutral-200 rounded-lg overflow-hidden"><button onClick={() => setOpenPolicy(openPolicy === policy.id ? null : policy.id)} className="w-full text-left p-3 flex items-center gap-3 hover:bg-neutral-50"><span className={`w-2.5 h-2.5 rounded-full ${policy.implemented ? 'bg-emerald-500' : 'bg-neutral-300'}`} /><span className="text-[10px] font-black text-neutral-400">{policy.id}</span><span className="font-bold text-sm flex-1">{policy.name}</span><span className={`text-[9px] font-black ${policy.implemented ? 'text-emerald-700' : 'text-neutral-500'}`}>{policy.implemented ? 'IMPLEMENTED' : 'GAP / PLANNED'}</span>{openPolicy === policy.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>{openPolicy === policy.id && <div className="px-9 pb-3 text-xs text-neutral-600 grid md:grid-cols-2 gap-3"><div><b className="text-neutral-800">How it works:</b> {policy.enforcement}</div><div><b className="text-neutral-800">Why justified:</b> {policy.justified}</div></div>}</div>)}
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
          <div className="mb-4"><h2 className="text-lg font-black text-neutral-900 flex items-center gap-2"><Gauge className="w-5 h-5 text-amber-600" /> Rule-based risk detection</h2><p className="text-xs text-neutral-500 mt-1">Scores add context signals and cap at 100.</p></div>
          <div className="space-y-2">{riskRules.map(rule => <div key={rule[0]} className="flex gap-3 border-b border-neutral-100 pb-2"><span className="font-bold text-sm text-neutral-800 flex-1">{rule[0]}</span><span className="font-mono text-xs font-black text-amber-700">{rule[1]}</span><span className="text-xs text-neutral-500 max-w-[48%]">{rule[2]}</span></div>)}</div>
        </section>

        <section className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm"><h2 className="text-lg font-black text-neutral-900 flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-neutral-700" /> Known limitations</h2><ul className="mt-3 text-xs text-neutral-600 space-y-1.5 list-disc pl-4"><li>Passwords and the Step-Up demo PIN are not production-grade authentication.</li><li>Some role boundaries remain UI/documentation-only and need a centralized server-side authorization matrix.</li><li>Risk signals are deterministic heuristics; there is no behavioral baseline, device attestation, or real-time revocation.</li></ul></section>
      </div>
    </div>
  );
}