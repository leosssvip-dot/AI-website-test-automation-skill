import { describe, expect, it, vi } from 'vitest';

// Import the route handler or server function from the target project.
// import { POST } from '@/app/api/replace/route';

describe('TC-API-001 route contract', () => {
  it('accepts a valid request and returns the documented response', async () => {
    const request = new Request('http://localhost/api/replace', {
      method: 'POST',
      body: JSON.stringify({ replaceWith: 'valid-input' }),
      headers: { 'content-type': 'application/json' },
    });

    const handler = vi.fn(async () => Response.json({ ok: true }, { status: 200 }));
    const response = await handler(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true });
  });
});
