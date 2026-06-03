import type { ComponentDataType } from "../types";
import type { LedSimulationColorMode, SimulationCheckIssue, SimulationParameterPrimitive } from "./simulationTypes";

export type LedCurrentCurveParameters = {
  i0A: number;
  iLimitA: number;
  k: number;
  v0: number;
  kUI?: number;
};

export type LedCurrentCurve = Record<LedSimulationColorMode, LedCurrentCurveParameters>;

export type LedStripSimulationOptionKey = "supplyResistance" | "gndResistance" | "currentCurve";

export type LedStripResistanceOption = {
  id: string;
  name: string;
  description: string;
  resistanceOhm: number;
};

export type LedStripCurrentCurveOption = {
  id: string;
  name: string;
  description: string;
  curve: LedCurrentCurve;
};

export type LedStripSimulationOptionSelection = {
  supplyResistance: {
    options: string[];
    recommended?: string;
  };
  gndResistance: {
    options: string[];
    recommended?: string;
  };
  currentCurve: {
    options: string[];
    recommended?: string;
  };
};

export type LedStripSimulationOptionValues = Record<LedStripSimulationOptionKey, string>;

export const LED_STRIP_RESISTANCE_OPTIONS: Record<string, LedStripResistanceOption> = {
  typical_5mm: {
    id: "typical_5mm",
    name: "ledSimulationOptions.resistance.typical_5mm.name",
    description: "ledSimulationOptions.resistance.typical_5mm.description",
    resistanceOhm: 0.115,
  },
  good_5mm: {
    id: "good_5mm",
    name: "ledSimulationOptions.resistance.good_5mm.name",
    description: "ledSimulationOptions.resistance.good_5mm.description",
    resistanceOhm: 0.08,
  },
  poor_5mm: {
    id: "poor_5mm",
    name: "ledSimulationOptions.resistance.poor_5mm.name",
    description: "ledSimulationOptions.resistance.poor_5mm.description",
    resistanceOhm: 0.24,
  },
  narrow_fcob_path_good: {
    id: "narrow_fcob_path_good",
    name: "ledSimulationOptions.resistance.narrow_fcob_path_good.name",
    description: "ledSimulationOptions.resistance.narrow_fcob_path_good.description",
    resistanceOhm: 0.12,
  },
  narrow_fcob_path_typical: {
    id: "narrow_fcob_path_typical",
    name: "ledSimulationOptions.resistance.narrow_fcob_path_typical.name",
    description: "ledSimulationOptions.resistance.narrow_fcob_path_typical.description",
    resistanceOhm: 0.16,
  },
  narrow_fcob_path_bad: {
    id: "narrow_fcob_path_bad",
    name: "ledSimulationOptions.resistance.narrow_fcob_path_bad.name",
    description: "ledSimulationOptions.resistance.narrow_fcob_path_bad.description",
    resistanceOhm: 0.22,
  },
  bright_fcob_path_good: {
    id: "bright_fcob_path_good",
    name: "ledSimulationOptions.resistance.bright_fcob_path_good.name",
    description: "ledSimulationOptions.resistance.bright_fcob_path_good.description",
    resistanceOhm: 0.06,
  },
  bright_fcob_path_typical: {
    id: "bright_fcob_path_typical",
    name: "ledSimulationOptions.resistance.bright_fcob_path_typical.name",
    description: "ledSimulationOptions.resistance.bright_fcob_path_typical.description",
    resistanceOhm: 0.08,
  },
  bright_fcob_path_bad: {
    id: "bright_fcob_path_bad",
    name: "ledSimulationOptions.resistance.bright_fcob_path_bad.name",
    description: "ledSimulationOptions.resistance.bright_fcob_path_bad.description",
    resistanceOhm: 0.20,
  },
};

