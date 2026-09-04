import React, { useState, useEffect } from 'react';
import {
  Truck,
  Users,
  Compass,
  Wrench,
  DollarSign,
  TrendingUp,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Bell,
  CheckCircle,
  AlertTriangle,
  Info,
  FileText
} from 'lucide-react';

import Dashboard from './components/Dashboard';
import Vehicles from './components/Vehicles';
import Drivers from './components/Drivers';
import Trips from './components/Trips';
import MaintenanceLogs from './components/Maintenance';
import Expenses from './components/Expenses';
import Reports from './components/Reports';
import AdminPanel from './components/AdminPanel';
import ZTCAContextWidget, { SimulatedContext, DEFAULT_CONTEXT_PRESETS } from './components/ZTCAContextWidget';
import StepUpModal from './components/StepUpModal';
import TrustCenter from './components/TrustCenter';
import ProjectOverview from './components/ProjectOverview';

import {
  User,
  UserRole,
  Vehicle,
  Driver,
  Trip,
  Maintenance,
  FuelLog,
  Expense,
  Notification,
  ActivityLog,
  AnalyticsMetric,
  AnalyticsSummary
} from './types';

interface FileUploadFieldProps {
  id: string;
  label: string;
  value: string;
  fileName: string;
  onChange: (base64: string, name: string) => void;
  onClear: () => void;
  accept?: string;
}

