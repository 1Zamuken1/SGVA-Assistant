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

// Plantillas de correo base (las variables {...} son rellenadas por la IA)
const PLANTILLA_PRINCIPAL = `Asunto: Interés en realizar etapa productiva mediante contrato de aprendizaje

Buenas tardes, {NombreContacto}.

Mi nombre es {NombreCandidato}, estudiante del programa {Programa} del SENA, y me comunico con usted porque estoy interesado en realizar mi etapa productiva en {Empresa} mediante contrato de aprendizaje.

Actualmente cuento con conocimientos y experiencia en desarrollo de software, especialmente en {TecnologiasPrincipales}, además de experiencia trabajando en proyectos personales y académicos.

Me gustaría poner mis conocimientos a disposición de {Empresa}, continuar fortaleciendo mis habilidades y aportar al equipo durante mi etapa productiva.

Adjunto mi hoja de vida para su consideración.

Quedo atento a cualquier información sobre oportunidades disponibles y agradezco mucho su tiempo.

Cordialmente,
{NombreCandidato}
{Programa}
SENA
Tel: {Telefono}
Correo: {CorreoCandidato}`;

const PLANTILLA_DIRECTA = `Asunto: Solicitud de etapa productiva – {NombreCandidato}

Buenas tardes, {NombreContacto}.

Mi nombre es {NombreCandidato}, estudiante de {Programa} del SENA. Actualmente me encuentro habilitado para realizar mi etapa productiva mediante contrato de aprendizaje y estoy interesado en realizarla en {Empresa}.

Cuento con conocimientos en {TecnologiasPrincipales} y experiencia en proyectos de desarrollo de software.

Adjunto mi hoja de vida para su consideración y quedo atento a cualquier oportunidad que se ajuste a mi perfil.

Muchas gracias por su tiempo.

Cordialmente,
{NombreCandidato}
{Telefono}
{CorreoCandidato}`;

const PLANTILLA_TECNICA = `Asunto: Candidato para etapa productiva – {NombreCandidato}

Buenas tardes, {NombreContacto}.

Mi nombre es {NombreCandidato}, estudiante de {Programa} del SENA, y actualmente me encuentro disponible para realizar mi etapa productiva mediante contrato de aprendizaje.

Mi formación está orientada al desarrollo de software y cuento con conocimientos en {TecnologiasPrincipales}, incluyendo experiencia en proyectos relacionados con {AreaPrincipal}.

Al conocer las oportunidades de {Empresa}, considero que mi perfil puede ser de interés para su equipo de tecnología y me gustaría participar en algún proceso de selección disponible para aprendices.

Adjunto mi hoja de vida y quedo atento a cualquier información adicional.

Cordialmente,
{NombreCandidato}
{Telefono}
{CorreoCandidato}`;

const PLANTILLA_VACANTE = `Asunto: Postulación – {NombreVacante} – {NombreCandidato}

Buenas tardes, {NombreContacto}.

Mi nombre es {NombreCandidato}, estudiante de {Programa} del SENA, y me encuentro interesado en la vacante de {NombreVacante} publicada por {Empresa}.

Actualmente estoy habilitado para realizar mi etapa productiva mediante contrato de aprendizaje. Mi formación y experiencia en {TecnologiasPrincipales} tienen relación con los conocimientos solicitados para la posición.

Me gustaría tener la oportunidad de participar en el proceso de selección y aportar al equipo mientras continúo fortaleciendo mi formación profesional.

Adjunto mi hoja de vida para su consideración.

Quedo atento a cualquier información sobre el proceso.

Cordialmente,
{NombreCandidato}
{Telefono}
{CorreoCandidato}`;

