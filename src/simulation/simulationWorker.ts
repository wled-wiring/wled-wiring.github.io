import type { Edge, Node } from "@xyflow/react";

import type { ComponentDataType, EdgeDataType } from "../types";
import type { WireAmpacitySettings } from "../wires/wireAmpacity";
import { runSimulation, type RunSimulationResult } from "./runSimulation";
import type { SimulationSettings } from "./simulationTypes";

export type SimulationWorkerRequest = {
  requestId: number;
  nodes: Node<ComponentDataType>[];
  edges: Edge<EdgeDataType>[];
  settings: SimulationSettings;
  wireAmpacitySettings: WireAmpacitySettings;
};

export type SimulationWorkerResponse =
  | {
      requestId: number;
      ok: true;
      simulation: RunSimulationResult;
    }
  | {
      requestId: number;
      ok: false;
      error: string;
    };

self.onmessage = async (event: MessageEvent<SimulationWorkerRequest>) => {
  const {requestId, nodes, edges, settings, wireAmpacitySettings} = event.data;

  try {
    const simulation = runSimulation(nodes, edges, settings, wireAmpacitySettings);
    self.postMessage({
      requestId,
      ok: true,
      simulation,
    } satisfies SimulationWorkerResponse);
  } catch(error) {
    self.postMessage({
      requestId,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    } satisfies SimulationWorkerResponse);
  }
};
