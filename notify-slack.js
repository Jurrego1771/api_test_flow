// notify-slack.js
require("dotenv").config();
const fs = require("fs");
const axios = require("axios");

const WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const RESULTS_FILE = "test-results/results.json";
const REPORT_URL = "https://jurrego1771.github.io/api_test_flow/";

if (!WEBHOOK_URL) {
  console.error("❌ No se encontró SLACK_WEBHOOK_URL en el archivo .env");
  process.exit(1);
}

if (!fs.existsSync(RESULTS_FILE)) {
  console.error("❌ No se encontró el archivo de resultados:", RESULTS_FILE);
  process.exit(1);
}

const results = JSON.parse(fs.readFileSync(RESULTS_FILE, "utf8"));
const { stats } = results;

const total = stats.expected;
const passed = total - (stats.unexpected + stats.flaky);
const failed = stats.unexpected;
const duration = (stats.duration / 1000).toFixed(2);

const color = failed > 0 ? "#E01E5A" : "#2EB67D";
const emoji = failed > 0 ? "❌" : "✅";
const statusText =
  failed > 0 ? "Algunas pruebas fallaron" : "Todas las pruebas pasaron";

const message = {
  blocks: [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*:shield: Resultados de Pruebas*`,
      },
    },
    {
      type: "divider",
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Estado:*\n${statusText} ${emoji}`,
        },
        {
          type: "mrkdwn",
          text: `*Duración:*\n${duration}s`,
        },
        {
          type: "mrkdwn",
          text: `*Total:*\n${total}`,
        },
        {
          type: "mrkdwn",
          text: `*Exitosas:*\n${passed}`,
        },
        {
          type: "mrkdwn",
          text: `*Fallidas:*\n${failed}`,
        },
      ],
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            emoji: true,
            text: "🔗 Ver Reporte Completo",
          },
          style: failed > 0 ? "danger" : "primary",
          url: REPORT_URL,
        },
      ],
    },
  ],
  attachments: [
    {
      color: color,
    },
  ],
};

axios
  .post(WEBHOOK_URL, message)
  .then(() => console.log("✅ Notificación enviada a Slack"))
  .catch((err) =>
    console.error("❌ Error al enviar notificación a Slack:", err)
  );
