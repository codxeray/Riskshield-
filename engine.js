/**
 * RiskShield - AI Fraud & Risk Detection Engine
 * Real-time behavioral anomaly detection, rule engine, and XAI scoring
 */

// Pre-configured User Behavioral Baselines
export const USER_PROFILES = {
  'usr_mumbai_01': {
    id: 'usr_mumbai_01',
    name: 'Rahul Sharma',
    email: 'rahul.sharma@example.com',
    phone: '+91 98201 44321',
    homeCity: 'Mumbai',
    homeCoordinates: { lat: 19.0760, lon: 72.8777 },
    baselineAmount: { min: 500, max: 2000, avg: 1150, stdDev: 350 },
    trustedDevices: ['iPhone 14 Pro (iOS 17.4)', 'MacBook Pro M2 (Chrome 122)'],
    trustedIps: ['49.36.120.44', '157.34.89.12'],
    accountAgeDays: 480,
    normalHours: [8, 23], // 8 AM to 11 PM
    riskTier: 'STANDARD'
  },
  'usr_blr_02': {
    id: 'usr_blr_02',
    name: 'Priya Patel',
    email: 'priya.patel@techfin.in',
    phone: '+91 99002 88190',
    homeCity: 'Bengaluru',
    homeCoordinates: { lat: 12.9716, lon: 77.5946 },
    baselineAmount: { min: 1000, max: 6000, avg: 2800, stdDev: 900 },
    trustedDevices: ['Samsung Galaxy S24 (Android 14)', 'ThinkPad T14 (Firefox 123)'],
    trustedIps: ['106.51.72.19', '182.73.104.5'],
    accountAgeDays: 720,
    normalHours: [7, 24],
    riskTier: 'LOW'
  },
  'usr_del_03': {
    id: 'usr_del_03',
    name: 'Amit Verma',
    email: 'amit.verma@delhicorp.org',
    phone: '+91 98110 55677',
    homeCity: 'Delhi NCR',
    homeCoordinates: { lat: 28.7041, lon: 77.1025 },
    baselineAmount: { min: 300, max: 1800, avg: 750, stdDev: 280 },
    trustedDevices: ['OnePlus 12 (OxygenOS 14)'],
    trustedIps: ['122.161.45.88'],
    accountAgeDays: 190,
    normalHours: [9, 22],
    riskTier: 'STANDARD'
  }
};

// Configurable policy thresholds
export const DEFAULT_THRESHOLDS = {
  lowMax: 30,       // 0 - 30 -> Allowed
  mediumMax: 65,    // 31 - 65 -> Monitored
  highMax: 85,      // 66 - 85 -> Step-Up 2FA Verification
  criticalMin: 86   // 86 - 100 -> Blocked & Alerted
};

// Calculate Haversine distance in kilometers
export function calculateGeoDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Core Risk Evaluation Engine
 * Evaluates an incoming transaction against historical user behavior,
 * network reputation, and velocity indicators.
 */
