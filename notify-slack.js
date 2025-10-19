// notify-slack.js
require("dotenv").config();
const fs = require("fs");
const axios = require("axios");

const WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const RESULTS_FILE = "test-results/results.json";

(async () => {
  try {
    if (!WEBHOOK_URL) {
      console.error("❌ Falta SLACK_WEBHOOK_URL en el archivo .env");
      process.exit(1);
    }

    if (!fs.existsSync(RESULTS_FILE)) {
      console.error(
        `❌ No se encontró el archivo de resultados: ${RESULTS_FILE}`
      );
      process.exit(1);
    }

    const results = JSON.parse(fs.readFileSync(RESULTS_FILE, "utf-8"));

    // Extrae resumen general
    const total = results.stats?.total || 0;
    const passed = results.stats?.expected || 0;
    const failed = results.stats?.unexpected || 0;
    const skipped = results.stats?.skipped || 0;
    const duration = results.stats?.duration
      ? (results.stats.duration / 1000).toFixed(1)
      : "N/A";

    // Determina estado general
    const statusEmoji = failed > 0 ? "❌" : "✅";
    const statusText = failed > 0 ? "Con fallos" : "Todo correcto";

    const message = {
      text: `${statusEmoji} *Resultados de pruebas Playwright*`,
      attachments: [
        {
          color: failed > 0 ? "#FF4D4F" : "#36A64F",
          fields: [
            { title: "Estado general", value: statusText, short: true },
            { title: "Total de tests", value: `${total}`, short: true },
            { title: "✔️ Pasados", value: `${passed}`, short: true },
            { title: "❌ Fallados", value: `${failed}`, short: true },
            { title: "⏭️ Omitidos", value: `${skipped}`, short: true },
            { title: "🕐 Duración", value: `${duration}s`, short: true },
          ],
          footer: "Playwright QA Bot",
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    await axios.post(WEBHOOK_URL, message);

    console.log("✅ Resultados enviados a Slack correctamente");
  } catch (error) {
    console.error("⚠️ Error al enviar resultados a Slack:", error.message);
    process.exit(1);
  }
})();
