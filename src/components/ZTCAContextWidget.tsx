import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Smartphone,
  MapPin,
  Clock,
  Gauge,
  AlertTriangle,
  RefreshCw,
  Sliders,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { User } from '../types';

export interface SimulatedContext {
  deviceId: string;
  deviceName: string;
  deviceBrowser: string;
  deviceOS: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  isOddHours: boolean;
}

export interface ZTCAContextWidgetProps {
  context: SimulatedContext;
  onChangeContext: (newContext: SimulatedContext) => void;
  userRole: string;
}

export const DEFAULT_CONTEXT_PRESETS = {
  trusted: {
    deviceId: 'dev-macbook-pro-sf-hq',
    deviceName: 'HQ Secure Terminal (MacBook)',
    deviceBrowser: 'Chrome 124',
    deviceOS: 'macOS',
    city: 'San Francisco',
    country: 'United States',
    lat: 37.7749,
    lng: -122.4194,
    isOddHours: false
  },
  unknownDevice: {
    deviceId: 'dev-unknown-linux-rogue-007',
    deviceName: 'Unregistered Portable Linux',
    deviceBrowser: 'Firefox Nightly',
    deviceOS: 'Linux x86_64',
    city: 'San Francisco',
    country: 'United States',
    lat: 37.7749,
    lng: -122.4194,
    isOddHours: false
  },
  foreignLocation: {
    deviceId: 'dev-macbook-pro-sf-hq',
    deviceName: 'HQ Secure Terminal (MacBook)',
    deviceBrowser: 'Chrome 124',
    deviceOS: 'macOS',
    city: 'London',
    country: 'United Kingdom',
    lat: 51.5074,
    lng: -0.1278,
    isOddHours: false
  },
  oddHours: {
    deviceId: 'dev-macbook-pro-sf-hq',
    deviceName: 'HQ Secure Terminal (MacBook)',
    deviceBrowser: 'Chrome 124',
    deviceOS: 'macOS',
    city: 'San Francisco',
    country: 'United States',
    lat: 37.7749,
    lng: -122.4194,
    isOddHours: true
  },
  highRiskCombination: {
    deviceId: 'dev-unknown-linux-rogue-007',
    deviceName: 'Unregistered Portable Linux',
    deviceBrowser: 'Firefox Nightly',
    deviceOS: 'Linux x86_64',
    city: 'Moscow',
    country: 'Russia',
    lat: 55.7558,
    lng: 37.6173,
    isOddHours: true
  }
};

