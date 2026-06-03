import { normalizeWireCrosssectionToMm2 } from '../simulation/wireResistance';

export type WireInstallationType = 'surface' | 'conduit' | 'insulatedWall';

export type WireAmpacitySettings = {
  installation: WireInstallationType;
  ambientTempC: number;
};

type AmpacityErrorReason =
  | 'missing_crosssection'
  | 'invalid_crosssection'
  | 'unsupported_crosssection_unit'
  | 'unsupported_awg';

export type AmpacityResult =
  | {
      ok: true;
      ampacityA: number;
      crosssectionMm2: number;
      source: 'metric-table' | 'awg-table' | 'usb-awg-special' | 'usb-metric-special';
    }
  | {
      ok: false;
      reason: AmpacityErrorReason;
    };

const ampacityErrorReason = (
  reason: string,
): AmpacityErrorReason => {
  if (
    reason === 'missing_crosssection' ||
    reason === 'invalid_crosssection' ||
    reason === 'unsupported_crosssection_unit' ||
    reason === 'unsupported_awg'
  ) {
    return reason;
  }

  return 'invalid_crosssection';
};

export const DEFAULT_WIRE_AMPACITY_SETTINGS: WireAmpacitySettings = {
  installation: 'surface',
  ambientTempC: 25,
};

const METRIC_CROSSSECTIONS_MM2 = [0.25, 0.34, 0.5, 0.75, 1, 1.5, 2.5, 4, 6];
const METRIC_MAX_CURRENTS_A: Record<WireInstallationType, number[]> = {
  surface: [4.5, 6, 7.5, 12, 15, 19.5, 27, 36, 46],
  conduit: [2.8, 4, 6, 9, 11, 16.5, 23, 30, 38],
  insulatedWall: [2, 3, 5, 7, 9, 15.5, 18.5, 25, 32],
};

const AWG_VALUES = [24, 22, 20, 18, 16, 14, 12, 10, 8];
const AWG_CROSSSECTIONS_MM2 = [0.205, 0.324, 0.519, 0.823, 1.31, 2.08, 3.31, 5.26, 8.34];
const AWG_MAX_CURRENTS_A: Record<WireInstallationType, number[]> = {
  surface: [3.7, 5.7, 7.8, 13.2, 17.8, 22.7, 31.1, 39.7, 52.3],
  conduit: [2.3, 3.8, 6.2, 9.9, 14.4, 19.2, 26.2, 33.0, 43.0],
  insulatedWall: [1.6, 2.9, 5.2, 7.7, 12.1, 15.9, 21.5, 27.6, 36.4],
};

const TEMPERATURES_C = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
const TEMPERATURE_FACTORS = [1.22, 1.17, 1.12, 1.06, 1, 0.94, 0.87, 0.79, 0.71, 0.61, 0.5];
const USB_AWG_SPECIAL_AMPACITY_A = new Map<number, number>([
  [26, 1.3],
  [28, 0.85],
]);
const USB_METRIC_SPECIAL_AMPACITY_A = new Map<number, number>([
  [0.25, 3.5],
  [0.14, 1.5],
]);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const interpolate = (x: number, xs: number[], ys: number[]) => {
  if (x <= xs[0]) return ys[0];

  const lastIndex = xs.length - 1;
  if (x >= xs[lastIndex]) return ys[lastIndex];

  for (let index = 0; index < lastIndex; index += 1) {
    const x0 = xs[index];
    const x1 = xs[index + 1];
    if (x < x0 || x > x1) continue;

    const ratio = (x - x0) / (x1 - x0);
    return ys[index] + ratio * (ys[index + 1] - ys[index]);
  }

  return ys[lastIndex];
};

const temperatureFactor = (ambientTempC: number) => (
  interpolate(clamp(ambientTempC, 10, 60), TEMPERATURES_C, TEMPERATURE_FACTORS)
);

const metricAmpacityA = (
  crosssectionMm2: number,
  installation: WireInstallationType,
) => interpolate(crosssectionMm2, METRIC_CROSSSECTIONS_MM2, METRIC_MAX_CURRENTS_A[installation]);

