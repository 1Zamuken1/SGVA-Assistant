# SGVA Assistant - Project Context

## Visión General
Esta aplicación automatiza la extracción de ofertas de práctica desde el portal SGVA del SENA, y utiliza un modelo de IA (Groq) para procesar y estructurar el texto "sucio" de los modales web en datos limpios (Empresa, Contacto, Funciones, Fechas).
El objetivo principal es entregar una herramienta que **los aprendices del SENA puedan usar sin conocimientos técnicos ni instalaciones previas complicadas**.

## Contexto Histórico
1. **Versión 1 (Terminal Python):** Inicialmente era un script de consola. Resultaba muy difícil de ejecutar para usuarios no técnicos debido a la necesidad de instalar dependencias (Python, playwright, pip).
2. **Versión 2 (App de Escritorio Python - CustomTkinter):** Se construyó una interfaz gráfica bonita y se intentó empaquetar todo con PyInstaller (`app.py`, `browser_automation.py`, `ai_evaluator.py`). 
   - **Problema fatal:** PyInstaller es sumamente frágil empaquetando Playwright. El binario Chromium se intentaba instalar en carpetas temporales de solo lectura o los antivirus (falsos positivos) bloqueaban el comportamiento.
3. **Versión 3 (Web App con Electron + Playwright Node.js):** [ESTADO ACTUAL EN DESARROLLO]
   - Debido a los fallos constantes de PyInstaller empaquetando Playwright, se decidió migrar por completo la aplicación a **Javascript puro** (Frontend con HTML/CSS/JS, Backend con Node.js + Electron).
   - Se renombró la marca a **SGVA Assistant**.

## Decisiones Técnicas y Arquitectura (Electron)
- **Frontend (UI):** Se exige un diseño *premium* usando HTML, Vanilla CSS (estética Glassmorphism, animaciones sutiles, fuentes modernas como Inter o Segoe UI) y Javascript. **PROHIBIDO EL USO DE EMOJIS**, se deben usar iconos SVG o fuentes de iconos elegantes (como Phosphor, Lucide, o símbolos Unicode limpios).
- **Backend (Node.js/Electron):** Electron gestionará la comunicación con Playwright.
- **Scraping (Playwright Node.js):** Playwright se encargará de automatizar el inicio de sesión y extracción en el portal de SGVA. Correrá de forma nativa en Node.js, resolviendo los problemas históricos de empaquetado de Python.
- **IA (Groq SDK):** Se usa la API gratuita de Groq (modelo `llama-3.1-8b-instant` o equivalente) para estructurar el JSON.
- **Distribución (`electron-builder`):** La meta final es siempre compilar a un `.exe` o Instalador de Windows de 1 solo clic.

## Código Legado
El código antiguo basado en Python + CustomTkinter se encuentra almacenado de forma permanente en la carpeta `Backup_python/` para propósitos de referencia o extracción de promps.

## Reglas para el Asistente
- **SIEMPRE prioriza el diseño visual y la experiencia de usuario (UX)**: Los aprendices del SENA deben sentir que están usando una herramienta corporativa/premium, no un MVP genérico.
- **Evita Python:** Toda nueva lógica y automatización debe realizarse en Javascript / Node.js.
- **Manejo de Errores Silenciosos:** Como la aplicación se distribuye a no técnicos, la interfaz siempre debe comunicar qué está fallando (Credenciales malas, error de red) sin que la app se crashee o cierre de la nada.
