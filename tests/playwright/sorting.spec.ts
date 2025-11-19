import { test, expect, Page } from '@playwright/test';

const getNumericColumnValues = async (page: Page, columnIndex: number): Promise<number[]> => {
  return page.locator('tbody tr:not(.is-placeholder)').evaluateAll(
    (rows, targetColumnIndex) => rows.map((row) => {
      const cells = row.querySelectorAll<HTMLTableCellElement>('td');
      const cell = cells[targetColumnIndex];
      if (!cell) {
        return Number.NaN;
      }

      const input = cell.querySelector<HTMLInputElement>('input');
      if (input) {
        return Number(input.value);
      }

      const text = cell.textContent ?? '';
      const trimmed = text.trim();
      return trimmed ? Number(trimmed) : Number.NaN;
    }),
    columnIndex,
  );
};

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Excel Table Example' })).toBeVisible();
});

test('clicking the Age header cycles the sort order', async ({ page }) => {
  const ageHeaderButton = page.getByRole('button', { name: 'Age' });
  const readAgeColumn = () => getNumericColumnValues(page, 1);

  const initialAges = await readAgeColumn();
  expect(initialAges).toEqual([32, 28, 45, 35, 29]);

  await ageHeaderButton.click();
  const ascendingAges = await readAgeColumn();
  expect(ascendingAges).toEqual([...initialAges].sort((a, b) => a - b));

  await ageHeaderButton.click();
  const descendingAges = await readAgeColumn();
  expect(descendingAges).toEqual([...ascendingAges].reverse());
});
