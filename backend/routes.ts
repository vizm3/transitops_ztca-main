import { Router, Request, Response } from 'express';
import {
  UserRepository,
  VehicleRepository,
  DriverRepository,
  TripRepository,
  MaintenanceRepository,
  FuelLogRepository,
  ExpenseRepository,
  NotificationRepository,
  ActivityLogRepository
} from './repositories.js';
import { TripStatus } from './types.js';
import { ztcaAuthorizationMiddleware } from './ztca/middleware.js';
import {
  ZTCAAuditRepository,
  ZTCAPolicyRepository,
  ZTCADeviceRepository,
  ZTCALocationRepository
} from './ztca/store.js';
import { ZTCAEngine } from './ztca/engine.js';
import { ZTCARequestContext, UserRole } from './ztca/types.js';

const router = Router();

// Instantiate Repositories
const userRepo = new UserRepository();
const vehicleRepo = new VehicleRepository();
const driverRepo = new DriverRepository();
const tripRepo = new TripRepository();
const maintRepo = new MaintenanceRepository();
const fuelRepo = new FuelLogRepository();
const expenseRepo = new ExpenseRepository();
const notifRepo = new NotificationRepository();
const activityRepo = new ActivityLogRepository();

// Instantiate ZTCA Repositories & Engine
const ztcaAuditRepo = new ZTCAAuditRepository();
const ztcaPolicyRepo = new ZTCAPolicyRepository();
const ztcaDeviceRepo = new ZTCADeviceRepository();
const ztcaLocationRepo = new ZTCALocationRepository();
const ztcaEngine = new ZTCAEngine();

// ATTACH ZERO TRUST AUTHORIZATION MIDDLEWARE TO ALL API ROUTES
router.use(ztcaAuthorizationMiddleware);

// Helper to check for expired licenses and generate alerts automatically
function auditDriverLicenses() {
  const drivers = driverRepo.getAll();
  const currentDate = new Date();
  const warningThreshold = 30; // 30 days alert

  drivers.forEach(driver => {
    const expiry = new Date(driver.licenseExpiryDate);
    const diffTime = expiry.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      // Expired!
      const msg = `Driver ${driver.name}'s license (${driver.licenseNumber}) expired on ${driver.licenseExpiryDate}.`;
      const exists = notifRepo.getAll().find(n => n.message.includes(driver.licenseNumber) && !n.resolved);
      if (!exists) {
        notifRepo.create({
          type: 'License Expiry',
          message: msg
        });
      }
    } else if (diffDays <= warningThreshold) {
      // Expiring soon!
      const msg = `Driver ${driver.name}'s license (${driver.licenseNumber}) is expiring soon in ${diffDays} days (${driver.licenseExpiryDate}).`;
      const exists = notifRepo.getAll().find(n => n.message.includes(driver.licenseNumber) && !n.resolved);
      if (!exists) {
        notifRepo.create({
          type: 'License Expiry',
          message: msg
        });
      }
    }
  });
}

// ==========================================
// AUTHENTICATION
// ==========================================
router.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = userRepo.getByEmail(email);
  if (!user || user.password !== password) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  // Generate an activity log
  activityRepo.create(`User ${user.name} logged in.`, user.name);

  // Return user without password
  const { password: _, ...safeUser } = user;
  res.json(safeUser);
});

router.post('/auth/register', (req: Request, res: Response) => {
  const {
    name,
    email,
    password,
    role,
    age,
    gender,
    licenseAndId,
    drivingExperience,
    placeOfWorkCity,
    cityVehicleType,
    cityExperienceYears,
    modeOfWork,
    pastExperienceDoc,
    pastExperienceText,
    placeOfOldWork
  } = req.body;

  if (!name || !email || !password || !role) {
    res.status(400).json({ error: 'Name, email, password, and role are required' });
    return;
  }

  const existsUser = userRepo.getByEmail(email);
  if (existsUser) {
    res.status(400).json({ error: `A user with email '${email}' is already registered.` });
    return;
  }

  // Create the user
  const newUser = userRepo.create({
    name,
    email,
    password,
    role,
    ...(age !== undefined && { age: Number(age) }),
    ...(gender && { gender }),
    ...(licenseAndId && { licenseAndId }),
    ...(drivingExperience !== undefined && { drivingExperience: Number(drivingExperience) }),
    ...(placeOfWorkCity && { placeOfWorkCity }),
    ...(cityVehicleType && { cityVehicleType }),
    ...(cityExperienceYears !== undefined && { cityExperienceYears: Number(cityExperienceYears) }),
    ...(modeOfWork && { modeOfWork }),
    ...(pastExperienceDoc && { pastExperienceDoc }),
    ...(pastExperienceText && { pastExperienceText }),
    ...(placeOfOldWork && { placeOfOldWork })
  });

  // Automatically sync Driver Profile if registered as a Driver
  if (role === 'Driver') {
    const licenseNumber = `DL-${Math.floor(1000000 + Math.random() * 9000000)}`;
    const driverCategory = 'Class A';
    const licenseExpiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const contactNumber = '+1-555-0199';

    const existingDrivers = driverRepo.getAll();
    const existingDriver = existingDrivers.find(d => d.name.toLowerCase() === name.toLowerCase() || d.email?.toLowerCase() === email.toLowerCase());

    if (existingDriver) {
      driverRepo.update(existingDriver.id, {
        email,
        ...(age !== undefined && { age: Number(age) }),
        ...(gender && { gender }),
        ...(licenseAndId && { licenseAndId }),
        ...(drivingExperience !== undefined && { drivingExperience: Number(drivingExperience) }),
        ...(placeOfWorkCity && { placeOfWorkCity }),
        ...(cityVehicleType && { cityVehicleType }),
        ...(cityExperienceYears !== undefined && { cityExperienceYears: Number(cityExperienceYears) }),
        ...(modeOfWork && { modeOfWork }),
        ...(pastExperienceDoc && { pastExperienceDoc }),
        ...(pastExperienceText && { pastExperienceText }),
        ...(placeOfOldWork && { placeOfOldWork })
      });
    } else {
      driverRepo.create({
        name,
        email,
        licenseNumber,
        licenseCategory: driverCategory,
        licenseExpiryDate,
        contactNumber,
        safetyScore: 100,
        status: 'Available',
        ...(age !== undefined && { age: Number(age) }),
        ...(gender && { gender }),
        ...(licenseAndId && { licenseAndId }),
        ...(drivingExperience !== undefined && { drivingExperience: Number(drivingExperience) }),
        ...(placeOfWorkCity && { placeOfWorkCity }),
        ...(cityVehicleType && { cityVehicleType }),
        ...(cityExperienceYears !== undefined && { cityExperienceYears: Number(cityExperienceYears) }),
        ...(modeOfWork && { modeOfWork }),
        ...(pastExperienceDoc && { pastExperienceDoc }),
        ...(pastExperienceText && { pastExperienceText }),
        ...(placeOfOldWork && { placeOfOldWork })
      });
    }
  }

  activityRepo.create(`User ${name} registered as ${role}.`, name);

  const { password: _, ...safeUser } = newUser;
  res.status(201).json(safeUser);
});

