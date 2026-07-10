import assert from 'node:assert/strict';

const baseUrl = process.env.TEST_BASE_URL;
if (!baseUrl) throw new Error('TEST_BASE_URL is required for Selenium tests');

async function run() {
  const { Builder, By, until } = await import('selenium-webdriver');
  const driver = await new Builder().forBrowser('chrome').build();
  try {
    await driver.get(new URL('/replace-with-route', baseUrl).href);
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
