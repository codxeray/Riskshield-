/**
 * RiskShield - Main Application Logic & Router
 * Interactive Router, Stream Simulation, Sandbox Controller, and SecOps Flow
 */

import {
  USER_PROFILES,
  DEFAULT_THRESHOLDS,
  PRESET_SCENARIOS,
  evaluateTransaction
} from './engine.js';

// Application State Store
const STATE = {
  activePage: 'monitor',
  streamActive: true,
  streamIntervalId: null,
  currentFilter: 'ALL',
  thresholds: { ...DEFAULT_THRESHOLDS },
  transactions: [],
  selectedTxn: null,
  activeIncidentId: null,
  kpis: {
    totalVolume: 18432900,
    fraudPrevented: 1845000,
    stepUpChallenges: 89,
    blockedCount: 18,
    todayScanned: 1482
  },
  activeProfileTab: 'usr_mumbai_01'
};

// Initial Sample Transactions
const INITIAL_TRANSACTIONS = [
  {
    id: 'TXN-9842',
    timestamp: 'Just now',
    user: 'usr_mumbai_01',
    amount: 50000,
    merchant: 'CryptoPay Global Escrow Ltd',
    location: 'London, UK',
    device: 'Linux / Firefox Headless (Unknown Device)',
    ip: '185.220.101.5',
    isVpnOrProxy: true,
    failedLogins: 3,
    status: 'EVALUATED'
  },
  {
    id: 'TXN-9841',
    timestamp: '45s ago',
    user: 'usr_mumbai_01',
    amount: 14500,
    merchant: 'Tanishq Jewellers Flagship',
    location: 'Jaipur',
    device: 'New Vivo V29 (Android 13)',
    ip: '182.68.91.44',
    isVpnOrProxy: true,
    failedLogins: 1,
    status: 'EVALUATED'
  },
  {
    id: 'TXN-9840',
    timestamp: '2m ago',
    user: 'usr_mumbai_01',
    amount: 3800,
    merchant: 'Croma Electronics Hub',
    location: 'Pune',
    device: 'Chrome on Windows 11',
    ip: '103.21.14.80',
    isVpnOrProxy: false,
    failedLogins: 0,
    status: 'EVALUATED'
  },
  {
    id: 'TXN-9839',
    timestamp: '4m ago',
    user: 'usr_mumbai_01',
    amount: 850,
    merchant: 'Blue Tokai Coffee Roasters',
    location: 'Mumbai',
    device: 'iPhone 14 Pro (iOS 17.4)',
    ip: '49.36.120.44',
    isVpnOrProxy: false,
    failedLogins: 0,
    status: 'EVALUATED'
  },
  {
    id: 'TXN-9838',
    timestamp: '7m ago',
    user: 'usr_blr_02',
    amount: 2450,
    merchant: 'Swiggy Gourmet Supermart',
    location: 'Bengaluru',
    device: 'Samsung Galaxy S24 (Android 14)',
    ip: '106.51.72.19',
    isVpnOrProxy: false,
    failedLogins: 0,
    status: 'EVALUATED'
  },
  {
    id: 'TXN-9837',
    timestamp: '11m ago',
    user: 'usr_del_03',
    amount: 620,
    merchant: 'Uber Rides Delhi NCR',
    location: 'Delhi NCR',
    device: 'OnePlus 12 (OxygenOS 14)',
    ip: '122.161.45.88',
    isVpnOrProxy: false,
    failedLogins: 0,
    status: 'EVALUATED'
  }
];

// Document Ready Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  initRouter();
  initTransactions();
  initPresetScenarios();
  initSandbox();
  initPolicyControls();
  initSecOpsIncidents();
  initModals();
  initLiveStream();
  initMobileMenu();

  // Quick Inject Button
  const quickInject = document.getElementById('quickInjectBtn');
  if (quickInject) {
    quickInject.addEventListener('click', () => {
      injectAttackScenario();
      showToast('Critical Anomaly Injected into Live Pipeline!');
      navigateTo('monitor');
    });
  }
});

/* ==========================================================================
   1. ROUTER & PAGE VIEW MANAGER
   ========================================================================== */
function initRouter() {
  const navLinks = document.querySelectorAll('.nav-link');
  
  function handleRoute() {
    const hash = window.location.hash.replace('#', '') || 'monitor';
    navigateTo(hash);
  }

  window.addEventListener('hashchange', handleRoute);
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetPage = link.getAttribute('data-page');
      window.location.hash = targetPage;
      navigateTo(targetPage);
    });
  });

  // Handle initial route
  if (window.location.hash) {
    handleRoute();
  } else {
    navigateTo('monitor');
  }
}

