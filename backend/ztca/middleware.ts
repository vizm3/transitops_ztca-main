import { Request, Response, NextFunction } from 'express';
import { ZTCAEngine } from './engine.js';
import { ZTCAAuditRepository, ZTCADeviceRepository, ZTCALocationRepository } from './store.js';
import { ZTCARequestContext, UserRole } from './types.js';

const engine = new ZTCAEngine();
const auditRepo = new ZTCAAuditRepository();
const deviceRepo = new ZTCADeviceRepository();
const locationRepo = new ZTCALocationRepository();

export interface ZTCAExpressRequest extends Request {
  ztcaContext?: ZTCARequestContext;
  ztcaDecision?: any;
}

export function ztcaAuthorizationMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip ZTCA interception for static assets, auth login/register, or direct simulation helper APIs
  const path = req.path;
  if (
    !path.startsWith('/api') ||
    path === '/api/auth/login' ||
    path === '/api/auth/register' ||
    path.startsWith('/api/ztca/simulation') ||
    path.startsWith('/api/ztca/verify-stepup')
  ) {
    next();
    return;
  }

  // Extract Context Headers from Incoming Request (passed by frontend ZTCA Client wrapper)
  const userId = (req.headers['x-ztca-user-id'] as string) || 'u1';
  const userName = (req.headers['x-ztca-user-name'] as string) || 'Sarah Jenkins';
  const userEmail = (req.headers['x-ztca-user-email'] as string) || 'manager@transitops.com';
  const userRole = (req.headers['x-ztca-user-role'] as UserRole) || 'Fleet Manager';

  const deviceId = (req.headers['x-ztca-device-id'] as string) || 'dev-macbook-pro-sf-hq';
  const deviceBrowser = (req.headers['x-ztca-device-browser'] as string) || 'Chrome 124';
  const deviceOS = (req.headers['x-ztca-device-os'] as string) || 'macOS';

  const lat = parseFloat((req.headers['x-ztca-lat'] as string) || '37.7749');
  const lng = parseFloat((req.headers['x-ztca-lng'] as string) || '-122.4194');
  const city = (req.headers['x-ztca-city'] as string) || 'San Francisco';
  const country = (req.headers['x-ztca-country'] as string) || 'United States';

  const isOddHoursHeader = req.headers['x-ztca-is-odd-hours'];
  let isOddHours = false;
  if (isOddHoursHeader !== undefined) {
    isOddHours = isOddHoursHeader === 'true';
  } else {
    const currentHour = new Date().getHours();
    isOddHours = currentHour >= 23 || currentHour < 5;
  }

  const actionName = (req.headers['x-ztca-action-name'] as string) || `${req.method} ${path}`;
  const stepUpToken = req.headers['x-ztca-stepup-token'] as string | undefined;

  // Verify against database trust records
  const isKnownDevice = deviceRepo.isDeviceKnown(userId, deviceId);
  const isKnownLocation = locationRepo.isLocationKnown(userId, city);

  // Determine Required Privilege
  let requiredPrivilege: ZTCARequestContext['requiredPrivilege'] = 'READ_OPERATIONS';
  const methodUpper = req.method.toUpperCase();
  const isModification = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(methodUpper);

  if (path.startsWith('/api/admin')) {
    requiredPrivilege = 'ADMIN_POLICIES';
  } else if (path.includes('/trips') && isModification) {
    requiredPrivilege = 'DISPATCH_TRIP';
  } else if (path.includes('/vehicles') && isModification) {
    requiredPrivilege = 'WRITE_VEHICLES';
  } else if (path.includes('/drivers') && isModification) {
    requiredPrivilege = 'WRITE_DRIVERS';
  } else if (path.includes('/expenses') && isModification) {
    requiredPrivilege = 'MANAGE_EXPENSES';
  }

  const context: ZTCARequestContext = {
    userId,
    userName,
    userEmail,
    userRole,
    deviceId,
    deviceBrowser,
    deviceOS,
    isKnownDevice,
    location: { lat, lng, city, country },
    isKnownLocation,
    timestamp: new Date().toISOString(),
    isOddHours,
    endpoint: path,
    method: req.method,
    actionName,
    requiredPrivilege,
    stepUpToken
  };

  // Evaluate Risk and Decision
  const risk = engine.evaluateRisk(context);
  const decision = engine.makeDecision(context, risk);

  // Log Audit Entry to Persistent Storage
  const auditLog = auditRepo.log({
    timestamp: new Date().toISOString(),
    user: {
      id: userId,
      name: userName,
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
      endpoint: path,
      method: req.method,
      actionName,
      requiredPrivilege
    },
    risk,
    decision
  });

  // Attach context to request object
  (req as ZTCAExpressRequest).ztcaContext = context;
  (req as ZTCAExpressRequest).ztcaDecision = decision;

  // ENFORCE DECISION
  if (decision.outcome === 'BLOCK') {
    res.status(403).json({
      error: 'ZTCA_BLOCKED',
      message: decision.reason,
      decision,
      auditLogId: auditLog.id
    });
    return;
  }

  if (decision.outcome === 'STEP_UP') {
    res.status(401).json({
      error: 'ZTCA_STEP_UP_REQUIRED',
      message: decision.reason,
      decision,
      challenge: 'VERIFY_PIN',
      auditLogId: auditLog.id
    });
    return;
  }

  if (decision.outcome === 'READ_ONLY' && isModification) {
    res.status(403).json({
      error: 'ZTCA_READ_ONLY_MODE',
      message: 'Modification blocked: ZTCA security engine downgraded your session to Read-Only due to elevated context risk.',
      decision,
      auditLogId: auditLog.id
    });
    return;
  }

  // ALLOWED -> Proceed to application route handler
  next();
}