const PLANTILLA_ALINEADA = `Asunto: Interés en vacante de etapa productiva – {NombreCandidato}

Buenas tardes, {NombreContacto}.

Mi nombre es {NombreCandidato}, estudiante de {Programa} del SENA, y actualmente me encuentro habilitado para realizar mi etapa productiva mediante contrato de aprendizaje.

Estoy interesado en la oportunidad de {Empresa}, ya que sus funciones se relacionan con mi formación en desarrollo de software y con mis conocimientos en {TecnologiasCoincidentes}.

Aunque la posición contempla diferentes tecnologías y herramientas, tengo disposición para continuar aprendiendo y fortalecer las competencias requeridas durante mi etapa productiva.

Adjunto mi hoja de vida para su consideración.

Quedo atento a cualquier información sobre el proceso de selección.

Cordialmente,
{NombreCandidato}
{Telefono}
{CorreoCandidato}`;

const PLANTILLA_ESPONTANEA = `Asunto: Solicitud de oportunidad para etapa productiva – {NombreCandidato}

Buenas tardes, {NombreContacto}.

Mi nombre es {NombreCandidato}, estudiante de {Programa} del SENA, y actualmente me encuentro habilitado para realizar mi etapa productiva mediante contrato de aprendizaje.

Me gustaría consultar si actualmente {Empresa} cuenta con oportunidades para aprendices en áreas relacionadas con desarrollo de software.

Cuento con conocimientos en {TecnologiasPrincipales} y experiencia desarrollando proyectos académicos y personales.

Adjunto mi hoja de vida para que pueda ser considerada en caso de existir una oportunidad acorde con mi perfil.

Muchas gracias por su atención.

Cordialmente,
{NombreCandidato}
{Telefono}
{CorreoCandidato}`;

const PLANTILLA_CORPORATIVA = `Asunto: Interés en etapa productiva – {NombreCandidato}

Cordial saludo, {NombreContacto}.

Mi nombre es {NombreCandidato}, estudiante de {Programa} del SENA. Actualmente me encuentro habilitado para realizar mi etapa productiva mediante contrato de aprendizaje y quisiera expresar mi interés en desarrollar esta etapa en {Empresa}.

Durante mi formación he adquirido conocimientos en {TecnologiasPrincipales} y he participado en diferentes proyectos de desarrollo de software, fortaleciendo mis competencias técnicas y de trabajo en equipo.

Considero que una etapa productiva en {Empresa} representaría una oportunidad para aplicar estos conocimientos, continuar mi formación y contribuir a los proyectos del equipo.

Adjunto mi hoja de vida para su consideración.

Quedo atento a cualquier oportunidad o información adicional.

Cordialmente,
{NombreCandidato}
{Telefono}
{CorreoCandidato}`;

const PLANTILLAS_CORREO = {
  principal: { nombre: 'Principal', texto: PLANTILLA_PRINCIPAL },
  directa: { nombre: 'Directa y corta', texto: PLANTILLA_DIRECTA },
  tecnica: { nombre: 'Perfil técnico', texto: PLANTILLA_TECNICA },
  vacante: { nombre: 'A una vacante concreta', texto: PLANTILLA_VACANTE },
  alineada: { nombre: 'Perfil alineado', texto: PLANTILLA_ALINEADA },
  espontanea: { nombre: 'Contacto espontáneo (RH)', texto: PLANTILLA_ESPONTANEA },
  corporativa: { nombre: 'Corporativa', texto: PLANTILLA_CORPORATIVA }
};

const VARS_DISPONIBLES = `
Variables disponibles (máximo 160 palabras totales en el cuerpo de la plantilla):
- {NombreContacto}: nombre/apellidos de la persona de contacto si existe en la oferta; si no existe, usar "equipo de Recursos Humanos".
- {NombreCandidato}: nombre completo del candidato.
- {Programa}: nombre del programa académico del candidato.
- {Empresa}: nombre exacto de la empresa (no modificar).
- {TecnologiasPrincipales}: las principales tecnologías/habilidades técnicas del candidato (máximo 3, separadas por comas, solo las que existan en su perfil; no inventar).
- {AreaPrincipal}: la principal área de interés del candidato.
- {NombreVacante}: nombre del cargo/vacante extraído de la oferta si existe; si no, usar un término genérico derivado de las funciones.
- {TecnologiasCoincidentes}: las tecnologías/áreas que coinciden entre el perfil del candidato y las funciones de la oferta.
- {Telefono}: teléfono del candidato.
- {CorreoCandidato}: correo del candidato.
`;

