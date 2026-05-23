/**
 * Genera pipeline/input/diff.patch desde una rama de feature.
 *
 * MODOS:
 *
 * 1. Remoto via gh CLI (requiere: gh auth login):
 *    node pipeline/gen-diff.js <branch> [base]
 *    node pipeline/gen-diff.js <branch> [base] --remote owner/repo
 *
 * 2. Local simple (repo ya clonado, ramas ya presentes):
 *    node pipeline/gen-diff.js <branch> [base] --repo <path>
 *
 * 3. Fetch completo (fetch + checkout + diff + cleanup):
 *    node pipeline/gen-diff.js <branch> [base] --repo <path> --fetch
 *
 * Variables de entorno (.env):
 *   SM2_REMOTE=mediastream/sm2   ← repo destino por defecto (evita pasar --remote)
 *   SM2_BASE_BRANCH=master
 *   SM2_REPO_PATH=<path>         ← repo local por defecto para modos --repo
 *
 * Ejemplos:
 *   npm run pipeline:diff -- feature/issue-8303
 *   npm run pipeline:diff -- feature/issue-8303 --remote mediastream/sm2
 *   npm run pipeline:diff -- feature/issue-8083-js master --repo D:\Dev\Repos\mediastream\sm2 --fetch
 */
const { execSync } = require('child_process');
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

const repoPath = extractFlag('--repo')   || process.env.SM2_REPO_PATH || null;
const remote   = extractFlag('--remote') || process.env.SM2_REMOTE    || null;
const doFetch  = extractFlag('--fetch', false) !== null;
const branch   = args[0];
const base     = args[1] || process.env.SM2_BASE_BRANCH || 'master';
const outPath  = path.join(__dirname, 'input', 'diff.patch');

if (!branch) {
    console.error([
        'Error: falta nombre de rama.',
        '',
        'Modos de uso:',
        '  remoto:  npm run pipeline:diff -- <branch> [base]',
        '           npm run pipeline:diff -- <branch> [base] --remote owner/repo',
        '  local:   npm run pipeline:diff -- <branch> [base] --repo <path>',
        '  fetch:   npm run pipeline:diff -- <branch> [base] --repo <path> --fetch',
        '',
        'Variables de entorno útiles (.env):',
        '  SM2_REMOTE=mediastream/sm2',
        '  SM2_BASE_BRANCH=master',
        '',
        'Ejemplos:',
        '  npm run pipeline:diff -- feature/issue-8303',
        '  npm run pipeline:diff -- feature/issue-8083-js master --repo D:\\Dev\\Repos\\mediastream\\sm2 --fetch',
    ].join('\n'));
    process.exit(1);
}

// ── MODO REMOTO (gh CLI) ─────────────────────────────────────────────────────
if (remote) {
    try {
        execSync('gh auth status', { stdio: 'pipe' });
    } catch {
        console.error([
            'Error: gh CLI no está autenticado.',
            'Ejecuta: gh auth login',
        ].join('\n'));
        process.exit(1);
    }

    console.log(`► gh api repos/${remote}/compare/${base}...${branch}`);
    let body;
    try {
        body = execSync(
            `gh api "repos/${remote}/compare/${base}...${branch}" -H "Accept: application/vnd.github.v3.diff"`,
            { encoding: 'utf8' }
        );
    } catch (err) {
        console.error(`Error gh CLI: ${err.message}`);
        process.exit(1);
    }

    if (!body.trim()) {
        console.log(`Sin cambios entre '${base}' y '${branch}'.`);
        fs.writeFileSync(outPath, '');
    } else {
        fs.writeFileSync(outPath, body);
        const lines = body.split('\n').length;
        const files = (body.match(/^diff --git/gm) || []).length;
        console.log(`✓ diff generado: ${files} archivo(s), ${lines} líneas → ${outPath}`);
    }
    return;
}

// ── MODO LOCAL / FETCH ───────────────────────────────────────────────────────
if (!repoPath) {
    console.error([
        'Error: necesitas --repo <path> o SM2_REPO_PATH en .env para modo local.',
        'Para modo remoto, define SM2_REMOTE en .env o usa --remote owner/repo.',
    ].join('\n'));
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
        console.log('► git fetch origin --prune');
        git('fetch origin --prune');

        console.log(`► git checkout ${base}`);
        git(`checkout ${base}`);

        console.log(`► git pull origin ${base}`);
        git(`pull origin ${base}`);

        const localExists = gitSafe(`rev-parse --verify ${branch}`);
        if (localExists) {
            console.log(`► git branch -D ${branch}  (limpiando run anterior)`);
            git(`branch -D ${branch}`);
        }

        console.log(`► git checkout -b ${branch} origin/${branch}`);
        git(`checkout -b ${branch} origin/${branch}`);
    } else {
        const exists = gitSafe(`rev-parse --verify ${branch}`);
        if (!exists) {
            console.error(`Error: rama '${branch}' no existe en '${cwd}'. Usa --fetch para bajarla.`);
            process.exit(1);
        }
    }

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
