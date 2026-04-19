const { test: categoryTest } = require("./category.fixture");

exports.test = categoryTest.extend({
  // Podemos agregar más fixtures aquí si es necesario
});

exports.expect = categoryTest.expect;
