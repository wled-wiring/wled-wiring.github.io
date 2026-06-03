import type { Edge, Node } from "@xyflow/react";

import { createDiagramCheckContext } from "../check/checkContext";
import type { CheckHandle, CheckNet, CheckNetClassification } from "../check/checkContext";
import type { ComponentDataType, EdgeDataType, HandleDataType } from "../types";
import { calculateCopperWireResistanceFromEdgeData } from "./wireResistance";
import { resolveLedSimulationOptionParameter } from "./ledStripSimulationOptions";
import type {
  ComponentSimulationElementUse,
  ComponentSimulationElementType,
  SimulationCheckIssue,
  SimulationCheckNetRef,
  SimulationCircuitNode,
  SimulationComponent,
  SimulationElement,
  SimulationModel,
  SimulationNetClassification,
  SimulationParameterPrimitive,
  SimulationParameterRef,
  SimulationPin,
  SimulationPinRole,
  SimulationSettings,
  SimulationVirtualPin,
  SimulationWireElement,
  UsbPowerPairSimulationPort,
} from "./simulationTypes";

export type BuildSimulationModelResult =
  | {ok: true; model: SimulationModel; issues: SimulationCheckIssue[]}
  | {ok: false; issues: SimulationCheckIssue[]};

const DEFAULT_SIMULATION_SETTINGS: SimulationSettings = {
  ledColorMode: "RGB_WHITE",
  brightnessPercent: 100,
};

const pinId = (nodeId: string, handleId: string) => `${nodeId}::${handleId}`;
const virtualTerminalPinId = (nodeId: string, portId: string, terminalName: string) => (
  `${nodeId}::simulation-port:${portId}:${terminalName}`
);

class UnionFind {
  private parent = new Map<string, string>();

  add(value: string) {
    if(!this.parent.has(value)) {
      this.parent.set(value, value);
    }
  }

  find(value: string): string {
    const parent = this.parent.get(value);
    if(parent === undefined || parent === value) {
      return value;
    }

    const root = this.find(parent);
    this.parent.set(value, root);
    return root;
  }

  union(a: string, b: string) {
    this.add(a);
    this.add(b);

    const rootA = this.find(a);
    const rootB = this.find(b);

    if(rootA !== rootB) {
      this.parent.set(rootB, rootA);
    }
  }

  values() {
    return Array.from(this.parent.keys());
  }
}

const isHiddenByCondition = (node: Node<ComponentDataType>, handle: HandleDataType) => (
  handle.hideConditions?.some((condition) => {
    const selectedValue = node.data.selectFields?.find((field) => (
      field.technicalID === condition.selectHID
    ))?.selectedValue;

    return selectedValue !== undefined && condition.values.includes(selectedValue);
  }) || false
);

const visibleHandles = (node: Node<ComponentDataType>) => (
  [
    ...(node.data.handles || []),
    ...(node.data.repeatedHandleArray || []),
  ].filter((handle) => !isHiddenByCondition(node, handle))
);

const allHandles = (node: Node<ComponentDataType>) => [
  ...(node.data.handles || []),
  ...(node.data.repeatedHandleArray || []),
];

const isPassiveJoinNode = (node: Node<ComponentDataType>) => (
  ["SolderJoint", "WAGO_2X", "WAGO_3X"].includes(node.data.technicalID)
);

const isDcIgnoredNoElementNode = (node: Node<ComponentDataType>) => (
  ["Kerko", "Elko"].includes(node.data.technicalID)
);

const handlePosition = (node: Node<ComponentDataType>, handle: HandleDataType) => ({
  x: node.position.x + handle.x,
  y: node.position.y + handle.y,
});

type DigitalLedSectionPlan = {
  sectionIndex: number;
  startIndex: number;
  endIndex: number;
  lengthM: number;
  distanceStartM: number;
  logicLedCount: number;
  supplyPinIds: string[];
  gndPinIds: string[];
};

type DigitalLedElementUse = Extract<ComponentSimulationElementUse, {type: "digitalLed"}>;

type DigitalLedElementPlan = {
  element: DigitalLedElementUse;
  parameters: Record<string, SimulationParameterPrimitive> | undefined;
  sections: DigitalLedSectionPlan[];
};

type UsbPowerPairPortRef = {
  node: Node<ComponentDataType>;
  port: UsbPowerPairSimulationPort;
  positivePinId: string;
  negativePinId: string;
};

type SimulationTerminalResolutionContext = {
  handleByPinId: Map<string, CheckHandle>;
  virtualTerminalPinByNodeId: Map<string, Map<string, string>>;
  hiddenVirtualTerminalByNodeId: Map<string, Set<string>>;
};

const isDigitalLedElement = (
  element: ComponentSimulationElementUse,
): element is DigitalLedElementUse => element.type === "digitalLed";

const netClassifications: Record<CheckNetClassification, SimulationNetClassification | undefined> = {
  gnd_net_type: "gnd",
  suppl_net_type: "supply",
  pwm_net_type: "pwm",
  digital_net_type: undefined,
  analog_net_type: undefined,
  audio_net_type: undefined,
  eth_net_type: undefined,
  usb_net_type: undefined,
  rs485_a_net_type: undefined,
  rs485_b_net_type: undefined,
  N_net_type: undefined,
  L_net_type: undefined,
  PE_net_type: undefined,
};

const mapNetClassifications = (classifications: CheckNetClassification[]) => (
  classifications.flatMap((classification) => {
    const mapped = netClassifications[classification];
    return mapped ? [mapped] : [];
  })
);

const pinRoleFromFunctions = (functions: string[]): SimulationPinRole => {
  if(functions.includes("gnd")) return "gnd";
  if(
    functions.includes("suppl_in") ||
    functions.includes("suppl_out") ||
    functions.includes("usb_power_out") ||
    functions.includes("usb_full")
  ) {
    return "supply";
  }
  if(
    functions.includes("pwm_out") ||
    functions.includes("pwm_in_R") ||
    functions.includes("pwm_in_G") ||
    functions.includes("pwm_in_B") ||
    functions.includes("pwm_in_W") ||
    functions.includes("pwm_in_WW")
  ) {
    return "pwm";
  }

  return "other";
};

const getInputFieldValue = (
  node: Node<ComponentDataType>,
  technicalID: string,
): SimulationParameterPrimitive | undefined => (
  node.data.inputFields?.find((field) => field.technicalID === technicalID)?.value
);

