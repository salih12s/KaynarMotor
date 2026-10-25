/*
 * Akış 4: Kenar menü düzeni.
 * Kısa ekranda birden çok grup açılınca satırlar ezilip üst üste biniyordu (MUI Collapse flex içinde küçülüyordu).
 * Sınanan: grupları açınca hiçbir menü satırı bir öncekinin üstüne binmez; menü gerekirse kendi içinde kayar.
 */
const { test, expect } = require('@playwright/test');
const { adminGirisi } = require('./yardimci');

for (const yukseklik of [560, 900]) {
  test(`kenar menü ${yukseklik}px yükseklikte: açık gruplar üst üste binmez`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: yukseklik });
    await adminGirisi(page);
    await page.goto('/servis');
    const menu = page.getByRole('navigation', { name: 'Ana gezinme' });
    await expect(menu).toBeVisible();

    for (const grup of ['Motorsiklet', 'Aksesuarlar', 'Yedek Parça']) {
      const dugme = menu.getByRole('button', { name: grup, exact: true });
      if ((await dugme.getAttribute('aria-expanded')) !== 'true') await dugme.click();
      await expect(dugme).toHaveAttribute('aria-expanded', 'true');
    }
    await page.waitForTimeout(600); // açılma animasyonu bitsin

    const kutular = await menu.getByRole('button').evaluateAll((dugmeler) =>
      dugmeler.map((d) => {
        const k = d.getBoundingClientRect();
        return { ad: d.textContent.trim(), ust: Math.round(k.top), alt: Math.round(k.bottom) };
      }),
    );
    expect(kutular.length).toBeGreaterThan(12); // gruplar + alt satırlar açılmış
    const sirali = [...kutular].sort((a, b) => a.ust - b.ust);
    for (let i = 1; i < sirali.length; i += 1) {
      expect(sirali[i].ust, `"${sirali[i].ad}" satırı "${sirali[i - 1].ad}" satırının üstüne biniyor`).toBeGreaterThanOrEqual(sirali[i - 1].alt - 1);
    }
  });
}
