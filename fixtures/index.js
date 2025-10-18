// fixtures/index.js
const { test: authTest, expect } = require("./authRequest.fixture.js");
// const { test: unauthTest } = require('./unauthRequest.fixture.js'); // ejemplo futuro

module.exports = { test: authTest, expect };