const getSelectFieldValue = (
  node: Node<ComponentDataType>,
  technicalID: string,
): SimulationParameterPrimitive | undefined => (
  node.data.selectFields?.find((field) => field.technicalID === technicalID)?.selectedValue
);

const issue = (
  id: string,
  title: string,
  description: string,
  targets?: SimulationCheckIssue["targets"],
  severity: SimulationCheckIssue["severity"] = "error",
): SimulationCheckIssue => ({
  id,
  severity,
  title,
  description,
  targets,
});

const isRelevantSimulationNet = (net: CheckNet | undefined) => (
  Boolean(net && mapNetClassifications(net.classifications).length > 0)
);

const resolveParameter = (
  ref: SimulationParameterRef,
  node: Node<ComponentDataType>,
  settings: SimulationSettings,
): {ok: true; value: SimulationParameterPrimitive} | {ok: false; message: string; issue?: SimulationCheckIssue} => {
  if(typeof ref === "number" || typeof ref === "string" || typeof ref === "boolean") {
    return {ok: true, value: ref};
  }

  if("const" in ref) {
    return {ok: true, value: ref.const};
  }

  if("field" in ref) {
    const value = getInputFieldValue(node, ref.field);
    if(value !== undefined) return {ok: true, value};
    if(ref.default !== undefined) return {ok: true, value: ref.default};

    return {ok: false, message: `Missing input field value: ${ref.field}.`};
  }

  if("select" in ref) {
    const value = getSelectFieldValue(node, ref.select);
    if(value !== undefined) return {ok: true, value};
    if(ref.default !== undefined) return {ok: true, value: ref.default};

    return {ok: false, message: `Missing select field value: ${ref.select}.`};
  }

  if("table" in ref) {
    const selector = resolveParameter(ref.by, node, settings);
    if(!selector.ok) return selector;

    const value = ref.table[String(selector.value)];
    if(value !== undefined) return {ok: true, value};
    if(ref.default !== undefined) return {ok: true, value: ref.default};

    return {ok: false, message: `No table value for selector ${String(selector.value)}.`};
  }

  if("ledCurve" in ref) {
    return {
      ok: true,
      value: ref.ledCurve,
    };
  }

  if("ledSimulationOption" in ref) {
    const result = resolveLedSimulationOptionParameter(node.data, node.id, ref.ledSimulationOption);
    if(result.ok) return result;

    return {
      ok: false,
      message: result.issue.description,
      issue: result.issue,
    };
  }

  return {ok: false, message: "Unsupported simulation parameter reference."};
};

const isLedSimulationOptionRef = (ref: SimulationParameterRef | undefined) => (
  typeof ref === "object" &&
  ref !== null &&
  !Array.isArray(ref) &&
  "ledSimulationOption" in ref
);

const resolveParameters = (
  element: ComponentSimulationElementUse,
  node: Node<ComponentDataType>,
  settings: SimulationSettings,
  issues: SimulationCheckIssue[],
) => {
  const parameters = element.parameters;
  if(!parameters) return undefined;

  const resolved: Record<string, SimulationParameterPrimitive> = {};

  if(element.type === "digitalLed") {
    const digitalParameters = parameters as DigitalLedElementUse["parameters"];
    [
      ["supplyResistanceOhm", digitalParameters.supplyResistanceOhm],
      ["gndResistanceOhm", digitalParameters.gndResistanceOhm],
      ["currentCurve", digitalParameters.currentCurve],
    ].forEach(([key, ref]) => {
      if(isLedSimulationOptionRef(ref as SimulationParameterRef)) return;

      issues.push(issue(
        `simulation-led-options:${node.id}:${element.id}:${key}`,
        "LED simulation options need an update",
        "This LED component uses outdated simulation parameters. Please update this component from the current component template.",
        [{type: "node", nodeId: node.id}],
      ));
    });
  }

  Object.entries(parameters).forEach(([key, ref]) => {
    const result = resolveParameter(ref, node, settings);
    if(result.ok) {
      resolved[key] = result.value;
      return;
    }

    issues.push(result.issue ?? issue(
      `simulation-parameter:${node.id}:${element.id}:${key}`,
      "Simulation parameter could not be resolved",
      result.message,
      [{type: "node", nodeId: node.id}],
    ));
  });

  return resolved;
};

const scaleDigitalLedParameters = (
  element: ComponentSimulationElementUse,
  node: Node<ComponentDataType>,
  parameters: Record<string, SimulationParameterPrimitive> | undefined,
  issues: SimulationCheckIssue[],
) => {
  if(element.type !== "digitalLed" || !parameters) {
    return parameters;
  }

  const physLedsPerLogicLed = parameters.physLedsPerLogicLed;
  if(typeof physLedsPerLogicLed !== "number" || !Number.isFinite(physLedsPerLogicLed) || physLedsPerLogicLed <= 0) {
    issues.push(issue(
      `simulation-led-grouping:${node.id}:${element.id}`,
      "Invalid LED grouping",
      "Digital LED simulation needs a positive physLedsPerLogicLed value.",
      [{type: "node", nodeId: node.id}],
    ));
    return parameters;
  }

  const scaled = {...parameters};
  const supplyResistanceOhm = scaled.supplyResistanceOhm;
  const gndResistanceOhm = scaled.gndResistanceOhm;
  const ledsPerMeter = scaled.ledsPerMeter;

  if(typeof ledsPerMeter !== "number" || !Number.isFinite(ledsPerMeter) || ledsPerMeter <= 0) {
    issues.push(issue(
      `simulation-led-density:${node.id}:${element.id}`,
      "Invalid LED density",
      "Digital LED simulation needs a positive ledsPerMeter value.",
      [{type: "node", nodeId: node.id}],
    ));
    return parameters;
  }

  if(typeof supplyResistanceOhm === "number") {
    scaled.supplyResistanceOhm = supplyResistanceOhm * physLedsPerLogicLed / ledsPerMeter;
    scaled.supplyResistanceOhmPerMeter = supplyResistanceOhm;
  }

  if(typeof gndResistanceOhm === "number") {
    scaled.gndResistanceOhm = gndResistanceOhm * physLedsPerLogicLed / ledsPerMeter;
    scaled.gndResistanceOhmPerMeter = gndResistanceOhm;
  }

  scaled.logicLedsPerMeter = ledsPerMeter / physLedsPerLogicLed;
  scaled.currentScaleFactor = physLedsPerLogicLed;

  return scaled;
};

