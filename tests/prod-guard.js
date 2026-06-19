/**
 * Global setup — Prod Safety Guard
 *
 * La suite es DESTRUCTIVA (crea y borra recursos reales). Correrla contra un
 * ambiente productivo SOLO es seguro si el token pertenece a la cuenta QA
 * dedicada de esa región. Este guard aborta cualquier corrida que apunte a
 * prod sin la confirmación explícita QA_ACCOUNT=true (que solo inyectan los
 * workflows de prod, ya configurados con el token de la cuenta QA).
 *
 * - dev (dev.platform.mediastre.am): pasa siempre, sin restricción.
 * - prod (platform.mediastre.am / eu.platform.mediastre.am): exige QA_ACCOUNT=true.
 *
 * Previene el accidente clásico: `BASE_URL=<prod> npx playwright test` con un
 * token que no es de la cuenta QA -> ghost data / acciones reales en clientes.
 */

const PROD_HOSTS = [
  'platform.mediastre.am',     // US (default, sin prefijo de región)
  'eu.platform.mediastre.am',  // EU
];

function isDev(url) {
  return /dev\.platform\.mediastre\.am/i.test(url);
}

function isProd(url) {
  if (isDev(url)) return false;
  return PROD_HOSTS.some((h) => url.includes(h));
}

module.exports = async () => {
  const baseURL = process.env.BASE_URL || '';

  if (isProd(baseURL) && process.env.QA_ACCOUNT !== 'true') {
    throw new Error(
      `\n\n🛑 PROD SAFETY GUARD\n` +
      `BASE_URL apunta a producción (${baseURL}) pero QA_ACCOUNT != 'true'.\n` +
      `La suite es destructiva: solo puede correr en prod contra la cuenta QA dedicada.\n` +
      `Si realmente usas la cuenta QA de esa región, exporta QA_ACCOUNT=true.\n` +
      `Los workflows de prod (prod-weekly.yml) ya lo hacen automáticamente.\n`
    );
  }

  if (isProd(baseURL)) {
    console.log(`✅ Prod guard OK — corriendo contra ${baseURL} con cuenta QA (QA_ACCOUNT=true)`);
  }
};
