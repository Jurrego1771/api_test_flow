#!/usr/bin/env node
/**
 * Verifies every smoke module has a matching contract spec.
 * Handles known directory name aliases between layers.
 * Run: node scripts/check-coverage.js
 * Exit 1 if gaps found (useful in CI).
 */

const fs = require('fs');
const path = require('path');

const TESTS_ROOT = path.join(__dirname, '..', 'tests', 'api');
const LAYERS = ['smoke', 'regression', 'integration', 'contract'];

// Known aliases: smoke dir name → canonical name (used in other layers)
const MODULE_ALIASES = {
    'cupones': 'coupon',
    'access': 'access-token',
    'access-restriction': 'access_restriction',
};

function normalize(name) {
    return MODULE_ALIASES[name] ?? name;
}

function getModulesInLayer(layer) {
    const layerDir = path.join(TESTS_ROOT, layer);
    if (!fs.existsSync(layerDir)) return new Set();
    const dirs = fs.readdirSync(layerDir, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => e.name);
    // Store both raw and normalized
    const set = new Set();
    for (const d of dirs) {
        set.add(d);
        set.add(normalize(d));
    }
    return set;
}

function getModuleList(layer) {
    const layerDir = path.join(TESTS_ROOT, layer);
    if (!fs.existsSync(layerDir)) return [];
    return fs.readdirSync(layerDir, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => e.name);
}

const coverage = {};
for (const layer of LAYERS) {
    coverage[layer] = getModulesInLayer(layer);
}

const smokeModules = getModuleList('smoke').sort();

const rows = smokeModules.map(mod => {
    const canonical = normalize(mod);
    return {
        module: mod,
        smoke: '✓',
        contract: coverage.contract.has(mod) || coverage.contract.has(canonical) ? '✓' : '✗ MISSING',
        regression: coverage.regression.has(mod) || coverage.regression.has(canonical) ? '✓' : '–',
        integration: coverage.integration.has(mod) || coverage.integration.has(canonical) ? '✓' : '–',
    };
});

const colWidths = { module: 24, smoke: 6, contract: 14, regression: 11, integration: 12 };
const pad = (s, n) => String(s).padEnd(n);

const header = `${pad('Module', colWidths.module)} ${pad('Smoke', colWidths.smoke)} ${pad('Contract', colWidths.contract)} ${pad('Regression', colWidths.regression)} ${pad('Integration', colWidths.integration)}`;
const divider = '-'.repeat(header.length);

console.log('\nTest Coverage Report\n');
console.log(header);
console.log(divider);
for (const r of rows) {
    console.log(
        `${pad(r.module, colWidths.module)} ${pad(r.smoke, colWidths.smoke)} ${pad(r.contract, colWidths.contract)} ${pad(r.regression, colWidths.regression)} ${pad(r.integration, colWidths.integration)}`
    );
}
console.log(divider);

const contractGaps = rows.filter(r => r.contract.includes('MISSING'));
if (contractGaps.length > 0) {
    console.log(`\n⚠  Contract gaps (${contractGaps.length}): ${contractGaps.map(r => r.module).join(', ')}`);
    process.exit(1);
} else {
    console.log('\n✓ All smoke modules have contract coverage.\n');
}
