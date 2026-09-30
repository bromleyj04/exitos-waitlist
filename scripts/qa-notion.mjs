import http from "node:http";
import { spawn } from "node:child_process";

const notionPort = 43210;
const appPort = 3100;
const baseUrl = `http://127.0.0.1:${appPort}`;
const notionBaseUrl = `http://127.0.0.1:${notionPort}/v1`;
const token = "qa-replay-token";
const notifySecret = "qa-notify-secret";
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const databaseId = "mock-validation-prospects";
let pageSeq = 0;
const pages = new Map();
const notifyEvents = [];
let notifyUnavailable = false;
let hardFailNotion = false;
let transientPageCreateFailures = 1;

const schemaProperties = Object.fromEntries(
  [
    "Prospect",
    "Prospect ID",
    "Email",
    "Company",
    "Role",
    "Joined At",
    "Survey Status",
    "Survey Completed At",
    "Source",
    "Primary Use Cases",
    "Early Access Intent",
    "Validation Status",
    "Referral Code",
    "Referred By",
    "UTM Source",
    "UTM Medium",
    "UTM Campaign",
    "UTM Term",
    "UTM Content",
  ].map((name) => [name, {}]),
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function send(response, status, body, headers = {}) {
  response.writeHead(status, { "content-type": "application/json", ...headers });
  response.end(JSON.stringify(body));
}

function textValue(property) {
  return property?.rich_text?.map((item) => item.plain_text ?? item.text?.content ?? "").join("") ?? "";
}

function matchesFilter(page, filter) {
  if (!filter) return true;
  const property = page.properties[filter.property];
  if (filter.email) return property?.email === filter.email.equals;
  if (filter.rich_text) return textValue(property) === filter.rich_text.equals;
  return true;
}

function normalizeProperties(properties) {
  const normalized = { ...properties };
  for (const [key, value] of Object.entries(normalized)) {
    if (value.title) {
      normalized[key] = {
        ...value,
        title: value.title.map((item) => ({ ...item, plain_text: item.text?.content ?? "" })),
      };
    }
    if (value.rich_text) {
      normalized[key] = {
        ...value,
        rich_text: value.rich_text.map((item) => ({ ...item, plain_text: item.text?.content ?? "" })),
      };
    }
  }
  return normalized;
}

function createMockServer() {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", `http://127.0.0.1:${notionPort}`);

    if (url.pathname === "/notify" && request.method === "POST") {
      const body = await readJson(request);
      notifyEvents.push({
        idempotencyKey: request.headers["idempotency-key"],
        signature: request.headers["x-waitlist-signature"],
        body,
      });
      if (notifyUnavailable) return send(response, 503, { error: "temporary notify outage" });
      return send(response, 202, { ok: true });
    }

    if (hardFailNotion) {
      return send(response, 500, { error: "hard notion failure" });
    }

    if (url.pathname === `/v1/databases/${databaseId}` && request.method === "GET") {
      return send(response, 200, { id: databaseId, properties: schemaProperties });
    }

    if (url.pathname === `/v1/databases/${databaseId}/query` && request.method === "POST") {
      const body = await readJson(request);
      return send(response, 200, {
        object: "list",
        results: [...pages.values()].filter((page) => matchesFilter(page, body.filter)),
        has_more: false,
        next_cursor: null,
      });
    }

    if (url.pathname === "/v1/pages" && request.method === "POST") {
      if (transientPageCreateFailures > 0) {
        transientPageCreateFailures -= 1;
        return send(response, 429, { error: "rate limited" }, { "retry-after": "0" });
      }

      const body = await readJson(request);
      const id = `page_${++pageSeq}`;
      const page = {
        id,
        url: `https://notion.test/${id}`,
        properties: normalizeProperties(body.properties),
        children: body.children ?? [],
      };
      pages.set(id, page);
      return send(response, 200, page);
    }

    if (url.pathname.startsWith("/v1/pages/") && request.method === "GET") {
      const id = url.pathname.split("/").at(-1);
      const page = pages.get(id);
      return page ? send(response, 200, page) : send(response, 404, { error: "not found" });
    }

    if (url.pathname.startsWith("/v1/pages/") && request.method === "PATCH") {
      const id = url.pathname.split("/").at(-1);
      const page = pages.get(id);
      if (!page) return send(response, 404, { error: "not found" });
      const body = await readJson(request);
      page.properties = normalizeProperties({ ...page.properties, ...body.properties });
      return send(response, 200, page);
    }

    if (url.pathname.startsWith("/v1/blocks/") && url.pathname.endsWith("/children") && request.method === "PATCH") {
      const id = url.pathname.split("/").at(-2);
      const page = pages.get(id);
      if (!page) return send(response, 404, { error: "not found" });
      const body = await readJson(request);
      page.children.push(...(body.children ?? []));
      return send(response, 200, { ok: true });
    }

    return send(response, 404, { error: "unhandled mock route", path: url.pathname, method: request.method });
  });
}

async function listen(server) {
  await new Promise((resolve) => server.listen(notionPort, "127.0.0.1", resolve));
}

async function close(server) {
  await new Promise((resolve) => server.close(resolve));
}

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { response, body };
}

async function post(path, body, headers = {}) {
  return request(path, { method: "POST", body: JSON.stringify(body), headers });
}

