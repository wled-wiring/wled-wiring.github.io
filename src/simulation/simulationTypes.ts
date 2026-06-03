export type SimulationPoint = {
  x: number;
  y: number;
};

export type SimulationSeverity = "error" | "warning" | "info";

export type SimulationStatus = "ok" | "warning" | "error";

export type SimulationNetClassification = "gnd" | "supply" | "pwm";

export type SimulationPinRole = "gnd" | "supply" | "pwm" | "other";

export type LedSimulationColorMode =
  | "R"
  | "G"
  | "B"
  | "RGB_WHITE"
  | "SEPARATE_WHITE"
  | "SEPARATE_AND_RGB_WHITE";

export type SimulationSettings = {
  ledColorMode: LedSimulationColorMode;
  brightnessPercent: number;
};

export type SimulationParameterPrimitive = number | string | boolean;

export type SimulationParameterRef =
  | SimulationParameterPrimitive
  | {const: SimulationParameterPrimitive}
  | {field: string; default?: SimulationParameterPrimitive}
  | {select: string; default?: SimulationParameterPrimitive}
  | {table: Record<string, number>; by: SimulationParameterRef; default?: number}
  | {ledCurve: string; colorMode: "settings.ledColorMode"}
  | {ledSimulationOption: "supplyResistance" | "gndResistance" | "currentCurve"};

export type ComponentSimulationElementType =
  | "resistor"
  | "shortBridge"
  | "voltageSource"
  | "currentSource"
  | "constantPowerSink"
  | "fuse"
  | "digitalLed"
  | "dcdcConverter"
  | "diode";

type ComponentSimulationElementBase<
  TypeName extends ComponentSimulationElementType,
  Terminals extends Record<string, string>,
  Parameters extends Record<string, SimulationParameterRef> | undefined,
> = {
  id: string;
  type: TypeName;
  terminals: Terminals;
} & (Parameters extends undefined ? {parameters?: undefined} : {parameters: Parameters});

export type ResistorSimulationElementUse = ComponentSimulationElementBase<
  "resistor",
  {a: string; b: string},
  {resistanceOhm: SimulationParameterRef}
>;

export type ShortBridgeSimulationElementUse = ComponentSimulationElementBase<
  "shortBridge",
  {a: string; b: string},
  undefined
>;

export type VoltageSourceSimulationElementUse = ComponentSimulationElementBase<
  "voltageSource",
  {positive: string; negative: string},
  {
    voltageV: SimulationParameterRef;
    currentLimitA: SimulationParameterRef;
    voltageDropPctAt150Current?: SimulationParameterRef;
  }
>;

export type CurrentSourceSimulationElementUse = ComponentSimulationElementBase<
  "currentSource",
  {positive: string; negative: string},
  {currentA: SimulationParameterRef}
>;

export type ConstantPowerSinkSimulationElementUse = ComponentSimulationElementBase<
  "constantPowerSink",
  {positive: string; negative: string},
  {
    powerW: SimulationParameterRef;
    minVoltageV?: SimulationParameterRef;
  }
>;

export type FuseSimulationElementUse = ComponentSimulationElementBase<
  "fuse",
  {a: string; b: string},
  {
    resistanceOhm: SimulationParameterRef;
    nominalCurrentA?: SimulationParameterRef;
  }
>;

export type DigitalLedSimulationElementUse = ComponentSimulationElementBase<
  "digitalLed",
  {supplyIn: string; supplyOut: string; gndIn: string; gndOut: string},
  {
    supplyResistanceOhm: SimulationParameterRef;
    gndResistanceOhm: SimulationParameterRef;
    ledType: SimulationParameterRef;
    ledsPerMeter: SimulationParameterRef;
    physLedsPerLogicLed: SimulationParameterRef;
    currentCurve: SimulationParameterRef;
  }
>;

export type DcdcConverterSimulationElementUse = ComponentSimulationElementBase<
  "dcdcConverter",
  {
    inPositive: string;
    inNegative: string;
    outPositive: string;
    outNegative: string;
  },
  {
    outputVoltageV: SimulationParameterRef;
    efficiency: SimulationParameterRef;
    outputCurrentLimitA?: SimulationParameterRef;
    voltageDropPctAt150Current?: SimulationParameterRef;
  }
>;

export type DiodeSimulationElementUse = ComponentSimulationElementBase<
  "diode",
  {anode: string; cathode: string},
  {forwardVoltageV: SimulationParameterRef}
>;

export type ComponentSimulationElementUse =
  | ResistorSimulationElementUse
  | ShortBridgeSimulationElementUse
  | VoltageSourceSimulationElementUse
  | CurrentSourceSimulationElementUse
  | ConstantPowerSinkSimulationElementUse
  | FuseSimulationElementUse
  | DigitalLedSimulationElementUse
  | DcdcConverterSimulationElementUse
  | DiodeSimulationElementUse;

export type ComponentSimulationElementTerminalMap = ComponentSimulationElementUse["terminals"];

export type ComponentSimulationElementParameterMap = NonNullable<
  ComponentSimulationElementUse["parameters"]
>;

export type ComponentSimulationElementUseByType = {
  [ElementUse in ComponentSimulationElementUse as ElementUse["type"]]: ElementUse;
};

export type UsbPowerPairSimulationPort = {
  id: string;
  type: "usbPowerPair";
  handle: string;
  positiveTerminal: string;
  negativeTerminal: string;
};

export type ComponentSimulationPort = UsbPowerPairSimulationPort;

export type ComponentSimulationDefinition = {
  version: 1;
  ports?: ComponentSimulationPort[];
  elements?: ComponentSimulationElementUse[];
};

