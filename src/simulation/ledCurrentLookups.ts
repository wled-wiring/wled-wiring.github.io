import type { LedSimulationColorMode } from "./simulationTypes";
import {
  LED_STRIP_CURRENT_CURVE_OPTIONS,
  type LedCurrentCurve,
  type LedCurrentCurveParameters,
} from "./ledStripSimulationOptions";

export type { LedCurrentCurve, LedCurrentCurveParameters };

export const LED_CURRENT_CURVES: Record<string, LedCurrentCurve> = Object.fromEntries(
  Object.values(LED_STRIP_CURRENT_CURVE_OPTIONS).map((option) => [option.id, option.curve]),
);

export type LedCurrentCurveId = keyof typeof LED_CURRENT_CURVES;

export type LedCurrentCurveResult =
  | {ok: true; currentA: number}
  | {ok: false; reason: "missing_curve" | "missing_color_mode" | "invalid_parameters"; message: string};

export const isLedCurrentCurveId = (value: string): value is LedCurrentCurveId =>
  Object.prototype.hasOwnProperty.call(LED_CURRENT_CURVES, value);

export const getLedCurrentCurveParameters = (
  curveId: string,
  colorMode: LedSimulationColorMode,
) => {
  if(!isLedCurrentCurveId(curveId)) return undefined;

  const parameters = LED_CURRENT_CURVES[curveId][colorMode];
  if(
    parameters === undefined ||
    !Number.isFinite(parameters.i0A) ||
    !Number.isFinite(parameters.iLimitA) ||
    !Number.isFinite(parameters.k) ||
    !Number.isFinite(parameters.v0) ||
    (parameters.kUI !== undefined && !Number.isFinite(parameters.kUI))
  ) {
    return undefined;
  }

  return parameters;
};

const sigmoid = (value: number) => {
  if(value >= 0) {
    const expNegative = Math.exp(-value);
    return 1 / (1 + expNegative);
  }

  const expPositive = Math.exp(value);
  return expPositive / (1 + expPositive);
};

export const calculateLedCurrentA = (
  parameters: LedCurrentCurveParameters,
  voltageV: number,
) => {
  const kUI = parameters.kUI ?? 0;

  return parameters.i0A + parameters.iLimitA * sigmoid(parameters.k * (voltageV - parameters.v0)) + kUI * voltageV;
};

export const getLedCurrentA = (
  curveId: string,
  colorMode: LedSimulationColorMode,
  voltageV: number,
  brightness: number,
): LedCurrentCurveResult => {
  if(!isLedCurrentCurveId(curveId)) {
    return {
      ok: false,
      reason: "missing_curve",
      message: `Missing LED current curve: ${curveId}.`,
    };
  }

  const rawParameters = LED_CURRENT_CURVES[curveId][colorMode];

  if(rawParameters == undefined) {
    return {
      ok: false,
      reason: "missing_color_mode",
      message: `Missing LED current curve color mode: ${curveId}/${colorMode}.`,
    };
  }

  const parameters = getLedCurrentCurveParameters(curveId, colorMode);
  if(!parameters) {
    return {
      ok: false,
      reason: "invalid_parameters",
      message: `LED current curve has invalid parameters: ${curveId}/${colorMode}.`,
    };
  }

  const clampedBrightness = Math.min(1, Math.max(0, brightness));

  return {
    ok: true,
    currentA: calculateLedCurrentA(parameters, voltageV) * clampedBrightness,
  };
};