async function waitForApp(child) {
  const timeoutAt = Date.now() + 45_000;
  while (Date.now() < timeoutAt) {
    if (child.exitCode !== null) throw new Error(`Next server exited with ${child.exitCode}`);
    try {
      const response = await fetch(`${baseUrl}/`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Timed out waiting for Next server.");
}

function findPageByEmail(email) {
  return [...pages.values()].find((page) => page.properties.Email?.email === email);
}

function childText(block) {
  const richText = block[block.type]?.rich_text ?? [];
  return richText.map((item) => item.plain_text ?? item.text?.content ?? "").join("");
}

async function run() {
  const mockServer = createMockServer();
  await listen(mockServer);

  const child = spawn("npm", ["run", "start", "--", "-p", String(appPort)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      WAITLIST_STORAGE: "notion",
      NOTION_TOKEN: "mock-token",
      NOTION_DATABASE_ID: databaseId,
      NOTION_API_BASE_URL: notionBaseUrl,
      NOTION_WORKSPACE_ID: "mock-workspace",
      WAITLIST_NOTIFY_ENDPOINT: `http://127.0.0.1:${notionPort}/notify`,
      WAITLIST_NOTIFY_SECRET: notifySecret,
      EXPORT_TOKEN: token,
      NOTIFY_REPLAY_TOKEN: token,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let childOutput = "";
  child.stdout.on("data", (chunk) => {
    childOutput += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    childOutput += chunk.toString();
  });

  try {
    await waitForApp(child);

    const email = `notion-primary-${runId}@example.com`;
    const signup = await post("/api/waitlist?utm_source=qa", {
      email,
      source: "qa-notion",
      utm: { source: "qa", campaign: runId },
    });
    if (!signup.response.ok) console.error(childOutput);
    assert(signup.response.ok, `Email-only signup should succeed. ${signup.response.status} ${JSON.stringify(signup.body)}`);
    assert(pages.size === 1, "Email-only signup should create one Notion prospect.");
    const primaryPage = findPageByEmail(email);
    assert(primaryPage, "Primary Notion page missing.");
    assert(primaryPage.properties["Survey Status"].select.name === "Pending", "Survey status should be Pending.");
    assert(notifyEvents.some((event) => event.body.eventType === "prospect.created"), "prospect.created was not emitted.");
    assert(transientPageCreateFailures === 0, "Transient 429 path was not exercised.");

    const duplicate = await post("/api/waitlist", { email });
    assert(duplicate.response.ok, "Duplicate signup should succeed.");
    assert(pages.size === 1, "Duplicate signup should not create another Notion prospect.");

    const personId = signup.body.person.id;
    const survey = await post("/api/survey", {
      personId,
      responses: [
        { questionId: "role", answer: "founder" },
        { questionId: "problem", answer: "A custom free-text validation problem." },
        { questionId: "signals", answer: ["paying_intent", "pilot"] },
        { questionId: "timeline", answer: "this_month" },
        { questionId: "urgency", answer: 5 },
        { questionId: "context", answer: "This should land in the Notion page body." },
      ],
    });
    assert(survey.response.ok, `Survey completion should succeed. ${survey.response.status} ${JSON.stringify(survey.body)}`);
    assert(pages.size === 1, "Survey should update the same Notion prospect.");
    assert(primaryPage.properties["Survey Status"].select.name === "Completed", "Survey status should be Completed.");
    assert(primaryPage.properties.Role.rich_text[0].plain_text === "Founder", "Structured Role mapping missing.");
    assert(primaryPage.properties["Primary Use Cases"].multi_select.length === 2, "Multi-select mapping missing.");
    assert(primaryPage.children.some((block) => childText(block).includes("A custom free-text validation problem")), "Free-text answer missing from page body.");
    assert(notifyEvents.some((event) => event.body.eventType === "prospect.survey_completed"), "prospect.survey_completed was not emitted.");

    const replay = await post(
      "/api/notify/replay",
      { personId, eventType: "prospect.survey_completed" },
      { authorization: `Bearer ${token}` },
    );
    assert(replay.response.ok, `Notify replay should succeed. ${replay.response.status} ${JSON.stringify(replay.body)}`);
    const completionEvents = notifyEvents.filter((event) => event.body.eventType === "prospect.survey_completed");
    assert(new Set(completionEvents.map((event) => event.idempotencyKey)).size === 1, "Completion event ID should be deterministic for dedupe.");
    assert(completionEvents.every((event) => String(event.signature).startsWith("sha256=")), "Notify signature missing.");

    notifyUnavailable = true;
    const notifyOutageEmail = `notion-notify-outage-${runId}@example.com`;
    const notifyOutage = await post("/api/waitlist", { email: notifyOutageEmail });
    assert(notifyOutage.response.ok, "Notify outage should not block Notion persistence.");
    assert(findPageByEmail(notifyOutageEmail), "Notion page missing during notify outage.");
    notifyUnavailable = false;

    hardFailNotion = true;
    const hardFail = await post("/api/waitlist", { email: `notion-hard-fail-${runId}@example.com` });
    assert(hardFail.response.status >= 500, "Hard Notion failure should not return durable success.");
    hardFailNotion = false;

    console.log(
      JSON.stringify(
        {
          ok: true,
          pages: pages.size,
          notifyEvents: notifyEvents.map((event) => event.body.eventType),
          primaryProspectId: personId,
        },
        null,
        2,
      ),
    );
  } finally {
    if (process.exitCode) {
      console.error(childOutput);
    }
    child.kill("SIGTERM");
    await close(mockServer);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
