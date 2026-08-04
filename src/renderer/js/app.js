// ============================================================
//  SGVA Assistant — Frontend Logic
// ============================================================

// ===== Navigation =====
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view');

function switchView(targetId) {
  navItems.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.target === targetId);
  });
  views.forEach(view => {
    view.classList.toggle('active', view.id === targetId);
  });
}

navItems.forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.target));
});

document.getElementById('go-settings-btn').addEventListener('click', () => {
  switchView('settings');
});

// ===== Settings Elements =====
const form = document.getElementById('settings-form');
const inputUser = document.getElementById('sgva-user');
const inputPass = document.getElementById('sgva-pass');
const inputGroq = document.getElementById('groq-key');
const inputDept = document.getElementById('sgva-dept');
const inputCity = document.getElementById('sgva-city');
const inputLimit = document.getElementById('sgva-limit');
const inputOrder = document.getElementById('sgva-order');
const inputLowEnd = document.getElementById('sgva-low-end');

// Custom Select Elements (Location)
const wrapperDept = document.getElementById('wrapper-dept');
const wrapperCity = document.getElementById('wrapper-city');
const triggerDept = document.getElementById('trigger-dept');
const triggerCity = document.getElementById('trigger-city');
const optionsDept = document.getElementById('options-dept');
const optionsCity = document.getElementById('options-city');

let locationsData = {};

// ===== Load / Save Settings =====
function loadSettings() {
  inputUser.value = localStorage.getItem('sgva-user') || '';
  inputPass.value = localStorage.getItem('sgva-pass') || '';
  inputGroq.value = localStorage.getItem('groq-key') || '';
  inputDept.value = localStorage.getItem('sgva-dept') || 'BOGOTA D.C.';
  inputCity.value = localStorage.getItem('sgva-city') || 'BOGOTA D. C.';
  inputLimit.value = localStorage.getItem('sgva-limit') || '0';
  inputOrder.value = localStorage.getItem('sgva-order') || 'first';

  const isLowEnd = localStorage.getItem('sgva-low-end') === 'true';
  inputLowEnd.checked = isLowEnd;
  document.body.classList.toggle('low-end', isLowEnd);

  // Apply limit & order to their custom selects
  applyStaticSelectValue('wrapper-limit', 'trigger-limit', 'options-limit', 'sgva-limit', inputLimit.value);
  applyStaticSelectValue('wrapper-order', 'trigger-order', 'options-order', 'sgva-order', inputOrder.value);
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  localStorage.setItem('sgva-user', inputUser.value);
  localStorage.setItem('sgva-pass', inputPass.value);
  localStorage.setItem('groq-key', inputGroq.value);
  localStorage.setItem('sgva-dept', inputDept.value);
  localStorage.setItem('sgva-city', inputCity.value);
  localStorage.setItem('sgva-limit', inputLimit.value);
  localStorage.setItem('sgva-order', inputOrder.value);

  const isLowEnd = inputLowEnd.checked;
  localStorage.setItem('sgva-low-end', isLowEnd);
  document.body.classList.toggle('low-end', isLowEnd);

  switchView('extractor');
});

// ===== Password visibility toggles =====
function setupPasswordToggle(buttonId, inputId) {
  const btn = document.getElementById(buttonId);
  const inp = document.getElementById(inputId);
  if (!btn || !inp) return;
  btn.addEventListener('click', () => {
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    btn.querySelector('i').className = show ? 'ph ph-eye-slash' : 'ph ph-eye';
  });
}
setupPasswordToggle('toggle-pass', 'sgva-pass');
setupPasswordToggle('toggle-groq', 'groq-key');

// ===== Generic Static Custom Selects (Limit & Order) =====
function setupStaticCustomSelect(wrapperId, triggerId, optionsId, hiddenId) {
  const wrapper = document.getElementById(wrapperId);
  const trigger = document.getElementById(triggerId);
  const optionsEl = document.getElementById(optionsId);
  const hidden = document.getElementById(hiddenId);

  if (!wrapper || !trigger || !optionsEl) return;

  trigger.addEventListener('click', () => {
    wrapper.querySelector('.custom-select').classList.toggle('open');
  });

  optionsEl.querySelectorAll('.custom-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const val = opt.dataset.value;
      const text = opt.textContent;
      hidden.value = val;
      trigger.querySelector('span').textContent = text;
      optionsEl.querySelectorAll('.custom-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      wrapper.querySelector('.custom-select').classList.remove('open');
    });
  });

  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      wrapper.querySelector('.custom-select').classList.remove('open');
    }
  });
}

