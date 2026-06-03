import type { Edge, Node } from "@xyflow/react";

import i18next from "../i18n";
import type { ComponentDataType, EdgeDataType } from "../types";
import {
  DEFAULT_WIRE_AMPACITY_SETTINGS,
  type WireAmpacitySettings,
} from "../wires/wireAmpacity";
import { createSimulationWireAmpacityIssues } from "./simulationAmpacityChecks";
import { buildSimulationModel } from "./buildSimulationModel";
import { createSimulationFingerprint } from "./simulationFingerprint";
import { sparseLinearSystemSolver } from "./sparseLinearSystemSolver";
import {
  DCDC_INPUT_CURRENT_CONVERGENCE_A,
  type DcdcInputStateByElementId,
  createInitialDcdcInputStates,
  dcdcDynamicOutputCurrentLimit,
  updateDcdcInputStates,
} from "./dcdcSimulation";
import { getLedCurrentA, getLedCurrentCurveParameters } from "./ledCurrentLookups";
import { logSimulationDiodeStateChanges } from "./simulationDebug";
import type {
  LinearSystem,
  SimulationCheckIssue,
  SimulationElement,
  SimulationIssueFormattedNumber,
  SimulationIssueMessage,
  SimulationModel,
  SimulationResult,
  SimulationSettings,
} from "./simulationTypes";

export type RunSimulationResult =
  | {
      ok: true;
      model: SimulationModel;
      result: SimulationResult;
      issues: SimulationCheckIssue[];
    }
  | {
      ok: false;
      diagramFingerprint: string;
      issues: SimulationCheckIssue[];
    };

const MIN_RESISTANCE_OHM = 1e-9;
const MAX_NONLINEAR_ITERATIONS = 100;
const LED_CURRENT_CONVERGENCE_A = 0.000005;
const CONSTANT_POWER_CURRENT_CONVERGENCE_A = 0.000005;
const SOURCE_VOLTAGE_CONVERGENCE_V = 0.00005;
const DIODE_VOLTAGE_TOLERANCE_V = 0.0005;
const CURRENT_LIMIT_TOLERANCE_A = 0.0005;
const VOLTAGE_TOLERANCE_V = 0.0005;
const DEFAULT_VOLTAGE_DROP_PCT_AT_150_CURRENT = 50;
const NONLINEAR_RELAXATION = 0.35;
const LED_STRIP_VOLTAGE_DROP_WARNING_PERCENT = 80;
const LED_STRIP_VOLTAGE_DROP_ERROR_PERCENT = 40;

type VoltageSourceStamp = {
  elementId: string;
  positiveCircuitNodeId: string;
  negativeCircuitNodeId: string;
  voltageV: number;
  currentVariableIndex?: number;
};

type LinearDcModel = {
  system: LinearSystem;
  circuitNodeIndexById: Map<string, number>;
  voltageSources: VoltageSourceStamp[];
  activeCircuitNodeIds: Set<string>;
};

type LedCurrentByElementId = Map<string, number>;
type ConstantPowerCurrentByElementId = Map<string, number>;

type VoltageSourceState = {
  voltageV: number;
  wasOverloaded: boolean;
};

type VoltageSourceStateByElementId = Map<string, VoltageSourceState>;
type DiodeStateByElementId = Map<string, boolean>;

const numberParameter = (
  parameters: Record<string, string | number | boolean> | undefined,
  key: string,
) => {
  const value = parameters?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
};

const stringParameter = (
  parameters: Record<string, string | number | boolean> | undefined,
  key: string,
) => {
  const value = parameters?.[key];
  return typeof value === "string" ? value : undefined;
};

const issue = (
  id: string,
  title: string | SimulationIssueText,
  description: string | SimulationIssueText,
  targets?: SimulationCheckIssue["targets"],
  severity: SimulationCheckIssue["severity"] = "error",
): SimulationCheckIssue => ({
  id,
  severity,
  title: issueTextFallback(title),
  description: issueTextFallback(description),
  titleMessage: issueTextMessage(title),
  descriptionMessage: issueTextMessage(description),
  targets,
});

type SimulationIssueText = SimulationIssueMessage & {
  text: string;
};

const issueTextFallback = (text: string | SimulationIssueText) => (
  typeof text === "string" ? text : text.text
);

const issueTextMessage = (text: string | SimulationIssueText) => (
  typeof text === "string"
    ? undefined
    : {
      key: text.key,
      options: text.options,
    }
);

const simulationIssueText = (
  key: string,
  options?: Record<string, string | number | SimulationIssueFormattedNumber>,
): SimulationIssueText => {
  const translationKey = `sidebar.simulation.issues.${key}`;
  const fallbackT = i18next.getFixedT("en", "main");
  return {
    key: translationKey,
    options,
    text: String(fallbackT(translationKey, formatSimulationIssueOptions(options))),
  };
};

const simulationIssueNumber = (
  value: number,
  fractionDigits: number,
): SimulationIssueFormattedNumber => ({
  value,
  minimumFractionDigits: fractionDigits,
  maximumFractionDigits: fractionDigits,
});

const simulationIssueVoltage = (value: number) => simulationIssueNumber(value, 2);
const simulationIssueCurrent = (value: number) => simulationIssueNumber(value, 2);

const formatSimulationIssueOptions = (
  options: Record<string, string | number | SimulationIssueFormattedNumber> | undefined,
) => {
  if(!options) return undefined;

  return Object.fromEntries(Object.entries(options).map(([key, value]) => {
    if(typeof value !== "object") return [key, value];

    return [
      key,
      new Intl.NumberFormat("en", {
        minimumFractionDigits: value.minimumFractionDigits,
        maximumFractionDigits: value.maximumFractionDigits,
      }).format(value.value),
    ];
  }));
};

const addEntry = (
  entries: LinearSystem["entries"],
  row: number | undefined,
  column: number | undefined,
  value: number,
) => {
  if(row === undefined || column === undefined || value === 0) return;
  entries.push({row, column, value});
};

const addRhs = (
  rhs: number[],
  row: number | undefined,
  value: number,
) => {
  if(row === undefined || value === 0) return;
  rhs[row] += value;
};

const stampResistor = (
  entries: LinearSystem["entries"],
  nodeIndexById: Map<string, number>,
  aCircuitNodeId: string | undefined,
  bCircuitNodeId: string | undefined,
  resistanceOhm: number | undefined,
) => {
  if(!aCircuitNodeId || !bCircuitNodeId || resistanceOhm === undefined) return;
  if(!Number.isFinite(resistanceOhm) || resistanceOhm <= 0) return;

  const conductance = 1 / Math.max(resistanceOhm, MIN_RESISTANCE_OHM);
  const a = nodeIndexById.get(aCircuitNodeId);
  const b = nodeIndexById.get(bCircuitNodeId);

  addEntry(entries, a, a, conductance);
  addEntry(entries, b, b, conductance);
  addEntry(entries, a, b, -conductance);
  addEntry(entries, b, a, -conductance);
};

const stampCurrentSource = (
  rhs: number[],
  nodeIndexById: Map<string, number>,
  positiveCircuitNodeId: string | undefined,
  negativeCircuitNodeId: string | undefined,
  currentA: number | undefined,
) => {
  if(!positiveCircuitNodeId || !negativeCircuitNodeId || currentA === undefined) return;
  if(!Number.isFinite(currentA)) return;

  addRhs(rhs, nodeIndexById.get(positiveCircuitNodeId), -currentA);
  addRhs(rhs, nodeIndexById.get(negativeCircuitNodeId), currentA);
};

const stampVoltageSource = (
  entries: LinearSystem["entries"],
  rhs: number[],
  nodeIndexById: Map<string, number>,
  source: VoltageSourceStamp,
) => {
  const variableIndex = source.currentVariableIndex;
  if(variableIndex === undefined) return;

  const positive = nodeIndexById.get(source.positiveCircuitNodeId);
  const negative = nodeIndexById.get(source.negativeCircuitNodeId);

  addEntry(entries, positive, variableIndex, 1);
  addEntry(entries, negative, variableIndex, -1);
  addEntry(entries, variableIndex, positive, 1);
  addEntry(entries, variableIndex, negative, -1);
  addRhs(rhs, variableIndex, source.voltageV);
};

const createCircuitNodeIndexById = (model: SimulationModel) => {
  const nodeIndexById = new Map<string, number>();
  model.circuitNodes.forEach((node) => {
    if(node.id === model.referenceNodeId) return;
    nodeIndexById.set(node.id, nodeIndexById.size);
  });
  return nodeIndexById;
};

