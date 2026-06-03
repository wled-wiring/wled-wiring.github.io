import type { ComponentSimulationElementUse, SimulationParameterRef } from '../../simulation/simulationTypes';
import type { ComponentPackage, HandleFunction, LocalizedText } from './componentSchema';

export type ComponentValidationSeverity = 'error' | 'warning';

export type ComponentValidationIssue = {
  severity: ComponentValidationSeverity;
  path: string;
  message: string;
};

export type ComponentValidationResult = {
  valid: boolean;
  issues: ComponentValidationIssue[];
};

export const KNOWN_COMPONENT_GROUPS = [
  'controller',
  'led',
  'psu',
  'levelshifter',
  'electronics',
  'others',
  'special',
] as const;

export const KNOWN_HANDLE_FUNCTIONS: readonly HandleFunction[] = [
  'dig_in',
  'dig_out',
  'dig_clock_in',
  'dig_clock_out',
  'dig_backup_in',
  'dig_backup_out',
  'not_connected',
  'passive',
  'an_in',
  'an_out',
  'rst',
  'suppl_in',
  'suppl_out',
  'gnd',
  'usb_full',
  'usb_power_out',
  'suppl_conn',
  'general_conn',
  'pe_in',
  'pe_out',
  'neutral_in',
  'neutral_out',
  'line_in',
  'line_out',
  'an_common',
  'audio_in',
  'audio_out',
  'eth',
  'rs485_A',
  'rs485_B',
  'pwm_in_R',
  'pwm_in_G',
  'pwm_in_B',
  'pwm_in_W',
  'pwm_in_WW',
  'pwm_out',
];

const KNOWN_SIMULATION_ELEMENT_TYPES: readonly ComponentSimulationElementUse['type'][] = [
  'resistor',
  'shortBridge',
  'voltageSource',
  'currentSource',
  'constantPowerSink',
  'fuse',
  'digitalLed',
  'dcdcConverter',
  'diode',
];

const KNOWN_SIMULATION_PORT_TYPES = ['usbPowerPair'] as const;

const addIssue = (
  issues: ComponentValidationIssue[],
  severity: ComponentValidationSeverity,
  path: string,
  message: string,
) => {
  issues.push({severity, path, message});
};

const hasLocalizedText = (text: LocalizedText | undefined): boolean => {
  if (typeof text === 'string') return text.length > 0;
  return Boolean(text?.default);
};

const hasUniqueId = (
  ids: string[],
  issues: ComponentValidationIssue[],
  path: string,
  label: string,
) => {
  const seen = new Set<string>();
  ids.forEach((id, index) => {
    if (!id) addIssue(issues, 'error', `${path}[${index}]`, `${label} id is required.`);
    if (seen.has(id)) addIssue(issues, 'error', `${path}[${index}]`, `Duplicate ${label} id "${id}".`);
    seen.add(id);
  });
};

const collectParameterRefs = (value: SimulationParameterRef, refs: {field: string[]; select: string[]}): void => {
  if (typeof value !== 'object' || value === null) return;
  if ('field' in value) refs.field.push(value.field);
  if ('select' in value) refs.select.push(value.select);
  if ('table' in value) collectParameterRefs(value.by, refs);
};

