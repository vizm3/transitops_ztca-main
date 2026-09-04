import React, { useState } from 'react';
import {
  Plus,
  Wrench,
  CheckCircle,
  Clock,
  DollarSign,
  AlertCircle,
  Truck,
  Calendar
} from 'lucide-react';
import { Maintenance, Vehicle } from '../types';

interface MaintenanceProps {
  maintenance: Maintenance[];
  vehicles: Vehicle[];
  onAddMaintenance: (maint: Omit<Maintenance, 'id'>) => Promise<boolean>;
  onCloseMaintenance: (id: string, cost: number, endDate: string) => Promise<boolean>;
  currentUserRole: string;
}

export default function MaintenanceLogs({
  maintenance,
  vehicles,
  onAddMaintenance,
  onCloseMaintenance,
  currentUserRole
}: MaintenanceProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formError, setFormError] = useState('');

  // Closing maintenance states
  const [closingMaint, setClosingMaint] = useState<Maintenance | null>(null);
  const [closeCost, setCloseCost] = useState('');
  const [closeEndDate, setCloseEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [closeFormError, setCloseFormError] = useState('');

  // Dropdown options - vehicles that can be serviced (must not be On Trip, but Available or In Shop already)
  const serviceableVehicles = vehicles.filter(v => v.status !== 'On Trip' && v.status !== 'Retired');

  const getVehicleInfo = (id: string) => {
    const v = vehicles.find(item => item.id === id);
    return v ? `${v.name} (${v.registrationNumber})` : 'Unknown Asset';
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedVehicleId || !description || !cost || !startDate) {
      setFormError('All fields are required.');
      return;
    }

    const costNum = Number(cost);
    if (isNaN(costNum) || costNum < 0) {
      setFormError('Estimated cost must be a non-negative number.');
      return;
    }

    const success = await onAddMaintenance({
      vehicleId: selectedVehicleId,
      description: description.trim(),
      cost: costNum,
      startDate,
      status: 'Active'
    });

    if (success) {
      setSelectedVehicleId('');
      setDescription('');
      setCost('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setIsAddOpen(false);
    } else {
      setFormError('Failed to initiate maintenance workshop log.');
    }
  };

  const handleCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCloseFormError('');

    if (!closingMaint) return;

    const actualCostNum = Number(closeCost);
    if (isNaN(actualCostNum) || actualCostNum < 0) {
      setCloseFormError('Actual service cost must be a valid positive amount.');
      return;
    }

    const start = new Date(closingMaint.startDate);
    const end = new Date(closeEndDate);
    if (end < start) {
      setCloseFormError(`End date cannot be earlier than start date (${closingMaint.startDate}).`);
      return;
    }

    const success = await onCloseMaintenance(closingMaint.id, actualCostNum, closeEndDate);

    if (success) {
      setClosingMaint(null);
      setCloseCost('');
      setCloseEndDate(new Date().toISOString().split('T')[0]);
    } else {
      setCloseFormError('Failed to close maintenance logs.');
    }
  };

  const isManager = currentUserRole === 'Fleet Manager';

  return (
    <div id="maintenance-tab-panel" className="space-y-6">
      {/* Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-800">Fleet Workshop & Maintenance Log</h2>
          <p className="text-sm text-neutral-500">Track and schedule scheduled services, diagnostics, and repairs</p>
        </div>
        {isManager && (
          <button
            id="register-maintenance-btn"
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" /> Send Vehicle to Shop
          </button>
        )}
      </div>

      {/* Maintenance Grid split (Active Workshop vs Historical Closed) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Workshop */}
        <div className="bg-white border border-neutral-200 rounded-xl shadow-sm flex flex-col">
          <div className="p-4 border-b border-neutral-100 bg-amber-50/50 flex items-center justify-between">
            <h3 className="font-bold text-neutral-800 flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" /> Active Maintenance Shop (In Shop)
            </h3>
            <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 rounded-full font-mono">
              {maintenance.filter(m => m.status === 'Active').length} Units
            </span>
          </div>
          <div className="p-4 flex-1 space-y-4 max-h-[500px] overflow-y-auto">
            {maintenance.filter(m => m.status === 'Active').length === 0 ? (
              <div className="text-center py-12 text-neutral-400 text-sm">
                <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                No vehicles are currently in the shop!
              </div>
            ) : (
              maintenance
                .filter(m => m.status === 'Active')
                .map(maint => (
                  <div
                    key={maint.id}
                    id={`maint-active-card-${maint.id}`}
                    className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-neutral-800 text-sm flex items-center gap-1.5">
                          <Truck className="h-4 w-4 text-neutral-500" /> {getVehicleInfo(maint.vehicleId)}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-800 font-bold rounded">Active</span>
                      </div>
                      <p className="text-xs text-neutral-600 font-semibold leading-relaxed">
                        {maint.description}
                      </p>
                      <div className="flex items-center gap-4 text-[11px] text-neutral-400 font-mono">
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Start: {maint.startDate}</span>
                        <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Est: ${maint.cost.toLocaleString()}</span>
                      </div>
                    </div>
                    {isManager && (
                      <div className="flex justify-end pt-2 border-t border-neutral-100">
                        <button
                          id={`close-maint-btn-${maint.id}`}
                          onClick={() => {
                            setClosingMaint(maint);
                            setCloseCost(String(maint.cost));
                          }}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow-sm transition-all flex items-center gap-1"
                        >
                          <CheckCircle className="h-3 w-3" /> Mark Resolved
                        </button>
                      </div>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Closed / Resolved Service Log */}
        <div className="bg-white border border-neutral-200 rounded-xl shadow-sm flex flex-col">
          <div className="p-4 border-b border-neutral-100 bg-neutral-50 flex items-center justify-between">
            <h3 className="font-bold text-neutral-800 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" /> Historical Service Registry (Closed)
            </h3>
            <span className="px-2 py-0.5 text-xs font-bold bg-neutral-200 text-neutral-700 rounded-full font-mono">
              {maintenance.filter(m => m.status === 'Closed').length} Logged
            </span>
          </div>
          <div className="p-4 flex-1 space-y-3 max-h-[500px] overflow-y-auto">
            {maintenance.filter(m => m.status === 'Closed').length === 0 ? (
              <div className="text-center py-12 text-neutral-400 text-sm">
                No archived maintenance history yet.
              </div>
            ) : (
              maintenance
                .filter(m => m.status === 'Closed')
                .map(maint => (
                  <div
                    key={maint.id}
                    className="p-3 bg-neutral-50/50 rounded-lg border border-neutral-200 text-xs"
                  >
                    <div className="flex justify-between font-bold text-neutral-700">
                      <span>{getVehicleInfo(maint.vehicleId)}</span>
                      <span className="text-emerald-600 font-mono">${maint.cost.toLocaleString()}</span>
                    </div>
                    <p className="text-neutral-500 mt-1">{maint.description}</p>
                    <div className="flex gap-4 text-[10px] text-neutral-400 font-mono mt-2 pt-2 border-t border-neutral-100/60">
                      <span>In Shop: {maint.startDate}</span>
                      <span>Resolved: {maint.endDate}</span>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* Add Workshop maintenance Form Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xl max-w-sm w-full overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-neutral-100 bg-neutral-50 flex justify-between items-center">
              <h3 className="font-bold text-neutral-800 flex items-center gap-1.5">
                <Wrench className="h-5 w-5 text-emerald-600" /> Send Vehicle to Workshop
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg font-semibold animate-shake">
                  {formError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-600">Select Fleet Vehicle</label>
                <select
                  id="maint-form-vehicle-select"
                  required
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Choose Non-Dispatched Asset --</option>
                  {serviceableVehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.registrationNumber} - {v.name} ({v.status})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-neutral-400 italic">
                  * Placing in maintenance locks the vehicle and sets status to "In Shop".
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-600">Diagnostics / Service Reason</label>
                <textarea
                  id="maint-form-description"
                  required
                  placeholder="Describe service needed (e.g., Oil Change, Brake pad replacement)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">Est. Service Cost ($)</label>
                  <input
                    id="maint-form-cost"
                    type="number"
                    required
                    placeholder="Estimated cost"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">Start Date</label>
                  <input
                    id="maint-form-start-date"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 px-4 py-2 border border-neutral-200 hover:bg-neutral-100 text-neutral-700 rounded-lg text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  id="submit-register-maint-btn"
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
                >
                  Authorize Repairs
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Maintenance Modal */}
      {closingMaint && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xl max-w-sm w-full overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-neutral-100 bg-neutral-50 flex justify-between items-center">
              <h3 className="font-bold text-neutral-800 flex items-center gap-1.5">
                <CheckCircle className="h-5 w-5 text-emerald-600" /> Resolve & Close Service Log
              </h3>
              <button
                onClick={() => setClosingMaint(null)}
                className="text-neutral-400 hover:text-neutral-600 font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCloseSubmit} className="p-5 space-y-4">
              {closeFormError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg font-semibold animate-shake">
                  {closeFormError}
                </div>
              )}

              <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 text-xs">
                <div className="font-bold text-neutral-700">Vehicle: {getVehicleInfo(closingMaint.vehicleId)}</div>
                <div className="text-neutral-500 mt-1">Service Task: {closingMaint.description}</div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-600">Actual Final Cost ($)</label>
                <input
                  id="maint-close-cost-input"
                  type="number"
                  required
                  placeholder="Actual total cost"
                  value={closeCost}
                  onChange={(e) => setCloseCost(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-600">Closure / Resolve Date</label>
                <input
                  id="maint-close-end-date-input"
                  type="date"
                  required
                  value={closeEndDate}
                  onChange={(e) => setCloseEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-neutral-400 italic mt-1">
                  * Closing maintenance restores the vehicle to "Available" status and submits a corresponding operational cost expense.
                </p>
              </div>

              <div className="flex gap-2 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setClosingMaint(null)}
                  className="flex-1 px-4 py-2 border border-neutral-200 hover:bg-neutral-100 text-neutral-700 rounded-lg text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  id="submit-close-maint-btn"
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
                >
                  Resolve and Release
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
