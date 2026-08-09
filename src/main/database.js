const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class Database {
  constructor() {
    this.appDir = path.join(
      process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + "/.config"),
      'sgva-assistant'
    );
    this.dbPath = path.join(this.appDir, 'ofertas_db.json');
    this.cvPath = path.join(this.appDir, 'cv_perfil.json');
    this.ofertasGuardadas = {}; // hash -> ofertaEstructurada
    this.cvPerfil = null;
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
    this.cargarCV();
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

  // ===== Perfil CV =====
  cargarCV() {
    try {
      if (fs.existsSync(this.cvPath)) {
        this.cvPerfil = JSON.parse(fs.readFileSync(this.cvPath, 'utf8'));
      }
    } catch (e) {
      console.error('Error cargando perfil CV:', e);
      this.cvPerfil = null;
    }
  }

  guardarPerfilCV(perfil) {
    this.cvPerfil = perfil;
    try {
      if (!fs.existsSync(this.appDir)) {
        fs.mkdirSync(this.appDir, { recursive: true });
      }
      fs.writeFileSync(this.cvPath, JSON.stringify(perfil, null, 2), 'utf8');
    } catch (e) {
      console.error('Error guardando perfil CV:', e);
    }
  }

  obtenerPerfilCV() {
    return this.cvPerfil;
  }

  // ===== Prioridades de ofertas =====
  // Recibe un mapa hash -> { prioridad, puntaje, motivo }
  actualizarPrioridades(prioridades) {
    for (const [hash, info] of Object.entries(prioridades || {})) {
      if (this.ofertasGuardadas[hash]) {
        this.ofertasGuardadas[hash].prioridad = info.prioridad || 'baja';
        this.ofertasGuardadas[hash].puntaje = Number(info.puntaje) || 0;
        this.ofertasGuardadas[hash].motivo = info.motivo || '';
      }
    }
    this.guardarEnDisco();
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

  obtenerTodasConHash() {
    return Object.entries(this.ofertasGuardadas).map(([hash, oferta]) => ({ hash, oferta }));
  }
}

module.exports = new Database();
