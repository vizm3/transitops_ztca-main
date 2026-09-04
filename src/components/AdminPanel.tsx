import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Gauge,
  Activity,
  Smartphone,
  MapPin,
  Clock,
  Filter,
  Search,
  RefreshCw,
  Eye,
  Sliders,
  Settings,
  AlertTriangle,
  UserCheck,
  X,
  Plus,
  CheckCircle2,
  Trash2,
  Lock,
  ChevronRight,
  TrendingUp,
  KeyRound,
  FileText
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import { User } from '../types';

interface ZTCAAuditLog {
  id: string;
  timestamp: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  context: {
    deviceId: string;
    deviceBrowser: string;
    deviceOS: string;
    isKnownDevice: boolean;
    city: string;
    country: string;
    lat: number;
    lng: number;
    isKnownLocation: boolean;
    isOddHours: boolean;
    endpoint: string;
    method: string;
    actionName: string;
    requiredPrivilege: string;
  };
  risk: {
    totalScore: number;
    level: string;
    factors: Array<{
      ruleId: string;
      name: string;
      score: number;
      description: string;
    }>;
  };
  decision: {
    outcome: 'ALLOW' | 'BLOCK' | 'STEP_UP' | 'READ_ONLY';
    riskScore: number;
    riskLevel: string;
    reason: string;
    policyTriggered?: string;
  };
}

interface PolicyRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  targetRole?: string;
  targetEndpointPattern?: string;
  maxAllowedRisk: number;
  requireKnownDevice?: boolean;
  requireKnownLocation?: boolean;
  actionIfViolated: 'BLOCK' | 'STEP_UP' | 'READ_ONLY';
}

interface KnownDevice {
  id: string;
  userId: string;
  fingerprint: string;
  deviceName: string;
  browser: string;
  os: string;
  addedAt: string;
  lastUsed: string;
  status: 'TRUSTED' | 'REVOKED' | 'FLAGGED';
}

interface ResourceAccessRule {
  resource: string;
  category: string;
  endpoint: string;
  action: string;
  driverAccess: 'ALLOWED' | 'STEP_UP' | 'READ_ONLY' | 'BLOCKED';
  managerAccess: 'ALLOWED' | 'STEP_UP' | 'READ_ONLY' | 'BLOCKED';
  techAccess: 'ALLOWED' | 'STEP_UP' | 'READ_ONLY' | 'BLOCKED';
  adminAccess: 'ALLOWED' | 'STEP_UP' | 'READ_ONLY' | 'BLOCKED';
  ztcaCondition: string;
}

