const fs = require('fs');
const data = JSON.parse(fs.readFileSync('test-results/results.json', 'utf8'));

const failures = [];

function collectErrors(test) {
    const msgs = [];
    for (const r of test.results || []) {
        for (const e of r.errors || []) {
            if (e.message) msgs.push(e.message.replace(/\x1b\[[0-9;]*m/g, ''));
        }
    }
    return [...new Set(msgs)];
}

function walkSuite(suite, file, suitePath) {
    for (const spec of suite.specs || []) {
        for (const test of spec.tests || []) {
            if (test.status === 'unexpected' || test.status === 'flaky') {
                failures.push({
                    file,
                    suite: suitePath,
                    title: spec.title,
                    status: test.status,
                    errs: collectErrors(test),
                });
            }
        }
    }
    for (const child of suite.suites || []) {
        const childPath = suitePath ? suitePath + ' > ' + child.title : child.title;
        walkSuite(child, file, childPath);
    }
}

for (const fileSuite of data.suites || []) {
    const filename = fileSuite.title.split('\\').pop().split('/').pop();
    walkSuite(fileSuite, filename, '');
}

for (const f of failures) {
    console.log('[' + f.status.toUpperCase() + '] ' + f.file + ' | ' + f.title);
    console.log('  suite: ' + f.suite);
    const msg = (f.errs[0] || '').split('\n').slice(0, 4).join(' | ');
    console.log('  err:   ' + msg.slice(0, 300));
    console.log();
}

const s = data.stats;
console.log('TOTAL  passed=' + s.expected + '  failed=' + s.unexpected + '  flaky=' + s.flaky + '  skipped=' + s.skipped);
