const { Groq } = require('groq-sdk');

const MODELO_8B = 'llama-3.1-8b-instant';
const MODELO_70B = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `
Eres un asistente experto en estructurar información. 
Tu tarea es leer el contenido de una oferta de prácticas en bruto y extraer los datos en formato JSON estrictamente válido. 
Extrae lo siguiente:
- Empresa
- Contacto (Persona de contacto, email, teléfono)
- FechaLimite (fecha límite de postulación)
- Funciones (lista de funciones principales)

Devuelve SOLO el JSON sin markdown, sin explicaciones.
Si algo no está, devuelve null para ese campo.
Ejemplo:
{
  "Empresa": "Nombre Empresa",
  "Contacto": "Juan Perez - juan@empresa.com",
  "FechaLimite": "2023-12-31",
  "Funciones": ["Desarrollar apps", "Testear software"]
}
`;

const SYSTEM_SANITIZAR_CV = `
Eres un asistente experto en reconstruir currículums.
El usuario te dará el texto crudo extraído de un CV (posiblemente PDF/DOCX) que puede venir desordenado: saltos de línea cortados, texto de columnas mezclado, viñetas sueltas, basura visual.
Tu tarea es reconstruir el CV en un texto limpio y ordenado por secciones, en el siguiente formato (usa este orden):

PERFIL:
- Resumen profesional breve (1-2 líneas)

FORMACION:
- Registrar formación académica

EXPERIENCIA:
- Registrar experiencia laboral/proyectos/prácticas

HABILIDADES:
- Listar habilidades técnicas y blandas

IDIOMAS:
- Listar idiomas y niveles

Información de contacto (nombre, email, teléfono, ciudad) al inicio, si se encuentra.

Reglas:
- Conserva TODO el contenido relevante, no inventes datos, no agregues nada que no esté en el texto original.
- Si alguna sección no existe, escribe "No especificado".
- Devuelve SOLO texto plano legible, sin markdown, sin formato especial, sin encabezados con #.
`;

const SYSTEM_PERFIL_CV = `
Eres un asistente experto en analizar currículums y extraer un perfil profesional en formato JSON estrictamente válido.

Lee el currículum del usuario y devuelve el siguiente JSON:
{
  "nombre": "Nombre completo del candidato",
  "email": "correo si existe, o null",
  "telefono": "teléfono si existe, o null",
  "ciudad": "ciudad si existe, o null",
  "carrera": "carrera o programa académico actual",
  "nivelFormacion": "nivel de formación (Técnico, Tecnólogo, Profesional, Etc.)",
  "semestreOEtapa": "semestre o etapa actual si existe, o null",
  "perfilResumen": "resumen profesional de 1-2 frases",
  "habilidades": ["lista de habilidades técnicas y blandas"],
  "areasInteres": ["áreas profesionales de interés"],
  "idiomas": ["lista de idiomas con nivel"],
  "experienciaRelevante": ["experiencia previa, prácticas o proyectos"]
}

Reglas:
- Observa TODAS las secciones del CV.
- No inventes datos que no estén en el texto.
- Si un campo no existe, usa null (o [] para listas).
- Devuelve SOLO el JSON sin markdown, sin explicaciones.
`;

const SYSTEM_CLASIFICAR_OFERTAS = `
Eres un asistente experto en selección de talento. La IA evalúa qué tan bien encaja el perfil de un candidato con cada oferta de práctica.

Recibirás:
1. Un PERFIL DEL CANDIDATO en formato JSON.
2. Una lista de OFERTAS de práctica, cada una con empresas y sus funciones.

Para CADA oferta debes devolver un JSON con la siguiente estructura:
{
  "empresas": [
    {
      "Empresa": "nombre exacto de la empresa",
      "prioridad": "alta" | "media" | "baja",
      "puntaje": 0-100,
      "motivo": "breve motivo de 1-2 frases"
    }
  ]
}

Criterios de prioridad:
- "alta": hay coincidencia fuerte entre las habilidades del candidato y las funciones de la oferta (más del 70%).
- "media": coincidencia parcial (40-70%).
- "baja": poca o ninguna coincidencia (menos del 40%), o la oferta no tiene información suficiente.

El puntaje 0-100 debe reflejar qué tanto encaja el candidato con la oferta considerando habilidades, área de interés y nivel.

Devuelve SOLO el JSON. No omitas ninguna oferta de la lista. Usa exactamente el nombre de la empresa de la oferta.
`;

