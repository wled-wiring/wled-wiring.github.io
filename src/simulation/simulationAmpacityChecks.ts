import type { Edge } from "@xyflow/react";

import type { EdgeDataType } from "../types";
import { wireAmpacityA, type WireAmpacitySettings } from "../wires/wireAmpacity";
import { getLedCurrentCurveParameters } from "./ledCurrentLookups";
import type {
  SimulationCheckIssue,
  SimulationIssueFormattedNumber,
  SimulationModel,
  SimulationWireResult,
} from "./simulationTypes";

const AMPACITY_TOLERANCE_A = 0.01;
const LED_CURRENT_EPSILON_A = 0.000001;

type SimulationIssueText = {
  key: string;
  options?: Record<string, string | number | SimulationIssueFormattedNumber>;
};

const simulationIssueNumber = (
  value: number,
  fractionDigits: number,
): SimulationIssueFormattedNumber => ({
  value,
  minimumFractionDigits: fractionDigits,
  maximumFractionDigits: fractionDigits,
});

const issue = (
  id: string,
  severity: SimulationCheckIssue["severity"],
  titleKey: string,
  descriptionKey: string,
  options?: SimulationIssueText["options"],
  targets?: SimulationCheckIssue["targets"],
  recommendationKey?: string,
): SimulationCheckIssue => ({
  id,
  severity,
  title: titleKey,
  description: descriptionKey,
  titleMessage: {
    key: `sidebar.simulation.issues.${titleKey}`,
    options,
  },
  descriptionMessage: {
    key: `sidebar.simulation.issues.${descriptionKey}`,
    options,
  },
  recommendation: recommendationKey,
  targets,
});

const curveHasSeparateWhiteCurrent = (curveId: string) => {
  const parameters = getLedCurrentCurveParameters(curveId, "SEPARATE_WHITE");
  if(!parameters) return false;

  return (
    Math.abs(parameters.i0A) > LED_CURRENT_EPSILON_A ||
    Math.abs(parameters.iLimitA) > LED_CURRENT_EPSILON_A ||
    Math.abs(parameters.kUI ?? 0) > LED_CURRENT_EPSILON_A
  );
};

const requiredFullLoadMode = (model: SimulationModel) => {
  const digitalLedElements = model.elements.filter((element) => element.type === "digitalLed");
  if(digitalLedElements.length === 0) return undefined;

  const hasRgbwLed = digitalLedElements.some((element) => {
    const curveId = element.parameters?.currentCurve;
    return typeof curveId === "string" && curveHasSeparateWhiteCurrent(curveId);
  });

  return hasRgbwLed ? "SEPARATE_AND_RGB_WHITE" : "RGB_WHITE";
};

const isRequiredFullLoadSimulation = (model: SimulationModel) => {
  const requiredMode = requiredFullLoadMode(model);
  if(requiredMode === undefined) return true;
  if(model.settings.brightnessPercent !== 100) return false;

  if(requiredMode === "RGB_WHITE") {
    return (
      model.settings.ledColorMode === "RGB_WHITE" ||
      model.settings.ledColorMode === "SEPARATE_AND_RGB_WHITE"
    );
  }

  return model.settings.ledColorMode === requiredMode;
};

const edgeLabel = (edge: Edge<EdgeDataType>) => {
  const crosssection = edge.data?.physCrosssection;
  const unit = edge.data?.physCrosssectionUnit;

  if(typeof crosssection !== "number" || !unit) return undefined;
  return `${crosssection} ${unit}`;
};

type WireCurrentToCheck = {
  edgeId: string;
  wireId: string;
  currentA: number;
  conductor?: "vbus" | "gnd";
};

const collectWireCurrentsToCheck = (
  wireResults: SimulationWireResult[],
): WireCurrentToCheck[] => (
  wireResults.flatMap((result) => {
    if(result.conductorResults && result.conductorResults.length > 0) {
      return result.conductorResults.flatMap((conductor) => (
        conductor.currentA === undefined
          ? []
          : [{
            edgeId: result.edgeId,
            wireId: conductor.wireId,
            currentA: Math.abs(conductor.currentA),
            conductor: conductor.conductor,
          }]
      ));
    }

    return result.currentA === undefined
      ? []
      : [{
        edgeId: result.edgeId,
        wireId: result.wireId,
        currentA: Math.abs(result.currentA),
      }];
  })
);

export const createSimulationWireAmpacityIssues = (
  model: SimulationModel,
  edges: Edge<EdgeDataType>[],
  wireResults: SimulationWireResult[],
  settings: WireAmpacitySettings,
): SimulationCheckIssue[] => {
  if(!isRequiredFullLoadSimulation(model)) {
    const requiredMode = requiredFullLoadMode(model);
    return [issue(
      "simulation-wire-ampacity:full-load-required",
      "info",
      "wireAmpacityFullLoadRequired.title",
      requiredMode === "SEPARATE_AND_RGB_WHITE"
        ? "wireAmpacityFullLoadRequired.descriptionRgbw"
        : "wireAmpacityFullLoadRequired.descriptionRgb",
    )];
  }

  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));

  return collectWireCurrentsToCheck(wireResults).flatMap((wireCurrent) => {
    const edge = edgeById.get(wireCurrent.edgeId);
    if(!edge) return [];

    const ampacity = wireAmpacityA(
      edge.data?.physCrosssection,
      edge.data?.physCrosssectionUnit,
      settings.installation,
      settings.ambientTempC,
      edge.data?.physType,
    );
    if(!ampacity.ok) return [];
    if(wireCurrent.currentA <= ampacity.ampacityA + AMPACITY_TOLERANCE_A) return [];

    const conductorSuffix = wireCurrent.conductor ? `:${wireCurrent.conductor}` : "";
    const conductorLabel = wireCurrent.conductor ? wireCurrent.conductor.toUpperCase() : "";

    return [issue(
      `simulation-wire-ampacity:${wireCurrent.edgeId}${conductorSuffix}`,
      "error",
      "wireAmpacityExceeded.title",
      "wireAmpacityExceeded.description",
      {
        current: simulationIssueNumber(wireCurrent.currentA, 2),
        limit: simulationIssueNumber(ampacity.ampacityA, 2),
        crosssection: edgeLabel(edge) ?? `${simulationIssueNumber(ampacity.crosssectionMm2, 3).value} mm2`,
        conductor: conductorLabel,
      },
      [{type: "wire", edgeId: wireCurrent.edgeId}],
      "wireAmpacityExceeded.recommendation",
    )];
  });
};
