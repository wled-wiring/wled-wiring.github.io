import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import i18next from "../src/i18n";
import { runDiagramCheck } from "../src/check/runDiagramCheck";
import { runSimulation } from "../src/simulation/runSimulation";
import type {
  LedSimulationColorMode,
  SimulationCheckIssue,
  SimulationResult,
  SimulationSettings,
} from "../src/simulation/simulationTypes";

await i18next.changeLanguage("en");

type DiagramNode = {
  id: string;
  data?: {
    technicalID?: string;
    handles?: Array<{ hid: string; functions?: string[] }>;
    repeatedHandleArray?: Array<{ hid: string; functions?: string[] }>;
  };
};

type DiagramEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  data?: {
    label?: string;
    testLabel?: string;
    simulationLabel?: string;
  };
};

type DiagramExport = {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
};

type ExpectedPin = {
  nodeTechnicalID: string;
  handleId: string;
  voltageV?: number;
};

type ExpectedWire = {
  edgeId?: string;
  label?: string;
  currentA?: number;
  voltageDropV?: number;
};

type ExpectedLedStrip = {
  nodeTechnicalID: string;
  minDeltaVoltageV?: number;
  startVoltageDeltaVtoGNDV?: number;
  endVoltageDeltaVtoGNDV?: number;
  totalCurrentA?: number;
};

type ExpectedCheckIssue = {
  id?: string;
  severity?: SimulationCheckIssue["severity"];
  title?: string;
  descriptionIncludes?: string;
};

type LtspiceExpected = {
  case: string;
  settings?: Partial<SimulationSettings>;
  tolerance?: {
    voltageV?: number;
    currentA?: number;
    voltageDropV?: number;
  };
  expected?: {
    simulationFailure?: boolean;
    pins?: ExpectedPin[];
    wires?: ExpectedWire[];
    ledStrips?: ExpectedLedStrip[];
    checkIssues?: ExpectedCheckIssue[];
    diagramCheckIssues?: ExpectedCheckIssue[];
  };
};

type Failure = {
  caseName: string;
  target: string;
  message: string;
};

const fixtureRoot = path.join(process.cwd(), "simulation_test", "ltspice");
const defaultSettings: SimulationSettings = {
  brightnessPercent: 100,
  ledColorMode: "RGB_WHITE",
};

