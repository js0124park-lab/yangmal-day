import { expect, test } from '@playwright/test';

// Smoke test of the deployed site. Runs only with LIVE_URL set, e.g.
//   LIVE_URL=https://js0124park-lab.github.io/yangmal-day/ npx playwright test e2e/live.spec.ts
// Creates no accounts: guest sign-in is reported as off, and login is checked with a wrong password.
const LIVE = process.env.LIVE_URL?.replace(/\/?$/, '/');
test.skip(!LIVE, 'set LIVE_URL to check the deployed site');

const url = (path = '') => `${LIVE}${path}`;

test.beforeEach(async ({ page }) => {
  await page.route('**/auth/v1/settings', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ external: { anonymous_users: false, email: true } }) }),
  );
});

test('live: every screen opens with its images', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const broken: string[] = [];
  page.on('response', (r) => {
    if (r.url().startsWith(LIVE!) && r.status() >= 400 && !r.url().endsWith('/home')) broken.push(`${r.status()} ${r.url()}`);
  });

  await page.goto(url());
  await expect(page.getByRole('img', { name: /로고/ })).toBeVisible();
  await page.getByRole('button', { name: /시작하기/ }).click();
  await expect(page).toHaveURL(url('home'));

  for (const [link, check] of [
    ['식사', '양말이의 화식키친'],
    ['놀이', '공놀이 챌린지'],
    ['산책', '포근공원'],
    ['케어', '케어'],
    ['꾸미기', '집 꾸미기'],
  ] as const) {
    await page.getByRole('link', { name: link, exact: true }).click();
    await expect(page.getByRole('heading', { name: check })).toBeVisible();
    const imgs = page.locator('main img');
    await expect.poll(() => imgs.evaluateAll((els) => els.every((e) => (e as HTMLImageElement).complete && (e as HTMLImageElement).naturalWidth > 0))).toBe(true);
    await page.goBack();
  }
  await page.screenshot({ path: 'e2e-screens/LIVE-home.png' });
  expect(broken).toEqual([]);
  expect(errors).toEqual([]);
});

test('live: deep link opens the app (GitHub Pages SPA fallback)', async ({ page }) => {
  await page.goto(url('settings'));
  await expect(page.getByRole('heading', { name: '설정' })).toBeVisible();
});

test('live: installable, and Supabase answers', async ({ page, request }) => {
  await page.goto(url());
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await request.get(new URL(href!, url()).toString())).json();
  expect(manifest.start_url).toBe('/yangmal-day/');
  for (const icon of manifest.icons as Array<{ src: string }>) {
    expect((await request.get(new URL(icon.src, url()).toString())).status(), icon.src).toBe(200);
  }

  await page.getByRole('link', { name: '로그인하고 이어하기' }).click();
  await page.getByLabel('이메일').fill('nobody@yangmal.test');
  await page.getByLabel('비밀번호').fill('wrong-password-1');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('이메일 또는 비밀번호가 맞지 않아요.');
});

test('live: opens offline after the first visit', async ({ page, context }) => {
  await page.goto(url());
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 15_000 }).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('img', { name: /로고/ })).toBeVisible();
  await page.getByRole('button', { name: /시작하기/ }).click();
  await expect(page.getByRole('img', { name: '거실 러그 위에서 웃고 있는 양말이' })).toBeVisible();
  await context.setOffline(false);
});
