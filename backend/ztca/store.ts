import fs from 'fs';
import path from 'path';
import {
  PolicyRule,
  ZTCAAuditLog,
  KnownDevice,
  KnownLocation,
  ZTCAOutcome
} from './types.js';

const DATA_DIR = path.resolve(process.cwd(), 'backend', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class JSONStore<T> {
  private filePath: string;

  constructor(fileName: string, initialData: T[]) {
    this.filePath = path.join(DATA_DIR, fileName);
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify(initialData, null, 2), 'utf-8');
    }
  }

  public read(): T[] {
    try {
      const content = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(content) as T[];
    } catch (e) {
      console.error(`Error reading ZTCA store: ${this.filePath}`, e);
      return [];
    }
  }

  public write(data: T[]): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error(`Error writing ZTCA store: ${this.filePath}`, e);
    }
  }
}

// Initial Default Policies according to NIST 800-207 Zero Trust Architecture
const DEFAULT_POLICIES: PolicyRule[] = [
  {
    id: 'pol_1_admin_protection',
    name: 'Super User / Admin Area Lockdown',
    description: 'Restricts ZTCA Admin Panel and policy modifications strictly to the Admin / Super User role. Any unauthorized attempt is immediately BLOCKED.',
    enabled: true,
    targetRole: 'ALL',
    targetEndpointPattern: '/api/admin',
    maxAllowedRisk: 30,
    actionIfViolated: 'BLOCK'
  },
  {
    id: 'pol_2_dispatch_stepup',
    name: 'High Risk Dispatch & Trip Scheduling Safeguard',
    description: 'Requires Step-Up verification (MFA/Pin) if dispatching or modifying trips when context risk score exceeds 40.',
    enabled: true,
    targetRole: 'ALL',
    targetEndpointPattern: '/api/trips',
    maxAllowedRisk: 40,
    requireKnownDevice: true,
    actionIfViolated: 'STEP_UP'
  },
  {
    id: 'pol_3_vehicle_driver_mod',
    name: 'Fleet Configuration Change Protection',
    description: 'Blocks modifying or deleting vehicle and driver records from unknown devices or unauthorized locations if risk score exceeds 50.',
    enabled: true,
    targetRole: 'ALL',
    targetEndpointPattern: '/api/(vehicles|drivers)',
    maxAllowedRisk: 50,
    requireKnownDevice: true,
    actionIfViolated: 'BLOCK'
  },
  {
    id: 'pol_4_financial_readonly',
    name: 'Financial Expenses Read-Only Downgrade',
    description: 'Downgrades expense modifications to Read-Only mode if user context exhibits medium-high risk (risk > 45).',
    enabled: true,
    targetRole: 'ALL',
    targetEndpointPattern: '/api/expenses',
    maxAllowedRisk: 45,
    actionIfViolated: 'READ_ONLY'
  },
  {
    id: 'pol_5_general_risk_cap',
    name: 'Universal Critical Threat Interceptor',
    description: 'Automatically blocks any API request across TransitOps if total calculated context risk score reaches Critical level (>= 75).',
    enabled: true,
    targetRole: 'ALL',
    targetEndpointPattern: '.*',
    maxAllowedRisk: 75,
    actionIfViolated: 'BLOCK'
  }
];

const DEFAULT_KNOWN_DEVICES: KnownDevice[] = [
  {
    id: 'dev_mgr_mac',
    userId: 'u1', // manager@transitops.com
    fingerprint: 'dev-macbook-pro-sf-hq',
    deviceName: 'Fleet HQ Workstation (MacBook Pro)',
    browser: 'Chrome 124',
    os: 'macOS Sonoma',
    addedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    lastUsed: new Date().toISOString(),
    status: 'TRUSTED'
  },
  {
    id: 'dev_admin_workstation',
    userId: 'u0', // admin@transitops.com
    fingerprint: 'dev-admin-secure-terminal',
    deviceName: 'ZTCA Admin Master Workstation',
    browser: 'Chrome 125',
    os: 'macOS Sequoia',
    addedAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    lastUsed: new Date().toISOString(),
    status: 'TRUSTED'
  },
  {
    id: 'dev_drv_pad',
    userId: 'u2', // driver@transitops.com
    fingerprint: 'dev-ipad-cab-terminal',
    deviceName: 'Cab Fleet Tablet',
    browser: 'Safari Mobile',
    os: 'iOS 17',
    addedAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    lastUsed: new Date().toISOString(),
    status: 'TRUSTED'
  }
];