const terminalPinIds = (
  node: Node<ComponentDataType>,
  element: ComponentSimulationElementUse,
  resolutionContext: SimulationTerminalResolutionContext,
  issues: SimulationCheckIssue[],
): {status: "ok"; terminals: Record<string, string>} | {status: "ignored"} | {status: "invalid"} => {
  const terminals: Record<string, string> = {};
  let hasInvalidTerminal = false;
  let hasHiddenTerminal = false;

  Object.entries(element.terminals).forEach(([terminalName, handleId]) => {
    const virtualPinId = resolutionContext.virtualTerminalPinByNodeId.get(node.id)?.get(handleId);
    if(virtualPinId) {
      terminals[terminalName] = virtualPinId;
      return;
    }

    if(resolutionContext.hiddenVirtualTerminalByNodeId.get(node.id)?.has(handleId)) {
      hasHiddenTerminal = true;
      return;
    }

    const id = pinId(node.id, handleId);
    if(resolutionContext.handleByPinId.has(id)) {
      terminals[terminalName] = id;
      return;
    }

    const handle = allHandles(node).find((candidate) => candidate.hid === handleId);
    if(handle && isHiddenByCondition(node, handle)) {
      hasHiddenTerminal = true;
      return;
    }

    hasInvalidTerminal = true;
    issues.push(issue(
      `simulation-terminal:${node.id}:${element.id}:${terminalName}`,
      "Simulation terminal points to a missing pin",
      `Element terminal ${terminalName} references missing handle ${handleId}.`,
      [{type: "node", nodeId: node.id}],
    ));
  });

  if(hasInvalidTerminal) {
    return {status: "invalid"};
  }

  if(hasHiddenTerminal) {
    return {status: "ignored"};
  }

  return {status: "ok", terminals};
};

const unionShortBridgeTerminals = (
  nodes: Node<ComponentDataType>[],
  terminalResolutionContext: SimulationTerminalResolutionContext,
  unionFind: UnionFind,
  issues: SimulationCheckIssue[],
) => {
  nodes.forEach((node) => {
    node.data.simdata?.elements
      ?.filter((element) => element.type === "shortBridge")
      .forEach((element) => {
        const terminalResolution = terminalPinIds(node, element, terminalResolutionContext, issues);
        if(terminalResolution.status !== "ok") return;

        const a = terminalResolution.terminals.a;
        const b = terminalResolution.terminals.b;

        if(a && b) {
          unionFind.union(a, b);
        }
      });
  });
};

const unionPassiveJoinNodeTerminals = (
  nodes: Node<ComponentDataType>[],
  handleByPinId: Map<string, CheckHandle>,
  unionFind: UnionFind,
) => {
  nodes
    .filter(isPassiveJoinNode)
    .forEach((node) => {
      const nodePinIds = visibleHandles(node)
        .map((handle) => pinId(node.id, handle.hid))
        .filter((id) => handleByPinId.has(id));

      nodePinIds.slice(1).forEach((id) => {
        unionFind.union(nodePinIds[0], id);
      });
    });
};

const createSimulationCheckNetRef = (net: CheckNet): SimulationCheckNetRef => ({
  id: net.id,
  classifications: mapNetClassifications(net.classifications),
  pinIds: net.handles.map((handle) => pinId(handle.node.id, handle.handle.hid)),
  wireIds: net.edges.map((edge) => edge.id),
});

const collectUsbPowerPairPorts = (
  nodes: Node<ComponentDataType>[],
  handleByPinId: Map<string, CheckHandle>,
  unionFind: UnionFind,
  issues: SimulationCheckIssue[],
) => {
  const ports: UsbPowerPairPortRef[] = [];
  const virtualTerminalPinByNodeId = new Map<string, Map<string, string>>();
  const hiddenVirtualTerminalByNodeId = new Map<string, Set<string>>();
  const portByNodeHandle = new Map<string, UsbPowerPairPortRef>();

  nodes.forEach((node) => {
    const terminalMap = new Map<string, string>();
    const seenPortIds = new Set<string>();

    node.data.simdata?.ports?.forEach((port) => {
      if(port.type !== "usbPowerPair") return;

      if(seenPortIds.has(port.id)) {
        issues.push(issue(
          `simulation-port:${node.id}:${port.id}:duplicate`,
          "Duplicate simulation port id",
          `Simulation port id ${port.id} is used more than once on this component.`,
          [{type: "node", nodeId: node.id}],
        ));
        return;
      }
      seenPortIds.add(port.id);

      const handle = handleByPinId.get(pinId(node.id, port.handle));
      if(!handle) {
        const rawHandle = allHandles(node).find((candidate) => candidate.hid === port.handle);
        if(rawHandle && isHiddenByCondition(node, rawHandle)) {
          const hiddenTerminals = hiddenVirtualTerminalByNodeId.get(node.id) ?? new Set<string>();
          hiddenTerminals.add(port.positiveTerminal);
          hiddenTerminals.add(port.negativeTerminal);
          hiddenVirtualTerminalByNodeId.set(node.id, hiddenTerminals);
        } else {
          issues.push(issue(
            `simulation-port:${node.id}:${port.id}:handle`,
            "Simulation port points to a missing pin",
            `USB power-pair port ${port.id} references missing handle ${port.handle}.`,
            [{type: "node", nodeId: node.id}],
          ));
        }
        return;
      }

      if(port.positiveTerminal === port.negativeTerminal) {
        issues.push(issue(
          `simulation-port:${node.id}:${port.id}:terminals`,
          "Simulation port terminals are invalid",
          "USB power-pair positive and negative terminals must be different.",
          [{type: "node", nodeId: node.id}],
        ));
        return;
      }

      const positivePinId = virtualTerminalPinId(node.id, port.id, "VBUS");
      const negativePinId = virtualTerminalPinId(node.id, port.id, "GND");
      unionFind.add(positivePinId);
      unionFind.add(negativePinId);
      terminalMap.set(port.positiveTerminal, positivePinId);
      terminalMap.set(port.negativeTerminal, negativePinId);

      const portRef = {
        node,
        port,
        positivePinId,
        negativePinId,
      };
      ports.push(portRef);
      portByNodeHandle.set(`${node.id}:${port.handle}`, portRef);
    });

    if(terminalMap.size > 0) {
      virtualTerminalPinByNodeId.set(node.id, terminalMap);
    }
  });

  return {
    ports,
    portByNodeHandle,
    virtualTerminalPinByNodeId,
    hiddenVirtualTerminalByNodeId,
  };
};

