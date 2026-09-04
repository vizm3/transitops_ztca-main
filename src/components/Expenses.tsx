import React, { useState, useEffect } from 'react';
import {
  Plus,
  Fuel,
  DollarSign,
  Briefcase,
  FileText,
  Truck,
  Calendar,
  Layers,
  MapPin,
  User,
  Activity
} from 'lucide-react';
import { FuelLog, Expense, Vehicle, Driver } from '../types';

interface ExpensesProps {
  fuelLogs: FuelLog[];
  expenses: Expense[];
  vehicles: Vehicle[];
  drivers: Driver[];
  onAddFuelLog: (log: Omit<FuelLog, 'id'>) => Promise<boolean>;
  onAddExpense: (expense: Omit<Expense, 'id'>) => Promise<boolean>;
  currentUserRole: string;
  currentUser: any;
}

export default function Expenses({
  fuelLogs,
  expenses,
  vehicles,
  drivers,
  onAddFuelLog,
  onAddExpense,
  currentUserRole,
  currentUser
}: ExpensesProps) {
  const [activeSubTab, setActiveSubTab] = useState<'fuel' | 'expenses'>('expenses');

  // Find if logged-in user is a driver to auto-select
  const matchingDriver = drivers.find(
    d => d.email?.toLowerCase() === currentUser?.email?.toLowerCase() || d.name?.toLowerCase() === currentUser?.name?.toLowerCase()
  );

  // Fuel Form states
  const [isFuelOpen, setIsFuelOpen] = useState(false);
  const [fuelVehicleId, setFuelVehicleId] = useState('');
  const [fuelLiters, setFuelLiters] = useState('');
  const [fuelCost, setFuelCost] = useState('');
  const [fuelDate, setFuelDate] = useState(new Date().toISOString().split('T')[0]);
  const [fuelOdometer, setFuelOdometer] = useState('');
  const [fuelDriverId, setFuelDriverId] = useState('');
  const [fuelPurpose, setFuelPurpose] = useState('Trip Delivery');
  const [fuelError, setFuelError] = useState('');

  // Expense Form states
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [expVehicleId, setExpVehicleId] = useState('');
  const [expCategory, setExpCategory] = useState<'Fuel' | 'Maintenance' | 'Toll' | 'Insurance' | 'Permit' | 'Other'>('Toll');
  const [expCost, setExpCost] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expDescription, setExpDescription] = useState('');
  const [expCreatorRole, setExpCreatorRole] = useState<string>('');
  const [expError, setExpError] = useState('');

  // Set default values when modals open
  useEffect(() => {
    if (isFuelOpen) {
      if (matchingDriver) {
        setFuelDriverId(matchingDriver.id);
      } else {
        setFuelDriverId('');
      }
      setFuelPurpose('Trip Delivery');
    }
  }, [isFuelOpen, matchingDriver]);

  useEffect(() => {
    if (isExpenseOpen) {
      setExpCreatorRole(currentUserRole || 'Financial Analyst');
    }
  }, [isExpenseOpen, currentUserRole]);

  const getVehicleRegNumber = (id?: string) => {
    if (!id) return 'General Fleet';
    const v = vehicles.find(item => item.id === id);
    return v ? `${v.name} (${v.registrationNumber})` : 'Unknown';
  };

  const handleFuelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFuelError('');

    if (!fuelVehicleId || !fuelLiters || !fuelCost || !fuelDate || !fuelOdometer || !fuelDriverId || !fuelPurpose) {
      setFuelError('All fields including Driver and Purpose are required.');
      return;
    }

    const litersNum = Number(fuelLiters);
    const costNum = Number(fuelCost);
    const odoNum = Number(fuelOdometer);

    if (isNaN(litersNum) || litersNum <= 0) {
      setFuelError('Liters must be a positive number.');
      return;
    }
    if (isNaN(costNum) || costNum <= 0) {
      setFuelError('Cost must be a positive number.');
      return;
    }
    if (isNaN(odoNum) || odoNum < 0) {
      setFuelError('Odometer must be a valid reading.');
      return;
    }

    // Odometer check against current vehicle odo
    const selectedV = vehicles.find(v => v.id === fuelVehicleId);
    if (selectedV && odoNum < selectedV.odometer) {
      setFuelError(`Odometer reading cannot be lower than vehicle's current reading (${selectedV.odometer} km).`);
      return;
    }

    const success = await onAddFuelLog({
      vehicleId: fuelVehicleId,
      liters: litersNum,
      cost: costNum,
      date: fuelDate,
      odometer: odoNum,
      driverId: fuelDriverId,
      purpose: fuelPurpose
    });

    if (success) {
      setFuelVehicleId('');
      setFuelLiters('');
      setFuelCost('');
      setFuelDate(new Date().toISOString().split('T')[0]);
      setFuelOdometer('');
      setFuelDriverId('');
      setFuelPurpose('Trip Delivery');
      setIsFuelOpen(false);
    } else {
      setFuelError('Failed to log fuel entry.');
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpError('');

    if (!expCategory || !expCost || !expDate || !expDescription) {
      setExpError('Category, cost, date, and description are required.');
      return;
    }

    const costNum = Number(expCost);
    if (isNaN(costNum) || costNum <= 0) {
      setExpError('Cost must be a positive number.');
      return;
    }

    const success = await onAddExpense({
      vehicleId: expVehicleId || undefined,
      category: expCategory,
      cost: costNum,
      date: expDate,
      description: expDescription.trim(),
      creatorRole: expCreatorRole || currentUserRole || 'Financial Analyst'
    });

    if (success) {
      setExpVehicleId('');
      setExpCategory('Toll');
      setExpCost('');
      setExpDate(new Date().toISOString().split('T')[0]);
      setExpDescription('');
      setIsExpenseOpen(false);
    } else {
      setExpError('Failed to record expense.');
    }
  };

  const isOperatorAuthorized = currentUserRole === 'Financial Analyst' || currentUserRole === 'Fleet Manager' || currentUserRole === 'Driver';

  return (
    <div id="expense-tab-panel" className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-800">Operational Expenses & Fuel Ledger</h2>
          <p className="text-sm text-neutral-500">Record vehicle fill-ups and manage toll, permit, and maintenance logs</p>
        </div>
        {isOperatorAuthorized && (
          <div className="flex flex-wrap gap-2">
            <button
              id="log-fuel-fillup-btn"
              onClick={() => setIsFuelOpen(true)}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Fuel className="h-4 w-4" /> Log Fuel fill-up
            </button>
            {(currentUserRole === 'Financial Analyst' || currentUserRole === 'Fleet Manager') && (
              <button
                id="log-general-expense-btn"
                onClick={() => setIsExpenseOpen(true)}
                className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-100 rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <DollarSign className="h-4 w-4" /> Record Custom Expense
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sub tabs switcher */}
      <div className="flex border-b border-neutral-200">
        <button
          id="expense-sub-tab-btn-expenses"
          onClick={() => setActiveSubTab('expenses')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all -mb-[2px] ${
            activeSubTab === 'expenses'
              ? 'border-neutral-900 text-neutral-900 font-bold'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          General Ledger ({expenses.length})
        </button>
        <button
          id="expense-sub-tab-btn-fuel"
          onClick={() => setActiveSubTab('fuel')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all -mb-[2px] ${
            activeSubTab === 'fuel'
              ? 'border-neutral-900 text-neutral-900 font-bold'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          Fuel Purchases ({fuelLogs.length})
        </button>
      </div>

      {/* General Ledger list */}
      {activeSubTab === 'expenses' ? (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-neutral-50 text-neutral-500 border-b border-neutral-200 font-semibold">
                  <th className="p-4">Date</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Fulfilled By Role</th>
                  <th className="p-4">Associated Vehicle</th>
                  <th className="p-4">Description</th>
                  <th className="p-4 text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-neutral-400">
                      <Briefcase className="h-8 w-8 mx-auto mb-2 text-neutral-300" />
                      No registered expenses.
                    </td>
                  </tr>
                ) : (
                  expenses
                    .slice()
                    .reverse()
                    .map(exp => (
                      <tr key={exp.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="p-4 font-mono font-medium text-neutral-600">
                          {exp.date}
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-neutral-100 text-neutral-700 border border-neutral-200 uppercase tracking-wide">
                            {exp.category}
                          </span>
                        </td>
                        <td className="p-4 font-mono">
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {exp.creatorRole || 'Financial Analyst'}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-neutral-700">
                          {getVehicleRegNumber(exp.vehicleId)}
                        </td>
                        <td className="p-4 text-neutral-600 font-medium">
                          {exp.description}
                        </td>
                        <td className="p-4 text-right font-bold text-neutral-800 font-mono">
                          ${exp.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Fuel Purchase list with newly added Driver and Purpose columns */
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-neutral-50 text-neutral-500 border-b border-neutral-200 font-semibold">
                  <th className="p-4">Purchase Date</th>
                  <th className="p-4">Vehicle</th>
                  <th className="p-4">Filled By (Driver)</th>
                  <th className="p-4">Purpose of Fill</th>
                  <th className="p-4">Odometer</th>
                  <th className="p-4">Liters Loaded</th>
                  <th className="p-4 text-right">Total Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {fuelLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-neutral-400">
                      <Fuel className="h-8 w-8 mx-auto mb-2 text-neutral-300" />
                      No registered fuel logs.
                    </td>
                  </tr>
                ) : (
                  fuelLogs
                    .slice()
                    .reverse()
                    .map(log => {
                      const driver = drivers.find(d => d.id === log.driverId);
                      return (
                        <tr key={log.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="p-4 font-mono font-medium text-neutral-600">
                            {log.date}
                          </td>
                          <td className="p-4 font-bold text-neutral-700">
                            {getVehicleRegNumber(log.vehicleId)}
                          </td>
                          <td className="p-4 text-neutral-800 font-semibold">
                            {driver ? driver.name : log.driverId || 'General Driver'}
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-100 uppercase tracking-wide text-[10px]">
                              {log.purpose || 'Trip Delivery'}
                            </span>
                          </td>
                          <td className="p-4 font-mono text-neutral-600">
                            {log.odometer.toLocaleString()} km
                          </td>
                          <td className="p-4 font-mono font-semibold text-neutral-700">
                            {log.liters.toLocaleString()} L
                          </td>
                          <td className="p-4 text-right font-bold text-emerald-700 font-mono">
                            ${log.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fuel fillup form modal */}
      {isFuelOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xl max-w-sm w-full overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-neutral-100 bg-neutral-50 flex justify-between items-center">
              <h3 className="font-bold text-neutral-800 flex items-center gap-1.5">
                <Fuel className="h-5 w-5 text-emerald-600" /> Log Fuel Purchase Log
              </h3>
              <button
                onClick={() => setIsFuelOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleFuelSubmit} className="p-5 space-y-4">
              {fuelError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg font-semibold">
                  {fuelError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-600">Fleet Vehicle</label>
                <select
                  id="fuel-form-vehicle-select"
                  required
                  value={fuelVehicleId}
                  onChange={(e) => setFuelVehicleId(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Choose Vehicle --</option>
                  {vehicles.filter(v => v.status !== 'Retired').map(v => (
                    <option key={v.id} value={v.id}>
                      {v.registrationNumber} - {v.name} (Current: {v.odometer} km)
                    </option>
                  ))}
                </select>
              </div>

              {/* Fuel filled by which Driver */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-600">Filled By (Driver)</label>
                <select
                  id="fuel-form-driver-select"
                  required
                  value={fuelDriverId}
                  onChange={(e) => setFuelDriverId(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                >
                  <option value="">-- Select Register Driver --</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.licenseCategory})
                    </option>
                  ))}
                </select>
              </div>

              {/* Purpose of filling */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-600">Purpose of Filling</label>
                <select
                  id="fuel-form-purpose"
                  required
                  value={fuelPurpose}
                  onChange={(e) => setFuelPurpose(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                >
                  <option value="Trip Delivery">Trip Delivery (On Road)</option>
                  <option value="Scheduled Maintenance">Scheduled Maintenance</option>
                  <option value="Emergency Fill">Emergency Fill</option>
                  <option value="Testing / Calibration">Testing & Calibration</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">Volume (Liters)</label>
                  <input
                    id="fuel-form-liters"
                    type="number"
                    step="any"
                    required
                    placeholder="e.g., 45.5"
                    value={fuelLiters}
                    onChange={(e) => setFuelLiters(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">Fillup Cost ($)</label>
                  <input
                    id="fuel-form-cost"
                    type="number"
                    step="any"
                    required
                    placeholder="Total cash cost"
                    value={fuelCost}
                    onChange={(e) => setFuelCost(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">Odometer at Fillup (km)</label>
                  <input
                    id="fuel-form-odometer"
                    type="number"
                    required
                    placeholder="Current odometer"
                    value={fuelOdometer}
                    onChange={(e) => setFuelOdometer(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">Purchase Date</label>
                  <input
                    id="fuel-form-date"
                    type="date"
                    required
                    value={fuelDate}
                    onChange={(e) => setFuelDate(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsFuelOpen(false)}
                  className="flex-1 px-4 py-2 border border-neutral-200 hover:bg-neutral-100 text-neutral-700 rounded-lg text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  id="submit-log-fuel-btn"
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
                >
                  Confirm Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Miscellaneous Expense form modal */}
      {isExpenseOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xl max-w-sm w-full overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-neutral-100 bg-neutral-50 flex justify-between items-center">
              <h3 className="font-bold text-neutral-800 flex items-center gap-1.5">
                <DollarSign className="h-5 w-5 text-emerald-600" /> Record Operational Expense
              </h3>
              <button
                onClick={() => setIsExpenseOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleExpenseSubmit} className="p-5 space-y-4">
              {expError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg font-semibold">
                  {expError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">Expense Category</label>
                  <select
                    id="expense-form-category"
                    required
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Toll">Toll</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Permit">Permit</option>
                    <option value="Other">Other Category</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">Total Cost ($)</label>
                  <input
                    id="expense-form-cost"
                    type="number"
                    step="any"
                    required
                    placeholder="Total cost"
                    value={expCost}
                    onChange={(e) => setExpCost(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Fulfilled By Role input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-600">Fulfilled By (Payer Role)</label>
                <input
                  id="expense-form-role"
                  type="text"
                  required
                  value={expCreatorRole}
                  onChange={(e) => setExpCreatorRole(e.target.value)}
                  placeholder="e.g., Financial Analyst"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">Associated Vehicle (Optional)</label>
                  <select
                    id="expense-form-vehicle-select"
                    value={expVehicleId}
                    onChange={(e) => setExpVehicleId(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">General Fleet Cost</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.registrationNumber} - {v.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">Expense Date</label>
                  <input
                    id="expense-form-date"
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-600">Description</label>
                <input
                  id="expense-form-description"
                  type="text"
                  required
                  placeholder="e.g., Dallas highway turnpike toll fees"
                  value={expDescription}
                  onChange={(e) => setExpDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsExpenseOpen(false)}
                  className="flex-1 px-4 py-2 border border-neutral-200 hover:bg-neutral-100 text-neutral-700 rounded-lg text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  id="submit-record-expense-btn"
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