export type SimulationNode = {
  id: string;
  technicalID: string;
  technicalVersion?: number;
  position: SimulationPoint;
};

export type SimulationCheckNetRef = {
  id: string;
  classifications: SimulationNetClassification[];
  pinIds: string[];
  wireIds: string[];
};

export type SimulationCircuitNode = {
  id: string;
  sourceCheckNetId?: string;
  pinIds: string[];
};

export type SimulationWireElement = {
  id: string;
  edgeId: string;
  sourceCircuitNodeId: string;
  targetCircuitNodeId: string;
  pinCurrentContributions?: {
    pinId: string;
    sign: 1 | -1;
  }[];
  resistanceOhm: number;
  lengthM: number;
  crosssectionMm2: number;
  material: "copper";
  aggregate?: {
    kind: "usbPowerPair";
    conductor: "vbus" | "gnd";
    displayDirection: "sourceToTarget" | "targetToSource";
  };
};

export type SimulationComponent = {
  id: string;
  nodeId: string;
  technicalID: string;
  simdata?: ComponentSimulationDefinition;
  elementIds: string[];
  pinIds: string[];
};

export type SimulationElement = {
  id: string;
  componentId?: string;
  sourceElementId?: string;
  type: ComponentSimulationElementType;
  terminals: Record<string, string>;
  parameters?: Record<string, SimulationParameterPrimitive>;
  ledStripPosition?: {
    distanceM: number;
    sectionIndex: number;
    logicLedIndex: number;
    physicalLedCount: number;
  };
};

export type SimulationPin = {
  id: string;
  nodeId: string;
  handleId: string;
  circuitNodeId?: string;
  sourceCheckNetId?: string;
  connectedWireIds: string[];
  functions: string[];
  role: SimulationPinRole;
  voltageMin?: number;
  voltageMax?: number;
  maxCurrentA?: number;
  position: SimulationPoint;
};

export type SimulationVirtualPin = {
  id: string;
  nodeId: string;
  handleId: string;
  role: "gnd" | "supply";
  kind?: "ledBoundary" | "usbPowerPair";
  segmentBoundaryIndex?: number;
  pairedHandleId?: string;
  voltageLabel?: "VUSB";
  circuitNodeId?: string;
  position: SimulationPoint;
};

export type SimulationModel = {
  version: 1;
  settings: SimulationSettings;
  nodes: SimulationNode[];
  checkNets: SimulationCheckNetRef[];
  circuitNodes: SimulationCircuitNode[];
  wires: SimulationWireElement[];
  components: SimulationComponent[];
  elements: SimulationElement[];
  pins: SimulationPin[];
  virtualPins: SimulationVirtualPin[];
  referenceNodeId: string;
};

export type SimulationPinResult = {
  pinId: string;
  nodeId: string;
  handleId: string;
  currentA?: number;
  voltageV?: number;
};

export type SimulationVirtualPinResult = {
  virtualPinId: string;
  nodeId: string;
  handleId: string;
  role?: "gnd" | "supply";
  kind?: "ledBoundary" | "usbPowerPair";
  pairedHandleId?: string;
  voltageLabel?: "VUSB";
  voltageV?: number;
};

export type SimulationWireResult = {
  wireId: string;
  edgeId: string;
  currentA?: number;
  voltageDropV?: number;
  resistanceOhm?: number;
  displayCurrentA?: number;
  displayBidirectional?: boolean;
  conductorResults?: {
    wireId: string;
    conductor: "vbus" | "gnd";
    currentA?: number;
    voltageDropV?: number;
    resistanceOhm?: number;
  }[];
};

export type SimulationLedElementVoltageResult = {
  elementId: string;
  nodeId: string;
  sourceElementId?: string;
  distanceM?: number;
  sectionIndex?: number;
  logicLedIndex?: number;
  physicalLedCount?: number;
  deltaVoltageV?: number;
};

export type SimulationLedStripVoltageSummaryResult = {
  nodeId: string;
  sourceElementId?: string;
  minDeltaVoltageV?: number;
  elementCount: number;
};

export type SimulationTarget =
  | {type: "node"; nodeId: string}
  | {type: "pin"; nodeId: string; handleId: string}
  | {type: "wire"; edgeId: string}
  | {type: "element"; elementId: string};

export type SimulationCheckIssue = {
  id: string;
  severity: SimulationSeverity;
  title: string;
  description: string;
  titleMessage?: SimulationIssueMessage;
  descriptionMessage?: SimulationIssueMessage;
  recommendation?: string;
  targets?: SimulationTarget[];
};

export type SimulationIssueMessage = {
  key: string;
  options?: Record<string, string | number | SimulationIssueFormattedNumber>;
};

export type SimulationIssueFormattedNumber = {
  value: number;
  minimumFractionDigits: number;
  maximumFractionDigits: number;
};

export type SimulationResult = {
  modelVersion: 1;
  settings: SimulationSettings;
  createdAt: string;
  diagramFingerprint: string;
  pinResults: SimulationPinResult[];
  virtualPinResults: SimulationVirtualPinResult[];
  wireResults: SimulationWireResult[];
  ledElementVoltageResults: SimulationLedElementVoltageResult[];
  ledStripVoltageSummaryResults: SimulationLedStripVoltageSummaryResult[];
  checkIssues: SimulationCheckIssue[];
  status: SimulationStatus;
};

export type LinearSystemEntry = {
  row: number;
  column: number;
  value: number;
};

export type LinearSystem = {
  size: number;
  entries: LinearSystemEntry[];
  rhs: number[];
};

export type SolverResult = {
  status: "ok" | "singular" | "not_converged" | "error";
  values?: number[];
  message?: string;
};

export type LinearSystemSolver = {
  solve: (system: LinearSystem) => SolverResult;
};
