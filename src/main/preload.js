const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Función para iniciar el raspado, enviando las credenciales al main process
  startScraping: (config) => ipcRenderer.invoke('start-scraping', config),

  // Función para cargar las ofertas guardadas de la base de datos
  getSavedOffers: () => ipcRenderer.invoke('get-saved-offers'),

  // Función para limpiar la base de datos
  clearDatabase: () => ipcRenderer.invoke('clear-database'),

  // Exportación
  exportData: (data, format) => ipcRenderer.invoke('export-data', data, format),

  // ==== IA: CV, perfil, prioridades y correos ====
  importCv: (options) => ipcRenderer.invoke('import-cv', options),
  sanitizeCv: (options) => ipcRenderer.invoke('sanitize-cv', options),
  extractCvProfile: (options) => ipcRenderer.invoke('extract-cv-profile', options),
  getCvProfile: () => ipcRenderer.invoke('get-cv-profile'),
  rankOffers: (options) => ipcRenderer.invoke('rank-offers', options),
  generateEmail: (options) => ipcRenderer.invoke('generate-email', options),
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', { texto: text }),

  // Escuchar logs del proceso IA
  onIalog: (callback) => {
    ipcRenderer.on('ia-log', (event, message) => callback(message));
  },

  // Escuchar mensajes de progreso del scraper (log técnico)
  onScraperLog: (callback) => {
    ipcRenderer.on('scraper-log', (event, message) => callback(message));
  },

  // Escuchar pasos del stepper visual
  onScraperStep: (callback) => {
    ipcRenderer.on('scraper-step', (event, stepId) => callback(stepId));
  },
  
  // Detener de escuchar cuando se necesite limpiar
  removeAllScraperListeners: () => {
    ipcRenderer.removeAllListeners('scraper-log');
    ipcRenderer.removeAllListeners('scraper-step');
    ipcRenderer.removeAllListeners('ia-log');
  }
});
