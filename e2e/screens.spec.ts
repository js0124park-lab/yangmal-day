import { expect, test } from '@playwright/test';
import { coins, deleteTestGuest, enterHome, freshStart, shot } from './helpers';

test.afterEach(async ({ page, request }) => {
  await deleteTestGuest(page, request);
});

test('title → home, pet the pup', async ({ page }) => {
  const problems = await freshStart(page);
  await expect(page.getByRole('img', { name: /로고/ })).toBeVisible();
  await shot(page, '01-title');

  await enterHome(page);
  await shot(page, '03-home');

  const affection = page.locator('.profile .love span').last();
  const before = Number((await affection.innerText()).replace('%', ''));
  await page.getByRole('button', { name: '양말이 쓰다듬기' }).click();
  await page.getByRole('button', { name: '양말이 쓰다듬기' }).click();
  await expect(affection).toHaveText(`${Math.min(100, before + 2)}%`);
  await expect(page.locator('.room .bubble')).toContainText(/멍|쓰다듬|살랑/);

  // mailbox gift once
  const c0 = await coins(page);
  await page.getByRole('button', { name: /우편함/ }).click();
  await expect.poll(() => coins(page)).toBe(c0 + 100);
  await page.getByRole('button', { name: /우편함/ }).click();
  await expect.poll(() => coins(page)).toBe(c0 + 100);

  expect(problems).toEqual([]);
});

test('to-do sheet: toggle, count, close with Esc', async ({ page }) => {
  const problems = await freshStart(page);
  await enterHome(page);
  await page.getByRole('link', { name: /오늘의 할 일/ }).click();
  await expect(page.getByRole('dialog', { name: '오늘의 할 일' })).toBeVisible();
  await expect(page.getByText('2 / 5 완료')).toBeVisible();
  await shot(page, '04-todo');

  await page.getByRole('button', { name: '산책하기 완료' }).click();
  await expect(page.getByText('3 / 5 완료')).toBeVisible();
  await expect(page.getByRole('button', { name: '산책하기 완료' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /받기 3\/5/ })).toBeDisabled();

  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.locator('.todo-memo')).toContainText('3 / 5');
  expect(problems).toEqual([]);
});

test('kitchen: five cuts, serve, meal done', async ({ page }) => {
  const problems = await freshStart(page);
  await enterHome(page);
  await page.getByRole('link', { name: '식사' }).click();
  await expect(page.getByRole('heading', { name: '양말이의 화식키친' })).toBeVisible();
  await shot(page, '05-kitchen');

  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: /탭! 썰기/ }).click();
    await page.waitForTimeout(120);
  }
  await expect(page.getByText('손질 5 / 5')).toBeVisible();
  await expect(page.locator('.steps li[aria-current="step"]')).toHaveText(/조리하기/);
  await shot(page, '05-kitchen-done');

  await page.getByRole('button', { name: /먹여 주기/ }).click();
  await expect(page).toHaveURL(/\/(home|levelup)$/);
  if (page.url().endsWith('/levelup')) {
    await shot(page, 'M2-levelup');
    await page.getByRole('button', { name: '확인' }).click();
  }
  await expect(page).toHaveURL(/\/home$/);
  expect(problems).toEqual([]);
});

test('ball: a full 30s round with a fast clock', async ({ page }) => {
  await page.clock.install();
  const problems = await freshStart(page);
  await enterHome(page);
  await page.getByRole('link', { name: '놀이' }).click();
  await expect(page.getByText('준비됐나요?')).toBeVisible();
  await shot(page, '07-ball');

  await page.getByRole('button', { name: /탭! 시작하기/ }).click();
  await expect(page.locator('.ball-track')).toBeVisible();
  await page.clock.runFor(1500);
  await page.getByRole('button', { name: /탭! 점프 캐치/ }).click();
  await expect(page.locator('.shout')).toHaveText(/나이스 캐치|아쉬워요/);
  await shot(page, '07-ball-playing');

  await page.clock.runFor(31_000);
  await expect(page.getByRole('button', { name: /다시 하기/ })).toBeVisible();
  await expect(page.locator('.callout')).toContainText(/최종/);
  await shot(page, '07-ball-over');
  expect(problems).toEqual([]);
});

test('walk: arrow keys move the marker, sniff answers', async ({ page }) => {
  const problems = await freshStart(page);
  await enterHome(page);
  await page.getByRole('link', { name: '산책', exact: true }).click();
  await expect(page.getByRole('heading', { name: '포근공원' })).toBeVisible();
  await shot(page, '11-walk');

  const me = page.locator('.minimap .me');
  const x0 = Number(await me.getAttribute('cx'));
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(700);
  await page.keyboard.up('ArrowRight');
  const x1 = Number(await me.getAttribute('cx'));
  expect(x1).toBeGreaterThan(x0 + 5);

  await page.getByRole('button', { name: '냄새 맡기' }).click();
  await expect(page.locator('.walk-stage .callout')).toContainText(/냄새|간식/);
  expect(problems).toEqual([]);
});

