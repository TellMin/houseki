import puppeteer from "puppeteer";

const HOUSEKI_URL = "https://houseki-t.jp/";

const main = async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(HOUSEKI_URL);

  // 必要なデータを取得
  const jewels = await page.evaluate(() => {
    // セレクターを使用して、商品の情報を取得
    const items = Array.from(
      document.querySelectorAll("#new-arraival-area .product-item")
    );

    // 各商品の情報を抽出
    return items.map((item) => {
      const name = item
        .querySelector(".product-item-name")
        ?.textContent?.trim();
      const price = item
        .querySelector(".product-item-price")
        ?.textContent?.trim();
      const imageUrl = item
        .querySelector(".product-item-image-wrap img")
        ?.getAttribute("src");
      const link = item.querySelector("a")?.getAttribute("href");

      return { name, price, imageUrl, link };
    });
  });

  console.log(jewels);

  await browser.close();
};

main();