const collectReferenceCandidate = (
  element: ComponentSimulationElementUse,
  node: Node<ComponentDataType>,
  settings: SimulationSettings,
  terminalResolutionContext: SimulationTerminalResolutionContext,
  issues: SimulationCheckIssue[],
) => {
  if(element.type !== "voltageSource") return undefined;

  const terminalResolution = terminalPinIds(node, element, terminalResolutionContext, issues);
  if(terminalResolution.status !== "ok") return undefined;

  const currentLimit = resolveParameter(element.parameters.currentLimitA, node, settings);
  if(!currentLimit.ok || typeof currentLimit.value !== "number") return undefined;

  return {
    currentLimitA: currentLimit.value,
    sourceId: `${node.id}:${element.id}`,
    negativePinId: terminalResolution.terminals.negative,
  };
};

const voltageSourceCircuitTerminals = (element: SimulationElement) => {
  if(element.type === "voltageSource") {
    return {
      positive: element.terminals.positive,
      negative: element.terminals.negative,
      voltageV: typeof element.parameters?.voltageV === "number" ? element.parameters.voltageV : undefined,
    };
  }

  if(element.type === "dcdcConverter") {
    return {
      positive: element.terminals.outPositive,
      negative: element.terminals.outNegative,
      voltageV: typeof element.parameters?.outputVoltageV === "number" ? element.parameters.outputVoltageV : undefined,
    };
  }

  return undefined;
};

const addVoltageSourceConflictIssues = (
  elements: SimulationElement[],
  issues: SimulationCheckIssue[],
) => {
  const voltageToleranceV = 0.0005;
  const sourceGroups = new Map<string, Array<{element: SimulationElement; voltageV: number}>>();

  elements.forEach((element) => {
    const source = voltageSourceCircuitTerminals(element);
    if(!source?.positive || !source.negative || source.voltageV === undefined) return;

    const key = `${source.positive}->${source.negative}`;
    const group = sourceGroups.get(key) ?? [];
    group.push({element, voltageV: source.voltageV});
    sourceGroups.set(key, group);
  });

  sourceGroups.forEach((group, key) => {
    const reference = group[0];
    const hasConflict = group.some((candidate) => (
      Math.abs(candidate.voltageV - reference.voltageV) > voltageToleranceV
    ));
    if(!hasConflict) return;

    issues.push(issue(
      `simulation-voltage-source-conflict:${key}`,
      "Conflicting voltage sources",
      "Multiple voltage sources with different voltages are connected to the same supply/GND system. Parallel source balancing is not simulated.",
      group.map(({element}) => ({type: "element", elementId: element.id})),
    ));
  });
};

const simulationPinId = (
  nodeId: string,
  elementId: string,
  rail: "supply" | "gnd",
  segment: string,
  index: number,
) => `${nodeId}::simulation:${elementId}:${rail}:${segment}:${index}`;

const middleHandleId = (baseHandleId: string, index: number) => `${baseHandleId}_middle_${index}`;

const terminalBaseHandleId = (handleId: string) => (
  handleId.replace(/_(start|end)$/, "")
);

const sortedLedPhysLengths = (
  node: Node<ComponentDataType>,
  requiredBoundaryIndexes: Set<number>,
) => {
  const nodeLength = node.data.nodeLength || 1;
  const byStartIndex = new Map<number, number | undefined>();
  byStartIndex.set(0, undefined);

  node.data.physLengths?.forEach((physLength) => {
    if(
      Number.isInteger(physLength.startIndex) &&
      physLength.startIndex >= 0 &&
      physLength.startIndex < nodeLength
    ) {
      byStartIndex.set(physLength.startIndex, physLength.length);
    }
  });

  requiredBoundaryIndexes.forEach((startIndex) => {
    if(startIndex > 0 && startIndex < nodeLength && !byStartIndex.has(startIndex)) {
      byStartIndex.set(startIndex, undefined);
    }
  });

  return Array.from(byStartIndex.entries())
    .map(([startIndex, length]) => ({startIndex, length}))
    .sort((a, b) => a.startIndex - b.startIndex);
};

const connectedMiddleBoundaryIndexes = (
  node: Node<ComponentDataType>,
  edges: Edge<EdgeDataType>[],
  baseHandleIds: string[],
) => {
  const baseHandleIdSet = new Set(baseHandleIds);
  const indexes = new Set<number>();

  edges.forEach((edge) => {
    const handleId = edge.source === node.id ? edge.sourceHandle : edge.target === node.id ? edge.targetHandle : undefined;
    if(!handleId) return;

    const match = /^(.+)_middle_(\d+)$/.exec(handleId);
    if(!match || !baseHandleIdSet.has(match[1])) return;

    indexes.add(Number(match[2]));
  });

  return indexes;
};

const findMiddleHandlePinId = (
  node: Node<ComponentDataType>,
  baseHandleId: string,
  boundaryIndex: number,
) => {
  const expectedHandleId = middleHandleId(baseHandleId, boundaryIndex);
  const handle = visibleHandles(node).find((candidate) => (
    candidate.hid === expectedHandleId ||
    (candidate.repeatIndex === boundaryIndex && candidate.hid === expectedHandleId)
  ));

  return handle ? pinId(node.id, handle.hid) : undefined;
};

const collectLedBoundaryPinId = (
  node: Node<ComponentDataType>,
  element: DigitalLedElementUse,
  rail: "supply" | "gnd",
  boundaryIndex: number,
  terminalPins: Record<string, string>,
  unionFind: UnionFind,
) => {
  const nodeLength = node.data.nodeLength || 1;

  if(rail === "supply") {
    if(boundaryIndex === 0) return terminalPins.supplyIn;
    if(boundaryIndex === nodeLength) return terminalPins.supplyOut;
  } else {
    if(boundaryIndex === 0) return terminalPins.gndIn;
    if(boundaryIndex === nodeLength) return terminalPins.gndOut;
  }

  const boundaryPinId = simulationPinId(node.id, element.id, rail, "boundary", boundaryIndex);
  unionFind.add(boundaryPinId);

  const terminalName = rail === "supply" ? "supplyIn" : "gndIn";
  const baseHandleId = terminalBaseHandleId(String(element.terminals[terminalName]));
  const concreteMiddlePinId = findMiddleHandlePinId(node, baseHandleId, boundaryIndex);

  if(concreteMiddlePinId) {
    unionFind.union(boundaryPinId, concreteMiddlePinId);
  }

  return boundaryPinId;
};

