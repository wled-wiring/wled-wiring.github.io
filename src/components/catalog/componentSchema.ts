import type {
  ComponentDataType,
  ComponentGroupType,
  ComponentInternalConnectionType,
  DirectionType,
  GeneralComponent,
  HandleAlignType,
  HandleDataType,
  HandlePostype,
} from '../../types';
import type { ComponentSimulationDefinition } from '../../simulation/simulationTypes';

export type ComponentSource =
  | {type: 'core'}
  | {type: 'local'; packageId?: string}
  | {type: 'store'; packageId: string};

export type LocalizedText = string | {
  default: string;
  de?: string;
  en?: string;
  zh?: string;
};

export type ComponentTranslations = Record<string, Partial<Record<'de' | 'en' | 'zh', string>>>;

export type ComponentAsset = {
  id: string;
  kind: 'image';
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/svg+xml';
  fileName?: string;
  url?: string;
  dataUrl?: string;
  width?: number;
  height?: number;
  sha256?: string;
};

export type ComponentDisplayDefinition = {
  name: LocalizedText;
  descriptionShort: LocalizedText;
  description?: LocalizedText;
  group: ComponentGroupType;
  showName?: boolean;
  buyLinks?: {url: string; text: string}[];
};

export type ComponentGeometryDefinition = {
  image?: {
    assetId?: string;
    url?: string;
    width: number;
    height: number;
  };
  nodeOrigin?: GeneralComponent['origin'];
  noBackgroundImage?: boolean;
  rotation?: number;
  rotatable?: boolean;
  resizableX?: boolean;
  resizableY?: boolean;
  borderWidth?: number;
};

export type ComponentPhysicalDefinition = {
  lengthStep?: number;
};

export type HandleFunction = NonNullable<HandleDataType['functions']>[number];

export type ComponentHandleDefinition = {
  id: string;
  name: LocalizedText;
  description?: LocalizedText;
  type: 'source' | 'target';
  x: number;
  y: number;
  xalign: HandleAlignType;
  yalign: HandleAlignType;
  width: number;
  height: number;
  postype: HandlePostype;
  position?: 'left' | 'right' | 'top' | 'bottom';
  border?: {
    type: string;
    color: string;
    lineWidth: number;
    radius: string;
  };
  functions?: HandleFunction[];
  voltage?: {
    out?: number;
    outDependency?: string;
    toleranceMin?: number;
    toleranceMax?: number;
  };
  Imax?: number;
  maxCrossSectionAbsolute?: number;
  maxCrossSectionWarning?: number;
  relatedToHandle?: string[];
  behavior?: {
    repeated?: boolean;
    repeatAtFirst?: boolean;
    mustBeConnected?: boolean;
    changeColorAutomatically?: boolean;
    controllableBy?: string;
    internallyProtected?: boolean;
    preferredLineWidth?: number;
    preferredLineDirection?: DirectionType;
    hideConditions?: {fieldId: string; values: number[]}[];
  };
};

export type ComponentFieldUi = {
  displayName?: boolean;
  unit?: string;
  color?: string;
  fieldWidth?: number;
  hide?: boolean;
  showNameIfSelected?: boolean;
  customImage?: boolean;
};

export type ComponentFieldDefinition =
  | {
      id: string;
      type: 'number';
      name: LocalizedText;
      value: number;
      min: number;
      max: number;
      step: number;
      unit?: string;
      ui?: ComponentFieldUi;
    }
  | {
      id: string;
      type: 'select';
      name: LocalizedText;
      selectedValue: number;
      options: {
        value: number;
        label: LocalizedText;
        image?: {assetId?: string; url?: string; width?: number; height?: number};
        x?: number;
        y?: number;
      }[];
      unit?: string;
      ui?: ComponentFieldUi;
    };

export type ComponentInternalConnectionDefinition = ComponentInternalConnectionType;

export type ComponentEditorHints = Record<string, unknown>;

export type ComponentRuntimeDefinition = Pick<
  ComponentDataType,
  | 'applyNodeResizer'
  | 'putToBackground'
  | 'onlyBorder'
  | 'changableColor'
  | 'color'
  | 'changableTextColor'
  | 'textColor'
  | 'infoText'
  | 'infoTextSize'
  | 'infoTextFontFamily'
  | 'infoTextBold'
  | 'infoTextAlign'
  | 'inputFieldsBox'
  | 'ledSimulationOptions'
  | 'ledSimulationOptionValues'
  | 'noBackgroundImageURL'
  | 'wireInfoForNodeId'
  | 'correspondingWireSelected'
>;

export type ComponentDefinition = {
  id: string;
  version: number;
  display: ComponentDisplayDefinition;
  geometry: ComponentGeometryDefinition;
  physical?: ComponentPhysicalDefinition;
  handles: ComponentHandleDefinition[];
  fields?: ComponentFieldDefinition[];
  internalConnections?: ComponentInternalConnectionDefinition[];
  simulation?: ComponentSimulationDefinition;
  runtime?: ComponentRuntimeDefinition;
  editor?: ComponentEditorHints;
};

export type ComponentStoreMetadata = {
  packageId?: string;
  tags?: string[];
  author?: string;
  license?: string;
};

export type ComponentPackage = {
  schemaVersion: 1;
  source: ComponentSource;
  component: ComponentDefinition;
  assets?: ComponentAsset[];
  translations?: ComponentTranslations;
  store?: ComponentStoreMetadata;
};

export type NormalizedComponentDefinition = {
  package: ComponentPackage;
  source: ComponentSource;
  componentId: string;
  version: number;
  group: ComponentGroupType;
  templateData: ComponentDataType;
  nodeOrigin?: GeneralComponent['origin'];
};

export type ComponentCatalog = {
  core: NormalizedComponentDefinition[];
  local: NormalizedComponentDefinition[];
  store: NormalizedComponentDefinition[];
};
