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
const inputModeloRank = document.getElementById('sgva-modelo-rank');
const inputModeloEmail = document.getElementById('sgva-modelo-email');

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
  inputModeloRank.value = localStorage.getItem('sgva-modelo-rank') || 'auto';
  inputModeloEmail.value = localStorage.getItem('sgva-modelo-email') || 'auto';

  const isLowEnd = localStorage.getItem('sgva-low-end') === 'true';
  inputLowEnd.checked = isLowEnd;
  document.body.classList.toggle('low-end', isLowEnd);

  // Apply limit & order to their custom selects
  applyStaticSelectValue('wrapper-limit', 'trigger-limit', 'options-limit', 'sgva-limit', inputLimit.value);
  applyStaticSelectValue('wrapper-order', 'trigger-order', 'options-order', 'sgva-order', inputOrder.value);
  applyStaticSelectValue('wrapper-modelo-rank', 'trigger-modelo-rank', 'options-modelo-rank', 'sgva-modelo-rank', inputModeloRank.value);
  applyStaticSelectValue('wrapper-modelo-email', 'trigger-modelo-email', 'options-modelo-email', 'sgva-modelo-email', inputModeloEmail.value);
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
  localStorage.setItem('sgva-modelo-rank', inputModeloRank.value);
  localStorage.setItem('sgva-modelo-email', inputModeloEmail.value);

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
setupStaticCustomSelect('wrapper-modelo-rank', 'trigger-modelo-rank', 'options-modelo-rank', 'sgva-modelo-rank');
setupStaticCustomSelect('wrapper-modelo-email', 'trigger-modelo-email', 'options-modelo-email', 'sgva-modelo-email');

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

const PRIORIDAD_CLASS = { alta: 'pri-alta', media: 'pri-media', baja: 'pri-baja' };
const PRIORIDAD_LABEL = { alta: 'Alta', media: 'Media', baja: 'Baja' };