const awgAmpacityA = (
  awg: number,
  installation: WireInstallationType,
) => {
  const index = AWG_VALUES.indexOf(awg);
  return index >= 0
    ? {
        ampacityA: AWG_MAX_CURRENTS_A[installation][index],
        crosssectionMm2: AWG_CROSSSECTIONS_MM2[index],
      }
    : undefined;
};

export const normalizeWireAmpacitySettings = (
  settings?: Partial<WireAmpacitySettings> | null,
): WireAmpacitySettings => ({
  installation: settings?.installation === 'conduit' || settings?.installation === 'insulatedWall'
    ? settings.installation
    : DEFAULT_WIRE_AMPACITY_SETTINGS.installation,
  ambientTempC: clamp(
    typeof settings?.ambientTempC === 'number' && Number.isFinite(settings.ambientTempC)
      ? settings.ambientTempC
      : DEFAULT_WIRE_AMPACITY_SETTINGS.ambientTempC,
    10,
    60,
  ),
});

export const wireAmpacityA = (
  crosssection: number | null | undefined,
  unit: string | null | undefined,
  installation: WireInstallationType = DEFAULT_WIRE_AMPACITY_SETTINGS.installation,
  ambientTempC = DEFAULT_WIRE_AMPACITY_SETTINGS.ambientTempC,
  physType?: string | null,
): AmpacityResult => {
  if (unit === 'AWG' && typeof crosssection === 'number') {
    const specialAmpacityA = USB_AWG_SPECIAL_AMPACITY_A.get(crosssection);
    if (specialAmpacityA !== undefined) {
      const normalized = normalizeWireCrosssectionToMm2(crosssection, unit);
      if (!normalized.ok) return { ok: false, reason: ampacityErrorReason(normalized.reason) };
      return {
        ok: true,
        ampacityA: specialAmpacityA,
        crosssectionMm2: normalized.crosssectionMm2,
        source: 'usb-awg-special',
      };
    }

    const awg = awgAmpacityA(crosssection, installation);
    if (!awg) return { ok: false, reason: 'unsupported_awg' };

    return {
      ok: true,
      ampacityA: awg.ampacityA * temperatureFactor(ambientTempC),
      crosssectionMm2: awg.crosssectionMm2,
      source: 'awg-table',
    };
  }

  const normalized = normalizeWireCrosssectionToMm2(crosssection, unit);
  if (!normalized.ok) return { ok: false, reason: ampacityErrorReason(normalized.reason) };
  if (physType === 'usb' && unit === 'mm2' && typeof crosssection === 'number') {
    const specialAmpacityA = USB_METRIC_SPECIAL_AMPACITY_A.get(crosssection);
    if (specialAmpacityA !== undefined) {
      return {
        ok: true,
        ampacityA: specialAmpacityA,
        crosssectionMm2: normalized.crosssectionMm2,
        source: 'usb-metric-special',
      };
    }
  }

  return {
    ok: true,
    ampacityA: metricAmpacityA(normalized.crosssectionMm2, installation) * temperatureFactor(ambientTempC),
    crosssectionMm2: normalized.crosssectionMm2,
    source: 'metric-table',
  };
};

export const requiredCrosssectionForCurrentA = (
  currentA: number,
  installation: WireInstallationType = DEFAULT_WIRE_AMPACITY_SETTINGS.installation,
  ambientTempC = DEFAULT_WIRE_AMPACITY_SETTINGS.ambientTempC,
  unitPreference: 'mm2' | 'AWG' = 'mm2',
) => {
  const factor = temperatureFactor(ambientTempC);
  if (factor <= 0) return undefined;

  const table = unitPreference === 'AWG'
    ? AWG_MAX_CURRENTS_A[installation].map((ampacityA, index) => ({
        value: AWG_VALUES[index],
        ampacityA: ampacityA * factor,
      }))
    : METRIC_MAX_CURRENTS_A[installation].map((ampacityA, index) => ({
        value: METRIC_CROSSSECTIONS_MM2[index],
        ampacityA: ampacityA * factor,
      }));

  return table.find((entry) => entry.ampacityA + 0.01 >= currentA)?.value;
};