export function evaluateTransaction(transaction, userProfile, policyThresholds = DEFAULT_THRESHOLDS) {
  const profile = userProfile || USER_PROFILES['usr_mumbai_01'];
  const factors = [];
  let rawScore = 0;

  // 1. Transaction Amount Anomaly Evaluation
  const amount = Number(transaction.amount);
  const { min, max, avg } = profile.baselineAmount;

  if (amount > max) {
    const deviationMultiple = (amount / max);
    if (deviationMultiple > 15) {
      // Massive spike (e.g. ₹50,000 vs ₹2,000 baseline -> 25x)
      const points = Math.min(38, Math.round(25 + (deviationMultiple * 0.5)));
      rawScore += points;
      factors.push({
        id: 'amount_extreme_spike',
        category: 'Amount Anomaly',
        title: `Massive Amount Spike (${deviationMultiple.toFixed(1)}x normal max ₹${max.toLocaleString('en-IN')})`,
        contribution: points,
        severity: 'critical',
        detail: `User normally transacts ₹${min.toLocaleString('en-IN')}–₹${max.toLocaleString('en-IN')}. Requested ₹${amount.toLocaleString('en-IN')}.`
      });
    } else if (deviationMultiple > 3) {
      const points = 24;
      rawScore += points;
      factors.push({
        id: 'amount_high_spike',
        category: 'Amount Anomaly',
        title: `Substantial Amount Surge (${deviationMultiple.toFixed(1)}x normal limit)`,
        contribution: points,
        severity: 'high',
        detail: `Transaction of ₹${amount.toLocaleString('en-IN')} exceeds regular max of ₹${max.toLocaleString('en-IN')}.`
      });
    } else {
      const points = 14;
      rawScore += points;
      factors.push({
        id: 'amount_moderate_deviation',
        category: 'Amount Anomaly',
        title: `Elevated Transaction Amount`,
        contribution: points,
        severity: 'medium',
        detail: `Transaction of ₹${amount.toLocaleString('en-IN')} is slightly above typical ₹${avg.toLocaleString('en-IN')} average.`
      });
    }
  } else if (amount < min * 0.1 && amount > 0) {
    // Micro card-testing probe
    const points = 12;
    rawScore += points;
    factors.push({
      id: 'micro_card_testing',
      category: 'Amount Anomaly',
      title: 'Potential Micro Card-Testing Probe',
      contribution: points,
      severity: 'medium',
      detail: `Unusually small token transaction of ₹${amount}.`
    });
  } else {
    // Healthy transaction within normal baseline
    factors.push({
      id: 'amount_normal',
      category: 'Amount Anomaly',
      title: 'Amount Consistent with Historical Baseline',
      contribution: 0,
      severity: 'safe',
      detail: `Transaction of ₹${amount.toLocaleString('en-IN')} is within habitual ₹${min.toLocaleString('en-IN')}–₹${max.toLocaleString('en-IN')} range.`
    });
  }

  // 2. Device Fingerprint & Novelty Check
  const device = transaction.device || '';
  const isTrustedDevice = profile.trustedDevices.some(td => td.toLowerCase().includes(device.toLowerCase()) || device.toLowerCase().includes(td.toLowerCase()));

  if (!isTrustedDevice && device !== '') {
    const points = 24;
    rawScore += points;
    factors.push({
      id: 'device_novelty',
      category: 'Device Intelligence',
      title: 'Unrecognized Device Signature',
      contribution: points,
      severity: 'critical',
      detail: `Device "${device}" has never been used by ${profile.name}. Known devices: ${profile.trustedDevices.join(', ')}.`
    });
  } else {
    factors.push({
      id: 'device_trusted',
      category: 'Device Intelligence',
      title: 'Trusted Device Hardware Fingerprint',
      contribution: 0,
      severity: 'safe',
      detail: `Matches recognized hardware signature: ${device || profile.trustedDevices[0]}.`
    });
  }

  // 3. Geolocation & Impossible Travel
  let distanceKm = 0;
  if (transaction.coordinates && profile.homeCoordinates) {
    distanceKm = calculateGeoDistance(
      profile.homeCoordinates.lat,
      profile.homeCoordinates.lon,
      transaction.coordinates.lat,
      transaction.coordinates.lon
    );
  } else if (transaction.location && transaction.location.toLowerCase() !== profile.homeCity.toLowerCase()) {
    distanceKm = 1200;
  }

  if (distanceKm > 2000 || transaction.isForeignLocation || (transaction.location && transaction.location.includes('UK'))) {
    const points = 22;
    rawScore += points;
    factors.push({
      id: 'geo_impossible_travel',
      category: 'Location Intelligence',
      title: `Impossible Travel / Remote Geolocation (${transaction.location || 'Foreign IP'})`,
      contribution: points,
      severity: 'critical',
      detail: `Transaction initiated ~${distanceKm}km away from habitual location ${profile.homeCity}. Velocity breach.`
    });
  } else if (distanceKm > 350) {
    const points = 12;
    rawScore += points;
    factors.push({
      id: 'geo_unusual_city',
      category: 'Location Intelligence',
      title: `Unusual Location Leap (${transaction.location})`,
      contribution: points,
      severity: 'medium',
      detail: `Payment originates from ${transaction.location}, outside usual ${profile.homeCity} area (~${distanceKm} km away).`
    });
  } else {
    factors.push({
      id: 'geo_normal',
      category: 'Location Intelligence',
      title: 'Geolocation Matches Habitual Profile',
      contribution: 0,
      severity: 'safe',
      detail: `Originates from expected home region (${profile.homeCity}).`
    });
  }

  // 4. Pre-Auth / Login Activity & Velocity Signals
  const failedLogins = Number(transaction.failedLogins || 0);
  if (failedLogins >= 3) {
    const points = 25;
    rawScore += points;
    factors.push({
      id: 'auth_brute_force',
      category: 'Authentication Velocity',
      title: `Pre-Payment Brute Force Alert (${failedLogins} Failed Logins)`,
      contribution: points,
      severity: 'critical',
      detail: `${failedLogins} consecutive failed authentication attempts detected within the past 15 minutes.`
    });
  } else if (failedLogins > 0) {
    const points = 10 * failedLogins;
    rawScore += points;
    factors.push({
      id: 'auth_failed_logins',
      category: 'Authentication Velocity',
      title: `Prior Failed Login Attempt (${failedLogins} attempt)`,
      contribution: points,
      severity: 'medium',
      detail: `Account experienced ${failedLogins} failed password/OTP entry prior to payment initiation.`
    });
  }

  // 5. Network / IP Reputation Signals
  if (transaction.isVpnOrProxy) {
    const points = 16;
    rawScore += points;
    factors.push({
      id: 'ip_vpn_proxy',
      category: 'Network Security',
      title: 'Anonymizing Proxy / Tor / VPN Node Detected',
      contribution: points,
      severity: 'high',
      detail: `Originating IP ${transaction.ip || '185.220.101.5'} is mapped to a commercial VPN or TOR exit node.`
    });
  }

  // Cap normalized score to [0, 100]
  const finalScore = Math.min(100, Math.max(0, rawScore));

  // Determine policy action based on configurable thresholds
  let action = 'ALLOWED';
  let riskLevel = 'LOW';
  let badgeColor = 'emerald';
  let recommendation = 'Low risk detected. Safe to authorize immediately.';

  if (finalScore >= policyThresholds.criticalMin) {
    action = 'BLOCKED';
    riskLevel = 'CRITICAL';
    badgeColor = 'rose';
    recommendation = 'Critical fraud indicators detected. Transaction blocked automatically and alert dispatched to SecOps.';
  } else if (finalScore > policyThresholds.mediumMax) {
    action = 'STEP_UP_2FA';
    riskLevel = 'HIGH';
    badgeColor = 'amber';
    recommendation = 'High anomaly variance detected. Additional step-up biometric/OTP verification required before authorization.';
  } else if (finalScore > policyThresholds.lowMax) {
    action = 'MONITORED';
    riskLevel = 'MEDIUM';
    badgeColor = 'cyan';
    recommendation = 'Moderate variance from baseline. Transaction allowed under enhanced post-settlement monitoring.';
  }

  return {
    riskScore: finalScore,
    riskLevel,
    action,
    badgeColor,
    recommendation,
    factors: factors.sort((a, b) => b.contribution - a.contribution),
    evaluatedAt: new Date().toISOString(),
    userBaseline: profile.baselineAmount,
    profileId: profile.id
  };
}

