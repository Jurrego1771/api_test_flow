const { test } = require("../../fixtures/coupon.fixture");
const { expect } = require("@playwright/test");
const logger = require("../utils/logger");

// Variables para manejar datos extraídos
let extractedGroupIds = [];
let generatedCouponCodes = [];
let generatedCouponIds = [];
let allCoupons = [];

test.describe("🎫 Cupones API Tests - /api/coupon", () => {
  test.beforeAll(async ({ authRequest }) => {
    logger.info("🎫 Iniciando tests completos de API Cupones");

    // Obtener grupos de cupones existentes
    logger.info("📊 Obteniendo Group IDs existentes...");
    const groupsResponse = await authRequest.get("/api/coupon-group");
    const groupsBody = await groupsResponse.json();

    if (groupsResponse.ok() && groupsBody.status === "OK") {
      extractedGroupIds = groupsBody.data
        .map((group) => group._id)
        .filter(Boolean);
      logger.info(
        `✅ ${extractedGroupIds.length} Group IDs obtenidos para tests`
      );

      if (extractedGroupIds.length > 0) {
        logger.info(`🎯 Ejemplo Group ID: ${extractedGroupIds[0]}`);
      }
    } else {
      logger.info("❌ Error obteniendo grupos de cupones");
      logger.info(
        "⚠️ Los tests de creación pueden fallar por falta de Group IDs"
      );
    }

    // Obtener cupones existentes
    const couponsResponse = await authRequest.get("/api/coupon");
    const couponsBody = await couponsResponse.json();

    if (couponsResponse.ok() && couponsBody.status === "OK") {
      allCoupons = couponsBody.data || [];
      logger.info(`✅ ${allCoupons.length} cupones existentes obtenidos`);
    }
  });

  test.afterAll(() => {
    logger.info("🎫 Tests completos de API Cupones completados");
    logger.info(`📊 Grupos disponibles: ${extractedGroupIds.length}`);
    logger.info(
      `📊 Cupones generados en tests: ${generatedCouponCodes.length}`
    );
    if (generatedCouponCodes.length > 0) {
      logger.info(`🎯 Códigos creados: ${generatedCouponCodes.join(", ")}`);
    }
  });

  // ================== TESTS GET ==================

  test("TC-001: GET /api/coupon - Verificar respuesta básica", async ({
    authRequest,
  }) => {
    logger.info("🧪 Test: Verificar respuesta básica de cupones");

    const response = await authRequest.get("/api/coupon");
    const body = await response.json();

    logger.info(
      `📡 GET /api/coupon - Status: ${response.status()}, Data Status: ${
        body.status
      }`
    );

    expect(response.ok()).toBeTruthy();
    expect(body.status).toBe("OK");
    expect(Array.isArray(body.data)).toBe(true);

    logger.info("✅ Respuesta básica verificada");
  });

  test("TC-002: GET /api/coupon - Verificar filtro por custom_code", async ({
    authRequest,
    coupon,
  }) => {
    logger.info("🧪 Test: Filtrar cupón por código personalizado");

    const response = await authRequest.get(
      `/api/coupon?custom_code=${coupon.custom_code}`
    );
    const body = await response.json();

    expect(response.ok()).toBeTruthy();
    expect(body.status).toBe("OK");
    expect(Array.isArray(body.data)).toBe(true);

    const codes = body.data
      .map((c) => c && (c.custom_code ?? c.code))
      .filter(Boolean);

    // Debug auxiliar si no se encuentra el código
    if (!codes.includes(coupon.custom_code)) {
      logger.info(
        `DEBUG filtro custom_code: sampleItem=${JSON.stringify(
          body.data?.[0],
          null,
          2
        )}`
      );
    }

    expect(codes).toContain(coupon.custom_code);

    logger.info(`✅ Cupón encontrado por código: ${coupon.custom_code}`);
  });

  test("TC-003: GET /api/coupon - Validar estructura de datos", async ({
    authRequest,
  }) => {
    logger.info("🧪 Test: Validar estructura de datos de cupones");

    const response = await authRequest.get("/api/coupon");
    const body = await response.json();

    expect(response.ok()).toBeTruthy();
    expect(body.status).toBe("OK");

    const coupons = body.data;
    if (coupons.length > 0) {
      const sampleCoupon = coupons[0];

      // Validar campos obligatorios
      expect(sampleCoupon).toHaveProperty("_id");
      expect(sampleCoupon).toHaveProperty("group");
      expect(sampleCoupon).toHaveProperty("code");
      expect(sampleCoupon).toHaveProperty("date_created");

      logger.info("✅ Estructura de datos validada");
    } else {
      logger.info("⚠️ No hay cupones para validar estructura");
    }
  });

  test("TC-004: GET /api/coupon - Test de paginación", async ({
    authRequest,
  }) => {
    logger.info("🧪 Test: Validar paginación de cupones");

    const responsePage1 = await authRequest.get("/api/coupon?page=1&limit=5");
    const responsePage2 = await authRequest.get("/api/coupon?page=2&limit=5");

    const body1 = await responsePage1.json();
    const body2 = await responsePage2.json();

    expect(responsePage1.ok()).toBeTruthy();
    expect(responsePage2.ok()).toBeTruthy();
    expect(body1.status).toBe("OK");
    expect(body2.status).toBe("OK");

    logger.info("✅ Paginación validada");
  });

  test("TC-005: GET /api/coupon - Test performance básico", async ({
    authRequest,
  }) => {
    logger.info("🧪 Test: Performance básico");

    const startTime = Date.now();
    const response = await authRequest.get("/api/coupon");
    const endTime = Date.now();

    const responseTime = endTime - startTime;

    expect(response.ok()).toBeTruthy();
    expect(responseTime).toBeLessThan(5000); // Menos de 5 segundos

    logger.info(`⏱️ Tiempo de respuesta: ${responseTime}ms`);
    logger.info("✅ Performance básico validado");
  });

  // ================== TESTS POST ==================

  test("TC-006: POST /api/coupon - Crear cupón no reutilizable (is_reusable: false)", async ({
    authRequest,
    coupon,
  }) => {
    logger.info("🧪 Test: Crear cupón no reutilizable");

    const groupId = coupon.group;
    const timestamp = Date.now();

    const couponData = {
      group: groupId,
      name: "unico",
      is_reusable: "false",
      custom_code: `qa-single-${timestamp}`,
      discount_type: "percent",
      max_use: "1",
      customer_max_use: "1",
      detail: "QA Test - Single Use Coupon",
      quantity: "1",
      percent: "10",
      payment_required: "false",
    };

    logger.info(`🎯 Creando cupón con Group ID: ${groupId}`);

    const response = await authRequest.post("/api/coupon", {
      multipart: couponData,
    });
    const body = await response.json();

    logger.info(
      `📡 Respuesta - Status: ${response.status()}, Data Status: ${body.status}`
    );

    expect(response.ok()).toBeTruthy();
    expect(body.status).toBe("OK");
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);

    const createdCoupon = body.data[0];
    expect(createdCoupon).toHaveProperty("code");
    expect(createdCoupon).toHaveProperty("_id");

    generatedCouponCodes.push(createdCoupon.code);
    generatedCouponIds.push(createdCoupon._id);

    logger.info(
      `✅ Cupón no reutilizable creado: ${createdCoupon.code} (ID: ${createdCoupon._id})`
    );

    // 🧹 Limpieza: eliminar cupón creado por este test
    try {
      logger.info(`🗑️ Eliminando cupón creado en TC-006: ${createdCoupon._id}`);
      const delResp = await authRequest.delete(
        `/api/coupon/${createdCoupon._id}`
      );
      const delStatus = delResp.status();
      const delText = await delResp.text();
      logger.info(`DELETE TC-006 -> status=${delStatus} body=${delText}`);
    } catch (e) {
      logger.info(
        `⚠️ No se pudo eliminar cupón TC-006 ${createdCoupon._id}: ${e}`
      );
    }
  });

  test("TC-007: POST /api/coupon - Crear cupón reutilizable con código personalizado", async ({
    authRequest,
    coupon,
  }) => {
    logger.info("🧪 Test: Crear cupón reutilizable con código personalizado");

    const groupId = coupon.group;
    const timestamp = Date.now().toString().slice(-6);
    const customCode = `QA-REUSE-${timestamp}`;

    const couponData = {
      group: groupId,
      name: "unico",
      is_reusable: "true",
      custom_code: customCode,
      discount_type: "percent",
      max_use: "10",
      customer_max_use: "3",
      detail: "QA Test - Reusable Custom Coupon",
      quantity: "1",
      percent: "15",
      payment_required: "false",
    };

    logger.info(`🎯 Creando cupón reutilizable: ${customCode}`);

    const response = await authRequest.post("/api/coupon", {
      multipart: couponData,
    });
    const body = await response.json();

    expect(response.ok()).toBeTruthy();
    expect(body.status).toBe("OK");
    expect(Array.isArray(body.data)).toBe(true);

    const createdCoupon = body.data[0];
    expect(createdCoupon.code).toBe(customCode);

    generatedCouponCodes.push(createdCoupon.code);
    generatedCouponIds.push(createdCoupon._id);

    logger.info(
      `✅ Cupón reutilizable creado: ${createdCoupon.code} (ID: ${createdCoupon._id})`
    );

    // 🧹 Limpieza: eliminar cupón creado por este test
    try {
      logger.info(`🗑️ Eliminando cupón creado en TC-007: ${createdCoupon._id}`);
      const delResp = await authRequest.delete(
        `/api/coupon/${createdCoupon._id}`
      );
      const delStatus = delResp.status();
      const delText = await delResp.text();
      logger.info(`DELETE TC-007 -> status=${delStatus} body=${delText}`);
    } catch (e) {
      logger.info(
        `⚠️ No se pudo eliminar cupón TC-007 ${createdCoupon._id}: ${e}`
      );
    }
  });

  test("TC-008: POST /api/coupon - Error al crear cupón con código duplicado", async ({
    authRequest,
    coupon,
  }) => {
    logger.info("🧪 Test: Error al crear cupón con código duplicado");

    // Verificar que el groupId del cupón exista; si no, usar uno válido de la API
    let groupId = coupon.group;
    let groupIsValid = false;
    if (groupId) {
      const checkGroupResp = await authRequest.get(
        `/api/coupon-group/${groupId}`
      );
      groupIsValid = checkGroupResp.ok();
    }
    if (!groupIsValid) {
      const groupsResp = await authRequest.get("/api/coupon-group");
      const groupsBody = await groupsResp.json();
      if (groupsResp.ok() && groupsBody?.data?.length > 0) {
        groupId = groupsBody.data[0]._id;
        logger.info(
          `⚠️ cupón.group inválido/indefinido. Usando fallback groupId: ${groupId}`
        );
      } else {
        throw new Error(
          "No hay grupos de cupones disponibles para validar duplicado"
        );
      }
    }

    // Intentar crear un cupón con el mismo código del fixture
    const duplicateCouponData = {
      group: groupId,
      name: "unico",
      is_reusable: "true",
      custom_code: coupon.custom_code, // Mismo código que el cupón del fixture
      discount_type: "percent",
      max_use: "5",
      customer_max_use: "2",
      detail: "QA Test - Duplicate Code Attempt",
      quantity: "1",
      percent: "5",
      payment_required: "false",
    };

    logger.info(
      `🎯 Intentando crear cupón con código duplicado: ${coupon.custom_code}`
    );

    const response = await authRequest.post("/api/coupon", {
      multipart: duplicateCouponData,
    });
    const body = await response.json();

    logger.info(
      `📡 Respuesta - Status: ${response.status()}, Data Status: ${body.status}`
    );

    // Esperamos un error 400 por código duplicado
    expect(response.status()).toBe(400);
    expect(body.status).toBe("ERROR");
    expect(body.data).toBe("COUPON_CODE_ALREADY_EXISTS");

    logger.info(`✅ Error esperado al intentar duplicar código: ${body.data}`);
  });

  test("TC-009: POST /api/coupon - Error con datos inválidos", async ({
    authRequest,
  }) => {
    logger.info("🧪 Test: Error con datos inválidos");

    const invalidCouponData = {
      group: "", // Group ID vacío
      name: "",
      is_reusable: "maybe", // Valor inválido
      custom_code: "INVALID CODE!", // Código con espacios
      discount_type: "invalid_type",
      max_use: "-1", // Valor negativo
      customer_max_use: "0",
      detail: "",
      quantity: "0",
      percent: "not_a_number",
      payment_required: "not_boolean",
    };

    logger.info("🎯 Enviando datos inválidos para validar manejo de errores");

    const response = await authRequest.post("/api/coupon", {
      multipart: invalidCouponData,
    });
    const body = await response.json();

    logger.info(
      `📡 Respuesta - Status: ${response.status()}, Data Status: ${body.status}`
    );

    // La API debe devolver error
    expect([400, 500]).toContain(response.status());
    expect(body.status).toBe("ERROR");

    logger.info(
      `✅ Error esperado con datos inválidos (${response.status()}): ${
        body.data || "Bad Request"
      }`
    );
  });

  // ================== TESTS INDIVIDUALES ==================

  test("TC-010: GET /api/coupon/{coupon_id} - Obtener cupón por ID", async ({
    authRequest,
    coupon,
  }) => {
    logger.info("🧪 Test: Obtener cupón por ID");

    const couponId = coupon._id;
    logger.info(`🎯 Obteniendo cupón con ID: ${couponId}`);

    const response = await authRequest.get(`/api/coupon/${couponId}`);
    const body = await response.json();

    expect(response.ok()).toBeTruthy();
    expect(body.status).toBe("OK");
    expect(body.data).toBeDefined();
    expect(body.data._id).toBe(couponId);

    // Validar estructura completa del cupón
    const retrievedCoupon = body.data;
    expect(retrievedCoupon).toHaveProperty("code");
    expect(retrievedCoupon).toHaveProperty("group");
    expect(retrievedCoupon).toHaveProperty("date_created");

    logger.info(`✅ Cupón obtenido: ${retrievedCoupon.code}`);
  });

  test("TC-011: GET /api/coupon/{coupon_code}/search - Buscar cupón por código", async ({
    authRequest,
    coupon,
  }) => {
    logger.info("🧪 Test: Buscar cupón por código");

    const couponCode = coupon.code || coupon.custom_code;
    logger.info(`🎯 Buscando cupón con código: ${couponCode}`);

    const response = await authRequest.get(`/api/coupon/${couponCode}/search`);
    const body = await response.json();

    expect(response.ok()).toBeTruthy();
    expect(body.status).toBe("OK");
    expect(body.data).toBeDefined();

    logger.info(`✅ Cupón encontrado por código: ${couponCode}`);
  });

  test("TC-012: DELETE /api/coupon/{coupon_id} - Crear y eliminar cupón temporal", async ({
    authRequest,
    coupon,
  }) => {
    logger.info("🧪 Test: Crear cupón temporal y eliminarlo");

    const groupId = coupon.group;
    const timestamp = Date.now().toString().slice(-6);
    const tempCode = `QA-DELETE-${timestamp}`;

    // Crear cupón temporal
    const tempCouponData = {
      group: groupId,
      name: "unico",
      is_reusable: "false",
      custom_code: tempCode,
      discount_type: "percent",
      max_use: "1",
      customer_max_use: "1",
      detail: "QA Test - Cupón para eliminar",
      quantity: "1",
      percent: "5",
      payment_required: "false",
    };

    logger.info(`🎯 Creando cupón temporal para eliminar: ${tempCode}`);

    const createResponse = await authRequest.post("/api/coupon", {
      multipart: tempCouponData,
    });
    const createBody = await createResponse.json();

    expect(createResponse.ok()).toBeTruthy();
    expect(createBody.status).toBe("OK");

    const createdTempCoupon = createBody.data[0];
    const tempCouponId = createdTempCoupon._id;

    logger.info(
      `✅ Cupón temporal creado: ${createdTempCoupon.code} (ID: ${tempCouponId})`
    );

    // Eliminar el cupón
    logger.info(`🗑️ Eliminando cupón con ID: ${tempCouponId}`);

    const deleteResponse = await authRequest.delete(
      `/api/coupon/${tempCouponId}`
    );
    const deleteBody = await deleteResponse.json();

    expect(deleteResponse.ok()).toBeTruthy();
    expect(deleteBody.status).toBe("OK");

    logger.info(`✅ Cupón eliminado exitosamente: ${tempCode}`);

    // Verificar que el cupón ya no existe
    const verifyResponse = await authRequest.get(`/api/coupon/${tempCouponId}`);
    const verifyBody = await verifyResponse.json();

    expect(verifyResponse.ok()).toBeTruthy();
    expect(verifyBody.status).toBe("ERROR");
    expect(verifyBody.data).toBe(null);

    logger.info(
      "✅ Verificación exitosa: Cupón no encontrado después de eliminar"
    );
  });

  test("TC-013: GET /api/coupon/{coupon_id} - Error para cupón inexistente", async ({
    authRequest,
  }) => {
    logger.info("🧪 Test: Error para cupón inexistente");

    const nonExistentId = "000000000000000000000000";
    logger.info(`🎯 Buscando cupón inexistente con ID: ${nonExistentId}`);

    const response = await authRequest.get(`/api/coupon/${nonExistentId}`);
    const body = await response.json();

    expect(response.ok()).toBeTruthy();
    expect(body.status).toBe("ERROR");
    expect(body.data).toBe(null);

    logger.info("✅ Error esperado para cupón inexistente");
  });
});