const getLedCurrentForElement = (
  element: SimulationElement,
  settings: SimulationSettings,
  voltageV: number,
) => {
  const curveId = stringParameter(element.parameters, "currentCurve");
  const currentScaleFactor = numberParameter(element.parameters, "currentScaleFactor") ?? 1;
  if(!curveId) return undefined;

  const result = getLedCurrentA(
    curveId,
    settings.ledColorMode,
    voltageV,
    settings.brightnessPercent / 100,
  );
  return result.ok ? result.currentA * currentScaleFactor : undefined;
};

const nominalLedVoltage = (element: SimulationElement) => (
  stringParameter(element.parameters, "ledType")?.includes("24V") ? 24 : 5
);

const createInitialLedCurrents = (model: SimulationModel): LedCurrentByElementId => {
  const currents = new Map<string, number>();

  model.elements.forEach((element) => {
    if(element.type !== "digitalLed") return;

    const currentA = getLedCurrentForElement(element, model.settings, nominalLedVoltage(element));
    if(currentA !== undefined) {
      currents.set(element.id, currentA);
    }
  });

  return currents;
};

const createLedCurrentsFromVoltages = (
  model: SimulationModel,
  circuitVoltages: Map<string, number>,
): LedCurrentByElementId => {
  const currents = new Map<string, number>();

  model.elements.forEach((element) => {
    if(element.type !== "digitalLed") return;

    const supplyVoltage = circuitVoltages.get(element.terminals.supplyOut);
    const gndVoltage = circuitVoltages.get(element.terminals.gndOut);
    const voltageV = supplyVoltage !== undefined && gndVoltage !== undefined
      ? supplyVoltage - gndVoltage
      : nominalLedVoltage(element);
    const currentA = getLedCurrentForElement(element, model.settings, voltageV);

    if(currentA !== undefined) {
      currents.set(element.id, currentA);
    }
  });

  return currents;
};

const maxLedCurrentDeltaA = (
  current: LedCurrentByElementId,
  next: LedCurrentByElementId,
) => {
  const elementIds = new Set([...current.keys(), ...next.keys()]);
  let maxDeltaA = 0;

  elementIds.forEach((elementId) => {
    maxDeltaA = Math.max(maxDeltaA, Math.abs((current.get(elementId) ?? 0) - (next.get(elementId) ?? 0)));
  });

  return maxDeltaA;
};

const relaxedLedCurrents = (
  current: LedCurrentByElementId,
  next: LedCurrentByElementId,
): LedCurrentByElementId => {
  const elementIds = new Set([...current.keys(), ...next.keys()]);
  const relaxed = new Map<string, number>();

  elementIds.forEach((elementId) => {
    const currentA = current.get(elementId) ?? 0;
    const nextA = next.get(elementId) ?? 0;
    relaxed.set(elementId, currentA + (nextA - currentA) * NONLINEAR_RELAXATION);
  });

  return relaxed;
};

const constantPowerCurrentForElement = (
  element: SimulationElement,
  voltageV: number,
) => {
  const powerW = numberParameter(element.parameters, "powerW");
  const minVoltageV = numberParameter(element.parameters, "minVoltageV") ?? 1;
  if(powerW === undefined || minVoltageV <= 0) return undefined;

  return powerW / Math.max(voltageV, minVoltageV);
};

const createInitialConstantPowerCurrents = (model: SimulationModel): ConstantPowerCurrentByElementId => {
  const currents = new Map<string, number>();

  model.elements.forEach((element) => {
    if(element.type !== "constantPowerSink") return;

    const minVoltageV = numberParameter(element.parameters, "minVoltageV") ?? 1;
    const currentA = constantPowerCurrentForElement(element, minVoltageV);
    if(currentA !== undefined) {
      currents.set(element.id, currentA);
    }
  });

  return currents;
};

const createConstantPowerCurrentsFromVoltages = (
  model: SimulationModel,
  circuitVoltages: Map<string, number>,
): ConstantPowerCurrentByElementId => {
  const currents = new Map<string, number>();

  model.elements.forEach((element) => {
    if(element.type !== "constantPowerSink") return;

    const positiveVoltage = circuitVoltages.get(element.terminals.positive);
    const negativeVoltage = circuitVoltages.get(element.terminals.negative);
    const voltageV = positiveVoltage !== undefined && negativeVoltage !== undefined
      ? positiveVoltage - negativeVoltage
      : numberParameter(element.parameters, "minVoltageV") ?? 1;
    const currentA = constantPowerCurrentForElement(element, voltageV);

    if(currentA !== undefined) {
      currents.set(element.id, currentA);
    }
  });

  return currents;
};

const maxCurrentDeltaA = (
  current: Map<string, number>,
  next: Map<string, number>,
) => {
  const elementIds = new Set([...current.keys(), ...next.keys()]);
  let maxDeltaA = 0;

  elementIds.forEach((elementId) => {
    maxDeltaA = Math.max(maxDeltaA, Math.abs((current.get(elementId) ?? 0) - (next.get(elementId) ?? 0)));
  });

  return maxDeltaA;
};

const relaxedCurrents = <CurrentMap extends Map<string, number>>(
  current: CurrentMap,
  next: CurrentMap,
): CurrentMap => {
  const elementIds = new Set([...current.keys(), ...next.keys()]);
  const relaxed = new Map<string, number>();

  elementIds.forEach((elementId) => {
    const currentA = current.get(elementId) ?? 0;
    const nextA = next.get(elementId) ?? 0;
    relaxed.set(elementId, currentA + (nextA - currentA) * NONLINEAR_RELAXATION);
  });

  return relaxed as CurrentMap;
};

const voltageSourceNominalVoltage = (element: SimulationElement) => {
  if(element.type === "voltageSource") {
    return numberParameter(element.parameters, "voltageV");
  }

  if(element.type === "dcdcConverter") {
    return numberParameter(element.parameters, "outputVoltageV");
  }

  return undefined;
};

const voltageSourceCurrentLimit = (element: SimulationElement) => {
  if(element.type === "voltageSource") {
    return numberParameter(element.parameters, "currentLimitA");
  }

  if(element.type === "dcdcConverter") {
    return numberParameter(element.parameters, "outputCurrentLimitA");
  }

  return undefined;
};

const voltageSourceEffectiveCurrentLimit = (
  element: SimulationElement,
  dcdcInputStates: DcdcInputStateByElementId = new Map(),
) => {
  const fixedLimitA = voltageSourceCurrentLimit(element);
  const dynamicDcdcLimitA = dcdcDynamicOutputCurrentLimit(element, dcdcInputStates);
  const limits = [fixedLimitA, dynamicDcdcLimitA].filter((limit): limit is number => (
    limit !== undefined && Number.isFinite(limit) && limit >= 0
  ));

  return limits.length > 0 ? Math.min(...limits) : undefined;
};

const createInitialVoltageSourceStates = (model: SimulationModel): VoltageSourceStateByElementId => {
  const states: VoltageSourceStateByElementId = new Map();

  model.elements.forEach((element) => {
    const voltageV = voltageSourceNominalVoltage(element);
    if(voltageV === undefined) return;

    states.set(element.id, {
      voltageV,
      wasOverloaded: false,
    });
  });

  return states;
};

const createInitialDiodeStates = (model: SimulationModel): DiodeStateByElementId => {
  const states: DiodeStateByElementId = new Map();

  model.elements.forEach((element) => {
    if(element.type === "diode") {
      states.set(element.id, true);
    }
  });

  return states;
};

const degradedVoltageForCurrent = (
  nominalVoltageV: number,
  currentA: number,
  currentLimitA: number,
  voltageDropPctAt150Current: number,
) => {
  if(currentLimitA <= 0) return nominalVoltageV;
  if(currentA <= currentLimitA + CURRENT_LIMIT_TOLERANCE_A) return nominalVoltageV;

  const overload = Math.min(0.5, Math.max(0, currentA / currentLimitA - 1));
  const voltageFractionAt150 = Math.min(1, Math.max(0, voltageDropPctAt150Current / 100));
  const dropSlope = (1 - voltageFractionAt150) / 0.5;
  const voltageFraction = Math.max(0, 1 - dropSlope * overload);

  return nominalVoltageV * voltageFraction;
};

