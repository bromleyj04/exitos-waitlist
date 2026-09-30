import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, ".data", "waitlist.json");
const outputDir = path.join(root, "exports");

function csvEscape(value) {
  if (value === undefined || value === null) return "";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  return [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n");
}

try {
  const data = JSON.parse(await readFile(source, "utf8"));
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, "people.csv"), `${toCsv(data.people ?? [])}\n`);
  await writeFile(path.join(outputDir, "survey-responses.csv"), `${toCsv(data.surveyResponses ?? [])}\n`);
  await writeFile(path.join(outputDir, "referrals.csv"), `${toCsv(data.referrals ?? [])}\n`);
  await writeFile(path.join(outputDir, "events.csv"), `${toCsv(data.events ?? [])}\n`);
  console.log("Exported local development data to ./exports");
} catch (error) {
  console.error("Could not export local data. Run the app with dev file storage first.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

