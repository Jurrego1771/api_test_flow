# Access Restrictions - Comprehensive Test Plan
**Document ID:** AR-TEST-001  
**Version:** 1.0  
**Date:** 2026-03-05  
**Author:** QA Senior Team  

---

## **TEST PLAN OVERVIEW**

### **1.1 Test Scope**
- **Module:** Access Restrictions (Legacy & Advanced)
- **Components:** Frontend UI, Backend API, Middleware, Database
- **Integration Points:** CDN, DRM, Authentication, Content Delivery

### **1.2 Test Objectives**
- Verify functional correctness of restriction rules
- Validate security bypass resistance
- Ensure performance under load
- Confirm cross-platform compatibility
- Test migration between Legacy and Advanced systems

### **1.3 Test Environment**
- **Development:** `dev.mdstrm.com`
- **Staging:** `staging.mdstrm.com`  
- **Production:** `platform.mediastre.am`

---

## **AR-FUNC-001: FUNCTIONAL TESTING**

### **AR-FUNC-001.1: Legacy View Tests**

| **Test Case ID** | **Description** | **Preconditions** | **Test Steps** | **Expected Results** | **Priority** |
|------------------|----------------|-------------------|----------------|---------------------|-------------|
| AR-FUNC-001.1.1 | **Geo Restriction - Allow Countries** | User logged in, Legacy view loaded | 1. Select "Allow" for geo restriction<br>2. Select US, CA, MX<br>3. Save changes | Settings saved successfully<br>Countries appear selected | High |
| AR-FUNC-001.1.2 | **Geo Restriction - Deny Countries** | User logged in, Legacy view loaded | 1. Select "Deny" for geo restriction<br>2. Select CN, RU<br>3. Save changes | Settings saved successfully<br>Countries blocked in tests | High |
| AR-FUNC-001.1.3 | **IP Restriction - Single IP** | User logged in, Legacy view loaded | 1. Select "Allow" for IP restriction<br>2. Add IP: 192.168.1.100<br>3. Save changes | IP added and saved successfully | Medium |
| AR-FUNC-001.1.4 | **IP Restriction - Range CIDR** | User logged in, Legacy view loaded | 1. Select "Allow" for IP restriction<br>2. Add range: 192.168.1.0/24<br>3. Save changes | Range added and validated | Medium |
| AR-FUNC-001.1.5 | **User Agent Regex Pattern** | User logged in, Legacy view loaded | 1. Enable "Use regex"<br>2. Add pattern: ".*Chrome.*"<br>3. Save changes | Regex validated and saved | Medium |
| AR-FUNC-001.1.6 | **Device Restrictions - Mobile Block** | User logged in, Legacy view loaded | 1. Check "Deny mobile devices"<br>2. Save changes | Mobile devices blocked | High |
| AR-FUNC-001.1.7 | **DRM Settings - Compatible Only** | DRM module enabled | 1. Select "Enable for compatible devices only"<br>2. Save changes | DRM applied to compatible devices | High |

### **AR-FUNC-001.2: Advanced View Tests**

| **Test Case ID** | **Description** | **Preconditions** | **Test Steps** | **Expected Results** | **Priority** |
|------------------|----------------|-------------------|----------------|---------------------|-------------|
| AR-FUNC-001.2.1 | **Create New Access Restriction** | Advanced view loaded | 1. Click "New Access restriction"<br>2. Enter name: "Test Restriction"<br>3. Add geo rule<br>4. Save | New restriction created with ID | High |
| AR-FUNC-001.2.2 | **Rule Ordering - Move Up/Down** | Multiple rules exist | 1. Select rule #2<br>2. Click "Move Up"<br>3. Verify order change | Rule moved to position #1 | Medium |
| AR-FUNC-001.2.3 | **Rule Testing - Geo Match** | Test modal available | 1. Open test modal<br>2. Select country: US<br>3. Click "Run test" | Result shows "Allowed/Denied by X rule" | High |
| AR-FUNC-001.2.4 | **Rule Testing - IP Range** | IP rule configured | 1. Open test modal<br>2. Enter IP: 192.168.1.50<br>3. Run test | Correct evaluation based on range | Medium |
| AR-FUNC-001.2.5 | **Category Application** | Categories exist | 1. Select categories: Sports, News<br>2. Enable sub-categories<br>3. Save | Rules applied to selected categories | High |
| AR-FUNC-001.2.6 | **Delete Access Restriction** | Non-default restriction | 1. Click delete button<br>2. Confirm deletion<br>3. Verify removal | Restriction deleted successfully | Medium |
| AR-FUNC-001.2.7 | **Client-Side Validation Toggle** | Device rule exists | 1. Edit device rule<br>2. Enable "Use client side blocking"<br>3. Save | Client validation flag set | Low |