const degradedVoltageForEquivalentLoad = (
  nominalVoltageV: number,
  solvedCurrentA: number,
  solvedVoltageV: number,
  currentLimitA: number,
  voltageDropPctAt150Current: number,
) => {
  if(currentLimitA <= 0) {
    return {
      voltageV: nominalVoltageV,
      wasOverloaded: false,
    };
  }

  const equivalentConductance = Math.abs(solvedVoltageV) > SOURCE_VOLTAGE_CONVERGENCE_V
    ? Math.abs(solvedCurrentA / solvedVoltageV)
    : undefined;
  if(equivalentConductance === undefined || !Number.isFinite(equivalentConductance)) {
    return {
      voltageV: degradedVoltageForCurrent(
        nominalVoltageV,
        solvedCurrentA,
        currentLimitA,
        voltageDropPctAt150Current,
      ),
      wasOverloaded: solvedCurrentA > currentLimitA + CURRENT_LIMIT_TOLERANCE_A,
    };
  }

  const nominalCurrentA = equivalentConductance * nominalVoltageV;
  if(nominalCurrentA <= currentLimitA + CURRENT_LIMIT_TOLERANCE_A) {
    return {
      voltageV: nominalVoltageV,
      wasOverloaded: false,
    };
  }

  const voltageFractionAt150 = Math.min(1, Math.max(0, voltageDropPctAt150Current / 100));
  const dropSlope = (1 - voltageFractionAt150) / 0.5;
  if(dropSlope <= 0) {
    return {
      voltageV: nominalVoltageV,
      wasOverloaded: true,
    };
  }

  const voltageV = nominalVoltageV * (1 + dropSlope) /
    (1 + nominalVoltageV * dropSlope * equivalentConductance / currentLimitA);
  const minVoltageV = nominalVoltageV * voltageFractionAt150;
  const clampedVoltageV = Math.min(nominalVoltageV, Math.max(minVoltageV, voltageV));

  return {
    voltageV: clampedVoltageV,
    wasOverloaded: true,
  };
};

const updateVoltageSourceStates = (
  model: SimulationModel,
  linearModel: LinearDcModel,
  values: number[],
  currentStates: VoltageSourceStateByElementId,
  dcdcInputStates: DcdcInputStateByElementId,
) => {
  const elementById = new Map(model.elements.map((element) => [element.id, element]));
  const nextStates: VoltageSourceStateByElementId = new Map(currentStates);
  let maxVoltageDeltaV = 0;

  linearModel.voltageSources.forEach((source) => {
    if(source.currentVariableIndex === undefined) return;

    const element = elementById.get(source.elementId);
    if(!element) return;

    const nominalVoltageV = voltageSourceNominalVoltage(element);
    const currentLimitA = voltageSourceEffectiveCurrentLimit(element, dcdcInputStates);
    if(nominalVoltageV === undefined || currentLimitA === undefined) return;

    const currentA = Math.abs(values[source.currentVariableIndex] ?? 0);
    const voltageDropPctAt150Current = numberParameter(element.parameters, "voltageDropPctAt150Current")
      ?? DEFAULT_VOLTAGE_DROP_PCT_AT_150_CURRENT;
    const previousState = currentStates.get(source.elementId);
    const sourceUpdate = degradedVoltageForEquivalentLoad(
      nominalVoltageV,
      currentA,
      previousState?.voltageV ?? nominalVoltageV,
      currentLimitA,
      voltageDropPctAt150Current,
    );
    const targetVoltageV = currentLimitA > 0 ? sourceUpdate.voltageV : nominalVoltageV;
    const previousVoltageV = previousState?.voltageV ?? nominalVoltageV;
    const nextVoltageV = previousVoltageV + (targetVoltageV - previousVoltageV) * NONLINEAR_RELAXATION;

    maxVoltageDeltaV = Math.max(maxVoltageDeltaV, Math.abs(previousVoltageV - targetVoltageV));
    nextStates.set(source.elementId, {
      voltageV: nextVoltageV,
      wasOverloaded: sourceUpdate.wasOverloaded || currentA > currentLimitA + CURRENT_LIMIT_TOLERANCE_A,
    });
  });

  return {
    nextStates,
    maxVoltageDeltaV,
  };
};

const updateDiodeStates = (
  model: SimulationModel,
  linearModel: LinearDcModel,
  values: number[],
  circuitVoltages: Map<string, number>,
  currentStates: DiodeStateByElementId,
  iteration: number,
) => {
  const nextStates: DiodeStateByElementId = new Map(currentStates);
  let changed = false;
  const changes: Parameters<typeof logSimulationDiodeStateChanges>[0] = [];
  const sourceByElementId = new Map(linearModel.voltageSources.map((source) => [source.elementId, source]));

  model.elements.forEach((element) => {
    if(element.type !== "diode") return;

    const forwardVoltageV = numberParameter(element.parameters, "forwardVoltageV");
    const anodeVoltage = circuitVoltages.get(element.terminals.anode);
    const cathodeVoltage = circuitVoltages.get(element.terminals.cathode);
    if(forwardVoltageV === undefined || anodeVoltage === undefined || cathodeVoltage === undefined) return;

    const wasConducting = currentStates.get(element.id) ?? true;
    const source = sourceByElementId.get(element.id);
    const sourceCurrentA = source?.currentVariableIndex !== undefined
      ? values[source.currentVariableIndex]
      : undefined;
    const shouldConduct = wasConducting
      ? (sourceCurrentA === undefined || sourceCurrentA >= -CURRENT_LIMIT_TOLERANCE_A)
      : anodeVoltage - cathodeVoltage >= forwardVoltageV - DIODE_VOLTAGE_TOLERANCE_V;

    if(shouldConduct !== wasConducting) {
      changed = true;
      changes.push({
        iteration,
        elementId: element.id,
        sourceElementId: element.sourceElementId,
        componentId: element.componentId,
        anodeVoltageV: anodeVoltage,
        cathodeVoltageV: cathodeVoltage,
        forwardVoltageV,
        sourceCurrentA,
        wasConducting,
        isConducting: shouldConduct,
      });
    }
    nextStates.set(element.id, shouldConduct);
  });

  logSimulationDiodeStateChanges(changes);

  return {
    nextStates,
    changed,
  };
};

const createExtremeVoltageSourceOverloadIssues = (
  model: SimulationModel,
  linearModel: LinearDcModel,
  values: number[],
  dcdcInputStates: DcdcInputStateByElementId,
) => {
  const issues: SimulationCheckIssue[] = [];
  const elementById = new Map(model.elements.map((element) => [element.id, element]));

  linearModel.voltageSources.forEach((source) => {
    if(source.currentVariableIndex === undefined) return;

    const element = elementById.get(source.elementId);
    const currentLimitA = element ? voltageSourceEffectiveCurrentLimit(element, dcdcInputStates) : undefined;
    if(currentLimitA === undefined || currentLimitA <= 0) return;

    const currentA = Math.abs(values[source.currentVariableIndex] ?? 0);
    if(currentA > currentLimitA * 1.5 + CURRENT_LIMIT_TOLERANCE_A) {
      issues.push(issue(
        `simulation-current-limit-extreme:${source.elementId}`,
        simulationIssueText("currentLimitExtreme.title"),
        simulationIssueText("currentLimitExtreme.description", {
          current: simulationIssueCurrent(currentA),
          limit: simulationIssueCurrent(currentLimitA),
        }),
        [{type: "element", elementId: source.elementId}],
      ));
    }
  });

  return issues;
};

const voltageSourcesFromElements = (
  model: SimulationModel,
  voltageSourceStates: VoltageSourceStateByElementId = new Map(),
  diodeStates: DiodeStateByElementId = new Map(),
): VoltageSourceStamp[] => {
  const sources = model.elements.flatMap((element) => {
    if(element.type === "voltageSource") {
      const voltageV = numberParameter(element.parameters, "voltageV");
      if(voltageV === undefined) return [];
      return [{
        elementId: element.id,
        positiveCircuitNodeId: element.terminals.positive,
        negativeCircuitNodeId: element.terminals.negative,
        voltageV: voltageSourceStates.get(element.id)?.voltageV ?? voltageV,
      }];
    }

    if(element.type === "dcdcConverter") {
      const voltageV = numberParameter(element.parameters, "outputVoltageV");
      if(voltageV === undefined) return [];
      return [{
        elementId: element.id,
        positiveCircuitNodeId: element.terminals.outPositive,
        negativeCircuitNodeId: element.terminals.outNegative,
        voltageV: voltageSourceStates.get(element.id)?.voltageV ?? voltageV,
      }];
    }

    if(element.type === "diode" && diodeStates.get(element.id)) {
      const voltageV = numberParameter(element.parameters, "forwardVoltageV");
      if(voltageV === undefined) return [];
      return [{
        elementId: element.id,
        positiveCircuitNodeId: element.terminals.anode,
        negativeCircuitNodeId: element.terminals.cathode,
        voltageV,
      }];
    }

    return [];
  });
  const uniqueSources = new Map<string, VoltageSourceStamp>();

  sources.forEach((source) => {
    const key = [
      source.positiveCircuitNodeId,
      source.negativeCircuitNodeId,
      source.voltageV.toFixed(6),
    ].join("|");
    if(!uniqueSources.has(key)) {
      uniqueSources.set(key, source);
    }
  });

  return Array.from(uniqueSources.values());
};

