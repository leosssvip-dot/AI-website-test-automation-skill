const assert = require('node:assert/strict');
const { Builder, By, until } = require('selenium-webdriver');

async function run() {
  const driver = await new Builder().forBrowser('chrome').build();
  try {
    await driver.get(process.env.TEST_BASE_URL || 'http://localhost:3000/replace-with-route');
    await driver.findElement(By.css('[name="replace-with-field"]')).sendKeys('replace-with-value');
    await driver.findElement(By.css('[data-testid="replace-with-action"]')).click();
    await driver.wait(until.urlMatches(/replace-with-expected-route/), 5000);

    const heading = await driver.findElement(By.css('h1')).getText();
    assert.match(heading, /replace with expected state/i);
  } finally {
    await driver.quit();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
