import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const chromePath = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const baseUrl = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const outputDir = path.join(process.cwd(), "artifacts", "screenshots");
const port = Number(process.env.CHROME_DEBUG_PORT ?? 9333);

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

async function connectPage() {
  const target = await fetchJson(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" });
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  let id = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const handler = pending.get(message.id);
    if (!handler) return;
    pending.delete(message.id);
    if (message.error) {
      handler.reject(new Error(message.error.message));
    } else {
      handler.resolve(message.result);
    }
  });

  function send(method, params = {}) {
    const messageId = ++id;
    socket.send(JSON.stringify({ id: messageId, method, params }));
    return new Promise((resolve, reject) => pending.set(messageId, { resolve, reject }));
  }

  await send("Page.enable");
  await send("Runtime.enable");

  return { send, close: () => socket.close() };
}

async function waitForText(page, text) {
  for (let attempt = 0; attempt < 80; attempt++) {
    const result = await page.send("Runtime.evaluate", {
      expression: `document.body?.innerText.includes(${JSON.stringify(text)})`,
      returnByValue: true,
    });
    if (result.result.value) return;
    await wait(100);
  }
  throw new Error(`Timed out waiting for text: ${text}`);
}

async function navigate(page, url, viewport) {
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile ?? false,
  });
  await page.send("Page.navigate", { url });
  await waitForText(page, "SignalKit");
  await wait(300);
}

async function screenshot(page, name) {
  const result = await page.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
    fromSurface: true,
  });
  await writeFile(path.join(outputDir, `${name}.png`), Buffer.from(result.data, "base64"));
}

async function evaluate(page, expression) {
  await page.send("Runtime.evaluate", { expression, awaitPromise: true });
}

async function capture() {
  await mkdir(outputDir, { recursive: true });
  const userDataDir = await mkdtemp(path.join(tmpdir(), "exitos-waitlist-chrome-"));
  const chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "about:blank",
  ]);

  try {
    for (let attempt = 0; attempt < 50; attempt++) {
      try {
        await fetchJson(`http://127.0.0.1:${port}/json/version`);
        break;
      } catch {
        await wait(100);
      }
    }

    const page = await connectPage();
    const desktop = { width: 1440, height: 1200 };
    const tall = { width: 1440, height: 1600 };
    const mobile = { width: 390, height: 1000, mobile: true };

    await navigate(page, `${baseUrl}/?theme=minimal-light`, desktop);
    await screenshot(page, "light");
    await navigate(page, `${baseUrl}/?theme=minimal-dark`, desktop);
    await screenshot(page, "dark");
    await navigate(page, `${baseUrl}/?theme=warm-gradient`, desktop);
    await screenshot(page, "warm-gradient");
    await navigate(page, `${baseUrl}/?theme=warm-gradient`, mobile);
    await screenshot(page, "mobile");

    await navigate(page, `${baseUrl}/?theme=warm-gradient`, tall);
    await evaluate(
      page,
      `
      (() => {
        const email = document.querySelector('input[type="email"]');
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(email, 'screenshot-' + Date.now() + '@example.com');
        email.dispatchEvent(new Event('input', { bubbles: true }));
        document.querySelector('form').requestSubmit();
      })()
      `,
    );
    await waitForText(page, "You're in. One more thing...");
    await wait(400);
    await screenshot(page, "survey");

    await evaluate(
      page,
      `
      (() => {
        const clickText = (text) => [...document.querySelectorAll('button,label')]
          .find((element) => element.textContent.trim() === text)?.click();
        clickText('Founder');
        const setValue = (selector, value) => {
          const field = document.querySelector(selector);
          const proto = field.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
          Object.getOwnPropertyDescriptor(proto, 'value').set.call(field, value);
          field.dispatchEvent(new Event('input', { bubbles: true }));
        };
        setValue('input[placeholder="A short description is enough."]', 'Validate a focused founder waitlist before building the product.');
        clickText('5');
        setValue('textarea', 'I want to know whether people have a painful enough workflow to join early.');
        document.querySelector('form').requestSubmit();
      })()
      `,
    );
    await waitForText(page, "Thanks. You're on the list.");
    await wait(400);
    await screenshot(page, "referral-success");

    page.close();
  } finally {
    chrome.kill();
    await new Promise((resolve) => chrome.once("close", resolve));
    await rm(userDataDir, { recursive: true, force: true });
  }
}

capture().catch((error) => {
  console.error(error);
  process.exit(1);
});
