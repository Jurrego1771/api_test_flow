require("dotenv").config();
const fs = require("fs");
const axios = require("axios");

const WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const RESULTS_FILE = "test-results/results.json";
const SUITE_NAME = process.env.SUITE_NAME || "API Tests";
const REPORT_URL = process.env.REPORT_URL || "https://jurrego1771.github.io/api_test_flow/";
const NOTIFY_ON_FAIL_ONLY = process.env.NOTIFY_ON_FAIL_ONLY === "true";

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

const total    = stats.tests ?? stats.expected ?? 0;
const passed   = stats.passes ?? stats.expected ?? 0;
const failed   = stats.unexpected ?? 0;
const flaky    = stats.flaky ?? 0;
const skipped  = stats.skipped ?? 0;
const duration = (stats.duration / 1000).toFixed(2);

const hasIssues = failed > 0 || flaky > 0;

if (NOTIFY_ON_FAIL_ONLY && !hasIssues) {
  console.log("✅ Sin fallos — notificación omitida (NOTIFY_ON_FAIL_ONLY=true)");
  process.exit(0);
}

const color      = failed > 0 ? "#E01E5A" : flaky > 0 ? "#ECB22E" : "#2EB67D";
const emoji      = failed > 0 ? "❌" : flaky > 0 ? "⚠️" : "✅";
const statusText = failed > 0 ? "Hay fallos" : flaky > 0 ? "Hay inestabilidad (flaky)" : "Ejecución estable";

const message = {
  blocks: [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*:shield: ${SUITE_NAME}* — ${statusText} ${emoji}`,
      },
    },
    { type: "divider" },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Total:*\n${total}` },
        { type: "mrkdwn", text: `*Exitosas:*\n${passed}` },
        { type: "mrkdwn", text: `*Fallidas:*\n${failed}` },
        { type: "mrkdwn", text: `*Flaky:*\n${flaky}` },
        { type: "mrkdwn", text: `*Saltadas:*\n${skipped}` },
        { type: "mrkdwn", text: `*Duración:*\n${duration}s` },
      ],
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", emoji: true, text: "📊 Ver Reporte" },
          style: failed > 0 ? "danger" : "primary",
          url: REPORT_URL,
        },
      ],
    },
  ],
  attachments: [{ color }],
  text: `${SUITE_NAME}: ${statusText} — total=${total}, pass=${passed}, fail=${failed}, flaky=${flaky}, skip=${skipped}`,
};

axios
  .post(WEBHOOK_URL, message)
  .then(() => console.log("✅ Notificación enviada a Slack"))
  .catch((err) => console.error("❌ Error al enviar notificación a Slack:", err));