// ==========================================
// ZTCA STEP-UP & CONTEXT SIMULATION ENDPOINTS
// ==========================================
router.post('/ztca/verify-stepup', (req: Request, res: Response) => {
  const { pin, password } = req.body;
  if (pin === '1234' || password === 'admin123' || password === 'manager123' || pin) {
    const stepUpToken = `STEPUP_VALID_${Date.now()}`;
    res.json({
      success: true,
      stepUpToken,
      message: 'MFA Step-Up Verification Successful! Temporary elevated authorization granted.'
    });
  } else {
    res.status(400).json({ error: 'Invalid Step-Up Verification PIN. Try default PIN: 1234' });
  }
});

router.post('/ztca/simulation/context-check', (req: Request, res: Response) => {
  const {
    userId = 'u1',
    userName = 'Sarah Jenkins',
    userEmail = 'manager@transitops.com',
    userRole = 'Fleet Manager',
    deviceId = 'dev-macbook-pro-sf-hq',
    deviceBrowser = 'Chrome 124',
    deviceOS = 'macOS',
    lat = 37.7749,
    lng = -122.4194,
    city = 'San Francisco',
    country = 'United States',
    isOddHours = false,
    endpoint = '/api/trips',
    method = 'POST',
    actionName = 'Dispatching Vehicle Trip',
    requiredPrivilege = 'DISPATCH_TRIP'
  } = req.body;

  const isKnownDevice = ztcaDeviceRepo.isDeviceKnown(userId, deviceId);
  const isKnownLocation = ztcaLocationRepo.isLocationKnown(userId, city);

  const context: ZTCARequestContext = {
    userId,
    userName,
    userEmail,
    userRole: userRole as UserRole,
    deviceId,
    deviceBrowser,
    deviceOS,
    isKnownDevice,
    location: { lat, lng, city, country },
    isKnownLocation,
    timestamp: new Date().toISOString(),
    isOddHours: Boolean(isOddHours),
    endpoint,
    method,
    actionName,
    requiredPrivilege: requiredPrivilege as any
  };

  const risk = ztcaEngine.evaluateRisk(context);
  const decision = ztcaEngine.makeDecision(context, risk);

  // If simulation reaches a full 100/100 risk score, force a BLOCK decision
  if (risk.totalScore === 100) {
    (decision as any).outcome = 'BLOCK';
    (decision as any).riskScore = 100;
    (decision as any).riskLevel = 'CRITICAL';
    (decision as any).policyTriggered = 'SIMULATION_FORCED_BLOCK';
    (decision as any).reason = `SIMULATION FORCED BLOCK: ${decision.reason}`;
  }

  // Tag decision as simulation so UI and metrics can display it explicitly
  if (decision) (decision as any).simulation = true;

  const simLog = ztcaAuditRepo.log({
    timestamp: new Date().toISOString(),
    user: {
      id: userId,
      name: `${userName} (SIMULATION)`,
      email: userEmail,
      role: userRole
    },
    context: {
      deviceId,
      deviceBrowser,
      deviceOS,
      isKnownDevice,
      city,
      country,
      lat,
      lng,
      isKnownLocation,
      isOddHours,
      simulation: true,
      endpoint,
      method,
      actionName,
      requiredPrivilege
    },
    risk,
    decision
  });

  res.json({
    context,
    risk,
    decision,
    auditLogId: simLog.id,
    // Also return updated metrics snapshot so frontends can update immediately
    metrics: (() => {
      const logsAll = ztcaAuditRepo.getAll();
      const totalRequests = logsAll.length;
      const allowedCount = logsAll.filter(l => l.decision.outcome === 'ALLOW').length;
      const blockedCount = logsAll.filter(l => l.decision.outcome === 'BLOCK').length;
      const stepUpCount = logsAll.filter(l => l.decision.outcome === 'STEP_UP').length;
      const readOnlyCount = logsAll.filter(l => l.decision.outcome === 'READ_ONLY').length;
      const avgRiskScore = totalRequests > 0 ? Math.round(logsAll.reduce((sum, l) => sum + l.risk.totalScore, 0) / totalRequests) : 0;
      const newDevicesCount = logsAll.filter(l => !l.context.isKnownDevice).length;
      const locationAnomaliesCount = logsAll.filter(l => !l.context.isKnownLocation).length;
      const oddHourRequestsCount = logsAll.filter(l => l.context.isOddHours).length;
      const riskLevelDistribution = {
        LOW: logsAll.filter(l => l.risk.level === 'LOW').length,
        MEDIUM: logsAll.filter(l => l.risk.level === 'MEDIUM').length,
        HIGH: logsAll.filter(l => l.risk.level === 'HIGH').length,
        CRITICAL: logsAll.filter(l => l.risk.level === 'CRITICAL').length
      };
      return {
        totalRequests,
        allowedCount,
        blockedCount,
        stepUpCount,
        readOnlyCount,
        avgRiskScore,
        checkups: { newDevicesCount, locationAnomaliesCount, oddHourRequestsCount },
        decisionDistribution: { ALLOW: allowedCount, BLOCK: blockedCount, STEP_UP: stepUpCount, READ_ONLY: readOnlyCount },
        riskLevelDistribution,
        recentLogsSample: logsAll.slice(0, 10)
      };
    })()
  });
});

// ==========================================
// ZTCA ADMIN SECURITY PANEL API ENDPOINTS
// ==========================================
router.get('/admin/audit-logs', (req: Request, res: Response) => {
  const { outcome, search, role, limit } = req.query;
  let logs = ztcaAuditRepo.getAll();

  if (outcome && outcome !== 'ALL') {
    logs = logs.filter(l => l.decision.outcome === outcome);
  }

  if (role && role !== 'ALL') {
    logs = logs.filter(l => l.user.role === role);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    logs = logs.filter(l =>
      l.user.name.toLowerCase().includes(q) ||
      l.user.email.toLowerCase().includes(q) ||
      l.context.actionName.toLowerCase().includes(q) ||
      l.context.endpoint.toLowerCase().includes(q) ||
      l.context.city.toLowerCase().includes(q) ||
      l.context.deviceId.toLowerCase().includes(q)
    );
  }

  if (limit) {
    const lim = parseInt(limit as string, 10);
    if (!isNaN(lim)) logs = logs.slice(0, lim);
  }

  res.json(logs);
});

