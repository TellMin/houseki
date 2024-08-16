import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { stringify } from "csv-stringify/sync";

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

    // 各商品の情報を抽出 (上から3つだけ取得)
    return items.slice(0, 3).map((item) => {
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

  // 各商品詳細ページにアクセスして追加情報を取得
  for (let i = 0; i < jewels.length; i++) {
    const detailPageUrl = new URL(jewels[i].link, HOUSEKI_URL).href;
    await page.goto(detailPageUrl);

    const details = await page.evaluate(() => {
      // すべてのtd要素を取得
      const tdElements = document.querySelectorAll("figure.table td");

      // 対象ラベルの値を取得する関数
      const findValueByLabel = (label) => {
        // labelと一致するtd要素を見つけ、その次のtd要素のテキストを取得
        for (let i = 0; i < tdElements.length; i++) {
          if (tdElements[i].textContent.trim() === label) {
            // 次の兄弟要素が存在するか確認
            const sibling = tdElements[i].nextElementSibling;
            if (sibling && sibling.tagName === "TD") {
              return sibling.textContent.trim();
            }
          }
        }
        return null;
      };

      const origin = findValueByLabel('産地');
      const weight = findValueByLabel('重量');
      const size = findValueByLabel('サイズ(縦)×(横)×(高)');
      const clarity = findValueByLabel('クラリティー');
      const color = findValueByLabel('カラー');
      const shape = findValueByLabel('形状');
      const enhancement = findValueByLabel('エンハンスメント');

      // 「コメント」ラベルを持つ要素を探し、その次のp要素内のspanテキストをすべて結合して取得
      const commentElement = Array.from(document.querySelectorAll("p")).find(p => p.textContent.trim().includes("コメント"));
      let comment = 'N/A';
      if (commentElement && commentElement.nextElementSibling) {
        comment = Array.from(commentElement.nextElementSibling.querySelectorAll("strong"))
                      .map(span => span.textContent.trim())
                      .join(" ");
      }

      return {
        origin,
        weight,
        size,
        clarity,
        color,
        shape,
        enhancement,
        comment, // コメントとして取得
      };
    });

    // 詳細データをマージ
    jewels[i] = { ...jewels[i], ...details };
  }

  // CSVファイルとして保存
  const csvData = stringify(jewels, {
    header: true,
    columns: [
      "name",
      "price",
      "imageUrl",
      "link",
      "origin",
      "weight",
      "size",
      "clarity",
      "color",
      "shape",
      "enhancement",
      "comment", // コメント列を追加
    ],
  });

  const filePath = path.join(process.cwd(), "jewels.csv");
  fs.writeFileSync(filePath, csvData);

  console.log(`Data saved to ${filePath}`);

  await browser.close();
};

main();
