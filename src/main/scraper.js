const { chromium } = require('playwright');
const path = require('path');
const { estructurarOferta } = require('./ai_evaluator');
const database = require('./database');

async function startScraping(config, logCallback, stepCallback) {
  const { username, password, groqApiKey, departamento, ciudad, limit, order } = config;
  const numLimit = limit ? parseInt(limit, 10) : 0; // 0 means all

  const log = (msg) => {
    if (logCallback) logCallback(msg);
    else console.log(msg);
  };

  // Emitir el paso actual al frontend para el stepper visual
  const step = (stepId) => {
    if (stepCallback) stepCallback(stepId);
  };

  if (!username || !password || !groqApiKey) {
    throw new Error('Credenciales o API Key faltantes.');
  }

  const ofertas = [];
  const userDataDir = path.join(process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + "/.config"), 'sgva-assistant', 'perfil_navegador');
  
  step('browser');
  log('Iniciando navegador Playwright (Chromium)...');
  
  const browserContext = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: [
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-software-rasterizer',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ]
  });

  try {
    const page = browserContext.pages().length > 0 ? browserContext.pages()[0] : await browserContext.newPage();
    
    // Función auxiliar para navegar con reintentos
    const gotoWithRetry = async (url, retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          log(`Navegando a ${url} (Intento ${i + 1}/${retries})...`);
          await page.goto(url, { waitUntil: 'load', timeout: 60000 }); // 60s timeout
          return;
        } catch (e) {
          log(`Fallo al cargar página: ${e.message}`);
          if (i === retries - 1) throw e;
          log('Reintentando en 5 segundos...');
          await page.waitForTimeout(5000);
        }
      }
    };

    await gotoWithRetry('https://caprendizaje.sena.edu.co/sgva/SGVA_Diseno/pag/login.aspx');
    
    // Función para cerrar el modal de "En Proceso de Selección" si aparece
    const cerrarModalSiExiste = async () => {
      try {
        const modal = page.locator('#modalRespuesta');
        if ((await modal.count()) > 0 && await modal.isVisible()) {
          log('Se detectó modal de alerta (#modalRespuesta). Forzando cierre...');
          
          // Intentamos hacer clic en cualquier botón dentro del footer
          const btn = modal.locator('.modal-footer button, .modal-footer a, button').first();
          if ((await btn.count()) > 0) {
            await btn.click({ force: true });
          }
          
          // Por si acaso el clic falla o no hay botón, forzamos la eliminación del DOM con JS
          await page.evaluate(() => {
            const m = document.getElementById('modalRespuesta');
            if (m) m.style.display = 'none';
            document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
            document.body.classList.remove('modal-open');
          });
          
          await page.waitForTimeout(2000);
        }
      } catch (e) {
        // Ignorar si falla
      }
    };

    step('login');
    // Attempt to login if not already logged in
    try {
      await page.waitForSelector('#tbLoginUsuario', { timeout: 10000 });
      log('Seleccionando pestaña "Aprendices"...');
      await page.click('div#aprendices');
      await page.waitForTimeout(1000);
      
      log('Iniciando sesión en SGVA...');
      await page.fill('#tbLoginUsuario', username);
      await page.fill('#__tbPasswordUsuario', password);
      await page.click('#ini_session_aprendiz');
      
      await page.waitForTimeout(5000);
    } catch (e) {
      log('Posiblemente ya tengamos la sesión iniciada o la página tardó en cargar.');
    }
    
    // Check for modal right after login/index load
    await cerrarModalSiExiste();

    // Dismiss any broken modals early (fallback)
    await page.mouse.click(10, 10);
    await page.waitForTimeout(1000);
    
    step('navigate');
    log('Navegando directamente a la página de Solicitudes...');
    await gotoWithRetry('https://caprendizaje.sena.edu.co/sgva/Aprendices/Solicitudes/');
    await page.waitForTimeout(5000);
    
    // Check for modal again after navigating to Solicitudes
    await cerrarModalSiExiste();
    
    log('Comprobando el estado de la página de solicitudes...');
    
    // Verificar si el select existe o si la página está en blanco (aprendiz bloqueado)
    const selectDept = page.locator("select:has-text('Seleccione un departamento')");
    try {
      await selectDept.waitFor({ state: 'visible', timeout: 5000 });
    } catch (e) {
      throw new Error("No se encontraron los filtros de búsqueda. Es probable que tu estado actual sea 'En Proceso de Selección' o la página del SENA haya fallado al cargar. Por favor verifica tu estado directamente en el portal.");
    }
    
    step('search');
    
    if (departamento) {
      log(`Filtrando por departamento: ${departamento}...`);
      await page.selectOption("select:has-text('Seleccione un departamento')", { label: departamento });
      await page.waitForTimeout(2000);
    }
    
    if (ciudad) {
      log(`Filtrando por ciudad: ${ciudad}...`);
      await page.selectOption("select:has-text('Seleccione una ciudad')", { label: ciudad });
      await page.waitForTimeout(2000);
    }
    
    await page.getByRole('button', { name: 'Buscar' }).click();
    await page.waitForTimeout(5000);
    
    log('Extrayendo tarjetas de ofertas...');
    
    // Pagination loop
    let collectedCount = 0;
    while (true) {
      const botonesVer = await page.locator("button:has-text('Ver - Aplicar')").all();
      
      if (botonesVer.length === 0) break;
      
      for (let i = 0; i < botonesVer.length; i++) {
        const btn = page.locator("button:has-text('Ver - Aplicar')").nth(i);
        await btn.click();
        await page.waitForTimeout(2000);
        
        try {
          const modal = page.locator(".modal-content, .modal-dialog, [role='dialog']").first();
          const contenidoRaw = await modal.innerText();
          
          const lineas = contenidoRaw.split('\n').map(l => l.trim()).filter(l => l && !l.includes('Detalle de la solicitud'));
          const preview = lineas.length > 0 ? lineas[0].substring(0, 60) : 'Sin título';
          
          ofertas.push({
            contenido_raw: contenidoRaw
          });
          collectedCount++;
          log(`Extraída oferta (${collectedCount}): ${preview}...`);
        } catch (e) {
          log(`No se pudo leer el modal: ${e.message}`);
        }
        
        try {
          await page.locator("#btn_modal_solicitud_cerrar").first().click();
          await page.waitForTimeout(1000);
        } catch (e) {
          await page.mouse.click(10, 10);
          await page.waitForTimeout(1000);
        }
        
        // Si el usuario eligió procesar las "Primeras N", podemos detenernos inmediatamente
        if (order === 'first' && numLimit > 0 && collectedCount >= numLimit) {
          log(`Límite de ${numLimit} alcanzado. Deteniendo extracción...`);
          break;
        }
      }
      
      if (order === 'first' && numLimit > 0 && collectedCount >= numLimit) {
        break;
      }
      
      const btnSiguiente = page.locator("text='Siguiente'");
      if ((await btnSiguiente.count()) > 0 && await btnSiguiente.isVisible()) {
        await btnSiguiente.click();
        await page.waitForTimeout(4000);
      } else {
        break; // No more pages
      }
    }
    
    // Aplicar límite y orden a la colección obtenida (si es "last", cortamos aquí)
    let ofertasAProcesar = ofertas;
    if (order === 'last' && numLimit > 0 && ofertas.length > numLimit) {
      ofertasAProcesar = ofertas.slice(-numLimit);
      log(`Aplicando orden: seleccionadas las últimas ${numLimit} ofertas de las ${ofertas.length} encontradas.`);
    }
    
    step('ai');
    log(`\n¡Extracción finalizada! Procesando ${ofertasAProcesar.length} ofertas con IA y Base de Datos...`);
    
    const estructuradas = [];
    let count = 1;
    for (const oferta of ofertasAProcesar) {
      const preview = oferta.contenido_raw.substring(0, 60).replace(/\n/g, ' ').trim();
      
      // Deduplicación rápida
      if (database.esDuplicada(oferta.contenido_raw)) {
        log(`[${count}/${ofertasAProcesar.length}] Ya procesada: ${preview} (Cargando de BD local...)`);
        const saved = database.obtenerOfertaGuardada(oferta.contenido_raw);
        if (saved) estructuradas.push(saved);
        count++;
        continue;
      }
      
      log(`[${count}/${ofertasAProcesar.length}] Consultando Groq: ${preview}`);
      
      // Wait to respect Groq limits
      await new Promise(r => setTimeout(r, 2000));
      const res = await estructurarOferta(oferta.contenido_raw, groqApiKey);
      if (res) {
        estructuradas.push(res);
        database.agregarOferta(oferta.contenido_raw, res);
      }
      count++;
    }
    
    log('\n¡Proceso de IA finalizado con éxito!');
    return estructuradas;

  } catch (error) {
    let friendlyError = error.message;
    if (friendlyError.includes('Timeout')) {
      friendlyError = "La página del SENA tardó demasiado en cargar o no se encontraron los elementos necesarios (Timeout). Por favor, revisa tu estado o intenta en unos minutos.";
    }
    log(`\nUps! Tuvimos un problema: ${friendlyError}`);
    throw new Error(friendlyError);
  } finally {
    // Keep browser open for user if they want? Or close it? 
    // Usually good to close it to free resources.
    // await browserContext.close(); 
  }
}

module.exports = { startScraping };