const collectDigitalLedElementPlans = (
  nodes: Node<ComponentDataType>[],
  edges: Edge<EdgeDataType>[],
  settings: SimulationSettings,
  terminalResolutionContext: SimulationTerminalResolutionContext,
  unionFind: UnionFind,
  issues: SimulationCheckIssue[],
) => {
  const plans = new Map<string, DigitalLedElementPlan>();

  nodes.forEach((node) => {
    node.data.simdata?.elements
      ?.filter(isDigitalLedElement)
      .forEach((element) => {
        const terminalResolution = terminalPinIds(node, element, terminalResolutionContext, issues);
        if(terminalResolution.status !== "ok") return;

        const resolvedParameters = resolveParameters(element, node, settings, issues);
        const parameters = scaleDigitalLedParameters(element, node, resolvedParameters, issues);
        const ledsPerMeter = parameters?.ledsPerMeter;
        const physLedsPerLogicLed = parameters?.physLedsPerLogicLed;

        if(
          typeof ledsPerMeter !== "number" ||
          typeof physLedsPerLogicLed !== "number" ||
          !Number.isFinite(ledsPerMeter) ||
          !Number.isFinite(physLedsPerLogicLed) ||
          ledsPerMeter <= 0 ||
          physLedsPerLogicLed <= 0
        ) {
          issues.push(issue(
            `simulation-led-segments:${node.id}:${element.id}:parameters`,
            "LED strip segmentation failed",
            "Digital LED simulation needs numeric ledsPerMeter and physLedsPerLogicLed parameters.",
            [{type: "node", nodeId: node.id}],
          ));
          return;
        }

        const nodeLength = node.data.nodeLength || 1;
        const physLengths = sortedLedPhysLengths(
          node,
          connectedMiddleBoundaryIndexes(node, edges, [
            terminalBaseHandleId(element.terminals.supplyIn),
            terminalBaseHandleId(element.terminals.gndIn),
          ]),
        );
        let distanceStartM = 0;
        const sections = physLengths.flatMap((physLength, index): DigitalLedSectionPlan[] => {
          const endIndex = physLengths[index + 1]?.startIndex ?? nodeLength;
          const lengthM = physLength.length;

          if(typeof lengthM !== "number" || !Number.isFinite(lengthM) || lengthM <= 0) {
            issues.push(issue(
              `simulation-led-segments:${node.id}:${element.id}:${physLength.startIndex}:length`,
              "LED strip segment length is missing",
              `LED segment starting at index ${physLength.startIndex} needs a positive physical length.`,
              [{type: "node", nodeId: node.id}],
            ));
            return [];
          }

          const logicLedCount = Math.round(lengthM * ledsPerMeter / physLedsPerLogicLed);
          if(logicLedCount <= 0) {
            distanceStartM += lengthM;
            return [];
          }

          const supplyPinIds = Array.from({length: logicLedCount + 1}, (_unused, ledIndex) => {
            if(ledIndex === 0) {
              return collectLedBoundaryPinId(
                node,
                element,
                "supply",
                physLength.startIndex,
                terminalResolution.terminals,
                unionFind,
              );
            }
            if(ledIndex === logicLedCount) {
              return collectLedBoundaryPinId(
                node,
                element,
                "supply",
                endIndex,
                terminalResolution.terminals,
                unionFind,
              );
            }

            const id = simulationPinId(node.id, element.id, "supply", `${physLength.startIndex}:led`, ledIndex);
            unionFind.add(id);
            return id;
          });

          const gndPinIds = Array.from({length: logicLedCount + 1}, (_unused, ledIndex) => {
            if(ledIndex === 0) {
              return collectLedBoundaryPinId(
                node,
                element,
                "gnd",
                physLength.startIndex,
                terminalResolution.terminals,
                unionFind,
              );
            }
            if(ledIndex === logicLedCount) {
              return collectLedBoundaryPinId(
                node,
                element,
                "gnd",
                endIndex,
                terminalResolution.terminals,
                unionFind,
              );
            }

            const id = simulationPinId(node.id, element.id, "gnd", `${physLength.startIndex}:led`, ledIndex);
            unionFind.add(id);
            return id;
          });

          const section: DigitalLedSectionPlan = {
            sectionIndex: index,
            startIndex: physLength.startIndex,
            endIndex,
            lengthM,
            distanceStartM,
            logicLedCount,
            supplyPinIds,
            gndPinIds,
          };
          distanceStartM += lengthM;
          return [section];
        });

        plans.set(`${node.id}:${element.id}`, {
          element,
          parameters,
          sections,
        });
      });
  });

  return plans;
};

const ledBoundaryHandleId = (
  element: DigitalLedElementUse,
  rail: "supply" | "gnd",
  boundaryIndex: number,
  nodeLength: number,
) => {
  if(rail === "supply") {
    if(boundaryIndex === 0) return String(element.terminals.supplyIn);
    if(boundaryIndex === nodeLength) return String(element.terminals.supplyOut);

    return middleHandleId(terminalBaseHandleId(String(element.terminals.supplyIn)), boundaryIndex);
  }

  if(boundaryIndex === 0) return String(element.terminals.gndIn);
  if(boundaryIndex === nodeLength) return String(element.terminals.gndOut);

  return middleHandleId(terminalBaseHandleId(String(element.terminals.gndIn)), boundaryIndex);
};

const ledBoundaryPosition = (
  node: Node<ComponentDataType>,
  handleId: string,
  boundaryIndex: number,
  rail: "supply" | "gnd",
) => {
  const handle = visibleHandles(node).find((candidate) => candidate.hid === handleId);
  if(handle) return handlePosition(node, handle);

  const width = node.measured?.width ?? node.width ?? node.data.image?.width ?? 0;
  const height = node.measured?.height ?? node.height ?? node.data.image?.height ?? 0;
  const nodeLength = node.data.nodeLength || 1;
  const x = node.position.x + width * Math.min(1, Math.max(0, boundaryIndex / nodeLength));
  const y = node.position.y + (rail === "supply" ? height * 0.25 : height * 0.75);

  return {x, y};
};

