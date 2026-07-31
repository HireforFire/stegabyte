import { test, expect } from "@playwright/test";

const MESSAGE = "This is a Stegabyte round-trip test " + Date.now();
const PASSWORD = "correct-horse-battery-staple";

/**
 * Generate a small PNG buffer in the browser using the Canvas API.
 * Used as the carrier image for the encrypt/extract round-trip test.
 */
async function makeCarrierPng(
  page: import("@playwright/test").Page,
  width: number,
  height: number,
): Promise<Buffer> {
  await page.exposeFunction("__toBuffer", () => {
    return new Promise<string>((resolve) => {
      const canvas = document.createElement("canvas");
      canvas.width = window.__carrierW!;
      canvas.height = window.__carrierH!;
      const ctx = canvas.getContext("2d")!;
      // Generate a deterministic gradient so the test is reproducible.
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, "#22d3ee");
      grad.addColorStop(0.5, "#3b82f6");
      grad.addColorStop(1, "#a855f7");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Add some noise so LSBs are not all zero.
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const n = (Math.sin(i * 1.7) * 127 + 128) | 0;
        data[i] = (data[i]! + n) & 0xff;
        data[i + 1] = (data[i + 1]! + n) & 0xff;
        data[i + 2] = (data[i + 2]! + n) & 0xff;
      }
      ctx.putImageData(imageData, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return resolve("");
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      }, "image/png");
    });
  });

  await page.evaluate(
    ({ width, height }) => {
      (window as unknown as { __carrierW?: number }).__carrierW = width;
      (window as unknown as { __carrierH?: number }).__carrierH = height;
    },
    { width, height },
  );

  const dataUrl = await page.evaluate(() =>
    (window as unknown as () => Promise<string>).__toBuffer()!(),
  );
  // Convert data URL to Buffer.
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  return Buffer.from(base64, "base64");
}

test("landing page renders hero and feature cards", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Encrypted Secrets",
  );
  await expect(page.getByRole("link", { name: /Start encrypting/i })).toBeVisible();
});

test("dashboard, encrypt, extract, analyze, about, settings pages all render", async ({
  page,
}) => {
  for (const path of [
    "/dashboard",
    "/encrypt",
    "/extract",
    "/analyze",
    "/about",
    "/settings",
  ]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible({ timeout: 5_000 });
  }
});

test("encrypt + extract round trip recovers the original message", async ({ page }) => {
  // Step 1: generate a synthetic carrier PNG.
  const png = await makeCarrierPng(page, 256, 256);

  // Step 2: go to /encrypt and submit.
  await page.goto("/encrypt");
  await page.setInputFiles('input[type="file"]', {
    name: "carrier.png",
    mimeType: "image/png",
    buffer: png,
  });
  await page.getByLabel("Your message").fill(MESSAGE);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: /Encrypt \+ Embed/i }).click();

  // Wait for the result to appear (Download button).
  const downloadBtn = page.getByRole("button", { name: /Download encrypted PNG/i });
  await expect(downloadBtn).toBeVisible({ timeout: 30_000 });

  // Read the dataUrl from the preview image.
  const previewImg = page.locator("img[alt='Encrypted result']");
  await expect(previewImg).toBeVisible();
  const dataUrl = await previewImg.getAttribute("src");
  expect(dataUrl).toBeTruthy();
  expect(dataUrl!.startsWith("data:image/png;base64,")).toBe(true);

  const base64 = dataUrl!.replace(/^data:image\/png;base64,/, "");
  const encryptedPng = Buffer.from(base64, "base64");

  // Step 3: go to /extract and recover the message.
  await page.goto("/extract");
  await page.setInputFiles('input[type="file"]', {
    name: "encrypted.png",
    mimeType: "image/png",
    buffer: encryptedPng,
  });
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /Extract & Decrypt/i }).click();

  const recovered = page.locator("pre").first();
  await expect(recovered).toBeVisible({ timeout: 30_000 });
  // Reveal the hidden text.
  await page.getByRole("button", { name: /Show/i }).click();
  await expect(recovered).toContainText(MESSAGE);
});

test("extract rejects wrong password with a clear error", async ({ page }) => {
  const png = await makeCarrierPng(page, 128, 128);

  await page.goto("/encrypt");
  await page.setInputFiles('input[type="file"]', {
    name: "carrier.png",
    mimeType: "image/png",
    buffer: png,
  });
  await page.getByLabel("Your message").fill("top secret");
  await page.getByLabel("Password", { exact: true }).fill("right-password-1");
  await page.getByRole("button", { name: /Encrypt \+ Embed/i }).click();

  const previewImg = page.locator("img[alt='Encrypted result']");
  await expect(previewImg).toBeVisible({ timeout: 30_000 });
  const dataUrl = await previewImg.getAttribute("src");
  const base64 = dataUrl!.replace(/^data:image\/png;base64,/, "");
  const encryptedPng = Buffer.from(base64, "base64");

  await page.goto("/extract");
  await page.setInputFiles('input[type="file"]', {
    name: "encrypted.png",
    mimeType: "image/png",
    buffer: encryptedPng,
  });
  await page.getByLabel("Password").fill("wrong-password-1");
  await page.getByRole("button", { name: /Extract & Decrypt/i }).click();

  // The error banner should appear.
  await expect(page.getByText(/Decryption failed/i)).toBeVisible({ timeout: 30_000 });
});

test("analyze detects a Stegabyte payload in an embedded image", async ({ page }) => {
  const png = await makeCarrierPng(page, 256, 256);
  await page.goto("/encrypt");
  await page.setInputFiles('input[type="file"]', {
    name: "carrier.png",
    mimeType: "image/png",
    buffer: png,
  });
  await page.getByLabel("Your message").fill("hello there");
  await page.getByLabel("Password", { exact: true }).fill("test-password-1");
  await page.getByRole("button", { name: /Encrypt \+ Embed/i }).click();
  const previewImg = page.locator("img[alt='Encrypted result']");
  await expect(previewImg).toBeVisible({ timeout: 30_000 });
  const dataUrl = await previewImg.getAttribute("src");
  const base64 = dataUrl!.replace(/^data:image\/png;base64,/, "");
  const encryptedPng = Buffer.from(base64, "base64");

  await page.goto("/analyze");
  await page.setInputFiles('input[type="file"]', {
    name: "encrypted.png",
    mimeType: "image/png",
    buffer: encryptedPng,
  });

  await expect(page.getByText(/Stegabyte Payload Detected/i)).toBeVisible({
    timeout: 30_000,
  });
});
