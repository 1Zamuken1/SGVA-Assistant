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
  }
});