const createDigitalLedVirtualPins = (
  nodes: Node<ComponentDataType>[],
  digitalLedElementPlans: Map<string, DigitalLedElementPlan>,
  pinToCircuitNodeId: Map<string, string>,
) => {
  const virtualPins = new Map<string, SimulationVirtualPin>();
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  digitalLedElementPlans.forEach((plan, key) => {
    const [nodeId] = key.split(":");
    const node = nodeById.get(nodeId);
    if(!node) return;

    const nodeLength = node.data.nodeLength || 1;

    plan.sections.forEach((section) => {
      [
        {
          boundaryIndex: section.startIndex,
          supplyPinId: section.supplyPinIds[0],
          gndPinId: section.gndPinIds[0],
        },
        {
          boundaryIndex: section.endIndex,
          supplyPinId: section.supplyPinIds[section.supplyPinIds.length - 1],
          gndPinId: section.gndPinIds[section.gndPinIds.length - 1],
        },
      ].forEach((boundary) => {
        const supplyHandleId = ledBoundaryHandleId(plan.element, "supply", boundary.boundaryIndex, nodeLength);
        const gndHandleId = ledBoundaryHandleId(plan.element, "gnd", boundary.boundaryIndex, nodeLength);

        [
          {
            role: "supply" as const,
            handleId: supplyHandleId,
            pairedHandleId: gndHandleId,
            pinId: boundary.supplyPinId,
          },
          {
            role: "gnd" as const,
            handleId: gndHandleId,
            pairedHandleId: supplyHandleId,
            pinId: boundary.gndPinId,
          },
        ].forEach((virtualPin) => {
          const id = `${node.id}::virtual:${plan.element.id}:${virtualPin.role}:${boundary.boundaryIndex}`;
          if(virtualPins.has(id)) return;

          virtualPins.set(id, {
            id,
            nodeId: node.id,
            handleId: virtualPin.handleId,
            role: virtualPin.role,
            segmentBoundaryIndex: boundary.boundaryIndex,
            pairedHandleId: virtualPin.pairedHandleId,
            circuitNodeId: pinToCircuitNodeId.get(virtualPin.pinId),
            position: ledBoundaryPosition(node, virtualPin.handleId, boundary.boundaryIndex, virtualPin.role),
          });
        });
      });
    });
  });

  return Array.from(virtualPins.values());
};

const createUsbPowerPairVirtualPins = (
  usbPorts: UsbPowerPairPortRef[],
  pinToCircuitNodeId: Map<string, string>,
) => (
  usbPorts.flatMap((portRef) => {
    const handle = visibleHandles(portRef.node).find((candidate) => candidate.hid === portRef.port.handle);
    const position = handle ? handlePosition(portRef.node, handle) : portRef.node.position;

    return [
      {
        id: `${portRef.node.id}::virtual:${portRef.port.id}:VBUS`,
        nodeId: portRef.node.id,
        handleId: portRef.port.handle,
        role: "supply" as const,
        kind: "usbPowerPair" as const,
        pairedHandleId: portRef.port.handle,
        voltageLabel: "VUSB" as const,
        circuitNodeId: pinToCircuitNodeId.get(portRef.positivePinId),
        position,
      },
      {
        id: `${portRef.node.id}::virtual:${portRef.port.id}:GND`,
        nodeId: portRef.node.id,
        handleId: portRef.port.handle,
        role: "gnd" as const,
        kind: "usbPowerPair" as const,
        pairedHandleId: portRef.port.handle,
        circuitNodeId: pinToCircuitNodeId.get(portRef.negativePinId),
        position,
      },
    ];
  })
);

