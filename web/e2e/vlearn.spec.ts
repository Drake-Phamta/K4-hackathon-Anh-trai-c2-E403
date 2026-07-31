import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';

const PDF = path.resolve(__dirname, '../../data/slides/day03.pdf');
const LEGACY_WORKER = path.resolve(__dirname, '../public/pdf.worker.min.mjs');

async function quietVoice(page: Page) {
  await page.route('**/api/voice/health', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":false,"error":"test_offline"}' })
  );
}

async function loadPdf(page: Page, route = '/console') {
  await quietVoice(page);
  await page.goto(route);
  await page.getByTestId('pdf-input').setInputFiles(PDF);
  await expect(page.getByText(/day03\.pdf · 44 trang/)).toBeVisible();
  await expect(page.locator('.pv-page')).toHaveCount(44);
}

test('Console lifecycle, PDF virtualization and page jump', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await loadPdf(page);
  await expect(page.getByTestId('viewer-root')).toHaveCount(1);
  expect(await page.locator('.pv-canvas').count()).toBeLessThanOrEqual(8);
  await page.getByTestId('page-input').fill('37');
  await expect(page.getByTestId('page-input')).toHaveValue('37');
  await expect(page.locator('.pv-page[data-page="37"]')).toBeInViewport();
  expect(errors).toEqual([]);
});

test('Console keeps all five decision branches and invariants', async ({ page }) => {
  await loadPdf(page);
  const cases = [
    ['happy', 'answer', true],
    ['clarify', 'clarify', false],
    ['nog', 'no_grounding', true],
    ['oos', 'out_of_scope', true],
    ['domain', 'answer', true],
  ] as const;
  for (const [scenario, decision, cited] of cases) {
    const before = await page.getByTestId('decision').count();
    await page.locator(`[data-s="${scenario}"]`).click();
    await expect(page.getByTestId('decision')).toHaveCount(before + 1);
    const answer = page.getByTestId('decision').last().locator('xpath=ancestor::*[contains(@class,"msg")]');
    await expect(answer.getByTestId('decision')).toHaveAttribute('data-decision', decision);
    if (cited) await expect(answer.getByTestId('citation').first()).toBeVisible();
    else await expect(answer.getByTestId('citation')).toHaveCount(0);
  }
});

test('Console supports outside-document and TA handoff actions', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await loadPdf(page);
  await page.locator('[data-s="nog"]').click();
  const outside = page.getByTestId('action-answer_outside').last();
  await expect(outside).toBeVisible();
  await outside.click();
  await expect(page.getByTestId('decision').last()).toHaveAttribute('data-decision', 'outside_document');
  await expect(page.getByTestId('decision').last().locator('xpath=ancestor::*[contains(@class,"msg")]').getByTestId('citation')).toHaveCount(0);
  await page.getByTestId('action-handoff_ta').last().click();
  await expect(page.getByText(/Đã copy tin nhắn cho TA/)).toBeVisible();
});

test('Console citation, theme, feedback, copy, log and offline voice', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await loadPdf(page);
  await expect(page.getByTestId('microphone')).toBeDisabled();
  await page.locator('[data-s="happy"]').click();
  await expect(page.getByTestId('decision')).toHaveAttribute('data-decision', 'answer');
  await page.getByTestId('citation').first().click();
  await expect(page.locator('.pv-hit').first()).toBeVisible();
  const before = await page.locator('html').getAttribute('data-theme');
  await page.getByRole('button', { name: '◐' }).click();
  expect(await page.locator('html').getAttribute('data-theme')).not.toBe(before);
  await page.getByTitle('Hữu ích').click();
  await page.getByTitle('Chép câu trả lời kèm số trang trích dẫn').click();
  await expect(page.getByText(/Đã chép câu trả lời kèm nguồn/)).toBeVisible();
  await expect(page.getByRole('button', { name: '🔊 Đọc', exact: true })).toBeDisabled();
  await page.getByTestId('download-log').click();
  await expect(page.getByText(/Đã xuất 1 lượt/)).toBeVisible();
});

test('Legacy and Next Console keep happy-path parity', async ({ page }) => {
  await quietVoice(page);
  await page.addInitScript(() => {
    const proto = Uint8Array.prototype as Uint8Array & { toHex?: () => string };
    if (!proto.toHex) proto.toHex = function () {
      return Array.from(this as unknown as Uint8Array, value => value.toString(16).padStart(2, '0')).join('');
    };
  });
  await page.route('**/vendor/pdf.worker.min.mjs', route => route.fulfill({
    path: LEGACY_WORKER, contentType: 'application/javascript',
  }));
  await page.goto('http://localhost:8080/prototype.html?file=/data/slides/day03.pdf');
  await expect(page.locator('#pgTot')).toHaveText('/ 44');
  await page.locator('[data-s="happy"]').click();
  await expect(page.locator('.badge.ok, .dec.ok').first()).toBeVisible();
  const legacyCitations = await page.locator('.ct').count();
  expect(legacyCitations).toBeGreaterThan(0);

  await loadPdf(page);
  await page.locator('[data-s="happy"]').click();
  await expect(page.getByTestId('decision')).toHaveAttribute('data-decision', 'answer');
  expect(await page.getByTestId('citation').count()).toBeGreaterThan(0);
});

for (const route of ['/doc', '/wild'] as const) {
  test(`${route} desktop smoke`, async ({ page }) => {
    await quietVoice(page);
    await page.goto(route);
    await page.locator('input[type="file"]').setInputFiles(PDF);
    await expect(page.getByText('day03.pdf · 44 trang', { exact: true }).first()).toBeVisible();
    await page.getByText('Tóm tắt trang mình đang xem', { exact: true }).click();
    await expect(page.getByTestId('decision').last()).toHaveAttribute('data-decision', 'answer');
    await expect(page.getByTestId('citation').first()).toBeVisible();
    if (route === '/doc') await expect(page.getByTestId('trace').last()).not.toHaveAttribute('open', '');
    else await expect(page.getByTestId('wild-pins').locator('[data-pin]')).toHaveCount(1);
  });
}

test('Three routes fit compact viewport and reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of ['/console', '/doc', '/wild']) {
    await quietVoice(page);
    await page.goto(route);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    if (route === '/wild') await expect(page.locator('svg[class*="wires"]')).toBeHidden();
  }
});