function navigateTo(pageId) {
  STATE.activePage = pageId;

  // Update Nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('data-page') === pageId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Update Page Views
  document.querySelectorAll('.page-view').forEach(view => {
    view.classList.remove('active');
  });

  const targetView = document.getElementById(`page${pageId.charAt(0).toUpperCase() + pageId.slice(1)}`);
  if (targetView) {
    targetView.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Close mobile nav if open
  const nav = document.getElementById('appNav');
  if (nav) nav.classList.remove('mobile-open');
}

function initMobileMenu() {
  const btn = document.getElementById('mobileMenuBtn');
  const nav = document.getElementById('appNav');
  if (btn && nav) {
    btn.addEventListener('click', () => {
      nav.classList.toggle('mobile-open');
    });
  }
}

/* ==========================================================================
   2. TRANSACTION MONITOR & STREAM CONTROLLER
   ========================================================================== */
function initTransactions() {
  // Evaluate and populate initial transactions
  INITIAL_TRANSACTIONS.forEach(txn => {
    const profile = USER_PROFILES[txn.user] || USER_PROFILES['usr_mumbai_01'];
    txn.evaluation = evaluateTransaction(txn, profile, STATE.thresholds);
    STATE.transactions.push(txn);
  });

  renderTransactionList();
  updateFilterCounts();

  // Filter Pills
  const filterPills = document.querySelectorAll('.filter-pill');
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      STATE.currentFilter = pill.getAttribute('data-filter');
      renderTransactionList();
    });
  });

  // Stream Toggle
  const toggleBtn = document.getElementById('toggleStreamBtn');
  const toggleText = document.getElementById('toggleStreamText');
  const streamBadge = document.getElementById('streamSpeedBadge');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      STATE.streamActive = !STATE.streamActive;
      if (STATE.streamActive) {
        toggleText.textContent = 'Pause Stream';
        streamBadge.textContent = 'Auto-Streaming (3.5s)';
        initLiveStream();
      } else {
        toggleText.textContent = 'Resume Stream';
        streamBadge.textContent = 'Stream Paused';
        if (STATE.streamIntervalId) clearInterval(STATE.streamIntervalId);
      }
    });
  }

  // Clear Stream
  const clearBtn = document.getElementById('clearStreamBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      STATE.transactions = [];
      renderTransactionList();
      updateFilterCounts();
      renderEmptyInspector();
      showToast('Live stream cleared');
    });
  }

  // Auto-inspect first transaction
  if (STATE.transactions.length > 0) {
    inspectTransaction(STATE.transactions[0].id);
  }
}

