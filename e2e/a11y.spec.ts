import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { deleteTestGuest, enterHome, freshStart } from './helpers';

// WCAG 2.1 A/AA automated checks (axe-core) on every screen.
test.afterEach(async ({ page, request }) => {
  await deleteTestGuest(page, request);
});

async function scan(page: Page, name: string) {
  await page.waitForTimeout(600); // entry animations finish (contrast is measured on final colors)
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const found = result.violations.map((v) => ({
    screen: name,
    rule: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.slice(0, 4).map((n) => `${n.target.join(' ')} :: ${n.failureSummary?.split('\n')[1]?.trim() ?? ''}`),
  }));
  if (found.length) console.log(JSON.stringify(found, null, 2));
  return found;
}

test('every screen passes WCAG 2.1 AA automated checks', async ({ page }) => {
  test.setTimeout(120_000);
  await freshStart(page);
  const all = [];

  all.push(...(await scan(page, 'title')));
  await page.getByRole('link', { name: '로그인하고 이어하기' }).click();
  all.push(...(await scan(page, 'login')));
  await page.getByRole('link', { name: '타이틀로 돌아가기' }).click();

  await enterHome(page);
  all.push(...(await scan(page, 'home')));

  await page.getByRole('link', { name: /오늘의 할 일/ }).click();
  all.push(...(await scan(page, 'todo')));
  await page.goto('/home');

  await page.getByRole('link', { name: /^미션/ }).click();
  all.push(...(await scan(page, 'missions')));
  await page.goto('/home');

  for (const [link, name] of [
    ['식사', 'kitchen'],
    ['놀이', 'ball'],
    ['산책', 'walk'],
    ['케어', 'care'],
    ['꾸미기', 'deco'],
  ] as const) {
    await page.getByRole('link', { name: link, exact: true }).click();
    all.push(...(await scan(page, name)));
    await page.goto('/home');
  }

  await page.goto('/levelup');
  all.push(...(await scan(page, 'levelup')));
  await page.goto('/settings');
  all.push(...(await scan(page, 'settings')));

  expect(all.map((v) => `${v.screen}: ${v.rule} (${v.impact})`)).toEqual([]);
});
