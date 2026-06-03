import type { SimulationElement, SimulationModel } from "./simulationTypes";

const MIN_DCDC_INPUT_VOLTAGE_V = 0.5;

export const DCDC_INPUT_CURRENT_CONVERGENCE_A = 0.000005;

export type DcdcInputState = {
  currentA: number;
  availableOutputCurrentLimitA?: number;
  isInputPowerLimitAmbiguous: boolean;
  wasInputPowerLimited: boolean;
};

export type DcdcInputStateByElementId = Map<string, DcdcInputState>;

type DcdcVoltageSourceRef = {
  elementId: string;
  currentVariableIndex?: number;
};

const numberParameter = (
  parameters: Record<string, string | number | boolean> | undefined,
  key: string,
) => {
  const value = parameters?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
};

const dcdcEfficiency = (element: SimulationElement) => {
  if(element.type !== "dcdcConverter") return undefined;

  const efficiency = numberParameter(element.parameters, "efficiency");
  if(efficiency === undefined || efficiency <= 0 || efficiency > 1) return undefined;

  return efficiency;
};

const voltageSourceCurrentLimit = (element: SimulationElement) => {
  if(element.type !== "voltageSource") return undefined;
  return numberParameter(element.parameters, "currentLimitA");
};

const connectedPassiveCircuitNodeIds = (
  model: SimulationModel,
  startCircuitNodeId: string | undefined,
) => {
  const visited = new Set<string>();
  if(!startCircuitNodeId) return visited;

  const adjacency = new Map<string, string[]>();
  const addConnection = (a: string | undefined, b: string | undefined) => {
    if(!a || !b) return;
    adjacency.set(a, [...(adjacency.get(a) ?? []), b]);
    adjacency.set(b, [...(adjacency.get(b) ?? []), a]);
  };

  model.wires.forEach((wire) => addConnection(wire.sourceCircuitNodeId, wire.targetCircuitNodeId));
  model.elements.forEach((element) => {
    if(element.type === "resistor" || element.type === "fuse") {
      addConnection(element.terminals.a, element.terminals.b);
    }
  });

  const queue = [startCircuitNodeId];
  visited.add(startCircuitNodeId);

  for(let index = 0; index < queue.length; index += 1) {
    adjacency.get(queue[index])?.forEach((nextCircuitNodeId) => {
      if(visited.has(nextCircuitNodeId)) return;
      visited.add(nextCircuitNodeId);
      queue.push(nextCircuitNodeId);
    });
  }

  return visited;
};

const dcdcInputSupplyCurrentLimit = (
  model: SimulationModel,
  dcdcElement: SimulationElement,
) => {
  if(dcdcElement.type !== "dcdcConverter") {
    return {
      currentLimitA: undefined,
      isAmbiguous: false,
    };
  }

  const positiveInputNodes = connectedPassiveCircuitNodeIds(model, dcdcElement.terminals.inPositive);
  const negativeInputNodes = connectedPassiveCircuitNodeIds(model, dcdcElement.terminals.inNegative);
  const sourceCurrentLimitsA: number[] = [];

  model.elements.forEach((element) => {
    if(element.type !== "voltageSource") return;
    if(
      !positiveInputNodes.has(element.terminals.positive) ||
      !negativeInputNodes.has(element.terminals.negative)
    ) {
      return;
    }

    const currentLimitA = voltageSourceCurrentLimit(element);
    if(currentLimitA === undefined || currentLimitA < 0) return;

    sourceCurrentLimitsA.push(currentLimitA);
  });

  if(sourceCurrentLimitsA.length === 0) {
    return {
      currentLimitA: undefined,
      isAmbiguous: false,
    };
  }

  if(sourceCurrentLimitsA.length > 1) {
    return {
      currentLimitA: undefined,
      isAmbiguous: true,
    };
  }

  return {
    currentLimitA: sourceCurrentLimitsA[0],
    isAmbiguous: false,
  };
};

const relaxedDcdcInputCurrent = (
  previousCurrentA: number,
  targetCurrentA: number,
  nonlinearRelaxation: number,
) => previousCurrentA + (targetCurrentA - previousCurrentA) * nonlinearRelaxation;

