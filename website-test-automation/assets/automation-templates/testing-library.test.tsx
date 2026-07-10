import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

// Replace this path and symbol with the target project's real component; do not recreate it here.
import { ReplaceWithComponent } from '@/components/ReplaceWithComponent';

describe('TC-COMPONENT-001 component behavior', () => {
  it('submits the documented value', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<ReplaceWithComponent onSubmit={onSubmit} />);
    await user.type(screen.getByRole('textbox', { name: /name/i }), 'Ada');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(onSubmit).toHaveBeenCalledWith('Ada');
  });
});
