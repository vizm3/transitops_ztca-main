import {
  ZTCARequestContext,
  RiskEvaluation,
  RiskFactor,
  ZTCADecision,
  ZTCAOutcome,
  ZTCARiskLevel,
  PolicyRule
} from './types.js';
import { ZTCAPolicyRepository, ZTCADeviceRepository, ZTCALocationRepository } from './store.js';

const policyRepo = new ZTCAPolicyRepository();
const deviceRepo = new ZTCADeviceRepository();
const locationRepo = new ZTCALocationRepository();

export class ZTCAEngine {
  /**
   * 1. RISK ENGINE: Calculates continuous contextual risk score (0-100)
   */
  public evaluateRisk(context: ZTCARequestContext): RiskEvaluation {
    const factors: RiskFactor[] = [];
    let totalScore = 0;

    // Check 1: Device Trust
    if (!context.isKnownDevice) {
      const score = 25;
      totalScore += score;
      factors.push({
        ruleId: 'rf_unknown_device',
        name: 'Unrecognized Device Fingerprint',
        score,
        description: `Device fingerprint '${context.deviceId}' (${context.deviceBrowser} on ${context.deviceOS}) is not in user's trusted device registry.`
      });
    }

    // Check 2: Geo-Location Anomaly
    if (!context.isKnownLocation) {
      const score = 20;
      totalScore += score;
      factors.push({
        ruleId: 'rf_location_anomaly',
        name: 'Geographic Location Anomaly',
        score,
        description: `Request originating from '${context.location.city}, ${context.location.country}', which is outside user's registered home/work cities.`
      });
    }

    // Check 3: Time Anomaly (Odd Hours)
    if (context.isOddHours) {
      const score = 15;
      totalScore += score;
      factors.push({
        ruleId: 'rf_odd_hours',
        name: 'Off-Hours Request Window',
        score,
        description: 'Activity detected outside normal operational hours (between 11:00 PM and 05:00 AM).'
      });
    }

    // Check 4: Action & Endpoint Sensitivity
    const sensitiveMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
    const isModification = sensitiveMethods.includes(context.method.toUpperCase());

    if (context.endpoint.startsWith('/api/admin')) {
      const score = 30;
      totalScore += score;
      factors.push({
        ruleId: 'rf_admin_endpoint',
        name: 'Super User Security Panel Route',
        score,
        description: 'Request targeting sensitive ZTCA administrative policies, audit streams, or security controls.'
      });
    } else if (context.endpoint.includes('/trips') && isModification) {
      const score = 20;
      totalScore += score;
      factors.push({
        ruleId: 'rf_dispatch_sensitivity',
        name: 'Vehicle Dispatch Operations',
        score,
        description: 'Action modifies active fleet dispatching, driver assignments, or trip status.'
      });
    } else if ((context.endpoint.includes('/vehicles') || context.endpoint.includes('/drivers')) && isModification) {
      const score = 20;
      totalScore += score;
      factors.push({
        ruleId: 'rf_fleet_mod_sensitivity',
        name: 'Core Fleet Entity Modification',
        score,
        description: 'Action modifies registered vehicle inventory, driver licensing, or safety statuses.'
      });
    } else if (context.endpoint.includes('/expenses') && isModification) {
      const score = 15;
      totalScore += score;
      factors.push({
        ruleId: 'rf_expense_sensitivity',
        name: 'Financial Ledger Transaction',
        score,
        description: 'Action creates or alters monetary expense logs.'
      });
    }

    // Check 5: Role Privilege Alignment
    if (context.userRole === 'Driver' && context.requiredPrivilege !== 'READ_OPERATIONS') {
      const score = 25;
      totalScore += score;
      factors.push({
        ruleId: 'rf_privilege_mismatch',
        name: 'Elevated Privilege Access Attempt',
        score,
        description: `User role '${context.userRole}' attempting administrative or financial action '${context.actionName}'.`
      });
    }

    // Mitigation: Active Step-Up Token reduces risk
    if (context.stepUpToken && context.stepUpToken.startsWith('STEPUP_VALID')) {
      const reduction = 30;
      totalScore = Math.max(0, totalScore - reduction);
      factors.push({
        ruleId: 'rf_mfa_verified',
        name: 'Active Step-Up Verification Present',
        score: -reduction,
        description: 'User successfully completed secondary MFA/Pin step-up challenge.'
      });
    }

    // Cap score at 100
    totalScore = Math.min(100, Math.max(0, totalScore));

    let level: ZTCARiskLevel = 'LOW';
    if (totalScore >= 75) level = 'CRITICAL';
    else if (totalScore >= 55) level = 'HIGH';
    else if (totalScore >= 30) level = 'MEDIUM';

    return {
      totalScore,
      level,
      factors
    };
  }