const RESOURCE_ACCESS_MATRIX: ResourceAccessRule[] = [
  {
    resource: 'Vehicle Registry List',
    category: 'Fleet Vehicles',
    endpoint: '/api/vehicles',
    action: 'GET (Read Fleet Roster)',
    driverAccess: 'ALLOWED',
    managerAccess: 'ALLOWED',
    techAccess: 'ALLOWED',
    adminAccess: 'ALLOWED',
    ztcaCondition: 'Evaluates location anomalies. High risk triggers Read-Only.'
  },
  {
    resource: 'Add / Register Vehicle',
    category: 'Fleet Vehicles',
    endpoint: '/api/vehicles',
    action: 'POST (Create Asset)',
    driverAccess: 'BLOCKED',
    managerAccess: 'ALLOWED',
    techAccess: 'BLOCKED',
    adminAccess: 'ALLOWED',
    ztcaCondition: 'Requires Manager/Admin role & Risk Score < 50. Step-Up if new device.'
  },
  {
    resource: 'Update Vehicle Profile',
    category: 'Fleet Vehicles',
    endpoint: '/api/vehicles/:id',
    action: 'PUT (Edit Asset)',
    driverAccess: 'BLOCKED',
    managerAccess: 'ALLOWED',
    techAccess: 'ALLOWED',
    adminAccess: 'ALLOWED',
    ztcaCondition: 'Requires known device or MFA step-up verification.'
  },
  {
    resource: 'Delete Vehicle Asset',
    category: 'Fleet Vehicles',
    endpoint: '/api/vehicles/:id',
    action: 'DELETE (De-register Asset)',
    driverAccess: 'BLOCKED',
    managerAccess: 'BLOCKED',
    techAccess: 'BLOCKED',
    adminAccess: 'ALLOWED',
    ztcaCondition: 'Super-User Admin privilege only. Risk score must be < 40.'
  },
  {
    resource: 'Driver Roster & Profiles',
    category: 'Driver Personnel',
    endpoint: '/api/drivers',
    action: 'GET (Read Roster)',
    driverAccess: 'ALLOWED',
    managerAccess: 'ALLOWED',
    techAccess: 'ALLOWED',
    adminAccess: 'ALLOWED',
    ztcaCondition: 'Unrestricted for active authenticated session.'
  },
  {
    resource: 'Register New Driver',
    category: 'Driver Personnel',
    endpoint: '/api/drivers',
    action: 'POST (Add Driver Profile)',
    driverAccess: 'BLOCKED',
    managerAccess: 'ALLOWED',
    techAccess: 'BLOCKED',
    adminAccess: 'ALLOWED',
    ztcaCondition: 'Fleet Manager/Admin role. Step-Up required during off-hours.'
  },
  {
    resource: 'Delete Driver Record',
    category: 'Driver Personnel',
    endpoint: '/api/drivers/:id',
    action: 'DELETE (Remove Profile)',
    driverAccess: 'BLOCKED',
    managerAccess: 'BLOCKED',
    techAccess: 'BLOCKED',
    adminAccess: 'ALLOWED',
    ztcaCondition: 'Super-User Admin role strictly enforced.'
  },
  {
    resource: 'Dispatch Route / Trip',
    category: 'Trips & Dispatch',
    endpoint: '/api/trips',
    action: 'POST (Dispatch Route)',
    driverAccess: 'ALLOWED',
    managerAccess: 'ALLOWED',
    techAccess: 'READ_ONLY',
    adminAccess: 'ALLOWED',
    ztcaCondition: 'High context risk (+20 location or +15 off-hours) triggers MFA step-up.'
  },
  {
    resource: 'Trip Status Updates',
    category: 'Trips & Dispatch',
    endpoint: '/api/trips/:id',
    action: 'PUT (Update Trip Status)',
    driverAccess: 'ALLOWED',
    managerAccess: 'ALLOWED',
    techAccess: 'ALLOWED',
    adminAccess: 'ALLOWED',
    ztcaCondition: 'Drivers can update assigned trip status. Risk score monitored continuously.'
  },
  {
    resource: 'Check-In Workshop Ticket',
    category: 'Maintenance',
    endpoint: '/api/maintenance',
    action: 'POST (Open Maintenance)',
    driverAccess: 'BLOCKED',
    managerAccess: 'ALLOWED',
    techAccess: 'ALLOWED',
    adminAccess: 'ALLOWED',
    ztcaCondition: 'Requires Manager or Tech role.'
  },
  {
    resource: 'Close Workshop Ticket',
    category: 'Maintenance',
    endpoint: '/api/maintenance/:id',
    action: 'PUT (Resolve Repair)',
    driverAccess: 'BLOCKED',
    managerAccess: 'READ_ONLY',
    techAccess: 'ALLOWED',
    adminAccess: 'ALLOWED',
    ztcaCondition: 'Tech/Admin role required. Must provide repair cost & release date.'
  },
  {
    resource: 'Fuel & Expense Ledger',
    category: 'Expenses & Fuel',
    endpoint: '/api/expenses, /api/fuel-logs',
    action: 'POST (Log Expense)',
    driverAccess: 'ALLOWED',
    managerAccess: 'ALLOWED',
    techAccess: 'ALLOWED',
    adminAccess: 'ALLOWED',
    ztcaCondition: 'Allowed for all personnel. Step-Up triggered if risk score > 65.'
  },
  {
    resource: 'ZTCA Admin Security Panel',
    category: 'Security Admin',
    endpoint: '/api/admin/*',
    action: 'ALL (PDP & Policy Control)',
    driverAccess: 'BLOCKED',
    managerAccess: 'BLOCKED',
    techAccess: 'BLOCKED',
    adminAccess: 'ALLOWED',
    ztcaCondition: 'Protected by pol_1_admin_protection. Blocked for non-Admin roles.'
  }
];

interface AdminPanelProps {
  currentUser: User | null;
}