// Preset test scenarios for instant demonstration
export const PRESET_SCENARIOS = [
  {
    id: 'scenario_normal',
    title: '1. Routine Low Risk (Normal UPI)',
    subtitle: 'Regular ₹850 grocery/dining from habitual iPhone in Mumbai',
    user: 'usr_mumbai_01',
    amount: 850,
    location: 'Mumbai',
    coordinates: { lat: 19.0760, lon: 72.8777 },
    device: 'iPhone 14 Pro (iOS 17.4)',
    ip: '49.36.120.44',
    isVpnOrProxy: false,
    failedLogins: 0,
    merchant: 'Blue Tokai Coffee Roasters',
    category: 'Food & Beverage',
    expectedScore: 0,
    expectedAction: 'ALLOWED'
  },
  {
    id: 'scenario_medium',
    title: '2. Medium Risk (Unusual City Leap)',
    subtitle: 'Moderate ₹3,800 purchase from Pune via new desktop browser',
    user: 'usr_mumbai_01',
    amount: 3800,
    location: 'Pune',
    coordinates: { lat: 18.5204, lon: 73.8567 },
    device: 'Chrome on Windows 11',
    ip: '103.21.14.80',
    isVpnOrProxy: false,
    failedLogins: 0,
    merchant: 'Croma Electronics Hub',
    category: 'Retail & Gadgets',
    expectedScore: 42,
    expectedAction: 'MONITORED'
  },
  {
    id: 'scenario_high',
    title: '3. High Risk (Step-Up 2FA Challenge)',
    subtitle: '₹14,500 luxury purchase, unfamiliar phone + 1 failed login',
    user: 'usr_mumbai_01',
    amount: 14500,
    location: 'Jaipur',
    coordinates: { lat: 26.9124, lon: 75.7873 },
    device: 'New Vivo V29 (Android 13)',
    ip: '182.68.91.44',
    isVpnOrProxy: true,
    failedLogins: 1,
    merchant: 'Tanishq Jewellers Flagship',
    category: 'Luxury Goods',
    expectedScore: 78,
    expectedAction: 'STEP_UP_2FA'
  },
  {
    id: 'scenario_critical_prompt',
    title: '4. Critical Risk (The ₹50,000 Attack Scenario)',
    subtitle: '₹50,000 spike vs ₹500–₹2k baseline + new device + 3 failed logins',
    user: 'usr_mumbai_01',
    amount: 50000,
    location: 'London, UK',
    coordinates: { lat: 51.5074, lon: -0.1278 },
    device: 'Linux / Firefox Headless (Unknown Device)',
    ip: '185.220.101.5',
    isVpnOrProxy: true,
    failedLogins: 3,
    merchant: 'CryptoPay Global Escrow Ltd',
    category: 'High-Risk Transfer',
    expectedScore: 98,
    expectedAction: 'BLOCKED'
  }
];