  /**
   * 2. POLICY & DECISION ENGINE (PDP - Policy Decision Point)
   * Combines Context + Policies + Risk Score -> Final ALLOW / BLOCK / STEP_UP / READ_ONLY
   */
  public makeDecision(context: ZTCARequestContext, risk: RiskEvaluation): ZTCADecision {
    const timestamp = new Date().toISOString();

    // MANDATORY RULE 1: Admin Panel Lockdown
    if (context.endpoint.startsWith('/api/admin') && context.userRole !== 'Admin') {
      return {
        outcome: 'BLOCK',
        riskScore: risk.totalScore,
        riskLevel: risk.level,
        reason: `ZTCA Security Policy Violation: Admin Security Panel and policy management are restricted strictly to Super Users (User role is '${context.userRole}').`,
        policyTriggered: 'pol_1_admin_protection',
        riskFactors: risk.factors,
        timestamp
      };
    }

    // Evaluate Configured Active Policies
    const activePolicies = policyRepo.getAll().filter(p => p.enabled);

    for (const policy of activePolicies) {
      // Check role target
      if (policy.targetRole && policy.targetRole !== 'ALL' && policy.targetRole !== context.userRole) {
        continue;
      }

      // Check endpoint pattern
      if (policy.targetEndpointPattern && policy.targetEndpointPattern !== '.*') {
        const regex = new RegExp(policy.targetEndpointPattern, 'i');
        if (!regex.test(context.endpoint)) {
          continue;
        }
      }

      // Check policy conditions
      let violated = false;
      let violationReason = '';

      if (risk.totalScore > policy.maxAllowedRisk) {
        violated = true;
        violationReason = `Context risk score (${risk.totalScore}) exceeds policy maximum allowed threshold (${policy.maxAllowedRisk}).`;
      } else if (policy.requireKnownDevice && !context.isKnownDevice) {
        violated = true;
        violationReason = `Policy '${policy.name}' requires access from a trusted registered device.`;
      } else if (policy.requireKnownLocation && !context.isKnownLocation) {
        violated = true;
        violationReason = `Policy '${policy.name}' requires access from an authorized company location.`;
      } else if (policy.requireBusinessHours && context.isOddHours) {
        violated = true;
        violationReason = `Policy '${policy.name}' restricts operations to standard business hours.`;
      }

      if (violated) {
        // Handle Step-Up check if already verified
        if (policy.actionIfViolated === 'STEP_UP' && context.stepUpToken && context.stepUpToken.startsWith('STEPUP_VALID')) {
          // Allowed after step-up
          return {
            outcome: 'ALLOW',
            riskScore: risk.totalScore,
            riskLevel: risk.level,
            reason: `Action granted following successful Step-Up MFA authentication under policy '${policy.name}'.`,
            policyTriggered: policy.id,
            riskFactors: risk.factors,
            timestamp
          };
        }

        return {
          outcome: policy.actionIfViolated,
          riskScore: risk.totalScore,
          riskLevel: risk.level,
          reason: `Policy Enforcement Triggered [${policy.name}]: ${violationReason}`,
          policyTriggered: policy.id,
          riskFactors: risk.factors,
          timestamp,
          stepUpChallenge: policy.actionIfViolated === 'STEP_UP' ? 'VERIFY_PIN' : undefined
        };
      }
    }

    // Default Fallback PDP Logic
    if (risk.totalScore >= 80) {
      return {
        outcome: 'BLOCK',
        riskScore: risk.totalScore,
        riskLevel: risk.level,
        reason: `Request blocked due to Critical risk score (${risk.totalScore}/100) across multiple security factors.`,
        riskFactors: risk.factors,
        timestamp
      };
    }

    if (risk.totalScore >= 55) {
      if (context.stepUpToken && context.stepUpToken.startsWith('STEPUP_VALID')) {
        return {
          outcome: 'ALLOW',
          riskScore: risk.totalScore,
          riskLevel: risk.level,
          reason: 'Elevated risk request authorized via completed Step-Up MFA verification.',
          riskFactors: risk.factors,
          timestamp
        };
      }
      return {
        outcome: 'STEP_UP',
        riskScore: risk.totalScore,
        riskLevel: risk.level,
        reason: `Elevated context risk score (${risk.totalScore}/100) requires secondary MFA / Security PIN verification.`,
        riskFactors: risk.factors,
        timestamp,
        stepUpChallenge: 'VERIFY_PIN'
      };
    }

    if (risk.totalScore >= 35 && ['POST', 'PUT', 'DELETE'].includes(context.method.toUpperCase())) {
      return {
        outcome: 'READ_ONLY',
        riskScore: risk.totalScore,
        riskLevel: risk.level,
        reason: `Moderate risk level (${risk.totalScore}/100) prevents write operations. Session restricted to Read-Only access.`,
        riskFactors: risk.factors,
        timestamp
      };
    }

    return {
      outcome: 'ALLOW',
      riskScore: risk.totalScore,
      riskLevel: risk.level,
      reason: `Request validated successfully under continuous authorization policy (Risk: ${risk.totalScore}/100).`,
      riskFactors: risk.factors,
      timestamp
    };
  }
}