function prioridadDe(oferta) {
  return (oferta && oferta.prioridad && PRIORIDAD_CLASS[oferta.prioridad]) ? oferta.prioridad : 'baja';
}

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

    const pri = prioridadDe(of);
    const puntaje = of.puntaje || 0;
    const prioridadHtml = `
      <div class="prioridad-badge ${PRIORIDAD_CLASS[pri]}" title="${of.motivo || ''}">
        <i class="ph-fill ph-flag"></i>
        <span>${PRIORIDAD_LABEL[pri]}</span>
        ${puntaje > 0 ? `<span class="puntaje-pill">${puntaje}%</span>` : ''}
      </div>`;

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
      ${prioridadHtml}
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
      <div class="oferta-card-footer">
        <button class="btn btn-outline btn-correo" data-empresa="${(of.Empresa || '').replace(/"/g, '&quot;')}" title="Generar correo de postulación con IA">
          <i class="ph ph-envelope-simple"></i>
          Generar Correo
        </button>
      </div>
    `;
    resultsContainer.appendChild(card);
  });

  // Vincular botones de correo
  resultsContainer.querySelectorAll('.btn-correo').forEach(btn => {
    btn.addEventListener('click', () => openEmailModal(btn.dataset.empresa));
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
      updateExportLabel();
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
    refreshPriorityFilters();
    renderResults(currentOffers);
    updateExportLabel();
  } catch (e) {
    console.error('No se pudieron cargar ofertas guardadas:', e);
  }
}

loadSavedOffers();

const searchInput = document.getElementById('search-ofertas');
const searchClear = document.getElementById('search-clear');
const priorityFilters = document.getElementById('priority-filters');

let currentPriorityFilter = 'todas';

function getFilteredOffers() {
  const term = searchInput.value.toLowerCase();
  let filtered = currentOffers;

  if (currentPriorityFilter !== 'todas') {
    filtered = filtered.filter(of => prioridadDe(of) === currentPriorityFilter);
  }

  if (!term) return filtered;

  return filtered.filter(of => {
    const empresa = (of.Empresa || '').toLowerCase();
    const contacto = (of.Contacto || '').toLowerCase();
    const funciones = (of.Funciones || []).join(' ').toLowerCase();
    return empresa.includes(term) || contacto.includes(term) || funciones.includes(term);
  });
}

function refreshPriorityFilters() {
  if (!priorityFilters) return;
  const hasPrioridad = currentOffers.some(of => of.prioridad);
  priorityFilters.style.display = hasPrioridad ? '' : 'none';
}

searchInput.addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase();
  searchClear.style.display = term ? '' : 'none';
  renderResults(getFilteredOffers());
  updateExportLabel();
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchClear.style.display = 'none';
  renderResults(getFilteredOffers());
  updateExportLabel();
});

if (priorityFilters) {
  priorityFilters.querySelectorAll('.priority-filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      currentPriorityFilter = chip.dataset.pri;
      priorityFilters.querySelectorAll('.priority-filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderResults(getFilteredOffers());
      updateExportLabel();
    });
  });
}

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
      const aExportar = getFilteredOffers();
      if (aExportar.length === 0) {
        alert('No hay ofertas para exportar (revisa los filtros).');
        return;
      }
      
      const triggerSpan = triggerExport.querySelector('span');
      const oldText = triggerSpan.textContent;
      triggerSpan.textContent = `Exportando ${aExportar.length}...`;
      
      try {
        const res = await window.api.exportData(aExportar, format);
        if (res && res.success) {
          triggerSpan.textContent = `¡Guardados ${aExportar.length}!`;
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

// Actualiza el label del botón Exportar con el conteo visible
function updateExportLabel() {
  if (!triggerExport) return;
  const count = getFilteredOffers().length;
  const span = triggerExport.querySelector('span');
  if (span) span.textContent = `Exportar (${count})`;
}

// ===== Vista IA: CV, perfil, clasificación y correos =====
const cvDropzone = document.getElementById('cv-dropzone');
const cvFileInput = document.getElementById('cv-file-input');
const cvPasteToggle = document.getElementById('cv-paste-toggle');
const cvTextareaWrap = document.getElementById('cv-textarea-wrap');
const cvPastedText = document.getElementById('cv-pasted-text');
const btnSanitizeCv = document.getElementById('btn-sanitize-cv');
const btnExtractProfile = document.getElementById('btn-extract-profile');
const btnExtractProfile2 = document.getElementById('btn-extract-profile-2');
const cvCleanSection = document.getElementById('ai-step-2');
const cvCleanText = document.getElementById('cv-clean-text');
const cvProfileSection = document.getElementById('ai-step-3');
const cvProfileContent = document.getElementById('cv-profile-content');
const cvQualityWarning = document.getElementById('cv-quality-warning');
const btnRankOffers = document.getElementById('btn-rank-offers');
const btnClearPriorities = document.getElementById('btn-clear-priorities');
const rankSummary = document.getElementById('rank-summary');
const iaLogBox = document.getElementById('ia-log-box');
const aiProgressSteps = document.querySelectorAll('.ai-progress-step');

let cvActual = ''; // texto crudo o pegado
let cvNombreArchivo = '';

function setAiStepActive(num) {
  if (!aiProgressSteps || !aiProgressSteps.length) return;
  aiProgressSteps.forEach(s => {
    const stepNum = parseInt(s.dataset.aiStep, 10);
    s.classList.toggle('active', stepNum === num);
    s.classList.toggle('done', stepNum < num);
  });

  const lineas = document.querySelectorAll('.ai-progress-line');
  lineas.forEach((l, i) => l.classList.toggle('done', i + 1 < num));
}

function markAiStepDone(stepId, done) {
  const el = document.getElementById(stepId);
  if (el) el.classList.toggle('done', done);
}

function cvGroqKey() {
  return localStorage.getItem('groq-key') || '';
}

function iaLog(msg) {
  if (!iaLogBox) return;
  if (iaLogBox.dataset.empty === undefined && iaLogBox.children.length === 1) {
    iaLogBox.innerHTML = '';
  }
  iaLogBox.dataset.empty = '0';
  const line = document.createElement('div');
  line.className = 'ia-log-line';
  line.textContent = msg;
  iaLogBox.appendChild(line);
  iaLogBox.scrollTop = iaLogBox.scrollHeight;
}

function addQualityWarning(motivo) {
  if (cvQualityWarning) {
    cvQualityWarning.querySelector('span').textContent = motivo;
    cvQualityWarning.style.display = 'flex';
  }
}

function setCvButtonsEnabled(enabled) {
  if (btnSanitizeCv) btnSanitizeCv.disabled = !enabled;
  if (btnExtractProfile) btnExtractProfile.disabled = !enabled;
}

// Dropzone: usa el diálogo nativo del main process (más confiable en Electron)
async function importarCvDesdeDialogo() {
  const res = await window.api.importCv({ textoPegado: null });
  if (res && res.success && res.resultado) {
    onCvLoaded(res.resultado);
  } else if (res && !res.cancelado) {
    alert('Error al leer el CV: ' + (res.error || 'Desconocido'));
  }
}

if (cvDropzone) {
  cvDropzone.addEventListener('click', importarCvDesdeDialogo);
  cvDropzone.addEventListener('dragover', (e) => { e.preventDefault(); cvDropzone.classList.add('dragging'); });
  cvDropzone.addEventListener('dragleave', () => cvDropzone.classList.remove('dragging'));
  cvDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    cvDropzone.classList.remove('dragging');
    importarCvDesdeDialogo();
  });
}

if (cvFileInput) {
  cvFileInput.addEventListener('change', () => {
    if (cvFileInput.files.length > 0) importarCvDesdeDialogo();
  });
}

function onCvLoaded(resultado) {
  cvActual = resultado.texto;
  cvNombreArchivo = resultado.nombreArchivo || 'CV';
  const dropzoneTitle = document.getElementById('cv-dropzone-title');
  if (dropzoneTitle) dropzoneTitle.textContent = cvNombreArchivo;

  if (resultado.calidad && !resultado.calidad.ok) {
    addQualityWarning(resultado.calidad.motivo + ' Puedes usar "Ordenar con IA".');
  } else if (cvQualityWarning) {
    cvQualityWarning.style.display = 'none';
  }

  setCvButtonsEnabled(true);
  cvCleanSection.style.display = 'none';
  cvProfileSection.style.display = 'none';
  iaLog(`CV cargado (${cvActual.length} caracteres).`);
  markAiStepDone('ai-step-1', true);
  if (aiProgressSteps.length) setAiStepActive(2);
}

if (cvPasteToggle) {
  cvPasteToggle.addEventListener('click', () => {
    const isVisible = cvTextareaWrap.style.display !== 'none';
    cvTextareaWrap.style.display = isVisible ? 'none' : '';
    if (isVisible) return;
    cvPastedText.focus();
  });
}

// Usar texto pegado
if (cvPastedText) {
  cvPastedText.addEventListener('input', () => {
    const txt = cvPastedText.value.trim();
    if (txt.length >= 50) {
      cvActual = txt;
      cvNombreArchivo = 'Texto pegado';
      setCvButtonsEnabled(true);
      cvQualityWarning.style.display = 'none';
      cvCleanSection.style.display = 'none';
      markAiStepDone('ai-step-1', true);
      if (aiProgressSteps.length) setAiStepActive(2);
    } else {
      setCvButtonsEnabled(false);
    }
  });
}

// Ordenar con IA
if (btnSanitizeCv) {
  btnSanitizeCv.addEventListener('click', async () => {
    const key = cvGroqKey();
    if (!key) { alert('Configura tu API Key de Groq en Configuración.'); return; }
    btnSanitizeCv.disabled = true;
    iaLog('Ordenando CV con IA (8b)...');
    try {
      const res = await window.api.sanitizeCv({ textoCrudo: cvActual, groqApiKey: key });
      if (res && res.success) {
        cvCleanSection.style.display = '';
        cvCleanText.value = res.textoLimpio;
        btnExtractProfile2.disabled = false;
        iaLog('CV ordenado correctamente.');
        markAiStepDone('ai-step-2', true);
        if (aiProgressSteps.length) setAiStepActive(3);
      } else {
        alert(res && res.error ? res.error : 'Error al ordenar el CV.');
        iaLog('Error al ordenar el CV.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      btnSanitizeCv.disabled = false;
    }
  });
}

// Extraer perfil (desde texto crudo)
if (btnExtractProfile) {
  btnExtractProfile.addEventListener('click', () => extractProfile(cvActual));
}

// Extraer perfil (desde texto limpio)
if (btnExtractProfile2) {
  btnExtractProfile2.addEventListener('click', () => {
    const txt = cvCleanText.value.trim();
    if (!txt) { alert('El texto ordenado está vacío.'); return; }
    extractProfile(txt);
  });
}

async function extractProfile(textoCv) {
  const key = cvGroqKey();
  if (!key) { alert('Configura tu API Key de Groq en Configuración.'); return; }
  btnExtractProfile.disabled = true;
  if (btnExtractProfile2) btnExtractProfile2.disabled = true;
  iaLog('Extrayendo perfil profesional desde el CV...');
  try {
    const res = await window.api.extractCvProfile({ textoCv, groqApiKey: key });
    if (res && res.success && res.perfil) {
      renderPerfil(res.perfil);
      btnRankOffers.disabled = false;
      iaLog('Perfil extraído y guardado.');
    } else {
      alert(res && res.error ? res.error : 'No se pudo extraer el perfil.');
      iaLog('Error extrayendo el perfil.');
    }
  } catch (e) {
    console.error(e);
  } finally {
    btnExtractProfile.disabled = false;
    if (btnExtractProfile2) btnExtractProfile2.disabled = false;
  }
}

function renderPerfil(perfil) {
  cvProfileSection.style.display = '';
  markAiStepDone('ai-step-3', true);
  if (aiProgressSteps.length) setAiStepActive(4);
  if (btnRankOffers) btnRankOffers.disabled = false;
  const campos = [
    ['Nombre', perfil.nombre],
    ['Email', perfil.email],
    ['Teléfono', perfil.telefono],
    ['Ciudad', perfil.ciudad],
    ['Carrera', perfil.carrera],
    ['Nivel de formación', perfil.nivelFormacion],
    ['Semestre / Etapa', perfil.semestreOEtapa],
    ['Resumen', perfil.perfilResumen],
    ['Habilidades', Array.isArray(perfil.habilidades) ? perfil.habilidades.join(', ') : ''],
    ['Áreas de interés', Array.isArray(perfil.areasInteres) ? perfil.areasInteres.join(', ') : ''],
    ['Idiomas', Array.isArray(perfil.idiomas) ? perfil.idiomas.join(', ') : ''],
    ['Experiencia', Array.isArray(perfil.experienciaRelevante) ? perfil.experienciaRelevante.join(' · ') : '']
  ];

  cvProfileContent.innerHTML = `
    <div class="profile-grid">
      ${campos.filter(([, v]) => v).map(([label, value]) => `
        <div class="profile-item">
          <label class="field-label">${label}</label>
          <div>${value}</div>
        </div>
      `).join('')}
    </div>`;
}

// Clasificar ofertas
if (btnRankOffers) {
  btnRankOffers.addEventListener('click', async () => {
    const key = cvGroqKey();
    if (!key) { alert('Configura tu API Key de Groq en Configuración.'); return; }
    const soloNuevas = document.getElementById('rank-only-new') ? document.getElementById('rank-only-new').checked : false;
    btnRankOffers.disabled = true;
    rankSummary.style.display = 'none';
    iaLog('Clasificando ofertas contra tu perfil...');
    try {
      const res = await window.api.rankOffers({ groqApiKey: key, soloNuevas, modelo: inputModeloRank ? inputModeloRank.value : 'auto' });
      if (res && res.success) {
        const conteo = res.resultados.reduce((acc, r) => {
          acc[r.prioridad] = (acc[r.prioridad] || 0) + 1;
          return acc;
        }, {});
        document.getElementById('rank-high-num').textContent = conteo.alta || 0;
        document.getElementById('rank-med-num').textContent = conteo.media || 0;
        document.getElementById('rank-low-num').textContent = conteo.baja || 0;
        rankSummary.style.display = '';
        iaLog(`Clasificación completa: ${conteo.alta || 0} alta, ${conteo.media || 0} media, ${conteo.baja || 0} baja.`);
        markAiStepDone('ai-step-4', true);
        if (aiProgressSteps.length) setAiStepActive(4);
        await loadSavedOffers();
        refreshPriorityFilters();
        renderResults(currentOffers);
        updateExportLabel();
      } else {
        alert(res && res.error ? res.error : 'No se pudo clasificar.');
        iaLog('Error al clasificar las ofertas.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      btnRankOffers.disabled = false;
    }
  });
}

// Escuchar logs IA del main
window.api.onIalog((msg) => iaLog(msg));

// Cargar perfil guardado al iniciar
async function loadSavedProfile() {
  try {
    const res = await window.api.getCvProfile();
    if (res && res.success && res.perfil) {
      renderPerfil(res.perfil);
    }
  } catch (e) {
    console.error(e);
  }
}

// ===== Modal: Generar Correo =====
const emailModal = document.getElementById('email-modal');
const emailModalEmpresa = document.getElementById('email-modal-empresa');
const emailProgress = document.getElementById('email-progress');
const emailResult = document.getElementById('email-result');
const emailAsunto = document.getElementById('email-asunto');
const emailCuerpo = document.getElementById('email-cuerpo');
const emailCopy = document.getElementById('email-copy');
const emailStyleOptions = document.querySelectorAll('.email-style-option');

let emailEmpresaActual = '';
let emailPlantillaActual = 'auto';
let emailGenerando = false;

function openEmailModal(empresa) {
  if (emailGenerando) return;
  emailEmpresaActual = empresa;
  emailPlantillaActual = 'auto';
  emailModalEmpresa.textContent = empresa;
  emailModal.style.display = 'flex';
  emailProgress.style.display = 'none';
  emailResult.style.display = 'none';
  emailCopy.style.display = 'none';

  emailStyleOptions.forEach(opt => {
    opt.classList.toggle('active', opt.dataset.plantilla === 'auto');
  });

  generarCorreo();
}

// Abrir modal desde tarjetas de resultados hace falta
// Nota: los botones .btn-correo se vinculan en renderResults.

function generarCorreo() {
  if (emailGenerando) return;
  const key = cvGroqKey();
  if (!key) { alert('Configura tu API Key de Groq en Configuración.'); return; }

  emailGenerando = true;
  emailProgress.style.display = '';
  emailResult.style.display = 'none';
  emailCopy.style.display = 'none';

  window.api.generateEmail({ empresa: emailEmpresaActual, plantilla: emailPlantillaActual, groqApiKey: key, modelo: inputModeloEmail ? inputModeloEmail.value : 'auto' })
    .then(res => {
      emailGenerando = false;
      emailProgress.style.display = 'none';
      if (res && res.success && res.correo) {
        emailAsunto.value = res.correo.asunto || '';
        emailCuerpo.value = res.correo.cuerpo || '';
        emailResult.style.display = '';
        emailCopy.style.display = '';
      } else {
        emailResult.style.display = '';
        emailAsunto.value = '';
        emailCuerpo.value = res && res.error ? res.error : 'No se pudo generar el correo.';
      }
    })
    .catch(err => {
      emailGenerando = false;
      emailProgress.style.display = 'none';
      emailResult.style.display = '';
      emailAsunto.value = '';
      emailCuerpo.value = 'Error: ' + (err.message || 'Desconocido');
    });
}

if (emailModal) {
  emailStyleOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      emailPlantillaActual = opt.dataset.plantilla;
      emailStyleOptions.forEach(o => o.classList.toggle('active', o === opt));
      generarCorreo();
    });
  });

  document.getElementById('email-modal-cancel').addEventListener('click', () => {
    if (!emailGenerando) emailModal.style.display = 'none';
  });

  emailModal.addEventListener('click', (e) => {
    if (e.target === emailModal && !emailGenerando) emailModal.style.display = 'none';
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && emailModal && emailModal.style.display === 'flex' && !emailGenerando) {
      emailModal.style.display = 'none';
    }
  });

  if (emailCopy) {
    emailCopy.addEventListener('click', async () => {
      const texto = `Asunto: ${emailAsunto.value}\n\n${emailCuerpo.value}`;
      await window.api.copyToClipboard(texto);
      const old = emailCopy.querySelector('span');
      if (!old) {
        emailCopy.innerHTML = '<i class="ph ph-check"></i> ¡Copiado!';
        setTimeout(() => { emailCopy.innerHTML = '<i class="ph ph-copy"></i> Copiar Correo'; }, 2000);
      }
    });
  }
}

loadSavedProfile();
