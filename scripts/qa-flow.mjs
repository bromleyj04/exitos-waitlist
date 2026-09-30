const baseUrl = process.env.QA_BASE_URL ?? "http://localhost:3000";
const exportToken = process.env.EXPORT_TOKEN ?? "";
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function post(path, body) {
  return request(path, { method: "POST", body: JSON.stringify(body) });
}

async function getExport() {
  return request("/api/export", {
    headers: exportToken ? { Authorization: `Bearer ${exportToken}` } : {},
  });
}

async function run() {
  const primaryEmail = `qa-primary-${runId}@example.com`;
  const referredEmail = `qa-referred-${runId}@example.com`;

  const malformed = await post("/api/waitlist", { email: "not-an-email" });
  assert(malformed.response.status === 400, "Malformed email should return 400.");

  const primarySignup = await post("/api/waitlist?utm_source=qa", {
    email: primaryEmail,
    source: "qa-script",
    utm: { source: "qa", campaign: runId },
  });
  assert(primarySignup.response.ok, "Primary signup failed.");
  assert(primarySignup.body.person.email === primaryEmail, "Primary signup email mismatch.");
  assert(primarySignup.body.person.referralCode, "Primary referral code missing.");

  const duplicateSignup = await post("/api/waitlist", { email: primaryEmail });
  assert(duplicateSignup.response.ok, "Duplicate signup should return existing person.");
  assert(duplicateSignup.body.person.id === primarySignup.body.person.id, "Duplicate signup created a new person.");

  const startSurvey = await post("/api/survey/start", { personId: primarySignup.body.person.id });
  assert(startSurvey.response.ok, "Survey start failed.");

  const invalidSurvey = await post("/api/survey", { personId: primarySignup.body.person.id, responses: [{ questionId: "bad" }] });
  assert(invalidSurvey.response.status === 400, "Malformed survey should return 400.");

  const survey = await post("/api/survey", {
    personId: primarySignup.body.person.id,
    responses: [
      { questionId: "role", answer: "founder" },
      { questionId: "problem", answer: "Validate demand before building too much." },
      { questionId: "signals", answer: ["paying_intent", "referrals"] },
      { questionId: "timeline", answer: "this_month" },
      { questionId: "urgency", answer: 5 },
      { questionId: "context", answer: "QA flow response." },
    ],
  });
  assert(survey.response.ok, "Survey completion failed.");

  const referredSignup = await post("/api/waitlist", {
    email: referredEmail,
    ref: primarySignup.body.person.referralCode,
    source: "qa-referral",
  });
  assert(referredSignup.response.ok, "Referred signup failed.");
  assert(
    referredSignup.body.person.referredByPersonId === primarySignup.body.person.id,
    "Referred signup was not attributed to primary person.",
  );

  const selfReferral = await post("/api/waitlist", {
    email: primaryEmail,
    ref: primarySignup.body.person.referralCode,
  });
  assert(selfReferral.response.ok, "Self-referral duplicate request failed.");

  const event = await post("/api/events", {
    name: "followup_interest",
    personId: primarySignup.body.person.id,
    properties: { kind: "qa" },
  });
  assert(event.response.ok, "Analytics event failed.");

  const exported = await getExport();
  assert(exported.response.ok, "Export failed.");
  const people = exported.body.people.filter((person) => person.email.includes(runId));
  const responses = exported.body.surveyResponses.filter((response) => response.personId === primarySignup.body.person.id);
  const referrals = exported.body.referrals.filter((referral) => referral.referrerPersonId === primarySignup.body.person.id);
  const events = exported.body.events.filter(
    (item) =>
      item.personId === primarySignup.body.person.id ||
      item.personId === referredSignup.body.person.id ||
      item.properties?.campaign === runId,
  );

  assert(people.length === 2, `Expected 2 QA people, found ${people.length}.`);
  assert(responses.length === 6, `Expected 6 survey responses, found ${responses.length}.`);
  assert(referrals.length === 1, `Expected 1 referral, found ${referrals.length}.`);
  assert(events.some((item) => item.name === "waitlist_submit"), "waitlist_submit event missing.");
  assert(events.some((item) => item.name === "survey_completed"), "survey_completed event missing.");
  assert(events.some((item) => item.name === "referral_signup"), "referral_signup event missing.");
  assert(events.some((item) => item.name === "followup_interest"), "followup_interest event missing.");

  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    primaryEmail,
    referredEmail,
    referralCode: primarySignup.body.person.referralCode,
    people: people.length,
    responses: responses.length,
    referrals: referrals.length,
    events: events.map((item) => item.name),
  }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
