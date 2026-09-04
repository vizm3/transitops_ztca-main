import React, { useState } from 'react';
import {
  Plus,
  Search,
  Users,
  Trash2,
  Edit2,
  Phone,
  ShieldAlert,
  Calendar,
  Award,
  AlertCircle,
  Clock,
  MapPin,
  ShieldCheck,
  DollarSign
} from 'lucide-react';
import { Driver, DriverStatus } from '../types';

interface DriversProps {
  drivers: Driver[];
  onAddDriver: (driver: Omit<Driver, 'id'>) => Promise<boolean>;
  onEditDriver: (id: string, updates: Partial<Driver>) => Promise<boolean>;
  onDeleteDriver: (id: string) => Promise<boolean>;
  currentUserRole: string;
  currentUser: any;
  trips: any[];
  vehicles: any[];
}

interface DriverFileUploadProps {
  id: string;
  label: string;
  value: string;
  fileName: string;
  onChange: (base64: string, name: string) => void;
  onClear: () => void;
}

function DriverFileUpload({
  id,
  label,
  value,
  fileName,
  onChange,
  onClear
}: DriverFileUploadProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      onChange(reader.result as string, file.name);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-neutral-600">{label}</label>
      {value ? (
        <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
          <span className="truncate max-w-[220px] text-emerald-800 font-medium flex items-center gap-1.5">
            📎 {fileName || 'Uploaded Document'}
          </span>
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] font-bold text-red-600 hover:text-red-800"
          >
            Remove
          </button>
        </div>
      ) : (
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragActive(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFile(e.dataTransfer.files[0]);
            }
          }}
          onClick={() => document.getElementById(`${id}-input-file`)?.click()}
          className={`relative border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${
            dragActive ? 'border-emerald-500 bg-emerald-50' : 'border-neutral-200 bg-white hover:bg-neutral-50'
          }`}
        >
          <input
            id={`${id}-input-file`}
            type="file"
            className="hidden"
            accept="application/pdf,image/*,.doc,.docx"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
          />
          <div className="flex flex-col items-center justify-center gap-1 text-[11px] text-neutral-500">
            <span className="font-bold text-emerald-600">Click to upload</span> or drag & drop
            <span className="text-[9px] text-neutral-400">PDF, PNG, JPG, or DOC</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Drivers({
  drivers,
  onAddDriver,
  onEditDriver,
  onDeleteDriver,
  currentUserRole,
  currentUser,
  trips,
  vehicles
}: DriversProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState<keyof Driver>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Form states for Add Driver
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [licenseNum, setLicenseNum] = useState('');
  const [licenseCategory, setLicenseCategory] = useState<'Class A' | 'Class B' | 'Class C'>('Class A');
  const [expiryDate, setExpiryDate] = useState('');
  const [contactNum, setContactNum] = useState('');
  const [safetyScore, setSafetyScore] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [licenseAndId, setLicenseAndId] = useState('');
  const [licenseAndIdName, setLicenseAndIdName] = useState('');
  const [drivingExperience, setDrivingExperience] = useState('');
  const [placeOfWorkCity, setPlaceOfWorkCity] = useState('');
  const [cityVehicleType, setCityVehicleType] = useState('');
  const [cityExperienceYears, setCityExperienceYears] = useState('');
  const [modeOfWork, setModeOfWork] = useState<'Cargo' | 'Simple Loads'>('Simple Loads');
  const [formError, setFormError] = useState('');

  // Form states for Edit Driver
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [editContact, setEditContact] = useState('');
  const [editScore, setEditScore] = useState('');
  const [editStatus, setEditStatus] = useState<DriverStatus>('Available');
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editFormError, setEditFormError] = useState('');

  // Detail view state
  const [viewingDriverDetails, setViewingDriverDetails] = useState<Driver | null>(null);

  const handleSort = (field: keyof Driver) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const isSafetyOfficer = currentUserRole === 'Safety Officer' || currentUserRole === 'Fleet Manager';

  // Filter and sort driver list
  const processedDrivers = drivers
    .filter(d => {
      const matchSearch =
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.licenseNumber.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === 'All' || d.licenseCategory === categoryFilter;
      const matchStatus = statusFilter === 'All' || d.status === statusFilter;
      return matchSearch && matchCategory && matchStatus;
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

    if (!name || !expiryDate || !contactNum || !safetyScore) {
      setFormError('Name, expiry, contact, and safety score are required.');
      return;
    }

    const scoreNum = Number(safetyScore);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      setFormError('Safety score must be between 0 and 100.');
      return;
    }

    const finalLicenseNumber = licenseNum.trim() || `DL-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const success = await onAddDriver({
      name: name.trim(),
      email: email.trim() || undefined,
      licenseNumber: finalLicenseNumber,
      licenseCategory,
      licenseExpiryDate: expiryDate,
      contactNumber: contactNum.trim(),
      safetyScore: scoreNum,
      status: 'Available',
      age: age ? Number(age) : undefined,
      gender,
      licenseAndId: licenseAndId || undefined,
      drivingExperience: drivingExperience ? Number(drivingExperience) : undefined,
      placeOfWorkCity: placeOfWorkCity || undefined,
      cityVehicleType: cityVehicleType || undefined,
      cityExperienceYears: cityExperienceYears ? Number(cityExperienceYears) : undefined,
      modeOfWork: modeOfWork
    });

    if (success) {
      setName('');
      setEmail('');
      setLicenseNum('');
      setLicenseCategory('Class A');
      setExpiryDate('');
      setContactNum('');
      setSafetyScore('');
      setAge('');
      setGender('Male');
      setLicenseAndId('');
      setLicenseAndIdName('');
      setDrivingExperience('');
      setPlaceOfWorkCity('');
      setCityVehicleType('');
      setCityExperienceYears('');
      setModeOfWork('Simple Loads');
      setIsAddOpen(false);
    } else {
      setFormError('Failed to register driver. Please check your values and try again.');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditFormError('');

    if (!editingDriver) return;

    const scoreNum = Number(editScore);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      setEditFormError('Safety score must be between 0 and 100.');
      return;
    }

    const success = await onEditDriver(editingDriver.id, {
      contactNumber: editContact.trim(),
      safetyScore: scoreNum,
      status: editStatus,
      licenseExpiryDate: editExpiryDate
    });

    if (success) {
      setEditingDriver(null);
    } else {
      setEditFormError('Failed to update driver profile.');
    }
  };

  // Check if license is expired or expiring soon
  const getLicenseComplianceStatus = (expiryStr: string) => {
    const expiry = new Date(expiryStr);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return { label: 'Expired', color: 'bg-red-100 text-red-700 border-red-200' };
    }
    if (diffDays <= 30) {
      return { label: 'Expiring Soon', color: 'bg-amber-100 text-amber-700 border-amber-200' };
    }
    return { label: 'Active / Valid', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
  };

  // Color code safety score
  const getSafetyScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (score >= 75) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-red-600 bg-red-50 border-red-100';
  };

  return (
    <div id="driver-tab-panel" className="space-y-6">
      {/* Action panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-800">Driver Management Registry</h2>
          <p className="text-sm text-neutral-500">Manage compliance certifications, safety standings, and duty rosters</p>
        </div>
        {isSafetyOfficer && (
          <button
            id="register-driver-btn"
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" /> Register New Driver
          </button>
        )}
      </div>

      {/* Filter panel */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <input
            id="driver-search-input"
            type="text"
            placeholder="Search by driver name or license #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-neutral-200 rounded-lg text-sm bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex gap-2">
          <select
            id="driver-category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="All">All License Categories</option>
            <option value="Class A">Class A</option>
            <option value="Class B">Class B</option>
            <option value="Class C">Class C</option>
          </select>

          <select
            id="driver-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="All">All Rosters</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="Off Duty">Off Duty</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Drivers List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {processedDrivers.length === 0 ? (
          <div className="col-span-full bg-white border border-neutral-200 rounded-xl p-12 text-center text-neutral-400">
            <Users className="h-8 w-8 mx-auto mb-2 text-neutral-300" />
            No drivers found matching criteria.
          </div>
        ) : (
          processedDrivers.map(driver => {
            const compliance = getLicenseComplianceStatus(driver.licenseExpiryDate);
            const isSuspended = driver.status === 'Suspended';
            
            let rosterBadge = '';
            if (driver.status === 'Available') rosterBadge = 'bg-emerald-50 text-emerald-700 border-emerald-100';
            else if (driver.status === 'On Trip') rosterBadge = 'bg-blue-50 text-blue-700 border-blue-100';
            else if (driver.status === 'Off Duty') rosterBadge = 'bg-neutral-100 text-neutral-500 border-neutral-200';
            else rosterBadge = 'bg-red-50 text-red-700 border-red-100';

            const isAuthorizedToView = currentUserRole === 'Fleet Manager' || currentUser?.email?.toLowerCase() === driver.email?.toLowerCase() || currentUser?.name?.toLowerCase() === driver.name?.toLowerCase();

            return (
              <div
                key={driver.id}
                id={`driver-card-${driver.id}`}
                onClick={() => {
                  if (isAuthorizedToView) {
                    setViewingDriverDetails(driver);
                  }
                }}
                className={`bg-white border border-neutral-200 rounded-xl shadow-sm p-5 hover:scale-[1.01] transition-all flex flex-col justify-between ${
                  isAuthorizedToView ? 'cursor-pointer hover:border-emerald-500' : ''
                }`}
              >
                <div className="space-y-4">
                  {/* Title Bar */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-neutral-800 text-base">{driver.name}</h4>
                      <span className="text-xs text-neutral-400 font-mono tracking-wide">{driver.licenseNumber} • {driver.licenseCategory}</span>
                    </div>
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${rosterBadge}`}>
                      {driver.status}
                    </span>
                  </div>

                  {/* License compliance banner */}
                  <div className={`p-2 rounded-lg border flex items-center justify-between text-xs ${compliance.color}`}>
                    <span className="flex items-center gap-1.5 font-medium">
                      <Calendar className="h-3.5 w-3.5" /> License Status
                    </span>
                    <span className="font-bold uppercase tracking-wider text-[10px]">{compliance.label}</span>
                  </div>

                  {/* Body Info */}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-neutral-600">
                      <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-neutral-400" /> Contact:</span>
                      <span className="font-semibold text-neutral-800">{driver.contactNumber}</span>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-neutral-400" /> License Expiry:</span>
                      <span className="font-mono text-neutral-800">{driver.licenseExpiryDate}</span>
                    </div>
                    <div className="flex justify-between items-center text-neutral-600">
                      <span className="flex items-center gap-1"><Award className="h-3.5 w-3.5 text-neutral-400" /> Safety Rating:</span>
                      <span className={`px-2 py-0.5 font-bold rounded border font-mono ${getSafetyScoreColor(driver.safetyScore)}`}>
                        {driver.safetyScore}/100
                      </span>
                    </div>
                    {isAuthorizedToView && (
                      <div className="text-center text-[10px] text-emerald-600 font-bold bg-emerald-50 py-1 rounded mt-2 border border-emerald-100">
                        ✓ Click to View Complete Dossier & Trips
                      </div>
                    )}
                  </div>
                </div>

                {/* Card footer actions */}
                {isSafetyOfficer && (
                  <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-neutral-100 text-xs">
                    <button
                      id={`edit-driver-btn-${driver.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingDriver(driver);
                        setEditContact(driver.contactNumber);
                        setEditScore(String(driver.safetyScore));
                        setEditStatus(driver.status);
                        setEditExpiryDate(driver.licenseExpiryDate);
                      }}
                      className="px-2 py-1 bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100 rounded-lg flex items-center gap-1 transition-all"
                    >
                      <Edit2 className="h-3.5 w-3.5" /> Edit Profile
                    </button>
                    <button
                      id={`delete-driver-btn-${driver.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete driver profile for ${driver.name}?`)) {
                          onDeleteDriver(driver.id);
                        }
                      }}
                      className="px-2 py-1 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 rounded-lg flex items-center gap-1 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Viewing Driver Details Dossier Modal */}
      {viewingDriverDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl max-w-2xl w-full overflow-hidden my-8">
            <div className="p-6 border-b border-neutral-100 bg-neutral-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" /> Driver Dossier: {viewingDriverDetails.name}
                </h3>
                <p className="text-xs text-neutral-400 font-mono">Profile ID: {viewingDriverDetails.id}</p>
              </div>
              <button
                onClick={() => setViewingDriverDetails(null)}
                className="text-neutral-400 hover:text-white font-extrabold text-lg p-2"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-sm">
              {/* Profile Details Grid */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-neutral-900 border-b pb-1">Personal & Compliance Specifications</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="block text-neutral-400 font-semibold">Registered Email</span>
                    <span className="font-semibold text-neutral-800">{viewingDriverDetails.email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-neutral-400 font-semibold">Contact Phone</span>
                    <span className="font-semibold text-neutral-800">{viewingDriverDetails.contactNumber || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-neutral-400 font-semibold">Age / Gender</span>
                    <span className="font-semibold text-neutral-800">
                      {viewingDriverDetails.age ? `${viewingDriverDetails.age} Years Old` : 'N/A'} / {viewingDriverDetails.gender || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-neutral-400 font-semibold">Overall Driving Experience</span>
                    <span className="font-semibold text-neutral-800">
                      {viewingDriverDetails.drivingExperience !== undefined ? `${viewingDriverDetails.drivingExperience} Years` : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-neutral-400 font-semibold">License Number</span>
                    <span className="font-semibold text-neutral-800 font-mono">
                      {viewingDriverDetails.licenseNumber} ({viewingDriverDetails.licenseCategory})
                    </span>
                  </div>
                  <div>
                    <span className="block text-neutral-400 font-semibold">License Expiry Date</span>
                    <span className="font-semibold text-neutral-800 font-mono">{viewingDriverDetails.licenseExpiryDate}</span>
                  </div>
                  <div>
                    <span className="block text-neutral-400 font-semibold">Assigned Mode of Work</span>
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-100 inline-block mt-0.5">
                      {viewingDriverDetails.modeOfWork || 'Simple Loads'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-neutral-400 font-semibold">Credential License & ID File</span>
                    <span className="font-semibold text-blue-700 underline flex items-center gap-1 cursor-pointer mt-0.5">
                      📎 {viewingDriverDetails.licenseAndId || 'license_id_doc.pdf'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Place of Work details */}
              {viewingDriverDetails.placeOfWorkCity && (
                <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
                  <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-neutral-500" /> Place of Work City Details
                  </h4>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="block text-neutral-400">Target Region / City</span>
                      <span className="font-bold text-neutral-800">{viewingDriverDetails.placeOfWorkCity}</span>
                    </div>
                    <div>
                      <span className="block text-neutral-400">Specific Vehicle Type</span>
                      <span className="font-bold text-neutral-800">{viewingDriverDetails.cityVehicleType || 'Any Registered'}</span>
                    </div>
                    <div>
                      <span className="block text-neutral-400">City-specific Experience</span>
                      <span className="font-bold text-neutral-800">
                        {viewingDriverDetails.cityExperienceYears !== undefined ? `${viewingDriverDetails.cityExperienceYears} Years` : 'None Specified'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Trip History Tabular Display */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-neutral-900 border-b pb-1 flex items-center gap-1">
                  <Clock className="h-4 w-4 text-neutral-500" /> Active & Past Trip Deliveries
                </h4>
                {(() => {
                  const driverTrips = trips.filter(t => t.driverId === viewingDriverDetails.id);
                  if (driverTrips.length === 0) {
                    return <p className="text-xs text-neutral-400 italic">No trip dispatch assignments recorded for this driver.</p>;
                  }
                  return (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto">
                      {driverTrips.map(t => (
                        <div key={t.id} className="p-3 border border-neutral-200 rounded-lg flex justify-between items-center bg-white text-xs shadow-sm">
                          <div>
                            <div className="font-bold text-neutral-800">{t.source} ➔ {t.destination}</div>
                            <div className="text-[10px] text-neutral-400 mt-0.5">Trip ID: {t.id} • Distance: {t.plannedDistance} km</div>
                          </div>
                          <div className="text-right space-y-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold block ${
                              t.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              t.status === 'Dispatched' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                              'bg-neutral-100 text-neutral-600'
                            }`}>
                              {t.status}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block border ${
                              t.paymentStatus === 'Paid' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>
                              Payment: {t.paymentStatus || 'Pending'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Unique Vehicles Driven */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-neutral-900 border-b pb-1">Fleet Vehicles Operated</h4>
                {(() => {
                  const driverTrips = trips.filter(t => t.driverId === viewingDriverDetails.id);
                  const drivenVehicleIds = Array.from(new Set(driverTrips.map(t => t.vehicleId)));
                  const drivenVehicles = vehicles.filter(v => drivenVehicleIds.includes(v.id));

                  if (drivenVehicles.length === 0) {
                    return <p className="text-xs text-neutral-400 italic">No fleet vehicle assignments recorded in dispatch logs.</p>;
                  }
                  return (
                    <div className="grid grid-cols-2 gap-2">
                      {drivenVehicles.map(v => (
                        <div key={v.id} className="p-2 border border-neutral-100 rounded-lg bg-neutral-50 flex items-center gap-2 text-xs">
                          <span className="font-bold text-emerald-700 font-mono bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">{v.registrationNumber}</span>
                          <span className="text-neutral-700 font-medium truncate">{v.name}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Financial Compensation Ledger */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-neutral-900 border-b pb-1 flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-neutral-500" /> Operational Compensation Ledger
                </h4>
                {(() => {
                  const driverTrips = trips.filter(t => t.driverId === viewingDriverDetails.id);
                  const totalTripsCount = driverTrips.length;
                  const completedTripsCount = driverTrips.filter(t => t.status === 'Completed').length;
                  const paidTripsCount = driverTrips.filter(t => t.paymentStatus === 'Paid').length;
                  const unpaidTripsCount = totalTripsCount - paidTripsCount;
                  const completedPaidEarnings = paidTripsCount * 175;
                  const pendingPayments = unpaidTripsCount * 175;

                  return (
                    <div className="p-4 bg-neutral-900 text-neutral-100 rounded-xl grid grid-cols-3 gap-4 text-center shadow-lg border border-neutral-800">
                      <div>
                        <span className="block text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Total Dispatch Runs</span>
                        <span className="text-lg font-extrabold text-white">{totalTripsCount}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Disbursed Earnings</span>
                        <span className="text-lg font-extrabold text-emerald-400">${completedPaidEarnings}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Accruing / Pending</span>
                        <span className="text-lg font-extrabold text-amber-400">${pendingPayments}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex justify-end">
              <button
                onClick={() => setViewingDriverDetails(null)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-900 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Driver Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xl max-w-md w-full overflow-hidden my-8">
            <div className="p-5 border-b border-neutral-100 bg-neutral-50 flex justify-between items-center">
              <h3 className="font-bold text-neutral-800 flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-600" /> Register New Driver Profile
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg font-semibold">
                  {formError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-600">Full Name</label>
                <input
                  id="driver-form-name"
                  type="text"
                  required
                  placeholder="e.g., Alex Carter"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-600">Email Address (Optional)</label>
                <input
                  id="driver-form-email"
                  type="email"
                  placeholder="e.g., alex@transitops.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">License Number</label>
                  <input
                    id="driver-form-license"
                    type="text"
                    required
                    placeholder="DL-9948271"
                    value={licenseNum}
                    onChange={(e) => setLicenseNum(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">License Category</label>
                  <select
                    id="driver-form-category"
                    value={licenseCategory}
                    onChange={(e) => setLicenseCategory(e.target.value as 'Class A' | 'Class B' | 'Class C')}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Class A">Class A (Heavy Duty)</option>
                    <option value="Class B">Class B (Medium Rigid)</option>
                    <option value="Class C">Class C (Light Carrier)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">Contact Number</label>
                  <input
                    id="driver-form-contact"
                    type="text"
                    required
                    placeholder="e.g., 555-0192"
                    value={contactNum}
                    onChange={(e) => setContactNum(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">License Expiry Date</label>
                  <input
                    id="driver-form-expiry"
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">Age</label>
                  <input
                    id="driver-form-age"
                    type="number"
                    placeholder="e.g., 29"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">Gender</label>
                  <select
                    id="driver-form-gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">Driving Exp (Years)</label>
                  <input
                    id="driver-form-experience"
                    type="number"
                    placeholder="e.g., 7"
                    value={drivingExperience}
                    onChange={(e) => setDrivingExperience(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">Mode of Work</label>
                  <select
                    id="driver-form-mode"
                    value={modeOfWork}
                    onChange={(e) => setModeOfWork(e.target.value as 'Cargo' | 'Simple Loads')}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Simple Loads">Simple Loads</option>
                    <option value="Cargo">Cargo (Heavy Freight)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-600">Place of Work - City (Optional)</label>
                <input
                  id="driver-form-city"
                  type="text"
                  placeholder="e.g., San Francisco"
                  value={placeOfWorkCity}
                  onChange={(e) => setPlaceOfWorkCity(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {placeOfWorkCity && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-150">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-600">City Vehicle Type</label>
                    <input
                      id="driver-form-city-vehicle"
                      type="text"
                      placeholder="e.g., Semi-truck"
                      value={cityVehicleType}
                      onChange={(e) => setCityVehicleType(e.target.value)}
                      className="w-full px-2 py-1.5 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-600">City Exp (Years)</label>
                    <input
                      id="driver-form-city-exp"
                      type="number"
                      placeholder="e.g., 3"
                      value={cityExperienceYears}
                      onChange={(e) => setCityExperienceYears(e.target.value)}
                      className="w-full px-2 py-1.5 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              <DriverFileUpload
                id="driver-form-license-upload"
                label="License & ID PDF / Image"
                value={licenseAndId}
                fileName={licenseAndIdName}
                onChange={(base64, name) => {
                  setLicenseAndId(base64);
                  setLicenseAndIdName(name);
                }}
                onClear={() => {
                  setLicenseAndId('');
                  setLicenseAndIdName('');
                }}
              />

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-600">Initial Safety Score (0-100)</label>
                <input
                  id="driver-form-safety"
                  type="number"
                  required
                  placeholder="e.g., 95"
                  value={safetyScore}
                  onChange={(e) => setSafetyScore(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
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
                  id="submit-register-driver-btn"
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

      {/* Edit Driver Modal */}
      {editingDriver && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xl max-w-sm w-full overflow-hidden">
            <div className="p-5 border-b border-neutral-100 bg-neutral-50 flex justify-between items-center">
              <h3 className="font-bold text-neutral-800">
                Update {editingDriver.name}
              </h3>
              <button
                onClick={() => setEditingDriver(null)}
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
                <label className="text-xs font-bold text-neutral-600">Contact Number</label>
                <input
                  id="driver-edit-contact-input"
                  type="text"
                  required
                  value={editContact}
                  onChange={(e) => setEditContact(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-600">License Expiry Date</label>
                <input
                  id="driver-edit-expiry-input"
                  type="date"
                  required
                  value={editExpiryDate}
                  onChange={(e) => setEditExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">Safety Standing (0-100)</label>
                  <input
                    id="driver-edit-safety-input"
                    type="number"
                    required
                    value={editScore}
                    onChange={(e) => setEditScore(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">Duty Status</label>
                  <select
                    id="driver-edit-status-select"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as DriverStatus)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Available">Available</option>
                    <option value="On Trip">On Trip</option>
                    <option value="Off Duty">Off Duty</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setEditingDriver(null)}
                  className="flex-1 px-4 py-2 border border-neutral-200 hover:bg-neutral-100 text-neutral-700 rounded-lg text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  id="submit-edit-driver-btn"
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
