import type { RunSimulationResult } from "./runSimulation";

export const SIMULATION_DEBUG = false;

export type SimulationDiodeDebugChange = {
  iteration: number;
  elementId: string;
  sourceElementId?: string;
  componentId?: string;
  anodeVoltageV?: number;
  cathodeVoltageV?: number;
  forwardVoltageV?: number;
  sourceCurrentA?: number;
  wasConducting: boolean;
  isConducting: boolean;
};

export const logSimulationDiodeStateChanges = (changes: SimulationDiodeDebugChange[]) => {
  if(!SIMULATION_DEBUG || changes.length === 0) return;

  console.info("[simulation] diode state changes", changes);
};

export const logSimulationDebug = (simulation: RunSimulationResult) => {
  if(!SIMULATION_DEBUG) return;

  if(!simulation.ok) {
    console.groupCollapsed("[simulation] model build failed");
    console.info("diagramFingerprint", simulation.diagramFingerprint);
    console.info("issues", simulation.issues);
    console.groupEnd();
    return;
  }

  const simulatedComponents = simulation.model.components.filter((component) => (
    component.elementIds.length > 0
  ));

  console.groupCollapsed("[simulation] deterministic mock result");
  console.info("status", simulation.result.status);
  console.info("diagramFingerprint", simulation.result.diagramFingerprint);
  console.info("settings", simulation.result.settings);
  console.info("summary", {
    diagramComponents: simulation.model.nodes.length,
    simulatedComponents: simulatedComponents.length,
    checkNets: simulation.model.checkNets.length,
    circuitNodes: simulation.model.circuitNodes.length,
    simulatedWires: simulation.model.wires.length,
    elements: simulation.model.elements.length,
    pins: simulation.model.pins.length,
    virtualPins: simulation.model.virtualPins.length,
    pinResults: simulation.result.pinResults.length,
    virtualPinResults: simulation.result.virtualPinResults.length,
    wireResults: simulation.result.wireResults.length,
    issues: simulation.issues.length,
  });
  console.info("components", simulation.model.components);
  console.info("elements", simulation.model.elements);
  console.info("wires", simulation.model.wires);
  console.info("pinResults", simulation.result.pinResults);
  console.info("wireResults", simulation.result.wireResults);
  console.info("issues", simulation.issues);
  console.groupEnd();
};