function applyStaticSelectValue(wrapperId, triggerId, optionsId, hiddenId, value) {
  const optionsEl = document.getElementById(optionsId);
  const trigger = document.getElementById(triggerId);
  if (!optionsEl || !trigger) return;
  const match = optionsEl.querySelector(`.custom-option[data-value="${value}"]`);
  if (match) {
    trigger.querySelector('span').textContent = match.textContent;
    optionsEl.querySelectorAll('.custom-option').forEach(o => o.classList.remove('selected'));
    match.classList.add('selected');
    document.getElementById(hiddenId).value = value;
  }
}

setupStaticCustomSelect('wrapper-limit', 'trigger-limit', 'options-limit', 'sgva-limit');
setupStaticCustomSelect('wrapper-order', 'trigger-order', 'options-order', 'sgva-order');

// ===== Dynamic Custom Selects (Dept & City) =====
function setupDynamicCustomSelects() {
  triggerDept.addEventListener('click', () => {
    wrapperDept.querySelector('.custom-select').classList.toggle('open');
    wrapperCity.querySelector('.custom-select').classList.remove('open');
  });

  triggerCity.addEventListener('click', () => {
    if (!wrapperCity.querySelector('.custom-select').classList.contains('disabled')) {
      wrapperCity.querySelector('.custom-select').classList.toggle('open');
      wrapperDept.querySelector('.custom-select').classList.remove('open');
    }
  });

  document.addEventListener('click', (e) => {
    if (!wrapperDept.contains(e.target)) wrapperDept.querySelector('.custom-select').classList.remove('open');
    if (!wrapperCity.contains(e.target)) wrapperCity.querySelector('.custom-select').classList.remove('open');
  });
}

async function fetchLocations() {
  try {
    const response = await fetch('./assets/locations.json');
    const data = await response.json();
    locationsData = data.locations;
    populateDepartments();
    applyLocationSettings();
  } catch (error) {
    console.error('Error cargando locations.json:', error);
  }
}

function applyLocationSettings() {
  const dept = inputDept.value;
  const city = inputCity.value;
  if (dept && locationsData[dept]) {
    selectDepartment(dept);
    if (city && locationsData[dept].includes(city)) {
      selectCityOption(city);
    }
  }
}

function populateDepartments() {
  optionsDept.innerHTML = '';
  Object.keys(locationsData).sort().forEach(dept => {
    const div = document.createElement('div');
    div.className = 'custom-option';
    div.textContent = dept;
    div.addEventListener('click', () => {
      selectDepartment(dept);
      wrapperDept.querySelector('.custom-select').classList.remove('open');
    });
    optionsDept.appendChild(div);
  });
}

function selectDepartment(dept) {
  inputDept.value = dept;
  triggerDept.querySelector('span').textContent = dept;
  Array.from(optionsDept.children).forEach(c => c.classList.toggle('selected', c.textContent === dept));
  populateCities(dept);
}

function populateCities(dept) {
  optionsCity.innerHTML = '';
  const selectCity = wrapperCity.querySelector('.custom-select');
  if (!dept || !locationsData[dept]) {
    selectCity.classList.add('disabled');
    triggerCity.querySelector('span').textContent = 'Seleccione una ciudad';
    inputCity.value = '';
    return;
  }
  selectCity.classList.remove('disabled');
  locationsData[dept].sort().forEach(city => {
    const div = document.createElement('div');
    div.className = 'custom-option';
    div.textContent = city;
    div.addEventListener('click', () => {
      selectCityOption(city);
      selectCity.classList.remove('open');
    });
    optionsCity.appendChild(div);
  });
  triggerCity.querySelector('span').textContent = 'Seleccione una ciudad';
  inputCity.value = '';
}

function selectCityOption(city) {
  inputCity.value = city;
  triggerCity.querySelector('span').textContent = city;
  Array.from(optionsCity.children).forEach(c => c.classList.toggle('selected', c.textContent === city));
}

setupDynamicCustomSelects();
loadSettings();
fetchLocations();

// ===== Stepper Logic =====
const btnStart = document.getElementById('btn-start');
const terminalOutput = document.getElementById('terminal-output');
const resultsContainer = document.getElementById('results-container');

const stepperIdle = document.getElementById('stepper-idle');
const stepperProgress = document.getElementById('stepper-progress');
const stepperDone = document.getElementById('stepper-done');
const stepperError = document.getElementById('stepper-error');
const doneTitle = document.getElementById('done-title');
const doneMessage = document.getElementById('done-message');
const errorTitle = document.getElementById('error-title');
const errorMessage = document.getElementById('error-message');

