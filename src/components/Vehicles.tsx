import React, { useState } from 'react';
import {
  Plus,
  Search,
  Truck,
  Trash2,
  Edit2,
  DollarSign,
  Gauge,
  MapPin,
  Wrench,
  Fuel,
  Info
} from 'lucide-react';
import { Vehicle, VehicleStatus } from '../types';

interface VehiclesProps {
  vehicles: Vehicle[];
  onAddVehicle: (vehicle: Omit<Vehicle, 'id'>) => Promise<boolean>;
  onEditVehicle: (id: string, updates: Partial<Vehicle>) => Promise<boolean>;
  onDeleteVehicle: (id: string) => Promise<boolean>;
  currentUserRole: string;
}

export default function Vehicles({
  vehicles,
  onAddVehicle,
  onEditVehicle,
  onDeleteVehicle,
  currentUserRole
}: VehiclesProps) {
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState<keyof Vehicle>('registrationNumber');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Form states for Add Vehicle
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [regNum, setRegNum] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('Van');
  const [maxCapacity, setMaxCapacity] = useState('');
  const [odometer, setOdometer] = useState('');
  const [acquisitionCost, setAcquisitionCost] = useState('');
  const [region, setRegion] = useState('North');
  const [formError, setFormError] = useState('');

  // Form states for Edit Vehicle
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editOdometer, setEditOdometer] = useState('');
  const [editStatus, setEditStatus] = useState<VehicleStatus>('Available');
  const [editRegion, setEditRegion] = useState('');
  const [editFormError, setEditFormError] = useState('');

  // Sorting helper
  const handleSort = (field: keyof Vehicle) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Filter and sort vehicle registry
  const processedVehicles = vehicles
    .filter(v => {
      const matchSearch =
        v.registrationNumber.toLowerCase().includes(search.toLowerCase()) ||
        v.name.toLowerCase().includes(search.toLowerCase());
      const matchRegion = regionFilter === 'All' || v.region === regionFilter;
      const matchType = typeFilter === 'All' || v.type === typeFilter;
      const matchStatus = statusFilter === 'All' || v.status === statusFilter;
      return matchSearch && matchRegion && matchType && matchStatus;
    })
    .sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB as string).toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!regNum || !name || !maxCapacity || !odometer || !acquisitionCost) {
      setFormError('All fields are required.');
      return;
    }

    const capacityNum = Number(maxCapacity);
    const odoNum = Number(odometer);
    const acqNum = Number(acquisitionCost);

    if (isNaN(capacityNum) || capacityNum <= 0) {
      setFormError('Max capacity must be a positive number.');
      return;
    }
    if (isNaN(odoNum) || odoNum < 0) {
      setFormError('Odometer must be a valid non-negative reading.');
      return;
    }
    if (isNaN(acqNum) || acqNum <= 0) {
      setFormError('Acquisition cost must be a positive amount.');
      return;
    }

    const success = await onAddVehicle({
      registrationNumber: regNum.trim(),
      name: name.trim(),
      type,
      maxLoadCapacity: capacityNum,
      odometer: odoNum,
      acquisitionCost: acqNum,
      status: 'Available',
      region
    });

    if (success) {
      // Clear forms
      setRegNum('');
      setName('');
      setType('Van');
      setMaxCapacity('');
      setOdometer('');
      setAcquisitionCost('');
      setRegion('North');
      setIsAddOpen(false);
    } else {
      setFormError('Failed to register vehicle. Registration Number must be unique.');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditFormError('');

    if (!editingVehicle) return;

    const odoNum = Number(editOdometer);
    if (isNaN(odoNum) || odoNum < editingVehicle.odometer) {
      setEditFormError(`Odometer must be a valid reading greater than or equal to current (${editingVehicle.odometer} km).`);
      return;
    }

    const success = await onEditVehicle(editingVehicle.id, {
      odometer: odoNum,
      status: editStatus,
      region: editRegion
    });

    if (success) {
      setEditingVehicle(null);
    } else {
      setEditFormError('Failed to update vehicle record.');
    }
  };

  const isManager = currentUserRole === 'Fleet Manager';

  return (
    <div id="vehicle-tab-panel" className="space-y-6">
      {/* Header action panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-800">Master Vehicle Registry</h2>
          <p className="text-sm text-neutral-500">Add, track, and maintain organization fleet units</p>
        </div>
        {isManager && (
          <button
            id="register-vehicle-btn"
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" /> Register New Vehicle
          </button>
        )}
      </div>

      {/* Grid Filter Bar */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <input
            id="vehicle-search-input"
            type="text"
            placeholder="Search by registration # or model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-neutral-200 rounded-lg text-sm bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            id="vehicle-region-filter"
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="All">All Regions</option>
            <option value="North">North</option>
            <option value="South">South</option>
            <option value="East">East</option>
            <option value="West">West</option>
          </select>

          <select
            id="vehicle-type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="All">All Types</option>
            <option value="Van">Van</option>
            <option value="Truck">Truck</option>
            <option value="Sedan">Sedan</option>
            <option value="Reefer">Reefer</option>
          </select>

          <select
            id="vehicle-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="All">All Statuses</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="In Shop">In Shop</option>
            <option value="Retired">Retired</option>
          </select>
        </div>
      </div>

      {/* Registry Table */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500 border-b border-neutral-200 font-semibold">
                <th className="p-4 cursor-pointer hover:bg-neutral-100" onClick={() => handleSort('registrationNumber')}>
                  Reg Number {sortBy === 'registrationNumber' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="p-4 cursor-pointer hover:bg-neutral-100" onClick={() => handleSort('name')}>
                  Model/Name {sortBy === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="p-4 cursor-pointer hover:bg-neutral-100" onClick={() => handleSort('type')}>
                  Type {sortBy === 'type' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="p-4 cursor-pointer hover:bg-neutral-100" onClick={() => handleSort('maxLoadCapacity')}>
                  Max Capacity {sortBy === 'maxLoadCapacity' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="p-4 cursor-pointer hover:bg-neutral-100" onClick={() => handleSort('odometer')}>
                  Odometer {sortBy === 'odometer' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="p-4 cursor-pointer hover:bg-neutral-100" onClick={() => handleSort('acquisitionCost')}>
                  Acquisition Cost {sortBy === 'acquisitionCost' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="p-4">Region</th>
                <th className="p-4">Status</th>
                {isManager && <th className="p-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {processedVehicles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-neutral-400">
                    <Truck className="h-8 w-8 mx-auto mb-2 text-neutral-300" />
                    No vehicles found matching search criteria.
                  </td>
                </tr>
              ) : (
                processedVehicles.map(vehicle => {
                  let statusBadge = '';
                  if (vehicle.status === 'Available') {
                    statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                  } else if (vehicle.status === 'On Trip') {
                    statusBadge = 'bg-blue-50 text-blue-700 border-blue-100';
                  } else if (vehicle.status === 'In Shop') {
                    statusBadge = 'bg-amber-50 text-amber-700 border-amber-100';
                  } else {
                    statusBadge = 'bg-neutral-100 text-neutral-600 border-neutral-200';
                  }

                  return (
                    <tr
                      key={vehicle.id}
                      id={`vehicle-row-${vehicle.id}`}
                      className="hover:bg-neutral-50 transition-colors"
                    >
                      <td className="p-4 font-bold text-neutral-800 font-mono">
                        {vehicle.registrationNumber}
                      </td>
                      <td className="p-4 font-semibold text-neutral-700">
                        {vehicle.name}
                      </td>
                      <td className="p-4 text-neutral-600">
                        {vehicle.type}
                      </td>
                      <td className="p-4 text-neutral-600 font-mono">
                        {vehicle.maxLoadCapacity.toLocaleString()} kg
                      </td>
                      <td className="p-4 text-neutral-600 font-mono">
                        {vehicle.odometer.toLocaleString()} km
                      </td>
                      <td className="p-4 text-neutral-600 font-mono">
                        ${vehicle.acquisitionCost.toLocaleString()}
                      </td>
                      <td className="p-4 text-neutral-500 font-medium">
                        {vehicle.region}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-xs font-bold rounded-full border ${statusBadge}`}>
                          {vehicle.status}
                        </span>
                      </td>
                      {isManager && (
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              id={`edit-vehicle-btn-${vehicle.id}`}
                              onClick={() => {
                                setEditingVehicle(vehicle);
                                setEditOdometer(String(vehicle.odometer));
                                setEditStatus(vehicle.status);
                                setEditRegion(vehicle.region);
                              }}
                              className="p-1.5 hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 rounded-lg transition-colors"
                              title="Edit Vehicle Details"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              id={`delete-vehicle-btn-${vehicle.id}`}
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete vehicle ${vehicle.registrationNumber}?`)) {
                                  onDeleteVehicle(vehicle.id);
                                }
                              }}
                              className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                              title="Delete Vehicle"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Vehicle Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-neutral-100 bg-neutral-50 flex justify-between items-center">
              <h3 className="font-bold text-neutral-800 flex items-center gap-2">
                <Truck className="h-5 w-5 text-emerald-600" /> Register New Fleet Asset
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
                <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg font-semibold">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">Registration #</label>
                  <input
                    id="vehicle-form-reg-number"
                    type="text"
                    required
                    placeholder="e.g., Van-05"
                    value={regNum}
                    onChange={(e) => setRegNum(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">Region</label>
                  <select
                    id="vehicle-form-region"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="North">North</option>
                    <option value="South">South</option>
                    <option value="East">East</option>
                    <option value="West">West</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-600">Model Name</label>
                <input
                  id="vehicle-form-name"
                  type="text"
                  required
                  placeholder="e.g., Ford Transit 350"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">Vehicle Type</label>
                  <select
                    id="vehicle-form-type"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Van">Van</option>
                    <option value="Truck">Truck</option>
                    <option value="Sedan">Sedan</option>
                    <option value="Reefer">Reefer</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">Max Capacity (kg)</label>
                  <input
                    id="vehicle-form-capacity"
                    type="number"
                    required
                    placeholder="e.g., 1200"
                    value={maxCapacity}
                    onChange={(e) => setMaxCapacity(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">Odometer (km)</label>
                  <input
                    id="vehicle-form-odometer"
                    type="number"
                    required
                    placeholder="Initial km reading"
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">Acquisition Cost ($)</label>
                  <input
                    id="vehicle-form-cost"
                    type="number"
                    required
                    placeholder="Asset purchase cost"
                    value={acquisitionCost}
                    onChange={(e) => setAcquisitionCost(e.target.value)}
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
                  id="submit-register-vehicle-btn"
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
                >
                  Confirm Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Vehicle Modal */}
      {editingVehicle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xl max-w-sm w-full overflow-hidden">
            <div className="p-5 border-b border-neutral-100 bg-neutral-50 flex justify-between items-center">
              <h3 className="font-bold text-neutral-800">
                Update {editingVehicle.registrationNumber}
              </h3>
              <button
                onClick={() => setEditingVehicle(null)}
                className="text-neutral-400 hover:text-neutral-600 font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              {editFormError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg font-semibold">
                  {editFormError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-600">Model Name</label>
                <input
                  type="text"
                  disabled
                  value={editingVehicle.name}
                  className="w-full px-3 py-2 border border-neutral-100 bg-neutral-50 rounded-lg text-sm text-neutral-400 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-600">Current Odometer Reading (km)</label>
                <input
                  id="vehicle-edit-odometer-input"
                  type="number"
                  required
                  value={editOdometer}
                  onChange={(e) => setEditOdometer(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">Asset Status</label>
                  <select
                    id="vehicle-edit-status-select"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as VehicleStatus)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Available">Available</option>
                    <option value="On Trip">On Trip</option>
                    <option value="In Shop">In Shop</option>
                    <option value="Retired">Retired</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">Fleet Region</label>
                  <select
                    id="vehicle-edit-region-select"
                    value={editRegion}
                    onChange={(e) => setEditRegion(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="North">North</option>
                    <option value="South">South</option>
                    <option value="East">East</option>
                    <option value="West">West</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setEditingVehicle(null)}
                  className="flex-1 px-4 py-2 border border-neutral-200 hover:bg-neutral-100 text-neutral-700 rounded-lg text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  id="submit-edit-vehicle-btn"
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
