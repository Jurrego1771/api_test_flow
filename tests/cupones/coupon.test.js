const { test } = require("../../fixtures/coupon.fixture");
const { expect } = require("@playwright/test");
const { ApiClient } = require("../../lib/apiClient");
const { ResourceCleaner } = require("../../utils/resourceCleaner");
const { listCouponResponseSchema, getCouponResponseSchema } = require("../../schemas/coupon.schema");

test.describe("Coupon API", () => {
  let apiClient;
  let cleaner;

  test.beforeEach(async ({ authRequest, baseURL }) => {
    apiClient = new ApiClient(authRequest, baseURL);
    cleaner = new ResourceCleaner(apiClient);
  });

  test.afterEach(async () => {
    await cleaner.clean();
  });

  // ================== GET ==================

  test("TC_CPN_001_GET_List_ReturnsOk", async ({ authRequest }) => {
    const response = await authRequest.get("/api/coupon");
    const body = await response.json();

    expect(response.ok()).toBeTruthy();
    expect(body.status).toBe("OK");
    expect(Array.isArray(body.data)).toBe(true);

    if (body.data.length > 0) {
      listCouponResponseSchema.parse(body);
    }
  });

  test("TC_CPN_002_GET_FilterByCustomCode", async ({ authRequest, coupon }) => {
    const response = await authRequest.get(`/api/coupon?custom_code=${coupon.custom_code}`);
    const body = await response.json();

    expect(response.ok()).toBeTruthy();
    expect(body.status).toBe("OK");
    expect(Array.isArray(body.data)).toBe(true);

    const codes = body.data.map((c) => c && (c.custom_code ?? c.code)).filter(Boolean);
    expect(codes).toContain(coupon.custom_code);
  });

  test("TC_CPN_003_GET_ValidateResponseStructure", async ({ authRequest }) => {
    const response = await authRequest.get("/api/coupon");
    const body = await response.json();

    expect(response.ok()).toBeTruthy();
    expect(body.status).toBe("OK");

    if (body.data.length > 0) {
      const sample = body.data[0];
      expect(sample).toHaveProperty("_id");
      expect(sample).toHaveProperty("group");
      expect(sample).toHaveProperty("code");
      expect(sample).toHaveProperty("date_created");
    }
  });

  test("TC_CPN_004_GET_Pagination", async ({ authRequest }) => {
    const [res1, res2] = await Promise.all([
      authRequest.get("/api/coupon?page=1&limit=5"),
      authRequest.get("/api/coupon?page=2&limit=5"),
    ]);
    const [body1, body2] = await Promise.all([res1.json(), res2.json()]);

    expect(res1.ok()).toBeTruthy();
    expect(res2.ok()).toBeTruthy();
    expect(body1.status).toBe("OK");
    expect(body2.status).toBe("OK");
    expect(Array.isArray(body1.data)).toBe(true);
    expect(Array.isArray(body2.data)).toBe(true);
  });

  test("TC_CPN_005_GET_ResponseTimeUnder5s", async ({ authRequest }) => {
    const start = Date.now();
    const response = await authRequest.get("/api/coupon");
    const elapsed = Date.now() - start;

    expect(response.ok()).toBeTruthy();
    expect(elapsed).toBeLessThan(5000);
  });

  // ================== POST ==================

  test("TC_CPN_006_POST_CreateCoupon_NonReusable", async ({ authRequest, coupon }) => {
    const response = await authRequest.post("/api/coupon", {
      multipart: {
        group: coupon.group,
        name: "unico",
        is_reusable: "false",
        custom_code: `qa-single-${Date.now()}`,
        discount_type: "percent",
        max_use: "1",
        customer_max_use: "1",
        detail: "QA Test - Single Use Coupon",
        quantity: "1",
        percent: "10",
        payment_required: "false",
      },
    });
    const body = await response.json();

    expect(response.ok()).toBeTruthy();
    expect(body.status).toBe("OK");
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);

    const created = body.data[0];
    expect(created).toHaveProperty("code");
    expect(created).toHaveProperty("_id");

    cleaner.register("coupon", created._id);
  });

  test("TC_CPN_007_POST_CreateCoupon_ReusableCustomCode", async ({ authRequest, coupon }) => {
    const customCode = `QA-REUSE-${Date.now().toString().slice(-6)}`;

    const response = await authRequest.post("/api/coupon", {
      multipart: {
        group: coupon.group,
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
      },
    });
    const body = await response.json();

    expect(response.ok()).toBeTruthy();
    expect(body.status).toBe("OK");
    expect(Array.isArray(body.data)).toBe(true);

    const created = body.data[0];
    expect(created.code).toBe(customCode);

    cleaner.register("coupon", created._id);
  });

  test("TC_CPN_008_POST_CreateCoupon_DuplicateCode_Returns400", async ({ authRequest, coupon }) => {
    const response = await authRequest.post("/api/coupon", {
      multipart: {
        group: coupon.group,
        name: "unico",
        is_reusable: "true",
        custom_code: coupon.custom_code,
        discount_type: "percent",
        max_use: "5",
        customer_max_use: "2",
        detail: "QA Test - Duplicate Code Attempt",
        quantity: "1",
        percent: "5",
        payment_required: "false",
      },
    });
    const body = await response.json();

    expect(response.status()).toBe(400);
    expect(body.status).toBe("ERROR");
    expect(body.data).toBe("COUPON_CODE_ALREADY_EXISTS");
  });

  test("TC_CPN_009_POST_CreateCoupon_InvalidData_ReturnsError", async ({ authRequest }) => {
    const response = await authRequest.post("/api/coupon", {
      multipart: {
        group: "",
        name: "",
        is_reusable: "maybe",
        custom_code: "INVALID CODE!",
        discount_type: "invalid_type",
        max_use: "-1",
        customer_max_use: "0",
        detail: "",
        quantity: "0",
        percent: "not_a_number",
        payment_required: "not_boolean",
      },
    });
    const body = await response.json();

    expect([400, 500]).toContain(response.status());
    expect(body.status).toBe("ERROR");
  });

  // ================== GET BY ID / SEARCH / DELETE ==================

  test("TC_CPN_010_GET_CouponById_Success", async ({ authRequest, coupon }) => {
    const response = await authRequest.get(`/api/coupon/${coupon._id}`);
    const body = await response.json();

    expect(response.ok()).toBeTruthy();
    expect(body.status).toBe("OK");
    expect(body.data).toBeDefined();
    expect(body.data._id).toBe(coupon._id);

    getCouponResponseSchema.parse(body);

    expect(body.data).toHaveProperty("code");
    expect(body.data).toHaveProperty("group");
    expect(body.data).toHaveProperty("date_created");
  });

  test("TC_CPN_011_GET_SearchCouponByCode", async ({ authRequest, coupon }) => {
    const code = coupon.code || coupon.custom_code;

    const response = await authRequest.get(`/api/coupon/${code}/search`);
    const body = await response.json();

    expect(response.ok()).toBeTruthy();
    expect(body.status).toBe("OK");
    expect(body.data).toBeDefined();
  });

  test("TC_CPN_012_POST_CreateAndDelete_Coupon", async ({ authRequest, coupon }) => {
    const tempCode = `QA-DELETE-${Date.now().toString().slice(-6)}`;

    const createResponse = await authRequest.post("/api/coupon", {
      multipart: {
        group: coupon.group,
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
      },
    });
    const createBody = await createResponse.json();

    expect(createResponse.ok()).toBeTruthy();
    expect(createBody.status).toBe("OK");

    const tempId = createBody.data[0]._id;

    const deleteResponse = await authRequest.delete(`/api/coupon/${tempId}`);
    const deleteBody = await deleteResponse.json();

    expect(deleteResponse.ok()).toBeTruthy();
    expect(deleteBody.status).toBe("OK");

    // Verify deleted
    const verifyResponse = await authRequest.get(`/api/coupon/${tempId}`);
    const verifyBody = await verifyResponse.json();

    expect(verifyBody.status).toBe("ERROR");
    expect(verifyBody.data).toBe(null);
  });

  test("TC_CPN_013_GET_CouponById_NotFound", async ({ authRequest }) => {
    const response = await authRequest.get("/api/coupon/000000000000000000000000");
    const body = await response.json();

    expect(response.ok()).toBeTruthy();
    expect(body.status).toBe("ERROR");
    expect(body.data).toBe(null);
  });
});
