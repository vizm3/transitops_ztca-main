import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BookOpen,
  CheckCircle2,
  LockKeyhole,
  Settings2,
  ShieldCheck,
  Users,
  Workflow
} from 'lucide-react';

interface ProjectOverviewProps {
  onBack: () => void;
}

const roles = [
  ['Admin', 'Manages policies, audit logs, devices, and platform-wide configuration.'],
  ['Fleet Manager', 'Runs fleet records and dispatch workflows.'],
  ['Driver', 'Updates assigned trips and submits operational records.'],
  ['Safety Officer', 'Reviews driver safety, maintenance, and compliance evidence.'],
  ['Financial Analyst', 'Reviews operating costs, fuel, expenses, and reports.']
];

const policies = [
  ['Admin area lockdown', 'Only Admin can reach security policy, audit, and device controls.', 'BLOCK'],
  ['Dispatch Step-Up', 'Trip changes above the configured risk threshold require a verified PIN/MFA step.', 'STEP_UP'],
  ['Fleet record protection', 'Vehicle and driver writes require a trusted device and acceptable context.', 'BLOCK'],
  ['Financial Read-Only downgrade', 'Expense writes are restricted when the context becomes too risky.', 'READ_ONLY'],
  ['Universal critical-risk cap', 'Requests at critical risk are stopped before reaching protected resources.', 'BLOCK'],
  ['Least-privilege boundaries', 'Roles receive only the operational access needed for their responsibilities.', 'ROLE CHECK'],
  ['Continuous authorization', 'Identity and context are evaluated on each protected request, not only at login.', 'EVERY REQUEST']
];

const flowSteps = [
  ['01', 'Request', 'The client sends an API action with identity and operational context.'],
  ['02', 'Context build', 'Middleware derives privilege, known-device status, location status, and time signals.'],
  ['03', 'Risk score', 'The engine adds risk factors and caps the result between 0 and 100.'],
  ['04', 'Policy decision', 'Active policies compare the score and context against their conditions.'],
  ['05', 'Enforcement', 'The API allows, challenges, limits, or blocks the action, then records the result.']
];

const riskBands = [
  ['0-29', 'LOW', 'Normal context. Requests can proceed when role and endpoint permissions match.', 'emerald'],
  ['30-54', 'MEDIUM', 'Additional context concern. Write actions at 35+ may become Read-Only.', 'amber'],
  ['55-74', 'HIGH', 'Elevated risk. Step-Up verification is required unless an active policy says otherwise.', 'orange'],
  ['75-100', 'CRITICAL', 'Multiple or severe signals. Critical-risk requests are blocked.', 'red']
];

const contextFields = [
  ['Identity', 'User ID, name, email, and assigned role'],
  ['Device', 'Fingerprint, browser, operating system, and trusted-device status'],
  ['Location', 'Latitude, longitude, city, country, and known-location status'],
  ['Timing', 'Request timestamp and the odd-hours flag for 11:00 PM to 05:00 AM'],
  ['Action', 'Endpoint, HTTP method, action name, and required privilege'],
  ['Verification', 'Optional Step-Up token used to reduce risk after successful MFA/PIN verification']
];

const decisions = [
  ['ALLOW', 'Context satisfies active policies and risk is within the permitted range.', 'Continue the requested operation.'],
  ['STEP_UP', 'Risk is elevated or a policy requires stronger proof of identity.', 'Ask for MFA/PIN; a valid token can authorize a retry.'],
  ['READ_ONLY', 'Moderate risk affects a write action without requiring a full block.', 'Permit inspection while preventing the write.'],
  ['BLOCK', 'Critical risk or a hard policy violation is detected.', 'Reject the request and retain the decision reason for security review.']
];

