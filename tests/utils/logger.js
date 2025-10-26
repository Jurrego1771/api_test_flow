const winston = require("winston");
const path = require("path");
const fs = require("fs");

const logsDir = path.resolve(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true })
      ),
    }),
    new winston.transports.File({ filename: path.join(logsDir, "api_tests.log") }),
  ],
});

function summarizeBody(body) {
  try {
    if (body == null) return "null";
    if (typeof body === "string") return body.slice(0, 200);
    const keys = Object.keys(body);
    const preview = JSON.stringify(
      Array.isArray(body)
        ? body.slice(0, 1)
        : keys.reduce((acc, k) => {
            acc[k] = body[k];
            return acc;
          }, {}),
      null,
      0
    );
    return preview.length > 200 ? `${preview.slice(0, 200)}...` : preview;
  } catch {
    return "<unserializable>";
  }
}

function logApiResult(method, endpoint, status, durationMs, body) {
  const line = `${method.toUpperCase()} ${endpoint} -> ${status} (${durationMs}ms)`;
  logger.info(line);
  logger.info(`Body: ${summarizeBody(body)}`);
}

module.exports = {
  logger,
  logApiResult,
};