const readJson = <T>(filePath: string): T => (
  JSON.parse(readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")) as T
);

const isColorMode = (value: unknown): value is LedSimulationColorMode => (
  value === "R" ||
  value === "G" ||
  value === "B" ||
  value === "RGB_WHITE" ||
  value === "SEPARATE_WHITE" ||
  value === "SEPARATE_AND_RGB_WHITE"
);

const settingsFromExpected = (expected: LtspiceExpected): SimulationSettings => ({
  brightnessPercent: typeof expected.settings?.brightnessPercent === "number"
    ? expected.settings.brightnessPercent
    : defaultSettings.brightnessPercent,
  ledColorMode: isColorMode(expected.settings?.ledColorMode)
    ? expected.settings.ledColorMode
    : defaultSettings.ledColorMode,
});

const fail = (caseName: string, target: string, message: string): Failure => ({
  caseName,
  target,
  message,
});

const compareNumber = (
  failures: Failure[],
  caseName: string,
  target: string,
  actual: number | undefined,
  expected: number | undefined,
  tolerance: number,
) => {
  if(expected === undefined) return;

  if(actual === undefined || !Number.isFinite(actual)) {
    failures.push(fail(caseName, target, `missing actual value, expected ${expected}`));
    return;
  }

  const delta = Math.abs(actual - expected);
  if(delta > tolerance) {
    failures.push(fail(
      caseName,
      target,
      `expected ${expected}, got ${actual} (delta ${delta}, tolerance ${tolerance})`,
    ));
  }
};

const nodesByTechnicalId = (diagram: DiagramExport, technicalID: string) => (
  diagram.nodes.filter((node) => node.data?.technicalID === technicalID)
);

const findPinVoltage = (
  result: SimulationResult,
  nodeId: string,
  handleId: string,
) => result.pinResults.find((pin) => (
  pin.nodeId === nodeId && pin.handleId === handleId
))?.voltageV;

const findVirtualOrPinVoltage = (
  result: SimulationResult,
  nodeId: string,
  handleId: string,
) => (
  result.virtualPinResults.find((pin) => (
    pin.nodeId === nodeId && pin.handleId === handleId
  ))?.voltageV ?? findPinVoltage(result, nodeId, handleId)
);

const edgeLabel = (edge: DiagramEdge) => (
  edge.data?.testLabel ?? edge.data?.simulationLabel ?? edge.data?.label
);

const finiteWireResultsInDiagramOrder = (
  diagram: DiagramExport,
  result: SimulationResult,
) => {
  const resultByEdgeId = new Map(result.wireResults.map((wire) => [wire.edgeId, wire]));
  return diagram.edges
    .map((edge) => resultByEdgeId.get(edge.id))
    .filter((wire) => (
      wire?.currentA !== undefined &&
      Number.isFinite(wire.currentA) &&
      wire.voltageDropV !== undefined &&
      Number.isFinite(wire.voltageDropV)
    ));
};

const resolveExpectedWireResult = (
  diagram: DiagramExport,
  result: SimulationResult,
  expectedWire: ExpectedWire,
  fallbackIndex: number,
) => {
  if(expectedWire.edgeId) {
    return result.wireResults.find((wire) => wire.edgeId === expectedWire.edgeId);
  }

  if(expectedWire.label) {
    const edge = diagram.edges.find((candidate) => edgeLabel(candidate) === expectedWire.label);
    if(edge) {
      return result.wireResults.find((wire) => wire.edgeId === edge.id);
    }
  }

  return finiteWireResultsInDiagramOrder(diagram, result)[fallbackIndex];
};

const handleFunctions = (
  diagram: DiagramExport,
  nodeId: string,
  handleId: string | undefined,
) => {
  if(!handleId) return [];

  const node = diagram.nodes.find((candidate) => candidate.id === nodeId);
  const handles = [
    ...(node?.data?.handles ?? []),
    ...(node?.data?.repeatedHandleArray ?? []),
  ];
  return handles.find((handle) => handle.hid === handleId)?.functions ?? [];
};

const isSupplyHandle = (
  diagram: DiagramExport,
  nodeId: string,
  handleId: string | undefined,
) => handleFunctions(diagram, nodeId, handleId).includes("suppl_in");

const totalSupplyFeedCurrent = (
  diagram: DiagramExport,
  result: SimulationResult,
  nodeId: string,
) => {
  const resultByEdgeId = new Map(result.wireResults.map((wire) => [wire.edgeId, wire]));
  let totalCurrentA = 0;
  let hasValue = false;

  diagram.edges.forEach((edge) => {
    const sourceIsSupplyFeed = edge.source === nodeId && isSupplyHandle(diagram, edge.source, edge.sourceHandle);
    const targetIsSupplyFeed = edge.target === nodeId && isSupplyHandle(diagram, edge.target, edge.targetHandle);
    if(!sourceIsSupplyFeed && !targetIsSupplyFeed) return;

    const wireResult = resultByEdgeId.get(edge.id);
    if(wireResult?.currentA === undefined || !Number.isFinite(wireResult.currentA)) return;

    totalCurrentA += Math.abs(wireResult.currentA);
    hasValue = true;
  });

  return hasValue ? totalCurrentA : undefined;
};

const comparePins = (
  failures: Failure[],
  caseName: string,
  diagram: DiagramExport,
  result: SimulationResult,
  expectedPins: ExpectedPin[],
  voltageTolerance: number,
) => {
  const usedNodeIds = new Set<string>();

  expectedPins.forEach((expectedPin, index) => {
    const node = nodesByTechnicalId(diagram, expectedPin.nodeTechnicalID)
      .find((candidate) => !usedNodeIds.has(`${candidate.id}:${expectedPin.handleId}`));
    const target = `pins[${index}] ${expectedPin.nodeTechnicalID}.${expectedPin.handleId}`;

    if(!node) {
      failures.push(fail(caseName, target, "matching node was not found"));
      return;
    }

    usedNodeIds.add(`${node.id}:${expectedPin.handleId}`);
    compareNumber(
      failures,
      caseName,
      `${target}.voltageV`,
      findPinVoltage(result, node.id, expectedPin.handleId),
      expectedPin.voltageV,
      voltageTolerance,
    );
  });
};

const compareWires = (
  failures: Failure[],
  caseName: string,
  diagram: DiagramExport,
  result: SimulationResult,
  expectedWires: ExpectedWire[],
  currentTolerance: number,
  voltageDropTolerance: number,
) => {
  expectedWires.forEach((expectedWire, index) => {
    const wireResult = resolveExpectedWireResult(diagram, result, expectedWire, index);
    const target = expectedWire.edgeId
      ? `wires[edge:${expectedWire.edgeId}]`
      : expectedWire.label
        ? `wires[${expectedWire.label}]`
        : `wires[${index}]`;

    if(!wireResult) {
      failures.push(fail(caseName, target, "matching simulated wire was not found"));
      return;
    }

    compareNumber(
      failures,
      caseName,
      `${target}.currentA`,
      wireResult.currentA !== undefined ? Math.abs(wireResult.currentA) : undefined,
      expectedWire.currentA,
      currentTolerance,
    );
    compareNumber(
      failures,
      caseName,
      `${target}.voltageDropV`,
      wireResult.voltageDropV !== undefined ? Math.abs(wireResult.voltageDropV) : undefined,
      expectedWire.voltageDropV,
      voltageDropTolerance,
    );
  });
};

const compareLedStrips = (
  failures: Failure[],
  caseName: string,
  diagram: DiagramExport,
  result: SimulationResult,
  expectedLedStrips: ExpectedLedStrip[],
  voltageTolerance: number,
  currentTolerance: number,
) => {
  const usedNodeIds = new Set<string>();

  expectedLedStrips.forEach((expectedStrip, index) => {
    const node = nodesByTechnicalId(diagram, expectedStrip.nodeTechnicalID)
      .find((candidate) => !usedNodeIds.has(candidate.id));
    const target = `ledStrips[${index}] ${expectedStrip.nodeTechnicalID}`;

    if(!node) {
      failures.push(fail(caseName, target, "matching LED strip node was not found"));
      return;
    }

    usedNodeIds.add(node.id);

    const summary = result.ledStripVoltageSummaryResults.find((candidate) => candidate.nodeId === node.id);
    compareNumber(
      failures,
      caseName,
      `${target}.minDeltaVoltageV`,
      summary?.minDeltaVoltageV,
      expectedStrip.minDeltaVoltageV,
      voltageTolerance,
    );

    const startSupply = findVirtualOrPinVoltage(result, node.id, "24V_start");
    const startGnd = findVirtualOrPinVoltage(result, node.id, "GND_start");
    const endSupply = findVirtualOrPinVoltage(result, node.id, "24V_end");
    const endGnd = findVirtualOrPinVoltage(result, node.id, "GND_end");

    compareNumber(
      failures,
      caseName,
      `${target}.startVoltageDeltaVtoGNDV`,
      startSupply !== undefined && startGnd !== undefined ? startSupply - startGnd : undefined,
      expectedStrip.startVoltageDeltaVtoGNDV,
      voltageTolerance,
    );
    compareNumber(
      failures,
      caseName,
      `${target}.endVoltageDeltaVtoGNDV`,
      endSupply !== undefined && endGnd !== undefined ? endSupply - endGnd : undefined,
      expectedStrip.endVoltageDeltaVtoGNDV,
      voltageTolerance,
    );
    compareNumber(
      failures,
      caseName,
      `${target}.totalCurrentA`,
      totalSupplyFeedCurrent(diagram, result, node.id),
      expectedStrip.totalCurrentA,
      currentTolerance,
    );
  });
};

const issueMatchesExpectation = (
  issue: SimulationCheckIssue,
  expectedIssue: ExpectedCheckIssue,
) => (
  (expectedIssue.id === undefined || issue.id === expectedIssue.id) &&
  (expectedIssue.severity === undefined || issue.severity === expectedIssue.severity) &&
  (expectedIssue.title === undefined || issue.title === expectedIssue.title) &&
  (
    expectedIssue.descriptionIncludes === undefined ||
    issue.description.includes(expectedIssue.descriptionIncludes)
  )
);

const issueLabel = (issue: SimulationCheckIssue) => (
  `${issue.severity}:${issue.id}:${issue.title}`
);

const compareCheckIssues = (
  failures: Failure[],
  caseName: string,
  result: SimulationResult,
  expectedCheckIssues: ExpectedCheckIssue[] | undefined,
) => {
  if(expectedCheckIssues === undefined) return;

  const usedIssueIndexes = new Set<number>();

  expectedCheckIssues.forEach((expectedIssue, index) => {
    const issueIndex = result.checkIssues.findIndex((candidate, candidateIndex) => (
      !usedIssueIndexes.has(candidateIndex) &&
      issueMatchesExpectation(candidate, expectedIssue)
    ));

    if(issueIndex < 0) {
      failures.push(fail(
        caseName,
        `checkIssues[${index}]`,
        `matching issue was not found; actual issues: ${result.checkIssues.map(issueLabel).join(" | ") || "(none)"}`,
      ));
      return;
    }

    usedIssueIndexes.add(issueIndex);
  });

  if(result.checkIssues.length !== expectedCheckIssues.length) {
    const unexpectedIssues = result.checkIssues
      .filter((_, index) => !usedIssueIndexes.has(index))
      .map(issueLabel);

    failures.push(fail(
      caseName,
      "checkIssues",
      `expected ${expectedCheckIssues.length} issue(s), got ${result.checkIssues.length}; unexpected: ${unexpectedIssues.join(" | ") || "(none)"}`,
    ));
  }
};

const compareCase = (casePath: string) => {
  const caseName = path.basename(casePath);
  const diagram = readJson<DiagramExport>(path.join(casePath, "diagram.json"));
  const expected = readJson<LtspiceExpected>(path.join(casePath, "expected.json"));
  const settings = settingsFromExpected(expected);
  const diagramCheckIssues = runDiagramCheck(JSON.stringify(diagram));
  const simulation = runSimulation(diagram.nodes, diagram.edges, settings);
  const failures: Failure[] = [];

  compareCheckIssues(
    failures,
    caseName,
    {
      checkIssues: diagramCheckIssues,
    } as SimulationResult,
    expected.expected?.diagramCheckIssues,
  );

  if(!simulation.ok) {
    if(expected.expected?.simulationFailure) {
      compareCheckIssues(
        failures,
        caseName,
        {
          checkIssues: simulation.issues,
        } as SimulationResult,
        expected.expected?.checkIssues,
      );
      return failures;
    }

    failures.push(fail(
      caseName,
      "simulation",
      `simulation failed: ${simulation.issues.map((item) => item.description).join(" | ")}`,
    ));
    return failures;
  }

  if(expected.expected?.simulationFailure) {
    failures.push(fail(caseName, "simulation", "simulation succeeded, but failure was expected"));
    return failures;
  }

  const voltageTolerance = expected.tolerance?.voltageV ?? 0.001;
  const currentTolerance = expected.tolerance?.currentA ?? 0.001;
  const voltageDropTolerance = expected.tolerance?.voltageDropV ?? voltageTolerance;

  comparePins(
    failures,
    caseName,
    diagram,
    simulation.result,
    expected.expected?.pins ?? [],
    voltageTolerance,
  );
  compareWires(
    failures,
    caseName,
    diagram,
    simulation.result,
    expected.expected?.wires ?? [],
    currentTolerance,
    voltageDropTolerance,
  );
  compareLedStrips(
    failures,
    caseName,
    diagram,
    simulation.result,
    expected.expected?.ledStrips ?? [],
    voltageTolerance,
    currentTolerance,
  );
  compareCheckIssues(
    failures,
    caseName,
    simulation.result,
    expected.expected?.checkIssues,
  );

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

console.log(`LTspice regression cases: ${casePaths.length}`);

if(failures.length === 0) {
  console.log("All LTspice regression checks passed.");
} else {
  console.error(`LTspice regression failures: ${failures.length}`);
  failures.forEach((item) => {
    console.error(`[${item.caseName}] ${item.target}: ${item.message}`);
  });
  process.exitCode = 1;
}