const SYSTEM_CORREO = `
Eres un asistente experto en redacción de correos formales en español para postulación a prácticas profesionales.
Redactarás un correo profesional de postulación a una empresa.

Recibirás:
1. PERFIL DEL CANDIDATO (JSON)
2. DATOS DE LA OFERTA (empresa, contacto, funciones)
3. ESTILO solicitado

Debes devolver SOLO JSON estrictamente válido:
{
  "asunto": "asunto del correo",
  "cuerpo": "cuerpo del correo en texto plano (máximo 150-200 palabras), con saludo, presentación, motivación, referencia a las funciones de la oferta, y despedida formal con nombre del candidato"
}

Estilos:
- "formal": tono sobrio y profesional.
- "detallado": menciona habilidades específicas del candidato y cómo encajan con la oferta.
- "breve": conciso y directo (máximo 100 palabras).

No uses markdown en el cuerpo. Devuelve SOLO el JSON.
`;

// Llamada común a Groq con reintentos, soporte de múltiples modelos (fallback)
async function llamarGroq(messages, apiKey, modelos, maxTokens, temperature, responseFormat) {
  const listaModelos = Array.isArray(modelos) ? modelos : [modelos];
  const MAX_RETRIES = 5;

  for (const modelo of listaModelos) {
    const groq = new Groq({ apiKey });
    for (let intento = 0; intento < MAX_RETRIES; intento++) {
      try {
        const params = {
          messages,
          model: modelo,
          temperature: temperature ?? 0,
          max_tokens: maxTokens
        };
        if (responseFormat) params.response_format = { type: responseFormat };

        const response = await groq.chat.completions.create(params);
        return response.choices[0]?.message?.content || '';
      } catch (error) {
        const errStr = error.toString().toLowerCase();
        if (errStr.includes('rate_limit') || errStr.includes('429')) {
          const espera = Math.min(Math.pow(2, intento) + 5, 120);
          console.error(`Rate limit en ${modelo}. Esperando ${espera}s...`);
          await new Promise(r => setTimeout(r, espera * 1000));
        } else {
          console.error(`Error con modelo ${modelo}:`, error);
          break; // No reintentar con el mismo modelo; probar el siguiente
        }
      }
    }
  }
  return null;
}

// Parseo seguro de JSON de respuesta (tolera markdown envolvente)
function parsearJsonRespuesta(texto) {
  if (!texto) return null;
  try {
    return JSON.parse(texto);
  } catch (e) {
    // Intentar extraer el bloque JSON entre llaves más externas
    try {
      const match = texto.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
    } catch (e2) { /* fallthrough */ }
    console.error('No se pudo parsear JSON de respuesta:', texto.substring(0, 300));
    return null;
  }
}

async function estructurarOferta(contenidoRaw, apiKey) {
  const contenido = await llamarGroq(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: contenidoRaw }
    ],
    apiKey,
    [MODELO_8B, MODELO_70B],
    500,
    0,
    'json_object'
  );
  return parsearJsonRespuesta(contenido);
}

// Reconstruye un CV crudo y desordenado en texto limpio ordenado por secciones
async function sanitizarCV(textoCrudo, apiKey) {
  const contenido = await llamarGroq(
    [
      { role: 'system', content: SYSTEM_SANITIZAR_CV },
      { role: 'user', content: textoCrudo }
    ],
    apiKey,
    [MODELO_8B, MODELO_70B],
    1500,
    0.2
  );
  return contenido;
}

// Extrae el perfil profesional estructurado de un CV (limpio)
async function extraerPerfilCV(textoCv, apiKey) {
  const contenido = await llamarGroq(
    [
      { role: 'system', content: SYSTEM_PERFIL_CV },
      { role: 'user', content: textoCv }
    ],
    apiKey,
    [MODELO_8B, MODELO_70B],
    800,
    0,
    'json_object'
  );
  return parsearJsonRespuesta(contenido);
}

