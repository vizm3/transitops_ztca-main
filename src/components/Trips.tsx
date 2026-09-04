import React, { useState } from 'react';
import {
  Plus,
  Compass,
  ArrowRight,
  User,
  Truck,
  Weight,
  Navigation,
  CheckCircle,
  XCircle,
  FileText,
  MapPin,
  HelpCircle
} from 'lucide-react';
import { Trip, TripStatus, Vehicle, Driver } from '../types';

interface TripsProps {
  trips: Trip[];
  vehicles: Vehicle[];
  drivers: Driver[];
  onAddTrip: (trip: Omit<Trip, 'id' | 'createdAt'>, dispatchImmediately: boolean) => Promise<boolean>;
  onUpdateTrip: (id: string, updates: Partial<Trip>) => Promise<boolean>;
  currentUserRole: string;
}

export default function Trips({
  trips,
  vehicles,
  drivers,
  onAddTrip,
  onUpdateTrip,
  currentUserRole
}: TripsProps) {
  const [activeTab, setActiveTab] = useState<TripStatus | 'All'>('All');

  // Add Trip Modal Form states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [cargoWeight, setCargoWeight] = useState('');
  const [plannedDistance, setPlannedDistance] = useState('');
  const [formError, setFormError] = useState('');

  // Complete Trip Modal Form states
  const [completingTrip, setCompletingTrip] = useState<Trip | null>(null);
  const [odometerEnd, setOdometerEnd] = useState('');
  const [fuelConsumed, setFuelConsumed] = useState('');
  const [completeFormError, setCompleteFormError] = useState('');

  // Filtering lists for Dispatch dropdown selection pool
  // ONLY Available vehicles that are NOT Retired or In Shop can be selected for a new trip
  const dispatchableVehicles = vehicles.filter(v => v.status === 'Available');

  // ONLY Available, non-suspended drivers with non-expired driving licenses can be selected for a new trip
  const dispatchableDrivers = drivers.filter(d => {
    const isLicenseValid = new Date(d.licenseExpiryDate) >= new Date();
    return d.status === 'Available' && isLicenseValid;
  });

  // Filter trips by state tab
  const filteredTrips = trips.filter(t => {
    if (activeTab === 'All') return true;
    return t.status === activeTab;
  });

  const getVehicleRegNumber = (id: string) => {
    const v = vehicles.find(item => item.id === id);
    return v ? `${v.name} (${v.registrationNumber})` : 'Unknown';
  };

  const getDriverName = (id: string) => {
    const d = drivers.find(item => item.id === id);
    return d ? d.name : 'Unknown';
  };

  const handleCreateSubmit = async (dispatchImmediately: boolean) => {
    setFormError('');

    if (!source || !destination || !selectedVehicleId || !selectedDriverId || !cargoWeight || !plannedDistance) {
      setFormError('All fields are required.');
      return;
    }

    const weightNum = Number(cargoWeight);
    const distNum = Number(plannedDistance);

    if (isNaN(weightNum) || weightNum <= 0) {
      setFormError('Cargo weight must be a positive number.');
      return;
    }
    if (isNaN(distNum) || distNum <= 0) {
      setFormError('Planned distance must be a positive number.');
      return;
    }

    // Business Rule Check: Cargo weight must not exceed selected vehicle's capacity
    const targetVehicle = vehicles.find(v => v.id === selectedVehicleId);
    if (targetVehicle && weightNum > targetVehicle.maxLoadCapacity) {
      setFormError(`Cargo weight (${weightNum} kg) exceeds selected vehicle's maximum load capacity (${targetVehicle.maxLoadCapacity} kg).`);
      return;
    }

    const success = await onAddTrip({
      source: source.trim(),
      destination: destination.trim(),
      vehicleId: selectedVehicleId,
      driverId: selectedDriverId,
      cargoWeight: weightNum,
      plannedDistance: distNum,
      status: dispatchImmediately ? 'Dispatched' : 'Draft',
      odometerStart: targetVehicle ? targetVehicle.odometer : 0
    }, dispatchImmediately);

    if (success) {
      // Clear forms
      setSource('');
      setDestination('');
      setSelectedVehicleId('');
      setSelectedDriverId('');
      setCargoWeight('');
      setPlannedDistance('');
      setIsAddOpen(false);
    } else {
      setFormError('Failed to create trip. Ensure both vehicle and driver are available.');
    }
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompleteFormError('');

    if (!completingTrip) return;

    const odoEndNum = Number(odometerEnd);
    const fuelNum = Number(fuelConsumed);

    if (isNaN(odoEndNum) || odoEndNum <= completingTrip.odometerStart) {
      setCompleteFormError(`Ending odometer must be greater than starting odometer (${completingTrip.odometerStart} km).`);
      return;
    }
    if (isNaN(fuelNum) || fuelNum < 0) {
      setCompleteFormError('Fuel consumed must be a non-negative number.');
      return;
    }

    const success = await onUpdateTrip(completingTrip.id, {
      status: 'Completed',
      odometerEnd: odoEndNum,
      fuelConsumed: fuelNum
    });

    if (success) {
      setCompletingTrip(null);
      setOdometerEnd('');
      setFuelConsumed('');
    } else {
      setCompleteFormError('Failed to close delivery log.');
    }
  };

  const handleCancelTrip = async (tripId: string) => {
    if (confirm('Are you sure you want to cancel this dispatched delivery trip? Vehicle and driver will be set back to Available.')) {
      await onUpdateTrip(tripId, { status: 'Cancelled' });
    }
  };

  const isDriverOrManager = currentUserRole === 'Driver' || currentUserRole === 'Fleet Manager';
  const isManager = currentUserRole === 'Fleet Manager';

  return (
    <div id="trips-tab-panel" className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-800">Dispatch & Trip Lifecycle Management</h2>
          <p className="text-sm text-neutral-500">Coordinate and log cargo dispatches with active driver rosters</p>
        </div>
        {isManager && (
          <button
            id="create-trip-btn"
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" /> Create Dispatch / Trip
          </button>
        )}
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-neutral-200">
        {(['All', 'Draft', 'Dispatched', 'Completed', 'Cancelled'] as const).map(tab => (
          <button
            key={tab}
            id={`trip-tab-btn-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-[2px] ${
              activeTab === tab
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {tab} Logs
          </button>
        ))}
      </div>

      {/* Delivery Logs List */}
      <div className="space-y-4">
        {filteredTrips.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center text-neutral-400 shadow-sm">
            <Compass className="h-8 w-8 mx-auto mb-2 text-neutral-300" />
            No delivery records found in this category.
          </div>
        ) : (
          filteredTrips.map(trip => {
            let statusBadge = '';
            if (trip.status === 'Draft') statusBadge = 'bg-neutral-100 text-neutral-600 border-neutral-200';
            else if (trip.status === 'Dispatched') statusBadge = 'bg-blue-50 text-blue-700 border-blue-100 animate-pulse';
            else if (trip.status === 'Completed') statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-100';
            else statusBadge = 'bg-red-50 text-red-600 border-red-100';

            return (
              <div
                key={trip.id}
                id={`trip-card-${trip.id}`}
                className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm hover:scale-[1.005] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Router description */}
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded font-bold border border-neutral-200">
                      ID: {trip.id}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${statusBadge}`}>
                      {trip.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-neutral-800">
                    <span className="flex items-center gap-1"><MapPin className="h-4 w-4 text-neutral-400" /> {trip.source}</span>
                    <ArrowRight className="h-4 w-4 text-neutral-400" />
                    <span className="flex items-center gap-1"><MapPin className="h-4 w-4 text-emerald-500" /> {trip.destination}</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 text-xs text-neutral-600">
                    <div>
                      <span className="text-neutral-400 block font-semibold">Assigned Fleet</span>
                      <span className="font-bold text-neutral-700 flex items-center gap-1 mt-0.5">
                        <Truck className="h-3.5 w-3.5" /> {getVehicleRegNumber(trip.vehicleId)}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block font-semibold">Assigned Driver</span>
                      <span className="font-bold text-neutral-700 flex items-center gap-1 mt-0.5">
                        <User className="h-3.5 w-3.5" /> {getDriverName(trip.driverId)}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block font-semibold">Cargo Weight</span>
                      <span className="font-bold text-neutral-700 flex items-center gap-1 mt-0.5 font-mono">
                        <Weight className="h-3.5 w-3.5" /> {trip.cargoWeight.toLocaleString()} kg
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block font-semibold">Planned Distance</span>
                      <span className="font-bold text-neutral-700 flex items-center gap-1 mt-0.5 font-mono">
                        <Navigation className="h-3.5 w-3.5" /> {trip.plannedDistance.toLocaleString()} km
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status-specific actions */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  {trip.status === 'Draft' && isManager && (
                    <>
                      <button
                        id={`dispatch-draft-btn-${trip.id}`}
                        onClick={() => onUpdateTrip(trip.id, { status: 'Dispatched' })}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
                      >
                        Dispatch Driver
                      </button>
                      <button
                        id={`cancel-draft-btn-${trip.id}`}
                        onClick={() => onUpdateTrip(trip.id, { status: 'Cancelled' })}
                        className="px-3 py-1.5 border border-neutral-200 hover:bg-neutral-100 text-neutral-700 rounded-lg text-xs font-semibold transition-all"
                      >
                        Cancel Draft
                      </button>
                    </>
                  )}

                  {trip.status === 'Dispatched' && isDriverOrManager && (
                    <>
                      <button
                        id={`complete-dispatch-btn-${trip.id}`}
                        onClick={() => {
                          setCompletingTrip(trip);
                          setOdometerEnd(String(trip.odometerStart + trip.plannedDistance));
                          setFuelConsumed('40');
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1 transition-all"
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Log Arrival / Complete
                      </button>
                      {isManager && (
                        <button
                          id={`abort-dispatch-btn-${trip.id}`}
                          onClick={() => handleCancelTrip(trip.id)}
                          className="px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Cancel
                        </button>
                      )}
                    </>
                  )}

                  {trip.status === 'Completed' && (
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-xs text-emerald-800 space-y-1">
                      <div className="font-bold flex items-center gap-1">
                        <CheckCircle className="h-3.5 w-3.5" /> Delivery Completed
                      </div>
                      <p className="text-[10px] text-neutral-500 font-mono">
                        End Odo: {trip.odometerEnd?.toLocaleString()} km • Fuel: {trip.fuelConsumed} L
                      </p>
                    </div>
                  )}

                  {trip.status === 'Cancelled' && (
                    <span className="text-xs text-neutral-400 flex items-center gap-1 font-semibold italic">
                      <XCircle className="h-4 w-4" /> Trip Cancelled
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Put-In-Shop / Add Dispatch Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="p-5 border-b border-neutral-100 bg-neutral-50 flex justify-between items-center">
              <h3 className="font-bold text-neutral-800 flex items-center gap-2">
                <Compass className="h-5 w-5 text-emerald-600" /> New Delivery Dispatch Form
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg font-semibold animate-shake">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">Source Location</label>
                  <input
                    id="trip-form-source"
                    type="text"
                    required
                    placeholder="Warehouse / Depot"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">Destination Location</label>
                  <input
                    id="trip-form-destination"
                    type="text"
                    required
                    placeholder="Retail Outlet / Customer"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600 flex items-center justify-between">
                    <span>Select Vehicle</span>
                    <span className="text-[10px] text-emerald-600 font-bold">({dispatchableVehicles.length} Avail)</span>
                  </label>
                  <select
                    id="trip-form-vehicle-select"
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Choose Available Vehicle --</option>
                    {dispatchableVehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.registrationNumber} - {v.name} (Max: {v.maxLoadCapacity}kg)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600 flex items-center justify-between">
                    <span>Select Driver</span>
                    <span className="text-[10px] text-emerald-600 font-bold">({dispatchableDrivers.length} Avail)</span>
                  </label>
                  <select
                    id="trip-form-driver-select"
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Choose Available Driver --</option>
                    {dispatchableDrivers.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.licenseCategory}, Score: {d.safetyScore})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">Cargo Weight (kg)</label>
                  <input
                    id="trip-form-cargo-weight"
                    type="number"
                    required
                    placeholder="Cargo net weight"
                    value={cargoWeight}
                    onChange={(e) => setCargoWeight(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">Planned Route Distance (km)</label>
                  <input
                    id="trip-form-planned-distance"
                    type="number"
                    required
                    placeholder="e.g., 380"
                    value={plannedDistance}
                    onChange={(e) => setPlannedDistance(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-neutral-200 hover:bg-neutral-100 text-neutral-700 rounded-lg text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  id="submit-draft-trip-btn"
                  type="button"
                  onClick={() => handleCreateSubmit(false)}
                  className="flex-1 px-4 py-2 border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded-lg text-sm font-semibold transition-all"
                >
                  Save Draft Trip
                </button>
                <button
                  id="submit-dispatch-trip-btn"
                  type="button"
                  onClick={() => handleCreateSubmit(true)}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
                >
                  Dispatch Instantly
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complete Trip / Arrival Log Modal */}
      {completingTrip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xl max-w-sm w-full overflow-hidden">
            <div className="p-5 border-b border-neutral-100 bg-neutral-50 flex justify-between items-center">
              <h3 className="font-bold text-neutral-800 flex items-center gap-1.5">
                <CheckCircle className="h-5 w-5 text-emerald-600" /> Complete Delivery Run
              </h3>
              <button
                onClick={() => setCompletingTrip(null)}
                className="text-neutral-400 hover:text-neutral-600 font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCompleteSubmit} className="p-5 space-y-4">
              {completeFormError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg font-semibold">
                  {completeFormError}
                </div>
              )}

              <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 text-xs space-y-1">
                <div className="text-neutral-400 font-semibold">TRIP INVOICE / SPECS</div>
                <div className="text-neutral-700 font-medium">Route: {completingTrip.source} ➔ {completingTrip.destination}</div>
                <div className="text-neutral-700 font-mono">Dispatched Odometer: {completingTrip.odometerStart.toLocaleString()} km</div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-600">Final Arrival Odometer (km)</label>
                <input
                  id="trip-complete-odometer-end-input"
                  type="number"
                  required
                  placeholder={`Must exceed ${completingTrip.odometerStart}`}
                  value={odometerEnd}
                  onChange={(e) => setOdometerEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-600">Total Fuel Consumed (Liters)</label>
                <input
                  id="trip-complete-fuel-consumed-input"
                  type="number"
                  required
                  placeholder="e.g., 42"
                  value={fuelConsumed}
                  onChange={(e) => setFuelConsumed(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-neutral-400">
                  Entering fuel consumed automatically updates vehicle analytics and operational expenses.
                </p>
              </div>

              <div className="flex gap-2 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setCompletingTrip(null)}
                  className="flex-1 px-4 py-2 border border-neutral-200 hover:bg-neutral-100 text-neutral-700 rounded-lg text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  id="submit-complete-trip-btn"
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
                >
                  Record Safe Arrival
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