---

## **AR-SEC-002: SECURITY TESTING**

### **AR-SEC-002.1: Bypass Prevention Tests**

| **Test Case ID** | **Attack Vector** | **Test Scenario** | **Expected Outcome** | **Severity** |
|------------------|-------------------|-------------------|----------------------|--------------|
| AR-SEC-002.1.1 | **IP Spoofing** | Send X-Forwarded-For: 8.8.8.8 with blocked IP | Request blocked based on real IP | Critical |
| AR-SEC-002.1.2 | **User-Agent Forgery** | Modify User-Agent to bypass device rules | Correct device detection applied | Critical |
| AR-SEC-002.1.3 | **Referer Spoofing** | Set Referer to allowed domain from blocked source | Referer validation bypass prevented | High |
| AR-SEC-002.1.4 | **VPN Detection** | Access from VPN IP in blocked country | Geographic restriction enforced | High |
| AR-SEC-002.1.5 | **Header Injection** | Inject malicious headers | Headers sanitized, rules unaffected | Medium |

### **AR-SEC-002.2: Edge Case Security**

| **Test Case ID** | **Scenario** | **Test Data** | **Expected Result** | **Risk Level** |
|------------------|--------------|---------------|---------------------|----------------|
| AR-SEC-002.2.1 | **Contradictory Rules** | Allow geo:US + Deny geo:US | First matching rule applies | Medium |
| AR-SEC-002.2.2 | **Regex Injection** | Pattern: ".*[a-z]+$(sleep 10)" | Regex validation fails | High |
| AR-SEC-002.2.3 | **Empty Rule Sets** | No rules configured | Default behavior applied | Low |
| AR-SEC-002.2.4 | **Unicode in Rules** | Country: "🇺🇸" (emoji) | Invalid input rejected | Low |
| AR-SEC-002.2.5 | **Rule Limit Bypass** | Create 1000+ rules | System handles gracefully | Medium |

---

## **AR-INTEG-003: INTEGRATION TESTING**

### **AR-INTEG-003.1: API Integration Tests**

| **Test Case ID** | **Endpoint** | **Method** | **Test Data** | **Expected Response** | **Priority** |
|------------------|--------------|------------|---------------|----------------------|--------------|
| AR-INTEG-003.1.1 | `/api/settings/advanced-access-restrictions` | GET | N/A | 200 + JSON array | High |
| AR-INTEG-003.1.2 | `/api/settings/advanced-access-restrictions` | POST | Valid restriction data | 201 + resource ID | High |
| AR-INTEG-003.1.3 | `/api/settings/advanced-access-restrictions/{id}` | PUT | Updated restriction | 200 + updated data | High |
| AR-INTEG-003.1.4 | `/api/settings/advanced-access-restrictions/{id}` | DELETE | Valid ID | 200 + success message | Medium |
| AR-INTEG-003.1.5 | `/api/account/access-restrictions` | POST | Legacy form data | 200 + success | Medium |

### **AR-INTEG-003.2: Middleware Integration Tests**

| **Test Case ID** | **Middleware** | **Request Headers** | **Expected Action** | **Priority** |
|------------------|----------------|-------------------|---------------------|--------------|
| AR-INTEG-003.2.1 | **check-access-restrictions** | X-Forwarded-For: blocked IP | Return 403 Forbidden | High |
| AR-INTEG-003.2.2 | **media-access** | User-Agent: blocked device | Apply device rule | High |
| AR-INTEG-003.2.3 | **live-access** | Referer: unauthorized domain | Block live stream | High |
| AR-INTEG-003.2.4 | **DRM Integration** | DRM-capable device | Apply DRM headers | Medium |

