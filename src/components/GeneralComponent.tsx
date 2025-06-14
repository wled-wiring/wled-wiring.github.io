import {useState, useCallback} from 'react';

import {    RotateLeftOutlined, RotateRightOutlined,
            ArrowsAltOutlined, ShrinkOutlined,
            DeleteOutlined, CopyOutlined, BorderOutlined, XFilled, CaretUpOutlined, CaretDownOutlined} from '@ant-design/icons';

import Icon from '@ant-design/icons';

import { Handle, NodeProps, NodeToolbar, Position,
    useReactFlow, useUpdateNodeInternals, NodeResizer, type Edge,
    useOnSelectionChange, OnSelectionChangeParams } from '@xyflow/react';

import { useTranslation } from "react-i18next";

import { ComponentDataType, edgePoint, type GeneralComponent, ImageDataType } from '../types';
import { colorNameToRGBString, stripCheckAndDivideIfMiddleConnection} from '../utils/utils_functions';
import { useZustandStore, findPathBetweenTwoHandles} from '../utils/pathfinder_functions.ts';

import { InputNumber, ColorPicker, ColorPickerProps, Input, Popover, Tooltip, Select, message} from 'antd';
import { gray, red, green, blue, cyan, purple, magenta, gold } from '@ant-design/colors';

import ConnectionIcon from '../icons/connection.svg?react';
import StartConnectionIcon from '../icons/startconnection.svg?react';

const { TextArea } = Input;

const customColorPanelRender: ColorPickerProps['panelRender'] = (_,{ components: { Presets } }) => (
    <Presets />
);