export const LED_STRIP_CURRENT_CURVE_OPTIONS: Record<string, LedStripCurrentCurveOption> = {
  ws2814_24v_typical: {
    id: "ws2814_24v_typical",
    name: "ledSimulationOptions.currentCurve.ws2814_24v_typical.name",
    description: "ledSimulationOptions.currentCurve.ws2814_24v_typical.description",
    curve: {
      R: {i0A: 0.0000005, iLimitA: 0.00295, k: 0.421, v0: 16.270, kUI: 0},
      G: {i0A: 0.0000200, iLimitA: 0.00274, k: 0.740, v0: 17.140, kUI: 0.0000075},
      B: {i0A: 0.0000300, iLimitA: 0.00267, k: 0.981, v0: 17.890, kUI: 0.0000062},
      RGB_WHITE: {i0A: 0, iLimitA: 0.00730, k: 0.758, v0: 17.170, kUI: 0.0000206},
      SEPARATE_WHITE: {i0A: 0, iLimitA: 0.00259, k: 1.341, v0: 17.360, kUI: 0.0000099},
      SEPARATE_AND_RGB_WHITE: {i0A: 0, iLimitA: 0.00954, k: 0.903, v0: 17.240, kUI: 0.0000278},
    },
  },
  ws2812b_5v_typical: {
    id: "ws2812b_5v_typical",
    name: "ledSimulationOptions.currentCurve.ws2812b_5v_typical.name",
    description: "ledSimulationOptions.currentCurve.ws2812b_5v_typical.description",
    curve: {
      R: {i0A: 0.0000000, iLimitA: 0.01309, k: 2.518, v0: 3.290, kUI: 0.0000000},
      G: {i0A: 0.0000000, iLimitA: 0.01289, k: 2.595, v0: 3.290, kUI: 0.0000000},
      B: {i0A: 0.0000000, iLimitA: 0.01291, k: 2.597, v0: 3.310, kUI: 0.0000000},
      RGB_WHITE: {i0A: 0.0000000, iLimitA: 0.03727, k: 2.386, v0: 3.370, kUI: 0.0000000},
      SEPARATE_WHITE: {i0A: 0.0000000, iLimitA: 0.00000, k: 0.000, v0: 0.000, kUI: 0.0000000},
      SEPARATE_AND_RGB_WHITE: {i0A: 0.0000000, iLimitA: 0.03727, k: 2.386, v0: 3.370, kUI: 0.0000000},
    },
  },
  ws2812b_5v_good: {
    id: "ws2812b_5v_good",
    name: "ledSimulationOptions.currentCurve.ws2812b_5v_good.name",
    description: "ledSimulationOptions.currentCurve.ws2812b_5v_good.description",
    curve: {
      R: {i0A: 0.0000000, iLimitA: 0.01296, k: 4.383, v0: 2.440, kUI: 0.0000000},
      G: {i0A: 0.0000000, iLimitA: 0.01297, k: 4.327, v0: 2.830, kUI: 0.0000032},
      B: {i0A: 0.0000000, iLimitA: 0.01272, k: 5.629, v0: 2.970, kUI: 0.0000376},
      RGB_WHITE: {i0A: 0.0000000, iLimitA: 0.03752, k: 3.776, v0: 2.790, kUI: 0.0000000},
      SEPARATE_WHITE: {i0A: 0.0000000, iLimitA: 0.00000, k: 0.000, v0: 0.000, kUI: 0.0000000},
      SEPARATE_AND_RGB_WHITE: {i0A: 0.0000000, iLimitA: 0.03752, k: 3.776, v0: 2.790, kUI: 0.0000000},
    },
  },
  ws2812b_eco_5v_typical: {
    id: "ws2812b_eco_5v_typical",
    name: "ledSimulationOptions.currentCurve.ws2812b_eco_5v_typical.name",
    description: "ledSimulationOptions.currentCurve.ws2812b_eco_5v_typical.description",
    curve: {
      R: {i0A: 0.0000000, iLimitA: 0.01254, k: 2.195, v0: 3.230, kUI: 0.0000000},
      G: {i0A: 0.0000000, iLimitA: 0.01255, k: 2.472, v0: 3.250, kUI: 0.0000000},
      B: {i0A: 0.0000000, iLimitA: 0.01239, k: 2.834, v0: 3.320, kUI: 0.0000000},
      RGB_WHITE: {i0A: 0.0000000, iLimitA: 0.03612, k: 2.300, v0: 3.340, kUI: 0.0000000},
      SEPARATE_WHITE: {i0A: 0.0000000, iLimitA: 0.00000, k: 0.000, v0: 0.000, kUI: 0.0000000},
      SEPARATE_AND_RGB_WHITE: {i0A: 0.0000000, iLimitA: 0.03612, k: 2.300, v0: 3.340, kUI: 0.0000000},
    },
  },
  ws2811_24v_typical: {
    id: "ws2811_24v_typical",
    name: "ledSimulationOptions.currentCurve.ws2811_24v_typical.name",
    description: "ledSimulationOptions.currentCurve.ws2811_24v_typical.description",
    curve: {
      R: {i0A: 0.0000073, iLimitA: 0.00328, k: 0.385, v0: 16.700, kUI: 0.0000000},
      G: {i0A: 0.0000700, iLimitA: 0.00346, k: 0.438, v0: 19.920, kUI: 0.0000002},
      B: {i0A: 0.0000700, iLimitA: 0.00323, k: 0.531, v0: 19.580, kUI: 0.0000013},
      RGB_WHITE: {i0A: 0.0000700, iLimitA: 0.00857, k: 0.487, v0: 18.540, kUI: 0.0000000},
      SEPARATE_WHITE: {i0A: 0.0000000, iLimitA: 0.00000, k: 0.000, v0: 0.000, kUI: 0.0000000},
      SEPARATE_AND_RGB_WHITE: {i0A: 0.0000700, iLimitA: 0.00857, k: 0.487, v0: 18.540, kUI: 0.0000000},
    },
  },
  ws2814_12v_typical: {
    id: "ws2814_12v_typical",
    name: "ledSimulationOptions.currentCurve.ws2814_12v_typical.name",
    description: "ledSimulationOptions.currentCurve.ws2814_12v_typical.description",
    curve: {
      R: {i0A: 0.0000000, iLimitA: 0.00613, k: 0.886, v0: 8.150, kUI: 0.0000008},
      G: {i0A: 0.0000200, iLimitA: 0.00571, k: 2.310, v0: 8.120, kUI: 0.0000213},
      B: {i0A: 0.0000000, iLimitA: 0.00575, k: 2.518, v0: 8.710, kUI: 0.0000251},
      RGB_WHITE: {i0A: 0.0000000, iLimitA: 0.01553, k: 1.864, v0: 8.310, kUI: 0.0000768},
      SEPARATE_WHITE: {i0A: 0.0000300, iLimitA: 0.00570, k: 3.316, v0: 8.340, kUI: 0.0000192},
      SEPARATE_AND_RGB_WHITE: {i0A: 0.0000000, iLimitA: 0.02024, k: 2.410, v0: 8.320, kUI: 0.0001153},
    },
  },
  ws28xx_fcob_rgb_24v_720lpm_typical: {
    id: "ws28xx_fcob_rgb_24v_720lpm_typical",
    name: "ledSimulationOptions.currentCurve.ws28xx_fcob_rgb_24v_720lpm_typical.name",
    description: "ledSimulationOptions.currentCurve.ws28xx_fcob_rgb_24v_720lpm_typical.description",
    curve: {
      R: {i0A: 0.0000000, iLimitA: 0.00157, k: 0.324, v0: 18.050, kUI: 0.0000000},
      G: {i0A: 0.0000000, iLimitA: 0.00159, k: 0.379, v0: 19.380, kUI: 0.0000000},
      B: {i0A: 0.0000000, iLimitA: 0.00154, k: 0.408, v0: 20.570, kUI: 0.0000000},
      RGB_WHITE: {i0A: 0.0000000, iLimitA: 0.00387, k: 0.445, v0: 18.620, kUI: 0.0000000},
      SEPARATE_WHITE: {i0A: 0.0000000, iLimitA: 0.00000, k: 0.000, v0: 0.000, kUI: 0.0000000},
      SEPARATE_AND_RGB_WHITE: {i0A: 0.0000000, iLimitA: 0.00387, k: 0.445, v0: 18.620, kUI: 0.0000000},
    },
  },
  ws28xx_fcob_rgb_12v_720lpm_typical: {
    id: "ws28xx_fcob_rgb_12v_720lpm_typical",
    name: "ledSimulationOptions.currentCurve.ws28xx_fcob_rgb_12v_720lpm_typical.name",
    description: "ledSimulationOptions.currentCurve.ws28xx_fcob_rgb_12v_720lpm_typical.description",
    curve: {
      R: {i0A: 0.0000078, iLimitA: 0.00146, k: 2.527, v0: 6.350, kUI: 0.0000000},
      G: {i0A: 0.0000200, iLimitA: 0.00148, k: 2.452, v0: 7.600, kUI: 0.0000000},
      B: {i0A: 0.0000300, iLimitA: 0.00143, k: 3.626, v0: 8.250, kUI: 0.0000000},
      RGB_WHITE: {i0A: 0.0000200, iLimitA: 0.00372, k: 1.669, v0: 7.290, kUI: 0.0000000},
      SEPARATE_WHITE: {i0A: 0.0000000, iLimitA: 0.00000, k: 0.000, v0: 0.000, kUI: 0.0000000},
      SEPARATE_AND_RGB_WHITE: {i0A: 0.0000200, iLimitA: 0.00372, k: 1.669, v0: 7.290, kUI: 0.0000000},
    },
  },
  ws28xx_fcob_rgbw_24v_784lpm_typical: {
    id: "ws28xx_fcob_rgbw_24v_784lpm_typical",
    name: "ledSimulationOptions.currentCurve.ws28xx_fcob_rgbw_24v_784lpm_typical.name",
    description: "ledSimulationOptions.currentCurve.ws28xx_fcob_rgbw_24v_784lpm_typical.description",
    curve: {
      R: {i0A: 0.0000001, iLimitA: 0.00134, k: 0.362, v0: 18.860, kUI: 0.0000000},
      G: {i0A: 0.0000000, iLimitA: 0.00116, k: 1.492, v0: 16.830, kUI: 0.0000040},
      B: {i0A: 0.0000000, iLimitA: 0.00116, k: 1.911, v0: 18.710, kUI: 0.0000042},
      RGB_WHITE: {i0A: 0.0000000, iLimitA: 0.00330, k: 0.811, v0: 17.810, kUI: 0.0000045},
      SEPARATE_WHITE: {i0A: 0.0000000, iLimitA: 0.00113, k: 2.933, v0: 19.000, kUI: 0.0000050},
      SEPARATE_AND_RGB_WHITE: {i0A: 0.0000000, iLimitA: 0.00435, k: 0.949, v0: 18.180, kUI: 0.0000075},
    },
  },
  sk6812_fcob_rgb_5v_240lpm_typical: {
    id: "sk6812_fcob_rgb_5v_240lpm_typical",
    name: "ledSimulationOptions.currentCurve.sk6812_fcob_rgb_5v_240lpm_typical.name",
    description: "ledSimulationOptions.currentCurve.sk6812_fcob_rgb_5v_240lpm_typical.description",
    curve: {
      R: {i0A: 0.0000000, iLimitA: 0.00663, k: 1.789, v0: 3.320, kUI: 0.0000000},
      G: {i0A: 0.0000000, iLimitA: 0.00613, k: 1.988, v0: 3.290, kUI: 0.0000000},
      B: {i0A: 0.0000000, iLimitA: 0.00642, k: 2.308, v0: 3.340, kUI: 0.0000000},
      RGB_WHITE: {i0A: 0.0000000, iLimitA: 0.01785, k: 1.873, v0: 3.460, kUI: 0.0000000},
      SEPARATE_WHITE: {i0A: 0.0000000, iLimitA: 0.00000, k: 0.000, v0: 0.000, kUI: 0.0000000},
      SEPARATE_AND_RGB_WHITE: {i0A: 0.0000000, iLimitA: 0.01785, k: 1.873, v0: 3.460, kUI: 0.0000000},
    },
  },
};