const collectActiveCircuitNodeIds = (
  model: SimulationModel,
  diodeStates: DiodeStateByElementId = new Map(),
) => {
  const activeCircuitNodeIds = new Set<string>();
  const adjacency = new Map<string, string[]>();
  const addActive = (circuitNodeId: string | undefined) => {
    if(circuitNodeId) activeCircuitNodeIds.add(circuitNodeId);
  };
  const addPassiveConnection = (a: string | undefined, b: string | undefined) => {
    if(!a || !b) return;
    adjacency.set(a, [...(adjacency.get(a) ?? []), b]);
    adjacency.set(b, [...(adjacency.get(b) ?? []), a]);
  };

  activeCircuitNodeIds.add(model.referenceNodeId);
  model.elements.forEach((element) => {
    if(element.type === "voltageSource") {
      addActive(element.terminals.positive);
      addActive(element.terminals.negative);
    }

    if(element.type === "dcdcConverter") {
      addActive(element.terminals.outPositive);
      addActive(element.terminals.outNegative);
    }

    if(element.type === "diode" && diodeStates.get(element.id)) {
      addActive(element.terminals.anode);
      addActive(element.terminals.cathode);
      addPassiveConnection(element.terminals.anode, element.terminals.cathode);
    }

    if(element.type === "resistor" || element.type === "fuse") {
      addPassiveConnection(element.terminals.a, element.terminals.b);
    }

    if(element.type === "digitalLed") {
      addPassiveConnection(element.terminals.supplyIn, element.terminals.supplyOut);
      addPassiveConnection(element.terminals.gndIn, element.terminals.gndOut);
    }
  });
  model.wires.forEach((wire) => {
    addPassiveConnection(wire.sourceCircuitNodeId, wire.targetCircuitNodeId);
  });

  let changed = true;
  while(changed) {
    changed = false;

    Array.from(activeCircuitNodeIds).forEach((circuitNodeId) => {
      adjacency.get(circuitNodeId)?.forEach((connectedCircuitNodeId) => {
        if(activeCircuitNodeIds.has(connectedCircuitNodeId)) return;
        activeCircuitNodeIds.add(connectedCircuitNodeId);
        changed = true;
      });
    });
  }

  return activeCircuitNodeIds;
};

const terminalsAreActive = (
  activeCircuitNodeIds: Set<string>,
  aCircuitNodeId: string | undefined,
  bCircuitNodeId: string | undefined,
) => (
  aCircuitNodeId !== undefined &&
  bCircuitNodeId !== undefined &&
  activeCircuitNodeIds.has(aCircuitNodeId) &&
  activeCircuitNodeIds.has(bCircuitNodeId)
);

const buildLinearDcModel = (
  model: SimulationModel,
  ledCurrentByElementId: LedCurrentByElementId = new Map(),
  constantPowerCurrentByElementId: ConstantPowerCurrentByElementId = new Map(),
  voltageSourceStates: VoltageSourceStateByElementId = new Map(),
  dcdcInputStates: DcdcInputStateByElementId = new Map(),
  diodeStates: DiodeStateByElementId = new Map(),
): LinearDcModel => {
  const activeCircuitNodeIds = collectActiveCircuitNodeIds(model, diodeStates);
  const circuitNodeIndexById = createCircuitNodeIndexById({
    ...model,
    circuitNodes: model.circuitNodes.filter((node) => activeCircuitNodeIds.has(node.id)),
  });
  const voltageSources = voltageSourcesFromElements(model, voltageSourceStates, diodeStates).map((source, index) => ({
    ...source,
    currentVariableIndex: circuitNodeIndexById.size + index,
  }));
  const size = circuitNodeIndexById.size + voltageSources.length;
  const entries: LinearSystem["entries"] = [];
  const rhs = Array(size).fill(0) as number[];

  model.wires.forEach((wire) => {
    if(
      !activeCircuitNodeIds.has(wire.sourceCircuitNodeId) ||
      !activeCircuitNodeIds.has(wire.targetCircuitNodeId)
    ) {
      return;
    }

    stampResistor(
      entries,
      circuitNodeIndexById,
      wire.sourceCircuitNodeId,
      wire.targetCircuitNodeId,
      wire.resistanceOhm,
    );
  });

  model.elements.forEach((element) => {
    if(element.type === "resistor" || element.type === "fuse") {
      stampResistor(
        entries,
        circuitNodeIndexById,
        element.terminals.a,
        element.terminals.b,
        numberParameter(element.parameters, "resistanceOhm"),
      );
    }

    if(element.type === "currentSource") {
      if(terminalsAreActive(activeCircuitNodeIds, element.terminals.positive, element.terminals.negative)) {
        stampCurrentSource(
          rhs,
          circuitNodeIndexById,
          element.terminals.positive,
          element.terminals.negative,
          numberParameter(element.parameters, "currentA"),
        );
      }
    }

    if(element.type === "constantPowerSink") {
      if(terminalsAreActive(activeCircuitNodeIds, element.terminals.positive, element.terminals.negative)) {
        stampCurrentSource(
          rhs,
          circuitNodeIndexById,
          element.terminals.positive,
          element.terminals.negative,
          constantPowerCurrentByElementId.get(element.id) ?? 0,
        );
      }
    }

    if(element.type === "dcdcConverter") {
      if(terminalsAreActive(activeCircuitNodeIds, element.terminals.inPositive, element.terminals.inNegative)) {
        stampCurrentSource(
          rhs,
          circuitNodeIndexById,
          element.terminals.inPositive,
          element.terminals.inNegative,
          dcdcInputStates.get(element.id)?.currentA ?? 0,
        );
      }
    }

    if(element.type === "digitalLed") {
      stampResistor(
        entries,
        circuitNodeIndexById,
        element.terminals.supplyIn,
        element.terminals.supplyOut,
        numberParameter(element.parameters, "supplyResistanceOhm"),
      );
      stampResistor(
        entries,
        circuitNodeIndexById,
        element.terminals.gndIn,
        element.terminals.gndOut,
        numberParameter(element.parameters, "gndResistanceOhm"),
      );
      stampCurrentSource(
        rhs,
        circuitNodeIndexById,
        element.terminals.supplyOut,
        element.terminals.gndOut,
        ledCurrentByElementId.get(element.id)
          ?? getLedCurrentForElement(element, model.settings, nominalLedVoltage(element)),
      );
    }
  });

  voltageSources.forEach((source) => {
    stampVoltageSource(entries, rhs, circuitNodeIndexById, source);
  });

  return {
    system: {
      size,
      entries,
      rhs,
    },
    circuitNodeIndexById,
    voltageSources,
    activeCircuitNodeIds,
  };
};

const voltageForCircuitNode = (
  model: SimulationModel,
  circuitNodeIndexById: Map<string, number>,
  values: number[],
  circuitNodeId: string | undefined,
) => {
  if(!circuitNodeId) return undefined;
  if(circuitNodeId === model.referenceNodeId) return 0;

  const index = circuitNodeIndexById.get(circuitNodeId);
  return index !== undefined ? values[index] : undefined;
};

const createCircuitVoltages = (
  model: SimulationModel,
  linearModel: LinearDcModel,
  values: number[],
) => {
  const circuitVoltages = new Map<string, number>();
  model.circuitNodes.forEach((node) => {
    const voltage = voltageForCircuitNode(model, linearModel.circuitNodeIndexById, values, node.id);
    if(voltage !== undefined) {
      circuitVoltages.set(node.id, voltage);
    }
  });
  return circuitVoltages;
};

