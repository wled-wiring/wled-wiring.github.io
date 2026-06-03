import {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent} from 'react';
import {createPortal} from 'react-dom';

import {    RotateLeftOutlined, RotateRightOutlined,
            ArrowsAltOutlined, ShrinkOutlined,
            DeleteOutlined, CopyOutlined, BorderOutlined, XFilled,
            InfoCircleOutlined, BoldOutlined,
            AlignLeftOutlined, AlignCenterOutlined, AlignRightOutlined} from '@ant-design/icons';

import Icon from '@ant-design/icons';

import { Handle, NodeProps, NodeToolbar, Position,
    useReactFlow, useUpdateNodeInternals, NodeResizer, type Edge } from '@xyflow/react';

import { useTranslation } from "react-i18next";

import { ComponentDataType, edgePoint, type GeneralComponent, type HandleDataType, type TextAlignType } from '../types';
import { colorNameToRGBString, stripCheckAndDivideIfMiddleConnection} from '../utils/utils_functions';
import { useZustandStore, findPathBetweenTwoHandles} from '../utils/pathfinder_functions.ts';
import { buildUpdatedComponentData, getComponentTemplateData, getComponentUpdateChanges } from '../utils/componentTemplateUpdates.ts';
import { useUndoRedo } from '../utils/undoRedo.tsx';
import { useSelectedElementsCount } from '../utils/useSelectedElementsCount.ts';
import { rotateComponentWires } from '../utils/rotateWireRouting.ts';
import { ENABLE_SIMULATION_CONTROLS } from '../simulation/simulationFeatureFlags.ts';
import { wirePhysicalDefaultsForConnection } from '../wires/wireDefaults.ts';
import {
    LED_STRIP_CURRENT_CURVE_OPTIONS,
    LED_STRIP_RESISTANCE_OPTIONS,
    type LedStripSimulationOptionKey,
} from '../simulation/ledStripSimulationOptions.ts';

import { InputNumber, ColorPicker, ColorPickerProps, Input, Popover, Tooltip, Select, Segmented, message, Button as AntButton, Table} from 'antd';
import { gray, red, green, blue, cyan, purple, magenta, gold } from '@ant-design/colors';

import ConnectionIcon from '../icons/connection.svg?react';
import StartConnectionIcon from '../icons/startconnection.svg?react';
import SimulationIcon from '../icons/simulation.svg?react';

const { TextArea } = Input;

const customColorPanelRender: ColorPickerProps['panelRender'] = (_,{ components: { Presets } }) => (
    <Presets />
);

type PinTooltipState = {
    text: string;
    anchorX: number;
    anchorTop: number;
    anchorBottom: number;
};

type PinTooltipLayout = {
    style: CSSProperties;
    arrowStyle: CSSProperties;
    placement: 'top' | 'bottom';
};

type ResizeDragState = {
    startFlowX: number;
    startFlowY: number;
    startNodeLength: number;
    rotation: number;
    nodeBasicSizeX: number;
    lastAppliedLength: number;
    pointerId: number;
    lastClientX: number;
    lastClientY: number;
    autopanDelta: {x: number; y: number};
    revealPanDelta: {x: number; y: number};
    viewport: {x: number; y: number; zoom: number};
    catchUpDirection: -1 | 1 | null;
};

const resizeHandleOffsetPx = 18;

const resizeAxisUnitForRotation = (componentRotation: number) => {
    if(componentRotation==90) return {x: 0, y: 1};
    if(componentRotation==180) return {x: -1, y: 0};
    if(componentRotation==270) return {x: 0, y: -1};
    return {x: 1, y: 0};
};

const repeatedRelatedHandleIds = (
    relatedToHandle: string[] | undefined,
    repeatedTemplates: HandleDataType[],
    repeatIndex: number,
) => (
    relatedToHandle?.map((relatedHandleId) => {
        const relatedTemplate = repeatedTemplates.find((handle) => handle.hid===relatedHandleId);
        return relatedTemplate ? `${relatedHandleId}_${repeatIndex}` : relatedHandleId;
    })
);