function renderTransactionList() {
  const listContainer = document.getElementById('transactionList');
  if (!listContainer) return;

  const filtered = STATE.transactions.filter(txn => {
    if (STATE.currentFilter === 'ALL') return true;
    return txn.evaluation.riskLevel === STATE.currentFilter;
  });

  if (filtered.length === 0) {
    listContainer.innerHTML = `
      <div class="glass-panel" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">
        <p>No transactions match the <strong>${STATE.currentFilter}</strong> filter.</p>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = filtered.map(txn => {
    const evalResult = txn.evaluation;
    const profile = USER_PROFILES[txn.user] || USER_PROFILES['usr_mumbai_01'];
    const isSelected = STATE.selectedTxn && STATE.selectedTxn.id === txn.id;

    let scoreClass = 'score-low';
    let borderClass = 'border-low';
    let actionClass = 'action-allowed';
    let actionText = 'ALLOWED';

    if (evalResult.riskLevel === 'CRITICAL') {
      scoreClass = 'score-critical';
      borderClass = 'border-critical';
      actionClass = 'action-blocked';
      actionText = 'BLOCKED';
    } else if (evalResult.riskLevel === 'HIGH') {
      scoreClass = 'score-high';
      borderClass = 'border-high';
      actionClass = 'action-stepup';
      actionText = 'STEP-UP 2FA';
    } else if (evalResult.riskLevel === 'MEDIUM') {
      scoreClass = 'score-medium';
      borderClass = 'border-medium';
      actionClass = 'action-monitored';
      actionText = 'MONITORED';
    }

    return `
      <div class="glass-panel txn-card ${borderClass} ${isSelected ? 'active-inspect' : ''}" data-id="${txn.id}">
        <div class="txn-left">
          <div class="txn-score-badge ${scoreClass}">
            <span class="score-num">${evalResult.riskScore}</span>
            <span class="score-lbl">${evalResult.riskLevel.slice(0, 4)}</span>
          </div>

          <div class="txn-info-block">
            <div class="txn-user-line">
              <span class="txn-user-name">${profile.name}</span>
              <span class="txn-merchant">• ${txn.merchant}</span>
            </div>
            <div class="txn-meta-line">
              <span>${txn.location}</span>
              <span class="meta-dot"></span>
              <span>${txn.device.split('(')[0].trim()}</span>
              <span class="meta-dot"></span>
              <span class="font-mono text-xs text-dim">${txn.timestamp}</span>
            </div>
          </div>
        </div>

        <div class="txn-right">
          <span class="txn-amount">₹${Number(txn.amount).toLocaleString('en-IN')}</span>
          <span class="txn-action-tag ${actionClass}">${actionText}</span>
        </div>
      </div>
    `;
  }).join('');

  // Attach card click handlers
  listContainer.querySelectorAll('.txn-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-id');
      inspectTransaction(id);
    });
  });
}

function updateFilterCounts() {
  const counts = { ALL: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  STATE.transactions.forEach(t => {
    counts.ALL++;
    counts[t.evaluation.riskLevel]++;
  });

  const elAll = document.getElementById('countAll');
  const elLow = document.getElementById('countLow');
  const elMed = document.getElementById('countMedium');
  const elHigh = document.getElementById('countHigh');
  const elCrit = document.getElementById('countCritical');

  if (elAll) elAll.textContent = counts.ALL;
  if (elLow) elLow.textContent = counts.LOW;
  if (elMed) elMed.textContent = counts.MEDIUM;
  if (elHigh) elHigh.textContent = counts.HIGH;
  if (elCrit) elCrit.textContent = counts.CRITICAL;
}

function inspectTransaction(txnId) {
  const txn = STATE.transactions.find(t => t.id === txnId);
  if (!txn) return;

  STATE.selectedTxn = txn;

  // Highlight card in list
  document.querySelectorAll('.txn-card').forEach(card => {
    if (card.getAttribute('data-id') === txnId) {
      card.classList.add('active-inspect');
    } else {
      card.classList.remove('active-inspect');
    }
  });

  const inspector = document.getElementById('inspectorBody');
  const idEl = document.getElementById('inspTxnId');
  const timeEl = document.getElementById('inspTimestamp');

  if (idEl) idEl.textContent = txn.id;
  if (timeEl) timeEl.textContent = txn.timestamp;

  const evalResult = txn.evaluation;
  const profile = USER_PROFILES[txn.user] || USER_PROFILES['usr_mumbai_01'];

  if (inspector) {
    inspector.innerHTML = `
      <div class="insp-detail-content">
        
        <!-- Score & Action Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.25); padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
          <div>
            <div style="font-size: 0.72rem; color: var(--text-dim); text-transform: uppercase;">Composite Risk Score</div>
            <div style="font-size: 1.5rem; font-weight: 800; font-family: var(--font-mono); color: #fff;">
              ${evalResult.riskScore} <span style="font-size: 0.75rem; color: var(--text-muted);">/100</span>
            </div>
          </div>
          <span class="badge ${evalResult.badgeColor === 'rose' ? 'badge-rose' : evalResult.badgeColor === 'amber' ? 'badge-amber' : evalResult.badgeColor === 'cyan' ? 'badge-cyan' : 'badge-emerald'}">
            ${evalResult.action}
          </span>
        </div>

        <!-- Telemetry Metrics Grid -->
        <div class="insp-metric-grid">
          <div class="insp-metric-box">
            <span class="insp-metric-label">User Profile</span>
            <span class="insp-metric-value">${profile.name}</span>
          </div>
          <div class="insp-metric-box">
            <span class="insp-metric-label">Amount</span>
            <span class="insp-metric-value font-mono">₹${Number(txn.amount).toLocaleString('en-IN')}</span>
          </div>
          <div class="insp-metric-box">
            <span class="insp-metric-label">Habitual Baseline</span>
            <span class="insp-metric-value font-mono text-emerald">₹${profile.baselineAmount.min}–₹${profile.baselineAmount.max}</span>
          </div>
          <div class="insp-metric-box">
            <span class="insp-metric-label">Location / IP</span>
            <span class="insp-metric-value">${txn.location}</span>
          </div>
          <div class="insp-metric-box">
            <span class="insp-metric-label">Device Used</span>
            <span class="insp-metric-value text-xs">${txn.device}</span>
          </div>
          <div class="insp-metric-box">
            <span class="insp-metric-label">Failed Logins</span>
            <span class="insp-metric-value font-mono ${txn.failedLogins >= 3 ? 'text-rose' : 'text-cyan'}">${txn.failedLogins} attempts</span>
          </div>
        </div>

        <!-- Recommendation Box -->
        <div class="insp-recommendation-box">
          <div class="insp-rec-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            <span>Engine Decision Explanation</span>
          </div>
          <p class="insp-rec-text">${evalResult.recommendation}</p>
        </div>

        <!-- Top Contributing Factors -->
        <div>
          <div style="font-size: 0.78rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem;">
            Risk Factors Breakdown
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.4rem;">
            ${evalResult.factors.slice(0, 3).map(f => `
              <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.78rem; background: rgba(255,255,255,0.02); padding: 0.45rem 0.65rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
                <span style="color: #cbd5e1;">${f.title}</span>
                <span class="font-mono font-bold ${f.contribution > 20 ? 'text-rose' : f.contribution > 0 ? 'text-amber' : 'text-emerald'}">
                  ${f.contribution > 0 ? `+${f.contribution}` : '0'} pts
                </span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Quick Action Buttons -->
        <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
          <button class="btn btn-outline-cyan btn-sm btn-block" id="btnInspectDeep">
            Full Audit JSON
          </button>
          ${evalResult.action === 'STEP_UP_2FA' ? `
            <button class="btn btn-amber btn-sm btn-block" id="btnTriggerStepUp">
              Test 2FA Challenge
            </button>
          ` : ''}
        </div>

      </div>
    `;

    // Bind dynamic inspector buttons
    const deepBtn = document.getElementById('btnInspectDeep');
    if (deepBtn) {
      deepBtn.addEventListener('click', () => openAuditModal(txn));
    }

    const stepUpBtn = document.getElementById('btnTriggerStepUp');
    if (stepUpBtn) {
      stepUpBtn.addEventListener('click', () => openStepUpModal(txn));
    }
  }
}

function renderEmptyInspector() {
  const inspector = document.getElementById('inspectorBody');
  if (inspector) {
    inspector.innerHTML = `
      <div class="empty-inspector-state">
        <div class="empty-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
        </div>
        <h4>No transaction selected</h4>
        <p>Click on any transaction card in the stream to review risk telemetry.</p>
      </div>
    `;
  }
}

function initLiveStream() {
  if (STATE.streamIntervalId) clearInterval(STATE.streamIntervalId);

  STATE.streamIntervalId = setInterval(() => {
    if (!STATE.streamActive) return;

    // Generate simulated incoming transaction
    const newTxn = generateRandomTransaction();
    const profile = USER_PROFILES[newTxn.user];
    newTxn.evaluation = evaluateTransaction(newTxn, profile, STATE.thresholds);

    // Update state
    STATE.transactions.unshift(newTxn);
    if (STATE.transactions.length > 30) STATE.transactions.pop();

    // Update KPI counters
    STATE.kpis.totalVolume += newTxn.amount;
    STATE.kpis.todayScanned++;
    if (newTxn.evaluation.riskLevel === 'CRITICAL') {
      STATE.kpis.fraudPrevented += newTxn.amount;
      STATE.kpis.blockedCount++;
    } else if (newTxn.evaluation.riskLevel === 'HIGH') {
      STATE.kpis.stepUpChallenges++;
    }

    updateKpiDisplay();
    updateFilterCounts();
    renderTransactionList();
  }, 3500);
}

function generateRandomTransaction() {
  const users = ['usr_mumbai_01', 'usr_blr_02', 'usr_del_03'];
  const user = users[Math.floor(Math.random() * users.length)];
  const profile = USER_PROFILES[user];

  const roll = Math.random();
  let amount = Math.floor(profile.baselineAmount.min + Math.random() * (profile.baselineAmount.max - profile.baselineAmount.min));
  let location = profile.homeCity;
  let device = profile.trustedDevices[0];
  let ip = profile.trustedIps[0];
  let isVpn = false;
  let failedLogins = 0;
  let merchant = 'Swiggy Online Superstore';

  if (roll > 0.88) {
    // Critical Anomaly Roll
    amount = 50000;
    location = 'London, UK';
    device = 'Linux / Firefox Headless (Unknown Device)';
    ip = '185.220.101.5';
    isVpn = true;
    failedLogins = 3;
    merchant = 'CryptoPay Global Escrow Ltd';
  } else if (roll > 0.72) {
    // High Risk Roll
    amount = 14500;
    location = 'Jaipur';
    device = 'New Vivo V29 (Android 13)';
    ip = '182.68.91.44';
    isVpn = true;
    failedLogins = 1;
    merchant = 'Tanishq Jewellers Flagship';
  } else if (roll > 0.55) {
    // Medium Risk Roll
    amount = Math.round(profile.baselineAmount.max * 1.8);
    location = 'Pune';
    device = 'Chrome on Windows 11';
    ip = '103.21.14.80';
    merchant = 'Croma Electronics Hub';
  } else {
    // Normal Low Risk
    const merchants = ['Blue Tokai Coffee', 'Zomato Foods', 'Uber India', 'Reliance Fresh', 'Amazon Pay'];
    merchant = merchants[Math.floor(Math.random() * merchants.length)];
  }

  return {
    id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
    timestamp: 'Just now',
    user,
    amount,
    merchant,
    location,
    device,
    ip,
    isVpnOrProxy: isVpn,
    failedLogins,
    status: 'EVALUATED'
  };
}

function updateKpiDisplay() {
  const volEl = document.getElementById('kpiTotalVolume');
  const fraudEl = document.getElementById('kpiFraudPrevented');
  const stepUpEl = document.getElementById('kpiStepUpChallenges');
  const blockEl = document.getElementById('kpiBlockedCount');
  const tickerScanned = document.getElementById('tickerScannedCount');

  if (volEl) volEl.textContent = `₹${(STATE.kpis.totalVolume / 100000).toFixed(2)} Lakh`;
  if (fraudEl) fraudEl.textContent = `₹${(STATE.kpis.fraudPrevented / 100000).toFixed(2)} Lakh`;
  if (stepUpEl) stepUpEl.textContent = STATE.kpis.stepUpChallenges;
  if (blockEl) blockEl.textContent = STATE.kpis.blockedCount;
  if (tickerScanned) tickerScanned.textContent = STATE.kpis.todayScanned.toLocaleString();
}

function injectAttackScenario() {
  const attackTxn = {
    id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
    timestamp: 'Just now (Injected)',
    user: 'usr_mumbai_01',
    amount: 50000,
    merchant: 'CryptoPay Global Escrow Ltd',
    location: 'London, UK',
    device: 'Linux / Firefox Headless (Unknown Device)',
    ip: '185.220.101.5',
    isVpnOrProxy: true,
    failedLogins: 3,
    status: 'EVALUATED'
  };

  const profile = USER_PROFILES['usr_mumbai_01'];
  attackTxn.evaluation = evaluateTransaction(attackTxn, profile, STATE.thresholds);

  STATE.transactions.unshift(attackTxn);
  STATE.kpis.fraudPrevented += attackTxn.amount;
  STATE.kpis.blockedCount++;

  updateKpiDisplay();
  updateFilterCounts();
  renderTransactionList();
  inspectTransaction(attackTxn.id);
}

/* ==========================================================================
   3. SANDBOX SIMULATOR & PRESET SCENARIOS
   ========================================================================== */
function initPresetScenarios() {
  const container = document.getElementById('scenariosGrid');
  if (!container) return;

  container.innerHTML = PRESET_SCENARIOS.map((sc, idx) => {
    let badgeClass = 'badge-emerald';
    if (sc.expectedAction === 'BLOCKED') badgeClass = 'badge-rose';
    else if (sc.expectedAction === 'STEP_UP_2FA') badgeClass = 'badge-amber';
    else if (sc.expectedAction === 'MONITORED') badgeClass = 'badge-cyan';

    return `
      <div class="glass-panel scenario-card ${idx === 3 ? 'active-scenario' : ''}" data-scenario-id="${sc.id}">
        <div class="scenario-card-header">
          <span class="scenario-title">${sc.title}</span>
          <span class="badge ${badgeClass}">${sc.expectedAction}</span>
        </div>
        <p class="scenario-sub">${sc.subtitle}</p>
        <div class="scenario-meta">
          <span class="scenario-amount">₹${sc.amount.toLocaleString('en-IN')}</span>
          <span class="text-xs text-muted font-mono">${sc.location}</span>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.scenario-card').forEach(card => {
    card.addEventListener('click', () => {
      container.querySelectorAll('.scenario-card').forEach(c => c.classList.remove('active-scenario'));
      card.classList.add('active-scenario');

      const scId = card.getAttribute('data-scenario-id');
      const sc = PRESET_SCENARIOS.find(s => s.id === scId);
      if (sc) loadScenarioIntoForm(sc);
    });
  });
}

function loadScenarioIntoForm(sc) {
  const userEl = document.getElementById('sbUserSelect');
  const amtEl = document.getElementById('sbAmount');
  const locEl = document.getElementById('sbLocation');
  const devEl = document.getElementById('sbDevice');
  const ipEl = document.getElementById('sbIp');
  const merchEl = document.getElementById('sbMerchant');
  const loginsEl = document.getElementById('sbFailedLogins');
  const vpnEl = document.getElementById('sbVpnCheck');

  if (userEl) userEl.value = sc.user;
  if (amtEl) amtEl.value = sc.amount;
  if (locEl) locEl.value = sc.location;
  if (devEl) devEl.value = sc.device;
  if (ipEl) ipEl.value = sc.ip;
  if (merchEl) merchEl.value = sc.merchant;
  if (loginsEl) {
    loginsEl.value = sc.failedLogins;
    document.getElementById('failedLoginsDisplay').textContent = `${sc.failedLogins} attempts`;
  }
  if (vpnEl) vpnEl.checked = sc.isVpnOrProxy;

  evaluateSandboxForm();
}

function initSandbox() {
  const form = document.getElementById('sandboxForm');
  const loginsRange = document.getElementById('sbFailedLogins');
  const loginsDisplay = document.getElementById('failedLoginsDisplay');
  const resetBtn = document.getElementById('resetSandboxBtn');

  if (loginsRange && loginsDisplay) {
    loginsRange.addEventListener('input', () => {
      loginsDisplay.textContent = `${loginsRange.value} attempts`;
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      evaluateSandboxForm();
      showToast('AI Risk Assessment Completed!');
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      loadScenarioIntoForm(PRESET_SCENARIOS[0]);
      showToast('Reset to Routine Low-Risk baseline');
    });
  }

  // Deep inspect button on sandbox result card
  const sbInspectBtn = document.getElementById('sbInspectDeepBtn');
  if (sbInspectBtn) {
    sbInspectBtn.addEventListener('click', () => {
      const currentTxn = buildSandboxTransactionObject();
      const profile = USER_PROFILES[currentTxn.user];
      currentTxn.evaluation = evaluateTransaction(currentTxn, profile, STATE.thresholds);
      openAuditModal(currentTxn);
    });
  }

  // Step Up 2FA Trigger Button
  const sbStepUpBtn = document.getElementById('sbTriggerStepUpBtn');
  if (sbStepUpBtn) {
    sbStepUpBtn.addEventListener('click', () => {
      const currentTxn = buildSandboxTransactionObject();
      const profile = USER_PROFILES[currentTxn.user];
      currentTxn.evaluation = evaluateTransaction(currentTxn, profile, STATE.thresholds);
      openStepUpModal(currentTxn);
    });
  }

  // Evaluate initial default (Scenario 4)
  evaluateSandboxForm();
}

function buildSandboxTransactionObject() {
  const user = document.getElementById('sbUserSelect').value;
  const amount = Number(document.getElementById('sbAmount').value);
  const location = document.getElementById('sbLocation').value;
  const device = document.getElementById('sbDevice').value;
  const ip = document.getElementById('sbIp').value;
  const merchant = document.getElementById('sbMerchant').value;
  const failedLogins = Number(document.getElementById('sbFailedLogins').value);
  const isVpnOrProxy = document.getElementById('sbVpnCheck').checked;

  return {
    id: 'TXN-SANDBOX-TEST',
    user,
    amount,
    location,
    device,
    ip,
    merchant,
    failedLogins,
    isVpnOrProxy,
    timestamp: 'Simulator Live Test'
  };
}

function evaluateSandboxForm() {
  const txn = buildSandboxTransactionObject();
  const profile = USER_PROFILES[txn.user] || USER_PROFILES['usr_mumbai_01'];
  const result = evaluateTransaction(txn, profile, STATE.thresholds);

  // Update Score Gauge
  const gaugeCircle = document.getElementById('sbGaugeCircle');
  const scoreNum = document.getElementById('sbScoreVal');
  const riskLevelVal = document.getElementById('sbRiskLevelVal');
  const actionBadge = document.getElementById('sbResultActionBadge');
  const policyTag = document.getElementById('sbPolicyTag');
  const policyDesc = document.getElementById('sbPolicyDesc');
  const stepUpBtn = document.getElementById('sbTriggerStepUpBtn');

  if (scoreNum) scoreNum.textContent = result.riskScore;
  if (riskLevelVal) riskLevelVal.textContent = result.riskLevel;

  // Gauge coloring
  let gaugeColor = 'var(--emerald)';
  let glowColor = 'var(--emerald-glow)';
  let actionClass = 'action-allowed';
  let badgeClass = 'badge-emerald';

  if (result.riskLevel === 'CRITICAL') {
    gaugeColor = 'var(--rose)';
    glowColor = 'var(--rose-glow)';
    actionClass = 'action-blocked';
    badgeClass = 'badge-rose';
  } else if (result.riskLevel === 'HIGH') {
    gaugeColor = 'var(--amber)';
    glowColor = 'var(--amber-glow)';
    actionClass = 'action-stepup';
    badgeClass = 'badge-amber';
  } else if (result.riskLevel === 'MEDIUM') {
    gaugeColor = 'var(--cyan)';
    glowColor = 'var(--cyan-glow)';
    actionClass = 'action-monitored';
    badgeClass = 'badge-cyan';
  }

  if (gaugeCircle) {
    gaugeCircle.style.background = `conic-gradient(${gaugeColor} 0% ${result.riskScore}%, rgba(255, 255, 255, 0.08) ${result.riskScore}% 100%)`;
    gaugeCircle.style.boxShadow = `0 0 24px ${glowColor}`;
  }

  if (actionBadge) {
    actionBadge.className = `badge ${badgeClass}`;
    actionBadge.textContent = `${result.riskLevel}: ${result.action}`;
  }

  if (policyTag) {
    policyTag.className = `policy-tag ${actionClass}`;
    policyTag.textContent = result.action;
  }

  if (policyDesc) {
    policyDesc.textContent = result.recommendation;
  }

  // Step-Up button visibility
  if (stepUpBtn) {
    if (result.action === 'STEP_UP_2FA' || result.riskLevel === 'HIGH') {
      stepUpBtn.style.display = 'inline-flex';
    } else {
      stepUpBtn.style.display = 'none';
    }
  }

  // Update Baseline vs Current Track
  const spikeMarker = document.getElementById('sbSpikeMarker');
  const markerAmt = document.getElementById('sbMarkerAmount');
  const ratioBadge = document.getElementById('sbAmountRatio');

  if (markerAmt) markerAmt.textContent = `₹${txn.amount.toLocaleString('en-IN')}`;

  const maxBaseline = profile.baselineAmount.max;
  const ratio = (txn.amount / maxBaseline);

  if (ratioBadge) {
    if (ratio > 1) {
      ratioBadge.textContent = `${ratio.toFixed(1)}x Normal Limit`;
      ratioBadge.className = 'badge badge-rose';
    } else {
      ratioBadge.textContent = 'Within Baseline';
      ratioBadge.className = 'badge badge-emerald';
    }
  }

  if (spikeMarker) {
    let pct = Math.min(95, Math.max(10, Math.round((txn.amount / (maxBaseline * 4)) * 100)));
    if (ratio > 15) pct = 93;
    spikeMarker.style.left = `${pct}%`;
  }

  // Update Explainable AI (XAI) Waterfall Bars
  renderWaterfallBars(result.factors);
}

function renderWaterfallBars(factors) {
  const container = document.getElementById('sbWaterfallList');
  if (!container) return;

  container.innerHTML = factors.map(f => {
    let barColor = 'var(--emerald)';
    let pointsClass = 'text-emerald';

    if (f.severity === 'critical') {
      barColor = 'var(--rose)';
      pointsClass = 'text-rose';
    } else if (f.severity === 'high') {
      barColor = 'var(--amber)';
      pointsClass = 'text-amber';
    } else if (f.severity === 'medium') {
      barColor = 'var(--cyan)';
      pointsClass = 'text-cyan';
    }

    const widthPct = Math.min(100, Math.max(4, (f.contribution / 40) * 100));

    return `
      <div class="waterfall-item">
        <div class="wf-title-row">
          <span class="wf-factor-name">${f.title}</span>
          <span class="wf-points ${pointsClass}">
            ${f.contribution > 0 ? `+${f.contribution}` : '0'} pts
          </span>
        </div>
        <div class="wf-track">
          <div class="wf-fill" style="width: ${widthPct}%; background: ${barColor};"></div>
        </div>
        <p class="wf-desc">${f.detail}</p>
      </div>
    `;
  }).join('');
}

/* ==========================================================================
   4. RULES & POLICY CONFIGURATION CONTROLLER
   ========================================================================== */
function initPolicyControls() {
  const inLow = document.getElementById('inputLowThresh');
  const inMed = document.getElementById('inputMedThresh');
  const inHigh = document.getElementById('inputHighThresh');
  const saveBtn = document.getElementById('saveRulesBtn');
  const addRuleBtn = document.getElementById('addRuleBtn');

  function updateThresholdLabels() {
    const low = Number(inLow.value);
    const med = Number(inMed.value);
    const high = Number(inHigh.value);

    document.getElementById('lowThreshVal').textContent = `0 - ${low}`;
    document.getElementById('medThreshVal').textContent = `${low + 1} - ${med}`;
    document.getElementById('highThreshVal').textContent = `${med + 1} - ${high}`;
    document.getElementById('critThreshVal').textContent = `${high + 1} - 100`;

    STATE.thresholds = {
      lowMax: low,
      mediumMax: med,
      highMax: high,
      criticalMin: high + 1
    };
  }

  if (inLow) inLow.addEventListener('input', updateThresholdLabels);
  if (inMed) inMed.addEventListener('input', updateThresholdLabels);
  if (inHigh) inHigh.addEventListener('input', updateThresholdLabels);

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      // Re-evaluate all existing transactions under new rules
      STATE.transactions.forEach(t => {
        const profile = USER_PROFILES[t.user] || USER_PROFILES['usr_mumbai_01'];
        t.evaluation = evaluateTransaction(t, profile, STATE.thresholds);
      });
      renderTransactionList();
      updateFilterCounts();
      showToast('Fraud Rulebook & Thresholds Deployed to Gateway!');
    });
  }

  if (addRuleBtn) {
    addRuleBtn.addEventListener('click', () => {
      showToast('Custom Rule Template Created: Velocity Spike Guard (+20 pts)');
    });
  }
}

/* ==========================================================================
   5. SECOPS INCIDENTS & BASELINE EXPLORER
   ========================================================================== */
function initSecOpsIncidents() {
  renderIncidentsTable();
  renderUserBaselineProfile(STATE.activeProfileTab);

  // Profile Selector Tabs
  const profileTabs = document.querySelectorAll('.profile-tab-btn');
  profileTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      profileTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const userId = btn.getAttribute('data-user');
      STATE.activeProfileTab = userId;
      renderUserBaselineProfile(userId);
    });
  });

  // Export JSON Button
  const exportBtn = document.getElementById('exportAuditJsonBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(STATE.transactions, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `RiskShield_Security_Audit_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Audit JSON Log Exported Successfully!');
    });
  }
}