export default function AdminPanel({ currentUser }: AdminPanelProps) {
  const isAdmin = currentUser?.role === 'Admin';

  const [activeSubTab, setActiveSubTab] = useState<'stream' | 'matrix' | 'analytics' | 'policies' | 'devices'>('stream');
  const [auditLogs, setAuditLogs] = useState<ZTCAAuditLog[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [policies, setPolicies] = useState<PolicyRule[]>([]);
  const [devices, setDevices] = useState<KnownDevice[]>([]);
  
  const [selectedOutcomeFilter, setSelectedOutcomeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<ZTCAAuditLog | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);

  // New policy modal state
  const [isNewPolicyOpen, setIsNewPolicyOpen] = useState(false);
  const [newPolicyName, setNewPolicyName] = useState('');
  const [newPolicyDesc, setNewPolicyDesc] = useState('');
  const [newPolicyRisk, setNewPolicyRisk] = useState(50);
  const [newPolicyAction, setNewPolicyAction] = useState<'BLOCK' | 'STEP_UP' | 'READ_ONLY'>('BLOCK');

  // Live Alert Popup State for Admin
  const [activeAlert, setActiveAlert] = useState<{
    id: string;
    userName: string;
    userRole: string;
    deviceId: string;
    city: string;
    isKnownDevice: boolean;
    isKnownLocation: boolean;
    isOddHours: boolean;
    riskScore: number;
    outcome: string;
    actionName: string;
    endpoint: string;
    timestamp: string;
    secondsLeft: number;
  } | null>(null);
  const lastSeenLogIdRef = React.useRef<string | null>(null);

  // Countdown timer for active alert
  useEffect(() => {
    if (!activeAlert) return;
    if (activeAlert.secondsLeft <= 0) {
      setActiveAlert(null);
      return;
    }
    const timer = setInterval(() => {
      setActiveAlert(prev => {
        if (!prev) return null;
        if (prev.secondsLeft <= 1) return null;
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeAlert?.id, activeAlert?.secondsLeft]);

  // Fetch audit stream and metrics
  const fetchData = async () => {
    try {
      // Audit Logs
      const logsRes = await fetch(`/api/admin/audit-logs?outcome=${selectedOutcomeFilter}&search=${encodeURIComponent(searchQuery)}`);
      if (logsRes.ok) {
        const logsData = (await logsRes.json()) as ZTCAAuditLog[];
        setAuditLogs(logsData);

        // Check if there is a new incoming audit event with high risk or unrecognized context
        if (logsData.length > 0) {
          const newestLog = logsData[0];
          if (lastSeenLogIdRef.current && lastSeenLogIdRef.current !== newestLog.id) {
            // Trigger 15-second pop-up if risk score >= 20 or unknown device/location or off-hours
            const hasAnomaly =
              !newestLog.context.isKnownDevice ||
              !newestLog.context.isKnownLocation ||
              newestLog.context.isOddHours ||
              newestLog.risk.totalScore >= 20 ||
              newestLog.decision.outcome !== 'ALLOW';

            if (hasAnomaly) {
              setActiveAlert({
                id: newestLog.id,
                userName: newestLog.user.name,
                userRole: newestLog.user.role,
                deviceId: newestLog.context.deviceId,
                city: newestLog.context.city,
                isKnownDevice: newestLog.context.isKnownDevice,
                isKnownLocation: newestLog.context.isKnownLocation,
                isOddHours: newestLog.context.isOddHours,
                riskScore: newestLog.risk.totalScore,
                outcome: newestLog.decision.outcome,
                actionName: newestLog.context.actionName,
                endpoint: newestLog.context.endpoint,
                timestamp: newestLog.timestamp,
                secondsLeft: 15
              });
            }
          }
          lastSeenLogIdRef.current = newestLog.id;
        }
      }

      // Metrics
      const metricsRes = await fetch('/api/admin/metrics');
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }

      // Policies
      const policiesRes = await fetch('/api/admin/policies');
      if (policiesRes.ok) {
        const policiesData = await policiesRes.json();
        setPolicies(policiesData);
      }

      // Devices
      const devicesRes = await fetch('/api/admin/devices');
      if (devicesRes.ok) {
        const devicesData = await devicesRes.json();
        setDevices(devicesData);
      }
    } catch (e) {
      console.error('Error fetching ZTCA admin data:', e);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchData();

    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 1500); // 1.5s DB polling for live stream
    // Also listen for BroadcastChannel updates from simulation widget to update KPIs immediately
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('ztca-updates');
      bc.onmessage = ev => {
        try {
          const msg = ev.data;
          if (msg && msg.type === 'metrics' && msg.metrics) {
            setMetrics(msg.metrics);
          }
        } catch (e) {
          // ignore malformed messages
        }
      };
    } catch (e) {
      bc = null;
    }
    return () => clearInterval(interval);
  }, [isAdmin, selectedOutcomeFilter, searchQuery, autoRefresh]);

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-8 my-12">
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center space-y-4 shadow-xl">
          <div className="inline-flex p-4 bg-red-100 rounded-2xl text-red-600">
            <Lock className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-black text-red-950">ZTCA Security Enforcement</h2>
          <p className="text-sm text-red-800 max-w-lg mx-auto leading-relaxed">
            Access to the Zero Trust Continuous Authorization (ZTCA) Admin Security Panel is restricted strictly to Super Users (`admin@transitops.com`).
          </p>
          <div className="p-4 bg-white/80 rounded-xl border border-red-200 text-left max-w-md mx-auto text-xs space-y-1 font-mono">
            <div className="font-bold text-red-900">Attempted User: {currentUser?.name || 'Guest'}</div>
            <div className="text-neutral-600">User Role: {currentUser?.role || 'None'}</div>
            <div className="text-red-600 font-semibold">ZTCA Policy Triggered: pol_1_admin_protection (BLOCK)</div>
          </div>
        </div>
      </div>
    );
  }

  // Policy toggle handler
  const handleTogglePolicy = async (policy: PolicyRule) => {
    try {
      await fetch(`/api/admin/policies/${policy.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !policy.enabled })
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  // Policy risk slider update handler
  const handleUpdatePolicyRisk = async (id: string, maxAllowedRisk: number) => {
    try {
      await fetch(`/api/admin/policies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxAllowedRisk })
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  // Policy action update handler
  const handleUpdatePolicyAction = async (id: string, actionIfViolated: 'BLOCK' | 'STEP_UP' | 'READ_ONLY') => {
    try {
      await fetch(`/api/admin/policies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionIfViolated })
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  // Create policy handler
  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPolicyName.trim()) return;

    try {
      await fetch('/api/admin/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPolicyName,
          description: newPolicyDesc || 'Custom admin ZTCA policy rule.',
          enabled: true,
          targetRole: 'ALL',
          targetEndpointPattern: '.*',
          maxAllowedRisk: newPolicyRisk,
          actionIfViolated: newPolicyAction
        })
      });
      setIsNewPolicyOpen(false);
      setNewPolicyName('');
      setNewPolicyDesc('');
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  // Device status update handler
  const handleUpdateDeviceStatus = async (id: string, status: 'TRUSTED' | 'REVOKED' | 'FLAGGED') => {
    try {
      await fetch(`/api/admin/devices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  // Chart data preparation
  const outcomeChartData = [
    { name: 'ALLOW', value: metrics?.allowedCount || 0, color: '#10b981' },
    { name: 'STEP_UP', value: metrics?.stepUpCount || 0, color: '#f59e0b' },
    { name: 'READ_ONLY', value: metrics?.readOnlyCount || 0, color: '#6366f1' },
    { name: 'BLOCK', value: metrics?.blockedCount || 0, color: '#ef4444' }
  ];

  const riskLevelChartData = [
    { name: 'Low (0-29)', count: metrics?.riskLevelDistribution?.LOW || 0, fill: '#10b981' },
    { name: 'Medium (30-54)', count: metrics?.riskLevelDistribution?.MEDIUM || 0, fill: '#3b82f6' },
    { name: 'High (55-74)', count: metrics?.riskLevelDistribution?.HIGH || 0, fill: '#f59e0b' },
    { name: 'Critical (75+)', count: metrics?.riskLevelDistribution?.CRITICAL || 0, fill: '#ef4444' }
  ];

  const getDecisionBadge = (outcome: string) => {
    switch (outcome) {
      case 'ALLOW':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-[10px] rounded-md">ALLOW</span>;
      case 'STEP_UP':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 font-extrabold text-[10px] rounded-md">STEP-UP</span>;
      case 'READ_ONLY':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-100 text-indigo-800 border border-indigo-300 font-extrabold text-[10px] rounded-md">READ-ONLY</span>;
      case 'BLOCK':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-100 text-red-800 border border-red-300 font-extrabold text-[10px] rounded-md">BLOCK</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Live Admin Alert Toast Banner (Displays for 15s when unknown user/device/location/anomaly triggers) */}
      {activeAlert && (
        <div className="bg-slate-950 border-2 border-amber-500/80 rounded-2xl p-4 text-white shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/40 shrink-0 mt-0.5">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-amber-500 text-slate-950 font-black text-[10px] rounded uppercase tracking-wider">
                    ZTCA Security Alert ({activeAlert.secondsLeft}s)
                  </span>
                  <span className="text-xs font-bold text-slate-200">
                    {activeAlert.userName} ({activeAlert.userRole})
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(activeAlert.timestamp).toLocaleTimeString()}
                  </span>
                  {getDecisionBadge(activeAlert.outcome)}
                </div>

                <p className="text-xs text-slate-300 font-medium">
                  Attempted <span className="text-cyan-300 font-mono font-bold">{activeAlert.actionName}</span> on endpoint <code className="text-slate-400 bg-slate-900 px-1 py-0.5 rounded text-[11px]">{activeAlert.endpoint}</code>
                </p>

                <div className="flex items-center gap-3 pt-1 text-[11px] flex-wrap text-slate-400 font-mono">
                  <span className={`flex items-center gap-1 ${!activeAlert.isKnownDevice ? 'text-amber-300 font-bold' : ''}`}>
                    <Smartphone className="w-3.5 h-3.5" />
                    Device: {activeAlert.deviceId} {!activeAlert.isKnownDevice ? '(Unknown +25)' : '(Trusted)'}
                  </span>
                  <span className={`flex items-center gap-1 ${!activeAlert.isKnownLocation ? 'text-amber-300 font-bold' : ''}`}>
                    <MapPin className="w-3.5 h-3.5" />
                    Location: {activeAlert.city} {!activeAlert.isKnownLocation ? '(Anomaly +20)' : '(Verified)'}
                  </span>
                  {activeAlert.isOddHours && (
                    <span className="flex items-center gap-1 text-amber-300 font-bold">
                      <Clock className="w-3.5 h-3.5" />
                      Off-Hours Night Access (+15)
                    </span>
                  )}
                  <span className="text-cyan-400 font-bold">
                    Risk Score: {activeAlert.riskScore}/100
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveAlert(null)}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors shrink-0"
              title="Dismiss Alert"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Countdown Progress Bar */}
          <div className="w-full bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-amber-400 h-full transition-all duration-1000 ease-linear"
              style={{ width: `${(activeAlert.secondsLeft / 15) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded text-[10px] font-bold uppercase tracking-wider">
                NIST 800-207 Policy Decision Point (PDP)
              </span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live Feed Active
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-cyan-400" />
              ZTCA Admin Security Panel
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Real-time Zero Trust Continuous Authorization Engine middleware. Evaluates user identity, device fingerprints, geo-location anomalies, off-hour windows, and route sensitivity on every request.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-2 ${
                autoRefresh
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80 hover:bg-emerald-900'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
              <span>{autoRefresh ? 'Polling DB (1.5s)' : 'Polling Paused'}</span>
            </button>
          </div>
        </div>

        {/* Overview KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] font-bold uppercase text-slate-400">Total Requests</div>
            <div className="text-xl font-black text-white font-mono mt-0.5">{metrics?.totalRequests || 0}</div>
          </div>
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] font-bold uppercase text-emerald-400">Allowed</div>
            <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">{metrics?.allowedCount || 0}</div>
          </div>
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] font-bold uppercase text-amber-400">Step-Up MFA</div>
            <div className="text-xl font-black text-amber-400 font-mono mt-0.5">{metrics?.stepUpCount || 0}</div>
          </div>
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] font-bold uppercase text-indigo-400">Read-Only</div>
            <div className="text-xl font-black text-indigo-400 font-mono mt-0.5">{metrics?.readOnlyCount || 0}</div>
          </div>
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] font-bold uppercase text-red-400">Blocked</div>
            <div className="text-xl font-black text-red-400 font-mono mt-0.5">{metrics?.blockedCount || 0}</div>
          </div>
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] font-bold uppercase text-cyan-400">Avg Context Risk</div>
            <div className="text-xl font-black text-cyan-400 font-mono mt-0.5">{metrics?.avgRiskScore || 0}/100</div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-neutral-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('stream')}
          className={`pb-3 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeSubTab === 'stream'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Live Request Stream</span>
          <span className="ml-1 px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] rounded-full">
            {auditLogs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('matrix')}
          className={`pb-3 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeSubTab === 'matrix'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Resource Access Matrix</span>
          <span className="ml-1 px-1.5 py-0.2 bg-cyan-100 text-cyan-800 text-[10px] rounded-full font-bold">
            {RESOURCE_ACCESS_MATRIX.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`pb-3 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeSubTab === 'analytics'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Decision Analytics</span>
        </button>

        <button
          onClick={() => setActiveSubTab('policies')}
          className={`pb-3 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeSubTab === 'policies'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Policy Configurator</span>
          <span className="ml-1 px-1.5 py-0.2 bg-neutral-100 text-neutral-700 text-[10px] rounded-full">
            {policies.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('devices')}
          className={`pb-3 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeSubTab === 'devices'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Device Registry</span>
          <span className="ml-1 px-1.5 py-0.2 bg-neutral-100 text-neutral-700 text-[10px] rounded-full">
            {devices.length}
          </span>
        </button>
      </div>

      {/* SUB-TAB 1: LIVE REQUEST STREAM */}
      {activeSubTab === 'stream' && (
        <div className="space-y-4">
          {/* Stream Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-neutral-600 flex items-center gap-1.5 mr-2">
                <Filter className="w-3.5 h-3.5 text-emerald-600" />
                Outcome Filter:
              </span>
              {['ALL', 'ALLOW', 'STEP_UP', 'READ_ONLY', 'BLOCK'].map(out => (
                <button
                  key={out}
                  onClick={() => setSelectedOutcomeFilter(out)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    selectedOutcomeFilter === out
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {out}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search user, action, city, device..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
              />
            </div>
          </div>

          {/* Audit Logs Stream Table */}
          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-extrabold text-neutral-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">User & Role</th>
                    <th className="py-3 px-4">UI Action / Route</th>
                    <th className="py-3 px-4">Primary Checkups</th>
                    <th className="py-3 px-4 text-center">Risk Score</th>
                    <th className="py-3 px-4 text-center">Decision</th>
                    <th className="py-3 px-4 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-xs">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-neutral-400">
                        No ZTCA audit records matched the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map(log => {
                      const timeStr = new Date(log.timestamp).toLocaleTimeString();
                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-neutral-50/80 transition-colors cursor-pointer group"
                          onClick={() => setSelectedLog(log)}
                        >
                          <td className="py-3 px-4 font-mono text-[11px] text-neutral-500 whitespace-nowrap">
                            {timeStr}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-neutral-900">{log.user.name}</div>
                            <div className="text-[10px] text-neutral-400 font-mono">{log.user.role} ({log.user.email})</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-neutral-800">{log.context.actionName}</div>
                            <div className="text-[10px] font-mono text-neutral-400">{log.context.method} {log.context.endpoint}</div>
                            {log.context.simulation && (
                              <div className="mt-1 text-[10px] inline-flex items-center gap-1 text-slate-600">
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 rounded font-bold">Simulated</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 space-y-0.5">
                            <div className="flex items-center gap-1.5 text-[11px]">
                              {log.context.isKnownDevice ? (
                                <span className="text-emerald-600 font-medium flex items-center gap-0.5">📱 Known Device</span>
                              ) : (
                                <span className="text-red-600 font-bold flex items-center gap-0.5">⚠️ New Device</span>
                              )}
                              <span className="text-neutral-300">•</span>
                              {log.context.isKnownLocation ? (
                                <span className="text-emerald-600 font-medium">{log.context.city}</span>
                              ) : (
                                <span className="text-amber-600 font-bold">📍 {log.context.city} (Anomaly)</span>
                              )}
                            </div>
                            {log.context.isOddHours && (
                              <div className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>Off-Hours Night Request</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`font-mono font-black text-xs px-2 py-0.5 rounded ${
                              log.risk.totalScore >= 75
                                ? 'bg-red-100 text-red-800'
                                : log.risk.totalScore >= 45
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {log.risk.totalScore}/100
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {getDecisionBadge(log.decision.outcome)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setSelectedLog(log);
                              }}
                              className="p-1.5 bg-neutral-100 hover:bg-emerald-600 hover:text-white rounded-lg text-neutral-600 transition-colors"
                              title="Inspect full ZTCA Context & Decision"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB: RESOURCE ACCESS MATRIX */}
      {activeSubTab === 'matrix' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                NIST 800-207 RBAC + ZTCA Policy Matrix
              </span>
              <h3 className="text-base font-black text-neutral-900 mt-1">Resource Permissions & Threat Conditions</h3>
              <p className="text-xs text-neutral-500 max-w-3xl mt-0.5">
                Displays baseline Role-Based Access Control (RBAC) permissions alongside Zero Trust Continuous Authorization (ZTCA) risk-based evaluation rules for every API endpoint.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                🟢 Allowed
              </span>
              <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                ⚡ Step-Up MFA
              </span>
              <span className="flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                👁️ Read-Only
              </span>
              <span className="flex items-center gap-1 text-red-700 bg-red-50 px-2.5 py-1 rounded-md border border-red-200">
                🚫 Blocked
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-900 text-white border-b border-neutral-800 text-[11px] font-extrabold uppercase tracking-wider">
                    <th className="py-3.5 px-4">System Resource & Endpoint</th>
                    <th className="py-3.5 px-3 text-center">Driver</th>
                    <th className="py-3.5 px-3 text-center">Fleet Manager</th>
                    <th className="py-3.5 px-3 text-center">Tech</th>
                    <th className="py-3.5 px-3 text-center">Admin</th>
                    <th className="py-3.5 px-4">ZTCA Dynamic Security Rules & Constraints</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {RESOURCE_ACCESS_MATRIX.map((item, idx) => {
                    const renderAccessBadge = (status: 'ALLOWED' | 'STEP_UP' | 'READ_ONLY' | 'BLOCKED') => {
                      switch (status) {
                        case 'ALLOWED':
                          return <span className="inline-block w-full py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-[10px] rounded text-center">ALLOWED</span>;
                        case 'STEP_UP':
                          return <span className="inline-block w-full py-1 bg-amber-100 text-amber-800 border border-amber-300 font-extrabold text-[10px] rounded text-center">STEP-UP</span>;
                        case 'READ_ONLY':
                          return <span className="inline-block w-full py-1 bg-indigo-100 text-indigo-800 border border-indigo-300 font-extrabold text-[10px] rounded text-center">READ-ONLY</span>;
                        case 'BLOCKED':
                          return <span className="inline-block w-full py-1 bg-red-100 text-red-800 border border-red-300 font-extrabold text-[10px] rounded text-center">BLOCKED</span>;
                      }
                    };

                    return (
                      <tr key={idx} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-neutral-900 text-xs">{item.resource}</div>
                          <div className="text-[10px] text-emerald-700 font-mono font-bold mt-0.5">{item.action}</div>
                          <div className="text-[10px] text-neutral-400 font-mono">{item.category} • <span className="text-neutral-600">{item.endpoint}</span></div>
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono">{renderAccessBadge(item.driverAccess)}</td>
                        <td className="py-3.5 px-3 text-center font-mono">{renderAccessBadge(item.managerAccess)}</td>
                        <td className="py-3.5 px-3 text-center font-mono">{renderAccessBadge(item.techAccess)}</td>
                        <td className="py-3.5 px-3 text-center font-mono">{renderAccessBadge(item.adminAccess)}</td>
                        <td className="py-3.5 px-4 text-neutral-700 text-[11px] leading-relaxed font-sans">
                          <div className="p-2 bg-neutral-50 border border-neutral-200 rounded-lg">
                            <span className="font-bold text-neutral-900">Condition: </span>
                            {item.ztcaCondition}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: DECISION ANALYTICS */}
      {activeSubTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Decision Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-600" />
              ZTCA Authorization Outcomes
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={outcomeChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {outcomeChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Context Risk Levels */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider flex items-center gap-2">
              <Gauge className="w-4 h-4 text-cyan-600" />
              Contextual Threat Risk Distribution
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskLevelChartData}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={11} />
                  <YAxis stroke="#888888" fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {riskLevelChartData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Primary Checkup Breakdown Cards */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-amber-50/80 border border-amber-200 p-5 rounded-2xl space-y-1">
              <div className="text-xs font-bold text-amber-800 uppercase flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-amber-600" />
                Unrecognized Devices
              </div>
              <div className="text-2xl font-black text-amber-950 font-mono">
                {metrics?.checkups?.newDevicesCount || 0} Attempts
              </div>
              <p className="text-[11px] text-amber-700">
                Requests originating from device fingerprints not in trusted registry.
              </p>
            </div>

            <div className="bg-red-50/80 border border-red-200 p-5 rounded-2xl space-y-1">
              <div className="text-xs font-bold text-red-800 uppercase flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-red-600" />
                Geographic Anomalies
              </div>
              <div className="text-2xl font-black text-red-950 font-mono">
                {metrics?.checkups?.locationAnomaliesCount || 0} Flagged
              </div>
              <p className="text-[11px] text-red-700">
                Requests from unexpected cities or foreign countries.
              </p>
            </div>

            <div className="bg-indigo-50/80 border border-indigo-200 p-5 rounded-2xl space-y-1">
              <div className="text-xs font-bold text-indigo-800 uppercase flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                Off-Hours Access
              </div>
              <div className="text-2xl font-black text-indigo-950 font-mono">
                {metrics?.checkups?.oddHourRequestsCount || 0} Night Logs
              </div>
              <p className="text-[11px] text-indigo-700">
                Operations requested between 11:00 PM and 05:00 AM.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: POLICY CONFIGURATOR */}
      {activeSubTab === 'policies' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-neutral-900">ZTCA Continuous Policy Sets</h3>
              <p className="text-xs text-neutral-500">
                Configure rule sets evaluated on every request by the Policy Decision Point (PDP).
              </p>
            </div>

            <button
              onClick={() => setIsNewPolicyOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom Policy</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {policies.map(p => (
              <div
                key={p.id}
                className={`p-5 rounded-2xl border transition-all space-y-4 bg-white ${
                  p.enabled ? 'border-neutral-300 shadow-sm' : 'border-neutral-200 opacity-60 bg-neutral-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">
                      ID: {p.id}
                    </span>
                    <h4 className="text-sm font-bold text-neutral-900 mt-0.5">{p.name}</h4>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={p.enabled}
                      onChange={() => handleTogglePolicy(p)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <p className="text-xs text-neutral-600 leading-relaxed">{p.description}</p>

                <div className="space-y-3 pt-2 border-t border-neutral-100">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-neutral-700">
                      <span>Max Allowed Context Risk:</span>
                      <span className="font-mono text-emerald-700">{p.maxAllowedRisk}/100</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={90}
                      value={p.maxAllowedRisk}
                      onChange={e => handleUpdatePolicyRisk(p.id, parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-neutral-700">Action If Violated:</span>
                    <select
                      value={p.actionIfViolated}
                      onChange={e => handleUpdatePolicyAction(p.id, e.target.value as any)}
                      className="bg-neutral-50 border border-neutral-300 text-xs font-bold rounded-lg px-2.5 py-1 text-neutral-800"
                    >
                      <option value="BLOCK">BLOCK Access</option>
                      <option value="STEP_UP">Require STEP-UP MFA</option>
                      <option value="READ_ONLY">Downgrade READ-ONLY</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: DEVICE REGISTRY */}
      {activeSubTab === 'devices' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-neutral-900">Registered Trusted Devices</h3>
              <p className="text-xs text-neutral-500">
                Manage recognized hardware device fingerprints in the ZTCA database.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 font-extrabold text-neutral-500 uppercase">
                  <th className="py-3 px-4">Device Name & Browser</th>
                  <th className="py-3 px-4">Fingerprint Hash</th>
                  <th className="py-3 px-4">Last Active</th>
                  <th className="py-3 px-4 text-center">Trust Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {devices.map(dev => (
                  <tr key={dev.id} className="hover:bg-neutral-50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-neutral-900">{dev.deviceName}</div>
                      <div className="text-[10px] text-neutral-400 font-mono">{dev.browser} on {dev.os}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-neutral-600">
                      {dev.fingerprint}
                    </td>
                    <td className="py-3 px-4 text-neutral-500 font-mono text-[11px]">
                      {new Date(dev.lastUsed).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${
                        dev.status === 'TRUSTED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : dev.status === 'FLAGGED'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-red-100 text-red-800 border border-red-300'
                      }`}>
                        {dev.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      {dev.status !== 'TRUSTED' && (
                        <button
                          onClick={() => handleUpdateDeviceStatus(dev.id, 'TRUSTED')}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] rounded border border-emerald-200"
                        >
                          Trust Device
                        </button>
                      )}
                      {dev.status !== 'REVOKED' && (
                        <button
                          onClick={() => handleUpdateDeviceStatus(dev.id, 'REVOKED')}
                          className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[10px] rounded border border-red-200"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INSPECTION DRAWER MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 max-w-xl w-full h-full max-h-[90vh] flex flex-col overflow-hidden relative">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest">
                  ZTCA Request Inspector • {selectedLog.id}
                </span>
                <h3 className="text-base font-black mt-0.5">{selectedLog.context.actionName}</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Decision Result Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold uppercase text-neutral-500 text-[10px]">Policy Decision Point Outcome</span>
                  {getDecisionBadge(selectedLog.decision.outcome)}
                </div>
                <div className="text-sm font-bold text-neutral-900">{selectedLog.decision.reason}</div>
                  {selectedLog.context.simulation && (
                    <div className="text-[11px] text-amber-600 font-bold mt-1">This decision was produced by a simulated context run.</div>
                  )}
                <div className="text-[11px] text-neutral-500 font-mono">
                  Timestamp: {new Date(selectedLog.timestamp).toLocaleString()}
                </div>
              </div>

              {/* Primary Checkups Cards */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-neutral-900 uppercase text-[10px] tracking-wider text-neutral-500">
                  Primary Checkup Inspections
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
                    <div className="text-[10px] text-neutral-400 font-bold uppercase flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                      Device Fingerprint
                    </div>
                    <div className="font-mono font-bold text-neutral-800 text-[11px]">
                      {selectedLog.context.deviceId}
                    </div>
                    <div className="text-[10px] text-neutral-500">
                      {selectedLog.context.isKnownDevice ? '🟢 Registered Trusted Device' : '🔴 Unrecognized New Device (+25 Risk)'}
                    </div>
                  </div>

                  <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
                    <div className="text-[10px] text-neutral-400 font-bold uppercase flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-cyan-600" />
                      Geo Location
                    </div>
                    <div className="font-bold text-neutral-800 text-[11px]">
                      {selectedLog.context.city}, {selectedLog.context.country}
                    </div>
                    <div className="text-[10px] text-neutral-500">
                      {selectedLog.context.isKnownLocation ? '🟢 Registered Office Zone' : '📍 Geographic Anomaly (+20 Risk)'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Risk Score Factor Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-neutral-900 uppercase text-[10px] tracking-wider text-neutral-500">
                    Weighted Continuous Risk Factors
                  </h4>
                  <span className="font-mono font-black text-xs text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                    Total: {selectedLog.risk.totalScore}/100 ({selectedLog.risk.level})
                  </span>
                </div>

                <div className="space-y-2">
                  {selectedLog.risk.factors.map((f, i) => (
                    <div key={i} className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-start gap-3">
                      <span className={`font-mono font-black text-xs shrink-0 px-2 py-0.5 rounded ${
                        f.score > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {f.score > 0 ? `+${f.score}` : f.score}
                      </span>
                      <div>
                        <div className="font-bold text-neutral-900">{f.name}</div>
                        <div className="text-[11px] text-neutral-600 mt-0.5 leading-tight">{f.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW POLICY MODAL */}
      {isNewPolicyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-neutral-900">Add Custom ZTCA Policy Rule</h3>
            <form onSubmit={handleCreatePolicy} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">Policy Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Strict Nighttime Dispatch Guard"
                  value={newPolicyName}
                  onChange={e => setNewPolicyName(e.target.value)}
                  className="w-full p-2 bg-neutral-50 border border-neutral-300 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Explain security rationale for this policy rule..."
                  value={newPolicyDesc}
                  onChange={e => setNewPolicyDesc(e.target.value)}
                  className="w-full p-2 bg-neutral-50 border border-neutral-300 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">
                  Max Allowed Risk Score ({newPolicyRisk})
                </label>
                <input
                  type="range"
                  min={10}
                  max={90}
                  value={newPolicyRisk}
                  onChange={e => setNewPolicyRisk(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-600"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Action If Violated</label>
                <select
                  value={newPolicyAction}
                  onChange={e => setNewPolicyAction(e.target.value as any)}
                  className="w-full p-2 bg-neutral-50 border border-neutral-300 rounded-lg font-bold"
                >
                  <option value="BLOCK">BLOCK Request (Forbidden 403)</option>
                  <option value="STEP_UP">Require STEP-UP MFA Verification</option>
                  <option value="READ_ONLY">Downgrade Session to READ-ONLY</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewPolicyOpen(false)}
                  className="px-4 py-2 font-semibold text-neutral-600 hover:bg-neutral-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700"
                >
                  Create Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