const STEPS_ORDER = ['browser', 'login', 'navigate', 'search', 'ai'];
let currentStepIndex = -1;
let isExtracting = false;

function showState(state) {
  stepperIdle.style.display = state === 'idle' ? 'flex' : 'none';
  stepperProgress.style.display = state === 'progress' ? '' : 'none';
  stepperDone.style.display = state === 'done' ? 'flex' : 'none';
  stepperError.style.display = state === 'error' ? 'flex' : 'none';
}

function resetStepper() {
  currentStepIndex = -1;
  STEPS_ORDER.forEach(id => {
    const el = document.getElementById(`step-${id}`);
    if (el) el.classList.remove('active', 'done', 'error');
  });
}

function advanceToStep(stepId) {
  const newIndex = STEPS_ORDER.indexOf(stepId);
  if (newIndex === -1) return;
  for (let i = 0; i <= currentStepIndex; i++) {
    const el = document.getElementById(`step-${STEPS_ORDER[i]}`);
    if (el) { el.classList.remove('active'); el.classList.add('done'); }
  }
  const newEl = document.getElementById(`step-${stepId}`);
  if (newEl) newEl.classList.add('active');
  currentStepIndex = newIndex;
}

function markCurrentStepError() {
  if (currentStepIndex >= 0) {
    const el = document.getElementById(`step-${STEPS_ORDER[currentStepIndex]}`);
    if (el) { el.classList.remove('active'); el.classList.add('error'); }
  }
}

function markAllDone() {
  STEPS_ORDER.forEach(id => {
    const el = document.getElementById(`step-${id}`);
    if (el) { el.classList.remove('active'); el.classList.add('done'); }
  });
}

