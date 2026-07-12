const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { startScraping } = require('./scraper');

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
    backgroundColor: '#0f172a', // Tailwind slate-900 oscuro base
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Ocultar barra de menú predeterminada de Windows
  mainWindow.setMenuBarVisibility(false);

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
    }
  } catch (error) {
    console.error('Error al exportar:', error);
    return { success: false, error: error.message };
  }
});