const createLedElementVoltageResults = (
  model: SimulationModel,
  circuitVoltages: Map<string, number>,
) => {
  const outputResults = model.elements.flatMap((element) => {
    if(element.type !== "digitalLed" || !element.componentId) return [];

    const supplyVoltage = circuitVoltages.get(element.terminals.supplyOut);
    const gndVoltage = circuitVoltages.get(element.terminals.gndOut);

    return [{
      elementId: element.id,
      nodeId: element.componentId,
      sourceElementId: element.sourceElementId,
      distanceM: element.ledStripPosition?.distanceM,
      sectionIndex: element.ledStripPosition?.sectionIndex,
      logicLedIndex: element.ledStripPosition?.logicLedIndex,
      physicalLedCount: element.ledStripPosition?.physicalLedCount,
      deltaVoltageV: supplyVoltage !== undefined && gndVoltage !== undefined
        ? supplyVoltage - gndVoltage
        : undefined,
    }];
  });

  const firstLedElementByGroup = new Map<string, SimulationElement>();
  model.elements.forEach((element) => {
    if(
      element.type !== "digitalLed" ||
      !element.componentId ||
      element.ledStripPosition?.distanceM === undefined
    ) {
      return;
    }

    const key = `${element.componentId}:${element.sourceElementId ?? ""}`;
    const current = firstLedElementByGroup.get(key);
    if(
      !current ||
      (element.ledStripPosition.distanceM ?? Number.POSITIVE_INFINITY) <
      (current.ledStripPosition?.distanceM ?? Number.POSITIVE_INFINITY)
    ) {
      firstLedElementByGroup.set(key, element);
    }
  });

  const inputResults = Array.from(firstLedElementByGroup.values()).flatMap((element) => {
    const supplyVoltage = circuitVoltages.get(element.terminals.supplyIn);
    const gndVoltage = circuitVoltages.get(element.terminals.gndIn);

    return [{
      elementId: `${element.id}:input`,
      nodeId: element.componentId as string,
      sourceElementId: element.sourceElementId,
      distanceM: 0,
      sectionIndex: undefined,
      logicLedIndex: undefined,
      physicalLedCount: 0,
      deltaVoltageV: supplyVoltage !== undefined && gndVoltage !== undefined
        ? supplyVoltage - gndVoltage
        : undefined,
    }];
  });

  return [
    ...inputResults,
    ...outputResults,
  ];
};

const createLedStripVoltageSummaryResults = (
  ledElementVoltageResults: ReturnType<typeof createLedElementVoltageResults>,
) => {
  const grouped = new Map<string, typeof ledElementVoltageResults>();

  ledElementVoltageResults.forEach((result) => {
    const key = `${result.nodeId}:${result.sourceElementId ?? ""}`;
    const group = grouped.get(key) ?? [];
    group.push(result);
    grouped.set(key, group);
  });

  return Array.from(grouped.values()).map((group) => {
    const deltaVoltages = group.flatMap((result) => (
      result.deltaVoltageV !== undefined ? [result.deltaVoltageV] : []
    ));

    return {
      nodeId: group[0].nodeId,
      sourceElementId: group[0].sourceElementId,
      minDeltaVoltageV: deltaVoltages.length > 0 ? Math.min(...deltaVoltages) : undefined,
      elementCount: group.length,
    };
  });
};

const pinPairGroupKey = (handleId: string) => {
  const terminalMatch = /_(start|end)$/.exec(handleId);
  if(terminalMatch) return terminalMatch[1];

  const middleMatch = /_middle_(\d+)$/.exec(handleId);
  if(middleMatch) return `middle_${middleMatch[1]}`;

  return "default";
};

const isDigitalLedNode = (model: SimulationModel, nodeId: string) => (
  model.elements.some((element) => element.componentId === nodeId && element.type === "digitalLed")
);

const isLedStripConnectionGroup = (groupKey: string) => (
  groupKey === "start" ||
  groupKey === "end" ||
  groupKey.startsWith("middle_")
);

const ledCurveVoltageAtPercent = (
  element: SimulationElement,
  percent: number,
  settings: SimulationSettings,
) => {
  if(percent <= 0 || percent >= 100) return undefined;

  const curveId = stringParameter(element.parameters, "currentCurve");
  if(!curveId) return undefined;

  const parameters = getLedCurrentCurveParameters(curveId, settings.ledColorMode);
  if(!parameters) return undefined;
  if(parameters.k === 0) return undefined;

  const voltageV = parameters.v0 + (1 / parameters.k) * Math.log(percent / (100 - percent));
  return Number.isFinite(voltageV) ? voltageV : undefined;
};

const createLedStripVoltageDropLimitsByGroup = (model: SimulationModel) => {
  const limitsByGroup = new Map<string, {warningLimitV: number; errorLimitV: number}>();

  model.elements.forEach((element) => {
    if(element.type !== "digitalLed" || !element.componentId) return;

    const warningLimitV = ledCurveVoltageAtPercent(
      element,
      LED_STRIP_VOLTAGE_DROP_WARNING_PERCENT,
      model.settings,
    );
    const errorLimitV = ledCurveVoltageAtPercent(
      element,
      LED_STRIP_VOLTAGE_DROP_ERROR_PERCENT,
      model.settings,
    );
    if(warningLimitV === undefined || errorLimitV === undefined) return;

    const key = `${element.componentId}:${element.sourceElementId ?? ""}`;
    limitsByGroup.set(key, {
      warningLimitV: Math.max(warningLimitV, errorLimitV),
      errorLimitV: Math.min(warningLimitV, errorLimitV),
    });
  });

  return limitsByGroup;
};

type LedStripSupplyVoltageProblem = {
  nodeId: string;
  voltage: number;
  limit: number;
  targetPins: SimulationCheckIssue["targets"];
};

const collectLedStripSupplyVoltageProblems = (
  model: SimulationModel,
  circuitVoltages: Map<string, number>,
) => {
  const problems = new Map<string, LedStripSupplyVoltageProblem>();
  const gndPinByNodeAndGroup = new Map<string, SimulationModel["pins"][number]>();

  model.pins.forEach((pin) => {
    if(pin.role !== "gnd") return;
    gndPinByNodeAndGroup.set(`${pin.nodeId}:${pinPairGroupKey(pin.handleId)}`, pin);
  });

  model.pins.forEach((pin) => {
    if(pin.role !== "supply") return;
    if(pin.voltageMin === undefined) return;
    if(!isDigitalLedNode(model, pin.nodeId)) return;

    const groupKey = pinPairGroupKey(pin.handleId);
    if(!isLedStripConnectionGroup(groupKey)) return;

    const gndPin = gndPinByNodeAndGroup.get(`${pin.nodeId}:${groupKey}`);
    if(!gndPin) return;
    if(pin.connectedWireIds.length === 0 && gndPin.connectedWireIds.length === 0) return;

    const supplyVoltage = circuitVoltages.get(pin.circuitNodeId ?? "");
    const gndVoltage = circuitVoltages.get(gndPin.circuitNodeId ?? "");
    if(supplyVoltage === undefined || gndVoltage === undefined) return;

    const deltaVoltageV = supplyVoltage - gndVoltage;
    if(deltaVoltageV >= pin.voltageMin - VOLTAGE_TOLERANCE_V) return;

    const current = problems.get(pin.nodeId);
    const targetPins: SimulationCheckIssue["targets"] = [
      {type: "pin", nodeId: pin.nodeId, handleId: pin.handleId},
      {type: "pin", nodeId: gndPin.nodeId, handleId: gndPin.handleId},
    ];
    if(!current || deltaVoltageV < current.voltage) {
      problems.set(pin.nodeId, {
        nodeId: pin.nodeId,
        voltage: deltaVoltageV,
        limit: pin.voltageMin,
        targetPins,
      });
    }
  });

  return problems;
};