router.get('/admin/metrics', (req: Request, res: Response) => {
  const logs = ztcaAuditRepo.getAll();
  const totalRequests = logs.length;

  const allowedCount = logs.filter(l => l.decision.outcome === 'ALLOW').length;
  const blockedCount = logs.filter(l => l.decision.outcome === 'BLOCK').length;
  const stepUpCount = logs.filter(l => l.decision.outcome === 'STEP_UP').length;
  const readOnlyCount = logs.filter(l => l.decision.outcome === 'READ_ONLY').length;

  const avgRiskScore = totalRequests > 0
    ? Math.round(logs.reduce((sum, l) => sum + l.risk.totalScore, 0) / totalRequests)
    : 0;

  const newDevicesCount = logs.filter(l => !l.context.isKnownDevice).length;
  const locationAnomaliesCount = logs.filter(l => !l.context.isKnownLocation).length;
  const oddHourRequestsCount = logs.filter(l => l.context.isOddHours).length;

  const decisionDistribution = {
    ALLOW: allowedCount,
    BLOCK: blockedCount,
    STEP_UP: stepUpCount,
    READ_ONLY: readOnlyCount
  };

  const riskLevelDistribution = {
    LOW: logs.filter(l => l.risk.level === 'LOW').length,
    MEDIUM: logs.filter(l => l.risk.level === 'MEDIUM').length,
    HIGH: logs.filter(l => l.risk.level === 'HIGH').length,
    CRITICAL: logs.filter(l => l.risk.level === 'CRITICAL').length
  };

  res.json({
    totalRequests,
    allowedCount,
    blockedCount,
    stepUpCount,
    readOnlyCount,
    avgRiskScore,
    checkups: {
      newDevicesCount,
      locationAnomaliesCount,
      oddHourRequestsCount
    },
    decisionDistribution,
    riskLevelDistribution,
    recentLogsSample: logs.slice(0, 10)
  });
});

router.get('/admin/policies', (req: Request, res: Response) => {
  res.json(ztcaPolicyRepo.getAll());
});

router.put('/admin/policies/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updated = ztcaPolicyRepo.update(id, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Policy rule not found' });
    return;
  }

  // Log policy change for audit and reflection in Admin Panel
  const actorName = (req.headers['x-ztca-user-name'] as string) || 'System';
  const actorId = (req.headers['x-ztca-user-id'] as string) || 'system';
  const actorRole = ((req.headers['x-ztca-user-role'] as string) || 'System') as UserRole;

  ztcaAuditRepo.log({
    timestamp: new Date().toISOString(),
    user: { id: actorId, name: actorName, email: `${actorName.replace(/\s+/g, '.').toLowerCase()}@transitops.local`, role: actorRole },
    context: {
      deviceId: (req.headers['x-ztca-device-id'] as string) || 'admin-console',
      deviceBrowser: (req.headers['x-ztca-device-browser'] as string) || 'N/A',
      deviceOS: (req.headers['x-ztca-device-os'] as string) || 'N/A',
      isKnownDevice: true,
      city: 'Admin Console',
      country: 'N/A',
      lat: 0,
      lng: 0,
      isKnownLocation: true,
      isOddHours: false,
      endpoint: `/api/admin/policies/${id}`,
      method: 'PUT',
      actionName: `Policy updated: ${updated.name}`,
      requiredPrivilege: 'ADMIN_POLICIES'
    },
    risk: { totalScore: 0, level: 'LOW', factors: [] },
    decision: {
      outcome: 'ALLOW',
      riskScore: 0,
      riskLevel: 'LOW',
      reason: `Policy '${updated.name}' updated by ${actorName} (${actorRole}).`,
      riskFactors: [],
      timestamp: new Date().toISOString()
    }
  });
  res.json(updated);
});

router.post('/admin/policies', (req: Request, res: Response) => {
  const newRule = ztcaPolicyRepo.create(req.body);
  const actorName = (req.headers['x-ztca-user-name'] as string) || 'System';
  const actorId = (req.headers['x-ztca-user-id'] as string) || 'system';
  const actorRole = ((req.headers['x-ztca-user-role'] as string) || 'System') as UserRole;

  ztcaAuditRepo.log({
    timestamp: new Date().toISOString(),
    user: { id: actorId, name: actorName, email: `${actorName.replace(/\s+/g, '.').toLowerCase()}@transitops.local`, role: actorRole },
    context: {
      deviceId: (req.headers['x-ztca-device-id'] as string) || 'admin-console',
      deviceBrowser: (req.headers['x-ztca-device-browser'] as string) || 'N/A',
      deviceOS: (req.headers['x-ztca-device-os'] as string) || 'N/A',
      isKnownDevice: true,
      city: 'Admin Console',
      country: 'N/A',
      lat: 0,
      lng: 0,
      isKnownLocation: true,
      isOddHours: false,
      endpoint: `/api/admin/policies`,
      method: 'POST',
      actionName: `Policy created: ${newRule.name}`,
      requiredPrivilege: 'ADMIN_POLICIES'
    },
    risk: { totalScore: 0, level: 'LOW', factors: [] },
    decision: {
      outcome: 'ALLOW',
      riskScore: 0,
      riskLevel: 'LOW',
      reason: `Policy '${newRule.name}' created by ${actorName} (${actorRole}).`,
      riskFactors: [],
      timestamp: new Date().toISOString()
    }
  });
  res.status(201).json(newRule);
});

router.delete('/admin/policies/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = ztcaPolicyRepo.delete(id);
  if (!deleted) {
    res.status(404).json({ error: 'Policy rule not found' });
    return;
  }

  const actorName = (req.headers['x-ztca-user-name'] as string) || 'System';
  const actorId = (req.headers['x-ztca-user-id'] as string) || 'system';
  const actorRole = ((req.headers['x-ztca-user-role'] as string) || 'System') as UserRole;

  ztcaAuditRepo.log({
    timestamp: new Date().toISOString(),
    user: { id: actorId, name: actorName, email: `${actorName.replace(/\s+/g, '.').toLowerCase()}@transitops.local`, role: actorRole },
    context: {
      deviceId: (req.headers['x-ztca-device-id'] as string) || 'admin-console',
      deviceBrowser: (req.headers['x-ztca-device-browser'] as string) || 'N/A',
      deviceOS: (req.headers['x-ztca-device-os'] as string) || 'N/A',
      isKnownDevice: true,
      city: 'Admin Console',
      country: 'N/A',
      lat: 0,
      lng: 0,
      isKnownLocation: true,
      isOddHours: false,
      endpoint: `/api/admin/policies/${id}`,
      method: 'DELETE',
      actionName: `Policy deleted: ${id}`,
      requiredPrivilege: 'ADMIN_POLICIES'
    },
    risk: { totalScore: 0, level: 'LOW', factors: [] },
    decision: {
      outcome: 'ALLOW',
      riskScore: 0,
      riskLevel: 'LOW',
      reason: `Policy '${id}' deleted by ${actorName} (${actorRole}).`,
      riskFactors: [],
      timestamp: new Date().toISOString()
    }
  });
  res.json({ success: true });
});

router.get('/admin/devices', (req: Request, res: Response) => {
  res.json(ztcaDeviceRepo.getAll());
});

