/**
 * Genera pipeline/input/diff.patch desde una rama de feature.
 *
 * MODOS:
 *
 * 1. Local simple (repo ya clonado, ramas ya presentes):
 *    node pipeline/gen-diff.js <branch> [base] --repo <path>
 *
 * 2. Fetch completo (fetch + checkout + diff + cleanup):
 *    node pipeline/gen-diff.js <branch> [base] --repo <path> --fetch
 *    npm run pipeline:diff -- feature/issue-8083-js --repo D:\Dev\Repos\mediastream\sm2 --fetch
 *
 * 3. Remoto via GitHub API (requiere GITHUB_TOKEN en .env):
 *    node pipeline/gen-diff.js <branch> [base] --remote owner/repo
 *
 * Ejemplos:
 *   npm run pipeline:diff -- feature/issue-8083-js master --repo D:\Dev\Repos\mediastream\sm2 --fetch
 *   npm run pipeline:diff -- feature/issue-8083-js --remote mediastream/sm2
 */
const { execSync } = require('child_process');
const https = require('https');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// ── Parse args ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

function extractFlag(flag, hasValue = true) {
    const idx = args.indexOf(flag);
    if (idx === -1) return null;
    return hasValue ? args.splice(idx, 2)[1] : (args.splice(idx, 1), true);
}

const repoPath  = extractFlag('--repo')   || process.env.SM2_REPO_PATH  || null;
const remote    = extractFlag('--remote') || null;
const doFetch   = extractFlag('--fetch', false) !== null;
const branch    = args[0];
const base      = args[1] || process.env.SM2_BASE_BRANCH || 'master';
const outPath   = path.join(__dirname, 'input', 'diff.patch');

if (!branch) {
    console.error([
        'Error: falta nombre de rama.',
        '',
        'Modos de uso:',
        '  fetch:   npm run pipeline:diff -- <branch> [base] --repo <path> --fetch',
        '  local:   npm run pipeline:diff -- <branch> [base] --repo <path>',
        '  remoto:  npm run pipeline:diff -- <branch> [base] --remote owner/repo',
        '',
        'Ejemplo:',
        '  npm run pipeline:diff -- feature/issue-8083-js master --repo D:\\Dev\\Repos\\mediastream\\sm2 --fetch',
    ].join('\n'));
    process.exit(1);
}

// ── MODO REMOTO (GitHub API) ─────────────────────────────────────────────────
if (remote) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        console.error('Error: GITHUB_TOKEN no está definido en .env');
        process.exit(1);
    }

    const url = `https://api.github.com/repos/${remote}/compare/${base}...${branch}`;
    console.log(`Consultando GitHub API: ${url}`);

    const options = {
        headers: {
            'Accept': 'application/vnd.github.v3.diff',
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'api_test_flow/pipeline',
            'X-GitHub-Api-Version': '2022-11-28',
        },
    };

    https.get(url, options, (res) => {
        if (res.statusCode === 404) {
            console.error(`Error 404: repo '${remote}' o rama '${branch}' no encontrada. Verifica nombre y permisos del token.`);
            process.exit(1);
        }
        if (res.statusCode === 401 || res.statusCode === 403) {
            console.error(`Error ${res.statusCode}: GITHUB_TOKEN sin permisos para '${remote}'.`);
            process.exit(1);
        }
        if (res.statusCode !== 200) {
            console.error(`Error HTTP ${res.statusCode} al consultar GitHub API.`);
            process.exit(1);
        }

        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
            if (!body.trim()) {
                console.log(`Sin cambios entre '${base}' y '${branch}'.`);
                fs.writeFileSync(outPath, '');
                return;
            }
            fs.writeFileSync(outPath, body);
            const lines = body.split('\n').length;
            const files = (body.match(/^diff --git/gm) || []).length;
            console.log(`✓ diff generado: ${files} archivo(s), ${lines} líneas → ${outPath}`);
        });
    }).on('error', err => {
        console.error('Error de red:', err.message);
        process.exit(1);
    });

    return;
}

// ── MODO LOCAL / FETCH ───────────────────────────────────────────────────────
if (!repoPath) {
    console.error('Error: --repo <path> requerido para modo local/fetch.');
    process.exit(1);
}

const cwd = path.resolve(repoPath);

if (!fs.existsSync(cwd)) {
    console.error(`Error: directorio '${cwd}' no existe.`);
    process.exit(1);
}

function git(cmd) {
    return execSync(`git ${cmd}`, { encoding: 'utf8', cwd, stdio: 'pipe' }).trim();
}

function gitSafe(cmd) {
    try { return git(cmd); } catch { return null; }
}

try {
    if (doFetch) {
        // ── Fetch completo ──────────────────────────────────────────────────
        console.log('► git fetch origin --prune');
        git('fetch origin --prune');

        console.log(`► git checkout ${base}`);
        git(`checkout ${base}`);

        console.log(`► git pull origin ${base}`);
        git(`pull origin ${base}`);

        // Si la rama local ya existe de un run anterior, borrarla primero
        const localExists = gitSafe(`rev-parse --verify ${branch}`);
        if (localExists) {
            console.log(`► git branch -D ${branch}  (limpiando run anterior)`);
            git(`branch -D ${branch}`);
        }

        console.log(`► git checkout -b ${branch} origin/${branch}`);
        git(`checkout -b ${branch} origin/${branch}`);
    } else {
        // Verificar que la rama ya existe localmente
        const exists = gitSafe(`rev-parse --verify ${branch}`);
        if (!exists) {
            console.error(`Error: rama '${branch}' no existe en '${cwd}'. Usa --fetch para bajarla.`);
            process.exit(1);
        }
    }

    // ── Generar diff ────────────────────────────────────────────────────────
    console.log(`► git diff ${base}...${branch}`);
    const diff = git(`diff ${base}...${branch}`);

    if (!diff.trim()) {
        console.log(`Sin cambios entre '${base}' y '${branch}'.`);
        fs.writeFileSync(outPath, '');
    } else {
        fs.writeFileSync(outPath, diff);
        const lines = diff.split('\n').length;
        const files = (diff.match(/^diff --git/gm) || []).length;
        console.log(`✓ diff generado: ${files} archivo(s), ${lines} líneas → ${outPath}`);
    }

} finally {
    // ── Cleanup (siempre, incluso si falla el diff) ─────────────────────────
    if (doFetch) {
        try {
            console.log(`► git checkout ${base}`);
            git(`checkout ${base}`);
            console.log(`► git branch -D ${branch}`);
            git(`branch -D ${branch}`);
            console.log('✓ rama temporal eliminada');
        } catch (e) {
            console.warn(`Aviso: cleanup parcial — ${e.message}`);
        }
    }
}