function renderIncidentsTable() {
  const tbody = document.getElementById('incidentsTableBody');
  if (!tbody) return;

  const escalated = STATE.transactions.filter(t => t.evaluation.riskLevel === 'HIGH' || t.evaluation.riskLevel === 'CRITICAL');
  
  const counterEl = document.getElementById('incidentsCounter');
  const badgeEl = document.getElementById('activeIncidentsBadge');
  if (counterEl) counterEl.textContent = escalated.length;
  if (badgeEl) badgeEl.textContent = `${escalated.length} Awaiting Review`;

  if (escalated.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-dim); padding: 2rem;">
          No active high/critical risk incidents currently pending review.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = escalated.map(txn => {
    const evalRes = txn.evaluation;
    const profile = USER_PROFILES[txn.user] || USER_PROFILES['usr_mumbai_01'];
    const topFactor = evalRes.factors[0] ? evalRes.factors[0].title : 'Unusual Activity';

    let scoreBadge = 'badge-rose';
    let statusClass = 'text-rose';
    if (evalRes.riskLevel === 'HIGH') {
      scoreBadge = 'badge-amber';
      statusClass = 'text-amber';
    }

    return `
      <tr>
        <td>
          <div class="font-mono font-bold text-white">${txn.id}</div>
          <div class="text-xs text-dim">${txn.timestamp}</div>
        </td>
        <td>
          <div class="font-bold text-white">${profile.name}</div>
          <div class="text-xs text-dim">${txn.merchant}</div>
        </td>
        <td class="font-mono font-bold text-white">₹${Number(txn.amount).toLocaleString('en-IN')}</td>
        <td>
          <span class="badge ${scoreBadge}">Score ${evalRes.riskScore}</span>
        </td>
        <td class="text-xs text-muted" style="max-width: 200px;">${topFactor}</td>
        <td>
          <strong class="${statusClass} text-xs font-mono">${evalRes.action}</strong>
        </td>
        <td>
          <div class="table-action-btns">
            <button class="btn btn-xs btn-outline-cyan btn-review-incident" data-id="${txn.id}">Inspect</button>
            <button class="btn btn-xs btn-amber btn-stepup-incident" data-id="${txn.id}">2FA</button>
            <button class="btn btn-xs btn-rose btn-block-incident" data-id="${txn.id}">Block</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Table action button handlers
  tbody.querySelectorAll('.btn-review-incident').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const txn = STATE.transactions.find(t => t.id === id);
      if (txn) openAuditModal(txn);
    });
  });

  tbody.querySelectorAll('.btn-stepup-incident').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const txn = STATE.transactions.find(t => t.id === id);
      if (txn) openStepUpModal(txn);
    });
  });

  tbody.querySelectorAll('.btn-block-incident').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const txn = STATE.transactions.find(t => t.id === id);
      if (txn) {
        txn.evaluation.action = 'PERMANENT_BLOCKED';
        txn.evaluation.riskLevel = 'CRITICAL';
        txn.evaluation.badgeColor = 'rose';
        showToast(`User ${txn.user} permanently blacklisted!`);
        renderIncidentsTable();
        renderTransactionList();
      }
    });
  });
}

function renderUserBaselineProfile(userId) {
  const container = document.getElementById('userBaselineView');
  if (!container) return;

  const profile = USER_PROFILES[userId];
  if (!profile) return;

  container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.65rem;">
      <div>
        <h4 style="color: #fff; font-size: 0.95rem;">${profile.name}</h4>
        <span class="text-xs text-muted">${profile.email} • ${profile.phone}</span>
      </div>
      <span class="badge badge-indigo">${profile.riskTier} RISK PROFILE</span>
    </div>

    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.65rem; font-size: 0.8rem;">
      <div>
        <span class="text-dim text-xs">Habitual Amount Baseline:</span>
        <div class="font-mono font-bold text-emerald">₹${profile.baselineAmount.min.toLocaleString('en-IN')} – ₹${profile.baselineAmount.max.toLocaleString('en-IN')}</div>
      </div>
      <div>
        <span class="text-dim text-xs">Home Location:</span>
        <div class="font-bold text-white">${profile.homeCity} (India)</div>
      </div>
      <div>
        <span class="text-dim text-xs">Active Account Age:</span>
        <div class="font-mono text-cyan">${profile.accountAgeDays} days active</div>
      </div>
      <div>
        <span class="text-dim text-xs">Typical Active Window:</span>
        <div class="font-mono text-white">${profile.normalHours[0]}:00 – ${profile.normalHours[1]}:00 IST</div>
      </div>
    </div>

    <div style="border-top: 1px solid var(--border-subtle); padding-top: 0.65rem;">
      <span class="text-dim text-xs">Hardware Fingerprints &amp; Trusted Devices:</span>
      <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.35rem;">
        ${profile.trustedDevices.map(d => `<span class="tag">${d}</span>`).join('')}
      </div>
    </div>
  `;
}

/* ==========================================================================
   6. INTERACTIVE MODALS (STEP-UP 2FA & AUDIT JSON)
   ========================================================================== */
function initModals() {
  // Step-Up Modal Elements
  const stepUpModal = document.getElementById('stepUpModal');
  const closeStepUpBtn = document.getElementById('closeStepUpModalBtn');
  const autofillOtpBtn = document.getElementById('autofillOtpBtn');
  const verifyOtpBtn = document.getElementById('verifyOtpBtn');
  const failOtpBtn = document.getElementById('failChallengeBtn');
  const resultMsg = document.getElementById('otpValidationResult');

  if (closeStepUpBtn && stepUpModal) {
    closeStepUpBtn.addEventListener('click', () => {
      stepUpModal.classList.remove('active');
    });
  }

  if (autofillOtpBtn) {
    autofillOtpBtn.addEventListener('click', () => {
      const otpBoxes = document.querySelectorAll('.otp-box');
      const demoCode = ['7', '3', '9', '2', '1', '8'];
      otpBoxes.forEach((box, i) => { box.value = demoCode[i]; });
    });
  }

  if (verifyOtpBtn) {
    verifyOtpBtn.addEventListener('click', () => {
      const enteredOtp = Array.from(document.querySelectorAll('.otp-box')).map(b => b.value).join('');
      if (enteredOtp === '739218') {
        resultMsg.className = 'otp-result-msg otp-result-success';
        resultMsg.textContent = '✓ Step-Up Authentication Successful! Payment Authorized.';
        resultMsg.classList.remove('hidden');

        setTimeout(() => {
          if (STATE.activeIncidentId) {
            const txn = STATE.transactions.find(t => t.id === STATE.activeIncidentId);
            if (txn) {
              txn.evaluation.action = 'ALLOWED (2FA Verified)';
              txn.evaluation.riskLevel = 'LOW';
              txn.evaluation.badgeColor = 'emerald';
              txn.evaluation.riskScore = 15;
            }
          }
          stepUpModal.classList.remove('active');
          resultMsg.classList.add('hidden');
          renderTransactionList();
          renderIncidentsTable();
          showToast('Payment Verified via Step-Up 2FA!');
        }, 1200);
      } else {
        resultMsg.className = 'otp-result-msg otp-result-error';
        resultMsg.textContent = '✗ Invalid OTP code entered. Please try demo code 739218.';
        resultMsg.classList.remove('hidden');
      }
    });
  }

  if (failOtpBtn) {
    failOtpBtn.addEventListener('click', () => {
      resultMsg.className = 'otp-result-msg otp-result-error';
      resultMsg.textContent = '✗ Multiple failed verification attempts. Transaction BLOCKED.';
      resultMsg.classList.remove('hidden');

      setTimeout(() => {
        if (STATE.activeIncidentId) {
          const txn = STATE.transactions.find(t => t.id === STATE.activeIncidentId);
          if (txn) {
            txn.evaluation.action = 'BLOCKED (2FA Failed)';
            txn.evaluation.riskLevel = 'CRITICAL';
            txn.evaluation.badgeColor = 'rose';
            txn.evaluation.riskScore = 95;
          }
        }
        stepUpModal.classList.remove('active');
        resultMsg.classList.add('hidden');
        renderTransactionList();
        renderIncidentsTable();
        showToast('Step-Up Failed! Transaction Declined and Blocked.');
      }, 1400);
    });
  }

  // Audit Modal Elements
  const auditModal = document.getElementById('auditModal');
  const closeAuditModalBtn = document.getElementById('closeAuditModalBtn');
  const closeAuditBtn = document.getElementById('closeAuditBtn');
  const copyBtn = document.getElementById('copyAuditJsonBtn');

  if (closeAuditModalBtn && auditModal) {
    closeAuditModalBtn.addEventListener('click', () => auditModal.classList.remove('active'));
  }
  if (closeAuditBtn && auditModal) {
    closeAuditBtn.addEventListener('click', () => auditModal.classList.remove('active'));
  }
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const code = document.getElementById('auditJsonCode').textContent;
      navigator.clipboard.writeText(code).then(() => {
        showToast('JSON Copied to Clipboard!');
      });
    });
  }
}