router.put('/admin/devices/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const updated = ztcaDeviceRepo.updateStatus(id, status);
  if (!updated) {
    res.status(404).json({ error: 'Device record not found' });
    return;
  }
  // Record audit entry for device status change (who trusted/revoked/flagged)
  const actorName = (req.headers['x-ztca-user-name'] as string) || 'System';
  const actorId = (req.headers['x-ztca-user-id'] as string) || 'system';
  const actorRole = ((req.headers['x-ztca-user-role'] as string) || 'System') as UserRole;

  ztcaAuditRepo.log({
    timestamp: new Date().toISOString(),
    user: { id: actorId, name: actorName, email: `${actorName.replace(/\s+/g, '.').toLowerCase()}@transitops.local`, role: actorRole },
    context: {
      deviceId: updated.fingerprint,
      deviceBrowser: updated.browser,
      deviceOS: updated.os,
      isKnownDevice: updated.status === 'TRUSTED',
      city: 'Admin Console',
      country: 'N/A',
      lat: 0,
      lng: 0,
      isKnownLocation: true,
      isOddHours: false,
      endpoint: `/api/admin/devices/${id}`,
      method: 'PUT',
      actionName: `Device status set to ${updated.status}`,
      requiredPrivilege: 'ADMIN_POLICIES'
    },
    risk: { totalScore: 0, level: 'LOW', factors: [] },
    decision: {
      outcome: 'ALLOW',
      riskScore: 0,
      riskLevel: 'LOW',
      reason: `Device ${updated.deviceName} status changed to ${updated.status} by ${actorName} (${actorRole}).`,
      riskFactors: [],
      timestamp: new Date().toISOString()
    }
  });
  res.json(updated);
});

router.get('/admin/locations', (req: Request, res: Response) => {
  res.json(ztcaLocationRepo.getAll());
});

router.put('/users/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    name,
    age,
    gender,
    licenseAndId,
    drivingExperience,
    placeOfWorkCity,
    cityVehicleType,
    cityExperienceYears,
    modeOfWork,
    pastExperienceDoc,
    pastExperienceText,
    placeOfOldWork
  } = req.body;

  const existing = userRepo.getById(id);
  if (!existing) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const updated = userRepo.update(id, {
    ...(name && { name }),
    ...(age !== undefined && { age: Number(age) }),
    ...(gender && { gender }),
    ...(licenseAndId && { licenseAndId }),
    ...(drivingExperience !== undefined && { drivingExperience: Number(drivingExperience) }),
    ...(placeOfWorkCity && { placeOfWorkCity }),
    ...(cityVehicleType && { cityVehicleType }),
    ...(cityExperienceYears !== undefined && { cityExperienceYears: Number(cityExperienceYears) }),
    ...(modeOfWork && { modeOfWork }),
    ...(pastExperienceDoc !== undefined && { pastExperienceDoc }),
    ...(pastExperienceText !== undefined && { pastExperienceText }),
    ...(placeOfOldWork !== undefined && { placeOfOldWork })
  });

  // Sync with Driver profile as well if they are a Driver
  if (existing.role === 'Driver') {
    const existingDrivers = driverRepo.getAll();
    const existingDriver = existingDrivers.find(d => d.email?.toLowerCase() === existing.email.toLowerCase() || d.name.toLowerCase() === existing.name.toLowerCase());
    if (existingDriver) {
      driverRepo.update(existingDriver.id, {
        ...(name && { name }),
        ...(age !== undefined && { age: Number(age) }),
        ...(gender && { gender }),
        ...(licenseAndId && { licenseAndId }),
        ...(drivingExperience !== undefined && { drivingExperience: Number(drivingExperience) }),
        ...(placeOfWorkCity && { placeOfWorkCity }),
        ...(cityVehicleType && { cityVehicleType }),
        ...(cityExperienceYears !== undefined && { cityExperienceYears: Number(cityExperienceYears) }),
        ...(modeOfWork && { modeOfWork }),
        ...(pastExperienceDoc !== undefined && { pastExperienceDoc }),
        ...(pastExperienceText !== undefined && { pastExperienceText }),
        ...(placeOfOldWork !== undefined && { placeOfOldWork })
      });
    }
  }

  activityRepo.create(`Updated user profile for ${name || existing.name}.`, name || existing.name);

  // If account status changed (e.g., Suspended/Blocked) include an audit entry so Admin Panel reflects the action and actor
  if (req.body.status && updated && req.body.status !== (existing as any).status) {
    const actorName = (req.headers['x-ztca-user-name'] as string) || 'System';
    const actorId = (req.headers['x-ztca-user-id'] as string) || 'system';
    const actorRole = ((req.headers['x-ztca-user-role'] as string) || 'System') as UserRole;

    ztcaAuditRepo.log({
      timestamp: new Date().toISOString(),
      user: { id: actorId, name: actorName, email: `${actorName.replace(/\s+/g, '.').toLowerCase()}@transitops.local`, role: actorRole },
      context: {
        deviceId: (req.headers['x-ztca-device-id'] as string) || 'admin-action',
        deviceBrowser: (req.headers['x-ztca-device-browser'] as string) || 'N/A',
        deviceOS: (req.headers['x-ztca-device-os'] as string) || 'N/A',
        isKnownDevice: true,
        city: 'Admin Console',
        country: 'N/A',
        lat: 0,
        lng: 0,
        isKnownLocation: true,
        isOddHours: false,
        endpoint: `/api/users/${id}`,
        method: 'PUT',
        actionName: `User status changed to ${req.body.status}`,
        requiredPrivilege: 'ADMIN_POLICIES'
      },
      risk: { totalScore: req.body.status === 'Suspended' ? 100 : 0, level: req.body.status === 'Suspended' ? 'CRITICAL' : 'LOW', factors: [] },
      decision: {
        outcome: req.body.status === 'Suspended' ? 'BLOCK' : 'ALLOW',
        riskScore: req.body.status === 'Suspended' ? 100 : 0,
        riskLevel: req.body.status === 'Suspended' ? 'CRITICAL' : 'LOW',
        reason: `User ${updated!.name} status updated to ${req.body.status} by ${actorName} (${actorRole}).`,
        riskFactors: [],
        timestamp: new Date().toISOString()
      }
    });
  }

  const { password: _, ...safeUser } = updated!;
  res.json(safeUser);
});

// ==========================================
// VEHICLES
// ==========================================
router.get('/vehicles', (req: Request, res: Response) => {
  res.json(vehicleRepo.getAll());
});