// Clasifica ofertas en lotes de 20 comparando contra el perfil del candidato
async function clasificarOfertas(perfil, ofertas, apiKey) {
  const resultados = [];
  const TAMANO_LOTE = 20;
  const perfilStr = JSON.stringify(perfil);

  // Preservar el orden original y evitar nombres duplicados estándar
  const listaPura = ofertas.map((o, i) => ({
    i,
    nombre: (o.Empresa && o.Empresa !== 'No especificada') ? o.Empresa : `Oferta ${i + 1}`,
    funciones: (o.Funciones || []).join('. '),
    contacto: o.Contacto || ''
  }));

  for (let inicio = 0; inicio < listaPura.length; inicio += TAMANO_LOTE) {
    const lote = listaPura.slice(inicio, inicio + TAMANO_LOTE);
    const ofertasStr = lote.map((o, idx) =>
      `${idx + 1}. Empresa: "${o.nombre}". Funciones: ${o.funciones}`
    ).join('\n');

    const prompt = `PERFIL DEL CANDIDATO:\n${perfilStr}\n\nLISTA DE OFERTAS:\n${ofertasStr}\n\nEvalúa cada oferta y devuelve el JSON.`;

    log(`Clasificando lote ${Math.floor(inicio / TAMANO_LOTE) + 1}/${Math.ceil(listaPura.length / TAMANO_LOTE)}...`);

    const contenido = await llamarGroq(
      [
        { role: 'system', content: SYSTEM_CLASIFICAR_OFERTAS },
        { role: 'user', content: prompt }
      ],
      apiKey,
      [MODELO_8B, MODELO_70B],
      4000,
      0.1,
      'json_object'
    );

    // Espera entre llamadas para respetar límites de Groq
    await new Promise(r => setTimeout(r, 1500));

    const parsed = parsearJsonRespuesta(contenido);
    const empresas = parsed?.empresas || [];

    // Reconstruir mapeo por índice consultando el nombre de empresa
    for (const item of empresas) {
      // Encontrar la posición original por nombre (primera coincidencia)
      const pos = listaPura.findIndex((o, idx) =>
        !resultados.some(res => res.i === idx) &&
        o.nombre.toLowerCase() === String(item.Empresa || '').toLowerCase()
      );
      if (pos !== -1) {
        resultados.push({
          i: pos,
          prioridad: item.prioridad || 'baja',
          puntaje: Number(item.puntaje) || 0,
          motivo: item.motivo || ''
        });
      }
    }

    // Las ofertas del lote no clasificadas quedan con baja por defecto
    for (let k = inicio; k < lote.length + inicio; k++) {
      if (!resultados.some(r => r.i === k)) {
        resultados.push({ i: k, prioridad: 'baja', puntaje: 0, motivo: 'No se pudo evaluar' });
      }
    }
  }

  // Ordenar en el orden original
  resultados.sort((a, b) => a.i - b.i);

  return ofertas.map((o, i) => {
    const res = resultados.find(r => r.i === i);
    return {
      empresa: o.Empresa || 'No especificada',
      prioridad: res?.prioridad || 'baja',
      puntaje: res?.puntaje || 0,
      motivo: res?.motivo || ''
    };
  });
}

// Genera un correo de postulación personalizado (70b con fallback 8b)
async function generarCorreoConIA(oferta, perfil, estilo, apiKey) {
  const estiloValido = ['formal', 'detallado', 'breve'].includes(estilo) ? estilo : 'formal';
  const prompt = `PERFIL DEL CANDIDATO:\n${JSON.stringify(perfil)}\n\nDATOS DE LA OFERTA:\nEmpresa: ${oferta.Empresa || 'No especificada'}\nContacto: ${oferta.Contacto || 'No especificado'}\nFunciones: ${(oferta.Funciones || []).join('. ')}\n\nESTILO: ${estiloValido}`;

  const contenido = await llamarGroq(
    [
      { role: 'system', content: SYSTEM_CORREO },
      { role: 'user', content: prompt }
    ],
    apiKey,
    [MODELO_70B, MODELO_8B],
    800,
    0.7,
    'json_object'
  );
  return parsearJsonRespuesta(contenido);
}

// Logger opcional global (para reportar avance de clasificación)
let _logFn = () => {};
function setLogFn(fn) { _logFn = fn || (() => {}); }
function log(msg) { _logFn(msg); }

module.exports = {
  estructurarOferta,
  sanitizarCV,
  extraerPerfilCV,
  clasificarOfertas,
  generarCorreoConIA,
  setLogFn
};