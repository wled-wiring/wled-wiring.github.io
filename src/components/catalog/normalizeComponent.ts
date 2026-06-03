import { Position } from '@xyflow/react';
import type {
  CompInputFieldDataType,
  CompSelectFieldDataType,
  ComponentDataType,
  GeneralComponent,
  HandleDataType,
} from '../../types';
import type {
  ComponentFieldDefinition,
  ComponentHandleDefinition,
  ComponentPackage,
  LocalizedText,
  NormalizedComponentDefinition,
} from './componentSchema';

const localizedToRuntimeText = (text: LocalizedText | undefined): string => {
  if (typeof text === 'string') return text;
  return text?.default ?? '';
};

const positionToReactFlow = (position: ComponentHandleDefinition['position']): Position => {
  switch (position) {
    case 'right':
      return Position.Right;
    case 'top':
      return Position.Top;
    case 'bottom':
      return Position.Bottom;
    case 'left':
    default:
      return Position.Left;
  }
};

const normalizeHandle = (handle: ComponentHandleDefinition): HandleDataType => {
  const runtimeHandle: HandleDataType = {
    hid: handle.id,
    type: handle.type,
    x: handle.x,
    y: handle.y,
    xalign: handle.xalign,
    yalign: handle.yalign,
    width: handle.width,
    height: handle.height,
    borderType: handle.border?.type ?? 'solid',
    borderColor: handle.border?.color ?? 'black',
    borderRadius: handle.border?.radius ?? '0',
    borderLineWidth: handle.border?.lineWidth ?? 1,
    postype: handle.postype,
    position: positionToReactFlow(handle.position),
    name: localizedToRuntimeText(handle.name),
    repeated: handle.behavior?.repeated === undefined ? undefined : handle.behavior.repeated ? 'yes' : 'no',
    repeatAtFirst: handle.behavior?.repeatAtFirst === undefined ? undefined : handle.behavior.repeatAtFirst ? 'yes' : 'no',
    changeColorAutomatically: handle.behavior?.changeColorAutomatically,
    tolVmax: handle.voltage?.toleranceMax,
    tolVmin: handle.voltage?.toleranceMin,
    Vout: handle.voltage?.out,
    VoutDependency: handle.voltage?.outDependency,
    Imax: handle.Imax,
    maxCrossSectionAbsolute: handle.maxCrossSectionAbsolute,
    maxCrossSectionWarning: handle.maxCrossSectionWarning,
    relatedToHandle: handle.relatedToHandle,
    controllableBy: handle.behavior?.controllableBy,
    internallyProtected: handle.behavior?.internallyProtected,
    functions: handle.functions,
    prefferedLineWidth: handle.behavior?.preferredLineWidth,
    hideConditions: handle.behavior?.hideConditions?.map((condition) => ({
      selectHID: condition.fieldId,
      values: condition.values,
    })),
    prefferedLineDirection: handle.behavior?.preferredLineDirection,
    mustBeConnected: handle.behavior?.mustBeConnected,
  };

  if (handle.description !== undefined) {
    runtimeHandle.description = localizedToRuntimeText(handle.description);
  }

  return runtimeHandle;
};

const normalizeNumberField = (
  field: Extract<ComponentFieldDefinition, {type: 'number'}>,
): CompInputFieldDataType => ({
  technicalID: field.id,
  type: 'number_input',
  name: localizedToRuntimeText(field.name),
  value: field.value,
  min: field.min,
  max: field.max,
  step: field.step,
  unit: field.unit ?? field.ui?.unit ?? '',
  fieldWidth: field.ui?.fieldWidth ?? 40,
  color: field.ui?.color ?? 'black',
});

const normalizeSelectField = (
  field: Extract<ComponentFieldDefinition, {type: 'select'}>,
): CompSelectFieldDataType => {
  const runtimeField: CompSelectFieldDataType = {
    technicalID: field.id,
    name: localizedToRuntimeText(field.name),
    displayName: field.ui?.displayName ?? true,
    selectedValue: field.selectedValue,
    unit: field.unit ?? field.ui?.unit ?? '',
    customImage: field.ui?.customImage ?? false,
    color: field.ui?.color ?? 'black',
    fieldWidth: field.ui?.fieldWidth ?? 40,
    options: field.options.map((option) => ({
      value: option.value,
      label: localizedToRuntimeText(option.label),
      img: option.image
        ? {
            url: option.image.url ?? '',
            width: option.image.width ?? 0,
            height: option.image.height ?? 0,
          }
        : undefined,
      x: option.x,
      y: option.y,
    })),
  };

  if (field.ui?.hide !== undefined) runtimeField.hide = field.ui.hide;
  if (field.ui?.showNameIfSelected !== undefined) {
    runtimeField.showNameIfSelected = field.ui.showNameIfSelected;
  }

  return runtimeField;
};

const createTemplateData = (componentPackage: ComponentPackage): ComponentDataType => {
  const definition = componentPackage.component;
  const display = definition.display;
  const geometry = definition.geometry;
  const inputFields = definition.fields
    ?.filter((field): field is Extract<ComponentFieldDefinition, {type: 'number'}> => field.type === 'number')
    .map(normalizeNumberField);
  const selectFields = definition.fields
    ?.filter((field): field is Extract<ComponentFieldDefinition, {type: 'select'}> => field.type === 'select')
    .map(normalizeSelectField);

  return {
    name: localizedToRuntimeText(display.name),
    description: localizedToRuntimeText(display.descriptionShort),
    technicalID: definition.id,
    technicalVersion: definition.version,
    group: display.group,
    image: geometry.image?.url
      ? {
          url: geometry.image.url,
          width: geometry.image.width,
          height: geometry.image.height,
        }
      : undefined,
    noBackgroundImage: geometry.noBackgroundImage,
    rotation: geometry.rotation ?? 0,
    borderWidth: geometry.borderWidth ?? 0,
    resizableX: geometry.resizableX,
    resizableY: geometry.resizableY,
    rotatable: geometry.rotatable,
    physLengthStep: definition.physical?.lengthStep,
    handles: definition.handles.map(normalizeHandle),
    inputFields: inputFields && inputFields.length > 0 ? inputFields : undefined,
    selectFields: selectFields && selectFields.length > 0 ? selectFields : undefined,
    internalConnections: definition.internalConnections,
    simdata: definition.simulation,
    popover: {
      buyLinks: display.buyLinks,
      description: localizedToRuntimeText(display.description),
    },
    showName: display.showName,
    componentRef: {
      source: componentPackage.source.type,
      packageId: 'packageId' in componentPackage.source ? componentPackage.source.packageId : undefined,
      componentId: definition.id,
      version: definition.version,
    },
    ...definition.runtime,
  };
};

export const normalizeComponentPackage = (
  componentPackage: ComponentPackage,
): NormalizedComponentDefinition => {
  const templateData = createTemplateData(componentPackage);

  return {
    package: componentPackage,
    source: componentPackage.source,
    componentId: componentPackage.component.id,
    version: componentPackage.component.version,
    group: componentPackage.component.display.group,
    templateData,
    nodeOrigin: componentPackage.component.geometry.nodeOrigin,
  };
};

export const createReactFlowTemplate = (definition: NormalizedComponentDefinition): GeneralComponent => ({
  id: '',
  type: 'general-component-type',
  position: {x: 0, y: 0},
  origin: definition.nodeOrigin,
  data: structuredClone(definition.templateData),
});