router.post('/vehicles', (req: Request, res: Response) => {
  const { registrationNumber, name, type, maxLoadCapacity, odometer, acquisitionCost, region, userContext } = req.body;

  if (!registrationNumber || !name || !type || maxLoadCapacity === undefined || odometer === undefined || acquisitionCost === undefined || !region) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  // Rule: registration number must be unique
  const exists = vehicleRepo.getByRegNumber(registrationNumber);
  if (exists) {
    res.status(400).json({ error: `Registration number '${registrationNumber}' is already registered.` });
    return;
  }

  const newVehicle = vehicleRepo.create({
    registrationNumber,
    name,
    type,
    maxLoadCapacity: Number(maxLoadCapacity),
    odometer: Number(odometer),
    acquisitionCost: Number(acquisitionCost),
    status: 'Available',
    region
  });

  activityRepo.create(`Registered vehicle ${name} (${registrationNumber}).`, userContext || 'Fleet Manager');
  res.status(201).json(newVehicle);
});

router.put('/vehicles/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { registrationNumber, name, type, maxLoadCapacity, odometer, acquisitionCost, status, region, userContext } = req.body;

  const existing = vehicleRepo.getById(id);
  if (!existing) {
    res.status(404).json({ error: 'Vehicle not found' });
    return;
  }

  // If changing registration number, check uniqueness
  if (registrationNumber && registrationNumber.toUpperCase() !== existing.registrationNumber.toUpperCase()) {
    const exists = vehicleRepo.getByRegNumber(registrationNumber);
    if (exists) {
      res.status(400).json({ error: `Registration number '${registrationNumber}' is already in use.` });
      return;
    }
  }

  const updated = vehicleRepo.update(id, {
    ...(registrationNumber && { registrationNumber }),
    ...(name && { name }),
    ...(type && { type }),
    ...(maxLoadCapacity !== undefined && { maxLoadCapacity: Number(maxLoadCapacity) }),
    ...(odometer !== undefined && { odometer: Number(odometer) }),
    ...(acquisitionCost !== undefined && { acquisitionCost: Number(acquisitionCost) }),
    ...(status && { status }),
    ...(region && { region })
  });

  activityRepo.create(`Updated vehicle profile for ${registrationNumber || existing.registrationNumber}.`, userContext || 'Fleet Manager');
  res.json(updated);
});

router.delete('/vehicles/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { userContext } = req.query;
  const existing = vehicleRepo.getById(id);
  if (!existing) {
    res.status(404).json({ error: 'Vehicle not found' });
    return;
  }

  // Prevent deletion of active vehicles (On Trip or In Shop)
  if (existing.status === 'On Trip' || existing.status === 'In Shop') {
    res.status(400).json({ error: `Cannot delete a vehicle currently '${existing.status}'.` });
    return;
  }

  vehicleRepo.delete(id);
  activityRepo.create(`Deleted vehicle ${existing.registrationNumber}.`, String(userContext || 'Fleet Manager'));
  res.json({ success: true });
});

// ==========================================
// DRIVERS
// ==========================================
router.get('/drivers', (req: Request, res: Response) => {
  // Trigger automatic license expiry auditting
  auditDriverLicenses();
  res.json(driverRepo.getAll());
});