const createPinVoltageRangeIssues = (
  model: SimulationModel,
  circuitVoltages: Map<string, number>,
) => {
  const issues: SimulationCheckIssue[] = [];
  const gndPinByNodeAndGroup = new Map<string, SimulationModel["pins"][number]>();

  model.pins.forEach((pin) => {
    if(pin.role !== "gnd") return;
    gndPinByNodeAndGroup.set(`${pin.nodeId}:${pinPairGroupKey(pin.handleId)}`, pin);
  });

  model.pins.forEach((pin) => {
    if(pin.role !== "supply") return;
    if(pin.voltageMin === undefined && pin.voltageMax === undefined) return;

    const supplyVoltage = circuitVoltages.get(pin.circuitNodeId ?? "");
    const gndPin = gndPinByNodeAndGroup.get(`${pin.nodeId}:${pinPairGroupKey(pin.handleId)}`)
      ?? gndPinByNodeAndGroup.get(`${pin.nodeId}:default`);
    const gndVoltage = circuitVoltages.get(gndPin?.circuitNodeId ?? "");
    if(supplyVoltage === undefined || gndVoltage === undefined) return;

    const deltaVoltageV = supplyVoltage - gndVoltage;
    if(
      pin.voltageMin !== undefined &&
      deltaVoltageV < pin.voltageMin - VOLTAGE_TOLERANCE_V &&
      !isDigitalLedNode(model, pin.nodeId)
    ) {
      issues.push(issue(
        `simulation-pin-voltage-low:${pin.nodeId}:${pin.handleId}`,
        simulationIssueText("pinVoltageLow.title"),
        simulationIssueText("pinVoltageLow.description", {
          voltage: simulationIssueVoltage(deltaVoltageV),
          limit: simulationIssueVoltage(pin.voltageMin),
        }),
        [{type: "pin", nodeId: pin.nodeId, handleId: pin.handleId}],
      ));
    }

    if(pin.voltageMax !== undefined && deltaVoltageV > pin.voltageMax + VOLTAGE_TOLERANCE_V) {
      issues.push(issue(
        `simulation-pin-voltage-high:${pin.nodeId}:${pin.handleId}`,
        simulationIssueText("pinVoltageHigh.title"),
        simulationIssueText("pinVoltageHigh.description", {
          voltage: simulationIssueVoltage(deltaVoltageV),
          limit: simulationIssueVoltage(pin.voltageMax),
        }),
        [{type: "pin", nodeId: pin.nodeId, handleId: pin.handleId}],
      ));
    }
  });

  return issues;
};

const createLedStripVoltageRangeIssues = (
  model: SimulationModel,
  ledElementVoltageResults: ReturnType<typeof createLedElementVoltageResults>,
  ledStripSupplyVoltageProblems: Map<string, LedStripSupplyVoltageProblem>,
) => {
  const issues: SimulationCheckIssue[] = [];
  const supplyPinsByNode = new Map<string, SimulationModel["pins"]>();
  const voltageDropLimitsByGroup = createLedStripVoltageDropLimitsByGroup(model);

  model.pins.forEach((pin) => {
    if(pin.role !== "supply") return;
    if(pin.voltageMin === undefined && pin.voltageMax === undefined) return;

    const pins = supplyPinsByNode.get(pin.nodeId) ?? [];
    pins.push(pin);
    supplyPinsByNode.set(pin.nodeId, pins);
  });

  const groupedVoltages = new Map<string, typeof ledElementVoltageResults>();
  ledElementVoltageResults.forEach((result) => {
    if(result.deltaVoltageV === undefined) return;

    const key = `${result.nodeId}:${result.sourceElementId ?? ""}`;
    const group = groupedVoltages.get(key) ?? [];
    group.push(result);
    groupedVoltages.set(key, group);
  });

  ledStripSupplyVoltageProblems.forEach((problem) => {
    issues.push(issue(
      `simulation-led-strip-supply-voltage-low:${problem.nodeId}`,
      simulationIssueText("ledStripSupplyVoltageLow.title"),
      simulationIssueText("ledStripSupplyVoltageLow.description", {
        voltage: simulationIssueVoltage(problem.voltage),
        limit: simulationIssueVoltage(problem.limit),
      }),
      problem.targetPins,
    ));
  });

  groupedVoltages.forEach((group, key) => {
    const nodeId = group[0]?.nodeId;
    if(!nodeId) return;
    if(ledStripSupplyVoltageProblems.has(nodeId)) return;

    const supplyPins = supplyPinsByNode.get(nodeId) ?? [];
    const maxLimit = Math.max(
      ...supplyPins.flatMap((pin) => pin.voltageMax !== undefined ? [pin.voltageMax] : []),
    );
    const voltageDropLimits = voltageDropLimitsByGroup.get(key);
    const voltages = group.flatMap((result) => (
      result.deltaVoltageV !== undefined ? [result.deltaVoltageV] : []
    ));
    if(voltages.length === 0) return;

    const minVoltage = Math.min(...voltages);
    const maxVoltage = Math.max(...voltages);
    const target = [{type: "node" as const, nodeId}];

    if(
      voltageDropLimits &&
      minVoltage < voltageDropLimits.errorLimitV - VOLTAGE_TOLERANCE_V
    ) {
      issues.push(issue(
        `simulation-led-strip-voltage-drop-high:${key}`,
        simulationIssueText("ledStripVoltageDropHigh.title"),
        simulationIssueText("ledStripVoltageDropHigh.description", {
          voltage: simulationIssueVoltage(minVoltage),
          limit: simulationIssueVoltage(voltageDropLimits.errorLimitV),
        }),
        target,
      ));
    } else if(
      voltageDropLimits &&
      minVoltage < voltageDropLimits.warningLimitV - VOLTAGE_TOLERANCE_V
    ) {
      issues.push(issue(
        `simulation-led-strip-voltage-drop-warning:${key}`,
        simulationIssueText("ledStripVoltageDropWarning.title"),
        simulationIssueText("ledStripVoltageDropWarning.description", {
          voltage: simulationIssueVoltage(minVoltage),
          limit: simulationIssueVoltage(voltageDropLimits.warningLimitV),
        }),
        target,
        "warning",
      ));
    }

    if(Number.isFinite(maxLimit) && maxVoltage > maxLimit + VOLTAGE_TOLERANCE_V) {
      issues.push(issue(
        `simulation-led-strip-voltage-high:${key}`,
        simulationIssueText("ledStripVoltageHigh.title"),
        simulationIssueText("ledStripVoltageHigh.description", {
          voltage: simulationIssueVoltage(maxVoltage),
          limit: simulationIssueVoltage(maxLimit),
        }),
        target,
      ));
    }
  });

  return issues;
};

const createPinCurrentById = (
  model: SimulationModel,
  circuitVoltages: Map<string, number>,
) => {
  const pinCurrentById = new Map<string, number>();

  model.wires.forEach((wire) => {
    const sourceVoltage = circuitVoltages.get(wire.sourceCircuitNodeId);
    const targetVoltage = circuitVoltages.get(wire.targetCircuitNodeId);
    const voltageDropV = sourceVoltage !== undefined && targetVoltage !== undefined
      ? sourceVoltage - targetVoltage
      : undefined;
    const currentA = voltageDropV !== undefined
      ? voltageDropV / wire.resistanceOhm
      : undefined;

    if(currentA === undefined) return;

    wire.pinCurrentContributions?.forEach((contribution) => {
      pinCurrentById.set(
        contribution.pinId,
        (pinCurrentById.get(contribution.pinId) ?? 0) + currentA * contribution.sign,
      );
    });
  });

  return pinCurrentById;
};

const createPinCurrentLimitIssues = (
  model: SimulationModel,
  pinCurrentById: Map<string, number>,
) => {
  const issues: SimulationCheckIssue[] = [];

  model.pins.forEach((pin) => {
    if(pin.maxCurrentA === undefined || pin.maxCurrentA < 0) return;

    const currentA = Math.abs(pinCurrentById.get(pin.id) ?? 0);
    if(currentA <= pin.maxCurrentA + CURRENT_LIMIT_TOLERANCE_A) return;

    issues.push(issue(
      `simulation-pin-current-limit:${pin.nodeId}:${pin.handleId}`,
      simulationIssueText("pinCurrentLimit.title"),
      simulationIssueText("pinCurrentLimit.description", {
        current: simulationIssueNumber(currentA, 2),
        limit: simulationIssueNumber(pin.maxCurrentA, 2),
      }),
      [{type: "pin", nodeId: pin.nodeId, handleId: pin.handleId}],
    ));
  });

  return issues;
};

const createUnpoweredIgnoredIssues = (
  model: SimulationModel,
  activeCircuitNodeIds: Set<string>,
) => (
  model.components.flatMap((component) => {
    const ignoredElementIds = component.elementIds.filter((elementId) => {
      const element = model.elements.find((candidate) => candidate.id === elementId);
      if(!element) return false;
      if(
        element.type === "resistor" ||
        element.type === "fuse" ||
        element.type === "shortBridge" ||
        element.type === "diode"
      ) {
        return false;
      }

      return Object.values(element.terminals).every((circuitNodeId) => (
        !activeCircuitNodeIds.has(circuitNodeId)
      ));
    });
    if(ignoredElementIds.length === 0) return [];

    return [issue(
      `simulation-unpowered-subnet:${component.nodeId}`,
      simulationIssueText("unpoweredSubnet.title"),
      simulationIssueText("unpoweredSubnet.description"),
      [{type: "node", nodeId: component.nodeId}],
      "info",
    )];
  })
);