---

## **AR-PERF-004: PERFORMANCE TESTING**

### **AR-PERF-004.1: Load Testing**

| **Test Case ID** | **Scenario** | **Concurrent Users** | **Requests/sec** | **Expected Response Time** | **Priority** |
|------------------|--------------|---------------------|------------------|-----------------------------|--------------|
| AR-PERF-004.1.1 | **Rule Evaluation** | 100 | 500 | < 100ms | High |
| AR-PERF-004.1.2 | **Cache Performance** | 500 | 2000 | < 50ms (cache hit) | High |
| AR-PERF-004.1.3 | **Database Queries** | 50 | 100 | < 200ms | Medium |
| AR-PERF-004.1.4 | **API Endpoints** | 200 | 1000 | < 150ms | High |

### **AR-PERF-004.2: Memory Testing**

| **Test Case ID** | **Test Duration** | **Memory Usage** | **Expected Behavior** | **Priority** |
|------------------|-------------------|------------------|-----------------------|--------------|
| AR-PERF-004.2.1 | **1 Hour Load Test** | Monitor heap usage | No memory leaks | High |
| AR-PERF-004.2.2 | **Cache Efficiency** | Measure cache hit ratio | > 90% hit rate | High |
| AR-PERF-004.2.3 | **Garbage Collection** | Force GC cycles | Memory returns to baseline | Medium |

---

## **AR-COMPAT-005: COMPATIBILITY TESTING**

### **AR-COMPAT-005.1: Browser Compatibility**

| **Test Case ID** | **Browser** | **Version** | **OS** | **Expected Behavior** | **Priority** |
|------------------|-------------|------------|---------|-----------------------|--------------|
| AR-COMPAT-005.1.1 | Chrome | 120+ | Windows 10 | Full functionality | High |
| AR-COMPAT-005.1.2 | Firefox | 115+ | macOS 13 | Full functionality | High |
| AR-COMPAT-005.1.3 | Safari | 16+ | iOS 16 | Full functionality | High |
| AR-COMPAT-005.1.4 | Edge | 120+ | Windows 11 | Full functionality | Medium |
| AR-COMPAT-005.1.5 | Chrome Mobile | 120+ | Android 13 | Mobile-optimized UI | High |

### **AR-COMPAT-005.2: Device Compatibility**

| **Test Case ID** | **Device Type** | **User-Agent Sample** | **Expected Detection** | **Priority** |
|------------------|-----------------|-----------------------|------------------------|--------------|
| AR-COMPAT-005.2.1 | **iPhone** | "Mozilla/5.0 (iPhone...)" | Mobile + iOS | High |
| AR-COMPAT-005.2.2 | **Android Phone** | "Mozilla/5.0 (Android...)" | Mobile + Android | High |
| AR-COMPAT-005.2.3 | **Smart TV** | "Mozilla/5.0 (Web0S...)" | TV + WebOS | Medium |
| AR-COMPAT-005.2.4 | **Desktop** | "Mozilla/5.0 (Windows...)" | Desktop + Windows | High |
| AR-COMPAT-005.2.5 | **Tablet** | "Mozilla/5.0 (iPad...)" | Mobile + iPadOS | Medium |

---

## **AR-REGRESS-006: REGRESSION TESTING**

### **AR-REGRESS-006.1: Legacy to Advanced Migration**

| **Test Case ID** | **Migration Scenario** | **Source Data** | **Expected Result** | **Priority** |
|------------------|------------------------|-----------------|---------------------|--------------|
| AR-REGRESS-006.1.1 | **Geo Rules Migration** | Legacy: Allow US,CA | Advanced: Geo rule with US,CA | High |
| AR-REGRESS-006.1.2 | **Device Rules Migration** | Legacy: Deny mobile | Advanced: Device rule exclusive=true | High |
| AR-REGRESS-006.1.3 | **IP Rules Migration** | Legacy: IP ranges | Advanced: IP rule with same ranges | High |
| AR-REGRESS-006.1.4 | **DRM Settings Migration** | Legacy: DRM enabled | Advanced: DRM object preserved | High |