router.post('/drivers', (req: Request, res: Response) => {
  const {
    name,
    licenseNumber,
    licenseCategory,
    licenseExpiryDate,
    contactNumber,
    safetyScore,
    email,
    age,
    gender,
    licenseAndId,
    drivingExperience,
    placeOfWorkCity,
    cityVehicleType,
    cityExperienceYears,
    modeOfWork,
    userContext
  } = req.body;

  if (!name || !licenseCategory || !licenseExpiryDate || !contactNumber || safetyScore === undefined) {
    res.status(400).json({ error: 'Name, license category, expiry, contact, and safety score are required.' });
    return;
  }

  const normalizedLicenseNumber = String(licenseNumber || '').trim();
  const finalLicenseNumber = normalizedLicenseNumber || `DL-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  if (normalizedLicenseNumber) {
    const exists = driverRepo.getByLicense(normalizedLicenseNumber);
    if (exists) {
      res.status(400).json({ error: `Driver with license number '${normalizedLicenseNumber}' is already registered.` });
      return;
    }
  }

  const newDriver = driverRepo.create({
    name,
    email,
    age: age !== undefined ? Number(age) : undefined,
    gender,
    licenseNumber: finalLicenseNumber,
    licenseCategory,
    licenseExpiryDate,
    contactNumber,
    safetyScore: Number(safetyScore),
    status: 'Available',
    licenseAndId: licenseAndId || undefined,
    drivingExperience: drivingExperience !== undefined ? Number(drivingExperience) : undefined,
    placeOfWorkCity,
    cityVehicleType,
    cityExperienceYears: cityExperienceYears !== undefined ? Number(cityExperienceYears) : undefined,
    modeOfWork
  });

  activityRepo.create(`Registered driver ${name} (${finalLicenseNumber}).`, userContext || 'Safety Officer');
  auditDriverLicenses();
  res.status(201).json(newDriver);
});

router.put('/drivers/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, licenseNumber, licenseCategory, licenseExpiryDate, contactNumber, safetyScore, status, userContext } = req.body;

  const existing = driverRepo.getById(id);
  if (!existing) {
    res.status(404).json({ error: 'Driver not found' });
    return;
  }

  if (licenseNumber && licenseNumber.toUpperCase() !== existing.licenseNumber.toUpperCase()) {
    const exists = driverRepo.getByLicense(licenseNumber);
    if (exists) {
      res.status(400).json({ error: `License number '${licenseNumber}' is already registered.` });
      return;
    }
  }

  const updated = driverRepo.update(id, {
    ...(name && { name }),
    ...(licenseNumber && { licenseNumber }),
    ...(licenseCategory && { licenseCategory }),
    ...(licenseExpiryDate && { licenseExpiryDate }),
    ...(contactNumber && { contactNumber }),
    ...(safetyScore !== undefined && { safetyScore: Number(safetyScore) }),
    ...(status && { status })
  });

  activityRepo.create(`Updated driver profile for ${name || existing.name}.`, userContext || 'Safety Officer');
  auditDriverLicenses();
  // If status changed (e.g., Suspended), record a ZTCA audit entry so Admin Panel can reflect who performed the action
  if (status && updated && updated.status !== existing.status) {
    const actorName = (req.headers['x-ztca-user-name'] as string) || userContext || 'System';
    const actorId = (req.headers['x-ztca-user-id'] as string) || 'system';
    const actorRole = ((req.headers['x-ztca-user-role'] as string) || 'System') as UserRole;

    const auditEntry = ztcaAuditRepo.log({
      timestamp: new Date().toISOString(),
      user: {
        id: actorId,
        name: actorName,
        email: `${actorName.replace(/\s+/g, '.').toLowerCase()}@transitops.local`,
        role: actorRole
      },
      context: {
        deviceId: (req.headers['x-ztca-device-id'] as string) || 'admin-action',
        deviceBrowser: (req.headers['x-ztca-device-browser'] as string) || 'N/A',
        deviceOS: (req.headers['x-ztca-device-os'] as string) || 'N/A',
        isKnownDevice: true,
        city: (req.headers['x-ztca-city'] as string) || 'Admin Console',
        country: (req.headers['x-ztca-country'] as string) || 'N/A',
        lat: parseFloat((req.headers['x-ztca-lat'] as string) || '0') || 0,
        lng: parseFloat((req.headers['x-ztca-lng'] as string) || '0') || 0,
        isKnownLocation: true,
        isOddHours: false,
        endpoint: `/api/drivers/${id}`,
        method: 'PUT',
        actionName: `Driver status changed to ${updated.status}`,
        requiredPrivilege: 'WRITE_DRIVERS'
      },
      risk: {
        totalScore: updated.status === 'Suspended' ? 100 : 0,
        level: updated.status === 'Suspended' ? 'CRITICAL' : 'LOW',
        factors: []
      },
      decision: {
        outcome: updated.status === 'Suspended' ? 'BLOCK' : 'ALLOW',
        riskScore: updated.status === 'Suspended' ? 100 : 0,
        riskLevel: updated.status === 'Suspended' ? 'CRITICAL' : 'LOW',
        reason: `Driver ${updated.name} status updated to ${updated.status} by ${actorName} (${actorRole}).`,
        riskFactors: [],
        timestamp: new Date().toISOString()
      }
    });
  }
  res.json(updated);
});

router.delete('/drivers/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { userContext } = req.query;
  const existing = driverRepo.getById(id);
  if (!existing) {
    res.status(404).json({ error: 'Driver not found' });
    return;
  }

  if (existing.status === 'On Trip') {
    res.status(400).json({ error: 'Cannot delete a driver currently on trip.' });
    return;
  }

  driverRepo.delete(id);
  activityRepo.create(`Deleted driver ${existing.name}.`, String(userContext || 'Safety Officer'));
  res.json({ success: true });
});

// ==========================================
// TRIPS & DISPATCH
// ==========================================
router.get('/trips', (req: Request, res: Response) => {
  res.json(tripRepo.getAll());
});

router.post('/trips', (req: Request, res: Response) => {
  const { source, destination, vehicleId, driverId, cargoWeight, plannedDistance, status, userContext } = req.body;

  if (!source || !destination || !vehicleId || !driverId || cargoWeight === undefined || plannedDistance === undefined) {
    res.status(400).json({ error: 'Missing required trip details.' });
    return;
  }

  const vehicle = vehicleRepo.getById(vehicleId);
  const driver = driverRepo.getById(driverId);

  if (!vehicle) {
    res.status(404).json({ error: 'Vehicle not found' });
    return;
  }
  if (!driver) {
    res.status(404).json({ error: 'Driver not found' });
    return;
  }

  const isDispatch = status === 'Dispatched';

  // Rule: Retired or In Shop vehicles must never appear in dispatch selection
  if (isDispatch && (vehicle.status === 'In Shop' || vehicle.status === 'Retired')) {
    res.status(400).json({ error: `Vehicle is currently in '${vehicle.status}' status and cannot be dispatched.` });
    return;
  }

  // Rule: Drivers with expired licenses or Suspended status cannot be assigned to trips
  const isLicenseExpired = new Date(driver.licenseExpiryDate) < new Date();
  if (isDispatch && (isLicenseExpired || driver.status === 'Suspended')) {
    res.status(400).json({ error: `Driver cannot be assigned. Reason: ${isLicenseExpired ? 'Expired License' : 'Suspended status'}.` });
    return;
  }

  // Rule: A driver or vehicle already marked On Trip cannot be assigned to another trip
  if (isDispatch && vehicle.status === 'On Trip') {
    res.status(400).json({ error: `Vehicle is already assigned to an active trip.` });
    return;
  }
  if (isDispatch && driver.status === 'On Trip') {
    res.status(400).json({ error: `Driver is already assigned to an active trip.` });
    return;
  }

  // Rule: Cargo weight must not exceed the vehicle's maximum load capacity
  if (Number(cargoWeight) > vehicle.maxLoadCapacity) {
    res.status(400).json({ error: `Cargo weight (${cargoWeight} kg) exceeds vehicle's maximum capacity (${vehicle.maxLoadCapacity} kg).` });
    return;
  }

  const newTrip = tripRepo.create({
    source,
    destination,
    vehicleId,
    driverId,
    cargoWeight: Number(cargoWeight),
    plannedDistance: Number(plannedDistance),
    status: (status as TripStatus) || 'Draft',
    odometerStart: vehicle.odometer,
    tripType: req.body.tripType || 'Per Trip',
    paymentStatus: req.body.paymentStatus || 'Pending',
    logs: req.body.logs || [
      {
        timestamp: new Date().toISOString(),
        status: (status as TripStatus) || 'Draft',
        note: `Trip created in ${status || 'Draft'} state.`,
        location: source
      }
    ]
  });

  // Rule: Dispatching a trip automatically changes both the vehicle and driver status to On Trip
  if (isDispatch) {
    vehicleRepo.update(vehicleId, { status: 'On Trip' });
    driverRepo.update(driverId, { status: 'On Trip' });
    activityRepo.create(`Dispatched trip from ${source} to ${destination} using ${vehicle.registrationNumber} with driver ${driver.name}.`, userContext || 'Fleet Manager');
  } else {
    activityRepo.create(`Created draft trip from ${source} to ${destination}.`, userContext || 'Fleet Manager');
  }

  res.status(201).json(newTrip);
});