export default function ZTCAContextWidget({
  context,
  onChangeContext,
  userRole
}: ZTCAContextWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Dry run simulation to forecast risk score
  const runSimulationCheck = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ztca/simulation/context-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'u1',
          userName: 'Active Operator',
          userEmail: 'operator@transitops.com',
          userRole: userRole || 'Fleet Manager',
          deviceId: context.deviceId,
          deviceBrowser: context.deviceBrowser,
          deviceOS: context.deviceOS,
          lat: context.lat,
          lng: context.lng,
          city: context.city,
          country: context.country,
          isOddHours: context.isOddHours,
          endpoint: '/api/trips',
          method: 'POST',
          actionName: 'Dispatching Fleet Trip'
        })
      });
      const data = await res.json();
      setSimulationResult(data);
      // Broadcast updated metrics so Admin Panel updates KPIs immediately
      try {
        const bc = new BroadcastChannel('ztca-updates');
        bc.postMessage({ type: 'metrics', metrics: data.metrics });
        bc.close();
      } catch (e) {
        // BroadcastChannel may not be available in all environments; ignore silently
      }
    } catch (e) {
      console.error('ZTCA context dry run error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSimulationCheck();
  }, [context, userRole]);

  const riskScore = simulationResult?.risk?.totalScore ?? 0;
  const outcome = simulationResult?.decision?.outcome ?? 'ALLOW';

  const getOutcomeBadge = (out: string) => {
    switch (out) {
      case 'ALLOW':
        return <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-2 py-0.5 rounded border border-emerald-300">ALLOW</span>;
      case 'STEP_UP':
        return <span className="bg-amber-100 text-amber-800 font-extrabold text-[10px] px-2 py-0.5 rounded border border-amber-300 animate-pulse">STEP-UP MFA</span>;
      case 'READ_ONLY':
        return <span className="bg-indigo-100 text-indigo-800 font-extrabold text-[10px] px-2 py-0.5 rounded border border-indigo-300">READ-ONLY</span>;
      case 'BLOCK':
        return <span className="bg-red-100 text-red-800 font-extrabold text-[10px] px-2 py-0.5 rounded border border-red-300">BLOCK</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-slate-900 text-slate-100 border-b border-slate-800 shadow-md transition-all">
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left Section: ZTCA Middleware Status Indicator */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-md border border-emerald-500/40 font-bold tracking-wide">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>ZTCA ENGINE: ACTIVE</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-slate-300 font-mono text-[11px]">
            <span className="text-slate-400">User Role:</span>
            <span className="font-bold text-slate-100 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {userRole || 'Driver'}
            </span>
          </div>
        </div>

        {/* Center/Right Section: Live Forecast Risk Gauge & Presets */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1 rounded-lg border border-slate-700">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] text-slate-400">Context Risk:</span>
            <span className={`font-extrabold font-mono text-xs ${
              riskScore >= 75 ? 'text-red-400' : riskScore >= 45 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {riskScore}/100
            </span>
            <span className="text-slate-500 font-sans text-[10px]">→</span>
            {getOutcomeBadge(outcome)}
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded-md border border-slate-700 text-xs font-semibold transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Simulate Context</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Controls: Direct Context Toggles */}
      {isExpanded && (
        <div className="border-t border-slate-800 bg-slate-950 p-4 animate-in slide-in-from-top-1 duration-200">
          <div className="max-w-7xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                <Info className="w-4 h-4" />
                <span>ZTCA Context Collector Simulation Controls</span>
              </div>
              <span className="text-[11px] text-slate-400">
                Change context variables to test how the ZTCA Decision Engine responds to every UI action in real time.
              </span>
            </div>

            {/* Quick Presets Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-slate-400 font-bold mr-1">Quick Scenarios:</span>
              <button
                onClick={() => onChangeContext(DEFAULT_CONTEXT_PRESETS.trusted)}
                className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 rounded text-xs font-medium transition-colors"
              >
                🟢 Trusted Workstation (SF)
              </button>
              <button
                onClick={() => onChangeContext(DEFAULT_CONTEXT_PRESETS.unknownDevice)}
                className="px-2.5 py-1 bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 text-amber-300 rounded text-xs font-medium transition-colors"
              >
                📱 Unknown Device (+25 Risk)
              </button>
              <button
                onClick={() => onChangeContext(DEFAULT_CONTEXT_PRESETS.foreignLocation)}
                className="px-2.5 py-1 bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 text-amber-300 rounded text-xs font-medium transition-colors"
              >
                📍 Foreign Geo Anomaly (London +20)
              </button>
              <button
                onClick={() => onChangeContext(DEFAULT_CONTEXT_PRESETS.oddHours)}
                className="px-2.5 py-1 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 rounded text-xs font-medium transition-colors"
              >
                ⏰ Odd Hours Night Request (+15)
              </button>
              <button
                onClick={() => onChangeContext(DEFAULT_CONTEXT_PRESETS.highRiskCombination)}
                className="px-2.5 py-1 bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-300 rounded text-xs font-medium transition-colors"
              >
                🔴 High Risk Multi-Factor Threat
              </button>
            </div>

            {/* Detailed Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {/* Device Selector */}
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                    Device Fingerprint
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {context.deviceId === 'dev-macbook-pro-sf-hq' ? '🟢 Trusted (0)' : '🔴 Unknown (+25)'}
                  </span>
                </div>
                <select
                  value={context.deviceId === 'dev-macbook-pro-sf-hq' || context.deviceId === 'dev-unknown-linux-rogue-007' ? context.deviceId : 'custom'}
                  onChange={e => {
                    const devId = e.target.value;
                    if (devId === 'dev-macbook-pro-sf-hq') {
                      onChangeContext({
                        ...context,
                        deviceId: 'dev-macbook-pro-sf-hq',
                        deviceName: 'HQ Secure Terminal (MacBook)',
                        deviceBrowser: 'Chrome 124',
                        deviceOS: 'macOS'
                      });
                    } else if (devId === 'dev-unknown-linux-rogue-007') {
                      onChangeContext({
                        ...context,
                        deviceId: 'dev-unknown-linux-rogue-007',
                        deviceName: 'Unregistered Portable Linux',
                        deviceBrowser: 'Firefox Nightly',
                        deviceOS: 'Linux x86_64'
                      });
                    } else {
                      onChangeContext({
                        ...context,
                        deviceId: `dev-custom-${Date.now().toString().slice(-4)}`,
                        deviceName: 'Custom Demo Device',
                        deviceBrowser: 'Custom Browser',
                        deviceOS: 'Custom OS'
                      });
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded text-xs text-slate-100 p-2 focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="dev-macbook-pro-sf-hq">🟢 Known Device: Fleet Workstation (Trusted)</option>
                  <option value="dev-unknown-linux-rogue-007">🔴 Unknown Device: Rogue Linux Laptop</option>
                  <option value="custom">✏️ Enter Custom Device / Fingerprint</option>
                </select>

                {context.deviceId !== 'dev-macbook-pro-sf-hq' && context.deviceId !== 'dev-unknown-linux-rogue-007' && (
                  <div className="pt-1 space-y-1">
                    <input
                      type="text"
                      placeholder="e.g. dev-iphone15-safari, dev-android-field"
                      value={context.deviceId}
                      onChange={e => {
                        const val = e.target.value || 'dev-unknown-custom';
                        onChangeContext({
                          ...context,
                          deviceId: val,
                          deviceName: `Custom Device (${val})`
                        });
                      }}
                      className="w-full bg-slate-950 border border-cyan-700/60 rounded text-[11px] font-mono text-cyan-200 px-2 py-1 focus:ring-1 focus:ring-cyan-400"
                    />
                    <p className="text-[10px] text-amber-300/90 leading-tight">
                      * Custom/new device fingerprints are evaluated as unrecognized (+25 risk) unless explicitly trusted in Admin panel.
                    </p>
                  </div>
                )}
              </div>

              {/* Location Selector */}
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    Geographic Location
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {context.city === 'San Francisco' ? '🟢 Trusted HQ (0)' : context.city === 'Chicago' ? '🟢 Hub (0)' : '🔴 Anomaly (+20)'}
                  </span>
                </div>
                <select
                  value={context.city === 'San Francisco' || context.city === 'Chicago' || context.city === 'London' ? context.city : 'custom'}
                  onChange={e => {
                    const city = e.target.value;
                    if (city === 'San Francisco') {
                      onChangeContext({
                        ...context,
                        city: 'San Francisco',
                        country: 'United States',
                        lat: 37.7749,
                        lng: -122.4194
                      });
                    } else if (city === 'Chicago') {
                      onChangeContext({
                        ...context,
                        city: 'Chicago',
                        country: 'United States',
                        lat: 41.8781,
                        lng: -87.6298
                      });
                    } else if (city === 'London') {
                      onChangeContext({
                        ...context,
                        city: 'London',
                        country: 'United Kingdom',
                        lat: 51.5074,
                        lng: -0.1278
                      });
                    } else {
                      onChangeContext({
                        ...context,
                        city: 'Tokyo',
                        country: 'Japan',
                        lat: 35.6762,
                        lng: 139.6503
                      });
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded text-xs text-slate-100 p-2 focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="San Francisco">🟢 Trusted HQ: San Francisco, CA</option>
                  <option value="Chicago">🟢 Branch Hub: Chicago, IL</option>
                  <option value="London">🔴 Geo Anomaly: London, UK</option>
                  <option value="custom">✏️ Enter Custom City / Region</option>
                </select>

                {context.city !== 'San Francisco' && context.city !== 'Chicago' && context.city !== 'London' && (
                  <div className="pt-1 space-y-1">
                    <input
                      type="text"
                      placeholder="e.g. Berlin, Sydney, Singapore, Toronto"
                      value={context.city}
                      onChange={e => {
                        const val = e.target.value || 'Foreign-Region';
                        onChangeContext({
                          ...context,
                          city: val,
                          country: 'International Region'
                        });
                      }}
                      className="w-full bg-slate-950 border border-cyan-700/60 rounded text-[11px] font-mono text-cyan-200 px-2 py-1 focus:ring-1 focus:ring-cyan-400"
                    />
                    <p className="text-[10px] text-amber-300/90 leading-tight">
                      * Custom/foreign locations outside verified depots trigger +20 geo-anomaly risk score.
                    </p>
                  </div>
                )}
              </div>

              {/* Time Window Selector */}
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    Time Window
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {!context.isOddHours ? '🟢 Normal (0)' : '🔴 Off-Hours (+15)'}
                  </span>
                </div>
                <select
                  value={context.isOddHours ? 'odd' : 'normal'}
                  onChange={e => {
                    onChangeContext({
                      ...context,
                      isOddHours: e.target.value === 'odd'
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded text-xs text-slate-100 p-2 focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="normal">🟢 Standard Operational Hours (08:00 AM - 06:00 PM)</option>
                  <option value="odd">🔴 Off-Hours / Suspicious Night Window (03:15 AM)</option>
                </select>
                <div className="pt-1 text-[10px] text-slate-400">
                  {context.isOddHours
                    ? 'Night-time requests apply +15 risk points for out-of-schedule vehicle & dispatch operations.'
                    : 'Standard daytime schedule with 0 additional risk contribution.'}
                </div>
              </div>
            </div>

            {/* Active Risk Factor Breakdown Preview */}
            {simulationResult?.risk?.factors?.length > 0 && (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs space-y-1.5">
                <div className="font-bold text-slate-300 text-[11px] uppercase tracking-wider">
                  Active Context Risk Factor Contributions:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {simulationResult.risk.factors.map((f: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 bg-slate-950 p-2 rounded border border-slate-800/80">
                      <span className={`font-mono font-bold text-[11px] shrink-0 ${f.score > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {f.score > 0 ? `+${f.score}` : f.score}
                      </span>
                      <div>
                        <div className="font-semibold text-slate-200 text-[11px]">{f.name}</div>
                        <div className="text-[10px] text-slate-400 leading-tight">{f.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
