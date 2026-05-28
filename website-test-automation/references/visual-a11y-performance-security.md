# Visual, Accessibility, Performance, And Security Checks

## Visual

- Capture screenshots for important layouts and state changes.
- Mask or avoid dynamic content where visual diffing is unstable.
- Test meaningful viewports, not every arbitrary width.
- Include empty, loading, error, success, permission-denied, and long-content states when they affect layout.
- Record baseline source, screenshot path, diff threshold or manual-review reason, and known dynamic regions.

## Accessibility

- Prefer role, label, name, keyboard path, focus order, and error association checks.
- Automated scanners are useful but not complete.
- Include manual/exploratory notes for flows that require judgement.
- Cover forms, modals, menus, toasts, route changes, disabled states, and validation errors.
- Record scanner output, keyboard path, focus trap result, and any scoped-skip reason.

## Performance

- Record navigation timing, Core Web Vitals-like signals, large resources, and network bottlenecks where tools allow.
- Keep performance smoke checks separate from exact benchmark claims unless the environment is controlled.
- Test at least the highest-traffic path, heaviest authenticated page, and one slow-network/mobile scenario when relevant.
- Report environment, cache state, throttling, run count, and whether results are smoke signals or benchmark-grade.

## Security Smoke

- Check auth redirects, protected routes, obvious header issues, and form handling for basic XSS/CSRF-sensitive surfaces where applicable.
- Do not perform intrusive security testing without explicit authorization.
- Include role/permission boundaries, IDOR-sensitive routes, file upload/download paths, public/private data exposure, and webhook endpoints where present.
- Keep intrusive scanning, fuzzing, password attacks, and vulnerability exploitation out of scope unless explicitly authorized.

Use `assets/checklists/specialized-quality-checklist.md` for handoff.
