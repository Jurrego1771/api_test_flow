const { test } = require('@playwright/test');

function annotateCase({ type, issue, reason } = {}) {
  const info = test.info();

  if (issue) {
    info.annotations.push({ type: 'issue', description: issue });
  }

  if (type) {
    info.annotations.push({ type, description: reason || issue || '' });
  }
}

function markKnownBug({ issue, reason } = {}) {
  annotateCase({ type: 'known-bug', issue, reason });
  test.fail(true, reason || issue || 'Known bug');
}

function markQuarantine({ issue, reason } = {}) {
  annotateCase({ type: 'quarantine', issue, reason });
  test.skip(true, reason || issue || 'Quarantined case');
}

function markFixme({ issue, reason } = {}) {
  annotateCase({ type: 'fixme', issue, reason });
  test.fixme(true, reason || issue || 'Not ready yet');
}

function knownBugTest(title, fn) {
  return test(`${title} @known-bug`, fn);
}

function quarantineTest(title, fn) {
  return test(`${title} @quarantine`, fn);
}

async function ensureEndpointAvailable(client, path, { skipStatuses = [401, 404], context } = {}) {
  const res = await client.get(path);

  if (skipStatuses.includes(res.status)) {
    test.skip(true, context || 'Endpoint no disponible en este entorno');
    return { available: false, response: res };
  }

  if (!res.ok) {
    throw new Error(`${context || 'Endpoint availability check failed'}: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return { available: true, response: res };
}

module.exports = {
  annotateCase,
  markKnownBug,
  markQuarantine,
  markFixme,
  ensureEndpointAvailable,
  knownBugTest,
  quarantineTest,
};
