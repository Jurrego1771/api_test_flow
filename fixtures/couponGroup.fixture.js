// tests/fixtures/couponGroup.fixture.js
const { test } = require("./authRequest.fixture");

exports.test = test.extend({
  couponGroup: async ({ authRequest }, use) => {
    const payload = {
      coupon_group_name: `qa_auto_${Date.now()}`,
      coupon_group_gateway: "Stripe",
    };

    // 🟢 Crear grupo de cupones
    const response = await authRequest.post(`/api/coupon-group`, { data: payload });
    const body = await response.json();
    test.expect(response.ok()).toBeTruthy();

    const groupData = body.data;
    await use(groupData);

    // 🔴 Eliminar grupo al finalizar
    await authRequest.delete(`/api/coupon-group/${groupData._id}`);
  },
});