### **AR-REGRESS-006.2: Backward Compatibility**

| **Test Case ID** | **API Version** | **Request Format** | **Expected Response** | **Priority** |
|------------------|------------------|-------------------|-----------------------|--------------|
| AR-REGRESS-006.2.1 | **v1 API** | Legacy format | Processed correctly | High |
| AR-REGRESS-006.2.2 | **v2 API** | Advanced format | Processed correctly | High |
| AR-REGRESS-006.2.3 | **Mixed Format** | Both formats | No conflicts | Medium |

---

## **AR-AUTO-007: AUTOMATED TESTING**

### **AR-AUTO-007.1: Unit Tests**

```javascript
// File: test/unit/access-rule-item.test.js
describe('AccessRuleItem Validation', () => {
  describe('AR-AUTO-007.1.1: Geo Rule Validation', () => {
    test('should allow valid country codes', () => {
      const rule = { context: 'geo', rules: ['US', 'CA', 'MX'] };
      expect(validateGeoRule(rule, 'US')).toBe(true);
      expect(validateGeoRule(rule, 'BR')).toBe(false);
    });
  });

  describe('AR-AUTO-007.1.2: IP Range Validation', () => {
    test('should validate CIDR notation', () => {
      const rule = { context: 'ip', rules: ['192.168.1.0/24'] };
      expect(validateIPRule(rule, '192.168.1.100')).toBe(true);
      expect(validateIPRule(rule, '192.168.2.100')).toBe(false);
    });
  });

  describe('AR-AUTO-007.1.3: User-Agent Regex', () => {
    test('should match regex patterns', () => {
      const rule = { context: 'user-agent', regex: '.*Chrome.*', allow_regex: true };
      expect(validateUserAgentRule(rule, 'Mozilla/5.0 Chrome/120')).toBe(true);
      expect(validateUserAgentRule(rule, 'Mozilla/5.0 Firefox/115')).toBe(false);
    });
  });
});
```

### **AR-AUTO-007.2: Integration Tests**

```javascript
// File: test/integration/access-restrictions.test.js
describe('Access Restrictions Integration', () => {
  describe('AR-AUTO-007.2.1: Middleware Integration', () => {
    test('should block access based on IP rule', async () => {
      const response = await request(app)
        .get('/media/123')
        .set('X-Forwarded-For', '192.168.1.999') // Blocked IP
        .expect(403);
      
      expect(response.body.status).toBe('ERROR');
    });
  });

  describe('AR-AUTO-007.2.2: API Endpoints', () => {
    test('should create new access restriction', async () => {
      const restrictionData = {
        name: 'Test Restriction',
        access_rules: [{
          context: 'geo',
          access: true,
          rules: ['US', 'CA']
        }]
      };

      const response = await request(app)
        .post('/api/settings/advanced-access-restrictions')
        .send(restrictionData)
        .expect(201);

      expect(response.body.data).toHaveProperty('_id');
    });
  });
});
```

### **AR-AUTO-007.3: E2E Tests**

```javascript
// File: test/e2e/access-restrictions.e2e.js
describe('Access Restrictions E2E', () => {
  describe('AR-AUTO-007.3.1: Complete Workflow', () => {
    test('should create and apply restriction successfully', async () => {
      // Login
      await page.goto('/login');
      await page.fill('[name="username"]', 'testuser');
      await page.fill('[name="password"]', 'password');
      await page.click('[type="submit"]');

      // Navigate to access restrictions
      await page.goto('/settings/access-restrictions');

      // Create new restriction
      await page.click('[href="/settings/access-restrictions/new"]');
      await page.fill('[name="name"]', 'E2E Test Restriction');

      // Add geo rule
      await page.click('[sm="add-rule"]');
      await page.selectOption('[name="type"]', 'geo');
      await page.selectOption('[name="geo-restriction-countries"]', ['US', 'CA']);
      await page.click('[sm="add-rule"]');

      // Save
      await page.click('[sm="save"]');
      await expect(page.locator('.alert-success')).toBeVisible();

      // Test the restriction
      await page.click('[href="#testModal"]');
      await page.selectOption('[name="geo-test-countries"]', 'US');
      await page.click('[sm="test-rules"]');
      
      const testResult = await page.locator('[sm="test-alert"]').textContent();
      expect(testResult).toContain('Allowed');
    });
  });
});
```

