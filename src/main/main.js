const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

// En producción, Playwright debe usar el Chromium empaquetado en resources/
if (app.isPackaged) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(process.resourcesPath, 'playwright-browsers');
}

const dotenv = require('dotenv');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { clipboard } = require('electron');
const { startScraping } = require('./scraper');
const { sanitizarCV, extraerPerfilCV, clasificarOfertas, generarCorreoConIA, setLogFn } = require('./ai_evaluator');
const { leerArchivoCV } = require('./cv_reader');

// Cargar variables de entorno (por si hay .env)
dotenv.config();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'SGVA Assistant',
    show: false, // Evita el flash de pantalla negra: la ventana se muestra cuando está lista
    backgroundColor: '#0f172a', // Tailwind slate-900 oscuro base
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Ocultar barra de menú predeterminada de Windows
  mainWindow.setMenuBarVisibility(false);

  // Mostrar la ventana solo cuando el contenido esté renderizado
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Respaldo: si por alguna razón el renderer tarda en cargar
  // (p. ej. recursos externos lentos), muestra la ventana igualmente
  const showFallback = setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  }, 4000);

  mainWindow.once('closed', () => {
    clearTimeout(showFallback);
    mainWindow = null;
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ==========================================
// IPC HANDLERS (Backend <-> Frontend)
// ==========================================

ipcMain.handle('start-scraping', async (event, config) => {
  // config debe incluir { username, password, groqApiKey }
  try {
    const result = await startScraping(
      config,
      (message) => {
        // Enviar log en vivo al frontend
        if (mainWindow) {
          mainWindow.webContents.send('scraper-log', message);
        }
      },
      (stepId) => {
        // Enviar paso actual al frontend para el stepper visual
        if (mainWindow) {
          mainWindow.webContents.send('scraper-step', stepId);
        }
      }
    );
    return { success: true, data: result };
  } catch (error) {
    console.error('Scraping error:', error);
    return { success: false, error: error.message };
  }
});

// Canal para obtener ofertas previamente guardadas
const database = require('./database');
ipcMain.handle('get-saved-offers', async () => {
   return database.obtenerTodas();
 });

 ipcMain.handle('clear-database', async () => {
   database.limpiarBaseDeDatos();
   return { success: true };
 });

ipcMain.handle('export-data', async (event, data, format) => {
  try {
    if (format === 'excel') {
      const { filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Exportar Ofertas a Excel',
        defaultPath: path.join(app.getPath('downloads'), 'Ofertas_SENA.xlsx'),
        filters: [{ name: 'Excel', extensions: ['xlsx'] }]
      });
      
      if (!filePath) return { success: false, cancelado: true };
      
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Ofertas');
      
      sheet.columns = [
        { header: 'Empresa', key: 'empresa', width: 30 },
        { header: 'Contacto', key: 'contacto', width: 30 },
        { header: 'Fecha de Cierre', key: 'fechaLimite', width: 20 },
        { header: 'Funciones', key: 'funciones', width: 60 }
      ];
      
      data.forEach(oferta => {
        sheet.addRow({
          empresa: oferta.Empresa || 'No especificada',
          contacto: oferta.Contacto || 'No especificado',
          fechaLimite: oferta.FechaLimite || oferta.FechaFin || 'No especificada',
          funciones: (oferta.Funciones || []).join('\n')
        });
      });
      
      sheet.getRow(1).font = { bold: true };
      await workbook.xlsx.writeFile(filePath);
      return { success: true, filePath };

    } else if (format === 'markdown') {
      const { filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Exportar Ofertas a Markdown',
        defaultPath: path.join(app.getPath('downloads'), 'Ofertas_SENA.md'),
        filters: [{ name: 'Markdown', extensions: ['md'] }]
      });
      
      if (!filePath) return { success: false, cancelado: true };
      
      let mdContent = '# Ofertas de Práctica SGVA\n\n';
      data.forEach(of => {
        mdContent += `### ${of.Empresa || 'Empresa No Especificada'}\n`;
        mdContent += `- **Contacto:** ${of.Contacto || 'Sin contacto'}\n`;
        mdContent += `- **Cierre:** ${of.FechaLimite || of.FechaFin || 'N/A'}\n`;
        mdContent += `- **Funciones:**\n`;
        const func = of.Funciones || [];
        if (func.length === 0) {
          mdContent += `  - No especificadas.\n`;
        } else {
          func.forEach(f => mdContent += `  - ${f}\n`);
        }
        mdContent += '\n---\n\n';
      });
      
      fs.writeFileSync(filePath, mdContent, 'utf-8');
      return { success: true, filePath };
    } else if (format === 'json') {
      const { filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Exportar Ofertas a JSON',
        defaultPath: path.join(app.getPath('downloads'), 'Ofertas_SENA.json'),
        filters: [{ name: 'JSON', extensions: ['json'] }]
      });

      if (!filePath) return { success: false, cancelado: true };

      const jsonData = data.map(oferta => ({
        Empresa: oferta.Empresa || 'No especificada',
        Contacto: oferta.Contacto || 'No especificado',
        FechaLimite: oferta.FechaLimite || oferta.FechaFin || null,
        Funciones: oferta.Funciones || [],
        prioridad: oferta.prioridad || null,
        puntaje: oferta.puntaje || null,
        motivo: oferta.motivo || null
      }));

      fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2), 'utf-8');
      return { success: true, filePath };
    }
  } catch (error) {
    console.error('Error al exportar:', error);
    return { success: false, error: error.message };
  }
});

// ==== IA: gestionar CV, perfil, prioridades y correos ====

const sendIalog = (msg) => {
  if (mainWindow) mainWindow.webContents.send('ia-log', msg);
};