test('care: rub the bath photo to finish the bath', async ({ page }) => {
  const problems = await freshStart(page);
  await enterHome(page);
  await page.getByRole('link', { name: '케어' }).click();
  await shot(page, '12-care');

  const area = page.getByRole('button', { name: /거품 목욕/ });
  const box = (await area.boundingBox())!;
  await page.mouse.move(box.x + 60, box.y + 60);
  await page.mouse.down();
  for (let i = 0; i < 12; i++) {
    await page.mouse.move(box.x + 60 + (i % 2) * 200, box.y + 60 + (i % 2) * 120, { steps: 6 });
  }
  await page.mouse.up();
  await expect(page.locator('.care-stage .callout')).toContainText('완료');
  await expect(page.locator('.clean .num')).toHaveText('100');
  await shot(page, '12-care-done');

  await page.getByRole('tab', { name: /빗질/ }).click();
  await expect(page.locator('.care-stage .callout b')).toHaveText('털 빗기');
  expect(problems).toEqual([]);
});

test('deco: buy a plant, place it, confirm', async ({ page }) => {
  const problems = await freshStart(page);
  await enterHome(page);
  const c0 = await coins(page);
  await page.getByRole('link', { name: '꾸미기' }).click();
  await shot(page, '13-deco');

  await page.getByRole('button', { name: /몬스테라 화분, 코인 600에 사기/ }).click();
  await expect(page.getByRole('button', { name: /몬스테라 화분, 배치 중/ })).toBeVisible();
  await page.getByRole('button', { name: '배치 확정' }).click();
  await expect(page.locator('.deco-stage .bubble')).toContainText('꾸미기 완료');

  await page.getByRole('tab', { name: '식물' }).click();
  await expect(page.locator('.items button')).toHaveCount(1);
  await shot(page, '13-deco-placed');

  await page.getByRole('link', { name: '홈으로 돌아가기' }).click();
  // 600 spent, 30 earned for the first placement
  await expect.poll(() => coins(page)).toBe(c0 - 600 + 30);
  expect(problems).toEqual([]);
});

test('missions: cooking unlocks a reward that pays once', async ({ page }) => {
  const problems = await freshStart(page);
  await enterHome(page);
  await expect(page.getByRole('link', { name: '미션', exact: true })).toBeVisible(); // nothing to claim yet

  await page.getByRole('link', { name: '식사' }).click();
  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: /탭! 썰기/ }).click();
    await page.waitForTimeout(120);
  }
  await page.getByRole('button', { name: /먹여 주기/ }).click();
  await expect(page).toHaveURL(/\/home$/);

  const missionLink = page.getByRole('link', { name: /미션, 받을 보상 1개/ });
  await expect(missionLink).toBeVisible();
  const c0 = await coins(page);
  await missionLink.click();
  await expect(page.getByRole('dialog', { name: '미션' })).toBeVisible();
  await shot(page, 'M-missions');

  await page.getByRole('button', { name: '첫 화식 요리 보상 받기' }).click();
  await expect(page.getByLabel('받음')).toHaveCount(1);
  await expect(page.getByText('1 / 8 달성')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect.poll(() => coins(page)).toBe(c0 + 100);
  await expect(page.getByRole('link', { name: '미션', exact: true })).toBeVisible();
  expect(problems).toEqual([]);
});

test('settings: sound effects switch', async ({ page }) => {
  const problems = await freshStart(page);
  await enterHome(page);
  await page.getByRole('button', { name: /프로필, 설정 열기/ }).click();
  const sw = page.getByRole('switch', { name: /효과음/ });
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  await page.reload();
  await expect(page.getByRole('switch', { name: /효과음/ })).toHaveAttribute('aria-checked', 'false');
  expect(problems).toEqual([]);
});

test('settings: reset progress with confirmation', async ({ page }) => {
  const problems = await freshStart(page);
  await enterHome(page);
  await page.getByRole('button', { name: /프로필, 설정 열기/ }).click();
  await expect(page.getByRole('heading', { name: '설정' })).toBeVisible();
  await shot(page, 'S-settings');

  await page.getByRole('button', { name: '진행 처음부터 다시 하기' }).click();
  const dlg = page.getByRole('alertdialog', { name: '처음부터 다시 할까요?' });
  await expect(dlg).toBeVisible();
  await expect(dlg.getByRole('button', { name: '취소' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dlg).toBeHidden();

  await page.getByRole('button', { name: '진행 처음부터 다시 하기' }).click();
  await page.getByRole('button', { name: '처음부터', exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  expect(problems).toEqual([]);
});

test('login: validation and a real wrong-password reply', async ({ page }) => {
  const problems = await freshStart(page);
  await page.getByRole('link', { name: '로그인하고 이어하기' }).click();
  await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
  await shot(page, 'L-login');

  await page.getByLabel('이메일').fill('not-an-email');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('이메일 주소를 확인해 주세요.');

  await page.getByLabel('이메일').fill('nobody@yangmal.test');
  await page.getByLabel('비밀번호').fill('wrong-password-1');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('이메일 또는 비밀번호가 맞지 않아요.');

  await page.getByRole('tab', { name: '회원가입' }).click();
  await expect(page.getByRole('button', { name: '가입하기' })).toBeVisible();
  const pw = page.getByLabel('비밀번호');
  await page.getByRole('button', { name: '보기' }).click();
  await expect(pw).toHaveAttribute('type', 'text');
  expect(problems).toEqual([]);
});
