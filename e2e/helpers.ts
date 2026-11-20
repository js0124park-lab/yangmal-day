import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

/** Supabase URL + key from .env.local (the same project the app uses). */
function supabaseEnv() {
  try {
    const env = readFileSync('.env.local', 'utf8');
    const get = (k: string) => env.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1]?.trim();
    return { url: get('VITE_SUPABASE_URL'), key: get('VITE_SUPABASE_ANON_KEY') };
  } catch {
    return { url: undefined, key: undefined };
  }
}

/**
 * Deletes the guest a test created (with guest sign-in on, every "시작하기" makes one).
 * Real email accounts are never touched: only anonymous sessions are deleted.
 */
export async function deleteTestGuest(page: Page, request: APIRequestContext) {
  const { url, key } = supabaseEnv();
  if (!url || !key) return;
  const raw = await page.evaluate(() => localStorage.getItem('yangmal-auth')).catch(() => null);
  if (!raw) return;
  const session = JSON.parse(raw) as { access_token?: string; user?: { is_anonymous?: boolean } };
  if (!session.access_token || !session.user?.is_anonymous) return;
  await request.post(`${url}/rest/v1/rpc/delete_my_account`, {
    headers: { apikey: key, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    data: {},
  });
}

export const SHOTS = 'e2e-screens';

/** Fresh visit: empty storage, and any page error or console error fails the test at the end. */
export async function freshStart(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    // expected while anonymous sign-ins are disabled on the project, and failed network calls the app handles
    if (/422|anonymous|Failed to load resource/i.test(t)) return;
    problems.push(`console: ${t}`);
  });
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
  return problems;
}

/** Title → home (guest; works with anonymous sign-ins on or off). */
export async function enterHome(page: Page) {
  await page.getByRole('button', { name: /시작하기/ }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole('navigation', { name: '주요 메뉴' })).toBeVisible();
}

export async function shot(page: Page, name: string) {
  // let entry animations settle
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

/** Reads the coin count shown on home. */
export async function coins(page: Page) {
  const t = await page.locator('.currency span').first().innerText();
  return Number(t.replace(/[^0-9]/g, ''));
}
