const assert = require('node:assert/strict');
const { browser, $ } = require('@wdio/globals');

describe('TC-WORKFLOW-001 documented workflow', () => {
  it('completes the workflow and shows the expected state', async () => {
    await browser.url('/replace-with-route');

    await $('[name="replace-with-field"]').setValue('replace-with-value');
    await $('[data-testid="replace-with-action"]').click();

    assert.match(await browser.getUrl(), /replace-with-expected-route/);
    assert.match(await $('h1').getText(), /replace with expected state/i);
  });
});
