import type { Edge, Node } from "@xyflow/react";

import type { ComponentDataType, EdgeDataType } from "../types";
import type { WireAmpacitySettings } from "../wires/wireAmpacity";
import type { RunSimulationResult } from "./runSimulation";
import type { SimulationSettings } from "./simulationTypes";
import type { SimulationWorkerRequest, SimulationWorkerResponse } from "./simulationWorker";

type RunSimulationInWorkerOptions = {
  requestId: number;
  nodes: Node<ComponentDataType>[];
  edges: Edge<EdgeDataType>[];
  settings: SimulationSettings;
  wireAmpacitySettings: WireAmpacitySettings;
};

export type SimulationWorkerRun = {
  promise: Promise<RunSimulationResult>;
  terminate: () => void;
};

export const runSimulationInWorker = ({
  requestId,
  nodes,
  edges,
  settings,
  wireAmpacitySettings,
}: RunSimulationInWorkerOptions): SimulationWorkerRun => {
  let worker: Worker | null = null;

  const runFallback = async () => {
    const {runSimulation} = await import("./runSimulation");
    return runSimulation(nodes, edges, settings, wireAmpacitySettings);
  };

  const promise = new Promise<RunSimulationResult>((resolve, reject) => {
    const fallback = () => {
      worker?.terminate();
      worker = null;
      window.setTimeout(() => {
        runFallback().then(resolve).catch(reject);
      }, 0);
    };

    try {
      worker = new Worker(new URL("./simulationWorker.ts", import.meta.url), {
        type: "module",
      });
    } catch {
      fallback();
      return;
    }

    worker.onmessage = (event: MessageEvent<SimulationWorkerResponse>) => {
      const message = event.data;
      if(message.requestId !== requestId) return;

      worker?.terminate();
      worker = null;

      if(message.ok) {
        resolve(message.simulation);
        return;
      }

      reject(new Error(message.error));
    };

    worker.onerror = () => {
      fallback();
    };

    try {
      worker.postMessage({
        requestId,
        nodes,
        edges,
        settings,
        wireAmpacitySettings,
      } satisfies SimulationWorkerRequest);
    } catch {
      fallback();
    }
  });

  return {
    promise,
    terminate: () => {
      worker?.terminate();
      worker = null;
    },
  };
};
