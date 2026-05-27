import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

function ReplaceWithComponent({ onSubmit }: { onSubmit: (value: string) => void }) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        onSubmit(String(form.get('name') || ''));
      }}
    >
      <label>
        Name
        <input name="name" />
      </label>
      <button type="submit">Save</button>
    </form>
  );
}

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
