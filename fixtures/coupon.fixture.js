// tests/fixtures/coupon.fixture.js
const { test } = require("./couponGroup.fixture");

exports.test = test.extend({
  coupon: async ({ authRequest, couponGroup }, use) => {
    const formData = {
      group: couponGroup._id,
      name: "unico",
      is_reusable: "true",
      custom_code: `test${Date.now()}`,
      discount_type: "percent",
      max_use: "10",
      customer_max_use: "2",
      detail: "Cupón de prueba automática",
      quantity: "100",
      percent: "4",
      payment_required: "false",
    };

    // 🟢 Crear cupón
    const response = await authRequest.post(`/api/coupon`, {
      multipart: formData,
    });
    const body = await response.json();
    test.expect(response.ok()).toBeTruthy();

    const couponData = body.data;
    await use(couponData);

    // 🔴 Eliminar cupón al finalizar
    await authRequest.delete(`/api/coupon/${couponData._id}`);
  },
});
