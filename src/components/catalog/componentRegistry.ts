import type { ComponentCatalog, ComponentPackage, NormalizedComponentDefinition } from './componentSchema';
import { createReactFlowTemplate } from './normalizeComponent';
import { normalizeComponentPackage } from './normalizeComponent';
import { validateComponentPackage, type ComponentValidationIssue } from './validateComponent';

type ComponentModule = {
  default: ComponentPackage;
};

export const CORE_COMPONENT_ORDER = [
  'ESP32D1mini',
  'ESP32_30P',
  'ESP32_38P',
  'ESP8266D1mini',
  'ESP32C3D1mini',
  'ESP32S3D1mini',
  'ESP32C3_supermini',
  'MHC_V43',
  'MHC_V57',
  'miniOTOFuse',
  'FUSE_Board',
  'PSU_USB',
  'PSU_USB_WIRES',
  'PSU_HP',
  'PLUG_LNPE',
  'SN74AHCT125N',
  'Button',
  'Resistor',
  'Elko',
  'Kerko',
  'LM2596_PCB',
  'DCDC_mini',
  'IRLZ44N',
  'INMP441',
  'PIR_HCSR501',
  'IR_KY022',
  'IR_TSOP38238',
  'DC_JACK_FEMALE',
  'WAGO_2X',
  'WAGO_3X',
  'SolderJoint',
  'InfoNode',
  'LineBoxNode',
  'Router',
  'AUDIO_SOURCE',
  'MHC_SwitchBoard',
  'MHC_PWMBoard',
  'MHC_Relay12V',
  'MHC_Relay5V',
  'MHC_Relay24V',
  'MHC_RS485_R',
  'WS2812B_5V_30LPM',
  'WS2813_5V_60LPM',
  'WS2814_12V_30LPM',
  'WS2814_24V_60LPM',
  'WS2815_12V_30LPM',
  'WS2818_12V_30LPM',
  'WS2805_24V_60LPM',
  'WS2805_12V_60LPM',
  'FCOB_12V_720LPM',
  'FCOB_24V_720LPM',
  'FCOB_24V_784LPM',
  'APA102_5V_30LPM',
  'AN_WHITE_24V_240LPM',
  'AN_RGB_24V_120LPM',
  'AN_RGB_CCT_48V_90LPM',
] as const;

const coreOrderIndex = new Map<string, number>(
  CORE_COMPONENT_ORDER.map((componentId, index) => [componentId, index]),
);

const modules = import.meta.glob<ComponentModule>('./core/*.component.ts', {eager: true});

export type ComponentRegistryIssue = ComponentValidationIssue & {
  componentId: string;
  sourceType: ComponentPackage['source']['type'];
};

export const componentRegistryIssues: ComponentRegistryIssue[] = [];

const normalizePackages = (packages: ComponentPackage[]): NormalizedComponentDefinition[] => (
  packages
    .map((componentPackage) => {
      const validation = validateComponentPackage(componentPackage);
      componentRegistryIssues.push(
        ...validation.issues.map((issue) => ({
          ...issue,
          componentId: componentPackage.component.id,
          sourceType: componentPackage.source.type,
        })),
      );
      return normalizeComponentPackage(componentPackage);
    })
);

const corePackages = Object.values(modules).map((module) => module.default);

export const componentCatalog: ComponentCatalog = {
  core: normalizePackages(corePackages).sort((a, b) => {
    const orderA = coreOrderIndex.get(a.componentId) ?? Number.MAX_SAFE_INTEGER;
    const orderB = coreOrderIndex.get(b.componentId) ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return a.componentId.localeCompare(b.componentId);
  }),
  local: [],
  store: [],
};

export const getAllComponentDefinitions = (): NormalizedComponentDefinition[] => [
  ...componentCatalog.core,
  ...componentCatalog.local,
  ...componentCatalog.store,
];

export const getComponentTemplate = (componentId: string) => {
  const definition = getAllComponentDefinitions().find((component) => component.componentId === componentId);
  return definition ? createReactFlowTemplate(definition) : undefined;
};

export const createComponentList = () => componentCatalog.core.map(createReactFlowTemplate);
