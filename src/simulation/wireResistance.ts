import type { EdgeDataType } from "../types";
import { awgToMm2 } from "./awgToMm2";

export const COPPER_RESISTIVITY_OHM_MM2_PER_M = 0.0179;

export type WireCrosssectionUnit = "mm2" | "AWG";

export type WireResistanceInput = {
  lengthM: number | null | undefined;
  crosssection: number | null | undefined;
  crosssectionUnit: string | null | undefined;
};

export type WireResistanceErrorReason =
  | "missing_length"
  | "invalid_length"
  | "missing_crosssection"
  | "invalid_crosssection"
  | "unsupported_crosssection_unit"
  | "unsupported_awg";

export type WireResistanceResult =
  | {
      ok: true;
      resistanceOhm: number;
      lengthM: number;
      crosssectionMm2: number;
      material: "copper";
    }
  | {
      ok: false;
      reason: WireResistanceErrorReason;
      message: string;
    };

export const normalizeWireCrosssectionToMm2 = (
  crosssection: number | null | undefined,
  crosssectionUnit: string | null | undefined,
): {ok: true; crosssectionMm2: number} | {ok: false; reason: WireResistanceErrorReason; message: string} => {
  if(crosssection == undefined) {
    return {
      ok: false,
      reason: "missing_crosssection",
      message: "Wire cross section is missing.",
    };
  }

  if(!Number.isFinite(crosssection) || crosssection<=0) {
    return {
      ok: false,
      reason: "invalid_crosssection",
      message: "Wire cross section must be a positive number.",
    };
  }

  if(crosssectionUnit==="mm2") {
    return {ok: true, crosssectionMm2: crosssection};
  }

  if(crosssectionUnit==="AWG") {
    const crosssectionMm2 = awgToMm2(crosssection);

    if(crosssectionMm2 == undefined) {
      return {
        ok: false,
        reason: "unsupported_awg",
        message: `Unsupported AWG value: ${crosssection}.`,
      };
    }

    return {ok: true, crosssectionMm2};
  }

  return {
    ok: false,
    reason: "unsupported_crosssection_unit",
    message: `Unsupported wire cross section unit: ${String(crosssectionUnit)}.`,
  };
};

export const calculateCopperWireResistance = ({
  lengthM,
  crosssection,
  crosssectionUnit,
}: WireResistanceInput): WireResistanceResult => {
  if(lengthM == undefined) {
    return {
      ok: false,
      reason: "missing_length",
      message: "Wire length is missing.",
    };
  }

  if(!Number.isFinite(lengthM) || lengthM<=0) {
    return {
      ok: false,
      reason: "invalid_length",
      message: "Wire length must be a positive number.",
    };
  }

  const crosssectionResult = normalizeWireCrosssectionToMm2(crosssection, crosssectionUnit);

  if(!crosssectionResult.ok) {
    return crosssectionResult;
  }

  return {
    ok: true,
    resistanceOhm: COPPER_RESISTIVITY_OHM_MM2_PER_M * lengthM / crosssectionResult.crosssectionMm2,
    lengthM,
    crosssectionMm2: crosssectionResult.crosssectionMm2,
    material: "copper",
  };
};

export const getWireResistanceInputFromEdgeData = (
  edgeData: Pick<EdgeDataType, "physLength" | "physCrosssection" | "physCrosssectionUnit">,
): WireResistanceInput => ({
  lengthM: edgeData.physLength,
  crosssection: edgeData.physCrosssection,
  crosssectionUnit: edgeData.physCrosssectionUnit,
});

export const calculateCopperWireResistanceFromEdgeData = (
  edgeData: Pick<EdgeDataType, "physLength" | "physCrosssection" | "physCrosssectionUnit">,
): WireResistanceResult => calculateCopperWireResistance(getWireResistanceInputFromEdgeData(edgeData));
