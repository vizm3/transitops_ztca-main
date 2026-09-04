import { UserRole } from '../types.js';
export type { UserRole };

export type ZTCAOutcome = 'ALLOW' | 'BLOCK' | 'STEP_UP' | 'READ_ONLY';
export type ZTCARiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ZTCARequestContext {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: UserRole;
  deviceId: string;
  deviceBrowser: string;
  deviceOS: string;
  isKnownDevice: boolean;
  location: {
    lat: number;
    lng: number;
    city: string;
    country: string;
  };
  isKnownLocation: boolean;
  timestamp: string; // ISO string
  isOddHours: boolean; // e.g. 23:00 to 05:00
  endpoint: string;
  method: string;
  actionName: string;
  requiredPrivilege: 'READ_OPERATIONS' | 'WRITE_VEHICLES' | 'WRITE_DRIVERS' | 'DISPATCH_TRIP' | 'MANAGE_EXPENSES' | 'ADMIN_POLICIES' | 'SUPER_USER';
  stepUpToken?: string;
}

export interface RiskFactor {
  ruleId: string;
  name: string;
  score: number;
  description: string;
}

export interface RiskEvaluation {
  totalScore: number; // 0 - 100
  level: ZTCARiskLevel;
  factors: RiskFactor[];
}

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  targetRole?: UserRole | 'ALL';
  targetEndpointPattern?: string; // regex or prefix
  maxAllowedRisk: number; // e.g. 50
  requireKnownDevice?: boolean;
  requireKnownLocation?: boolean;
  requireBusinessHours?: boolean;
  actionIfViolated: ZTCAOutcome;
}

export interface ZTCADecision {
  outcome: ZTCAOutcome;
  riskScore: number;
  riskLevel: ZTCARiskLevel;
  reason: string;
  policyTriggered?: string;
  riskFactors: RiskFactor[];
  timestamp: string;
  stepUpChallenge?: string;
  // True when this decision was produced by a simulation/dry-run
  simulation?: boolean;
}

export interface ZTCAAuditLog {
  id: string;
  timestamp: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
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
    // Optional flag set when the log was produced by a simulation/dry-run
    simulation?: boolean;
    endpoint: string;
    method: string;
    actionName: string;
    requiredPrivilege: string;
  };
  risk: RiskEvaluation;
  decision: ZTCADecision;
}

export interface KnownDevice {
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

export interface KnownLocation {
  id: string;
  userId: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  label: string;
  status: 'TRUSTED' | 'SUSPICIOUS';
}