export function GeneralComponent({id, data, selected}:NodeProps<GeneralComponent>) {
    const {t} = useTranslation(['main']);
    const [messageApi, messageContextHolder] = message.useMessage();

    const [openColorPicker, setOpenColorPicker] = useState(false);

    const updateNodeInternals = useUpdateNodeInternals();

    const compData = data;

    const reactFlowInstance = useReactFlow();
    //const { x, y, zoom } = useViewport();
    //const nodeRect = reactFlowInstance.getNodesBounds([id]);

    const rotatable=compData.rotatable;
    const rotation=rotatable?compData.rotation:0;

    const nodeLength=(compData?.nodeLength || 1);


    const nodeBasicSizeX=compData.image?.width || 0;
    const nodeBasicSizeY=compData.image?.height || 0;

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

    const [multipleSelect, setMultipleSelect]=useState(false);

    // the passed handler has to be memoized, otherwise the hook will not work correctly
    const onChange = useCallback(({ nodes, edges } : OnSelectionChangeParams) => {
    if(nodes.length + edges.length >1) {
        setMultipleSelect(true);
    } else {
        setMultipleSelect(false);
    }
    }, []);
    
    useOnSelectionChange({
    onChange,
    });

    const borderWidth = compData.borderWidth || 2;
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
    const inputFieldsBox_rotation = (!selected || multipleSelect)?inputFieldsBox_rotation_notSelected:inputFieldsBox_rotation_selected;

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
    const connectionOptions=combinedHandlesArrayVisible.map( (handle) => ({
        value: handle.hid,
        label: handle.name + (handle.repeated?(" ("+handle.repeatIndex+")"):"")
    }));



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

                if(startNodeID==id && (startNodeHid  as string)==(value as String)) {
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
                        physCrosssection: 0.75,
                        physCrosssectionUnit: "mm2",
                        physType: "single",
                    },
                    type: "editable-wire-type",
                    source: startNodeID,
                    target: id,
                    sourceHandle: startNodeHid as string,
                    targetHandle: value as string,
                } as Edge;
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

    return (
      <>
        {messageContextHolder}
        <NodeToolbar
            isVisible={undefined}
            position={Position.Top}
            align={"center"}
        >
            {rotatable &&
                <Tooltip
                    title={t('tooltip.rotateLeft')}
                    placement="bottom"
                >
                    <button
                        onClick={()=>{
                            reactFlowInstance.updateNodeData(id, {rotation: ( ((rotation) +90+180) % 360)});
                            updateNodeInternals(id);
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
                            reactFlowInstance.updateNodeData(id, {rotation: ( ((rotation) +90) % 360)});
                            updateNodeInternals(id);
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
            { compData.technicalID=="InfoNode" &&
                <Tooltip
                title={t('tooltip.enlarge')}
                placement="bottom"
            >
                <button
                    onClick={()=>{
                        reactFlowInstance.updateNodeData(id, {nodeLength: (compData.nodeLength || 1)+1});
                    }}
                ><ArrowsAltOutlined rotate={45+rotation}/></button>
            </Tooltip>
            }
            {(compData.technicalID=="InfoNode" && nodeLength>1)  &&
            <Tooltip
                title={t('tooltip.shorten')}
                placement="bottom"
            >
                <button
                    onClick={()=>{
                        reactFlowInstance.updateNodeData(id, {nodeLength: (compData.nodeLength || 1)-1});
                    }}
                ><ShrinkOutlined rotate={45+rotation}/></button>
            </Tooltip>
            }

            {resizableX && 
            <Tooltip
                title={t('tooltip.enlarge')}
                placement="bottom"
            >
                <button
                    onClick={()=>{
                        const newnodeLength=nodeLength+1;
                        let newrepeatedHandleArray=structuredClone(compData.repeatedHandleArray);
                        compData.handles.map((handleData)=> {
                            if(handleData.repeated=="yes") {
                                const newHandle = structuredClone(handleData);
                                newHandle.repeated="no";
                                newHandle.xalign="start";
                                newHandle.repeatIndex = (newnodeLength || 2)-1;
                                newHandle.hid=newHandle.hid+"_"+String(newHandle.repeatIndex);
                                newHandle.x=newHandle.x+((newnodeLength || 2)-1)*nodeBasicSizeX;
                                if (newrepeatedHandleArray == undefined) {
                                    newrepeatedHandleArray = [];
                                }
                                //console.log(newHandle);
                                newrepeatedHandleArray.push(newHandle);
                            }
                        });
                        reactFlowInstance.updateNodeData(id, {nodeLength: newnodeLength, repeatedHandleArray: newrepeatedHandleArray});
                        updateNodeInternals(id);
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
                        const newrepeatedHandleArray=structuredClone(compData.repeatedHandleArray);
                        const newnodeLength=(nodeLength==1)?1:nodeLength-1;
                        //console.log("repeatedHandleArray=", newrepeatedHandleArray);
                        if (newrepeatedHandleArray != undefined) {
                            while (newrepeatedHandleArray.findIndex(
                                e => (e.repeatIndex as number >=newnodeLength)) >= 0 
                            ) {
                                const index = newrepeatedHandleArray.findIndex(e => (e.repeatIndex as number >=newnodeLength));
                                const thisHandleID=newrepeatedHandleArray[index].hid;
                                
                                //find and delete edges connected to this handle
                                const edges = reactFlowInstance.getEdges();
                                const edgesToDelete= edges.filter((edge)=>(
                                    (edge.source==id && edge.sourceHandle==thisHandleID) ||
                                    (edge.target==id && edge.targetHandle==thisHandleID)
                                ));

                                edgesToDelete.map((edge)=>{
                                    reactFlowInstance.deleteElements({ edges: [{id: edge.id}] } );
                                });
                                // remove handle
                                newrepeatedHandleArray.splice(index,1);
                            }
                        }
                        reactFlowInstance.updateNodeData(id, {nodeLength: newnodeLength, repeatedHandleArray: newrepeatedHandleArray});
                        updateNodeInternals(id);
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
                  onOpenChange={(open) => setOpenColorPicker(open)}
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
                    onOpenChange={(open) => setOpenColorPicker(open)}
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
                    onOpenChange={(open) => setOpenColorPicker(open)}
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
                            reactFlowInstance.updateNodeData(id, {onlyBorder: true});
                            updateNodeInternals(id);
                        }}
                    ><XFilled /></button>
                </Tooltip>
            }
            { compData.technicalID=="InfoNode" &&
                <Tooltip
                title={t('tooltip.increaseTextSize')}
                placement="bottom"
            >
                <button
                    onClick={()=>{
                        reactFlowInstance.updateNodeData(id, {infoTextSize: (compData.infoTextSize || 12)+2});
                    }}
                ><CaretUpOutlined /></button>
            </Tooltip>
            }
            { compData.technicalID=="InfoNode" && compData.infoTextSize && compData.infoTextSize>12 &&
                <Tooltip
                title={t('tooltip.decreaseTextSize')}
                placement="bottom"
            >
                <button
                    onClick={()=>{
                        reactFlowInstance.updateNodeData(id, {infoTextSize: (compData.infoTextSize || 12)-2});
                    }}
                ><CaretDownOutlined /></button>
            </Tooltip>
            }
        </NodeToolbar>
        {
            compData.applyNodeResizer && <NodeResizer
                color="#ff0071"
                isVisible={selected}
                minWidth={5}
                minHeight={5}
                onResize={(_, { width, height }) => {
                    const img=structuredClone(compData.image) as ImageDataType;
                    img.height=height;
                    img.width=width;
                    reactFlowInstance.updateNodeData(id, {image: img});
                    updateNodeInternals(id);
                }}
            />
        }
        <div
        className={(compData.technicalID=="SolderJoint"?"node-type_solderjoint":"")+(compData.putToBackground?" node-type_background":"")}
        style={{
            border: (selected && !compData.applyNodeResizer)?`${borderWidth}px solid #333333`:(compData.changableColor?`${borderWidth}px solid ${compData.color}`:`${borderWidth}px solid transparent`),
            boxSizing: "content-box",
            height: (compData.wireInfoForNodeId || (compData.technicalID=="InfoNode"))?"":(rotationSwapImgWH?(nodeLength*nodeBasicSizeX):nodeBasicSizeY),
            width: (compData.wireInfoForNodeId)?"":(rotationSwapImgWH?nodeBasicSizeY:(nodeLength*nodeBasicSizeX)),
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
            { compData.technicalID=="InfoNode" && <div 
                    style={{
                        padding: "5px",
                        backgroundColor: selected?"gray":"transparent",
                        transform: `rotate(${rotation}deg)`,
                    }}
                >
                <TextArea
                    placeholder="info text"
                    autoSize
                    size="small"
                    defaultValue={compData.InfoText}
                    className='nopan nodrag'
                    variant='borderless'
                    onChange={(e)=>{
                        reactFlowInstance.updateNodeData(id, {InfoText: e.target.value});
                    }}
                    style={{
                        backgroundColor: selected?"white":"transparent",
                        color: compData.changableTextColor?(compData.textColor || "black"):"black",
                        fontSize: compData.infoTextSize,
                    }}
                />
                </div>
            }
            {(!selected && resizableX) && drawPhysLengths.map(({length}, index)=>(
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
                (!selected || multipleSelect) && compData.showName && 
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
            {(selected && !multipleSelect && resizableX) && drawPhysLengths.map(({length}, index)=>(
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

                    //const posArray=[Position.Left, Position.Top, Position.Right, Position.Bottom, Position.Left, Position.Top, Position.Right, Position.Bottom];
                    //const posIndex= (position==Position.Left)?0:((position==Position.Top)?1:((position==Position.Right)?2:(3)));
                    //const rotated_position=posArray[posIndex+rotation/90];

                    const original_left=(xalign=="start")?x:nodeLength*nodeBasicSizeX-x;
                    const original_top=(yalign=="start")?y:(compData.image?.height || 0)-y;
                    const rotated_left=(rotation==0)?original_left:((rotation==90)?nodeBasicSizeY-original_top:((rotation==180)?nodeLength*nodeBasicSizeX-original_left:(original_top)));

                    const rotated_top=(rotation==0)?original_top:((rotation==90)?original_left:((rotation==180)?nodeBasicSizeY-original_top:(nodeLength*nodeBasicSizeX-original_left)));

                    return (repeated==undefined || repeated=="no" || repeatAtFirst=="yes") && <Handle
                        className={"react-flow__handle"}
                        id={hid}
                        key={`node${id}_handle_${hid}`}
                        type={type}
                        position={position}
                        style={{
                            //background: (compData.technicalID=="SolderJoint")?borderColor:(combinedHandlesArrayIsConnected[index]?borderColor:"transparent"),
                            background: (compData.technicalID=="SolderJoint")?borderColor:"transparent",
                            boxSizing: "border-box",
                            borderColor: borderColor,
                            borderStyle: borderType,
                            borderRadius: borderRadius,
                            borderWidth: borderLineWidth,
                            position: "absolute",
                            top: rotated_top,
                            left: rotated_left,
                            width: rotated_width,
                            height: rotated_height,
                            margin: "auto"
                        }}
                    >
                        {name && <span className="tooltiptext"
                            key={`node${id}_handle_${hid}_tooltip`}
                            style = {{
                                transform: `translateY(-50%) translateY(-0.6em) translateY(-8px)`,
                            }}
                        >
                            {name}
                        </span>}
                    </Handle>
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
                    (!selected || multipleSelect) && compData.inputFields?.filter(
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
                    selected && !multipleSelect && compData.inputFields?.filter(
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
                    (!selected || multipleSelect) && compData.selectFields?.filter((selectFieldData, _)=>selectFieldData.hide!=true).map((selectFieldData, index)=>(
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
                    selected && !multipleSelect && compData.selectFields?.map((selectFieldData, index)=>(
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