// Importar aquí para no romper la carga si hay dependencias locales
const { detectarCalidadCV } = require('./cv_reader');

const validarGroqKey = (key) => {
  if (!key) return 'No hay API Key de Groq configurada. Ve a Configuración.';
  return null;
};

ipcMain.handle('import-cv', async (event, { textoPegado }) => {
  try {
    // Si el usuario pegó texto, usarlo directo
    if (textoPegado && String(textoPegado).trim().length > 50) {
      const texto = String(textoPegado).replace(/\r\n/g, '\n').trim();
      return { success: true, resultado: { nombreArchivo: 'Texto pegado', texto, calidad: detectarCalidadCV(texto) } };
    }

    // Si no, pedir archivo
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Selecciona tu CV',
      properties: ['openFile'],
      filters: [
        { name: 'CV (PDF, DOCX, TXT, MD)', extensions: ['pdf', 'docx', 'txt', 'md'] }
      ]
    });

    if (canceled || filePaths.length === 0) return { success: false, cancelado: true };

    const resultado = await leerArchivoCV(filePaths[0]);
    return { success: true, resultado };
  } catch (error) {
    console.error('Error importando CV:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sanitize-cv', async (event, { textoCrudo, groqApiKey }) => {
  const validationError = validarGroqKey(groqApiKey);
  if (validationError) return { success: false, error: validationError };
  if (!textoCrudo) return { success: false, error: 'No hay texto de CV para procesar.' };
  if (String(textoCrudo).trim().length < 50) return { success: false, error: 'El texto del CV es demasiado corto para procesar.' };

  try {
    sendIalog('Reconstruyendo el CV con IA (ordenando secciones)...');
    const textoLimpio = await sanitizarCV(String(textoCrudo), groqApiKey);
    if (!textoLimpio) return { success: false, error: 'Groq no devolvió una respuesta válida.' };
    sendIalog('CV reconstruido correctamente.');
    return { success: true, textoLimpio };
  } catch (error) {
    console.error('Error sanitizando CV:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('extract-cv-profile', async (event, { textoCv, groqApiKey }) => {
  const validationError = validarGroqKey(groqApiKey);
  if (validationError) return { success: false, error: validationError };
  if (!textoCv || String(textoCv).trim().length < 50) return { success: false, error: 'Primero carga tu CV para extraer el perfil.' };

  try {
    sendIalog('Extrayendo perfil profesional desde el CV...');
    const perfil = await extraerPerfilCV(String(textoCv), groqApiKey);
    if (!perfil) return { success: false, error: 'Groq no pudo extraer el perfil.' };
    database.guardarPerfilCV(perfil);
    sendIalog('Perfil extraído y guardado.');
    return { success: true, perfil };
  } catch (error) {
    console.error('Error extrayendo perfil CV:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-cv-profile', async () => {
  return { success: true, perfil: database.obtenerPerfilCV() };
});

ipcMain.handle('rank-offers', async (event, { groqApiKey }) => {
  const validationError = validarGroqKey(groqApiKey);
  if (validationError) return { success: false, error: validationError };

  const perfil = database.obtenerPerfilCV();
  if (!perfil) return { success: false, error: 'Primero debes extraer tu perfil desde el CV.' };

  const conHash = database.obtenerTodasConHash();
  if (conHash.length === 0) return { success: false, error: 'No hay ofertas guardadas para clasificar. Ejecuta primero el extractor.' };

  try {
    setLogFn((msg) => sendIalog(msg));
    const ofertas = conHash.map(({ oferta }) => oferta);
    sendIalog(`Clasificando ${ofertas.length} ofertas contra tu perfil...`);
    const resultados = await clasificarOfertas(perfil, ofertas, groqApiKey);

    // Mapear resultados por hash
    const prioridades = {};
    conHash.forEach(({ hash }, i) => {
      prioridades[hash] = {
        prioridad: resultados[i]?.prioridad || 'baja',
        puntaje: resultados[i]?.puntaje || 0,
        motivo: resultados[i]?.motivo || ''
      };
    });
    database.actualizarPrioridades(prioridades);

    const conteo = resultados.reduce((acc, r) => {
      acc[r.prioridad] = (acc[r.prioridad] || 0) + 1;
      return acc;
    }, {});
    sendIalog(`Clasificación completa: ${conteo.alta || 0} alta, ${conteo.media || 0} media, ${conteo.baja || 0} baja.`);

    return { success: true, resultados };
  } catch (error) {
    console.error('Error clasificando ofertas:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('generate-email', async (event, { empresa, estilo, groqApiKey }) => {
  const validationError = validarGroqKey(groqApiKey);
  if (validationError) return { success: false, error: validationError };

  const perfil = database.obtenerPerfilCV();
  if (!perfil) return { success: false, error: 'Primero debes extraer tu perfil desde el CV para personalizar el correo.' };

  const estiloValido = ['formal', 'detallado', 'breve'].includes(estilo) ? estilo : 'formal';

  try {
    // Buscar la oferta por nombre de empresa
    const todas = database.obtenerTodas();
    let oferta = todas.find(o => (o.Empresa || 'no especificada').toLowerCase() === String(empresa || '').toLowerCase());
    if (!oferta) {
      oferta = { Empresa: empresa || 'la empresa', Contacto: null, Funciones: [] };
    }

    sendIalog(`Generando correo para ${oferta.Empresa} (estilo: ${estiloValido})...`);
    const correo = await generarCorreoConIA(oferta, perfil, estiloValido, groqApiKey);
    if (!correo) return { success: false, error: 'Groq no pudo generar el correo.' };
    return { success: true, correo };
  } catch (error) {
    console.error('Error generando correo:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('copy-to-clipboard', async (event, { texto }) => {
  try {
    clipboard.writeText(String(texto || ''));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