export const dcdcDynamicOutputCurrentLimit = (
  element: SimulationElement,
  dcdcInputStates: DcdcInputStateByElementId,
) => (
  element.type === "dcdcConverter"
    ? dcdcInputStates.get(element.id)?.availableOutputCurrentLimitA
    : undefined
);

export const createInitialDcdcInputStates = (model: SimulationModel): DcdcInputStateByElementId => {
  const states: DcdcInputStateByElementId = new Map();

  model.elements.forEach((element) => {
    if(element.type !== "dcdcConverter") return;

    states.set(element.id, {
      currentA: 0,
      isInputPowerLimitAmbiguous: false,
      wasInputPowerLimited: false,
    });
  });

  return states;
};

export const updateDcdcInputStates = (
  model: SimulationModel,
  voltageSources: DcdcVoltageSourceRef[],
  values: number[],
  circuitVoltages: Map<string, number>,
  currentStates: DcdcInputStateByElementId,
  options: {
    currentLimitToleranceA: number;
    nonlinearRelaxation: number;
    sourceVoltageConvergenceV: number;
  },
) => {
  const nextStates: DcdcInputStateByElementId = new Map(currentStates);
  const voltageSourceByElementId = new Map(voltageSources.map((source) => [source.elementId, source]));
  let maxCurrentDeltaA = 0;

  model.elements.forEach((element) => {
    if(element.type !== "dcdcConverter") return;

    const source = voltageSourceByElementId.get(element.id);
    const outputCurrentA = source?.currentVariableIndex !== undefined
      ? Math.abs(values[source.currentVariableIndex] ?? 0)
      : 0;
    const outputPositiveVoltage = circuitVoltages.get(element.terminals.outPositive);
    const outputNegativeVoltage = circuitVoltages.get(element.terminals.outNegative);
    const inputPositiveVoltage = circuitVoltages.get(element.terminals.inPositive);
    const inputNegativeVoltage = circuitVoltages.get(element.terminals.inNegative);
    const efficiency = dcdcEfficiency(element);
    const previousCurrentA = currentStates.get(element.id)?.currentA ?? 0;

    if(
      outputPositiveVoltage === undefined ||
      outputNegativeVoltage === undefined ||
      inputPositiveVoltage === undefined ||
      inputNegativeVoltage === undefined ||
      efficiency === undefined
    ) {
      return;
    }

    const outputVoltageV = Math.abs(outputPositiveVoltage - outputNegativeVoltage);
    const inputVoltageV = Math.abs(inputPositiveVoltage - inputNegativeVoltage);
    const nominalOutputVoltageV = numberParameter(element.parameters, "outputVoltageV") ?? outputVoltageV;
    const inputPowerW = outputVoltageV * outputCurrentA / efficiency;
    const targetCurrentA = inputVoltageV > MIN_DCDC_INPUT_VOLTAGE_V
      ? inputPowerW / inputVoltageV
      : inputPowerW / MIN_DCDC_INPUT_VOLTAGE_V;
    const nextCurrentA = relaxedDcdcInputCurrent(previousCurrentA, targetCurrentA, options.nonlinearRelaxation);
    const inputSupplyCurrentLimit = dcdcInputSupplyCurrentLimit(model, element);
    const availableOutputCurrentLimitA = inputSupplyCurrentLimit.currentLimitA !== undefined &&
      nominalOutputVoltageV > options.sourceVoltageConvergenceV
      ? inputVoltageV * inputSupplyCurrentLimit.currentLimitA * efficiency / nominalOutputVoltageV
      : undefined;

    maxCurrentDeltaA = Math.max(maxCurrentDeltaA, Math.abs(previousCurrentA - targetCurrentA));
    nextStates.set(element.id, {
      currentA: nextCurrentA,
      availableOutputCurrentLimitA,
      isInputPowerLimitAmbiguous: inputSupplyCurrentLimit.isAmbiguous,
      wasInputPowerLimited: (
        currentStates.get(element.id)?.wasInputPowerLimited ||
        (
          availableOutputCurrentLimitA !== undefined &&
          outputCurrentA > availableOutputCurrentLimitA + options.currentLimitToleranceA
        )
      ),
    });
  });

  return {
    nextStates,
    maxCurrentDeltaA,
  };
};
