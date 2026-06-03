import type { ComponentSimulationElementType } from "./simulationTypes";

export type ElementaryElementMetadata = {
  type: ComponentSimulationElementType;
  terminals: readonly string[];
  requiredParameters: readonly string[];
  optionalParameters: readonly string[];
};

export const ELEMENTARY_ELEMENT_METADATA = {
  resistor: {
    type: "resistor",
    terminals: ["a", "b"],
    requiredParameters: ["resistanceOhm"],
    optionalParameters: [],
  },
  shortBridge: {
    type: "shortBridge",
    terminals: ["a", "b"],
    requiredParameters: [],
    optionalParameters: [],
  },
  voltageSource: {
    type: "voltageSource",
    terminals: ["positive", "negative"],
    requiredParameters: ["voltageV", "currentLimitA"],
    optionalParameters: ["voltageDropPctAt150Current"],
  },
  currentSource: {
    type: "currentSource",
    terminals: ["positive", "negative"],
    requiredParameters: ["currentA"],
    optionalParameters: [],
  },
  constantPowerSink: {
    type: "constantPowerSink",
    terminals: ["positive", "negative"],
    requiredParameters: ["powerW"],
    optionalParameters: ["minVoltageV"],
  },
  fuse: {
    type: "fuse",
    terminals: ["a", "b"],
    requiredParameters: ["resistanceOhm"],
    optionalParameters: ["nominalCurrentA"],
  },
  digitalLed: {
    type: "digitalLed",
    terminals: ["supplyIn", "supplyOut", "gndIn", "gndOut"],
    requiredParameters: [
      "supplyResistanceOhm",
      "gndResistanceOhm",
      "ledType",
      "ledsPerMeter",
      "physLedsPerLogicLed",
      "currentCurve",
    ],
    optionalParameters: [],
  },
  dcdcConverter: {
    type: "dcdcConverter",
    terminals: ["inPositive", "inNegative", "outPositive", "outNegative"],
    requiredParameters: ["outputVoltageV", "efficiency"],
    optionalParameters: ["outputCurrentLimitA", "voltageDropPctAt150Current"],
  },
  diode: {
    type: "diode",
    terminals: ["anode", "cathode"],
    requiredParameters: ["forwardVoltageV"],
    optionalParameters: [],
  },
} as const satisfies Record<ComponentSimulationElementType, ElementaryElementMetadata>;

export const ELEMENTARY_ELEMENT_TYPES = Object.keys(
  ELEMENTARY_ELEMENT_METADATA,
) as ComponentSimulationElementType[];

export const isComponentSimulationElementType = (
  value: string,
): value is ComponentSimulationElementType =>
  Object.prototype.hasOwnProperty.call(ELEMENTARY_ELEMENT_METADATA, value);

export const getElementaryElementMetadata = (
  type: ComponentSimulationElementType,
): ElementaryElementMetadata => ELEMENTARY_ELEMENT_METADATA[type];
