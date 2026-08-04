const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class Database {
  constructor() {
    this.dbPath = path.join(
      process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + "/.config"),
      'sgva-assistant',
      'ofertas_db.json'
    );
    this.ofertasGuardadas = {}; // hash -> ofertaEstructurada
    this.inicializar();
  }

  inicializar() {
    try {
      if (fs.existsSync(this.dbPath)) {
        const rawData = fs.readFileSync(this.dbPath, 'utf8');
        this.ofertasGuardadas = JSON.parse(rawData);
      } else {
        this.guardarEnDisco();
      }
    } catch (e) {
      console.error('Error inicializando base de datos local:', e);
      this.ofertasGuardadas = {};
    }
  }

  guardarEnDisco() {
    try {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.dbPath, JSON.stringify(this.ofertasGuardadas, null, 2), 'utf8');
    } catch (e) {
      console.error('Error guardando en base de datos local:', e);
    }
  }

  generarHash(textoRaw) {
    // Tomamos los primeros 100 caracteres significativos para evitar variaciones por espacios
    const limpio = textoRaw.replace(/\s+/g, ' ').trim().substring(0, 150);
    return crypto.createHash('md5').update(limpio).digest('hex');
  }

  esDuplicada(textoRaw) {
    const hash = this.generarHash(textoRaw);
    return !!this.ofertasGuardadas[hash];
  }

  obtenerOfertaGuardada(textoRaw) {
    const hash = this.generarHash(textoRaw);
    return this.ofertasGuardadas[hash] || null;
  }

  agregarOferta(textoRaw, ofertaEstructurada) {
    const hash = this.generarHash(textoRaw);
    if (!this.ofertasGuardadas[hash]) {
      this.ofertasGuardadas[hash] = ofertaEstructurada;
      this.guardarEnDisco();
    }
  }

  limpiarBaseDeDatos() {
    this.ofertasGuardadas = {};
    this.guardarEnDisco();
  }

  obtenerTodas() {
    return Object.values(this.ofertasGuardadas);
  }
}

module.exports = new Database();