---

## **AR-STRESS-008: STRESS TESTING**

### **AR-STRESS-008.1: Volume Testing**

| **Test Case ID** | **Scenario** | **Volume** | **Duration** | **Success Criteria** | **Priority** |
|------------------|--------------|------------|--------------|----------------------|--------------|
| AR-STRESS-008.1.1 | **Maximum Rules** | 10,000 rules | 1 hour | System remains responsive | High |
| AR-STRESS-008.1.2 | **Maximum Restrictions** | 100 restrictions/account | 30 min | No performance degradation | High |
| AR-STRESS-008.1.3 | **Concurrent Evaluations** | 1000 simultaneous | 15 min | All requests processed | High |

### **AR-STRESS-008.2: Resource Testing**

| **Test Case ID** | **Resource** | **Limit Test** | **Expected Behavior** | **Priority** |
|------------------|--------------|----------------|-----------------------|--------------|
| AR-STRESS-008.2.1 | **Memory Usage** | 80% RAM utilization | Graceful degradation | High |
| AR-STRESS-008.2.2 | **CPU Usage** | 90% CPU utilization | Request queuing | High |
| AR-STRESS-008.2.3 | **Database Connections** | Max pool reached | Connection reuse | Medium |

---

## **TEST EXECUTION PLAN**

### **Phase 1: Foundation Testing (Week 1)**
- AR-FUNC-001: Functional tests
- AR-AUTO-007.1: Unit tests
- Basic API integration

### **Phase 2: Security & Integration (Week 2)**
- AR-SEC-002: Security tests
- AR-INTEG-003: Integration tests
- AR-AUTO-007.2: Integration tests

### **Phase 3: Performance & Compatibility (Week 3)**
- AR-PERF-004: Performance tests
- AR-COMPAT-005: Compatibility tests
- AR-AUTO-007.3: E2E tests

### **Phase 4: Stress & Regression (Week 4)**
- AR-STRESS-008: Stress tests
- AR-REGRESS-006: Regression tests
- Final validation

---

## **SUCCESS METRICS**

| **Metric** | **Target** | **Measurement** |
|------------|------------|-----------------|
| **Test Coverage** | > 95% | Code coverage analysis |
| **Rule Accuracy** | > 99.9% | Correct decisions vs total |
| **Response Time** | < 100ms | Average rule evaluation |
| **Security Bypass** | 0% | Successful bypass attempts |
| **Performance Degradation** | < 5% | Load vs baseline |
| **Bug Severity** | Zero critical | Production bugs |

---

## **TEST TOOLS & ENVIRONMENT**

### **Testing Tools**
- **Unit Tests**: Jest + Supertest
- **E2E Tests**: Playwright
- **Load Testing**: Artillery/K6
- **Security Testing**: OWASP ZAP
- **API Testing**: Postman/Newman

### **Test Data Management**
- **Mock Data**: Faker.js for test generation
- **Database**: Dedicated test databases
- **CI/CD**: GitHub Actions integration
- **Reporting**: Allure + TestRail

---

## **RISKS & MITIGATIONS**

| **Risk** | **Impact** | **Probability** | **Mitigation** |
|----------|------------|----------------|----------------|
| **Rule Logic Complexity** | High | Medium | Comprehensive rule testing matrix |
| **Performance Under Load** | High | Low | Load testing and caching optimization |
| **Security Bypasses** | Critical | Low | Security testing and code review |
| **Migration Issues** | Medium | Medium | Automated migration testing |
| **Browser Compatibility** | Medium | Low | Cross-browser testing suite |

---

**Document Control**
- **Owner:** QA Senior Team
- **Reviewers:** Development Team, Product Owner
- **Approval:** QA Manager
- **Next Review:** 2026-04-05

**Change History**
| **Version** | **Date** | **Changes** | **Author** |
|------------|----------|-------------|------------|
| 1.0 | 2026-03-05 | Initial creation | QA Senior Team |