function addLog(msg) {
  const line = document.createElement('div');
  line.textContent = msg;
  terminalOutput.appendChild(line);
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

// ===== Render Results =====
const offersBadge = document.getElementById('offers-badge');
const statTotalNum = document.getElementById('stat-total-num');

function updateOfferCount(count) {
  if (offersBadge) {
    offersBadge.style.display = count > 0 ? '' : 'none';
    offersBadge.textContent = count;
  }
  if (statTotalNum) statTotalNum.textContent = count;
}

function renderResults(ofertas) {
  updateOfferCount(ofertas ? ofertas.length : 0);

  if (!ofertas || ofertas.length === 0) {
    resultsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-illustration"><i class="ph ph-briefcase-metal"></i></div>
        <h3>Sin ofertas todavía</h3>
        <p>Inicia el extractor para encontrar ofertas disponibles en el portal SGVA.</p>
        <button class="btn btn-outline" onclick="document.querySelector('[data-target=extractor]').click()">
          <i class="ph ph-robot"></i>
          Ir al Extractor
        </button>
      </div>`;
    return;
  }

  resultsContainer.innerHTML = '';
  ofertas.forEach(of => {
    const card = document.createElement('div');
    card.className = 'oferta-card';

    const funciones = (of.Funciones || []).slice(0, 5);
    const funcionesHtml = funciones.map(f => `<div class="funcion-chip">${f}</div>`).join('');
    const fechaInicio = of.FechaInicio || null;
    const fechaFin = of.FechaLimite || of.FechaFin || null;

    const datesHtml = (fechaInicio || fechaFin) ? `
      <div class="oferta-dates">
        ${fechaInicio ? `<div class="date-pill"><i class="ph ph-calendar-check"></i>${fechaInicio}</div>` : ''}
        ${fechaFin ? `<div class="date-pill"><i class="ph ph-calendar-x"></i>Cierre: ${fechaFin}</div>` : ''}
      </div>` : '';

    card.innerHTML = `
      <div class="oferta-card-header">
        <div class="empresa-name">${of.Empresa || 'Empresa No Especificada'}</div>
        <div class="empresa-badge"><i class="ph-fill ph-buildings"></i></div>
      </div>
      <div class="oferta-card-body">
        <div class="oferta-meta">
          <div class="meta-row">
            <i class="ph ph-user-circle"></i>
            <span>${of.Contacto || 'Sin contacto definido'}</span>
          </div>
        </div>
        ${funciones.length > 0 ? `
        <div class="oferta-funciones">
          <div class="funciones-title">Funciones</div>
          <div class="funciones-list">${funcionesHtml}</div>
        </div>` : ''}
        ${datesHtml}
      </div>
    `;
    resultsContainer.appendChild(card);
  });
}

// ===== Extractor Start Button =====
btnStart.addEventListener('click', async () => {
  if (isExtracting) return;

  const user = localStorage.getItem('sgva-user');
  const pass = localStorage.getItem('sgva-pass');
  const groq = localStorage.getItem('groq-key');
  const dept = localStorage.getItem('sgva-dept');
  const city = localStorage.getItem('sgva-city');
  const limit = localStorage.getItem('sgva-limit') || '0';
  const order = localStorage.getItem('sgva-order') || 'first';

  if (!user || !pass || !groq) {
    showState('error');
    errorTitle.textContent = 'Configuración incompleta';
    errorMessage.textContent = 'Necesitas configurar tus credenciales y API Key antes de iniciar. Ve a Configuración.';
    return;
  }

  isExtracting = true;
  resetStepper();
  showState('progress');
  terminalOutput.innerHTML = '';

  window.api.onScraperStep(stepId => advanceToStep(stepId));
  window.api.onScraperLog(message => addLog(message));

  try {
    const savedOffers = await window.api.getSavedOffers();
    const savedCount = savedOffers ? savedOffers.length : 0;

    let scanAction = 'accumulate';

    if (savedCount > 0) {
      const preference = getScanModePreference();

      if (preference === 'replace') {
        scanAction = 'replace';
      } else if (preference === 'accumulate') {
        scanAction = 'accumulate';
      } else {
        scanAction = await showScanDecisionModal(savedCount);
      }
    }

    if (scanAction === null) {
      isExtracting = false;
      window.api.removeAllScraperListeners();
      showState('idle');
      resetStepper();
      return;
    }

    if (scanAction === 'replace') {
      await window.api.clearDatabase();
      addLog('Base de datos limpiada antes del escaneo.');
    }

    const response = await window.api.startScraping({
      username: user, password: pass, groqApiKey: groq,
      departamento: dept, ciudad: city, limit, order
    });

    if (response.success) {
      markAllDone();
      const count = response.data ? response.data.length : 0;
      doneTitle.textContent = 'Extracción completada';
      doneMessage.textContent = `Se procesaron ${count} oferta(s) en esta sesión. Revisa la pestaña de Ofertas para ver todos los resultados guardados.`;
      showState('done');
      loadSavedOffers();
    } else {
      markCurrentStepError();
      errorTitle.textContent = 'No se pudo completar la extracción';
      errorMessage.textContent = response.error;
      showState('error');
    }
  } catch (err) {
    markCurrentStepError();
    errorTitle.textContent = 'Error inesperado';
    errorMessage.textContent = err.message || 'Ocurrió un problema. Por favor, reinicia la aplicación.';
    showState('error');
  } finally {
    isExtracting = false;
    window.api.removeAllScraperListeners();
  }
});

document.getElementById('btn-retry').addEventListener('click', () => { showState('idle'); resetStepper(); });
document.getElementById('btn-go-results').addEventListener('click', () => switchView('results'));

// ===== Limpiar BD desde resultados =====
const btnClearResults = document.getElementById('btn-clear-results');
if (btnClearResults) {
  btnClearResults.addEventListener('click', async () => {
    if (currentOffers.length === 0) return;
    try {
      await window.api.clearDatabase();
      currentOffers = [];
      renderResults(currentOffers);
      updateOfferCount(0);
      addLog('Base de datos limpiada desde resultados.');
    } catch (e) {
      console.error('Error al limpiar la base de datos:', e);
    }
  });
}

// ===== Modal: Decisión de escaneo =====
const scanDecisionModal = document.getElementById('scan-decision-modal');
const modalSubtitle = document.getElementById('modal-subtitle');
const modalReplace = document.querySelector('.modal-option-replace');
const modalAccumulate = document.querySelector('.modal-option-accumulate');
const modalConfirm = document.getElementById('modal-confirm');
const modalCancel = document.getElementById('modal-cancel');
const modalDontAsk = document.getElementById('modal-dont-ask');

let scanDecisionResolve = null;
let selectedScanAction = null;

function getScanModePreference() {
  return localStorage.getItem('sgva-scan-mode') || 'ask';
}

function setScanModePreference(mode) {
  localStorage.setItem('sgva-scan-mode', mode);
}

function showScanDecisionModal(offerCount) {
  return new Promise((resolve) => {
    scanDecisionResolve = resolve;
    selectedScanAction = null;

    modalSubtitle.textContent = `Tienes ${offerCount} oferta${offerCount !== 1 ? 's' : ''} guardada${offerCount !== 1 ? 's' : ''} de escaneos anteriores.`;

    modalReplace.classList.remove('selected');
    modalAccumulate.classList.remove('selected');
    modalDontAsk.checked = false;
    scanDecisionModal.style.display = 'flex';

    modalReplace.focus();
  });
}

function hideScanDecisionModal() {
  scanDecisionModal.style.display = 'none';
}

modalReplace.addEventListener('click', () => {
  modalReplace.classList.add('selected');
  modalAccumulate.classList.remove('selected');
  selectedScanAction = 'replace';
});

modalAccumulate.addEventListener('click', () => {
  modalAccumulate.classList.add('selected');
  modalReplace.classList.remove('selected');
  selectedScanAction = 'accumulate';
});

modalCancel.addEventListener('click', () => {
  hideScanDecisionModal();
  if (scanDecisionResolve) {
    scanDecisionResolve(null);
    scanDecisionResolve = null;
  }
});

modalConfirm.addEventListener('click', () => {
  if (!selectedScanAction) {
    modalReplace.classList.add('selected');
    selectedScanAction = 'replace';
  }

  if (modalDontAsk.checked) {
    setScanModePreference(selectedScanAction);
  }

  hideScanDecisionModal();
  if (scanDecisionResolve) {
    scanDecisionResolve(selectedScanAction);
    scanDecisionResolve = null;
  }
});

scanDecisionModal.addEventListener('click', (e) => {
  if (e.target === scanDecisionModal) {
    modalCancel.click();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && scanDecisionModal.style.display === 'flex') {
    modalCancel.click();
  }
});

// ===== Limpiar BD manual (Settings) =====
const btnClearDb = document.getElementById('btn-clear-db');
if (btnClearDb) {
  btnClearDb.addEventListener('click', async () => {
    try {
      await window.api.clearDatabase();
      currentOffers = [];
      renderResults(currentOffers);
      updateOfferCount(0);
      addLog('Base de datos limpiada.');
    } catch (e) {
      console.error('Error al limpiar la base de datos:', e);
    }
  });
}
let currentOffers = [];

async function loadSavedOffers() {
  try {
    const saved = await window.api.getSavedOffers();
    currentOffers = saved || [];
    renderResults(currentOffers);
  } catch (e) {
    console.error('No se pudieron cargar ofertas guardadas:', e);
  }
}

loadSavedOffers();

const searchInput = document.getElementById('search-ofertas');
const searchClear = document.getElementById('search-clear');

searchInput.addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase();
  searchClear.style.display = term ? '' : 'none';

  if (!term) { renderResults(currentOffers); return; }

  const filtered = currentOffers.filter(of => {
    const empresa = (of.Empresa || '').toLowerCase();
    const contacto = (of.Contacto || '').toLowerCase();
    const funciones = (of.Funciones || []).join(' ').toLowerCase();
    return empresa.includes(term) || contacto.includes(term) || funciones.includes(term);
  });
  renderResults(filtered);
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchClear.style.display = 'none';
  renderResults(currentOffers);
});

// ===== Exportar =====
const wrapperExport = document.getElementById('wrapper-export');
const triggerExport = document.getElementById('trigger-export');
const optionsExport = document.getElementById('options-export');

if (wrapperExport && triggerExport && optionsExport) {
  triggerExport.addEventListener('click', () => {
    wrapperExport.querySelector('.custom-options').classList.toggle('open');
    // Also toggle a display block since we rely on custom-select open logic usually
    const opts = wrapperExport.querySelector('.custom-options');
    opts.style.display = opts.style.display === 'block' ? 'none' : 'block';
  });

  document.addEventListener('click', (e) => {
    if (!wrapperExport.contains(e.target)) {
      wrapperExport.querySelector('.custom-options').style.display = 'none';
    }
  });

  optionsExport.querySelectorAll('.custom-option').forEach(opt => {
    opt.addEventListener('click', async () => {
      wrapperExport.querySelector('.custom-options').style.display = 'none';
      
      const format = opt.dataset.value;
      if (currentOffers.length === 0) {
        alert('No hay ofertas para exportar.');
        return;
      }
      
      const triggerSpan = triggerExport.querySelector('span');
      const oldText = triggerSpan.textContent;
      triggerSpan.textContent = 'Exportando...';
      
      try {
        const res = await window.api.exportData(currentOffers, format);
        if (res && res.success) {
          triggerSpan.textContent = '¡Guardado!';
          setTimeout(() => { triggerSpan.textContent = oldText; }, 2000);
        } else {
          triggerSpan.textContent = oldText;
          if (res && !res.cancelado) {
            alert('Error al exportar: ' + (res.error || 'Desconocido'));
          }
        }
      } catch (e) {
        triggerSpan.textContent = oldText;
        console.error(e);
      }
    });
  });
}
