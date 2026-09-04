export type UserRole = 'Fleet Manager' | 'Driver' | 'Safety Officer' | 'Financial Analyst' | 'Admin' | 'System';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  age?: number;
  gender?: string;
  licenseAndId?: string; // base64 or file name
  drivingExperience?: number; // years
  placeOfWorkCity?: string;
  cityVehicleType?: string;
  cityExperienceYears?: number;
  modeOfWork?: 'Cargo Loads' | 'Simple Loads';
}

export type VehicleStatus = 'Available' | 'On Trip' | 'In Shop' | 'Retired';

export interface Vehicle {
  id: string;
  registrationNumber: string;
  name: string;
  type: string;
  maxLoadCapacity: number; // in kg
  odometer: number; // in km
  acquisitionCost: number; // in $
  status: VehicleStatus;
  region: string;
}

export type DriverStatus = 'Available' | 'On Trip' | 'Off Duty' | 'Suspended';

export interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
  licenseCategory: 'Class A' | 'Class B' | 'Class C';
  licenseExpiryDate: string; // YYYY-MM-DD
  contactNumber: string;
  safetyScore: number; // 0-100
  status: DriverStatus;
  email?: string;
  age?: number;
  gender?: string;
  licenseAndId?: string;
  drivingExperience?: number; // years
  placeOfWorkCity?: string;
  cityVehicleType?: string;
  cityExperienceYears?: number;
  modeOfWork?: 'Cargo Loads' | 'Simple Loads';
}

export type TripStatus = 'Draft' | 'Dispatched' | 'Completed' | 'Cancelled';

export interface TripLogEntry {
  timestamp: string;
  status: string;
  note: string;
  location?: string;
}

export interface Trip {
  id: string;
  source: string;
  destination: string;
  vehicleId: string;
  driverId: string;
  cargoWeight: number; // in kg
  plannedDistance: number; // in km
  status: TripStatus;
  odometerStart: number;
  odometerEnd?: number;
  fuelConsumed?: number; // in liters
  createdAt: string; // ISO string
  completedAt?: string; // ISO string
  tripType?: 'Per Trip' | 'Monthly' | 'Contract';
  paymentStatus?: 'Paid' | 'Pending';
  logs?: TripLogEntry[];
}

export type MaintenanceStatus = 'Active' | 'Closed';

export interface Maintenance {
  id: string;
  vehicleId: string;
  description: string;
  cost: number;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  status: MaintenanceStatus;
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  liters: number;
  cost: number;
  date: string; // YYYY-MM-DD
  odometer: number;
  driverId?: string;
  purpose?: 'On Trip' | 'Maintenance' | 'Other';
}

export type ExpenseCategory = 'Fuel' | 'Maintenance' | 'Toll' | 'Insurance' | 'Permit' | 'Other';

export interface Expense {
  id: string;
  vehicleId?: string;
  tripId?: string;
  category: ExpenseCategory;
  cost: number;
  date: string; // YYYY-MM-DD
  description: string;
  creatorRole?: string;
}

export interface Notification {
  id: string;
  type: 'License Expiry' | 'Maintenance Due' | 'Safety Alert';
  message: string;
  date: string; // ISO string
  resolved: boolean;
}

export interface ActivityLog {
  id: string;
  action: string;
  user: string;
  timestamp: string; // ISO string
}
