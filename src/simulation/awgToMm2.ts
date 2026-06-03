export const SUPPORTED_AWG_VALUES = [8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28] as const;

export type SupportedAwgValue = (typeof SUPPORTED_AWG_VALUES)[number];

export const AWG_TO_MM2: Record<SupportedAwgValue, number> = {
  8: 8.37,
  10: 5.26,
  12: 3.31,
  14: 2.08,
  16: 1.31,
  18: 0.82,
  20: 0.52,
  22: 0.33,
  24: 0.2,
  26: 0.13,
  28: 0.08,
};

export const isSupportedAwgValue = (value: number): value is SupportedAwgValue =>
  SUPPORTED_AWG_VALUES.includes(value as SupportedAwgValue);

export const awgToMm2 = (awg: number): number | undefined =>
  isSupportedAwgValue(awg) ? AWG_TO_MM2[awg] : undefined;
