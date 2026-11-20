import { expect, test, type Page } from '@playwright/test';
import { deleteTestGuest, freshStart, shot } from './helpers';

// if the test fails midway, still remove the guest it created
test.afterEach(async ({ page, request }) => {
  await deleteTestGuest(page, request);
});

// Needs anonymous sign-ins enabled on the Supabase project. Creates one guest and deletes it at the end.

const DEVICE = { baseURL: 'http://localhost:5173', viewport: { width: 390, height: 844 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' };

const affection = async (page: Page) => Number((await page.locator('.profile .love span').last().innerText()).replace('%', ''));
const savedDot = (page: Page) => page.locator('.profile .sync-dot.ok');

async function petTimes(page: Page, n: number) {
  for (let i = 0; i < n; i++) await page.getByRole('button', { name: '양말이 쓰다듬기' }).click();
}

test('guest plays, saves to the cloud, continues on a second device, resolves a conflict, deletes', async ({ page, browser }) => {
  test.setTimeout(150_000);

  // ---------- device A: start as a guest ----------
  const problems = await freshStart(page);
  await page.getByRole('button', { name: /터치해서 시작하기/ }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(savedDot(page)).toBeVisible({ timeout: 15_000 });

  await petTimes(page, 3);
  const afterA = await affection(page);
  await expect(savedDot(page)).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(2500); // past the 1.5s save debounce
  await expect(savedDot(page)).toBeVisible({ timeout: 15_000 });

  await page.getByRole('button', { name: /프로필, 설정 열기/ }).click();
  await expect(page.locator('.account-kind')).toHaveText('게스트');
  await expect(page.locator('.sync-line')).toContainText('클라우드에 저장됨');
  await shot(page, 'G-settings-guest');
  await page.getByRole('link', { name: '홈으로 돌아가기' }).click();

  // ---------- device B: same account, empty device ----------
  const session = await page.evaluate(() => localStorage.getItem('yangmal-auth'));
  expect(session).toBeTruthy();
  const ctxB = await browser.newContext(DEVICE);
  const b = await ctxB.newPage();
  await b.clock.install();
  await b.goto('/');
  await b.evaluate((s) => localStorage.setItem('yangmal-auth', s!), session);
  await b.goto('/');
  await expect(b.getByRole('button', { name: /이어서 시작하기/ })).toBeVisible();
  await b.getByRole('button', { name: /이어서 시작하기/ }).click();
  await expect.poll(() => affection(b), { timeout: 15_000 }).toBe(afterA); // loaded from the cloud
  await shot(b, 'G-deviceB-home');

  // B plays and saves
  await petTimes(b, 1);
  await b.clock.runFor(2500);
  await expect(savedDot(b)).toBeVisible({ timeout: 15_000 });
  const cloudValue = await affection(b);

  // ---------- conflict: A (still on the old revision) plays too ----------
  await petTimes(page, 2);
  const dialog = page.getByRole('alertdialog', { name: '어느 진행을 이어갈까요?' });
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await shot(page, 'G-conflict');
  await dialog.getByRole('button', { name: '계정 진행' }).click();
  await expect.poll(() => affection(page)).toBe(cloudValue);

  // ---------- weekly ranking on B ----------
  await b.getByRole('link', { name: '놀이' }).click();
  await b.getByRole('button', { name: /탭! 시작하기/ }).click();
  await b.clock.runFor(31_000);
  await expect(b.locator('.callout')).toContainText(/이번 주 \d+위/, { timeout: 15_000 });
  // A only loaded the cloud save (no new play), so B must not be asked to choose
  await b.clock.runFor(2500);
  await expect(b.getByRole('alertdialog')).toHaveCount(0);
  await b.getByRole('button', { name: '랭킹' }).click();
  const ranking = b.getByRole('dialog', { name: '이번 주 공놀이 랭킹' });
  await expect(ranking.locator('li.me')).toBeVisible({ timeout: 10_000 });
  await shot(b, 'G-ranking');
  await ranking.getByRole('button', { name: '닫기' }).click();
  await ctxB.close();

  // ---------- delete the account (also cleans up the test guest) ----------
  await page.getByRole('button', { name: /프로필, 설정 열기/ }).click();
  await page.getByRole('button', { name: '계정 삭제' }).click();
  await page.getByRole('button', { name: '영구 삭제' }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
  await expect(page.getByRole('button', { name: /터치해서 시작하기/ })).toBeVisible();

  expect(problems).toEqual([]);
});