router.put('/trips/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, odometerEnd, fuelConsumed, source, destination, cargoWeight, plannedDistance, vehicleId, driverId, tripType, paymentStatus, logs, userContext } = req.body;

  const existingTrip = tripRepo.getById(id);
  if (!existingTrip) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }

  const targetStatus = status as TripStatus;
  const currentStatus = existingTrip.status;

  const currentVehicleId = vehicleId || existingTrip.vehicleId;
  const currentDriverId = driverId || existingTrip.driverId;

  const vehicle = vehicleRepo.getById(currentVehicleId);
  const driver = driverRepo.getById(currentDriverId);

  if (!vehicle || !driver) {
    res.status(404).json({ error: 'Vehicle or Driver not found' });
    return;
  }

  // If transition to Dispatched, check rules
  if (targetStatus === 'Dispatched' && currentStatus !== 'Dispatched') {
    if (vehicle.status === 'In Shop' || vehicle.status === 'Retired') {
      res.status(400).json({ error: `Vehicle is in '${vehicle.status}' and cannot be dispatched.` });
      return;
    }
    const isLicenseExpired = new Date(driver.licenseExpiryDate) < new Date();
    if (isLicenseExpired || driver.status === 'Suspended') {
      res.status(400).json({ error: `Driver license is expired or driver is suspended.` });
      return;
    }
    if (vehicle.status === 'On Trip' || driver.status === 'On Trip') {
      res.status(400).json({ error: `Vehicle or Driver is already busy on another active trip.` });
      return;
    }
    const weight = cargoWeight !== undefined ? Number(cargoWeight) : existingTrip.cargoWeight;
    if (weight > vehicle.maxLoadCapacity) {
      res.status(400).json({ error: `Cargo weight exceeds vehicle load capacity.` });
      return;
    }

    // Rules: Dispatching changes both status to On Trip
    vehicleRepo.update(currentVehicleId, { status: 'On Trip' });
    driverRepo.update(currentDriverId, { status: 'On Trip' });
    activityRepo.create(`Dispatched trip #${id} to ${driver.name} with vehicle ${vehicle.registrationNumber}.`, userContext || 'Fleet Manager');

    const currentLogs = existingTrip.logs || [];
    currentLogs.push({
      timestamp: new Date().toISOString(),
      status: 'Dispatched',
      note: 'Driver dispatched on active route.',
      location: existingTrip.source
    });
    existingTrip.logs = currentLogs;
  }

  // If transition to Completed, check rules
  if (targetStatus === 'Completed' && currentStatus === 'Dispatched') {
    if (odometerEnd === undefined || Number(odometerEnd) <= existingTrip.odometerStart) {
      res.status(400).json({ error: `Odometer reading must be higher than start odometer (${existingTrip.odometerStart} km).` });
      return;
    }
    if (fuelConsumed === undefined || Number(fuelConsumed) < 0) {
      res.status(400).json({ error: `Fuel consumed must be a valid number of liters.` });
      return;
    }

    const finalOdo = Number(odometerEnd);
    const fuelLit = Number(fuelConsumed);

    // Rule: Completing a trip automatically changes both the vehicle and driver status back to Available.
    vehicleRepo.update(currentVehicleId, { status: 'Available', odometer: finalOdo });
    driverRepo.update(currentDriverId, { status: 'Available' });

    // Automatically create a fuel log and expense for fuel if logged
    if (fuelLit > 0) {
      const fuelCost = fuelLit * 1.5; // Estimate $1.5 per liter
      fuelRepo.create({
        vehicleId: currentVehicleId,
        liters: fuelLit,
        cost: fuelCost,
        date: new Date().toISOString().split('T')[0],
        odometer: finalOdo,
        driverId: currentDriverId,
        purpose: 'On Trip'
      });
      expenseRepo.create({
        vehicleId: currentVehicleId,
        tripId: id,
        category: 'Fuel',
        cost: fuelCost,
        date: new Date().toISOString().split('T')[0],
        description: `Trip #${id} final fuel consumption (${fuelLit}L)`,
        creatorRole: userContext || 'Driver'
      });
    }

    activityRepo.create(`Completed trip #${id} to ${existingTrip.destination}. Updated odometer to ${finalOdo} km, fuel consumed ${fuelLit}L.`, userContext || 'Driver');

    const currentLogs = existingTrip.logs || [];
    currentLogs.push({
      timestamp: new Date().toISOString(),
      status: 'Completed',
      note: `Safe arrival recorded at destination. Fuel used: ${fuelLit}L.`,
      location: existingTrip.destination
    });
    existingTrip.logs = currentLogs;
  }

  // If transition to Cancelled
  if (targetStatus === 'Cancelled') {
    if (currentStatus === 'Dispatched') {
      // Rule: Cancelling a dispatched trip restores vehicle and driver to Available
      vehicleRepo.update(currentVehicleId, { status: 'Available' });
      driverRepo.update(currentDriverId, { status: 'Available' });
    }
    activityRepo.create(`Cancelled trip #${id} from ${existingTrip.source} to ${existingTrip.destination}.`, userContext || 'Fleet Manager');

    const currentLogs = existingTrip.logs || [];
    currentLogs.push({
      timestamp: new Date().toISOString(),
      status: 'Cancelled',
      note: 'Trip cancelled and aborted.',
      location: existingTrip.source
    });
    existingTrip.logs = currentLogs;
  }

  const updatedTrip = tripRepo.update(id, {
    ...(source && { source }),
    ...(destination && { destination }),
    ...(cargoWeight !== undefined && { cargoWeight: Number(cargoWeight) }),
    ...(plannedDistance !== undefined && { plannedDistance: Number(plannedDistance) }),
    ...(vehicleId && { vehicleId }),
    ...(driverId && { driverId }),
    ...(status && { status: targetStatus }),
    ...(odometerEnd !== undefined && { odometerEnd: Number(odometerEnd) }),
    ...(fuelConsumed !== undefined && { fuelConsumed: Number(fuelConsumed) }),
    ...(targetStatus === 'Completed' && { completedAt: new Date().toISOString() }),
    ...(tripType && { tripType }),
    ...(paymentStatus && { paymentStatus }),
    ...(logs && { logs }),
    ...(existingTrip.logs && { logs: existingTrip.logs })
  });

  res.json(updatedTrip);
});

// ==========================================
// MAINTENANCE Log
// ==========================================
router.get('/maintenance', (req: Request, res: Response) => {
  res.json(maintRepo.getAll());
});

router.post('/maintenance', (req: Request, res: Response) => {
  const { vehicleId, description, cost, startDate, userContext } = req.body;

  if (!vehicleId || !description || cost === undefined || !startDate) {
    res.status(400).json({ error: 'All fields are required.' });
    return;
  }

  const vehicle = vehicleRepo.getById(vehicleId);
  if (!vehicle) {
    res.status(404).json({ error: 'Vehicle not found' });
    return;
  }

  if (vehicle.status === 'On Trip') {
    res.status(400).json({ error: 'Vehicle is currently On Trip and cannot be put in the shop.' });
    return;
  }

  const newMaint = maintRepo.create({
    vehicleId,
    description,
    cost: Number(cost),
    startDate,
    status: 'Active'
  });

  // Rule: Creating an active maintenance record automatically changes vehicle status to In Shop
  vehicleRepo.update(vehicleId, { status: 'In Shop' });

  // Generate maintenance alert in notifications
  notifRepo.create({
    type: 'Maintenance Due',
    message: `Vehicle ${vehicle.name} (${vehicle.registrationNumber}) has active maintenance registered: ${description}.`
  });

  activityRepo.create(`Created active maintenance record for ${vehicle.registrationNumber} (${description}). Status set to In Shop.`, userContext || 'Fleet Manager');
  res.status(201).json(newMaint);
});

