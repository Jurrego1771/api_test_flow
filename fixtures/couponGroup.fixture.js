// tests/fixtures/couponGroup.fixture.js
const { test } = require("./authRequest.fixture");

exports.test = test.extend({
  couponGroup: async ({ authRequest }, use) => {
    // 🔍 Primero consultar si ya existe un grupo
    const existingGroupsResponse = await authRequest.get("/api/coupon-group");
    const existingGroups = await existingGroupsResponse.json();

    if (existingGroups.data && existingGroups.data.length > 0) {
      // ✅ Usar grupo existente
      const groupData = existingGroups.data[0];
      console.log(`Usando grupo existente: ${groupData.coupon_group_name}`);
      await use(groupData);
    } else {
      // 🆕 Crear nuevo grupo solo si no existe
      const payload = {
        coupon_group_name: `qa_auto_${Date.now()}`,
        coupon_group_gateway: "Stripe",
      };

      const response = await authRequest.post(`/api/coupon-group`, {
        data: payload,
      });
      const body = await response.json();
      test.expect(response.ok()).toBeTruthy();

      const groupData = body.data;
      console.log(`Creado nuevo grupo: ${groupData.coupon_group_name}`);
      await use(groupData);

      
    }
  },
});
