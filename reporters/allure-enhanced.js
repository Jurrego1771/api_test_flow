/**
 * reporters/allure-enhanced.js
 *
 * Extends AllureReporter to pick up allure.label.* annotations pushed via
 * testInfo.annotations in fixtures. allure-playwright only reads
 * TestCase.annotations (static, set before test runs) in onTestBegin; it
 * ignores TestResult.annotations (runtime, from testInfo.annotations).
 * This reporter bridges that gap by calling updateTest() with the runtime
 * annotations just before super.onTestEnd() writes the test to disk.
 */

const { AllureReporter } = require("allure-playwright");
const { getMetadataLabel } = require("allure-js-commons/sdk");

class AllureEnhancedReporter extends AllureReporter {
  async onTestEnd(test, result) {
    const testUuid = this.allureResultsUuids?.get(test.id);

    if (testUuid && result.annotations?.length > 0) {
      const extraLabels = [];

      for (const annotation of result.annotations) {
        const label = getMetadataLabel(annotation.type, annotation.description);
        if (label) extraLabels.push(label);
      }

      if (extraLabels.length > 0) {
        this.allureRuntime.updateTest(testUuid, (testResult) => {
          testResult.labels.push(...extraLabels);
        });
      }
    }

    await super.onTestEnd(test, result);
  }
}

module.exports = AllureEnhancedReporter;
