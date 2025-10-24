// tests/fixtures/coupon.fixture.js
const { test } = require("./couponGroup.fixture");

exports.test = test.extend({
  coupon: async ({ authRequest }, use) => {
    let couponGroup;

    //  consultar si ya existe un grupo de cupones
    const existingGroupsResponse = await authRequest.get("/api/coupon-group");
    const existingGroups = await existingGroupsResponse.json();

    if (existingGroups.data && existingGroups.data.length > 0) {
      // ✅ Usar el primer grupo existente
      couponGroup = existingGroups.data[0];
      console.log(
        `Usando grupo existente: ${couponGroup.name} (ID: ${couponGroup._id})`
      );
      console.log(JSON.stringify(couponGroup, null, 2));
    } else {
      // 🆕 Crear un nuevo grupo si no existe ninguno
      const payload = {
        coupon_group_name: `qa_auto_${Date.now()}`,
        coupon_group_gateway: "Stripe",
      };

      const response = await authRequest.post(`/api/coupon-group`, {
        data: payload,
      });
      const body = await response.json();
      test.expect(response.ok()).toBeTruthy();

      couponGroup = body.data;
      console.log(
        `Creado nuevo grupo: ${couponGroup.coupon_group_name} (ID: ${couponGroup._id})`
      );
    }

    // Crear el cupón usando el grupo (existente o nuevo)
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

    // La API puede devolver un array o un objeto
    const rawData = body.data;
    const couponData = Array.isArray(rawData) ? rawData[0] : rawData;

    // Asegurar que los tests tengan acceso a estos campos
    couponData.custom_code = formData.custom_code;
    couponData.group = couponGroup._id;
    // Opcional: exponer info completa del grupo
    couponData.groupData = couponGroup;

    await use(couponData);

    // 🔴 Solo eliminar cupón al finalizar (NO el grupo)
    try {
      console.log(`[Fixture] Intentando eliminar cupón: ${couponData._id}`);
      const deleteResponse = await authRequest.delete(
        `/api/coupon/${couponData._id}`
      );
      const deleteStatus = deleteResponse.status();
      const deleteBodyText = await deleteResponse.text();
      console.log(
        `[Fixture] DELETE /api/coupon/${couponData._id} -> status=${deleteStatus} body=${deleteBodyText}`
      );
    } catch (err) {
      console.error(`[Fixture] Error eliminando cupón ${couponData._id}:`, err);
    }
  },
});
