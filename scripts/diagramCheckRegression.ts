import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import i18next from "../src/i18n";
import { runDiagramCheck } from "../src/check/runDiagramCheck";
import type { DiagramCheckIssue } from "../src/check/diagramCheckTypes";

await i18next.changeLanguage("en");

type ExpectedIssue = {
  idIncludes?: string;
  ruleId?: string;
  severity?: DiagramCheckIssue["severity"];
  descriptionIncludes?: string;
};

type DiagramCheckExpected = {
  case: string;
  filterIssueIdIncludes?: string[];
  filterRuleIds?: string[];
  expectedIssues: ExpectedIssue[];
};

type Failure = {
  caseName: string;
  target: string;
  message: string;
};

const fixtureRoot = path.join(process.cwd(), "simulation_test", "diagram_checks");

const readJson = <T>(filePath: string): T => (
  JSON.parse(readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")) as T
);

const fail = (caseName: string, target: string, message: string): Failure => ({
  caseName,
  target,
  message,
});

const issueMatchesExpectation = (
  issue: DiagramCheckIssue,
  expectedIssue: ExpectedIssue,
) => (
  (expectedIssue.ruleId === undefined || issue.ruleId === expectedIssue.ruleId) &&
  (expectedIssue.idIncludes === undefined || issue.id.includes(expectedIssue.idIncludes)) &&
  (expectedIssue.severity === undefined || issue.severity === expectedIssue.severity) &&
  (
    expectedIssue.descriptionIncludes === undefined ||
    issue.description.includes(expectedIssue.descriptionIncludes)
  )
);

const issueLabel = (issue: DiagramCheckIssue) => (
  `${issue.severity}:${issue.ruleId ?? issue.id}:${issue.description}`
);

const compareCase = (casePath: string) => {
  const caseName = path.basename(casePath);
  const diagram = readJson<unknown>(path.join(casePath, "diagram.json"));
  const expected = readJson<DiagramCheckExpected>(path.join(casePath, "expected.json"));
  const issues = runDiagramCheck(JSON.stringify(diagram), { deduplicationMode: "diagnostic" });
  const filteredByRule = expected.filterRuleIds
    ? issues.filter((issue) => expected.filterRuleIds?.includes(issue.ruleId))
    : issues;
  const filteredIssues = expected.filterIssueIdIncludes
    ? filteredByRule.filter((issue) => (
      expected.filterIssueIdIncludes?.some((idPart) => issue.id.includes(idPart))
    ))
    : filteredByRule;
  const failures: Failure[] = [];
  const usedIssueIndexes = new Set<number>();

  expected.expectedIssues.forEach((expectedIssue, index) => {
    const issueIndex = filteredIssues.findIndex((candidate, candidateIndex) => (
      !usedIssueIndexes.has(candidateIndex) &&
      issueMatchesExpectation(candidate, expectedIssue)
    ));

    if(issueIndex < 0) {
      failures.push(fail(
        caseName,
        `expectedIssues[${index}]`,
        `matching issue was not found; actual issues: ${filteredIssues.map(issueLabel).join(" | ") || "(none)"}`,
      ));
      return;
    }

    usedIssueIndexes.add(issueIndex);
  });

  if(filteredIssues.length !== expected.expectedIssues.length) {
    const unexpectedIssues = filteredIssues
      .filter((_, index) => !usedIssueIndexes.has(index))
      .map(issueLabel);

    failures.push(fail(
      caseName,
      "issues",
      `expected ${expected.expectedIssues.length} issue(s), got ${filteredIssues.length}; unexpected: ${unexpectedIssues.join(" | ") || "(none)"}`,
    ));
  }

  return failures;
};

const casePaths = readdirSync(fixtureRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(fixtureRoot, entry.name))
  .filter((casePath) => (
    existsSync(path.join(casePath, "diagram.json")) &&
    existsSync(path.join(casePath, "expected.json"))
  ))
  .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));

const failures = casePaths.flatMap(compareCase);

console.log(`Diagram-check regression cases: ${casePaths.length}`);

if(failures.length === 0) {
  console.log("All diagram-check regression checks passed.");
} else {
  console.error(`Diagram-check regression failures: ${failures.length}`);
  failures.forEach((item) => {
    console.error(`[${item.caseName}] ${item.target}: ${item.message}`);
  });
  process.exitCode = 1;
}
