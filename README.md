# SGVA Assistant

SGVA Assistant is a modern desktop application built with Node.js and Electron. Its primary objective is to automate the search, extraction, and structuring of sponsored internship offers from the Colombian SENA web portal (SGVA) by leveraging Artificial Intelligence (Groq API).

## Key Features

- **Automation (Playwright):** Automatically logs in, navigates through the portal, handles modal alerts, and extracts job offers, simulating human interaction.
- **AI-Powered Parsing (Groq):** Processes raw, unstructured text from the web portal and automatically structures the data into specific fields: Company, Contact, Responsibilities, and Deadline.
- **Persistent Storage (Local JSON Database):** Caches every processed offer locally to save time and API tokens in future searches.
- **Performance Optimization:** Includes a "Low Performance" mode that disables heavy CSS animations and transparency effects to run smoothly on legacy hardware.
- **Data Export:** Allows users to export the structured results to Microsoft Excel (.xlsx) and Markdown (.md) formats with a single click.
- **Modern User Interface:** Built with vanilla HTML/CSS/JS using a Glassmorphism design system, dark mode, an animated stepper, and a live console log.

---

## Prerequisites

- **Operating System:** Windows 10/11
- **Credentials:** Active SENA apprentice account with access to the SGVA portal.
- **Groq API Key:** A free API key from [console.groq.com](https://console.groq.com/).

---

## Usage Guide

1. **Configuration:** Navigate to the **Configuración** tab. Enter your username, password, Groq API Key, and select your target department and city.
2. **Parameters:** Choose the extraction limit (e.g., "First 10") or choose to extract all available offers.
3. **Execution:** Navigate to the **Extractor** tab and click *Iniciar*. A visual stepper will display the robot's current progress.
4. **Review & Export:** Navigate to the **Ofertas** tab. Use the search bar to filter by keywords, review the cards, and use the export button to generate an Excel file with all the retrieved data.

---

## Development Setup

### Local Installation
Clone this repository and install the required dependencies (Playwright, Groq SDK, ExcelJS, Electron):
```bash
git clone https://github.com/your-username/sgva-assistant.git
cd sgva-assistant
npm install
```

### Development Mode
To run the application in development mode with DevTools enabled:
```bash
npm start
```

### Build for Production (.exe)
To generate a 1-click Windows installer:
```bash
npm run build
```
This command will create an `.exe` installer in the `dist/` directory using `electron-builder`.

---

## Technical Architecture

- **Frontend:** Semantic HTML5, Pure CSS3 (CSS Variables, Flexbox, Grid, no external frameworks), Vanilla JS (`app.js`).
- **Backend / Orchestrator:** Node.js with `Electron` (Main process) and bidirectional IPC channels.
- **Web Scraping:** `Playwright-core` Chromium engine.
- **Natural Language Processing:** `llama-3.1-8b-instant` model via the `groq` SDK.
- **Local File System:** Asynchronous reading and writing of JSON files via Node.js native `fs` module.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