const optionKeys: LedStripSimulationOptionKey[] = ["supplyResistance", "gndResistance", "currentCurve"];

const recommendedOptionId = (
  selection: LedStripSimulationOptionSelection[LedStripSimulationOptionKey],
) => selection.recommended ?? (selection.options.length === 1 ? selection.options[0] : undefined);

export const createDefaultLedSimulationOptionValues = (
  selection: LedStripSimulationOptionSelection | undefined,
): LedStripSimulationOptionValues | undefined => {
  if(!selection) return undefined;

  const values = {} as LedStripSimulationOptionValues;
  for(const key of optionKeys) {
    const recommended = recommendedOptionId(selection[key]);
    if(!recommended) return undefined;
    values[key] = recommended;
  }

  return values;
};

export const initializeLedSimulationOptionValues = (componentData: ComponentDataType): ComponentDataType => {
  const defaults = createDefaultLedSimulationOptionValues(componentData.ledSimulationOptions);
  if(!defaults) return componentData;

  return {
    ...componentData,
    ledSimulationOptionValues: {
      ...defaults,
      ...componentData.ledSimulationOptionValues,
    },
  };
};

export const withUpdatedLedSimulationOptionDefaults = (componentData: ComponentDataType): ComponentDataType => {
  const defaults = createDefaultLedSimulationOptionValues(componentData.ledSimulationOptions);
  if(!defaults) return componentData;

  const currentValues = componentData.ledSimulationOptionValues;
  const nextValues = {...defaults};

  optionKeys.forEach((key) => {
    const currentValue = currentValues?.[key];
    if(currentValue && componentData.ledSimulationOptions?.[key].options.includes(currentValue)) {
      nextValues[key] = currentValue;
    }
  });

  return {
    ...componentData,
    ledSimulationOptionValues: nextValues,
  };
};

