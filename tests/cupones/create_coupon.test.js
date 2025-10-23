const { test } = require("../../fixtures/coupon.fixture");
const { expect } = require("@playwright/test");

test.describe("Validaciones de cupones", () => {
  test("Crear y filtrar cupón por código", async ({ authRequest, coupon }) => {
    // Filtrar por código del cupón recién creado
    const response = await authRequest.get(
      `/api/coupon?custom_code=${coupon.custom_code}`
    );
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    const codes = body.data.map((c) => c.custom_code);

    expect(codes).toContain(coupon.custom_code);
  });

  test("No debe permitir crear cupón duplicado con reusable=true", async ({
    authRequest,
    coupon,
  }) => {
    // Intentar crear un cupón con el mismo código
    const duplicateCoupon = {
      ...coupon,
      reusable: true,
    };

    const response = await authRequest.post("/api/coupon", {
      data: duplicateCoupon,
    });

    // 🔍 Mostrar la respuesta para depurar
    console.log("Respuesta API duplicado:", response.status());
    console.log(await response.text()); // <-- muestra el cuerpo completo, incluso si no es JSON

    // Validar la respuesta esperada
    expect(response.status()).toBe(400); // o el código real que devuelva el API
    const body = await response.json();

    expect(body.status).toBe("ERROR");
    expect(body.data).toBe("COUPON_CODE_ALREADY_EXISTS");
  });
});