const SYSTEM_CORREO = `
Eres un experto en redacción de correos formales en español para postulación a prácticas profesionales (contrato de aprendizaje SENA).

Recibirás:
1. PERFIL DEL CANDIDATO (JSON)
2. DATOS DE LA OFERTA (empresa, contacto, funciones, vacante)
3. LA PLANTILLA que se debe usar (id de plantilla), o "auto" para que elijas la más adecuada.
4. LISTA DE VARIABLES disponibles.

Reglas OBLIGATORIAS (no violarlas):
- NO inventar experiencia, años de experiencia, tecnologías, cargos anteriores, certificaciones ni logros.
- NO modificar el nombre de la empresa ni el nombre del contacto.
- NO añadir párrafos no solicitados, emojis, negritas, cursivas ni Markdown.
- NO cambiar la estructura de la plantilla: respeta el texto tal como está, solo reemplazando las variables {...}.
- NO superar el límite de longitud establecido.
- Completar TODAS las variables de la plantilla seleccionada con datos reales del perfil y de la oferta.
- Seleccionar el área técnica relevante y las tecnologías coincidentes (solo si existen realmente en el perfil).
- Elegir el saludo según la información disponible: si hay una persona de contacto con nombre, dirigirse a ella; si no, a "equipo de Recursos Humanos".

Debes devolver SOLO JSON estrictamente válido:
{
  "asunto": "asunto completo rellenado",
  "cuerpo": "cuerpo completo rellenado, texto plano, respetando estructura y saltos de línea de la plantilla",
  "plantillaUsada": "id de la plantilla utilizada"
}

Cuando la plantilla solicitada sea "auto", elige la más adecuada considerando: si se menciona una vacante concreta usa 'vacante' o 'alineada'; si el contacto es una persona usa la natural; para empresas grandes/corporativas usa 'corporativa'.
`;

// Genera un correo de postulación personalizado (70b con fallback 8b)
async function generarCorreoConIA(oferta, perfil, plantillaId, apiKey, modelo) {
  const plantillaIdValido = PLANTILLAS_CORREO[plantillaId] ? plantillaId : 'auto';
  const textoPlantilla = plantillaIdValido === 'auto'
    ? 'PLANTILLA: auto (elige la más adecuada entre: ' + Object.keys(PLANTILLAS_CORREO).join(', ') + ')'
    : `PLANTILLA A USAR: "${plantillaIdValido}"\nTEXTO:\n${PLANTILLAS_CORREO[plantillaIdValido].texto}`;

  const prompt = `PERFIL DEL CANDIDATO:\n${JSON.stringify(perfil)}\n\nDATOS DE LA OFERTA:\nEmpresa: ${oferta.Empresa || 'No especificada'}\nContacto: ${oferta.Contacto || 'No especificado'}\nVacante: ${oferta.Cargo || oferta.NombreVacante || 'No especificada'}\nFunciones: ${(oferta.Funciones || []).join('. ')}\n\n${textoPlantilla}\n\n${VARS_DISPONIBLES}`;

  const contenido = await llamarGroq(
    [
      { role: 'system', content: SYSTEM_CORREO },
      { role: 'user', content: prompt }
    ],
    apiKey,
    resolverModelos(modelo, true),
    900,
    0.4,
    'json_object'
  );
  return parsearJsonRespuesta(contenido);
}

// Resuelve la lista de modelos según la preferencia del usuario.
// Si modelo es explícito (8b/70b) usa ese con fallback al 8b; si es 'auto' usa 70b con fallback 8b
// (preferirCalidad true: calidad primero; false: rapidez primero).
function resolverModelos(modelo, preferirCalidad) {
  const eleccion = String(modelo || '').toLowerCase();
  if (eleccion === '8b') return [MODELO_8B];
  if (eleccion === '70b') return [MODELO_70B, MODELO_8B];
  // auto: por defecto calidad (70B) para correos y clasificación; rapidez queda para quien elija 8B
  return preferirCalidad ? [MODELO_70B, MODELO_8B] : [MODELO_8B, MODELO_70B];
}

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