const createIssue = (
  nodeId: string,
  message: string,
): SimulationCheckIssue => ({
  id: `simulation-led-options:${nodeId}:${message.replace(/\W+/g, "-").toLowerCase()}`,
  severity: "error",
  title: "LED simulation options need an update",
  description: `${message} Please update this component from the current component template.`,
  targets: [{type: "node", nodeId}],
});

export const resolveLedSimulationOptionParameter = (
  componentData: ComponentDataType,
  nodeId: string,
  optionKey: LedStripSimulationOptionKey,
): {ok: true; value: SimulationParameterPrimitive} | {ok: false; issue: SimulationCheckIssue} => {
  const selection = componentData.ledSimulationOptions?.[optionKey];
  if(!selection) {
    return {ok: false, issue: createIssue(nodeId, `Missing LED simulation option definition for ${optionKey}.`)};
  }

  const selectedId = componentData.ledSimulationOptionValues?.[optionKey];
  if(!selectedId) {
    return {ok: false, issue: createIssue(nodeId, `Missing selected LED simulation option for ${optionKey}.`)};
  }

  if(!selection.options.includes(selectedId)) {
    return {ok: false, issue: createIssue(nodeId, `Selected LED simulation option ${selectedId} is not allowed for ${optionKey}.`)};
  }

  if(optionKey === "currentCurve") {
    const option = LED_STRIP_CURRENT_CURVE_OPTIONS[selectedId];
    if(!option) {
      return {ok: false, issue: createIssue(nodeId, `Unknown LED current curve option ${selectedId}.`)};
    }
    return {ok: true, value: option.id};
  }

  const option = LED_STRIP_RESISTANCE_OPTIONS[selectedId];
  if(!option || !Number.isFinite(option.resistanceOhm) || option.resistanceOhm <= 0) {
    return {ok: false, issue: createIssue(nodeId, `Unknown or invalid LED resistance option ${selectedId}.`)};
  }

  return {ok: true, value: option.resistanceOhm};
};
