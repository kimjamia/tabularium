import { test, expect, Page, Locator } from '@playwright/test';

const getCell = (page: Page, rowIndex: number, columnIndex: number): Locator =>
  page.locator(`tbody tr[data-row-index="${rowIndex}"] td`).nth(columnIndex);

const selectCell = async (page: Page, rowIndex: number, columnIndex: number) => {
  const cell = getCell(page, rowIndex, columnIndex);
  await cell.click({ position: { x: 8, y: 8 } });
  await expect(cell).toHaveClass(/is-selected/);
};

const dragFillHandleTo = async (page: Page, targetRowIndex: number, targetColumnIndex: number) => {
  const handle = page.locator('.excel-table__fill-handle');
  await handle.waitFor();

  const handleBox = await handle.boundingBox();
  const targetCell = getCell(page, targetRowIndex, targetColumnIndex);
  await targetCell.waitFor();
  const targetBox = await targetCell.boundingBox();

  if (!handleBox || !targetBox) {
    throw new Error('Unable to determine drag coordinates for the fill handle');
  }

  const startX = handleBox.x + handleBox.width / 2;
  const startY = handleBox.y + handleBox.height / 2;
  const targetX = targetBox.x + targetBox.width / 2;
  const targetY = targetBox.y + targetBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(targetX, targetY, { steps: 10 });
  await page.mouse.up();
};

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Excel Table Example' })).toBeVisible();
});

test('fills right from the email column into department', async ({ page }) => {
  await selectCell(page, 0, 2);
  await dragFillHandleTo(page, 0, 3);

  const departmentInput = getCell(page, 0, 3).locator('input');
  await expect(departmentInput).toHaveValue('john.doe@example.com');
});

test('fills down from department in the first row to the second row', async ({ page }) => {
  await selectCell(page, 0, 3);
  await dragFillHandleTo(page, 1, 3);

  const targetInput = getCell(page, 1, 3).locator('input');
  await expect(targetInput).toHaveValue('Engineering');
});

test('filling upwards from row 2 department should propagate values upward', async ({ page }) => {
  test.fail(true, 'Filling upwards is not implemented yet.');

  await selectCell(page, 2, 3);
  await dragFillHandleTo(page, 0, 3);

  const targetInput = getCell(page, 0, 3).locator('input');
  await expect(targetInput).toHaveValue('Sales');
});

test('filling left from department should overwrite the email column', async ({ page }) => {
  test.fail(true, 'Filling leftwards is not implemented yet.');

  await selectCell(page, 0, 3);
  await dragFillHandleTo(page, 0, 2);

  const emailInput = getCell(page, 0, 2).locator('input');
  await expect(emailInput).toHaveValue('Engineering');
});