const createSolvedCheckIssues = (
  model: SimulationModel,
  linearModel: LinearDcModel,
  values: number[],
  circuitVoltages: Map<string, number>,
  voltageSourceStates: VoltageSourceStateByElementId,
  dcdcInputStates: DcdcInputStateByElementId,
) => {
  const issues: SimulationCheckIssue[] = [];
  const elementById = new Map(model.elements.map((element) => [element.id, element]));
  const ledStripSupplyVoltageProblems = collectLedStripSupplyVoltageProblems(model, circuitVoltages);
  const pinCurrentById = createPinCurrentById(model, circuitVoltages);

  issues.push(...createUnpoweredIgnoredIssues(model, linearModel.activeCircuitNodeIds));
  issues.push(...createPinVoltageRangeIssues(model, circuitVoltages));
  issues.push(...createPinCurrentLimitIssues(model, pinCurrentById));
  issues.push(...createLedStripVoltageRangeIssues(
    model,
    createLedElementVoltageResults(model, circuitVoltages),
    ledStripSupplyVoltageProblems,
  ));

  model.elements.forEach((element) => {
    if(element.type !== "dcdcConverter") return;
    if(!dcdcInputStates.get(element.id)?.isInputPowerLimitAmbiguous) return;

    issues.push(issue(
      `simulation-dcdc-input-power-ambiguous:${element.id}`,
      simulationIssueText("dcdcInputPowerAmbiguous.title"),
      simulationIssueText("dcdcInputPowerAmbiguous.description"),
      [{type: "element", elementId: element.id}],
    ));
  });

  linearModel.voltageSources.forEach((source) => {
    if(source.currentVariableIndex === undefined) return;

    const element = elementById.get(source.elementId);
    const currentA = Math.abs(values[source.currentVariableIndex] ?? 0);
    const currentLimitA = element ? voltageSourceEffectiveCurrentLimit(element, dcdcInputStates) : undefined;
    const wasOverloaded = voltageSourceStates.get(source.elementId)?.wasOverloaded;

    if(currentLimitA !== undefined && currentLimitA >= 0 && (wasOverloaded || currentA > currentLimitA + CURRENT_LIMIT_TOLERANCE_A)) {
      if(element?.type === "dcdcConverter" && dcdcInputStates.get(source.elementId)?.wasInputPowerLimited) {
        issues.push(issue(
          `simulation-dcdc-input-power-limit:${source.elementId}`,
          simulationIssueText("dcdcInputPowerLimited.title"),
          simulationIssueText("dcdcInputPowerLimited.description", {
            current: simulationIssueCurrent(currentA),
            limit: simulationIssueCurrent(currentLimitA),
          }),
          [{type: "element", elementId: source.elementId}],
        ));
        return;
      }

      const description = currentA > currentLimitA + CURRENT_LIMIT_TOLERANCE_A
        ? simulationIssueText("currentLimit.description", {
          current: simulationIssueCurrent(currentA),
          limit: simulationIssueCurrent(currentLimitA),
        })
        : simulationIssueText("currentLimitReduced.description", {
          current: simulationIssueCurrent(currentA),
          limit: simulationIssueCurrent(currentLimitA),
        });
      issues.push(issue(
        `simulation-current-limit:${source.elementId}`,
        simulationIssueText("currentLimit.title"),
        description,
        [{type: "element", elementId: source.elementId}],
      ));
    }
  });

  model.elements.forEach((element) => {
    if(element.type !== "fuse") return;

    const nominalCurrentA = numberParameter(element.parameters, "nominalCurrentA");
    const resistanceOhm = numberParameter(element.parameters, "resistanceOhm");
    const aVoltage = circuitVoltages.get(element.terminals.a);
    const bVoltage = circuitVoltages.get(element.terminals.b);

    if(
      nominalCurrentA === undefined ||
      resistanceOhm === undefined ||
      resistanceOhm <= 0 ||
      aVoltage === undefined ||
      bVoltage === undefined
    ) {
      return;
    }

    const currentA = Math.abs((aVoltage - bVoltage) / resistanceOhm);
    if(currentA > nominalCurrentA + 0.0005) {
      issues.push(issue(
        `simulation-fuse-current:${element.id}`,
        simulationIssueText("fuseCurrent.title"),
        simulationIssueText("fuseCurrent.description", {
          current: simulationIssueCurrent(currentA),
          limit: simulationIssueCurrent(nominalCurrentA),
        }),
        [{type: "element", elementId: element.id}],
      ));
    }
  });

  return issues;
};

const createSimulationResult = (
  edges: Edge<EdgeDataType>[],
  model: SimulationModel,
  diagramFingerprint: string,
  checkIssues: SimulationCheckIssue[],
  wireAmpacitySettings: WireAmpacitySettings,
  linearModel: LinearDcModel,
  values: number[],
  voltageSourceStates: VoltageSourceStateByElementId,
  dcdcInputStates: DcdcInputStateByElementId,
): SimulationResult => {
  const circuitVoltages = createCircuitVoltages(model, linearModel, values);
  const ledElementVoltageResults = createLedElementVoltageResults(model, circuitVoltages);
  const ledStripVoltageSummaryResults = createLedStripVoltageSummaryResults(ledElementVoltageResults);
  const pinCurrentById = createPinCurrentById(model, circuitVoltages);

  const rawWireResults = model.wires.map((wire) => {
    const sourceVoltage = circuitVoltages.get(wire.sourceCircuitNodeId);
    const targetVoltage = circuitVoltages.get(wire.targetCircuitNodeId);
    const voltageDropV = sourceVoltage !== undefined && targetVoltage !== undefined
      ? sourceVoltage - targetVoltage
      : undefined;
    const currentA = voltageDropV !== undefined
      ? voltageDropV / wire.resistanceOhm
      : undefined;

    return {
      wireId: wire.id,
      edgeId: wire.edgeId,
      currentA,
      voltageDropV,
      resistanceOhm: wire.resistanceOhm,
    };
  });
  const wireById = new Map(model.wires.map((wire) => [wire.id, wire]));
  const usbWireResultsByEdgeId = new Map<string, typeof rawWireResults>();
  rawWireResults.forEach((wireResult) => {
    const wire = wireById.get(wireResult.wireId);
    if(wire?.aggregate?.kind !== "usbPowerPair") return;

    const group = usbWireResultsByEdgeId.get(wire.edgeId) ?? [];
    group.push(wireResult);
    usbWireResultsByEdgeId.set(wire.edgeId, group);
  });
  const usbAggregatedEdgeIds = new Set(usbWireResultsByEdgeId.keys());
  const usbConsistencyIssues: SimulationCheckIssue[] = [];
  const usbAggregatedWireResults = Array.from(usbWireResultsByEdgeId.entries()).flatMap(([
    edgeId,
    group,
  ]) => {
    const vbus = group.find((result) => wireById.get(result.wireId)?.aggregate?.conductor === "vbus");
    const gnd = group.find((result) => wireById.get(result.wireId)?.aggregate?.conductor === "gnd");
    const displayCurrentA = vbus?.currentA !== undefined ? Math.abs(vbus.currentA) : undefined;
    const vbusAbs = vbus?.currentA !== undefined ? Math.abs(vbus.currentA) : undefined;
    const gndAbs = gnd?.currentA !== undefined ? Math.abs(gnd.currentA) : undefined;

    if(
      vbusAbs !== undefined &&
      gndAbs !== undefined &&
      Math.abs(vbusAbs - gndAbs) > CURRENT_LIMIT_TOLERANCE_A
    ) {
      usbConsistencyIssues.push(issue(
        `simulation-usb-current-pair-mismatch:${edgeId}`,
        "USB current pair mismatch",
        "VBUS and GND currents in this USB cable differ. This usually means there is another return path or inconsistent USB modelling.",
        [{type: "wire", edgeId}],
        "info",
      ));
    }

    return [{
      wireId: `wire:${edgeId}:usb-pair`,
      edgeId,
      currentA: displayCurrentA,
      displayCurrentA,
      displayBidirectional: true,
      voltageDropV: vbus?.voltageDropV,
      resistanceOhm: vbus?.resistanceOhm,
      conductorResults: group.map((result) => ({
        wireId: result.wireId,
        conductor: wireById.get(result.wireId)?.aggregate?.conductor ?? "vbus",
        currentA: result.currentA,
        voltageDropV: result.voltageDropV,
        resistanceOhm: result.resistanceOhm,
      })),
    }];
  });
  const wireResults = [
    ...rawWireResults.filter((result) => !usbAggregatedEdgeIds.has(result.edgeId)),
    ...usbAggregatedWireResults,
  ];
  const solvedCheckIssues = createSolvedCheckIssues(model, linearModel, values, circuitVoltages, voltageSourceStates, dcdcInputStates);
  const wireAmpacityIssues = createSimulationWireAmpacityIssues(
    model,
    edges,
    wireResults,
    wireAmpacitySettings,
  );
  const allCheckIssues = [
    ...checkIssues,
    ...solvedCheckIssues,
    ...usbConsistencyIssues,
    ...wireAmpacityIssues,
  ];

  return {
    modelVersion: 1,
    settings: model.settings,
    createdAt: new Date().toISOString(),
    diagramFingerprint,
    pinResults: model.pins.map((pin) => ({
      pinId: pin.id,
      nodeId: pin.nodeId,
      handleId: pin.handleId,
      currentA: pinCurrentById.get(pin.id),
      voltageV: voltageForCircuitNode(model, linearModel.circuitNodeIndexById, values, pin.circuitNodeId),
    })),
    virtualPinResults: model.virtualPins.map((pin) => ({
      virtualPinId: pin.id,
      nodeId: pin.nodeId,
      handleId: pin.handleId,
      role: pin.role,
      kind: pin.kind,
      pairedHandleId: pin.pairedHandleId,
      voltageLabel: pin.voltageLabel,
      voltageV: voltageForCircuitNode(model, linearModel.circuitNodeIndexById, values, pin.circuitNodeId),
    })),
    wireResults,
    ledElementVoltageResults,
    ledStripVoltageSummaryResults,
    checkIssues: allCheckIssues,
    status: allCheckIssues.some((item) => item.severity === "error")
      ? "error"
      : allCheckIssues.some((item) => item.severity === "warning")
        ? "warning"
        : "ok",
  };
};

