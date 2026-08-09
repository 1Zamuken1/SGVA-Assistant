const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');

const EXTENSIONES_VALIDAS = ['.pdf', '.docx', '.txt', '.md', '.rtf'];

// Detector de calidad heurística: señales mínimas de un CV legible
function detectarCalidadCV(texto) {
  if (!texto || texto.trim().length < 150) {
    return {
      ok: false,
      motivo: 'El texto extraído es muy corto.'
    };
  }

  const lower = texto.toLowerCase();
  const marcadores = [
    'experiencia', 'formacion', 'formación', 'habilidades',
    'estudio', 'estudios', 'educacion', 'educación', 'perfil',
    'técnico', 'tecnico', 'tecnólogo', 'ingenier', 'básica', 'laboral'
  ];

  const presentes = marcadores.filter(m => lower.includes(m));
  if (presentes.length === 0) {
    return {
      ok: false,
      motivo: 'El texto extraído no parece contener un currículum legible (sin secciones reconocibles). Puede tener un diseño complejo o basura extraída.'
    };
  }

  const tieneEmail = /\S+@\S+\.\S+/.test(texto);
  return {
    ok: true,
    marcadoresEncontrados: presentes.length,
    tieneEmail,
    motivo: null
  };
}

// Lee el archivo y devuelve texto crudo + diagnóstico de calidad
async function leerArchivoCV(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  if (!EXTENSIONES_VALIDAS.includes(extension)) {
    throw new Error(`Formato no soportado (${extension}). Usa PDF, DOCX, TXT o MD.`);
  }

  let texto;
  if (extension === '.pdf') {
    const buffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    texto = result?.text || '';
  } else if (extension === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    texto = result.value || '';
  } else {
    texto = fs.readFileSync(filePath, 'utf-8');
  }

  // Normalizar: colapsar múltiples líneas vacías
  texto = (texto || '').replace(/\r\n/g, '\n').replace(/\s{3,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

  const calidad = detectarCalidadCV(texto);

  return {
    nombreArchivo: path.basename(filePath),
    texto,
    calidad
  };
}

module.exports = { leerArchivoCV, detectarCalidadCV };