const DEFAULT_KNOWN_LOCATIONS: KnownLocation[] = [
  {
    id: 'loc_sf_hq',
    userId: 'u1',
    city: 'San Francisco',
    country: 'United States',
    lat: 37.7749,
    lng: -122.4194,
    label: 'TransitOps Central HQ',
    status: 'TRUSTED'
  },
  {
    id: 'loc_admin_hq',
    userId: 'u0',
    city: 'San Francisco',
    country: 'United States',
    lat: 37.7749,
    lng: -122.4194,
    label: 'Security Operations Center',
    status: 'TRUSTED'
  },
  {
    id: 'loc_chi_hub',
    userId: 'u1',
    city: 'Chicago',
    country: 'United States',
    lat: 41.8781,
    lng: -87.6298,
    label: 'Midwest Distribution Depot',
    status: 'TRUSTED'
  }
];

export class ZTCAPolicyRepository {
  private store = new JSONStore<PolicyRule>('ztcaPolicies.json', DEFAULT_POLICIES);

  public getAll(): PolicyRule[] {
    return this.store.read();
  }

  public getById(id: string): PolicyRule | undefined {
    return this.store.read().find(p => p.id === id);
  }

  public update(id: string, updates: Partial<PolicyRule>): PolicyRule | undefined {
    const list = this.store.read();
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) return undefined;
    const updated = { ...list[idx], ...updates };
    list[idx] = updated;
    this.store.write(list);
    return updated;
  }

  public create(rule: Omit<PolicyRule, 'id'>): PolicyRule {
    const list = this.store.read();
    const newRule: PolicyRule = {
      ...rule,
      id: `pol_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    };
    list.push(newRule);
    this.store.write(list);
    return newRule;
  }

  public delete(id: string): boolean {
    const list = this.store.read();
    const filtered = list.filter(p => p.id !== id);
    if (filtered.length === list.length) return false;
    this.store.write(filtered);
    return true;
  }
}

export class ZTCAAuditRepository {
  private store = new JSONStore<ZTCAAuditLog>('ztcaAuditLogs.json', []);

  public getAll(): ZTCAAuditLog[] {
    return this.store.read().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public log(entry: Omit<ZTCAAuditLog, 'id'>): ZTCAAuditLog {
    const list = this.store.read();
    const newLog: ZTCAAuditLog = {
      ...entry,
      id: `ztca_${Date.now()}_${Math.floor(Math.random() * 10000)}`
    };
    // Keep max 500 logs
    const updated = [newLog, ...list].slice(0, 500);
    this.store.write(updated);
    return newLog;
  }

  public clear(): void {
    this.store.write([]);
  }
}

export class ZTCADeviceRepository {
  private store = new JSONStore<KnownDevice>('ztcaDevices.json', DEFAULT_KNOWN_DEVICES);

  public getAll(): KnownDevice[] {
    return this.store.read();
  }

  public isDeviceKnown(userId: string, fingerprint: string): boolean {
    const list = this.store.read();
    const match = list.find(d => d.userId === userId && d.fingerprint === fingerprint && d.status === 'TRUSTED');
    if (match) {
      // update last used
      match.lastUsed = new Date().toISOString();
      this.store.write(list);
      return true;
    }
    // Also check if fingerprint is universally trusted
    const uniMatch = list.find(d => d.fingerprint === fingerprint && d.status === 'TRUSTED');
    return !!uniMatch;
  }

  public addDevice(device: Omit<KnownDevice, 'id' | 'addedAt' | 'lastUsed'>): KnownDevice {
    const list = this.store.read();
    const newDev: KnownDevice = {
      ...device,
      id: `dev_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      addedAt: new Date().toISOString(),
      lastUsed: new Date().toISOString()
    };
    list.push(newDev);
    this.store.write(list);
    return newDev;
  }

  public updateStatus(id: string, status: 'TRUSTED' | 'REVOKED' | 'FLAGGED'): KnownDevice | undefined {
    const list = this.store.read();
    const idx = list.findIndex(d => d.id === id);
    if (idx === -1) return undefined;
    list[idx].status = status;
    this.store.write(list);
    return list[idx];
  }
}

export class ZTCALocationRepository {
  private store = new JSONStore<KnownLocation>('ztcaLocations.json', DEFAULT_KNOWN_LOCATIONS);

  public getAll(): KnownLocation[] {
    return this.store.read();
  }

  public isLocationKnown(userId: string, city: string): boolean {
    const list = this.store.read();
    const match = list.find(l => l.city.toLowerCase() === city.toLowerCase() && l.status === 'TRUSTED');
    return !!match;
  }

  public addLocation(loc: Omit<KnownLocation, 'id'>): KnownLocation {
    const list = this.store.read();
    const newLoc: KnownLocation = {
      ...loc,
      id: `loc_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    };
    list.push(newLoc);
    this.store.write(list);
    return newLoc;
  }
}