function FileUploadField({
  id,
  label,
  value,
  fileName,
  onChange,
  onClear,
  accept = 'image/*,application/pdf,.doc,.docx'
}: FileUploadFieldProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      onChange(reader.result as string, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-bold text-neutral-600 uppercase tracking-wide">{label}</label>
      {value ? (
        <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded text-xs">
          <span className="truncate max-w-[200px] text-emerald-800 font-medium flex items-center gap-1.5">
            📎 {fileName || 'Uploaded Document'}
          </span>
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] font-bold text-red-600 hover:text-red-800 transition-colors uppercase tracking-wider"
          >
            Remove
          </button>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${
            dragActive
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-neutral-200 bg-white hover:bg-neutral-50'
          }`}
          onClick={() => document.getElementById(`${id}-input-file`)?.click()}
        >
          <input
            id={`${id}-input-file`}
            type="file"
            className="hidden"
            accept={accept}
            onChange={handleChange}
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

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('transitops_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showProjectOverview, setShowProjectOverview] = useState(false);

  // Registration State
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('Driver');
  const [regAge, setRegAge] = useState('');
  const [regGender, setRegGender] = useState('Male');
  const [regLicenseAndId, setRegLicenseAndId] = useState('');
  const [regLicenseAndIdName, setRegLicenseAndIdName] = useState('');
  const [regDrivingExperience, setRegDrivingExperience] = useState('');
  const [regPlaceOfWorkCity, setRegPlaceOfWorkCity] = useState('');
  const [regCityVehicleType, setRegCityVehicleType] = useState('');
  const [regCityExperienceYears, setRegCityExperienceYears] = useState('');
  const [regModeOfWork, setRegModeOfWork] = useState<'Cargo' | 'Simple Loads'>('Simple Loads');
  const [regPlaceOfOldWork, setRegPlaceOfOldWork] = useState('');
  const [regPastExperienceDoc, setRegPastExperienceDoc] = useState('');
  const [regPastExperienceDocName, setRegPastExperienceDocName] = useState('');
  const [regPastExperienceText, setRegPastExperienceText] = useState('');
  const [regError, setRegError] = useState('');

  // Profile Modal State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileAge, setProfileAge] = useState('');
  const [profileGender, setProfileGender] = useState('Male');
  const [profilePlaceOfOldWork, setProfilePlaceOfOldWork] = useState('');
  const [profilePastExperienceDoc, setProfilePastExperienceDoc] = useState('');
  const [profilePastExperienceDocName, setProfilePastExperienceDocName] = useState('');
  const [profilePastExperienceText, setProfilePastExperienceText] = useState('');
  const [profileLicenseAndId, setProfileLicenseAndId] = useState('');
  const [profileLicenseAndIdName, setProfileLicenseAndIdName] = useState('');
  const [profileDrivingExperience, setProfileDrivingExperience] = useState('');
  const [profilePlaceOfWorkCity, setProfilePlaceOfWorkCity] = useState('');
  const [profileCityVehicleType, setProfileCityVehicleType] = useState('');
  const [profileCityExperienceYears, setProfileCityExperienceYears] = useState('');
  const [profileModeOfWork, setProfileModeOfWork] = useState<'Cargo Loads' | 'Simple Loads'>('Simple Loads');
  const [profileError, setProfileError] = useState('');

  // Primary Navigation Tab
  const [activeTab, setActiveTab] = useState<
    'Dashboard' | 'Vehicles' | 'Drivers' | 'Trips' | 'Maintenance' | 'Fuel' | 'Expenses' | 'Reports' | 'Trust Center' | 'Admin'
  >('Dashboard');

  // ZTCA Simulation & Enforcement State
  const [simulatedContext, setSimulatedContext] = useState<SimulatedContext>(DEFAULT_CONTEXT_PRESETS.trusted);
  const [stepUpToken, setStepUpToken] = useState<string | null>(null);
  const [pendingStepUpAction, setPendingStepUpAction] = useState<{
    actionName: string;
    reason: string;
    riskScore: number;
    retryFn: () => Promise<void>;
  } | null>(null);
  const [isStepUpModalOpen, setIsStepUpModalOpen] = useState(false);

  // ZTCA HTTP Fetch Interceptor
  const ztcaFetch = async (url: string, options: RequestInit = {}, actionName = 'UI Action') => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
      'x-ztca-user-id': currentUser?.id || 'u1',
      'x-ztca-user-name': currentUser?.name || 'Guest User',
      'x-ztca-user-email': currentUser?.email || 'user@transitops.com',
      'x-ztca-user-role': currentUser?.role || 'Driver',
      'x-ztca-device-id': simulatedContext.deviceId,
      'x-ztca-device-browser': simulatedContext.deviceBrowser,
      'x-ztca-device-os': simulatedContext.deviceOS,
      'x-ztca-lat': String(simulatedContext.lat),
      'x-ztca-lng': String(simulatedContext.lng),
      'x-ztca-city': simulatedContext.city,
      'x-ztca-country': simulatedContext.country,
      'x-ztca-is-odd-hours': String(simulatedContext.isOddHours),
      'x-ztca-action-name': actionName
    };

    if (stepUpToken) {
      headers['x-ztca-stepup-token'] = stepUpToken;
    }

    const res = await fetch(url, { ...options, headers });

    if (res.status === 401 || res.status === 403) {
      const errorData = await res.json().catch(() => ({}));
      
      if (errorData.error === 'ZTCA_STEP_UP_REQUIRED') {
        setPendingStepUpAction({
          actionName,
          reason: errorData.message || 'Elevated context risk detected. Step-Up verification required.',
          riskScore: errorData.decision?.riskScore || 65,
          retryFn: async () => {
            await ztcaFetch(url, options, actionName);
          }
        });
        setIsStepUpModalOpen(true);
        throw new Error('ZTCA_STEP_UP_TRIGGERED');
      }

      if (errorData.error === 'ZTCA_BLOCKED') {
        triggerToast(`ZTCA POLICY BLOCK: ${errorData.message}`, 'error');
        throw new Error(`ZTCA_BLOCKED: ${errorData.message}`);
      }

      if (errorData.error === 'ZTCA_READ_ONLY_MODE') {
        triggerToast(`ZTCA READ-ONLY: ${errorData.message}`, 'error');
        throw new Error(`ZTCA_READ_ONLY: ${errorData.message}`);
      }
    }

    return res;
  };

  // Unified Application State
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [analytics, setAnalytics] = useState<{
    metrics: AnalyticsMetric[];
    summary: AnalyticsSummary;
  } | null>(null);

  // Stateful Toast Notification Banners
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Helper to show toasts
  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Fetch unified application state from Express APIs with ZTCA Context Interceptor
  const fetchAllData = async () => {
    try {
      const [
        resVehicles,
        resDrivers,
        resTrips,
        resMaint,
        resFuel,
        resExpenses,
        resNotifs,
        resLogs,
        resAnalytics
      ] = await Promise.all([
        ztcaFetch('/api/vehicles', {}, 'Read Fleet Vehicles'),
        ztcaFetch('/api/drivers', {}, 'Read Drivers List'),
        ztcaFetch('/api/trips', {}, 'Read Dispatch Trips'),
        ztcaFetch('/api/maintenance', {}, 'Read Maintenance Logs'),
        ztcaFetch('/api/fuel-logs', {}, 'Read Fuel Logs'),
        ztcaFetch('/api/expenses', {}, 'Read Fleet Expenses'),
        ztcaFetch('/api/notifications', {}, 'Read Notifications'),
        ztcaFetch('/api/activity-logs', {}, 'Read Activity Logs'),
        ztcaFetch('/api/analytics', {}, 'Read Analytics Dashboard')
      ]);

      const [
        dataVehicles,
        dataDrivers,
        dataTrips,
        dataMaint,
        dataFuel,
        dataExpenses,
        dataNotifs,
        dataLogs,
        dataAnalytics
      ] = await Promise.all([
        resVehicles.json(),
        resDrivers.json(),
        resTrips.json(),
        resMaint.json(),
        resFuel.json(),
        resExpenses.json(),
        resNotifs.json(),
        resLogs.json(),
        resAnalytics.json()
      ]);

      setVehicles(dataVehicles);
      setDrivers(dataDrivers);
      setTrips(dataTrips);
      setMaintenance(dataMaint);
      setFuelLogs(dataFuel);
      setExpenses(dataExpenses);
      setNotifications(dataNotifs);
      setActivityLogs(dataLogs);
      setAnalytics(dataAnalytics);
    } catch (e) {
      console.error('Error fetching fleet database state:', e);
      triggerToast('Network delay. Retrying to synchronize fleet records...', 'info');
    }
  };

  // Sync state when logged in
  useEffect(() => {
    if (currentUser) {
      fetchAllData();
      const interval = setInterval(fetchAllData, 15000); // Poll every 15s
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // Auth Handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!loginEmail || !loginPassword) {
      setLoginError('Email and password fields are required.');
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });

      if (!res.ok) {
        const errorData = await res.json();
        setLoginError(errorData.error || 'Invalid email or password.');
        return;
      }

      const userData = (await res.json()) as User;
      localStorage.setItem('transitops_user', JSON.stringify(userData));
      setCurrentUser(userData);
      triggerToast(`Welcome back, ${userData.name}! Successfully authenticated.`, 'success');
    } catch (e) {
      setLoginError('Failed to establish contact with the TransitOps backend API.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regName || !regEmail || !regPassword || !regRole) {
      setRegError('Name, email, password, and role are required.');
      return;
    }

    try {
      const body = {
        name: regName,
        email: regEmail,
        password: regPassword,
        role: regRole,
        age: regAge ? Number(regAge) : undefined,
        gender: regGender,
        placeOfOldWork: regPlaceOfOldWork || undefined,
        pastExperienceDoc: regPastExperienceDoc || undefined,
        pastExperienceText: regPastExperienceText || undefined,
        licenseAndId: regLicenseAndId || undefined,
        ...(regRole === 'Driver' && {
          drivingExperience: regDrivingExperience ? Number(regDrivingExperience) : undefined,
          placeOfWorkCity: regPlaceOfWorkCity || undefined,
          cityVehicleType: regCityVehicleType || undefined,
          cityExperienceYears: regCityExperienceYears ? Number(regCityExperienceYears) : undefined,
          modeOfWork: regModeOfWork
        })
      };

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errData = await res.json();
        setRegError(errData.error || 'Failed to register.');
        return;
      }

      const userData = (await res.json()) as User;
      localStorage.setItem('transitops_user', JSON.stringify(userData));
      setCurrentUser(userData);
      triggerToast(`Account created! Welcome, ${userData.name}!`, 'success');
      
      // Clear forms
      setRegName('');
      setRegEmail('');
      setRegPassword('');
      setRegAge('');
      setRegGender('Male');
      setRegLicenseAndId('');
      setRegLicenseAndIdName('');
      setRegDrivingExperience('');
      setRegPlaceOfWorkCity('');
      setRegCityVehicleType('');
      setRegCityExperienceYears('');
      setRegPlaceOfOldWork('');
      setRegPastExperienceDoc('');
      setRegPastExperienceDocName('');
      setRegPastExperienceText('');
      setIsRegistering(false);
    } catch (e) {
      setRegError('Failed to establish contact with the TransitOps backend API.');
    }
  };

  const handleQuickLogin = async (email: string, pass: string) => {
    setLoginEmail(email);
    setLoginPassword(pass);
    setTimeout(() => {
      const form = document.getElementById('login-form') as HTMLFormElement;
      if (form) form.requestSubmit();
    }, 100);
  };

  const handleLogout = () => {
    localStorage.removeItem('transitops_user');
    setCurrentUser(null);
    setActiveTab('Dashboard');
    triggerToast('Logged out successfully. Secure session terminated.', 'info');
  };

  // ==========================================
  // MUTATION API TRIGGERS WITH ZTCA PROTECTION
  // ==========================================

  const handleAddVehicle = async (vehicle: Omit<Vehicle, 'id'>): Promise<boolean> => {
    try {
      const res = await ztcaFetch('/api/vehicles', {
        method: 'POST',
        body: JSON.stringify({ ...vehicle, userContext: currentUser?.name })
      }, 'Register New Vehicle');
      if (res.ok) {
        triggerToast(`Vehicle ${vehicle.registrationNumber} successfully added to registry.`, 'success');
        fetchAllData();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const handleEditVehicle = async (id: string, updates: Partial<Vehicle>): Promise<boolean> => {
    try {
      const res = await ztcaFetch(`/api/vehicles/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...updates, userContext: currentUser?.name })
      }, 'Update Vehicle Profile');
      if (res.ok) {
        triggerToast('Vehicle profile successfully updated.', 'success');
        fetchAllData();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const handleDeleteVehicle = async (id: string): Promise<boolean> => {
    try {
      const res = await ztcaFetch(`/api/vehicles/${id}?userContext=${encodeURIComponent(currentUser?.name || '')}`, {
        method: 'DELETE'
      }, 'Delete Vehicle Asset');
      if (res.ok) {
        triggerToast('Vehicle asset removed from master registry.', 'success');
        fetchAllData();
        return true;
      } else {
        const err = await res.json();
        triggerToast(err.error || 'Failed to delete vehicle asset.', 'error');
        return false;
      }
    } catch (e) {
      return false;
    }
  };

  const handleAddDriver = async (driver: Omit<Driver, 'id'>): Promise<boolean> => {
    try {
      const res = await ztcaFetch('/api/drivers', {
        method: 'POST',
        body: JSON.stringify({ ...driver, userContext: currentUser?.name })
      }, 'Add Driver Profile');
      if (res.ok) {
        triggerToast(`Driver profile registered: ${driver.name}.`, 'success');
        fetchAllData();
        return true;
      }

      let apiError = 'Failed to register driver.';
      try {
        const errPayload = await res.json();
        apiError = errPayload?.error || apiError;
      } catch {
        // ignore JSON parse errors and fall back to generic message
      }

      triggerToast(apiError, 'error');
      return false;
    } catch (e) {
      triggerToast('Failed to register driver. Please check the backend response.', 'error');
      return false;
    }
  };

  const handleEditDriver = async (id: string, updates: Partial<Driver>): Promise<boolean> => {
    try {
      const res = await ztcaFetch(`/api/drivers/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...updates, userContext: currentUser?.name })
      }, 'Update Driver Credentials');
      if (res.ok) {
        triggerToast('Driver credential records updated.', 'success');
        fetchAllData();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const handleDeleteDriver = async (id: string): Promise<boolean> => {
    try {
      const res = await ztcaFetch(`/api/drivers/${id}?userContext=${encodeURIComponent(currentUser?.name || '')}`, {
        method: 'DELETE'
      }, 'Delete Driver Profile');
      if (res.ok) {
        triggerToast('Driver roster profile deleted.', 'success');
        fetchAllData();
        return true;
      } else {
        const err = await res.json();
        triggerToast(err.error || 'Failed to delete driver.', 'error');
        return false;
      }
    } catch (e) {
      return false;
    }
  };

  const handleAddTrip = async (trip: Omit<Trip, 'id' | 'createdAt'>, dispatchImmediately: boolean): Promise<boolean> => {
    try {
      const res = await ztcaFetch('/api/trips', {
        method: 'POST',
        body: JSON.stringify({
          ...trip,
          status: dispatchImmediately ? 'Dispatched' : 'Draft',
          userContext: currentUser?.name
        })
      }, dispatchImmediately ? 'Dispatch Vehicle & Driver Route' : 'Create Trip Draft');
      if (res.ok) {
        triggerToast(dispatchImmediately ? 'Driver successfully Dispatched on route!' : 'Trip Draft saved.', 'success');
        fetchAllData();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const handleUpdateTrip = async (id: string, updates: Partial<Trip>): Promise<boolean> => {
    try {
      const res = await ztcaFetch(`/api/trips/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...updates, userContext: currentUser?.name })
      }, `Update Trip Status (${updates.status || 'Edit'})`);
      if (res.ok) {
        if (updates.status === 'Completed') {
          triggerToast('Delivery marked completed! Vehicle and driver returned to available pool.', 'success');
        } else if (updates.status === 'Dispatched') {
          triggerToast('Route dispatched successfully.', 'success');
        } else {
          triggerToast('Trip log updated.', 'success');
        }
        fetchAllData();
        return true;
      } else {
        const err = await res.json();
        triggerToast(err.error || 'Failed to update trip log.', 'error');
        return false;
      }
    } catch (e) {
      return false;
    }
  };

  const handleAddMaintenance = async (maint: Omit<Maintenance, 'id'>): Promise<boolean> => {
    try {
      const res = await ztcaFetch('/api/maintenance', {
        method: 'POST',
        body: JSON.stringify({ ...maint, userContext: currentUser?.name })
      }, 'Check In Maintenance Workshop');
      if (res.ok) {
        triggerToast('Vehicle checked in to workshop shop.', 'success');
        fetchAllData();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const handleCloseMaintenance = async (id: string, actualCost: number, endDate: string): Promise<boolean> => {
    try {
      const res = await ztcaFetch(`/api/maintenance/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ cost: actualCost, endDate, status: 'Closed', userContext: currentUser?.name })
      }, 'Close Maintenance Ticket');
      if (res.ok) {
        triggerToast('Maintenance task resolved. Fleet asset released.', 'success');
        fetchAllData();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const handleAddFuelLog = async (log: Omit<FuelLog, 'id'>): Promise<boolean> => {
    try {
      const res = await ztcaFetch('/api/fuel-logs', {
        method: 'POST',
        body: JSON.stringify({ ...log, userContext: currentUser?.name })
      }, 'Log Fuel Receipt');
      if (res.ok) {
        triggerToast('Fuel purchase successfully logged in ledger.', 'success');
        fetchAllData();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const handleAddExpense = async (expense: Omit<Expense, 'id'>): Promise<boolean> => {
    try {
      const res = await ztcaFetch('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({ ...expense, userContext: currentUser?.name })
      }, 'Log Fleet Expense');
      if (res.ok) {
        triggerToast('Miscellaneous fleet expense logged.', 'success');
        fetchAllData();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const handleResolveNotification = async (id: string) => {
    // Optimistic state update to guarantee immediate count reduction in UI
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, resolved: true } : n));
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: true })
      });
      if (res.ok) {
        triggerToast('Safety alert dismissed.', 'success');
        fetchAllData();
      } else {
        // Rollback on server error
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
      fetchAllData();
    }
  };

  // ==========================================
  // VIEW RENDERING SWITCHER
  // ==========================================

  const renderActiveView = () => {
    switch (activeTab) {
      case 'Dashboard':
        return (
          <Dashboard
            vehicles={vehicles}
            drivers={drivers}
            trips={trips}
            maintenance={maintenance}
            notifications={notifications}
            activityLogs={activityLogs}
            onResolveNotification={handleResolveNotification}
          />
        );
      case 'Vehicles':
        return (
          <Vehicles
            vehicles={vehicles}
            onAddVehicle={handleAddVehicle}
            onEditVehicle={handleEditVehicle}
            onDeleteVehicle={handleDeleteVehicle}
            currentUserRole={currentUser?.role || ''}
          />
        );
      case 'Drivers':
        return (
          <Drivers
            drivers={drivers}
            onAddDriver={handleAddDriver}
            onEditDriver={handleEditDriver}
            onDeleteDriver={handleDeleteDriver}
            currentUserRole={currentUser?.role || ''}
            currentUser={currentUser}
            trips={trips}
            vehicles={vehicles}
          />
        );
      case 'Trips':
        return (
          <Trips
            trips={trips}
            vehicles={vehicles}
            drivers={drivers}
            onAddTrip={handleAddTrip}
            onUpdateTrip={handleUpdateTrip}
            currentUserRole={currentUser?.role || ''}
          />
        );
      case 'Maintenance':
        return (
          <MaintenanceLogs
            maintenance={maintenance}
            vehicles={vehicles}
            onAddMaintenance={handleAddMaintenance}
            onCloseMaintenance={handleCloseMaintenance}
            currentUserRole={currentUser?.role || ''}
          />
        );
      case 'Fuel':
      case 'Expenses':
        return (
          <Expenses
            fuelLogs={fuelLogs}
            expenses={expenses}
            vehicles={vehicles}
            drivers={drivers}
            onAddFuelLog={handleAddFuelLog}
            onAddExpense={handleAddExpense}
            currentUserRole={currentUser?.role || ''}
            currentUser={currentUser}
          />
        );
      case 'Reports':
        return (
          <Reports
            analytics={analytics}
            rawVehicles={vehicles}
            rawTrips={trips}
            rawExpenses={expenses}
          />
        );
      case 'Admin':
        return <AdminPanel currentUser={currentUser} />;
      case 'Trust Center':
        return <TrustCenter currentUser={currentUser} context={simulatedContext} />;
      default:
        return <div>View not implemented.</div>;
    }
  };

  // ==========================================
  // MAIN APP SCREEN LAYOUT
  // ==========================================

  // If not logged in, render the clean, styled login card with quick-presets or registration
  if (!currentUser) {
    if (showProjectOverview) {
      return <ProjectOverview onBack={() => setShowProjectOverview(false)} />;
    }

    return (
      <div className="min-h-screen bg-neutral-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-xl bg-neutral-900 flex items-center justify-center text-emerald-500 border border-neutral-800 shadow">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-neutral-900 tracking-tight">TransitOps</h1>
            <p className="mt-2 text-sm font-semibold text-neutral-500">Smart Transport Operations Platform</p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 border border-neutral-200 rounded-xl shadow-lg sm:px-10 space-y-6">
            
            {/* Form Mode Tabs */}
            <div className="flex border-b border-neutral-200">
              <button
                type="button"
                onClick={() => setIsRegistering(false)}
                className={`flex-1 pb-3 text-sm font-bold border-b-2 text-center transition-all ${
                  !isRegistering ? 'border-emerald-500 text-emerald-600 font-extrabold' : 'border-transparent text-neutral-400 hover:text-neutral-600'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setIsRegistering(true)}
                className={`flex-1 pb-3 text-sm font-bold border-b-2 text-center transition-all ${
                  isRegistering ? 'border-emerald-500 text-emerald-600 font-extrabold' : 'border-transparent text-neutral-400 hover:text-neutral-600'
                }`}
              >
                Create Account
              </button>
            </div>

            {!isRegistering ? (
              <form id="login-form" onSubmit={handleLoginSubmit} className="space-y-4">
                <h3 className="text-md font-bold text-neutral-800 text-center">Secure Console Login</h3>
                {loginError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs font-semibold rounded-lg">
                    {loginError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-neutral-600 uppercase">Operator Email</label>
                  <input
                    id="login-email-input"
                    type="email"
                    required
                    placeholder="name@transitops.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-neutral-600 uppercase">Secure Password</label>
                  <input
                    id="login-password-input"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  id="login-submit-btn"
                  type="submit"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
                >
                  Enter Platform
                </button>
                <button
                  id="project-overview-btn"
                  type="button"
                  onClick={() => setShowProjectOverview(true)}
                  className="w-full py-2 border border-neutral-300 text-neutral-700 hover:bg-neutral-50 rounded-lg text-sm font-semibold transition-all"
                >
                  About TransitOps and ZTCA
                </button>
              </form>
            ) : (
              <form id="register-form" onSubmit={handleRegisterSubmit} className="space-y-4">
                <h3 className="text-md font-bold text-neutral-800 text-center">Platform Operator Registration</h3>
                {regError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs font-semibold rounded-lg">
                    {regError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-neutral-600 uppercase">Full Name</label>
                  <input
                    id="reg-name-input"
                    type="text"
                    required
                    placeholder="e.g., Jane Doe"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-neutral-600 uppercase">Operator Email</label>
                  <input
                    id="reg-email-input"
                    type="email"
                    required
                    placeholder="jane@transitops.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-neutral-600 uppercase">Secure Password</label>
                    <input
                      id="reg-password-input"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-neutral-600 uppercase">System Role</label>
                    <select
                      id="reg-role-select"
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                    >
                      <option value="Driver">Driver</option>
                      <option value="Fleet Manager">Fleet Manager</option>
                      <option value="Safety Officer">Safety Officer</option>
                      <option value="Financial Analyst">Financial Analyst</option>
                    </select>
                  </div>
                </div>

                {/* Conditional Fields for Driver Profile */}
                {regRole === 'Driver' && (
                  <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg space-y-3">
                    <span className="block text-xs font-extrabold text-neutral-500 uppercase tracking-wider border-b pb-1">
                      Required Driver Information
                    </span>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-neutral-600">Age</label>
                        <input
                          id="reg-age-input"
                          type="number"
                          placeholder="e.g., 28"
                          value={regAge}
                          onChange={(e) => setRegAge(e.target.value)}
                          className="w-full px-2 py-1.5 border border-neutral-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-neutral-600">Gender</label>
                        <select
                          id="reg-gender-select"
                          value={regGender}
                          onChange={(e) => setRegGender(e.target.value)}
                          className="w-full px-2 py-1.5 border border-neutral-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-neutral-600">Driving Exp (Years)</label>
                        <input
                          id="reg-exp-input"
                          type="number"
                          placeholder="e.g., 5"
                          value={regDrivingExperience}
                          onChange={(e) => setRegDrivingExperience(e.target.value)}
                          className="w-full px-2 py-1.5 border border-neutral-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-neutral-600">Mode of Work</label>
                        <select
                          id="reg-mode-select"
                          value={regModeOfWork}
                          onChange={(e) => setRegModeOfWork(e.target.value as 'Cargo' | 'Simple Loads')}
                          className="w-full px-2 py-1.5 border border-neutral-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="Simple Loads">Simple Loads</option>
                          <option value="Cargo">Cargo (Heavy Freight)</option>
                        </select>
                      </div>
                    </div>

                    {/* Drag and Drop File Uploader for License */}
                    <FileUploadField
                      id="reg-license-upload"
                      label="License & ID Document (Image, PDF, Doc)"
                      value={regLicenseAndId}
                      fileName={regLicenseAndIdName}
                      onChange={(base64, name) => {
                        setRegLicenseAndId(base64);
                        setRegLicenseAndIdName(name);
                      }}
                      onClear={() => {
                        setRegLicenseAndId('');
                        setRegLicenseAndIdName('');
                      }}
                    />

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-neutral-600">Place of Work - City (Optional)</label>
                      <input
                        id="reg-city-input"
                        type="text"
                        placeholder="e.g., Chicago"
                        value={regPlaceOfWorkCity}
                        onChange={(e) => setRegPlaceOfWorkCity(e.target.value)}
                        className="w-full px-2 py-1.5 border border-neutral-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    {regPlaceOfWorkCity && (
                      <div className="grid grid-cols-2 gap-2 p-2 bg-white rounded border border-neutral-200">
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold text-neutral-500">Preferred Vehicle Type</label>
                          <input
                            id="reg-city-vehicle-input"
                            type="text"
                            placeholder="e.g., Semi-truck"
                            value={regCityVehicleType}
                            onChange={(e) => setRegCityVehicleType(e.target.value)}
                            className="w-full px-2 py-1 border border-neutral-200 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold text-neutral-500">City Experience (Years)</label>
                          <input
                            id="reg-city-exp-input"
                            type="number"
                            placeholder="e.g., 2"
                            value={regCityExperienceYears}
                            onChange={(e) => setRegCityExperienceYears(e.target.value)}
                            className="w-full px-2 py-1 border border-neutral-200 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    )}

                    <div className="border-t border-neutral-200 pt-2 space-y-2">
                      <span className="block text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">
                        Past Experience Details (Optional)
                      </span>
                      
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-neutral-600">Place of Old Work</label>
                        <input
                          id="reg-old-work"
                          type="text"
                          placeholder="e.g., Apex Logistics Ltd."
                          value={regPlaceOfOldWork}
                          onChange={(e) => setRegPlaceOfOldWork(e.target.value)}
                          className="w-full px-2 py-1.5 border border-neutral-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <FileUploadField
                        id="reg-past-exp-upload"
                        label="Past Experience Credentials (PDF, Image, Doc)"
                        value={regPastExperienceDoc}
                        fileName={regPastExperienceDocName}
                        onChange={(base64, name) => {
                          setRegPastExperienceDoc(base64);
                          setRegPastExperienceDocName(name);
                        }}
                        onClear={() => {
                          setRegPastExperienceDoc('');
                          setRegPastExperienceDocName('');
                        }}
                      />

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-neutral-600">Experience Description</label>
                        <textarea
                          id="reg-past-exp-text"
                          rows={2}
                          placeholder="Describe your previous work experience, duties, or credentials..."
                          value={regPastExperienceText}
                          onChange={(e) => setRegPastExperienceText(e.target.value)}
                          className="w-full px-2 py-1 border border-neutral-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Conditional Fields for Non-Driver Roles */}
                {regRole !== 'Driver' && (
                  <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg space-y-3">
                    <span className="block text-xs font-extrabold text-neutral-500 uppercase tracking-wider border-b pb-1">
                      Professional Profile Details
                    </span>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-neutral-600">Age</label>
                        <input
                          id="reg-nondriver-age"
                          type="number"
                          placeholder="e.g., 34"
                          value={regAge}
                          onChange={(e) => setRegAge(e.target.value)}
                          className="w-full px-2 py-1.5 border border-neutral-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-neutral-600">Gender</label>
                        <select
                          id="reg-nondriver-gender"
                          value={regGender}
                          onChange={(e) => setRegGender(e.target.value)}
                          className="w-full px-2 py-1.5 border border-neutral-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-neutral-600">Place of Old Work</label>
                      <input
                        id="reg-nondriver-oldwork"
                        type="text"
                        placeholder="e.g., Global Shipping Inc."
                        value={regPlaceOfOldWork}
                        onChange={(e) => setRegPlaceOfOldWork(e.target.value)}
                        className="w-full px-2 py-1.5 border border-neutral-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <FileUploadField
                      id="reg-nondriver-id"
                      label="ID Document Reference (Image, PDF, Doc)"
                      value={regLicenseAndId}
                      fileName={regLicenseAndIdName}
                      onChange={(base64, name) => {
                        setRegLicenseAndId(base64);
                        setRegLicenseAndIdName(name);
                      }}
                      onClear={() => {
                        setRegLicenseAndId('');
                        setRegLicenseAndIdName('');
                      }}
                    />

                    <FileUploadField
                      id="reg-nondriver-past-exp"
                      label="Past Experience Credentials (PDF, Image, Doc)"
                      value={regPastExperienceDoc}
                      fileName={regPastExperienceDocName}
                      onChange={(base64, name) => {
                        setRegPastExperienceDoc(base64);
                        setRegPastExperienceDocName(name);
                      }}
                      onClear={() => {
                        setRegPastExperienceDoc('');
                        setRegPastExperienceDocName('');
                      }}
                    />

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-neutral-600">Experience Description</label>
                      <textarea
                        id="reg-nondriver-exp-desc"
                        rows={2}
                        placeholder="Briefly describe your past management, safety, or financial experience..."
                        value={regPastExperienceText}
                        onChange={(e) => setRegPastExperienceText(e.target.value)}
                        className="w-full px-2 py-1 border border-neutral-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                )}

                <button
                  id="register-submit-btn"
                  type="submit"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
                >
                  Register Profile
                </button>
              </form>
            )}

            {/* Quick Presets for Evaluators */}
            <div className="pt-4 border-t border-neutral-200 space-y-3">
              <span className="text-xs font-bold text-neutral-400 block text-center uppercase tracking-wider">
                Multi-User Equal-Privilege Evaluation Presets
              </span>
              <div className="space-y-2">
                <button
                  id="preset-login-admin"
                  onClick={() => handleQuickLogin('admin@transitops.com', 'admin123')}
                  className="w-full p-2 border-2 border-slate-900 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-left font-medium transition-all shadow-sm"
                >
                  <span className="font-extrabold text-cyan-300 flex items-center gap-1.5 text-xs">
                    🛡️ Super User (Admin)
                  </span>
                  <span className="text-[11px] text-slate-300">ZTCA Security Administrator (admin@transitops.com)</span>
                </button>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Fleet Managers */}
                  <button
                    id="preset-login-fleet-manager-1"
                    onClick={() => handleQuickLogin('manager@transitops.com', 'manager123')}
                    className="p-2 border border-neutral-200 rounded hover:bg-neutral-50 text-left font-medium text-neutral-700"
                  >
                    <span className="font-bold block text-neutral-900">Fleet Manager #1</span>
                    Sarah Jenkins
                  </button>
                  <button
                    id="preset-login-fleet-manager-2"
                    onClick={() => handleQuickLogin('manager2@transitops.com', 'manager123')}
                    className="p-2 border border-neutral-200 rounded hover:bg-neutral-50 text-left font-medium text-neutral-700"
                  >
                    <span className="font-bold block text-neutral-900">Fleet Manager #2</span>
                    David Miller
                  </button>

                  {/* Drivers */}
                  <button
                    id="preset-login-driver-1"
                    onClick={() => handleQuickLogin('driver@transitops.com', 'driver123')}
                    className="p-2 border border-neutral-200 rounded hover:bg-neutral-50 text-left font-medium text-neutral-700"
                  >
                    <span className="font-bold block text-neutral-900">Driver #1</span>
                    Alex Carter
                  </button>
                  <button
                    id="preset-login-driver-2"
                    onClick={() => handleQuickLogin('driver2@transitops.com', 'driver123')}
                    className="p-2 border border-neutral-200 rounded hover:bg-neutral-50 text-left font-medium text-neutral-700"
                  >
                    <span className="font-bold block text-neutral-900">Driver #2</span>
                    Carlos Mendez
                  </button>

                  {/* Safety Officers */}
                  <button
                    id="preset-login-safety-officer-1"
                    onClick={() => handleQuickLogin('safety@transitops.com', 'safety123')}
                    className="p-2 border border-neutral-200 rounded hover:bg-neutral-50 text-left font-medium text-neutral-700"
                  >
                    <span className="font-bold block text-neutral-900">Safety Officer #1</span>
                    Marcus Vance
                  </button>
                  <button
                    id="preset-login-safety-officer-2"
                    onClick={() => handleQuickLogin('safety2@transitops.com', 'safety123')}
                    className="p-2 border border-neutral-200 rounded hover:bg-neutral-50 text-left font-medium text-neutral-700"
                  >
                    <span className="font-bold block text-neutral-900">Safety Officer #2</span>
                    Rachel Chen
                  </button>

                  {/* Financial Analysts */}
                  <button
                    id="preset-login-finance-1"
                    onClick={() => handleQuickLogin('finance@transitops.com', 'finance123')}
                    className="p-2 border border-neutral-200 rounded hover:bg-neutral-50 text-left font-medium text-neutral-700"
                  >
                    <span className="font-bold block text-neutral-900">Financial Analyst #1</span>
                    Elena Rostova
                  </button>
                  <button
                    id="preset-login-finance-2"
                    onClick={() => handleQuickLogin('finance2@transitops.com', 'finance123')}
                    className="p-2 border border-neutral-200 rounded hover:bg-neutral-50 text-left font-medium text-neutral-700"
                  >
                    <span className="font-bold block text-neutral-900">Financial Analyst #2</span>
                    Robert Sterling
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active Authenticated State
  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col">
      {/* Toast Banner (Top Slide-In) */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 max-w-sm w-full mx-auto px-4 z-50 pointer-events-none">
          <div
            id="global-toast-banner"
            className={`p-4 rounded-xl shadow-xl flex items-start gap-3 border pointer-events-auto animate-bounce ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : toast.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
            ) : (
              <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            )}
            <div>
              <p className="text-sm font-bold capitalize leading-none mb-1">{toast.type} alert</p>
              <p className="text-xs leading-relaxed">{toast.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Profile Viewing / Editing Modal */}
      {isProfileOpen && currentUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-neutral-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50 rounded-t-2xl">
              <div>
                <h3 className="text-lg font-extrabold text-neutral-800">Operator Profile Management</h3>
                <p className="text-xs text-neutral-500 font-mono mt-0.5">Secure TransitOps Profile Credentials</p>
              </div>
              <button
                id="close-profile-modal-btn"
                onClick={() => {
                  setIsProfileOpen(false);
                  setIsEditingProfile(false);
                }}
                className="p-1.5 hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {profileError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                  ⚠️ {profileError}
                </div>
              )}

              {!isEditingProfile ? (
                /* View Mode */
                <div className="space-y-6">
                  {/* Bio / Main Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-xl space-y-2">
                      <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider block">Identity & Role</span>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-neutral-800">{currentUser.name}</p>
                        <p className="text-xs text-neutral-500">{currentUser.email}</p>
                        <span className="inline-block px-2 py-0.5 mt-1 bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono font-extrabold text-[10px] rounded uppercase tracking-wider">
                          {currentUser.role}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-xl space-y-2">
                      <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider block">Biographics</span>
                      <div className="grid grid-cols-2 gap-2 text-xs text-neutral-700">
                        <div>
                          <span className="text-[10px] text-neutral-400 block">Age</span>
                          <span className="font-bold">{currentUser.age !== undefined ? `${currentUser.age} Years Old` : 'Not Specified'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-neutral-400 block">Gender</span>
                          <span className="font-bold">{currentUser.gender || 'Not Specified'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Professional Background Section */}
                  <div className="p-4 border border-neutral-200 rounded-xl space-y-4">
                    <span className="text-xs font-extrabold text-neutral-500 uppercase tracking-wider block border-b pb-1">
                      Professional Background
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-[10px] text-neutral-400 block">Former Employer / Old Work Place</span>
                        <p className="font-bold text-neutral-800 mt-0.5">
                          {currentUser.placeOfOldWork || 'None Specified'}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] text-neutral-400 block">Past Experience Description</span>
                        <p className="text-neutral-600 mt-1 whitespace-pre-wrap leading-relaxed">
                          {currentUser.pastExperienceText || 'No descriptive summary provided.'}
                        </p>
                      </div>
                    </div>

                    {/* Past Experience Credentials Doc Render */}
                    {currentUser.pastExperienceDoc ? (
                      <div className="space-y-1">
                        <span className="text-[10px] text-neutral-400 block">Past Experience Document</span>
                        <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">📄</span>
                            <div>
                              <p className="text-xs font-bold text-neutral-700">Past Experience Credentials</p>
                              <p className="text-[9px] text-neutral-400">Stored Securely (Base64 Format)</p>
                            </div>
                          </div>
                          {currentUser.pastExperienceDoc.startsWith('data:') ? (
                            <a
                              href={currentUser.pastExperienceDoc}
                              download="past_experience_credentials"
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold uppercase tracking-wider transition-colors border border-emerald-200"
                            >
                              Download / Open
                            </a>
                          ) : (
                            <span className="text-[10px] text-neutral-500 italic font-mono">{currentUser.pastExperienceDoc}</span>
                          )}
                        </div>
                        {currentUser.pastExperienceDoc.startsWith('data:image/') && (
                          <div className="mt-2 border border-neutral-100 rounded-lg p-2 bg-neutral-50/50 max-h-48 overflow-hidden flex justify-center">
                            <img
                              src={currentUser.pastExperienceDoc}
                              alt="Past Credentials Preview"
                              className="max-h-40 rounded object-contain shadow-sm"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-2 text-xs text-neutral-400 italic bg-neutral-50 border border-dashed rounded-lg">
                        No background credentials uploaded.
                      </div>
                    )}
                  </div>

                  {/* License and ID Section */}
                  <div className="p-4 border border-neutral-200 rounded-xl space-y-3">
                    <span className="text-xs font-extrabold text-neutral-500 uppercase tracking-wider block border-b pb-1">
                      Identity Verification & Licenses
                    </span>

                    {currentUser.licenseAndId ? (
                      <div className="space-y-1">
                        <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🪪</span>
                            <div>
                              <p className="text-xs font-bold text-neutral-700">Identity / License Document</p>
                              <p className="text-[9px] text-neutral-400">Stored Securely (Base64 Format)</p>
                            </div>
                          </div>
                          {currentUser.licenseAndId.startsWith('data:') ? (
                            <a
                              href={currentUser.licenseAndId}
                              download="license_identity_document"
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold uppercase tracking-wider transition-colors border border-emerald-200"
                            >
                              Download / Open
                            </a>
                          ) : (
                            <span className="text-[10px] text-neutral-500 italic font-mono">{currentUser.licenseAndId}</span>
                          )}
                        </div>
                        {currentUser.licenseAndId.startsWith('data:image/') && (
                          <div className="mt-2 border border-neutral-100 rounded-lg p-2 bg-neutral-50/50 max-h-48 overflow-hidden flex justify-center">
                            <img
                              src={currentUser.licenseAndId}
                              alt="License ID Preview"
                              className="max-h-40 rounded object-contain shadow-sm"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-2 text-xs text-neutral-400 italic bg-neutral-50 border border-dashed rounded-lg">
                        No License or ID reference document on file.
                      </div>
                    )}
                  </div>

                  {/* Driver Specific Deployment Grid */}
                  {currentUser.role === 'Driver' && (
                    <div className="p-4 border border-neutral-200 rounded-xl space-y-3 bg-neutral-50/50">
                      <span className="text-xs font-extrabold text-neutral-500 uppercase tracking-wider block border-b pb-1">
                        Driver Deployment Metrics
                      </span>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] text-neutral-400 block">Driving Experience</span>
                          <p className="font-bold text-neutral-800">{currentUser.drivingExperience !== undefined ? `${currentUser.drivingExperience} Years` : 'Not Set'}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-neutral-400 block">Mode of Work</span>
                          <p className="font-bold text-neutral-800">{currentUser.modeOfWork || 'Not Set'}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-neutral-400 block">Assigned Territory City</span>
                          <p className="font-bold text-neutral-800">{currentUser.placeOfWorkCity || 'Universal Duty'}</p>
                        </div>
                        {currentUser.placeOfWorkCity && (
                          <>
                            <div>
                              <span className="text-[10px] text-neutral-400 block">Preferred Vehicle Type</span>
                              <p className="font-bold text-neutral-800">{currentUser.cityVehicleType || 'Not Set'}</p>
                            </div>
                            <div>
                              <span className="text-[10px] text-neutral-400 block">City Experience</span>
                              <p className="font-bold text-neutral-800">{currentUser.cityExperienceYears !== undefined ? `${currentUser.cityExperienceYears} Years` : 'Not Set'}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Footer Buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
                    <button
                      id="edit-profile-btn"
                      onClick={() => setIsEditingProfile(true)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all uppercase tracking-wider"
                    >
                      Edit Profile Details
                    </button>
                    <button
                      id="close-profile-btn"
                      onClick={() => setIsProfileOpen(false)}
                      className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200 rounded-lg text-xs font-bold transition-all uppercase tracking-wider"
                    >
                      Close Window
                    </button>
                  </div>
                </div>
              ) : (
                /* Edit Mode */
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setProfileError('');
                    try {
                      const body = {
                        name: profileName,
                        age: profileAge ? Number(profileAge) : undefined,
                        gender: profileGender,
                        placeOfOldWork: profilePlaceOfOldWork || undefined,
                        pastExperienceDoc: profilePastExperienceDoc || undefined,
                        pastExperienceText: profilePastExperienceText || undefined,
                        licenseAndId: profileLicenseAndId || undefined,
                        ...(currentUser.role === 'Driver' && {
                          drivingExperience: profileDrivingExperience ? Number(profileDrivingExperience) : undefined,
                          placeOfWorkCity: profilePlaceOfWorkCity || undefined,
                          cityVehicleType: profileCityVehicleType || undefined,
                          cityExperienceYears: profileCityExperienceYears ? Number(profileCityExperienceYears) : undefined,
                          modeOfWork: profileModeOfWork
                        })
                      };

                      const res = await fetch(`/api/users/${currentUser.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                      });

                      if (!res.ok) {
                        const err = await res.json();
                        setProfileError(err.error || 'Failed to update profile.');
                        return;
                      }

                      const updatedUser = (await res.json()) as User;
                      localStorage.setItem('transitops_user', JSON.stringify(updatedUser));
                      setCurrentUser(updatedUser);
                      triggerToast('Profile updated successfully!', 'success');
                      setIsEditingProfile(false);
                    } catch (err) {
                      setProfileError('Failed to communicate with TransitOps API.');
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-neutral-600 uppercase">Operator Name</label>
                    <input
                      id="profile-edit-name"
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-neutral-600 uppercase">Age</label>
                      <input
                        id="profile-edit-age"
                        type="number"
                        placeholder="e.g., 34"
                        value={profileAge}
                        onChange={(e) => setProfileAge(e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-neutral-600 uppercase">Gender</label>
                      <select
                        id="profile-edit-gender"
                        value={profileGender}
                        onChange={(e) => setProfileGender(e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-neutral-600 uppercase">Place of Old Work</label>
                    <input
                      id="profile-edit-old-work"
                      type="text"
                      placeholder="Former Employer Name"
                      value={profilePlaceOfOldWork}
                      onChange={(e) => setProfilePlaceOfOldWork(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* ID / License Doc Uploader */}
                  <FileUploadField
                    id="profile-edit-id"
                    label="Identity & License Verification Document"
                    value={profileLicenseAndId}
                    fileName={profileLicenseAndIdName}
                    onChange={(base64, name) => {
                      setProfileLicenseAndId(base64);
                      setProfileLicenseAndIdName(name);
                    }}
                    onClear={() => {
                      setProfileLicenseAndId('');
                      setProfileLicenseAndIdName('');
                    }}
                  />

                  {/* Past Exp Doc Uploader */}
                  <FileUploadField
                    id="profile-edit-past-exp-doc"
                    label="Past Experience Credentials (Image, PDF, Doc)"
                    value={profilePastExperienceDoc}
                    fileName={profilePastExperienceDocName}
                    onChange={(base64, name) => {
                      setProfilePastExperienceDoc(base64);
                      setProfilePastExperienceDocName(name);
                    }}
                    onClear={() => {
                      setProfilePastExperienceDoc('');
                      setProfilePastExperienceDocName('');
                    }}
                  />

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-neutral-600 uppercase">Experience Description</label>
                    <textarea
                      id="profile-edit-past-exp-text"
                      rows={3}
                      placeholder="Briefly summarize your duties, accomplishments, or credentials..."
                      value={profilePastExperienceText}
                      onChange={(e) => setProfilePastExperienceText(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Driver Specific Fields */}
                  {currentUser.role === 'Driver' && (
                    <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg space-y-3">
                      <span className="block text-xs font-extrabold text-neutral-500 uppercase tracking-wider border-b pb-1">
                        Driver-Specific Information
                      </span>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-neutral-600">Driving Exp (Years)</label>
                          <input
                            id="profile-edit-driving-exp"
                            type="number"
                            value={profileDrivingExperience}
                            onChange={(e) => setProfileDrivingExperience(e.target.value)}
                            className="w-full px-2 py-1.5 border border-neutral-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-neutral-600">Mode of Work</label>
                          <select
                            id="profile-edit-mode"
                            value={profileModeOfWork}
                            onChange={(e) => setProfileModeOfWork(e.target.value as 'Cargo Loads' | 'Simple Loads')}
                            className="w-full px-2 py-1.5 border border-neutral-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="Simple Loads">Simple Loads</option>
                            <option value="Cargo Loads">Cargo Loads</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-neutral-600">Place of Work - City</label>
                        <input
                          id="profile-edit-city"
                          type="text"
                          value={profilePlaceOfWorkCity}
                          onChange={(e) => setProfilePlaceOfWorkCity(e.target.value)}
                          className="w-full px-2 py-1.5 border border-neutral-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      {profilePlaceOfWorkCity && (
                        <div className="grid grid-cols-2 gap-2 p-2 bg-white rounded border border-neutral-200">
                          <div className="space-y-1">
                            <label className="block text-[9px] font-bold text-neutral-500">Preferred Vehicle Type</label>
                            <input
                              id="profile-edit-city-vehicle"
                              type="text"
                              value={profileCityVehicleType}
                              onChange={(e) => setProfileCityVehicleType(e.target.value)}
                              className="w-full px-2 py-1 border border-neutral-200 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[9px] font-bold text-neutral-500">City Experience (Years)</label>
                            <input
                              id="profile-edit-city-exp"
                              type="number"
                              value={profileCityExperienceYears}
                              onChange={(e) => setProfileCityExperienceYears(e.target.value)}
                              className="w-full px-2 py-1 border border-neutral-200 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer Buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
                    <button
                      id="save-profile-btn"
                      type="submit"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all uppercase tracking-wider"
                    >
                      Save Changes
                    </button>
                    <button
                      id="cancel-edit-btn"
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200 rounded-lg text-xs font-bold transition-all uppercase tracking-wider"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main horizontal header navigation */}
      <header className="bg-neutral-900 text-neutral-100 shadow-md print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white border border-emerald-500">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <span className="font-extrabold text-white text-lg tracking-tight">TransitOps</span>
                <span className="hidden sm:inline text-[10px] uppercase font-bold tracking-widest text-emerald-500 block -mt-1 font-mono">
                  Smart Fleet Platform
                </span>
              </div>
            </div>

            {/* Actions / User Profile */}
            <div className="flex items-center gap-3 text-xs">
              <button
                id="platform-profile-btn"
                onClick={() => {
                  setProfileName(currentUser.name);
                  setProfileAge(currentUser.age !== undefined ? String(currentUser.age) : '');
                  setProfileGender(currentUser.gender || 'Male');
                  setProfilePlaceOfOldWork(currentUser.placeOfOldWork || '');
                  setProfilePastExperienceDoc(currentUser.pastExperienceDoc || '');
                  setProfilePastExperienceDocName(currentUser.pastExperienceDoc ? 'uploaded_past_experience_credentials' : '');
                  setProfilePastExperienceText(currentUser.pastExperienceText || '');
                  setProfileLicenseAndId(currentUser.licenseAndId || '');
                  setProfileLicenseAndIdName(currentUser.licenseAndId ? 'uploaded_license_id_doc' : '');
                  setProfileDrivingExperience(currentUser.drivingExperience !== undefined ? String(currentUser.drivingExperience) : '');
                  setProfilePlaceOfWorkCity(currentUser.placeOfWorkCity || '');
                  setProfileCityVehicleType(currentUser.cityVehicleType || '');
                  setProfileCityExperienceYears(currentUser.cityExperienceYears !== undefined ? String(currentUser.cityExperienceYears) : '');
                  setProfileModeOfWork(currentUser.modeOfWork || 'Simple Loads');
                  setProfileError('');
                  setIsEditingProfile(false);
                  setIsProfileOpen(true);
                }}
                className="text-left hidden md:flex flex-col items-end mr-2 hover:bg-neutral-800 p-1.5 rounded-lg border border-transparent hover:border-neutral-700 transition-all cursor-pointer group"
                title="View & Edit My Profile"
              >
                <span className="font-bold text-neutral-100 flex items-center gap-1 group-hover:text-emerald-400 transition-colors">
                  <UserIcon className="h-3.5 w-3.5 text-neutral-400 group-hover:text-emerald-400" /> {currentUser.name}
                </span>
                <span className="px-2 py-0.5 mt-0.5 bg-neutral-800 text-[10px] text-emerald-400 border border-neutral-700 font-extrabold rounded uppercase tracking-wider font-mono group-hover:bg-neutral-900 group-hover:border-emerald-500/30">
                  {currentUser.role}
                </span>
              </button>
              <button
                id="platform-logout-btn"
                onClick={handleLogout}
                className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-lg transition-colors flex items-center gap-1 shadow-inner border border-neutral-700"
                title="Logout Safe Session"
              >
                <LogOut className="h-4 w-4" /> <span className="hidden sm:inline font-semibold">Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Navigation Tabs Bar */}
        <div className="bg-neutral-800 border-t border-neutral-700 overflow-x-auto select-none">
          <div className="max-w-7xl mx-auto px-4 flex space-x-2 py-1">
            {[
              { id: 'Dashboard', label: 'Dashboard', icon: TrendingUp },
              { id: 'Vehicles', label: 'Vehicles', icon: Truck },
              { id: 'Drivers', label: 'Drivers', icon: Users },
              { id: 'Trips', label: 'Trips', icon: Compass },
              { id: 'Maintenance', label: 'Maintenance', icon: Wrench },
              { id: 'Expenses', label: 'Expenses & Fuel', icon: DollarSign },
              { id: 'Reports', label: 'Reports', icon: FileText },
              { id: 'Trust Center', label: 'Trust Center', icon: ShieldCheck },
              ...(currentUser?.role === 'Admin'
                ? [{ id: 'Admin', label: '🛡️ ZTCA Security Admin', icon: ShieldCheck }]
                : [])
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id || (tab.id === 'Expenses' && activeTab === 'Fuel');
              return (
                <button
                  key={tab.id}
                  id={`nav-tab-btn-${tab.id.toLowerCase()}`}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                    isActive
                      ? 'bg-neutral-900 text-emerald-400 font-black shadow-inner border border-neutral-700'
                      : tab.id === 'Admin'
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 hover:bg-cyan-900'
                      : 'text-neutral-300 hover:bg-neutral-700/50 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" /> {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ZTCA Context Simulator Bar */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <ZTCAContextWidget
          context={simulatedContext}
          onChangeContext={setSimulatedContext}
          userRole={currentUser?.role || 'Driver'}
        />
      </div>

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="animate-fade-in">{renderActiveView()}</div>
      </main>

      {/* Step-Up MFA Challenge Modal */}
      {isStepUpModalOpen && pendingStepUpAction && (
        <StepUpModal
          isOpen={isStepUpModalOpen}
          onClose={() => {
            setIsStepUpModalOpen(false);
            setPendingStepUpAction(null);
          }}
          onSuccess={(token) => {
            setStepUpToken(token);
            setIsStepUpModalOpen(false);
            if (pendingStepUpAction.retryFn) {
              pendingStepUpAction.retryFn();
            }
            triggerToast('Step-Up MFA Challenge Verified! ZTCA token issued.', 'success');
          }}
          actionName={pendingStepUpAction.actionName}
          reason={pendingStepUpAction.reason}
          riskScore={pendingStepUpAction.riskScore}
        />
      )}

      {/* Humble Footer */}
      <footer className="bg-neutral-50 border-t border-neutral-200 py-4 text-center text-[11px] text-neutral-400 font-mono tracking-wide print:hidden">
        TransitOps Logistics Platform © 2026. Designed for Durable JSON Data Persistence.
      </footer>
    </div>
  );
}
