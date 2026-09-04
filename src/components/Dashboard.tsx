import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Truck,
  Users,
  Wrench,
  TrendingUp,
  MapPin,
  Clock
} from 'lucide-react';
import {
  Vehicle,
  Driver,
  Trip,
  Maintenance,
  Notification,
  ActivityLog
} from '../types';

interface DashboardProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  trips: Trip[];
  maintenance: Maintenance[];
  notifications: Notification[];
  activityLogs: ActivityLog[];
  onResolveNotification: (id: string) => void;
}

export default function Dashboard({
  vehicles,
  drivers,
  trips,
  maintenance,
  notifications,
  activityLogs,
  onResolveNotification
}: DashboardProps) {
  const [regionFilter, setRegionFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Filter vehicles based on search criteria
  const filteredVehicles = vehicles.filter(v => {
    if (regionFilter !== 'All' && v.region !== regionFilter) return false;
    if (typeFilter !== 'All' && v.type !== typeFilter) return false;
    if (statusFilter !== 'All' && v.status !== statusFilter) return false;
    return true;
  });

  const totalVehicles = filteredVehicles.length;
  const activeVehicles = filteredVehicles.filter(v => v.status === 'On Trip').length;
  const availableVehicles = filteredVehicles.filter(v => v.status === 'Available').length;
  const inShopVehicles = filteredVehicles.filter(v => v.status === 'In Shop').length;

  const activeTrips = trips.filter(t => t.status === 'Dispatched').length;
  const pendingTrips = trips.filter(t => t.status === 'Draft').length;
  const driversOnDuty = drivers.filter(d => d.status === 'On Trip').length;

  // Fleet Utilization = (Vehicles On Trip / Total Non-Retired Vehicles) * 100
  const activeNonRetiredVehicles = vehicles.filter(v => v.status !== 'Retired').length;
  const globalOnTripVehicles = vehicles.filter(v => v.status === 'On Trip').length;
  const utilization = activeNonRetiredVehicles > 0 
    ? Math.round((globalOnTripVehicles / activeNonRetiredVehicles) * 100) 
    : 0;

  return (
    <div id="dashboard-tab-panel" className="space-y-6">
      {/* Filters bar */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center">
          <span className="text-sm font-semibold text-neutral-600 flex items-center gap-1">
            <MapPin className="h-4 w-4 text-neutral-400" /> Filter Fleet:
          </span>
          <div>
            <select
              id="dashboard-region-filter"
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="px-3 py-1.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-neutral-50"
            >
              <option value="All">All Regions</option>
              <option value="North">North Region</option>
              <option value="South">South Region</option>
              <option value="East">East Region</option>
              <option value="West">West Region</option>
            </select>
          </div>
          <div>
            <select
              id="dashboard-type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-neutral-50"
            >
              <option value="All">All Vehicle Types</option>
              <option value="Van">Vans</option>
              <option value="Truck">Trucks</option>
              <option value="Sedan">Sedans</option>
              <option value="Reefer">Reefers</option>
            </select>
          </div>
          <div>
            <select
              id="dashboard-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-neutral-50"
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available</option>
              <option value="On Trip">On Trip</option>
              <option value="In Shop">In Shop</option>
              <option value="Retired">Retired</option>
            </select>
          </div>
        </div>
        <div className="text-xs text-neutral-400 font-mono">
          Showing {totalVehicles} of {vehicles.length} vehicles
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Vehicles */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-neutral-400 tracking-wider uppercase">Active Vehicles</span>
            <div className="text-3xl font-bold text-neutral-800">{activeVehicles}</div>
            <span className="text-xs text-neutral-500">Currently on delivery</span>
          </div>
          <div className="h-12 w-12 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
            <Truck className="h-6 w-6" />
          </div>
        </div>

        {/* Available / Fleet Size */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-neutral-400 tracking-wider uppercase">Available Fleet</span>
            <div className="text-3xl font-bold text-neutral-800">{availableVehicles}</div>
            <span className="text-xs text-neutral-500">Ready for dispatch</span>
          </div>
          <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
            <CheckCircle className="h-6 w-6" />
          </div>
        </div>

        {/* Maintenance / Shop */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-neutral-400 tracking-wider uppercase">In Shop / Maintenance</span>
            <div className="text-3xl font-bold text-neutral-800">{inShopVehicles}</div>
            <span className="text-xs text-neutral-500">Scheduled repairs</span>
          </div>
          <div className="h-12 w-12 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
            <Wrench className="h-6 w-6" />
          </div>
        </div>

        {/* Global Fleet Utilization */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm flex items-center justify-between hover:scale-[1.01] transition-all">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-neutral-400 tracking-wider uppercase">Fleet Utilization</span>
            <div className="text-3xl font-bold text-neutral-800">{utilization}%</div>
            <span className="text-xs text-neutral-500">On road vs active total</span>
          </div>
          <div className="h-12 w-12 rounded-lg bg-neutral-900 flex items-center justify-center text-neutral-100 border border-neutral-800">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Secondary Row Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm text-center">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">Drivers On Duty</span>
          <span className="text-2xl font-bold text-neutral-800 flex items-center justify-center gap-1 mt-1">
            <Users className="h-5 w-5 text-neutral-500" /> {driversOnDuty}
          </span>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm text-center">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">Active Dispatched Trips</span>
          <span className="text-2xl font-bold text-neutral-800 flex items-center justify-center gap-1 mt-1">
            <Activity className="h-5 w-5 text-emerald-500" /> {activeTrips}
          </span>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm text-center">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">Pending Draft Trips</span>
          <span className="text-2xl font-bold text-neutral-800 flex items-center justify-center gap-1 mt-1">
            <Clock className="h-5 w-5 text-blue-500" /> {pendingTrips}
          </span>
        </div>
      </div>

      {/* Alerts Panel & Activity Logs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance Alerts & Safety Alerts */}
        <div className="lg:col-span-1 bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
            <h3 className="font-bold text-amber-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" /> Compliance & Safety Alerts
            </h3>
            <span className="px-2 py-0.5 text-xs font-semibold bg-amber-200 text-amber-900 rounded-full font-mono">
              {notifications.filter(n => !n.resolved).length} Pending
            </span>
          </div>
          <div className="p-4 flex-1 overflow-y-auto max-h-[350px] space-y-3">
            {notifications.filter(n => !n.resolved).length === 0 ? (
              <div className="text-center py-8 text-neutral-400 text-sm">
                <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                All fleet and driver credentials are compliant!
              </div>
            ) : (
              notifications
                .filter(n => !n.resolved)
                .map(notif => (
                  <div
                    key={notif.id}
                    id={`notif-card-${notif.id}`}
                    className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-2 text-xs"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-neutral-700 block">
                        {notif.type}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {new Date(notif.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-neutral-600 leading-relaxed">{notif.message}</p>
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => onResolveNotification(notif.id)}
                        className="px-2 py-1 bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100 rounded text-[10px] font-semibold flex items-center gap-1 shadow-sm transition-all"
                      >
                        Dismiss Alert
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Live System Activity Logs */}
        <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-neutral-100 bg-neutral-50 flex items-center justify-between">
            <h3 className="font-bold text-neutral-800 flex items-center gap-2">
              <Activity className="h-5 w-5 text-neutral-500" /> Live Fleet Activity Feed
            </h3>
            <span className="px-2 py-0.5 text-xs font-semibold bg-neutral-200 text-neutral-700 rounded-full font-mono">
              Audit Logs
            </span>
          </div>
          <div className="p-4 flex-1 overflow-y-auto max-h-[350px] space-y-4">
            {activityLogs.length === 0 ? (
              <div className="text-center py-12 text-neutral-400 text-sm">
                No fleet activities recorded yet.
              </div>
            ) : (
              <div className="relative border-l border-neutral-200 pl-4 ml-2 space-y-5">
                {activityLogs.map((log) => (
                  <div key={log.id} className="relative text-xs">
                    {/* Timestamp bullet */}
                    <div className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-emerald-500 border border-white"></div>
                    <div className="flex justify-between text-neutral-500 mb-1 font-mono text-[10px]">
                      <span>{log.user}</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-neutral-700 font-medium leading-relaxed">
                      {log.action}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