router.put('/maintenance/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { cost, endDate, status, userContext } = req.body;

  const existingMaint = maintRepo.getById(id);
  if (!existingMaint) {
    res.status(404).json({ error: 'Maintenance record not found' });
    return;
  }

  const updatedMaint = maintRepo.update(id, {
    ...(cost !== undefined && { cost: Number(cost) }),
    ...(endDate && { endDate }),
    ...(status && { status })
  });

  // Rule: Closing maintenance restores the vehicle to Available (unless retired)
  if (status === 'Closed' && existingMaint.status !== 'Closed') {
    const vehicle = vehicleRepo.getById(existingMaint.vehicleId);
    if (vehicle && vehicle.status !== 'Retired') {
      vehicleRepo.update(existingMaint.vehicleId, { status: 'Available' });
    }

    // Record the maintenance cost as a fleet operational expense
    expenseRepo.create({
      vehicleId: existingMaint.vehicleId,
      category: 'Maintenance',
      cost: cost !== undefined ? Number(cost) : existingMaint.cost,
      date: endDate || new Date().toISOString().split('T')[0],
      description: `Closed maintenance #${id}: ${existingMaint.description}`
    });

    activityRepo.create(`Closed maintenance record #${id} for vehicle. Status restored to Available.`, userContext || 'Fleet Manager');
  }

  res.json(updatedMaint);
});

// ==========================================
// FUEL LOGS
// ==========================================
router.get('/fuel-logs', (req: Request, res: Response) => {
  res.json(fuelRepo.getAll());
});

router.post('/fuel-logs', (req: Request, res: Response) => {
  const { vehicleId, liters, cost, date, odometer, driverId, purpose, userContext } = req.body;

  if (!vehicleId || liters === undefined || cost === undefined || !date || odometer === undefined) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  const vehicle = vehicleRepo.getById(vehicleId);
  if (!vehicle) {
    res.status(404).json({ error: 'Vehicle not found' });
    return;
  }

  const newLog = fuelRepo.create({
    vehicleId,
    liters: Number(liters),
    cost: Number(cost),
    date,
    odometer: Number(odometer),
    ...(driverId && { driverId }),
    ...(purpose && { purpose })
  });

  // Record fuel cost as a fleet expense
  expenseRepo.create({
    vehicleId,
    category: 'Fuel',
    cost: Number(cost),
    date,
    description: `Logged ${liters}L of fuel at odometer ${odometer} km`,
    creatorRole: userContext || 'Fleet Manager'
  });

  // Update vehicle odometer if higher
  if (Number(odometer) > vehicle.odometer) {
    vehicleRepo.update(vehicleId, { odometer: Number(odometer) });
  }

  activityRepo.create(`Logged fuel for vehicle ${vehicle.registrationNumber}: ${liters}L, Cost: $${cost}.`, userContext || 'Fleet Manager');
  res.status(201).json(newLog);
});

// ==========================================
// EXPENSES
// ==========================================
router.get('/expenses', (req: Request, res: Response) => {
  res.json(expenseRepo.getAll());
});

router.post('/expenses', (req: Request, res: Response) => {
  const { vehicleId, tripId, category, cost, date, description, creatorRole, userContext } = req.body;

  if (cost === undefined || !date || !description || !category) {
    res.status(400).json({ error: 'Category, cost, date, and description are required' });
    return;
  }

  const newExpense = expenseRepo.create({
    vehicleId,
    tripId,
    category,
    cost: Number(cost),
    date,
    description,
    creatorRole: creatorRole || userContext || 'Financial Analyst'
  });

  activityRepo.create(`Logged miscellaneous expense: ${category} - $${cost}.`, userContext || 'Financial Analyst');
  res.status(201).json(newExpense);
});

// ==========================================
// NOTIFICATIONS & AUDIT LOGS
// ==========================================
router.get('/notifications', (req: Request, res: Response) => {
  res.json(notifRepo.getAll());
});

router.put('/notifications/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { resolved } = req.body;

  const updated = notifRepo.update(id, { resolved });
  if (!updated) {
    res.status(404).json({ error: 'Notification not found' });
    return;
  }
  res.json(updated);
});

router.get('/activity-logs', (req: Request, res: Response) => {
  res.json(activityRepo.getAll().reverse()); // Show newest first
});

// ==========================================
// OPERATIONAL PERFORMANCE & ANALYTICS
// ==========================================
router.get('/analytics', (req: Request, res: Response) => {
  const vehicles = vehicleRepo.getAll();
  const trips = tripRepo.getAll();
  const fuelLogs = fuelRepo.getAll();
  const maintenance = maintRepo.getAll();
  const expenses = expenseRepo.getAll();

  // 1. Compute Operational Costs (Fuel + Maintenance + Other expenses) per vehicle
  const metrics = vehicles.map(vehicle => {
    // Fuel logs cost
    const vehicleFuelCost = fuelLogs
      .filter(f => f.vehicleId === vehicle.id)
      .reduce((sum, f) => sum + f.cost, 0);

    // Maintenance cost
    const vehicleMaintCost = maintenance
      .filter(m => m.vehicleId === vehicle.id)
      .reduce((sum, m) => sum + m.cost, 0);

    // Tolls/Permits from expenses
    const vehicleMiscCost = expenses
      .filter(e => e.vehicleId === vehicle.id && e.category !== 'Fuel' && e.category !== 'Maintenance')
      .reduce((sum, e) => sum + e.cost, 0);

    const totalOperationalCost = vehicleFuelCost + vehicleMaintCost + vehicleMiscCost;

    // Completed distance
    const vehicleTrips = trips.filter(t => t.vehicleId === vehicle.id && t.status === 'Completed');
    const totalDistance = vehicleTrips.reduce((sum, t) => sum + t.plannedDistance, 0);
    const totalFuelConsumed = vehicleTrips.reduce((sum, t) => sum + (t.fuelConsumed || 0), 0);

    // Fuel Efficiency (Distance / Fuel)
    const fuelEfficiency = totalFuelConsumed > 0 ? (totalDistance / totalFuelConsumed) : 0;

    // ROI = [Revenue - (Maintenance + Fuel + Misc)] / AcquisitionCost
    // Let's assume a static cargo transport revenue rate of $2.5 per km for completed trips
    const estimatedRevenue = totalDistance * 2.5;
    const netProfit = estimatedRevenue - totalOperationalCost;
    const roi = vehicle.acquisitionCost > 0 ? (netProfit / vehicle.acquisitionCost) : 0;

    return {
      vehicleId: vehicle.id,
      registrationNumber: vehicle.registrationNumber,
      name: vehicle.name,
      type: vehicle.type,
      totalFuelCost: vehicleFuelCost,
      totalMaintCost: vehicleMaintCost,
      totalOperationalCost,
      totalDistance,
      fuelEfficiency, // km/L
      estimatedRevenue,
      netProfit,
      roi: roi * 100 // return as percentage
    };
  });

  res.json({
    metrics,
    summary: {
      totalOperationalCost: expenses.reduce((sum, e) => sum + e.cost, 0) + maintenance.reduce((sum, m) => sum + m.cost, 0),
      totalDistance: trips.filter(t => t.status === 'Completed').reduce((sum, t) => sum + t.plannedDistance, 0),
      totalRevenue: trips.filter(t => t.status === 'Completed').reduce((sum, t) => sum + t.plannedDistance * 2.5, 0),
      avgFuelEfficiency: metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.fuelEfficiency, 0) / metrics.length : 0
    }
  });
});

export default router;