export const runSimulation = (
  nodes: Node<ComponentDataType>[],
  edges: Edge<EdgeDataType>[],
  settings: SimulationSettings,
  wireAmpacitySettings: WireAmpacitySettings = DEFAULT_WIRE_AMPACITY_SETTINGS,
): RunSimulationResult => {
  const diagramFingerprint = createSimulationFingerprint(nodes, edges);
  const modelResult = buildSimulationModel(nodes, edges, settings);

  if(!modelResult.ok) {
    return {
      ok: false,
      diagramFingerprint,
      issues: modelResult.issues,
    };
  }

  let ledCurrentByElementId = createInitialLedCurrents(modelResult.model);
  let constantPowerCurrentByElementId = createInitialConstantPowerCurrents(modelResult.model);
  let voltageSourceStates = createInitialVoltageSourceStates(modelResult.model);
  let dcdcInputStates = createInitialDcdcInputStates(modelResult.model);
  let diodeStates = createInitialDiodeStates(modelResult.model);
  let linearModel = buildLinearDcModel(
    modelResult.model,
    ledCurrentByElementId,
    constantPowerCurrentByElementId,
    voltageSourceStates,
    dcdcInputStates,
    diodeStates,
  );
  let solverResult = sparseLinearSystemSolver.solve(linearModel.system);
  let converged = false;

  for(let iteration = 0; iteration < MAX_NONLINEAR_ITERATIONS; iteration += 1) {
    if(solverResult.status !== "ok" || !solverResult.values) {
      return {
        ok: false,
        diagramFingerprint,
        issues: [
          ...modelResult.issues,
          issue(
            "simulation-solver:failed",
            simulationIssueText("solverFailed.title"),
            solverResult.message ?? simulationIssueText("solverFailed.description", {
              status: solverResult.status,
            }),
          ),
        ],
      };
    }

    const circuitVoltages = createCircuitVoltages(modelResult.model, linearModel, solverResult.values);
    const rawNextLedCurrentByElementId = createLedCurrentsFromVoltages(modelResult.model, circuitVoltages);
    const nextLedCurrentByElementId = relaxedLedCurrents(ledCurrentByElementId, rawNextLedCurrentByElementId);
    const rawNextConstantPowerCurrentByElementId = createConstantPowerCurrentsFromVoltages(modelResult.model, circuitVoltages);
    const nextConstantPowerCurrentByElementId = relaxedCurrents(
      constantPowerCurrentByElementId,
      rawNextConstantPowerCurrentByElementId,
    );
    const dcdcInputUpdate = updateDcdcInputStates(
      modelResult.model,
      linearModel.voltageSources,
      solverResult.values,
      circuitVoltages,
      dcdcInputStates,
      {
        currentLimitToleranceA: CURRENT_LIMIT_TOLERANCE_A,
        nonlinearRelaxation: NONLINEAR_RELAXATION,
        sourceVoltageConvergenceV: SOURCE_VOLTAGE_CONVERGENCE_V,
      },
    );
    const sourceUpdate = updateVoltageSourceStates(
      modelResult.model,
      linearModel,
      solverResult.values,
      voltageSourceStates,
      dcdcInputUpdate.nextStates,
    );
    const diodeUpdate = updateDiodeStates(
      modelResult.model,
      linearModel,
      solverResult.values,
      circuitVoltages,
      diodeStates,
      iteration,
    );

    if(
      maxLedCurrentDeltaA(ledCurrentByElementId, rawNextLedCurrentByElementId) <= LED_CURRENT_CONVERGENCE_A &&
      maxCurrentDeltaA(
        constantPowerCurrentByElementId,
        rawNextConstantPowerCurrentByElementId,
      ) <= CONSTANT_POWER_CURRENT_CONVERGENCE_A &&
      sourceUpdate.maxVoltageDeltaV <= SOURCE_VOLTAGE_CONVERGENCE_V &&
      dcdcInputUpdate.maxCurrentDeltaA <= DCDC_INPUT_CURRENT_CONVERGENCE_A &&
      !diodeUpdate.changed
    ) {
      ledCurrentByElementId = rawNextLedCurrentByElementId;
      constantPowerCurrentByElementId = rawNextConstantPowerCurrentByElementId;
      voltageSourceStates = sourceUpdate.nextStates;
      dcdcInputStates = dcdcInputUpdate.nextStates;
      diodeStates = diodeUpdate.nextStates;
      converged = true;
      break;
    }

    ledCurrentByElementId = nextLedCurrentByElementId;
    constantPowerCurrentByElementId = nextConstantPowerCurrentByElementId;
    voltageSourceStates = sourceUpdate.nextStates;
    dcdcInputStates = dcdcInputUpdate.nextStates;
    diodeStates = diodeUpdate.nextStates;
    linearModel = buildLinearDcModel(
      modelResult.model,
      ledCurrentByElementId,
      constantPowerCurrentByElementId,
      voltageSourceStates,
      dcdcInputStates,
      diodeStates,
    );
    solverResult = sparseLinearSystemSolver.solve(linearModel.system);
  }

  if(!converged) {
    return {
      ok: false,
      diagramFingerprint,
      issues: [
        ...modelResult.issues,
        issue(
          "simulation-solver:led-current-not-converged",
          simulationIssueText("solverNotConverged.title"),
          simulationIssueText("solverNotConverged.description"),
        ),
      ],
    };
  }

  const extremeOverloadIssues = createExtremeVoltageSourceOverloadIssues(
    modelResult.model,
    linearModel,
    solverResult.values ?? [],
    dcdcInputStates,
  );

  if(extremeOverloadIssues.length > 0) {
    return {
      ok: false,
      diagramFingerprint,
      issues: [
        ...modelResult.issues,
        ...extremeOverloadIssues,
      ],
    };
  }

  const result = createSimulationResult(
    edges,
    modelResult.model,
    diagramFingerprint,
    modelResult.issues,
    wireAmpacitySettings,
    linearModel,
    solverResult.values ?? [],
    voltageSourceStates,
    dcdcInputStates,
  );

  return {
    ok: true,
    model: modelResult.model,
    result,
    issues: result.checkIssues,
  };
};
