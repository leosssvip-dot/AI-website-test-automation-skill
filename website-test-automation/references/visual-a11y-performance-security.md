# Visual, Accessibility, Performance, And Security Checks

## Visual

- Capture screenshots for important layouts and state changes.
- Mask or avoid dynamic content where visual diffing is unstable.
- Test meaningful viewports, not every arbitrary width.

## Accessibility

- Prefer role, label, name, keyboard path, focus order, and error association checks.
- Automated scanners are useful but not complete.
- Include manual/exploratory notes for flows that require judgement.

## Performance

- Record navigation timing, Core Web Vitals-like signals, large resources, and network bottlenecks where tools allow.
- Keep performance smoke checks separate from exact benchmark claims unless the environment is controlled.

## Security Smoke

- Check auth redirects, protected routes, obvious header issues, and form handling for basic XSS/CSRF-sensitive surfaces where applicable.
- Do not perform intrusive security testing without explicit authorization.