function openStepUpModal(txn) {
  STATE.activeIncidentId = txn.id;
  const modal = document.getElementById('stepUpModal');
  const idEl = document.getElementById('modalTxnId');
  const amtEl = document.getElementById('modalAmount');
  const badgeEl = document.getElementById('modalScoreBadge');
  const resultMsg = document.getElementById('otpValidationResult');

  if (idEl) idEl.textContent = txn.id;
  if (amtEl) amtEl.textContent = `₹${Number(txn.amount).toLocaleString('en-IN')}`;
  if (badgeEl) badgeEl.textContent = `Risk Score: ${txn.evaluation ? txn.evaluation.riskScore : 78} (HIGH RISK)`;
  if (resultMsg) resultMsg.classList.add('hidden');

  if (modal) modal.classList.add('active');
}

function openAuditModal(txn) {
  const modal = document.getElementById('auditModal');
  const codeEl = document.getElementById('auditJsonCode');

  if (codeEl) {
    const payload = {
      gateway: 'Razorpay RiskShield Enterprise',
      transactionId: txn.id,
      timestamp: new Date().toISOString(),
      user: USER_PROFILES[txn.user] || txn.user,
      telemetry: {
        amount: txn.amount,
        currency: 'INR',
        merchant: txn.merchant,
        location: txn.location,
        deviceFingerprint: txn.device,
        ipAddress: txn.ip,
        isVpnOrProxy: txn.isVpnOrProxy,
        preAuthFailedLogins: txn.failedLogins
      },
      aiRiskEvaluation: txn.evaluation
    };
    codeEl.textContent = JSON.stringify(payload, null, 2);
  }

  if (modal) modal.classList.add('active');
}

/* ==========================================================================
   7. TOAST NOTIFICATIONS
   ========================================================================== */
function showToast(message) {
  const toast = document.getElementById('toastNotification');
  const msgEl = document.getElementById('toastMessage');

  if (toast && msgEl) {
    msgEl.textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3200);
  }
}