export const buildSimulationModel = (
  nodes: Node<ComponentDataType>[],
  edges: Edge<EdgeDataType>[],
  settings: SimulationSettings = DEFAULT_SIMULATION_SETTINGS,
): BuildSimulationModelResult => {
  const issues: SimulationCheckIssue[] = [];
  const checkContext = createDiagramCheckContext(nodes, edges);
  const checkNetByPinId = new Map<string, CheckNet>();
  const handleByPinId = new Map<string, CheckHandle>();
  const unionFind = new UnionFind();

  checkContext.handles.forEach((handle) => {
    const id = pinId(handle.node.id, handle.handle.hid);
    handleByPinId.set(id, handle);
    unionFind.add(id);

    const net = checkContext.getNetByHandle(handle);
    if(net) {
      checkNetByPinId.set(id, net);
    }
  });

  const usbPowerPairPorts = collectUsbPowerPairPorts(nodes, handleByPinId, unionFind, issues);
  const terminalResolutionContext: SimulationTerminalResolutionContext = {
    handleByPinId,
    virtualTerminalPinByNodeId: usbPowerPairPorts.virtualTerminalPinByNodeId,
    hiddenVirtualTerminalByNodeId: usbPowerPairPorts.hiddenVirtualTerminalByNodeId,
  };

  unionShortBridgeTerminals(nodes, terminalResolutionContext, unionFind, issues);
  unionPassiveJoinNodeTerminals(nodes, handleByPinId, unionFind);
  const digitalLedElementPlans = collectDigitalLedElementPlans(
    nodes,
    edges,
    settings,
    terminalResolutionContext,
    unionFind,
    issues,
  );

  const rootToCircuitNodeId = new Map<string, string>();
  const pinToCircuitNodeId = new Map<string, string>();

  unionFind.values().forEach((id) => {
    const root = unionFind.find(id);
    const circuitNodeId = rootToCircuitNodeId.get(root) || `circuit:${rootToCircuitNodeId.size + 1}`;
    rootToCircuitNodeId.set(root, circuitNodeId);
    pinToCircuitNodeId.set(id, circuitNodeId);
  });

  const circuitNodes: SimulationCircuitNode[] = Array.from(rootToCircuitNodeId.entries()).map(([
    root,
    id,
  ]) => {
    const groupedPinIds = Array.from(pinToCircuitNodeId.entries())
      .filter(([, circuitNodeId]) => circuitNodeId === id)
      .map(([groupedPinId]) => groupedPinId);
    const sourceCheckNetId = groupedPinIds
      .map((groupedPinId) => checkNetByPinId.get(groupedPinId)?.id)
      .find((checkNetId) => checkNetId !== undefined);

    return {
      id,
      sourceCheckNetId,
      pinIds: groupedPinIds.length > 0 ? groupedPinIds : [root],
    };
  });

  const pins: SimulationPin[] = checkContext.handles.map((handle) => {
    const id = pinId(handle.node.id, handle.handle.hid);

    return {
      id,
      nodeId: handle.node.id,
      handleId: handle.handle.hid,
      circuitNodeId: pinToCircuitNodeId.get(id),
      sourceCheckNetId: checkNetByPinId.get(id)?.id,
      connectedWireIds: handle.connectedEdges.map((edge) => edge.id),
      functions: handle.functions,
      role: pinRoleFromFunctions(handle.functions),
      voltageMin: handle.voltageMin,
      voltageMax: handle.voltageMax,
      maxCurrentA: handle.handle.Imax,
      position: handlePosition(handle.node, handle.handle),
    };
  });

  const gndNetIds = new Set(
    checkContext.componentLinkedNets
      .filter((net) => net.classifications.includes("gnd_net_type"))
      .map((net) => net.id),
  );
  if(gndNetIds.size > 1) {
    issues.push(issue(
      "simulation-gnd-reference:multiple-islands",
      "Multiple separate GND nets",
      `Simulation needs one common GND reference, but ${gndNetIds.size} separate GND nets were found.`,
    ));
  }

  nodes.forEach((node) => {
    if(node.data.simdata !== undefined) return;
    if(isPassiveJoinNode(node)) return;
    if(isDcIgnoredNoElementNode(node)) return;

    const relevantHandles = visibleHandles(node).filter((handle) => {
      const handleRef = handleByPinId.get(pinId(node.id, handle.hid));
      if(!handleRef || handleRef.connectedEdges.length === 0) return false;

      return isRelevantSimulationNet(checkContext.getNetByHandle(handleRef));
    });
    if(relevantHandles.length === 0) return;

    issues.push(issue(
      `simulation-component:${node.id}:missing-simdata`,
      "Component has no simulation model",
      "This component is connected to a simulated supply, GND, or PWM net, but it does not define simulation data.",
      [{type: "node", nodeId: node.id}],
    ));
  });

  const wires: SimulationWireElement[] = edges.flatMap((edge): SimulationWireElement[] => {
    if(!edge.sourceHandle || !edge.targetHandle) {
      issues.push(issue(
        `simulation-wire:${edge.id}:missing-handle`,
        "Wire endpoint is incomplete",
        "Wire is missing a source or target handle.",
        [{type: "wire", edgeId: edge.id}],
      ));
      return [];
    }

    const sourceHandle = handleByPinId.get(pinId(edge.source, edge.sourceHandle));
    const targetHandle = handleByPinId.get(pinId(edge.target, edge.targetHandle));
    const sourceUsbPort = usbPowerPairPorts.portByNodeHandle.get(`${edge.source}:${edge.sourceHandle}`);
    const targetUsbPort = usbPowerPairPorts.portByNodeHandle.get(`${edge.target}:${edge.targetHandle}`);
    const sourceIsUsbPowerOut = sourceHandle?.functions.includes("usb_power_out" as never) ?? false;
    const targetIsUsbPowerOut = targetHandle?.functions.includes("usb_power_out" as never) ?? false;
    const sourceIsUsbFull = sourceHandle?.functions.includes("usb_full" as never) ?? false;
    const targetIsUsbFull = targetHandle?.functions.includes("usb_full" as never) ?? false;
    const isUsbPowerPairWire = (
      sourceUsbPort &&
      targetUsbPort &&
      ((sourceIsUsbPowerOut && targetIsUsbFull) || (targetIsUsbPowerOut && sourceIsUsbFull))
    );

    const sourcePinId = pinId(edge.source, edge.sourceHandle);
    const targetPinId = pinId(edge.target, edge.targetHandle);
    const sourceCircuitNodeId = pinToCircuitNodeId.get(sourcePinId);
    const targetCircuitNodeId = pinToCircuitNodeId.get(targetPinId);

    if(!sourceCircuitNodeId || !targetCircuitNodeId) {
      issues.push(issue(
        `simulation-wire:${edge.id}:missing-node`,
        "Wire endpoint is not part of the simulation model",
        "Wire references a handle that was not found in the diagram.",
        [{type: "wire", edgeId: edge.id}],
      ));
      return [];
    }

    if(!edge.data) {
      issues.push(issue(
        `simulation-wire:${edge.id}:missing-data`,
        "Wire data is missing",
        "Wire has no physical data for length and cross section.",
        [{type: "wire", edgeId: edge.id}],
      ));
      return [];
    }

    const resistance = calculateCopperWireResistanceFromEdgeData(edge.data);

    if(!resistance.ok) {
      issues.push(issue(
        `simulation-wire:${edge.id}:${resistance.reason}`,
        "Wire resistance could not be calculated",
        resistance.message,
        [{type: "wire", edgeId: edge.id}],
      ));
      return [];
    }

    if(isUsbPowerPairWire) {
      const powerPort = sourceIsUsbPowerOut ? sourceUsbPort : targetUsbPort;
      const fullPort = sourceIsUsbPowerOut ? targetUsbPort : sourceUsbPort;
      const vbusSourceCircuitNodeId = pinToCircuitNodeId.get(powerPort.positivePinId);
      const vbusTargetCircuitNodeId = pinToCircuitNodeId.get(fullPort.positivePinId);
      const gndSourceCircuitNodeId = pinToCircuitNodeId.get(fullPort.negativePinId);
      const gndTargetCircuitNodeId = pinToCircuitNodeId.get(powerPort.negativePinId);

      if(!vbusSourceCircuitNodeId || !vbusTargetCircuitNodeId || !gndSourceCircuitNodeId || !gndTargetCircuitNodeId) {
        issues.push(issue(
          `simulation-wire:${edge.id}:usb-port-node`,
          "USB wire endpoint is not part of the simulation model",
          "USB power-pair wire references a virtual terminal that was not found in the simulation model.",
          [{type: "wire", edgeId: edge.id}],
        ));
        return [];
      }

      return [
        {
          id: `wire:${edge.id}:usb-vbus`,
          edgeId: edge.id,
          sourceCircuitNodeId: vbusSourceCircuitNodeId,
          targetCircuitNodeId: vbusTargetCircuitNodeId,
          resistanceOhm: resistance.resistanceOhm,
          lengthM: resistance.lengthM,
          crosssectionMm2: resistance.crosssectionMm2,
          material: resistance.material,
          aggregate: {
            kind: "usbPowerPair" as const,
            conductor: "vbus" as const,
            displayDirection: "sourceToTarget" as const,
          },
        },
        {
          id: `wire:${edge.id}:usb-gnd`,
          edgeId: edge.id,
          sourceCircuitNodeId: gndSourceCircuitNodeId,
          targetCircuitNodeId: gndTargetCircuitNodeId,
          resistanceOhm: resistance.resistanceOhm,
          lengthM: resistance.lengthM,
          crosssectionMm2: resistance.crosssectionMm2,
          material: resistance.material,
          aggregate: {
            kind: "usbPowerPair" as const,
            conductor: "gnd" as const,
            displayDirection: "targetToSource" as const,
          },
        },
      ];
    }

    return [{
      id: `wire:${edge.id}`,
      edgeId: edge.id,
      sourceCircuitNodeId,
      targetCircuitNodeId,
      pinCurrentContributions: [
        {pinId: sourcePinId, sign: 1},
        {pinId: targetPinId, sign: -1},
      ],
      resistanceOhm: resistance.resistanceOhm,
      lengthM: resistance.lengthM,
      crosssectionMm2: resistance.crosssectionMm2,
      material: resistance.material,
    }];
  });

  const referenceCandidates = nodes.flatMap((node) => (
    node.data.simdata?.elements
      ?.map((element) => collectReferenceCandidate(element, node, settings, terminalResolutionContext, issues))
      .filter((candidate) => candidate !== undefined) || []
  ));
  const referenceCandidate = referenceCandidates
    .sort((a, b) => (
      (b.currentLimitA - a.currentLimitA) ||
      a.sourceId.localeCompare(b.sourceId)
    ))[0];
  const referenceNodeId = referenceCandidate
    ? pinToCircuitNodeId.get(referenceCandidate.negativePinId)
    : pins.find((pin) => pin.role === "gnd")?.circuitNodeId;

  if(!referenceNodeId) {
    issues.push(issue(
      "simulation-reference-node:missing",
      "No simulation reference node found",
      "Simulation needs a GND pin or a voltage source negative terminal as 0 V reference.",
    ));
  }

  const elements: SimulationElement[] = [];
  const components: SimulationComponent[] = nodes.map((node) => {
    const nodePinIds = visibleHandles(node).map((handle) => pinId(node.id, handle.hid));
    const elementIds: string[] = [];

    node.data.simdata?.elements?.forEach((element) => {
      const digitalLedElementPlan = element.type === "digitalLed"
        ? digitalLedElementPlans.get(`${node.id}:${element.id}`)
        : undefined;

      if(digitalLedElementPlan) {
        digitalLedElementPlan.sections.forEach((section) => {
          for(let ledIndex = 0; ledIndex < section.logicLedCount; ledIndex += 1) {
            const elementId = `component:${node.id}:${element.id}:section-${section.startIndex}:led-${ledIndex + 1}`;
            const distanceM = section.distanceStartM + section.lengthM * (ledIndex + 1) / section.logicLedCount;
            const terminals = {
              supplyIn: pinToCircuitNodeId.get(section.supplyPinIds[ledIndex]),
              supplyOut: pinToCircuitNodeId.get(section.supplyPinIds[ledIndex + 1]),
              gndIn: pinToCircuitNodeId.get(section.gndPinIds[ledIndex]),
              gndOut: pinToCircuitNodeId.get(section.gndPinIds[ledIndex + 1]),
            };

            if(!terminals.supplyIn || !terminals.supplyOut || !terminals.gndIn || !terminals.gndOut) {
              continue;
            }

            elements.push({
              id: elementId,
              componentId: node.id,
              sourceElementId: element.id,
              type: element.type as ComponentSimulationElementType,
              terminals: {
                supplyIn: terminals.supplyIn,
                supplyOut: terminals.supplyOut,
                gndIn: terminals.gndIn,
                gndOut: terminals.gndOut,
              },
              parameters: digitalLedElementPlan.parameters,
              ledStripPosition: {
                distanceM,
                sectionIndex: section.sectionIndex,
                logicLedIndex: ledIndex,
                physicalLedCount: Number(digitalLedElementPlan.parameters?.physLedsPerLogicLed) || 1,
              },
            });
            elementIds.push(elementId);
          }
        });
        return;
      }

      if(element.type === "digitalLed") return;

      const terminalResolution = terminalPinIds(node, element, terminalResolutionContext, issues);
      if(terminalResolution.status !== "ok") return;

      const terminalPins = terminalResolution.terminals;
      const resolvedTerminals = Object.fromEntries(
        Object.entries(terminalPins).flatMap(([terminalName, terminalPinId]) => {
          const circuitNodeId = pinToCircuitNodeId.get(terminalPinId);
          return circuitNodeId ? [[terminalName, circuitNodeId]] : [];
        }),
      );
      const elementId = `component:${node.id}:${element.id}`;

      const parameters = resolveParameters(element, node, settings, issues);

      elements.push({
        id: elementId,
        componentId: node.id,
        sourceElementId: element.id,
        type: element.type as ComponentSimulationElementType,
        terminals: resolvedTerminals,
        parameters: scaleDigitalLedParameters(element, node, parameters, issues),
      });
      elementIds.push(elementId);
    });

    return {
      id: `component:${node.id}`,
      nodeId: node.id,
      technicalID: node.data.technicalID,
      simdata: node.data.simdata,
      elementIds,
      pinIds: nodePinIds,
    };
  });
  const virtualPins = [
    ...createDigitalLedVirtualPins(
      nodes,
      digitalLedElementPlans,
      pinToCircuitNodeId,
    ),
    ...createUsbPowerPairVirtualPins(
      usbPowerPairPorts.ports,
      pinToCircuitNodeId,
    ),
  ];

  addVoltageSourceConflictIssues(elements, issues);

  if(issues.some((item) => item.severity === "error") || !referenceNodeId) {
    return {ok: false, issues};
  }

  return {
    ok: true,
    issues,
    model: {
      version: 1,
      settings,
      nodes: nodes.map((node) => ({
        id: node.id,
        technicalID: node.data.technicalID,
        technicalVersion: node.data.technicalVersion,
        position: node.position,
      })),
      checkNets: checkContext.componentLinkedNets.map(createSimulationCheckNetRef),
      circuitNodes,
      wires,
      components,
      elements,
      pins,
      virtualPins,
      referenceNodeId,
    },
  };
};