export default function ProjectOverview({ onBack }: ProjectOverviewProps) {
  return (
    <div className="min-h-screen bg-neutral-100 py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm font-bold text-neutral-600 hover:text-emerald-700">
          <ArrowLeft className="w-4 h-4" /> Back to sign in
        </button>

        <header className="bg-neutral-900 text-white rounded-xl p-6 sm:p-8 shadow-lg">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-widest">
            <BookOpen className="w-4 h-4" /> Project overview
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mt-3">TransitOps</h1>
          <p className="text-neutral-300 mt-3 max-w-3xl leading-7">
            A smart transport operations platform for fleet management, dispatch, driver safety, maintenance, finance, reporting, and Zero Trust Continuous Authorization (ZTCA).
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <section className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
            <h2 className="font-black text-lg flex items-center gap-2"><Workflow className="w-5 h-5 text-emerald-600" /> How the flow works</h2>
            <ol className="mt-4 space-y-3 text-sm text-neutral-600 list-decimal pl-5">
              <li>An operator signs in and receives access based on their role.</li>
              <li>Each protected API request carries identity, device, location, time, and action context.</li>
              <li>The ZTCA engine scores the context and evaluates active policies.</li>
              <li>The platform allows the request, asks for Step-Up verification, switches to Read-Only, or blocks it.</li>
              <li>Decisions and context are available to authorized security administrators through the audit dashboard.</li>
            </ol>
          </section>

          <section className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
            <h2 className="font-black text-lg flex items-center gap-2"><Users className="w-5 h-5 text-cyan-700" /> Roles and responsibilities</h2>
            <div className="mt-4 space-y-3">
              {roles.map(([role, description]) => <div key={role} className="border-b border-neutral-100 pb-3"><div className="font-bold text-sm text-neutral-800">{role}</div><div className="text-xs text-neutral-500 mt-1">{description}</div></div>)}
            </div>
          </section>

          <section className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
            <h2 className="font-black text-lg flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-600" /> Policies implemented</h2>
            <div className="mt-4 space-y-2">
              {policies.map(([name]) => <div key={name} className="flex items-start gap-2 text-sm text-neutral-600"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />{name}</div>)}
            </div>
          </section>

          <section className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
            <h2 className="font-black text-lg flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-600" /> Risk detection</h2>
            <p className="text-sm text-neutral-600 mt-4 leading-6">Risk is calculated from signals such as unknown devices, location anomalies, odd hours, sensitive writes, and role privilege mismatches. A verified Step-Up challenge reduces risk before a protected action is retried.</p>
            <div className="mt-4 border-t border-neutral-100 pt-4 flex items-start gap-2 text-xs text-neutral-500"><LockKeyhole className="w-4 h-4 text-neutral-700 mt-0.5 shrink-0" />Critical-risk requests are blocked, while lower-risk requests may proceed or be restricted according to policy.</div>
          </section>
        </div>

        <section className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm mt-6">
          <h2 className="font-black text-lg flex items-center gap-2"><Workflow className="w-5 h-5 text-emerald-600" /> ZTCA flow design</h2>
          <p className="text-sm text-neutral-600 mt-2">TransitOps uses a request-level Policy Decision Point. The same sequence protects operational APIs, administrative actions, and financial writes.</p>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-5">
            {flowSteps.map(([number, title, description]) => <div key={number} className="border-t-4 border-emerald-500 bg-neutral-50 p-4"><div className="text-xs font-black text-emerald-700">{number}</div><div className="font-black text-sm text-neutral-900 mt-2">{title}</div><div className="text-xs text-neutral-500 mt-2 leading-5">{description}</div></div>)}
          </div>
        </section>

        <section className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm mt-6">
          <h2 className="font-black text-lg flex items-center gap-2"><Settings2 className="w-5 h-5 text-cyan-700" /> Policy catalogue</h2>
          <div className="overflow-x-auto mt-4"><table className="w-full text-left text-sm"><thead className="text-[10px] uppercase tracking-wider text-neutral-400 border-b border-neutral-200"><tr><th className="py-2 pr-4">Policy</th><th className="py-2 pr-4">What it protects</th><th className="py-2">Typical response</th></tr></thead><tbody>{policies.map(([name, description, response]) => <tr key={name} className="border-b border-neutral-100 last:border-0"><td className="py-3 pr-4 font-bold text-neutral-800 whitespace-nowrap">{name}</td><td className="py-3 pr-4 text-neutral-600">{description}</td><td className="py-3 text-xs font-black text-emerald-700 whitespace-nowrap">{response}</td></tr>)}</tbody></table></div>
        </section>

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <section className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
            <h2 className="font-black text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-amber-600" /> Risk score bands</h2>
            <div className="mt-4 space-y-3">{riskBands.map(([range, level, description]) => <div key={level} className="grid grid-cols-[4rem_5rem_1fr] gap-3 items-start border-b border-neutral-100 pb-3 last:border-0"><span className="font-mono text-xs font-black text-neutral-500">{range}</span><span className="text-[10px] font-black text-neutral-800">{level}</span><span className="text-xs text-neutral-600 leading-5">{description}</span></div>)}</div>
            <p className="text-xs text-neutral-500 mt-3">Signals add together and the final score is clamped to the 0-100 range. A verified Step-Up token can reduce the score by 30 points.</p>
          </section>

          <section className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
            <h2 className="font-black text-lg flex items-center gap-2"><LockKeyhole className="w-5 h-5 text-cyan-700" /> Simulation context</h2>
            <p className="text-xs text-neutral-500 mt-2">The demonstration can evaluate a dry-run context with the same fields used by protected requests. Simulation results are separate from live operational actions.</p>
            <div className="mt-4 space-y-2">{contextFields.map(([field, description]) => <div key={field} className="flex gap-3 border-b border-neutral-100 pb-2"><span className="text-xs font-black text-neutral-800 w-24 shrink-0">{field}</span><span className="text-xs text-neutral-600">{description}</span></div>)}</div>
          </section>
        </div>

        <section className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm mt-6">
          <h2 className="font-black text-lg flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-600" /> Decision mapping</h2>
          <div className="grid md:grid-cols-2 gap-3 mt-4">{decisions.map(([outcome, trigger, behavior]) => <div key={outcome} className="border border-neutral-200 p-4"><div className="flex items-center justify-between gap-3"><span className="font-black text-sm text-neutral-900">{outcome}</span><span className="text-[10px] font-black text-neutral-500">PDP OUTCOME</span></div><p className="text-xs text-neutral-600 mt-2">{trigger}</p><p className="text-xs font-bold text-emerald-700 mt-2">System behavior: {behavior}</p></div>)}</div>
        </section>

        <section className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm mt-6">
          <h2 className="font-black text-lg">Project scope</h2>
          <p className="text-sm text-neutral-600 mt-3 leading-6">The authenticated workspace brings together operational records, dashboards, reports, maintenance, expenses, driver and vehicle management, the Trust Center, and an Admin security panel. The backend uses Express with repository-backed JSON data for this demonstration, while the frontend uses React and Vite.</p>
        </section>
      </div>
    </div>
  );
}