export const validateComponentPackage = (componentPackage: ComponentPackage): ComponentValidationResult => {
  const issues: ComponentValidationIssue[] = [];
  const definition = componentPackage.component;

  if (componentPackage.schemaVersion !== 1) {
    addIssue(issues, 'error', 'schemaVersion', 'Only component schemaVersion 1 is supported.');
  }
  if (!definition.id) addIssue(issues, 'error', 'component.id', 'Component id is required.');
  if (!Number.isInteger(definition.version) || definition.version <= 0) {
    addIssue(issues, 'error', 'component.version', 'Component version must be a positive integer.');
  }
  if (!hasLocalizedText(definition.display.name)) addIssue(issues, 'error', 'component.display.name', 'Display name is required.');
  if (!hasLocalizedText(definition.display.descriptionShort)) {
    addIssue(issues, 'error', 'component.display.descriptionShort', 'Short description is required.');
  }
  if (!KNOWN_COMPONENT_GROUPS.includes(definition.display.group)) {
    addIssue(issues, 'error', 'component.display.group', `Unknown component group "${definition.display.group}".`);
  }
  if (definition.geometry.image) {
    if (!definition.geometry.image.url && !definition.geometry.image.assetId) {
      addIssue(issues, 'error', 'component.geometry.image', 'Image needs either url or assetId.');
    }
    if (definition.geometry.image.width <= 0 || definition.geometry.image.height <= 0) {
      addIssue(issues, 'error', 'component.geometry.image', 'Image width and height must be positive.');
    }
  }

  const handleIds = definition.handles.map((handle) => handle.id);
  const handleIdSet = new Set(handleIds);
  hasUniqueId(handleIds, issues, 'component.handles', 'handle');
  definition.handles.forEach((handle, index) => {
    if (!hasLocalizedText(handle.name)) addIssue(issues, 'error', `component.handles[${index}].name`, 'Handle name is required.');
    if (handle.width <= 0 || handle.height <= 0) {
      addIssue(issues, 'error', `component.handles[${index}]`, 'Handle width and height must be positive.');
    }
    if (handle.Imax !== undefined && (!Number.isFinite(handle.Imax) || handle.Imax < 0)) {
      addIssue(issues, 'error', `component.handles[${index}].Imax`, 'Imax must be a non-negative number.');
    }
    if (
      handle.maxCrossSectionAbsolute !== undefined &&
      (!Number.isFinite(handle.maxCrossSectionAbsolute) || handle.maxCrossSectionAbsolute < 0)
    ) {
      addIssue(
        issues,
        'error',
        `component.handles[${index}].maxCrossSectionAbsolute`,
        'maxCrossSectionAbsolute must be a non-negative number.',
      );
    }
    if (
      handle.maxCrossSectionWarning !== undefined &&
      (!Number.isFinite(handle.maxCrossSectionWarning) || handle.maxCrossSectionWarning < 0)
    ) {
      addIssue(
        issues,
        'error',
        `component.handles[${index}].maxCrossSectionWarning`,
        'maxCrossSectionWarning must be a non-negative number.',
      );
    }
    if (
      handle.maxCrossSectionAbsolute !== undefined &&
      handle.maxCrossSectionWarning !== undefined &&
      handle.maxCrossSectionWarning >= handle.maxCrossSectionAbsolute
    ) {
      addIssue(
        issues,
        'error',
        `component.handles[${index}].maxCrossSectionWarning`,
        'maxCrossSectionWarning must be smaller than maxCrossSectionAbsolute.',
      );
    }
    handle.functions?.forEach((handleFunction) => {
      if (!KNOWN_HANDLE_FUNCTIONS.includes(handleFunction)) {
        addIssue(issues, 'error', `component.handles[${index}].functions`, `Unknown handle function "${handleFunction}".`);
      }
    });
    handle.relatedToHandle?.forEach((relatedHandleId) => {
      if (!handleIdSet.has(relatedHandleId)) {
        addIssue(issues, 'error', `component.handles[${index}].relatedToHandle`, `Unknown handle "${relatedHandleId}".`);
      }
    });
  });

  const fields = definition.fields ?? [];
  const fieldIds = fields.map((field) => field.id);
  const fieldIdSet = new Set(fieldIds);
  hasUniqueId(fieldIds, issues, 'component.fields', 'field');
  fields.forEach((field, index) => {
    if (!hasLocalizedText(field.name)) addIssue(issues, 'error', `component.fields[${index}].name`, 'Field name is required.');
    if (field.type === 'number' && field.min > field.max) {
      addIssue(issues, 'error', `component.fields[${index}]`, 'Number field min must be smaller than or equal to max.');
    }
    if (field.type === 'select') {
      hasUniqueId(field.options.map((option) => String(option.value)), issues, `component.fields[${index}].options`, 'select option');
      if (!field.options.some((option) => option.value === field.selectedValue)) {
        addIssue(issues, 'error', `component.fields[${index}].selectedValue`, 'Selected value must exist in options.');
      }
    }
  });

  definition.handles.forEach((handle, index) => {
    handle.behavior?.hideConditions?.forEach((condition) => {
      if (!fieldIdSet.has(condition.fieldId)) {
        addIssue(issues, 'error', `component.handles[${index}].behavior.hideConditions`, `Unknown field "${condition.fieldId}".`);
      }
    });
  });

  definition.internalConnections?.forEach((connection, index) => {
    if (!handleIdSet.has(connection.fromHandle)) {
      addIssue(issues, 'error', `component.internalConnections[${index}].fromHandle`, `Unknown handle "${connection.fromHandle}".`);
    }
    if (!handleIdSet.has(connection.toHandle)) {
      addIssue(issues, 'error', `component.internalConnections[${index}].toHandle`, `Unknown handle "${connection.toHandle}".`);
    }
    if (connection.kind === 'fuse' && connection.nominalCurrentField && !fieldIdSet.has(connection.nominalCurrentField)) {
      addIssue(issues, 'error', `component.internalConnections[${index}].nominalCurrentField`, `Unknown field "${connection.nominalCurrentField}".`);
    }
  });

  const simulationVirtualTerminals = new Set<string>();

  definition.simulation?.ports?.forEach((port, index) => {
    if (!KNOWN_SIMULATION_PORT_TYPES.includes(port.type)) {
      addIssue(issues, 'error', `component.simulation.ports[${index}].type`, `Unknown simulation port type "${port.type}".`);
    }
    if (!handleIdSet.has(port.handle)) {
      addIssue(issues, 'error', `component.simulation.ports[${index}].handle`, `Unknown handle "${port.handle}".`);
    }
    if (port.positiveTerminal === port.negativeTerminal) {
      addIssue(issues, 'error', `component.simulation.ports[${index}]`, 'Port terminals must be different.');
    }
    simulationVirtualTerminals.add(port.positiveTerminal);
    simulationVirtualTerminals.add(port.negativeTerminal);
  });

  definition.simulation?.elements?.forEach((element, index) => {
    if (!KNOWN_SIMULATION_ELEMENT_TYPES.includes(element.type)) {
      addIssue(issues, 'error', `component.simulation.elements[${index}].type`, `Unknown simulation element type "${element.type}".`);
    }
    Object.values(element.terminals).forEach((handleId) => {
      if (!handleIdSet.has(handleId) && !simulationVirtualTerminals.has(handleId)) {
        addIssue(issues, 'error', `component.simulation.elements[${index}].terminals`, `Unknown handle "${handleId}".`);
      }
    });
    const refs = {field: [] as string[], select: [] as string[]};
    Object.values(element.parameters ?? {}).forEach((parameter) => collectParameterRefs(parameter, refs));
    refs.field.forEach((fieldId) => {
      if (!fieldIdSet.has(fieldId)) addIssue(issues, 'error', `component.simulation.elements[${index}].parameters`, `Unknown field "${fieldId}".`);
    });
    refs.select.forEach((fieldId) => {
      if (!fieldIdSet.has(fieldId)) addIssue(issues, 'error', `component.simulation.elements[${index}].parameters`, `Unknown select field "${fieldId}".`);
    });
  });

  componentPackage.assets?.forEach((asset, index) => {
    if (asset.dataUrl && asset.dataUrl.length > 1024) {
      addIssue(issues, 'error', `assets[${index}].dataUrl`, 'Embedded assets are limited to 1 kB.');
    }
  });

  return {
    valid: !issues.some((issue) => issue.severity === 'error'),
    issues,
  };
};
