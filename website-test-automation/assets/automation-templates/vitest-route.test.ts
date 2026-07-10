import { describe, expect, it } from 'vitest';

// Replace this path with the target project's real route module; keep the import executable.
import { POST } from '@/app/api/replace/route';

describe('TC-API-001 route contract', () => {
  it('accepts a valid request and returns the documented response', async () => {
    const request = new Request('http://localhost/api/replace', {
      method: 'POST',
      body: JSON.stringify({ replaceWith: 'valid-input' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true });
  });
});
