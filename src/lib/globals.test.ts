import { expect, test, vi } from 'vitest';
import { doAfter } from './globals';

test('doAfter', async () => {
  let fun = vi.fn();

  await doAfter(100, fun);
  expect(fun).toHaveBeenCalled();
});
