import type { Node, HandleType, Position, Edge} from '@xyflow/react';

export type GeneralComponent = Node<ComponentDataType, 'general-component-type'>;
export type EditableWire = Edge<EdgeDataType, 'editable-wire-type'>;

export const ItemTypes = {
  NODE: 'flownode',
};

export type HandleAlignType=("start" | "end");
export type HandlePostype=("centered" | "top" | "bottom" | "left" | "right");
export type DirectionType=("up" | "down" | "left" | "right" | undefined);
export type HandleRepeatedType=("yes" | "no");
export type HandleRepeatAtFirstType=("yes" | "no");

export type ComponentGroupType=("controller" | "led" | "psu" | "levelshifter" | "electronics" | "others" | "special");


export type PhysLengthType = {startIndex: number, length: number|undefined};

export type ImageDataType={
  url: string;
  width: number;
  height: number;
}

export type CompInputFieldDataType = {
  technicalID: string;
  type: "number_input";
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  fieldWidth: number;
  color: string;
}

export type CompSelectFieldDataType = {
  technicalID: string;
  name: string;
  displayName: boolean;
  selectedValue: number;
  unit: string;
  customImage: boolean;
  color: string;
  fieldWidth: number;
  hide: boolean;
  showNameIfSelected: boolean;
  options: {
    value: number;
    label: string;
    img?: ImageDataType;
    x?: number,
    y?:number,
  }[]
}

export type CompInputFieldsBoxType = {
  x: number;
  y: number;
  borderType: string;
  borderColor: string;
  borderLineWidth: number;
  borderRadius: string;
  backgroundColor: string;
  backgroundColorSelected: string;
  rotate180only?: boolean;
} 

export type HandleDataType = {
    hid: string;
    type: HandleType;
    x: number;
    y: number;
    xalign: HandleAlignType,
    yalign: HandleAlignType,
    width: number;
    height: number;
    borderType: string;
    borderColor: string,
    borderRadius: string,
    borderLineWidth: number
    postype: HandlePostype; 
    position: Position; // use always left; currently top, bottom and right does nont work correctly
    name: string;
    description: string;
    repeated?: HandleRepeatedType;
    repeatAtFirst?: HandleRepeatAtFirstType;
    repeatIndex?: number;
    changeColorAutomatically?: boolean;
    tolVmax?: number,
    tolVmin?: number,
    Vout?: number,
    functions?: ("dig_in" | "dig_out" | "an_in" | "an_out" | "rst" | "suppl_in" | "suppl_out" | "gnd" | "usb_full" | "usb_power_out" | "suppl_conn" | "general_conn" | "pe" | "neutral" | "line" | "an_common" | "audio_in" | "audio_out" | "eth")[],
    prefferedLineWidth?: number,
    hideConditions?: {selectHID: string, values: number[]}[],
    prefferedLineDirection?: DirectionType, // his can overwrite default behaviour of pathfinding that draw a line from/to handle in direction of closest node bound. Useful for example in case of miniOTO fuse
  };

  export interface FlowNodeProps {
    data: ComponentDataType,
  };
  

  export type ComponentDataType = {
    name: string;
    description: string;
    technicalID: string;
    technicalVersion: number;
    group: ComponentGroupType;
    image?: ImageDataType;
    noBackgroundImage?: boolean
    rotation: number;
    nodeLength?: number;
    borderWidth: number;
    resizableX?: boolean;
    resizableY?: boolean;
    rotatable?: boolean;
    physLengthStep?: number;
    handles: HandleDataType[];
    repeatedHandleArray?: HandleDataType[];
    physLengths?: PhysLengthType[];
    selectedHid?: "" | null;
    // for Line/box node
    applyNodeResizer?: boolean;
    putToBackground?: boolean;
    onlyBorder?: boolean;
    changableColor?: boolean;
    color?: string;
    // for Info Node
    InfoText?: string;
    changableTextColor?: boolean;
    textColor?: string;
    infoTextSize?: number;
    // these variables are for node that ahs some input fields like PSU node
    inputFieldsBox?: CompInputFieldsBoxType;
    inputFields?: CompInputFieldDataType[];
    selectFields?: CompSelectFieldDataType[];
    // these variables for node that is assigned to a wire and holds information about the wire
    wireInfoForNodeId?: string;
    correspondingWireSelected?: boolean;
    wireInfo_length?: number | null;
    wireInfo_crosssection?: number | null;
    wireInfo_crosssectionUnit?: string;
    wireInfo_color?: string;
    // --------------
    // for popover
    popover?: {
      buyLinks?: {
        "url": string;
        "text": string;
      }[];
      description: string;
    };
    showName?: boolean,
  }

  export type EdgeDataType = {
    edgePoints: edgePoint[];
    startXY?: XYPoint;
    endXY?: XYPoint;
    width: number;
    physLength: number | null;
    physCrosssection: number | null;
    physCrosssectionUnit: string;
    physType: "single" | "double" | "usb" | "ethernet";
    color: string;
    color_selected: string;
    correspondingInfoNodeSelected?: boolean;
  }

  export type edgePoint = {
    x: number;
    y: number;
    active?: number; 
  };

  export type XYPoint = {
    x: number;
    y: number;
  };
  
  export type intersectionPoint = {
    x: number;
    y: number;
    segmentIndex: number;
    partnerId: string;
    partnerSegmentIndex: number;
    xs1: number;
    ys1: number;
    xs2: number;
    ys2: number;
  };
  
  export type segmentData = {
    edgePath:string,
    labelX: number,
    labelY: number,
    active: number,
    segmentSourceX: number,
    segmentSourceY: number,
    segmentTargetX: number,
    segmentTargetY: number 
  };


