const { Groq } = require('groq-sdk');

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

async function estructurarOferta(contenidoRaw, apiKey) {
  const groq = new Groq({ apiKey });

  const MAX_RETRIES = 5;
  for (let intento = 0; intento < MAX_RETRIES; intento++) {
    try {
      const response = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: contenidoRaw }
        ],
        model: 'llama-3.1-8b-instant',
        temperature: 0,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      });

      const jsonStr = response.choices[0]?.message?.content || '{}';
      const result = JSON.parse(jsonStr);
      return result;

    } catch (error) {
      const errStr = error.toString().toLowerCase();
      if (errStr.includes('rate_limit') || errStr.includes('429')) {
        const espera = Math.min(Math.pow(2, intento) + 5, 120);
        // Wait and retry
        await new Promise(r => setTimeout(r, espera * 1000));
      } else {
        console.error("Error estructurando oferta con Groq:", error);
        return null;
      }
    }
  }
  return null;
}

module.exports = { estructurarOferta };