export function GeneralComponent({id, data, selected, dragging, width, height}:NodeProps<GeneralComponent>) {
    const {t} = useTranslation(['main']);
    const [messageApi, messageContextHolder] = message.useMessage();

    const [openColorPicker, setOpenColorPicker] = useState(false);
    const [openComponentUpdatePopover, setOpenComponentUpdatePopover] = useState(false);
    const [openLedSimulationOptionsPopover, setOpenLedSimulationOptionsPopover] = useState(false);
    const [resizeDragging, setResizeDragging] = useState(false);
    const [pinTooltip, setPinTooltip] = useState<PinTooltipState | null>(null);
    const [pinTooltipLayout, setPinTooltipLayout] = useState<PinTooltipLayout | null>(null);
    const [infoTextDraft, setInfoTextDraft] = useState(() => data.InfoText ?? data.infoText ?? "");
    const infoTextFocusedRef = useRef(false);
    const infoTextMeasureCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const infoTextSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const updateNodeInternals = useUpdateNodeInternals();

    const compData = data;

    const reactFlowInstance = useReactFlow();
    const { takeSnapshot } = useUndoRedo();
    const resizeDragRef = useRef<ResizeDragState | null>(null);
    const resizeAutopanFrameRef = useRef<number | null>(null);
    //const { x, y, zoom } = useViewport();
    //const nodeRect = reactFlowInstance.getNodesBounds([id]);

    const rotatable=compData.rotatable;
    const rotation=rotatable?compData.rotation:0;
    const checkHighlighted=Boolean(compData.checkHighlighted);
    const simulationHighlighted=Boolean(compData.simulationHighlighted);
    const simulationHighlightedHandleIds = new Set(compData.simulationHighlightedHandleIds || []);
    const isInfoNode=compData.technicalID=="InfoNode";

    const nodeLength=(compData?.nodeLength || 1);


    const nodeBasicSizeX=compData.image?.width || 0;
    const nodeBasicSizeY=compData.image?.height || 0;
    const flowNodeWidth=typeof width=="number"?width:undefined;
    const flowNodeHeight=typeof height=="number"?height:undefined;
    const infoTextValue=isInfoNode?infoTextDraft:(compData.InfoText ?? compData.infoText ?? "");
    const infoTextSize=compData.infoTextSize || 12;
    const infoTextFontFamily=compData.infoTextFontFamily || "Arial, sans-serif";
    const infoTextBold=Boolean(compData.infoTextBold);
    const infoTextAlign=compData.infoTextAlign || "left";
    const infoTextMinWidth=80;
    const infoTextMinHeight=32;
    const infoTextPadding=18;
    const getInfoTextSizeForValue = useCallback((value: string) => {
        const lines=value.split(/\r?\n/);
        const fontWeight=infoTextBold ? 700 : 400;
        let longestLineWidth=0;

        if(typeof document!="undefined") {
            const canvas=infoTextMeasureCanvasRef.current || document.createElement("canvas");
            infoTextMeasureCanvasRef.current=canvas;
            const context=canvas.getContext("2d");
            if(context) {
                context.font=`${fontWeight} ${infoTextSize}px ${infoTextFontFamily}`;
                longestLineWidth=Math.max(1, ...lines.map((line) => context.measureText(line || " ").width));
            }
        }

        if(longestLineWidth==0) {
            const longestLineLength=Math.max(1, ...lines.map((line) => line.length));
            longestLineWidth=longestLineLength * infoTextSize * (infoTextFontFamily.includes("Courier") ? 0.62 : 0.52);
        }

        return {
            width: Math.max(infoTextMinWidth, Math.ceil(longestLineWidth + infoTextPadding)),
            height: Math.max(infoTextMinHeight, Math.ceil(Math.max(1, lines.length) * infoTextSize * 1.25 + 14)),
        };
    }, [infoTextBold, infoTextFontFamily, infoTextSize]);
    const {width: infoTextRequiredWidth, height: infoTextRequiredHeight}=useMemo(
        () => getInfoTextSizeForValue(infoTextValue),
        [getInfoTextSizeForValue, infoTextValue],
    );
    const infoNodeCurrentWidth=Math.max(flowNodeWidth || 0, nodeBasicSizeX);
    const infoNodeCurrentHeight=Math.max(flowNodeHeight || 0, nodeBasicSizeY);
    const infoNodeWidth=Math.max(infoNodeCurrentWidth, infoTextRequiredWidth);
    const infoNodeHeight=Math.max(infoNodeCurrentHeight, infoTextRequiredHeight);
    const infoTextFontOptions=[
        {value: "Arial, sans-serif", label: "Arial"},
        {value: "Verdana, sans-serif", label: "Verdana"},
        {value: "Georgia, serif", label: "Georgia"},
        {value: "'Courier New', monospace", label: "Courier"},
    ];
    const infoTextAlignOptions=[
        {value: "left", label: <AlignLeftOutlined />},
        {value: "center", label: <AlignCenterOutlined />},
        {value: "right", label: <AlignRightOutlined />},
    ];

    const rotationSwapImgWH = (rotation==90) || (rotation==270);
    //const rotatedImgWidth=rotationSwapImgWH?nodeBasicSizeY:nodeBasicSizeX;
    //const rotatedImgHeight=rotationSwapImgWH?nodeBasicSizeX:nodeBasicSizeY;

    // calculate position and rotation of showName element
    let M=2; // margin
    const showName_top = rotation==0?-M:(rotation==90?0:(rotation==180?-M:nodeLength*nodeBasicSizeX));
    const showName_left = rotation==0?0:(rotation==90?nodeBasicSizeY+M:(rotation==180?0:-M));
    const showName_rotation = rotation==0?0:(rotation==90?90:(rotation==180?0:270));
    const showName_translate_x = 0;
    const showName_translate_y = -100;
    

    const resizableX=compData.resizableX || false;
    const backgroundImageURL=(compData.noBackgroundImage?"":( compData.image?.url || ""));

    const selectedElementsCount = useSelectedElementsCount();
    const multipleSelect = selectedElementsCount > 1;
    const componentEditActive = Boolean(selected && !multipleSelect && !dragging);

    const updateInfoNodeDataAndSize = useCallback((
        dataPatch: Partial<ComponentDataType>,
        size?: {width: number; height: number},
    ) => {
        if(Object.prototype.hasOwnProperty.call(dataPatch, "InfoText") && infoTextSaveTimerRef.current) {
            clearTimeout(infoTextSaveTimerRef.current);
            infoTextSaveTimerRef.current=null;
        }

        const nextWidth=size?Math.ceil(size.width):undefined;
        const nextHeight=size?Math.ceil(size.height):undefined;

        reactFlowInstance.updateNode(id, (node) => {
            const currentData=node.data as ComponentDataType;
            const nextData={...currentData, ...dataPatch};

            if(nextWidth!=undefined && nextHeight!=undefined && currentData.image) {
                nextData.image={
                    ...currentData.image,
                    ...dataPatch.image,
                    width: nextWidth,
                    height: nextHeight,
                };
            }

            if(nextWidth==undefined || nextHeight==undefined) {
                return {data: nextData};
            }

            return {
                data: nextData,
                width: nextWidth,
                height: nextHeight,
                measured: {
                    ...node.measured,
                    width: nextWidth,
                    height: nextHeight,
                },
            };
        });

        if(nextWidth!=undefined && nextHeight!=undefined) {
            updateNodeInternals(id);
        }
    }, [id, reactFlowInstance, updateNodeInternals]);

    const scheduleInfoTextUpdate = useCallback((value: string) => {
        if(infoTextSaveTimerRef.current) {
            clearTimeout(infoTextSaveTimerRef.current);
        }

        infoTextSaveTimerRef.current=setTimeout(() => {
            infoTextSaveTimerRef.current=null;
            updateInfoNodeDataAndSize({InfoText: value});
        }, 250);
    }, [updateInfoNodeDataAndSize]);

    const flushInfoTextUpdate = useCallback((value: string) => {
        if(infoTextSaveTimerRef.current) {
            clearTimeout(infoTextSaveTimerRef.current);
            infoTextSaveTimerRef.current=null;
        }
        updateInfoNodeDataAndSize({InfoText: value});
    }, [updateInfoNodeDataAndSize]);

    useEffect(() => () => {
        if(infoTextSaveTimerRef.current) {
            clearTimeout(infoTextSaveTimerRef.current);
        }
    }, []);

    useEffect(() => {
        if(!isInfoNode || infoTextFocusedRef.current) return;

        const externalInfoText = compData.InfoText ?? compData.infoText ?? "";
        setInfoTextDraft(externalInfoText);
    }, [compData.InfoText, compData.infoText, isInfoNode]);

    useEffect(() => {
        if(!isInfoNode || !compData.image) return;
        if(infoTextRequiredWidth<=infoNodeCurrentWidth && infoTextRequiredHeight<=infoNodeCurrentHeight) return;

        updateInfoNodeDataAndSize({}, {
            width: Math.max(infoNodeCurrentWidth, infoTextRequiredWidth),
            height: Math.max(infoNodeCurrentHeight, infoTextRequiredHeight),
        });
    }, [
        compData.image,
        infoNodeCurrentHeight,
        infoNodeCurrentWidth,
        infoTextRequiredHeight,
        infoTextRequiredWidth,
        isInfoNode,
        updateInfoNodeDataAndSize,
    ]);

    const rotateComponent = (newRotation: number) => {
        takeSnapshot('rotate component');
        reactFlowInstance.updateNodeData(id, {rotation: newRotation});
        reactFlowInstance.setEdges((edges) => rotateComponentWires({
            nodes: reactFlowInstance.getNodes(),
            edges,
            nodeId: id,
            newRotation,
            pathFindingEnabled: useZustandStore.getState().pathFindingEnabled,
        }));
        updateNodeInternals(id);
    };

    const getResizePositionDelta = useCallback((previousLength: number, nextLength: number, componentRotation: number) => {
        const deltaPx=(nextLength-previousLength)*nodeBasicSizeX;
        if(componentRotation==180) return {x: -deltaPx, y: 0};
        if(componentRotation==270) return {x: 0, y: -deltaPx};
        return {x: 0, y: 0};
    }, [nodeBasicSizeX]);

    const resizeComponentToLength = useCallback((requestedNodeLength: number, options?: {
        deleteRemovedHandleEdges?: boolean;
    }) => {
        const nextNodeLength=Math.max(1, Math.round(requestedNodeLength));
        const currentNode=reactFlowInstance.getNode(id);
        if(!currentNode) return false;

        const currentData=currentNode.data as ComponentDataType;
        const previousNodeLength=currentData.nodeLength || 1;
        if(nextNodeLength==previousNodeLength) return false;

        let nextRepeatedHandleArray=structuredClone(currentData.repeatedHandleArray) || [];
        const repeatedHandleTemplates=currentData.handles.filter((handleData)=>(handleData.repeated=="yes"));

        if(nextNodeLength>previousNodeLength) {
            for(let repeatIndex=previousNodeLength; repeatIndex<nextNodeLength; repeatIndex++) {
                currentData.handles.forEach((handleData)=> {
                    if(handleData.repeated!="yes") return;
                    if(nextRepeatedHandleArray.some((repeatedHandle)=>(repeatedHandle.repeatIndex==repeatIndex && repeatedHandle.hid.startsWith(`${handleData.hid}_`)))) return;

                    const newHandle = structuredClone(handleData);
                    newHandle.repeated="no";
                    newHandle.xalign="start";
                    newHandle.repeatIndex = repeatIndex;
                    newHandle.relatedToHandle=repeatedRelatedHandleIds(
                        newHandle.relatedToHandle,
                        repeatedHandleTemplates,
                        repeatIndex,
                    );
                    newHandle.hid=`${newHandle.hid}_${repeatIndex}`;
                    newHandle.x=newHandle.x+repeatIndex*nodeBasicSizeX;
                    nextRepeatedHandleArray.push(newHandle);
                });
            }
        } else {
            const removedHandles=nextRepeatedHandleArray.filter((handleData)=>(handleData.repeatIndex as number)>=nextNodeLength);

            if(options?.deleteRemovedHandleEdges !== false) {
                const removedHandleIds=new Set(removedHandles.map((handleData)=>handleData.hid));
                const edgesToDelete = reactFlowInstance.getEdges().filter((edge)=>(
                    (edge.source==id && edge.sourceHandle!=undefined && removedHandleIds.has(edge.sourceHandle)) ||
                    (edge.target==id && edge.targetHandle!=undefined && removedHandleIds.has(edge.targetHandle))
                ));

                edgesToDelete.forEach((edge)=>{
                    reactFlowInstance.deleteElements({ edges: [{id: edge.id}] } );
                });
            }

            nextRepeatedHandleArray=nextRepeatedHandleArray.filter((handleData)=>(handleData.repeatIndex as number)<nextNodeLength);
        }

        const positionDelta=getResizePositionDelta(previousNodeLength, nextNodeLength, currentData.rotatable?currentData.rotation:0);

        reactFlowInstance.updateNode(id, (node) => ({
            ...node,
            position: {
                x: node.position.x+positionDelta.x,
                y: node.position.y+positionDelta.y,
            },
            data: {
                ...node.data,
                nodeLength: nextNodeLength,
                repeatedHandleArray: nextRepeatedHandleArray.length>0 ? nextRepeatedHandleArray : undefined,
            },
        }));
        updateNodeInternals(id);
        return true;
    }, [getResizePositionDelta, id, nodeBasicSizeX, reactFlowInstance, updateNodeInternals]);

    const showPinTooltip = (event: MouseEvent<HTMLDivElement>, text: string) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setPinTooltipLayout(null);
        setPinTooltip({
            text,
            anchorX: rect.left + rect.width / 2,
            anchorTop: rect.top,
            anchorBottom: rect.bottom,
        });
    };

    const hidePinTooltip = () => {
        setPinTooltip(null);
        setPinTooltipLayout(null);
    };

    useLayoutEffect(() => {
        if(!pinTooltip) return;

        const tooltipElement = document.getElementById(`pin-tooltip-${id}`);
        if(!tooltipElement) return;

        const gap = 10;
        const viewportMargin = 8;
        const tooltipRect = tooltipElement.getBoundingClientRect();

        const maxLeft = Math.max(viewportMargin, window.innerWidth - tooltipRect.width - viewportMargin);
        const left = Math.min(Math.max(pinTooltip.anchorX - tooltipRect.width / 2, viewportMargin), maxLeft);

        const hasRoomAbove = pinTooltip.anchorTop - tooltipRect.height - gap >= viewportMargin;
        const placement = hasRoomAbove ? 'top' : 'bottom';
        const top = placement === 'top'
            ? Math.max(viewportMargin, pinTooltip.anchorTop - tooltipRect.height - gap)
            : Math.min(window.innerHeight - tooltipRect.height - viewportMargin, pinTooltip.anchorBottom + gap);

        const arrowX = Math.min(Math.max(pinTooltip.anchorX - left, 12), Math.max(12, tooltipRect.width - 12));

        setPinTooltipLayout({
            placement,
            style: {
                left,
                top: Math.max(viewportMargin, top),
                opacity: 1,
                visibility: 'visible',
            },
            arrowStyle: {
                left: arrowX,
            },
        });
    }, [id, pinTooltip]);

    const borderWidth = compData.borderWidth ?? 2;
    const repeatedHandleArray = compData.repeatedHandleArray || [];

    const combinedHandlesArray=
        compData.handles.filter(
            (handleData)=>(handleData.repeated==undefined || handleData.repeated=="no" || (handleData.repeated=="yes" && handleData.repeatAtFirst=="yes"))
        ).concat(repeatedHandleArray);

    // filter handles out that are not visible because of hideConditions
    const combinedHandlesArrayVisible=combinedHandlesArray.filter((handleData) => {
        let retval=true;
        handleData.hideConditions?.forEach(element => {
            const selectedFieldsOptionValue=compData.selectFields?.filter((selectedField)=>(selectedField.technicalID==element.selectHID))[0].selectedValue;
            //console.log(element.selectHID, selectedFieldsOptionValue);
            //console.log(element.values.filter((value)=>value==selectedFieldsOptionValue).length);
            if(element.values.filter((value)=>value==selectedFieldsOptionValue).length>0) retval=false;
        });
        return retval;
    });
    //console.log(combinedHandlesArrayVisible);

    // inputFields 
    const inputFieldsExist= (compData.inputFields?.length || 0)>0;
    const selectFieldsExist= (compData.selectFields?.length || 0)>0;

   
    let inputFieldsBox_y=compData.inputFieldsBox?.y || 0;
    let inputFieldsBox_x=compData.inputFieldsBox?.x || 0;
    if(rotation==180) {
        inputFieldsBox_x=nodeLength*nodeBasicSizeX-inputFieldsBox_x;
        inputFieldsBox_y=nodeBasicSizeY-inputFieldsBox_y;
        // if inputFieldsBox.y is higher than image height (==inputFildsBox at the bottom of component), then move
        // it also to the bottom when component is 180 degrees rotated
        if((compData.inputFieldsBox?.y || 0)> (compData.image?.height || 0)) {
            inputFieldsBox_y=compData.inputFieldsBox?.y || 0;
        }
    }
    if(rotation==90) {
        inputFieldsBox_x=nodeBasicSizeY-inputFieldsBox_y;
        inputFieldsBox_y=(compData.inputFieldsBox?.x || 0);
    }
    if(rotation==270) {
        inputFieldsBox_x=inputFieldsBox_y;
        inputFieldsBox_y=nodeLength*nodeBasicSizeX-(compData.inputFieldsBox?.x || 0);
    }
    const inputFieldsBox_rotation_notSelected = (rotation==180)?0:rotation;
    const inputFieldsBox_rotation_selected = 0;
    const inputFieldsBox_rotation = componentEditActive?inputFieldsBox_rotation_selected:inputFieldsBox_rotation_notSelected;

    // physLengths
    const drawPhysLengths=compData.physLengths || [{startIndex: 0, length:undefined}];
    let widthPhysLengths = new Array(drawPhysLengths.length).fill(0) as number[];
    let offsetsPhysLengths= new Array(drawPhysLengths.length).fill(0)  as number[];
    for(let i=0; i<drawPhysLengths.length; i++) {
        if(i<drawPhysLengths.length-1) {
            widthPhysLengths[i]=(drawPhysLengths[i+1].startIndex-drawPhysLengths[i].startIndex)*nodeBasicSizeX;
        } else {
            widthPhysLengths[i]=(nodeLength-drawPhysLengths[i].startIndex)*nodeBasicSizeX;
        }
        offsetsPhysLengths[i]=drawPhysLengths[i].startIndex*nodeBasicSizeX;
    }
    let top_PhysLengths= new Array(drawPhysLengths.length).fill(0)  as number[];
    let left_PhysLengths= new Array(drawPhysLengths.length).fill(0)  as number[];
    let rotation_PhysLengthsText=0;
    let translate_x_PhysLengths=0;
    let translate_y_PhysLengths=0;
    if(rotation==0) {
        for(let i=0; i<left_PhysLengths.length; i++) {
            left_PhysLengths[i]=offsetsPhysLengths[i];
            top_PhysLengths[i]=nodeBasicSizeY;
        }
    }
    if(rotation==180) {
        for(let i=0; i<left_PhysLengths.length; i++) {
            left_PhysLengths[i]=nodeLength*nodeBasicSizeX-offsetsPhysLengths[i]-widthPhysLengths[i];
            top_PhysLengths[i]=nodeBasicSizeY;
        }
    }
    if(rotation==90) {
        for(let i=0; i<left_PhysLengths.length; i++) {
            left_PhysLengths[i]=0;
            top_PhysLengths[i]=offsetsPhysLengths[i];
        }
        translate_x_PhysLengths=-100;
        rotation_PhysLengthsText=90;
    }
    if(rotation==270) {
        for(let i=0; i<left_PhysLengths.length; i++) {
            left_PhysLengths[i]=nodeBasicSizeY;
            top_PhysLengths[i]=nodeLength*nodeBasicSizeX-offsetsPhysLengths[i]-widthPhysLengths[i];
        }
        rotation_PhysLengthsText=-90;
    }

    // Zoom
    const zoomValue = reactFlowInstance.getZoom();

    const dragResizeActive = componentEditActive && resizableX;
    const resizeHandleAnchor = useMemo(() => {
        const stripLengthPx=nodeLength*nodeBasicSizeX;
        if(rotation==90) return {left: nodeBasicSizeY/2, top: stripLengthPx+resizeHandleOffsetPx};
        if(rotation==180) return {left: -resizeHandleOffsetPx, top: nodeBasicSizeY/2};
        if(rotation==270) return {left: nodeBasicSizeY/2, top: -resizeHandleOffsetPx};
        return {left: stripLengthPx+resizeHandleOffsetPx, top: nodeBasicSizeY/2};
    }, [nodeBasicSizeX, nodeBasicSizeY, nodeLength, rotation]);
    const resizeHandleCursor = (rotation==90 || rotation==270) ? "ns-resize" : "ew-resize";

    const stopResizeAutopan = useCallback(() => {
        if(resizeAutopanFrameRef.current!=null) {
            window.cancelAnimationFrame(resizeAutopanFrameRef.current);
            resizeAutopanFrameRef.current=null;
        }
        if(resizeDragRef.current) {
            resizeDragRef.current.autopanDelta={x: 0, y: 0};
            resizeDragRef.current.revealPanDelta={x: 0, y: 0};
        }
    }, []);

    const screenToResizeFlowPosition = useCallback((
        clientX: number,
        clientY: number,
        viewport: {x: number; y: number; zoom: number},
    ) => {
        const wrapper=document.querySelector(".react-flow") as HTMLElement | null;
        const rect=wrapper?.getBoundingClientRect();
        if(!rect || viewport.zoom<=0) return null;

        return {
            x: (clientX-rect.left-viewport.x)/viewport.zoom,
            y: (clientY-rect.top-viewport.y)/viewport.zoom,
        };
    }, []);

    const updateResizeLengthFromPointer = useCallback((clientX: number, clientY: number) => {
        const dragState=resizeDragRef.current;
        if(!dragState) return;

        const currentFlow=screenToResizeFlowPosition(clientX, clientY, dragState.viewport);
        if(!currentFlow) return;

        const flowDeltaX=currentFlow.x-dragState.startFlowX;
        const flowDeltaY=currentFlow.y-dragState.startFlowY;
        const projectedDeltaPx = dragState.rotation==90
            ? flowDeltaY
            : dragState.rotation==180
                ? -flowDeltaX
                : dragState.rotation==270
                    ? -flowDeltaY
                    : flowDeltaX;

        if(dragState.catchUpDirection!=null) {
            const caughtUp = dragState.catchUpDirection>0
                ? projectedDeltaPx>=0
                : projectedDeltaPx<=0;
            const reversedFarEnough = dragState.catchUpDirection>0
                ? projectedDeltaPx<=-dragState.nodeBasicSizeX
                : projectedDeltaPx>=dragState.nodeBasicSizeX;
            if(!caughtUp && !reversedFarEnough) return;
            dragState.catchUpDirection=null;
        }

        const resizeStepThresholdPx=Math.min(dragState.nodeBasicSizeX*0.5, 48);
        const stepDelta = projectedDeltaPx>=resizeStepThresholdPx
            ? 1
            : projectedDeltaPx<=-resizeStepThresholdPx
                ? -1
                : 0;
        if(stepDelta==0) return;

        const nextNodeLength=Math.max(1, dragState.startNodeLength+stepDelta);

        if(nextNodeLength==dragState.lastAppliedLength) return;
        if(resizeComponentToLength(nextNodeLength)) {
            const axisUnit=resizeAxisUnitForRotation(dragState.rotation);
            dragState.lastAppliedLength=nextNodeLength;
            dragState.startNodeLength=nextNodeLength;
            dragState.startFlowX+=axisUnit.x*dragState.nodeBasicSizeX*stepDelta;
            dragState.startFlowY+=axisUnit.y*dragState.nodeBasicSizeX*stepDelta;
            dragState.catchUpDirection=stepDelta;

            if(stepDelta>0 && (dragState.autopanDelta.x!=0 || dragState.autopanDelta.y!=0)) {
                const revealPanPx=Math.min(dragState.nodeBasicSizeX*dragState.viewport.zoom, 96);
                dragState.revealPanDelta={
                    x: dragState.revealPanDelta.x-axisUnit.x*revealPanPx,
                    y: dragState.revealPanDelta.y-axisUnit.y*revealPanPx,
                };
            }
        }
    }, [resizeComponentToLength, screenToResizeFlowPosition]);

    const runResizeAutopan = useCallback(() => {
        const dragState=resizeDragRef.current;
        if(!dragState) {
            resizeAutopanFrameRef.current=null;
            return;
        }

        const panDelta={
            x: dragState.autopanDelta.x+dragState.revealPanDelta.x,
            y: dragState.autopanDelta.y+dragState.revealPanDelta.y,
        };
        dragState.revealPanDelta={x: 0, y: 0};

        if(panDelta.x!=0 || panDelta.y!=0) {
            const nextViewport={
                x: dragState.viewport.x+panDelta.x,
                y: dragState.viewport.y+panDelta.y,
                zoom: dragState.viewport.zoom,
            };
            dragState.viewport=nextViewport;
            reactFlowInstance.setViewport(nextViewport);
            updateResizeLengthFromPointer(dragState.lastClientX, dragState.lastClientY);
            resizeAutopanFrameRef.current=window.requestAnimationFrame(runResizeAutopan);
            return;
        }

        resizeAutopanFrameRef.current=null;
    }, [reactFlowInstance, updateResizeLengthFromPointer]);

    const updateResizeAutopan = useCallback((clientX: number, clientY: number) => {
        const dragState=resizeDragRef.current;
        if(!dragState) return;

        const wrapper=document.querySelector(".react-flow") as HTMLElement | null;
        const rect=wrapper?.getBoundingClientRect();
        if(!rect) {
            stopResizeAutopan();
            return;
        }

        const edgeSize=48;
        const maxSpeed=16;
        const distanceToLeft=clientX-rect.left;
        const distanceToRight=rect.right-clientX;
        const distanceToTop=clientY-rect.top;
        const distanceToBottom=rect.bottom-clientY;
        const panDelta={x: 0, y: 0};

        if(distanceToLeft<edgeSize) panDelta.x=maxSpeed*(1-Math.max(0, distanceToLeft)/edgeSize);
        if(distanceToRight<edgeSize) panDelta.x=-maxSpeed*(1-Math.max(0, distanceToRight)/edgeSize);
        if(distanceToTop<edgeSize) panDelta.y=maxSpeed*(1-Math.max(0, distanceToTop)/edgeSize);
        if(distanceToBottom<edgeSize) panDelta.y=-maxSpeed*(1-Math.max(0, distanceToBottom)/edgeSize);

        dragState.autopanDelta=panDelta;

        if((panDelta.x!=0 || panDelta.y!=0) && resizeAutopanFrameRef.current==null) {
            resizeAutopanFrameRef.current=window.requestAnimationFrame(runResizeAutopan);
        } else if(panDelta.x==0 && panDelta.y==0) {
            stopResizeAutopan();
        }
    }, [runResizeAutopan, stopResizeAutopan]);

    const finishResizeDrag = useCallback((event?: PointerEvent<HTMLDivElement>) => {
        if(event && event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        resizeDragRef.current=null;
        setResizeDragging(false);
        stopResizeAutopan();
    }, [stopResizeAutopan]);

    const startResizeDrag = useCallback((event: PointerEvent<HTMLDivElement>) => {
        event.stopPropagation();
        event.preventDefault();
        if(nodeBasicSizeX<=0) return;

        event.currentTarget.setPointerCapture(event.pointerId);
        takeSnapshot('resize component');
        setResizeDragging(true);
        const viewport=reactFlowInstance.getViewport();
        const startFlow=screenToResizeFlowPosition(event.clientX, event.clientY, viewport);
        if(!startFlow) {
            event.currentTarget.releasePointerCapture(event.pointerId);
            setResizeDragging(false);
            return;
        }
        resizeDragRef.current={
            startFlowX: startFlow.x,
            startFlowY: startFlow.y,
            startNodeLength: nodeLength,
            rotation,
            nodeBasicSizeX,
            lastAppliedLength: nodeLength,
            pointerId: event.pointerId,
            lastClientX: event.clientX,
            lastClientY: event.clientY,
            autopanDelta: {x: 0, y: 0},
            revealPanDelta: {x: 0, y: 0},
            viewport,
            catchUpDirection: null,
        };
    }, [nodeBasicSizeX, nodeLength, reactFlowInstance, rotation, screenToResizeFlowPosition, takeSnapshot]);

    useEffect(() => () => {
        if(resizeAutopanFrameRef.current!=null) {
            window.cancelAnimationFrame(resizeAutopanFrameRef.current);
            resizeAutopanFrameRef.current=null;
        }
    }, []);
    const connectionOptions=combinedHandlesArrayVisible.map( (handle) => ({
        value: handle.hid,
        label: handle.name + (handle.repeated?(" ("+handle.repeatIndex+")"):"")
    }));

    const showLedSimulationOptions = ENABLE_SIMULATION_CONTROLS && compData.group==="led" && compData.ledSimulationOptions!=undefined;
    const ledSimulationOptionLabels: Record<LedStripSimulationOptionKey, string> = {
        supplyResistance: t('ledSimulationOptions.fields.supplyResistance'),
        gndResistance: t('ledSimulationOptions.fields.gndResistance'),
        currentCurve: t('ledSimulationOptions.fields.currentCurve'),
    };

    const ledSimulationOptionDetails = (key: LedStripSimulationOptionKey, optionId: string) => {
        const option = key==="currentCurve"
            ? LED_STRIP_CURRENT_CURVE_OPTIONS[optionId]
            : LED_STRIP_RESISTANCE_OPTIONS[optionId];

        return option
            ? {
                name: t(option.name),
                description: t(option.description),
            }
            : {
                name: optionId,
                description: t('ledSimulationOptions.unknownOption'),
            };
    };

    const updateLedSimulationOption = (key: LedStripSimulationOptionKey, value: string) => {
        takeSnapshot('update led simulation options');
        reactFlowInstance.updateNodeData(id, {
            ledSimulationOptionValues: {
                ...compData.ledSimulationOptionValues,
                [key]: value,
            },
        });
    };

    const ledSimulationOptionsContent = (
        <div
            style={{
                width: 360,
                maxWidth: 360,
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginBottom: 8,
                }}
            >
                <Popover
                    content={
                        <div
                            style={{
                                maxWidth: 320,
                                lineHeight: 1.45,
                            }}
                        >
                            {t('ledSimulationOptions.whyExplanation')}
                        </div>
                    }
                    title={t('ledSimulationOptions.whyTitle')}
                    trigger="click"
                    placement="rightTop"
                >
                    <AntButton
                        size="small"
                        type="link"
                        style={{
                            paddingInline: 0,
                            height: "auto",
                        }}
                    >
                        {t('ledSimulationOptions.whyButton')}
                    </AntButton>
                </Popover>
            </div>
            {(["supplyResistance", "gndResistance", "currentCurve"] as LedStripSimulationOptionKey[]).map((key) => {
                const selection = compData.ledSimulationOptions?.[key];
                if(!selection) return null;

                const selectedValue = compData.ledSimulationOptionValues?.[key] || selection.recommended || selection.options[0];
                const selectedDetails = ledSimulationOptionDetails(key, selectedValue);
                const recommended = selection.recommended || (selection.options.length===1 ? selection.options[0] : undefined);

                return (
                    <div
                        key={key}
                        style={{
                            marginBottom: 14,
                        }}
                    >
                        <div
                            style={{
                                fontWeight: 600,
                                marginBottom: 4,
                            }}
                        >
                            {ledSimulationOptionLabels[key]}
                        </div>
                        <Select
                            size="small"
                            value={selectedValue}
                            disabled={selection.options.length<=1}
                            style={{
                                width: "100%",
                            }}
                            options={selection.options.map((optionId) => {
                                const details = ledSimulationOptionDetails(key, optionId);
                                return {
                                    value: optionId,
                                    label: optionId===recommended
                                        ? `${details.name} (${t('ledSimulationOptions.recommended')})`
                                        : details.name,
                                };
                            })}
                            onChange={(value) => updateLedSimulationOption(key, value)}
                        />
                        <div
                            style={{
                                color: "rgba(0, 0, 0, 0.65)",
                                fontSize: 12,
                                lineHeight: 1.35,
                                marginTop: 4,
                            }}
                        >
                            {selectedDetails.description}
                        </div>
                    </div>
                );
            })}
        </div>
    );



    const componentTemplateData = getComponentTemplateData(compData.technicalID);

    const componentUpdateChanges = componentTemplateData
        ? getComponentUpdateChanges(compData, componentTemplateData, t('sidebar.components.updateValueMissing'))
        : [];

    const updateComponentEnabled = componentUpdateChanges.length>0;

    const componentInfoConnectionListColumns = [
        {
            title: t('sidebar.components.popoverContent.listOfConnectionsHeading1'),
            dataIndex: 'pinName',
            key: 'pinName',
            width: 100
        },
        {
            title: t('sidebar.components.popoverContent.listOfConnectionsHeading2'),
            dataIndex: 'description',
            key: 'description',
            width: 300
        }
    ];

    const componentInfoConnectionListData = compData.handles?.map((handle, index) => ({
        key: handle.hid || index,
        pinName: handle.name,
        description: handle.description || "",
    })) || [];

    const componentUpdateChangeColumns = [
        {
            title: t('sidebar.components.updateChangeProperty'),
            dataIndex: 'path',
            key: 'path',
            width: 180,
        },
        {
            title: t('sidebar.components.updateChangeCurrent'),
            dataIndex: 'currentValue',
            key: 'currentValue',
            width: 180,
        },
        {
            title: t('sidebar.components.updateChangeTemplate'),
            dataIndex: 'templateValue',
            key: 'templateValue',
            width: 180,
        }
    ];

    const applyComponentUpdates = () => {
        if(!componentTemplateData) return;

        takeSnapshot('update component template');
        const updatedComponentData = buildUpdatedComponentData(compData, componentTemplateData);
        reactFlowInstance.updateNodeData(id, updatedComponentData);
        updateNodeInternals(id);
        setOpenComponentUpdatePopover(false);
        messageApi.open({
            type: 'success',
            content: t('message.componentUpdatesApplied'),
            duration: 5,
        });
    };

    const componentUpdateContent = (
        <div
            style={{
                maxWidth: 650,
                maxHeight: 500,
                overflow: "auto",
            }}
        >
            <AntButton
                type="primary"
                disabled={!updateComponentEnabled}
                onClick={applyComponentUpdates}
                style={{
                    marginBottom: 10,
                }}
            >
                {t('sidebar.components.applyUpdatesButtonText')}
            </AntButton>
            <p
                style={{
                    marginTop: 0,
                }}
            >
                {t('sidebar.components.updateExplanation')}
            </p>
            {componentUpdateChanges.length>0 ?
                <Table
                    columns={componentUpdateChangeColumns}
                    dataSource={componentUpdateChanges}
                    size='small'
                    tableLayout='auto'
                    pagination={{ position: ['topRight'], pageSize: 5 }}
                />
            :
                <p>{t('sidebar.components.noUpdateChanges')}</p>
            }
        </div>
    );

    const componentInfoContent = (
        <div
            style={{
                maxWidth: 400,
                maxHeight: 600,
                overflow: "auto",
            }}
        >
            <p><b>{t(compData.name)}</b><br/>{t(compData.description)}</p>
            {compData.popover?.description && <p>{t(compData.popover.description)}</p>}
            {compData.popover?.buyLinks && compData.popover.buyLinks.length>0 &&
                <div>
                    <u>{t('sidebar.components.popoverContent.whereToBuy')}</u><ul>
                    {compData.popover.buyLinks.map((link, index) => (
                        <li key={index}>
                            <a href={link.url} target="_blank" rel="noopener noreferrer">{link.text}</a>
                        </li>
                    ))}
                    </ul>
                </div>
            }
            {componentInfoConnectionListData.length>0 &&
                <div
                    style={{
                        maxWidth: 400,
                        maxHeight: 400,
                    }}
                >
                    <u>{t('sidebar.components.popoverContent.listOfConnections')}</u>
                    <Table
                        columns={componentInfoConnectionListColumns}
                        dataSource={componentInfoConnectionListData}
                        size='small'
                        tableLayout='auto'
                        virtual
                        pagination={{ position: ['topRight'], pageSize: 5 }}
                    />
                </div>
            }
            <Popover
                content={componentUpdateContent}
                title={t('sidebar.components.updatePopoverTitle')}
                trigger="click"
                open={openComponentUpdatePopover}
                onOpenChange={(open) => setOpenComponentUpdatePopover(updateComponentEnabled ? open : false)}
            >
                <AntButton
                    type="primary"
                    disabled={!updateComponentEnabled}
                    style={{
                        marginTop: 10,
                    }}
                >
                    {t('sidebar.components.updateButtonText')}
                </AntButton>
            </Popover>
        </div>
    );

    const startConnectionContent = (
        <Select
            showSearch
            placeholder={t('select.startConnection')}
            optionFilterProp="label"
            options={connectionOptions}
            onSelect={(value,_) => {
                messageApi.open({
                    type: 'success',
                    content: t('message.startPinSelected'),
                    duration: 2,
                  });
                  const allNodes=reactFlowInstance.getNodes();
                  allNodes.filter((node)=>node.id!=id).map((node)=>{
                    reactFlowInstance.updateNodeData(node.id, {selectedHid:null})
                  })
                  reactFlowInstance.updateNodeData(id, {selectedHid: value})
                  setOpenStartConnection(false);
            }}
        >
        </Select>
    );

    const closeConnectionContent = (
        <Select
            showSearch
            placeholder={t('select.closeConnection')}
            optionFilterProp="label"
            options={connectionOptions}
            onSelect={(value,_) => {
                const allNodes=reactFlowInstance.getNodes();
                const startNodes  = allNodes.filter((node)=> (node.data.selectedHid && node.data.selectedHid!=""));
                if(startNodes.length==0) {
                    messageApi.open({
                        type: 'error',
                        content: t('message.startPinFirst'),
                        duration: 2,
                      });
                    setOpenCloseConnection(false);
                    return;
                }
                const startNode=startNodes[0];
                const startNodeID=startNode.id;
                const startNodeHid=(startNode.data as ComponentDataType).selectedHid;
                console.log("startNodeHid", startNodeHid);

                if(startNodeID==id && (startNodeHid  as string)==(value as string)) {
                    messageApi.open({
                        type: 'error',
                        content: t('message.startPinFirst'),
                        duration: 2,
                      });
                    setOpenCloseConnection(false);
                    return;
                }
                // do connect
                let maxZIndex = 0;
                // ferst get max z-Index of existing edges
                const edges=reactFlowInstance.getEdges();
                if(edges.length>0) {
                    maxZIndex = edges.reduce((prev, current) => ( (prev.zIndex? prev.zIndex : 0)> (current.zIndex? current.zIndex:0)) ? prev : current).zIndex || 0;
                }

                let color = "black";
                let startHandle = (startNode.data as ComponentDataType).handles.find((handle)=> (handle.hid==startNodeHid));
                if(!startHandle) {
                    startHandle=(startNode.data as ComponentDataType).repeatedHandleArray?.find((handleData)=>(handleData.hid==startNodeHid));
                }
                if(startHandle) {
                    color = startHandle.borderColor || "#000000";
                }

                let edgePoints=[] as edgePoint[];
                if(useZustandStore.getState().pathFindingEnabled) {
                    edgePoints = findPathBetweenTwoHandles(reactFlowInstance, startNodeID, startNodeHid || "", id, value);
                }

                const edge = {
                    zIndex: (maxZIndex?maxZIndex:0)+1,
                    id: String((maxZIndex?maxZIndex:0)+1),
                    data: {
                        edgePoints: edgePoints,
                        color: color,
                        color_selected: color, 
                        width: 1,
                        physLength: 0.1,
                        ...wirePhysicalDefaultsForConnection(
                            reactFlowInstance.getNodes() as GeneralComponent[],
                            {
                                source: startNodeID,
                                sourceHandle: startNodeHid as string,
                                target: id,
                                targetHandle: value as string,
                            },
                        ),
                    },
                    type: "editable-wire-type",
                    source: startNodeID,
                    target: id,
                    sourceHandle: startNodeHid as string,
                    targetHandle: value as string,
                } as Edge;
                takeSnapshot('connect wire from pin menu');
                reactFlowInstance.addEdges(edge);

                // check if middle handle of a led strip is used and therefore it must be phyically divided
                let handleAndNodeArray=[] as Array<{thisParamsNodeID:string, thisParamsHandleID: string}>;
                if(startNodeID && startNodeHid) handleAndNodeArray.push({thisParamsNodeID:startNodeID, thisParamsHandleID: startNodeHid});
                if(id && value) handleAndNodeArray.push({thisParamsNodeID:id, thisParamsHandleID: value});
                stripCheckAndDivideIfMiddleConnection(reactFlowInstance, handleAndNodeArray);

                setOpenCloseConnection(false);
                messageApi.open({
                type: 'success',
                content: t('message.closePinSelected'),
                duration: 2,
                });
            }}
        >
        </Select>
    );

    const [openStartConnection, setOpenStartConnection] = useState(false);
    const [openCloseConnection, setOpenCloseConnection] = useState(false);

    useLayoutEffect(() => {
        if(!dragging) return;

        setOpenColorPicker(false);
        setOpenComponentUpdatePopover(false);
        setOpenLedSimulationOptionsPopover(false);
        setOpenStartConnection(false);
        setOpenCloseConnection(false);
        setPinTooltip(null);
        setPinTooltipLayout(null);

        if(document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    }, [dragging]);

    return (
      <>
        {messageContextHolder}
        {pinTooltip && createPortal(
            <div
                id={`pin-tooltip-${id}`}
                className={`pin-tooltip-floating pin-tooltip-floating--${pinTooltipLayout?.placement || 'top'}`}
                style={pinTooltipLayout?.style}
            >
                {pinTooltip.text}
                <span
                    className="pin-tooltip-floating__arrow"
                    style={pinTooltipLayout?.arrowStyle}
                />
            </div>,
            document.body
        )}
        <NodeToolbar
            isVisible={componentEditActive}
            position={Position.Top}
            align={"center"}
            className="component-node-toolbar"
        >
            {rotatable &&
                <Tooltip
                    title={t('tooltip.rotateLeft')}
                    placement="bottom"
                >
                    <button
                        onClick={()=>{
                            rotateComponent(((rotation) +90+180) % 360);
                        }}
                    ><RotateLeftOutlined/></button>
                </Tooltip>
            }
            {rotatable &&
                <Tooltip
                    title={t('tooltip.rotateRight')}
                    placement="bottom"
                >
                    <button
                        onClick={()=>{
                            rotateComponent(((rotation) +90) % 360);
                        }}
                    ><RotateRightOutlined/></button>
                </Tooltip>
            }

            <Tooltip
                title={t('tooltip.delete')}
                placement="bottom"
            >
                <button
                    onClick={()=>{
                        reactFlowInstance.deleteElements({ nodes: [{id: id}] });
                    }}
                ><DeleteOutlined/></button>
            </Tooltip>
            <Tooltip
                title={t('tooltip.copy')}
                placement="bottom"
            >
                <button
                    onClick={()=>{
                        const newNode = structuredClone(reactFlowInstance.getNode(id));
                        if(newNode!=undefined) {
                            takeSnapshot('copy component');
                            newNode.id = String(Math.random());
                            newNode.position = {x:newNode.position.x+20, y: newNode.position.y+20};
                            if(compData.physLengths != undefined) {
                                newNode.data.physLengths=[{startIndex:0, length: compData.physLengths
                                    .reduce((partialSum, a) => partialSum + (a.length || 0), 0)}]
                            }
                            newNode.selected=false;
                            reactFlowInstance.addNodes(newNode);
                        }
                    }}
                ><CopyOutlined/></button>
            </Tooltip>
            <Popover
                content={componentInfoContent}
                title={t('sidebar.components.popoverTitle')}
                trigger="click"
            >
                <Tooltip
                    title={t('tooltip.componentInfo')}
                    placement="bottom"
                >
                    <button><InfoCircleOutlined /></button>
                </Tooltip>
            </Popover>
            {showLedSimulationOptions &&
                <Popover
                    content={ledSimulationOptionsContent}
                    title={t('ledSimulationOptions.title')}
                    trigger="click"
                    open={openLedSimulationOptionsPopover}
                    onOpenChange={(open) => setOpenLedSimulationOptionsPopover(open)}
                >
                    <Tooltip
                        title={t('tooltip.ledSimulationOptions')}
                        placement="bottom"
                    >
                        <button><SimulationIcon /></button>
                    </Tooltip>
                </Popover>
            }

            {
                combinedHandlesArrayVisible.length>0 && 
                <Popover
                    content={startConnectionContent}
                    title={t('popover.startConnection')}
                    trigger="click"
                    open={openStartConnection}
                    onOpenChange={(open) => setOpenStartConnection(open)}
                >
                    <Tooltip
                        title={t('tooltip.startConnection')}
                        placement="bottom"
                    >
                        <button
                        ><Icon component={StartConnectionIcon} /></button>
                    </Tooltip>
                </Popover>
            }
            {
                combinedHandlesArrayVisible.length>0 && 
                <Popover
                    content={closeConnectionContent}
                    title={t('popover.closeConnection')}
                    trigger="click"
                    open={openCloseConnection}
                    onOpenChange={(open) => setOpenCloseConnection(open)}
                >
                    <Tooltip
                        title={t('tooltip.closeConnection')}
                        placement="bottom"
                    >
                        <button
                        ><Icon component={ConnectionIcon} /></button>
                    </Tooltip>
                </Popover>
            }
            {resizableX &&
            <Tooltip
                title={t('tooltip.enlarge')}
                placement="bottom"
            >
                <button
                    onClick={()=>{
                        takeSnapshot('resize component');
                        resizeComponentToLength(nodeLength+1);
                    }}
                ><ArrowsAltOutlined rotate={45+rotation}/></button>
            </Tooltip>
            }
            {(resizableX && nodeLength>1)  &&
            <Tooltip
                title={t('tooltip.shorten')}
                placement="bottom"
            >
                <button
                    onClick={()=>{
                        takeSnapshot('resize component');
                        resizeComponentToLength(nodeLength-1);
                    }}
                ><ShrinkOutlined rotate={45+rotation}/></button>
            </Tooltip>
            }
            { compData.technicalID=="SolderJoint" &&
            <Tooltip
                title={t('tooltip.selectColor')}
                placement="bottom"
            >
                <ColorPicker
                  defaultValue={colorNameToRGBString(compData.handles[0].borderColor)}
                  //styles={{ popupOverlayInner: { width: 480 } }}
                  presets={[
                    {label: <span>Power wires (+V, +5V, +12V etc.)</span>, colors: [red[3], red[5], red[7]]},
                    {label: <span>Ground wire (GND)</span>, colors: [gray[9]]},
                    {label: <span>Data/Clock wire etc.</span>, colors: [green[5], green[7], blue[5], blue[7]]},
                    {label: <span>Other</span>, colors: [cyan[5], magenta[5], purple[5], gold[5]]},
                  ]}
                  panelRender={customColorPanelRender}
                  size={"small"}
                  //disabledAlpha={true}
                  open={openColorPicker}
                  onOpenChange={(open) => {
                    if(open) takeSnapshot('update component color');
                    setOpenColorPicker(open);
                  }}
                  //format={"rgb"}
                  onChange={(_,color)=>{
                    const newHandles=structuredClone(compData.handles);
                    //console.log("Color changed to ", color);
                    //if(newdata) {
                    //  newdata.color=color;
                    //  newdata.color_selected=color;
                    //}
                    //reactFlowInstance.updateEdgeData(id, {data: newdata});
                    newHandles[0].borderColor=color;
                    newHandles[0].changeColorAutomatically=false;
                    reactFlowInstance.updateNodeData(id, {handles: newHandles});
                    setOpenColorPicker(false);
                  }}
                  style={{zoom: 1}}
                />
            </Tooltip>
            }
            { compData.changableColor &&
                <Tooltip
                    title={t('tooltip.selectColor')}
                    placement="bottom"
                >
                    <ColorPicker
                    defaultValue={colorNameToRGBString(compData.color || "black")}
                    size={"small"}
                    //disabledAlpha={true}
                    onOpenChange={(open) => {
                        if(open) takeSnapshot('update component color');
                        setOpenColorPicker(open);
                    }}
                    //format={"rgb"}
                    onChange={(_,color)=>{
                        reactFlowInstance.updateNodeData(id, {color: color});
                    }}
                    style={{zoom: 1}}
                    />
                </Tooltip>
            }
            { compData.changableTextColor &&
                <Tooltip
                    title={t('tooltip.selectColor')}
                    placement="bottom"
                >
                    <ColorPicker
                    defaultValue={colorNameToRGBString(compData.textColor || "black")}
                    size={"small"}
                    //disabledAlpha={true}
                    onOpenChange={(open) => {
                        if(open) takeSnapshot('update text color');
                        setOpenColorPicker(open);
                    }}
                    //format={"rgb"}
                    onChange={(_,color)=>{
                        reactFlowInstance.updateNodeData(id, {textColor: color});
                    }}
                    style={{zoom: 1}}
                    />
                </Tooltip>
            }

            { compData.changableColor && compData.onlyBorder &&
                <Tooltip
                    title={t('tooltip.switchFilled')}
                    placement="bottom"
                >
                    <button
                    onClick={()=>{
                        takeSnapshot('update component fill');
                        reactFlowInstance.updateNodeData(id, {onlyBorder: false});
                        updateNodeInternals(id);
                    }}
                    ><BorderOutlined /></button>
                </Tooltip>
            }
             { compData.changableColor && !compData.onlyBorder &&
                <Tooltip
                    title={t('tooltip.switchFilled')}
                    placement="bottom"
                >
                        <button
                        onClick={()=>{
                            takeSnapshot('update component fill');
                            reactFlowInstance.updateNodeData(id, {onlyBorder: true});
                            updateNodeInternals(id);
                        }}
                    ><XFilled /></button>
                </Tooltip>
            }
            { isInfoNode &&
                <Tooltip
                    title={t('tooltip.toggleBold')}
                    placement="bottom"
                >
                    <button
                        onClick={()=>{
                            takeSnapshot('update text style');
                            reactFlowInstance.updateNodeData(id, {infoTextBold: !infoTextBold});
                        }}
                        style={{
                            backgroundColor: infoTextBold ? "#e6f4ff" : undefined,
                        }}
                    ><BoldOutlined /></button>
                </Tooltip>
            }
            { isInfoNode &&
                <Tooltip
                    title={t('tooltip.textAlign')}
                    placement="bottom"
                >
                    <Segmented
                        className='nopan nodrag'
                        size='small'
                        value={infoTextAlign}
                        options={infoTextAlignOptions}
                        onChange={(value)=>{
                            takeSnapshot('update text alignment');
                            reactFlowInstance.updateNodeData(id, {infoTextAlign: value as TextAlignType});
                        }}
                    />
                </Tooltip>
            }
            { isInfoNode &&
                <Tooltip
                    title={t('tooltip.selectFont')}
                    placement="bottom"
                >
                    <Select
                        className='nopan nodrag'
                        size='small'
                        value={infoTextFontFamily}
                        options={infoTextFontOptions}
                        popupMatchSelectWidth={false}
                        style={{
                            minWidth: 92,
                        }}
                        onChange={(value)=>{
                            takeSnapshot('update text font');
                            reactFlowInstance.updateNodeData(id, {infoTextFontFamily: value});
                        }}
                    />
                </Tooltip>
            }
            { isInfoNode &&
                <Tooltip
                    title={t('tooltip.textSize')}
                    placement="bottom"
                >
                    <InputNumber
                        className='nopan nodrag'
                        size='small'
                        min={8}
                        max={72}
                        value={infoTextSize}
                        addonAfter="px"
                        style={{
                            width: 92,
                        }}
                        onFocus={() => {
                            takeSnapshot('update text size');
                        }}
                        onChange={(value)=>{
                            reactFlowInstance.updateNodeData(id, {infoTextSize: value || 12});
                        }}
                    />
                </Tooltip>
            }
        </NodeToolbar>
        {
            compData.applyNodeResizer && <NodeResizer
                color={isInfoNode ? "#1677ff" : "#ff0071"}
                isVisible={componentEditActive}
                minWidth={isInfoNode ? infoTextRequiredWidth : 5}
                minHeight={isInfoNode ? infoTextRequiredHeight : 5}
                onResizeStart={() => {
                    takeSnapshot('resize component');
                }}
                onResize={(_, { width, height }) => {
                    if(isInfoNode) {
                        updateInfoNodeDataAndSize({}, {width, height});
                        return;
                    }

                    if(!compData.image) return;

                    reactFlowInstance.updateNodeData(id, {
                        image: {
                            ...compData.image,
                            width,
                            height,
                        },
                    });
                    updateNodeInternals(id);
                }}
            />
        }
        <div
        className={(compData.technicalID=="SolderJoint"?"node-type_solderjoint":"")+(compData.putToBackground?" node-type_background":"")+(dragResizeActive?" node-type_resize-active":"")}
        style={{
            border: (selected && !compData.applyNodeResizer)?`${borderWidth}px solid #333333`:(compData.changableColor?`${borderWidth}px solid ${compData.color}`:`${borderWidth}px solid transparent`),
            boxSizing: compData.applyNodeResizer?"border-box":"content-box",
            boxShadow: simulationHighlighted
                ? "0 0 0 3px #1677ff, 0 0 10px #1677ff"
                : checkHighlighted
                    ? "0 0 0 3px #faad14, 0 0 10px #faad14"
                    : undefined,
            height: isInfoNode?(flowNodeHeight!=undefined?"100%":infoNodeHeight):(compData.wireInfoForNodeId?"":(rotationSwapImgWH?(nodeLength*nodeBasicSizeX):nodeBasicSizeY)),
            width: (compData.wireInfoForNodeId)?"":(isInfoNode?(flowNodeWidth!=undefined?"100%":infoNodeWidth):(rotationSwapImgWH?nodeBasicSizeY:(nodeLength*nodeBasicSizeX))),
            //backgroundImage: `url(${backgroundImageURL})`,
            backgroundColor: (compData.changableColor && !compData.onlyBorder)?(compData.color || "black"):"transparent",
            //backgroundRepeat: bgrepeat,
            backgroundClip: 'content-box',
            //backgroundSize: `${rotatedImgWidth}px ${rotatedImgHeight}px`,
            transform: `rotate(${0}deg)`,
            position: "relative",
        }}
        >
            { [...Array(nodeLength).keys()].map((i)=>(
            backgroundImageURL && <img
                key={"bgimg"+i.toString()}
                style={{
                    position: "absolute",
                    transformOrigin: "center",
                    transform: `translate(${(rotationSwapImgWH?(nodeBasicSizeY-nodeBasicSizeX)/2:0+i*nodeBasicSizeX)}px, ${rotationSwapImgWH?(nodeBasicSizeX-nodeBasicSizeY)/2+i*nodeBasicSizeX:0}px) rotate(${rotation}deg)`,
                    width: `${nodeBasicSizeX}px`,
                    height: `${nodeBasicSizeY}px`
                }}
                src = {backgroundImageURL}
            ></img>
            ))
        }
            { dragResizeActive &&
                <Tooltip
                    title={t('tooltip.resizeLength')}
                    open={resizeDragging ? false : undefined}
                    placement="bottom"
                >
                    <div
                        className="nopan nodrag"
                        role="slider"
                        aria-valuemin={1}
                        aria-valuenow={nodeLength}
                        aria-label={t('tooltip.resizeLength')}
                        onPointerDown={startResizeDrag}
                        onPointerMove={(event) => {
                            const dragState=resizeDragRef.current;
                            if(!dragState || dragState.pointerId!=event.pointerId) return;
                            event.stopPropagation();
                            event.preventDefault();
                            dragState.lastClientX=event.clientX;
                            dragState.lastClientY=event.clientY;
                            updateResizeLengthFromPointer(event.clientX, event.clientY);
                            updateResizeAutopan(event.clientX, event.clientY);
                        }}
                        onPointerUp={(event) => {
                            event.stopPropagation();
                            event.preventDefault();
                            finishResizeDrag(event);
                        }}
                        onPointerCancel={(event) => {
                            event.stopPropagation();
                            event.preventDefault();
                            finishResizeDrag(event);
                        }}
                        style={{
                            position: "absolute",
                            left: resizeHandleAnchor.left,
                            top: resizeHandleAnchor.top,
                            width: 16,
                            height: 16,
                            borderRadius: 3,
                            border: "2px solid #1677ff",
                            background: "#ffffff",
                            boxShadow: "0 0 0 2px rgba(22, 119, 255, 0.18), 0 2px 6px rgba(0, 0, 0, 0.22)",
                            color: "#1677ff",
                            cursor: resizeHandleCursor,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 10,
                            fontWeight: 700,
                            lineHeight: 1,
                            transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                            transformOrigin: "center",
                            zIndex: 20,
                            userSelect: "none",
                        }}
                    >
                        &#9654;
                    </div>
                </Tooltip>
            }
            
            {
                compData.selectFields?.filter((sf)=>sf.customImage==true).map((sf)=>{
                    const option=sf.options.filter((option)=>(option.value==sf.selectedValue))[0];
                    if(option.img?.url=="") return <div key={"image_for_selectField_"+sf.technicalID}></div>;
                    let option_x=option.x;
                    let option_y=option.y;
                    let option_transition_x=0;
                    let option_transition_y=0;

                    if(rotation==180) {
                        option_x=nodeLength*nodeBasicSizeX-(option.x || 0);
                        option_y=nodeBasicSizeY-(option.y || 0);
                    }
                    if(rotation==90) {
                        option_x=nodeBasicSizeY-(option.y || 0);
                        option_y=(option.x || 0);
                    }
                    if(rotation==270) {
                        option_x=(option.y || 0);
                        option_y=nodeLength*nodeBasicSizeX-(option.x || 0);
                    }

                    return <img
                        key={"image_for_selectField_"+sf.technicalID}
                        style={{
                            position: "absolute",
                            top: `${option_y}px`,
                            left: `${option_x}px`,
                            transformOrigin: "0 0",
                            transform: `translate(${option_transition_x}%,${option_transition_y}%) rotate(${rotation}deg)`
                        }}
                        src={option.img?.url}
                        width={option.img?.width}
                        height={option.img?.height}
                    >
                    </img>}
                )
            }
            { compData.wireInfoForNodeId && <div
            
                style={{
                    fontSize: "10px",
                    color: compData.wireInfo_color || "black",
                    textShadow: (compData.correspondingWireSelected?"0px 0px 2px #333333":""),
                }}>{t('compData.WireInfoNode.name')}:<br/>
                L = {compData.wireInfo_length || "xx"} m, 
                &#8855; = {compData.wireInfo_crosssection || "xx"}{compData.wireInfo_crosssectionUnit}<br/>
                </div>
            }
            { isInfoNode && <div
                    className='info-node-text-wrap'
                    style={{
                        padding: "4px",
                        backgroundColor: componentEditActive?"rgba(22, 119, 255, 0.06)":"transparent",
                        border: componentEditActive?"1px solid rgba(22, 119, 255, 0.45)":"1px solid transparent",
                        borderRadius: 4,
                        boxSizing: "border-box",
                        height: "100%",
                        width: "100%",
                        transform: `rotate(${rotation}deg)`,
                    }}
                >
                <TextArea
                    placeholder="info text"
                    autoSize={false}
                    size="small"
                    value={infoTextValue}
                    className='nopan nodrag info-node-textarea'
                    variant='borderless'
                    onFocus={() => {
                        infoTextFocusedRef.current=true;
                        takeSnapshot('update info text');
                    }}
                    onBlur={(e) => {
                        infoTextFocusedRef.current=false;
                        flushInfoTextUpdate(e.currentTarget.value);
                    }}
                    onChange={(e)=>{
                        const nextText=e.target.value;
                        const nextSize=getInfoTextSizeForValue(nextText);
                        const nextWidth=Math.max(infoNodeCurrentWidth, nextSize.width);
                        const nextHeight=Math.max(infoNodeCurrentHeight, nextSize.height);
                        setInfoTextDraft(nextText);

                        if(nextWidth>infoNodeCurrentWidth || nextHeight>infoNodeCurrentHeight) {
                            updateInfoNodeDataAndSize({InfoText: nextText}, {
                                width: nextWidth,
                                height: nextHeight,
                            });
                            return;
                        }

                        scheduleInfoTextUpdate(nextText);
                    }}
                    style={{
                        backgroundColor: "transparent",
                        color: compData.changableTextColor?(compData.textColor || "black"):"black",
                        fontSize: infoTextSize,
                        fontFamily: infoTextFontFamily,
                        fontWeight: infoTextBold ? 700 : 400,
                        textAlign: infoTextAlign,
                        boxSizing: "border-box",
                        height: "100%",
                        lineHeight: 1.25,
                        minHeight: "100%",
                        overflow: "hidden",
                        padding: 2,
                        resize: "none",
                        width: "100%",
                    }}
                />
                </div>
            }
            {((!selected || dragging) && resizableX) && drawPhysLengths.map(({length}, index)=>(
                <div
                    key={`node${id}_lengthsdiv_${index}`}
                    style={{
                            position: "absolute",
                            fontSize: "10px",
                            border: "0px solid red",
                            color: "black",
                            top: top_PhysLengths[index],
                            left: left_PhysLengths[index],
                            width: rotationSwapImgWH?"12px":widthPhysLengths[index],
                            height: rotationSwapImgWH?widthPhysLengths[index]:"12px",
                            transform: `translate(${translate_x_PhysLengths}%, ${translate_y_PhysLengths}%) rotate(${0}deg)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                >
                    <div 
                        key={`node${id}_lengthtext_${index}`}
                        style={{
                            zoom: Math.min(1/zoomValue,2),
                            transformOrigin: "center",
                            transform: `rotate(${rotation_PhysLengthsText}deg)`,
                        }}
                    >
                        &larr;&nbsp;{String(length || "xx")}&nbsp;m&nbsp;&rarr;
                    </div>
                </div>
            ))}
            {
                !componentEditActive && compData.showName && 
                <div
                key={`node${id}_showname`}
                style={{
                        position: "absolute",
                        fontSize: "9px",
                        border: "0px solid red",
                        color: "black",
                        top: `${showName_top}px`,
                        left: `${showName_left}px`,
                        transformOrigin: "left top",
                        transform: `rotate(${showName_rotation}deg) translate(${showName_translate_x}%,${showName_translate_y}%)`,
                        textWrap: "nowrap",
                        //zoom: Math.min(1/zoomValue,2),
                    }}
                >
                        {t(compData.name)}
                </div>
            }
            {(componentEditActive && resizableX) && drawPhysLengths.map(({length}, index)=>(
                <div
                    className='nopan nodrag'
                    key={`node${id}_lengthsdivselected_${index}`}
                    style={{
                            position: "absolute",
                            fontSize: "10px",
                            border: "0px solid red",
                            color: "black",
                            top: top_PhysLengths[index],
                            left: left_PhysLengths[index],
                            width: rotationSwapImgWH?"12px":widthPhysLengths[index],
                            height: rotationSwapImgWH?widthPhysLengths[index]:"12px",
                            transform: `translate(${translate_x_PhysLengths}%, ${translate_y_PhysLengths}%) rotate(${0}deg)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                >
                    <div
                        key={`node${id}_lengthtextselected_${index}`}
                        style={{
                            zoom: Math.min(1/zoomValue,2),
                            transformOrigin: "center",
                            transform: `rotate(${rotation_PhysLengthsText}deg)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                    <div>&larr;&nbsp;</div>
                    <InputNumber
                        size={"small"}
                        style={{
                            //width: "8em",
                            //height: "8em",
                            //zoom: Math.min(1/zoomValue,1.5),
                            //transform: ` rotate(${0}deg)`
                        }}
                        suffix="m"
                        defaultValue={(length || 0) as number}
                        min={0} max={100}
                        onFocus={() => {
                            takeSnapshot('update physical length');
                        }}
                        onChange={(value)=>{
                            const physLengths=(compData.physLengths || [{startIndex: 0, length:undefined}]);
                            physLengths[index].length=(value || 0);
                            reactFlowInstance.updateNodeData(id, {physLengths: physLengths});
                        }}
                    />
                    <div>&nbsp;&rarr;</div>
                    </div>
                </div>
            ))}

            {
                (combinedHandlesArrayVisible).map(({hid, type, x, y, xalign, yalign, width, height, borderType, borderColor, borderLineWidth, borderRadius, position, name, repeated, repeatAtFirst}) => {
                    const rotated_width=(rotationSwapImgWH)?height:width;
                    const rotated_height=(rotationSwapImgWH)?width:height;
                    const editorSelected=compData.editorSelectedHandleId===hid;
                    const simulationHandleHighlighted=simulationHighlightedHandleIds.has(hid);

                    //const posArray=[Position.Left, Position.Top, Position.Right, Position.Bottom, Position.Left, Position.Top, Position.Right, Position.Bottom];
                    //const posIndex= (position==Position.Left)?0:((position==Position.Top)?1:((position==Position.Right)?2:(3)));
                    //const rotated_position=posArray[posIndex+rotation/90];

                    const original_left=(xalign=="start")?x:nodeLength*nodeBasicSizeX-x;
                    const original_top=(yalign=="start")?y:(compData.image?.height || 0)-y;
                    const rotated_left=(rotation==0)?original_left:((rotation==90)?nodeBasicSizeY-original_top:((rotation==180)?nodeLength*nodeBasicSizeX-original_left:(original_top)));

                    const rotated_top=(rotation==0)?original_top:((rotation==90)?original_left:((rotation==180)?nodeBasicSizeY-original_top:(nodeLength*nodeBasicSizeX-original_left)));

                    return (repeated==undefined || repeated=="no" || repeatAtFirst=="yes") && <Handle
                        className={`react-flow__handle${editorSelected ? " react-flow__handle--editor-selected" : ""}`}
                        id={hid}
                        key={`node${id}_handle_${hid}`}
                        type={type}
                        position={position}
                        onClick={(event) => {
                            if(compData.editorOnHandleSelect) {
                                event.stopPropagation();
                                compData.editorOnHandleSelect(hid);
                            }
                        }}
                        onMouseEnter={(event) => {
                            if(name) showPinTooltip(event, name);
                        }}
                        onMouseLeave={hidePinTooltip}
                        style={{
                            //background: (compData.technicalID=="SolderJoint")?borderColor:(combinedHandlesArrayIsConnected[index]?borderColor:"transparent"),
                            background: (compData.technicalID=="SolderJoint")?borderColor:"transparent",
                            boxSizing: "border-box",
                            borderColor: borderColor,
                            borderStyle: borderType,
                            borderRadius: borderRadius,
                            borderWidth: borderLineWidth,
                            boxShadow: simulationHandleHighlighted
                                ? "0 0 0 3px #1677ff, 0 0 8px 5px rgba(22, 119, 255, 0.55)"
                                : editorSelected
                                    ? "0 0 0 3px #faad14, 0 0 8px 5px rgba(250, 173, 20, 0.55)"
                                    : undefined,
                            position: "absolute",
                            top: rotated_top,
                            left: rotated_left,
                            width: rotated_width,
                            height: rotated_height,
                            margin: "auto"
                        }}
                    />
                })
            }
            
            {inputFieldsExist &&
                <div
                    style={{
                        position: "absolute",
                        fontSize: "10px",
                        borderColor: compData.inputFieldsBox?.borderColor,
                        borderStyle: compData.inputFieldsBox?.borderType,
                        borderWidth: compData.inputFieldsBox?.borderLineWidth,
                        borderRadius: compData.inputFieldsBox?.borderRadius,
                        backgroundColor: selected?(compData.inputFieldsBox?.backgroundColorSelected || compData.inputFieldsBox?.backgroundColor):compData.inputFieldsBox?.backgroundColor,
                        color: "black",
                        top: `${inputFieldsBox_y}px`,
                        left: `${inputFieldsBox_x}px`,
                        transform: `translate(-50%, -50%) rotate(${inputFieldsBox_rotation}deg)`,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "left",
                        justifyContent: "left",
                    }}
                >
                {
                    !componentEditActive && compData.inputFields?.filter(
                        (inputFieldData)=>(inputFieldData.type=="number_input")
                    ).map((inputFieldData, index)=>(
                        <div 
                            key={`node${id}_inputfieldtext_${index}`}
                            style={{
                                whiteSpace: "nowrap",
                                color: inputFieldData.color,
                            }}
                            >
                            {inputFieldData.name}&nbsp;=&nbsp;{inputFieldData.value}&nbsp;{inputFieldData.unit}
                        </div>
                    ))
                }
                {
                    componentEditActive && compData.inputFields?.filter(
                        (inputFieldData)=>(inputFieldData.type=="number_input")
                    ).map((inputFieldData, index)=>(
                        <div 
                            key={`node${id}_inputfieldtext_${index}`}
                            className='nopan nodrag'
                            >
                            <InputNumber
                                size={"small"}
                                style={{
                                    zoom:0.8,
                                    width: `${inputFieldData.fieldWidth}px`,
                                }}
                                suffix={inputFieldData.unit}
                                defaultValue={inputFieldData.value}
                                precision={1}
                                min={inputFieldData.min}
                                max={inputFieldData.max}
                                step={0.1}
                                onFocus={() => {
                                    takeSnapshot('update component input');
                                }}
                                onChange={(value)=>{
                                    const inputFields=structuredClone(compData.inputFields);
                                    if(inputFields!=undefined) {
                                        const index=inputFields?.findIndex(e=>(e.technicalID==inputFieldData.technicalID));
                                        inputFields[index].value=value || 0;
                                        reactFlowInstance.updateNodeData(id, {inputFields: inputFields});
                                    }
                                }}
                            />
                        </div>
                    ))
                }
                </div>
            }
            {selectFieldsExist &&
                <div
                    style={{
                        position: "absolute",
                        fontSize: "10px",
                        borderColor: compData.inputFieldsBox?.borderColor,
                        borderStyle: compData.inputFieldsBox?.borderType,
                        borderWidth: compData.inputFieldsBox?.borderLineWidth,
                        borderRadius: compData.inputFieldsBox?.borderRadius,
                        backgroundColor: selected?(compData.inputFieldsBox?.backgroundColorSelected || compData.inputFieldsBox?.backgroundColor):compData.inputFieldsBox?.backgroundColor,
                        color: "black",
                        top: `${inputFieldsBox_y}px`,
                        left: `${inputFieldsBox_x}px`,
                        transform: `translate(-50%, -50%) rotate(${inputFieldsBox_rotation}deg)`,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "left",
                        justifyContent: "left",
                    }}
                >
                {
                    !componentEditActive && compData.selectFields?.filter((selectFieldData, _)=>selectFieldData.hide!=true).map((selectFieldData, index)=>(
                        <div 
                            key={`node${id}_selectfieldtext_${index}`}
                            style={{
                                whiteSpace: "nowrap",
                                color: selectFieldData.color,
                            }}
                            >
                            {selectFieldData.displayName && <span>{selectFieldData.name}&nbsp;=&nbsp;</span>}{selectFieldData.options.filter((option)=>option.value==selectFieldData.selectedValue)[0].label}
                        </div>
                    ))
                }
                {
                    componentEditActive && compData.selectFields?.map((selectFieldData, index)=>(
                        <div 
                            key={`node${id}_selectfieldtext_${index}`}
                            className='nopan nodrag'
                            >
                            { selectFieldData.showNameIfSelected && 
                            <span
                                style={{color: selectFieldData.color}}
                            >{selectFieldData.name}</span>
                            }
                            <Select
                                defaultValue={String(selectFieldData.selectedValue)}
                                options={selectFieldData.options.map((option)=>({value: String(option.value), label:option.label}))}
                                size='small'
                                style={{
                                    zoom: Math.min(1/zoomValue,1.5),
                                    width: `${selectFieldData.fieldWidth}px`,
                                }}
                                onChange={(value, _)=> {
                                    takeSnapshot('update component option');
                                    const selectFields=structuredClone(compData.selectFields);
                                    if(selectFields!=undefined) {
                                        const index=selectFields?.findIndex(e=>(e.technicalID==selectFieldData.technicalID));
                                        selectFields[index].selectedValue=parseFloat(value) || 0;
                                        reactFlowInstance.updateNodeData(id, {selectFields: selectFields});
                                        // delete edges that will be invisible if handles will be hidden
                                        const handlesBeHidden=combinedHandlesArray.filter((handleData) => {
                                            const conditions = handleData.hideConditions?.filter((cond)=>cond.selectHID==selectFields[index].technicalID);
                                            let retval=false;
                                            conditions?.forEach(element => {
                                                if(element.values.filter((value)=>value==selectFields[index].selectedValue).length>0) retval=true;
                                            });
                                            return retval;
                                        });
                                        //console.log(handlesBeHidden);
                                        handlesBeHidden.map((handle)=>{
                                            reactFlowInstance.getNodeConnections({nodeId: id, type: "source"}).filter((h)=>(h.sourceHandle==handle.hid)).map((edge)=>{  
                                                reactFlowInstance.deleteElements({ edges: [{id: edge.edgeId}] });
                                            })
                                            reactFlowInstance.getNodeConnections({nodeId: id, type: "target"}).filter((h)=>(h.targetHandle==handle.hid)).map((edge)=>{  
                                                reactFlowInstance.deleteElements({ edges: [{id: edge.edgeId}] });
                                            })
                                        });

                                        // update required!! reason: handles that hide if option is not selected
                                        updateNodeInternals(id);
                                    }
                                }}
                            >
                            </Select>
                        </div>
                    ))
                }
                </div>
            }
        </div>
      </>
  )}
