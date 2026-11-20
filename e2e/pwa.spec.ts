import { expect, test } from '@playwright/test';

// Runs against the production build (vite preview on :4173), where the service worker is active.
test.use({ baseURL: 'http://localhost:4173' });

test('installable: manifest and icons are served', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const manifest = await (await request.get(`http://localhost:4173${href!.startsWith('/') ? '' : '/'}${href}`)).json();
  expect(manifest.name).toBe('양말이의 하루');
  expect(manifest.display).toBe('standalone');
  for (const icon of manifest.icons as Array<{ src: string }>) {
    const res = await request.get(`http://localhost:4173${icon.src}`);
    expect(res.status(), icon.src).toBe(200);
    expect(res.headers()['content-type']).toContain('image/png');
  }
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
});

test('opens and plays offline after the first visit', async ({ page, context }) => {
  await page.goto('/');
  // first visit installs the worker (it precaches before activating); in "prompt" mode it controls pages after a reload
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await expect
    .poll(async () => page.evaluate(async () => (await caches.keys()).length), { timeout: 15_000 })
    .toBeGreaterThan(0);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('img', { name: /로고/ })).toBeVisible();

  await page.getByRole('button', { name: /시작하기/ }).click();
  await expect(page).toHaveURL(/\/home$/, { timeout: 15_000 });
  const room = page.getByRole('img', { name: '거실 러그 위에서 웃고 있는 양말이' });
  await expect(room).toBeVisible();
  await expect.poll(() => room.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);

  // a lazily loaded screen also comes from the cache
  await page.getByRole('link', { name: '식사' }).click();
  await expect(page.getByRole('heading', { name: '양말이의 화식키친' })).toBeVisible();
  await page.screenshot({ path: 'e2e-screens/P-offline-kitchen.png' });
  await context.setOffline(false);
});
