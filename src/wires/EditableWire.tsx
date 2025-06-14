import {useState, useEffect, useCallback} from 'react';

import {
  EdgeProps,
  getStraightPath,
  BaseEdge,
  EdgeLabelRenderer,
  useReactFlow,
  useInternalNode,
  useOnSelectionChange,
  OnSelectionChangeParams,
} from "@xyflow/react";

import { useTranslation } from "react-i18next";

import {InputNumber, Flex, Tooltip, Popover, ColorPicker, ColorPickerProps, Radio, Select} from 'antd';

import {DeleteOutlined, ColumnWidthOutlined, InfoCircleOutlined} from '@ant-design/icons'
import Icon from '@ant-design/icons';

import LineWidthSvg from '../icons/linewidth.svg?react';
import CrosssectionSvg from '../icons/crosssection.svg?react';

import { gray, red, green, blue, cyan, purple, magenta, gold } from '@ant-design/colors';

import "./EditableWire.css";
import { WireInfoNode } from "../components/ComponentTypes/WireInfoNode.ts";

import {HandleDataType, EdgeDataType, edgePoint, XYPoint, intersectionPoint, segmentData, type EditableWire} from "../types.ts";
import {colorNameToRGBString, postypeToAdjustedXY} from "../utils/utils_functions.ts";

const ROUNDN=1;

export default function EditableWire ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  selected,
  source,
  target,
  sourceHandleId,
  targetHandleId,
  data
}: EdgeProps<EditableWire>) {

  const {t} = useTranslation(['main']);
  const edgeData = data as EdgeDataType;

  const edgePoints = edgeData.edgePoints ?? [];

  // if edge is not selected, check if some edge points can be removed since they are on a straight line
  if(!selected && edgeData.startXY && edgeData.endXY) {
      // check if a straigh line consist af many steps, delete inbetween points
      // in y direction (the same x coordinate one three edge points i, i+1, i+2)
      let i=-1;
      while(i<edgePoints.length-1) {
        let deleted=true;
        while(deleted && i<edgePoints.length-1) {
          const x0=(i==-1)?(edgeData.startXY?.x || 0):edgePoints[i].x;
          const x1=edgePoints[i+1].x;
          const x2=(i==edgePoints.length-2)?(edgeData.endXY?.x || 0):edgePoints[i+2].x;
          if(x0==x1 && x1==x2){
            edgePoints.splice(i+1,1);
          } else {
            deleted=false;
            i=i+1;
          }
        }
      }
      // in x direction (the same y coordinate one three edge points i, i+1, i+2)
      i=-1;
      while(i<edgePoints.length-1) {
        let deleted=true;
        while(deleted && i<edgePoints.length-1) {
          const y0=(i==-1)?(edgeData.startXY?.y || 0):edgePoints[i].y;
          const y1=edgePoints[i+1].y;
          const y2=(i==edgePoints.length-2)?(edgeData.endXY?.y || 0):edgePoints[i+2].y;
          if(y0==y1 && y1==y2){
            edgePoints.splice(i+1,1);
          } else {
            deleted=false;
            i=i+1;
          }
        }
      }
  }

  useEffect


  const edgeSegmentsCount = edgePoints.length + 1;
  const edgeSegmentsArray = [] as Array<segmentData>;

  const [notMooved, setNotMooved] = useState(true);

  const reactFlowInstance=useReactFlow();

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

  const sourceNode = useInternalNode(source);
  const sourceHandle=sourceNode?.internals.handleBounds?.source?.filter((handle)=>(handle.id==sourceHandleId))[0];
  //console.log("Computed from data", [(sourceHandle?.x || 0)+(sourceHandle?.width || 0)/2+(sourceNode?.position.x || 0), (sourceHandle?.y || 0)+(sourceNode?.position.y || 0)]);
  //console.log(sourceHandle);
  //console.log("Edge original sourceX, sourceY = ", [sourceX, sourceY])

  let sourceHandleDef = (sourceNode?.data?.handles!=undefined) ? (sourceNode?.data?.handles as Array<HandleDataType>).filter((handleDef)=>handleDef.hid ==sourceHandleId)[0] : undefined;
  // if undefined, then the handle probably in the repeatedHandleArray
  if(sourceHandleDef==undefined) {
    sourceHandleDef = (sourceNode?.data?.handles!=undefined) ? (sourceNode?.data?.repeatedHandleArray as Array<HandleDataType>).filter((handleDef)=>handleDef.hid ==sourceHandleId)[0] : undefined;
  }
  
  let sourceXadjusted=Math.round(sourceX/ROUNDN)*ROUNDN;
  let sourceYadjusted=Math.round(sourceY/ROUNDN)*ROUNDN;
  const sourceNodeRotation = (sourceNode?.data.rotation as number);

  if(sourceHandleDef!=undefined) {
    [sourceXadjusted, sourceYadjusted] = postypeToAdjustedXY(
      sourceHandleDef.postype,
      sourceX,
      sourceY,
      sourceHandle?.width || 0,
      sourceHandle?.height || 0,
      sourceNodeRotation
    );
  }

  const targetNode = useInternalNode(target);
  const targetHandle=targetNode?.internals.handleBounds?.source?.filter((handle)=>(handle.id==targetHandleId))[0];
  let targetHandleDef= (targetNode?.data?.handles!=undefined) ? (targetNode?.data?.handles as Array<HandleDataType>).filter((handleDef)=>handleDef.hid ==targetHandleId)[0] : undefined;
 
  if(targetHandleDef==undefined) {
    // if undefined, it is probably in repetaed
    targetHandleDef= (targetNode?.data?.handles!=undefined) ? (targetNode?.data?.repeatedHandleArray as Array<HandleDataType>).filter((handleDef)=>handleDef.hid ==targetHandleId)[0] : undefined;
  }
  
  let targetXadjusted=Math.round(targetX/ROUNDN)*ROUNDN;
  let targetYadjusted=Math.round(targetY/ROUNDN)*ROUNDN;
  const targetNodeRotation = (targetNode?.data.rotation as number);
  
  if(targetHandleDef!=undefined) {
    [targetXadjusted, targetYadjusted] = postypeToAdjustedXY(
      targetHandleDef.postype,
      targetX,
      targetY,
      targetHandle?.width || 0,
      targetHandle?.height || 0,
      targetNodeRotation,
    );
  }


 
  // calculate the origin and destination of all the segments
  for (let i = 0; i < edgeSegmentsCount; i++) {
    let segmentSourceX, segmentSourceY, segmentTargetX, segmentTargetY;

    if (i === 0) {
      segmentSourceX = sourceXadjusted; // sourceX;
      segmentSourceY = sourceYadjusted;
    } else {
      const edgePoint = edgePoints[i - 1];
      segmentSourceX = edgePoint.x;
      segmentSourceY = edgePoint.y;
    }

    if (i === edgeSegmentsCount - 1) {
      segmentTargetX = targetXadjusted;
      segmentTargetY = targetYadjusted;
    } else {
      const edgePoint = edgePoints[i];
      segmentTargetX = edgePoint.x;
      segmentTargetY = edgePoint.y;
    }

    const [edgePath, labelX, labelY] = getStraightPath({
      sourceX: segmentSourceX,
      sourceY: segmentSourceY,
      targetX: segmentTargetX,
      targetY: segmentTargetY
    });

    //console.log("x1="+String(segmentSourceX) + ", y1=" + String(segmentSourceY) + "x2="+String(segmentTargetX) + ", y2=" + String(segmentTargetY) + " PATH="+ edgePath);
    
    const active=-1;
    edgeSegmentsArray.push({ edgePath, labelX, labelY, active, segmentSourceX, segmentSourceY, segmentTargetX, segmentTargetY });
  }

  // store start and end in data to acces them easily later
  if(edgeData!=null) {
    Object.assign(edgeData, {
      startXY: {
        x: sourceXadjusted,
        y: sourceYadjusted
      },
      endXY: {x: targetXadjusted, y: targetYadjusted}
    });
  }


  
  // find intersections
  const intersections = [] as Array<intersectionPoint>;
  const edges = reactFlowInstance.getEdges();
  for (let i = 0; i < edges.length; i++) {
    if(edges[i].id !==id && (edges[i].data != undefined) && (edges[i].data?.startXY != undefined) && (edges[i].data?.endXY != undefined) ) {
      //check all segemnts of another edge with segments of this edge
      //console.log(edges[i].data);
      const edgePoints2 = edges[i].data?.edgePoints as Array<edgePoint> ?? [];
      const edgeSegmentsCount2 = edgePoints2.length + 1;
      const edgeSegmentsArray2 = [];
      for (let ii = 0; ii < edgeSegmentsCount2; ii++) {
        let segmentSourceX, segmentSourceY, segmentTargetX, segmentTargetY;
    
        if (ii === 0) {
          segmentSourceX = (edges[i].data?.startXY as XYPoint).x;
          segmentSourceY = (edges[i].data?.startXY as XYPoint).y;
        } else {
          const edgePoint = edgePoints2[ii - 1];
          segmentSourceX = edgePoint.x;
          segmentSourceY = edgePoint.y;
        }
    
        if (ii === edgeSegmentsCount2 - 1) {
          segmentTargetX = (edges[i].data?.endXY as XYPoint).x;
          segmentTargetY = (edges[i].data?.endXY as XYPoint).y;
        } else {
          const edgePoint = edgePoints2[ii];
          segmentTargetX = edgePoint.x;
          segmentTargetY = edgePoint.y;
        }
        edgeSegmentsArray2.push({
          segmentSourceX,
          segmentSourceY,
          segmentTargetX,
          segmentTargetY
        });
      }
      for (let k = 0; k < edgeSegmentsCount; k++) {
        for (let m = 0; m < edgeSegmentsCount2; m++) {
          //check if crossed
          const x0=edgeSegmentsArray[k].segmentSourceX;
          const x1=edgeSegmentsArray[k].segmentTargetX;
          const y0=edgeSegmentsArray[k].segmentSourceY;
          const y1=edgeSegmentsArray[k].segmentTargetY;

          const x2=edgeSegmentsArray2[m].segmentSourceX;
          const x3=edgeSegmentsArray2[m].segmentTargetX;
          const y2=edgeSegmentsArray2[m].segmentSourceY;
          const y3=edgeSegmentsArray2[m].segmentTargetY;
          //for that first calculate
          const p0=(y3-y2)*(x3-x0)-(x3-x2)*(y3-y0);
          const p1=(y3-y2)*(x3-x1)-(x3-x2)*(y3-y1);
          const p2=(y1-y0)*(x1-x2)-(x1-x0)*(y1-y2);
          const p3=(y1-y0)*(x1-x3)-(x1-x0)*(y1-y3);
            if(p0*p1<0 && p2*p3<0) {
              const denom = (x0-x1)*(y2-y3)-(y0-y1)*(x2-x3);
              if(denom !=0) {
                const px=Math.round(((x0*y1-y0*x1)*(x2-x3)-(x2*y3-y2*x3)*(x0-x1))/denom*100)/100;
                const py=Math.round(((x0*y1-y0*x1)*(y2-y3)-(x2*y3-y2*x3)*(y0-y1))/denom*100)/100;
                //calculate squared distances to the cross point to shorten the path
                const a1=(x0-px)*(x0-px)+(y0-py)*(y0-py);
                const a2=(x1-px)*(x1-px)+(y1-py)*(y1-py);
                const min_a=0*2*2;
                // only draw intersection if distance high and id (==z-index) is bigger
                if (a1>min_a && a2>min_a && id>edges[i].id) {
                  //console.log("INTERSECTION at ["+String(px)+", "+String(py)+"]");
                  const d = 6 + (edgeData?.width as number) + (edges[i].data?.width as number);
                  const xdir=(x1>x0)?1:-1;
                  let xs1=px; // covers special case of vertical line
                  let xs2=px;
                  if(Math.abs(px-x0)>0.000001) {
                    const sqrtx = Math.sqrt((py-y0)*(py-y0)/((px-x0)*(px-x0)) + 1);
                    xs1 = px-xdir*d/2/sqrtx;
                    xs2 = px+xdir*d/2/sqrtx;
                  }
                  const ydir=(y1>y0)?1:-1;
                  let ys1=py; // covers horizontal line case
                  let ys2=py;
                  if(Math.abs(py-y0)>0.000001) {
                    const sqrty = Math.sqrt((px-x0)*(px-x0)/((py-y0)*(py-y0)) + 1);
                    ys1 = py-ydir*d/2/sqrty;
                    ys2 = py+ydir*d/2/sqrty;
                  }
                  
                  intersections.push({x:px, y: py, segmentIndex: k, partnerId: edges[i].id, partnerSegmentIndex: m, xs1, xs2, ys1, ys2});

                }
              }
            }
        }
      }
    }    
  }

  for (let i = 0; i < edgeSegmentsCount; i++) {
    //
    edgeSegmentsArray[i].edgePath = `M${edgeSegmentsArray[i].segmentSourceX} ${edgeSegmentsArray[i].segmentSourceY}`;
    const this_intersect = intersections.filter((value)=>(value.segmentIndex==i));
    if(edgeSegmentsArray[i].segmentSourceX < edgeSegmentsArray[i].segmentTargetX) {
      this_intersect.sort((a, b)=>(a.xs1 - b.xs1));
    } else {
      this_intersect.sort((a, b)=>(b.xs1 - a.xs1));
    }
    if(edgeSegmentsArray[i].segmentSourceY < edgeSegmentsArray[i].segmentTargetY) {
      this_intersect.sort((a, b)=>(a.ys1 - b.ys1));
    } else {
      this_intersect.sort((a, b)=>(b.ys1 - a.ys1));
    }
    for(let j = 0; j < this_intersect.length; j++) {
      edgeSegmentsArray[i].edgePath = edgeSegmentsArray[i].edgePath + ` L${this_intersect[j].xs1} ${this_intersect[j].ys1} A 1 1 0 0 0 ${this_intersect[j].xs2} ${this_intersect[j].ys2}`;
    }
    edgeSegmentsArray[i].edgePath = edgeSegmentsArray[i].edgePath + ` L${edgeSegmentsArray[i].segmentTargetX} ${edgeSegmentsArray[i].segmentTargetY}`;
  }


  const snapActive = (index: number) => {
    const edges = reactFlowInstance.getEdges();
    // find index of this edge
    const edgeIndex = edges.findIndex((edge) => edge.id === id);
    //console.log("OnMouseDown Edge-index="+String(edgeIndex)+" Edge id="+id);
    const new_data=edgeData;
    new_data.edgePoints[index].active=edgeIndex;
    reactFlowInstance.updateEdgeData(id, new_data, {replace: true});
  }

  const releaseAllActive = (index: number) => {
    //console.log("OnMouseUp Edge");
    const edges = reactFlowInstance.getEdges();
    for (let i = 0; i < edges.length; i++) {
      let handlersLength = 0;
      if(edges[i].data != null) {
        handlersLength = (edges[i].data?.edgePoints  as Array<edgePoint>).length;
      }
      for (let j = 0; j < handlersLength; j++) {
        if( (edges[i].data?.edgePoints  as Array<edgePoint>)[j].active !== -1) {
          const new_data=edgeData;
          new_data.edgePoints[index].active=-1;
          reactFlowInstance.updateEdgeData(id, new_data, {replace: true});
          //console.log("Released");
        }

      }
    }
  }

  const moveEdge = (activeEdge: number,  clientX: number, clientY: number, index: number) => {
    //console.log("OnMouseMove activeEdge = "+String(activeEdge));
    if (activeEdge === -1) {
      return;
    }
    setNotMooved(false);
    const position = reactFlowInstance.screenToFlowPosition({
      x: clientX,
      y: clientY,
    });

    const new_edge=reactFlowInstance.getEdge(id);
    if(new_edge?.data != null) {
      const snaparea=4;
      if(Math.abs(position.x-edgeSegmentsArray[index].segmentSourceX)<snaparea) {
        position.x=edgeSegmentsArray[index].segmentSourceX;
      }
      if(Math.abs(position.x-edgeSegmentsArray[index+1].segmentTargetX)<snaparea) {
        position.x=edgeSegmentsArray[index+1].segmentTargetX;
      }
      if(Math.abs(position.y-edgeSegmentsArray[index].segmentSourceY)<snaparea) {
        position.y=edgeSegmentsArray[index].segmentSourceY;
      }
      if(Math.abs(position.y-edgeSegmentsArray[index+1].segmentTargetY)<snaparea) {
        position.y=edgeSegmentsArray[index+1].segmentTargetY;
      }
      (new_edge.data?.edgePoints  as Array<edgePoint>)[index] = {
        x: position.x,
        y: position.y,
        active: activeEdge,
      };
      reactFlowInstance.updateEdge(id, new_edge);
    }
    // update all edges to force them redraw considering possible new/changed intersection posints
    const new_edges=reactFlowInstance.getEdges();
    reactFlowInstance.setEdges(new_edges);

    //console.log("moved to x="+String(position.x)+" and y="+String(position.y) + ", eventX="+String(event.clientX)+", eventY="+String(event.clientY));
   }

  const handleWidth = Math.min(edgeData?.width+2,3);

  const edgeButtonsPosition={x: edgeSegmentsArray[0].labelX, y: edgeSegmentsArray[0].labelY};

  const contentPhysLineLength = (
    <InputNumber
      size={reactFlowInstance.getZoom()<0.7?"large":"small"}
      style={{ width: "10em"}}
      suffix="m"
      defaultValue={(edgeData.physLength || 0.1) as number}
      min={0.1} max={100}
      onChange={(value)=>{
        reactFlowInstance.updateEdgeData(id, {physLength: value});
        const nodes=reactFlowInstance.getNodes();
        nodes.filter((node)=>node.data.wireInfoForNodeId==id && node.data.technicalID=="WireInfoNode").map((node)=>{
          reactFlowInstance.updateNodeData(node.id, {wireInfo_length: value});
        }); 
        //console.log(reactFlowInstance.getZoom())
      }}
    />
  );

  const contentLineWidth = (
    <>
    <Radio.Group
      value={edgeData.width}
      options={[
        { value: 1, label: "1px" },
        { value: 2, label: "2px" },
        { value: 3, label: "3px" },
        { value: 4, label: "4px" },
        { value: 5, label: "5px" },
        { value: 6, label: "6px" },
      ]}
      onChange={(e)=>{
        reactFlowInstance.updateEdgeData(id, {width: e.target.value});
      }}
    />
    </>
  );

  const crosssectionsMM2=[0.25, 0.34, 0.5, 0.75, 1, 1.5, 2.5, 4, 6];
  const crosssectionsAWG=[24, 22, 20, 18, 16, 14, 12, 10, 8];

  const contentPhysLineCrosssection = (
    <>
    <Select
      key={"CS"+edgeData.physCrosssectionUnit+String(edgeData.physCrosssection)}
      defaultValue={typeof(edgeData.physCrosssection)==="number"?edgeData.physCrosssection:crosssectionsMM2[3]}
      //value={typeof(edgeData.physCrosssection)==="number"?edgeData.physCrosssection:crosssectionsMM2[3]}
      options={(typeof(edgeData.physCrosssectionUnit)==="string"?(edgeData.physCrosssectionUnit==="mm2"?crosssectionsMM2:crosssectionsAWG):crosssectionsMM2).map(val=>({label: String(val), value: val}))}
      style={{width:100}}
      onChange={(value)=>{
        reactFlowInstance.updateEdgeData(id, {physCrosssection: value});
        const nodes=reactFlowInstance.getNodes();
        nodes.filter((node)=>node.data.wireInfoForNodeId==id && node.data.technicalID=="WireInfoNode").map((node)=>{
          reactFlowInstance.updateNodeData(node.id, {wireInfo_crosssection: value});
        }); 
        setOpenWireCrosssection(false);
      }}
    />
    &nbsp;
    <Select
      key={"CSU"+edgeData.physCrosssectionUnit+String(edgeData.physCrosssection)}
      defaultValue={typeof(edgeData.physCrosssectionUnit)==="string"?edgeData.physCrosssectionUnit:"mm2"}
      //value={typeof(edgeData.physCrosssectionUnit)==="string"?edgeData.physCrosssectionUnit:"mm2"}
      options={[
        {value: "mm2", label: "mm2"},
        {value: "AWG", label: "AWG"},
      ]}
      style={{width:70}}
      onChange={(value)=>{
        const physCrosssectionvalue=(value==="mm2"?crosssectionsMM2[3]:crosssectionsAWG[3]);
        reactFlowInstance.updateEdgeData(id, {physCrosssection: physCrosssectionvalue, physCrosssectionUnit: value});
        const nodes=reactFlowInstance.getNodes();
        nodes.filter((node)=>node.data.wireInfoForNodeId==id && node.data.technicalID=="WireInfoNode").map((node)=>{
          reactFlowInstance.updateNodeData(node.id, {wireInfo_crosssectionUnit: value, wireInfo_crosssection: physCrosssectionvalue});
        });
        //setOpenWireCrosssection(false);
      }}
    />
    </>
  );


  const customColorPanelRender: ColorPickerProps['panelRender'] = (_,{ components: { Presets } }) => (
        <Presets />
  );

  useEffect(() => {
    setNotMooved(selected || true);
  }, [selected]);

  const [openColorPicker, setOpenColorPicker] = useState(false);
  const [openWireCrosssection, setOpenWireCrosssection] = useState(false);

  return (
    <>
      {edgeSegmentsArray.map(({ edgePath }, index) => (
        <BaseEdge
          key={`edge${id}_segment${index}`}
          path={edgePath}
          markerEnd={markerEnd}
          interactionWidth={10}
          style = {{
            stroke: selected ? `${edgeData.color_selected}` : `${edgeData?.color}`,
            strokeWidth: edgeData.width,
            strokeLinecap: "round",
            strokeLinejoin: "round",
            //fill: "none",
            filter: (edgeData.correspondingInfoNodeSelected?"drop-shadow(0px 0px 2px)":""), //url(/filters.svg#double)
          }}
        />
      ))}
      // add circle at the end

    {selected && !multipleSelect && notMooved && <EdgeLabelRenderer>
        <div
          className='nopan nodrag pointer-events-auto absolute'
          style = {{
            pointerEvents: "all",
            transform: `translate(${edgeButtonsPosition.x+5}px,${edgeButtonsPosition.y+5}px)`,
            position: "absolute",
          }}
        >
          <Flex>
          <Tooltip
            title={t('tooltip.deleteWire')}
            placement="bottom"
          >
            <button
              style={{
                fontSize: 14/reactFlowInstance.getZoom(),
              }}
              onClick={()=>{
                  reactFlowInstance.deleteElements({ edges: [{id: id}] });
              }}
            ><DeleteOutlined/></button>
          </Tooltip>
          <Tooltip
            title={t('tooltip.selectColor')}
            placement="bottom" 
          >
            <ColorPicker
              defaultValue={colorNameToRGBString(edgeData.color as string)}
              //styles={{ popupOverlayInner: { width: 480 } }}
              presets={[
                {label: <span>Power wires (+V, +5V, +12V etc.)</span>, colors: [red[3], red[5], red[7]]},
                {label: <span>Ground wire (GND)</span>, colors: [gray[9]]},
                {label: <span>Data/Clock wire etc.</span>, colors: [green[5], green[7], blue[5], blue[7]]},
                {label: <span>Other</span>, colors: [cyan[5], magenta[5], purple[5], gold[5], "#8c8c8c", "#ccff33", "#996600", "#005ce6"]},
              ]}
              panelRender={customColorPanelRender}
              size={"small"}
              //disabledAlpha={true}
              open={openColorPicker}
              onOpenChange={(open) => setOpenColorPicker(open)}
              //format={"rgb"}
              onChange={(_,color)=>{
                reactFlowInstance.updateEdgeData(id, {color: color, color_selected: color});
                const nodes=reactFlowInstance.getNodes();
                nodes.filter((node)=>node.data.wireInfoForNodeId==id && node.data.technicalID=="WireInfoNode").map((node)=>{
                  reactFlowInstance.updateNodeData(node.id, {wireInfo_color: color});
                });
                setOpenColorPicker(false);
              }}
              style={{zoom: 1/Math.min(reactFlowInstance.getZoom(), 1.6)}}
            />
          </Tooltip>
          <Popover
            content={contentPhysLineLength}
            title={t('popover.selectWireLength')}
            trigger="click"
          >
            <Tooltip
              title={t('tooltip.selectWireLength')}
              placement="bottom"
            >
              <button
                  style={{
                    fontSize: 14/reactFlowInstance.getZoom(),
                  }}
                ><ColumnWidthOutlined/></button>
            </Tooltip>
          </Popover>
          <Popover
            content={contentLineWidth}
            title={t('popover.selectWireWidth')}
            trigger="click"
          >
            <Tooltip
              title={t('tooltip.selectWireWidth')}
              placement="bottom"
            >
              <button
                  style={{
                    fontSize: 14/reactFlowInstance.getZoom(),
                  }}
                ><Icon component={LineWidthSvg} /></button>
            </Tooltip>
          </Popover>
          <Popover
            content={contentPhysLineCrosssection}
            title={t('popover.selectWireCrossSection')}
            trigger="click"
            open={openWireCrosssection}
            onOpenChange={(open) => setOpenWireCrosssection(open)}
          >
            <Tooltip
              title={t('tooltip.selectWireCrossSection')}
              placement="bottom"
            >
              <button
                  style={{
                    fontSize: 14/reactFlowInstance.getZoom(),
                  }}
                ><Icon component={CrosssectionSvg} /></button>
            </Tooltip>
          </Popover>
          <Tooltip
            title={t('tooltip.putWireInfoNode')}
            placement="bottom"
          >
            <button
              style={{
                fontSize: 14/reactFlowInstance.getZoom(),
              }}
              onClick={()=>{
                  //reactFlowInstance.deleteElements({ edges: [{id: id}] });
                  //add node WireInfoNode
                  const nodes=reactFlowInstance.getNodes();
                  if(nodes.filter((node)=>node.data.wireInfoForNodeId==id && node.data.technicalID=="WireInfoNode").length==0) {
                    const newNode = structuredClone(WireInfoNode);
                    newNode.id = String(Math.random()),
                    newNode.position = {x: edgeButtonsPosition.x+20, y: edgeButtonsPosition.y-20};
                    newNode.data.wireInfoForNodeId = id;
                    newNode.data.wireInfo_length = edgeData.physLength;
                    newNode.data.wireInfo_crosssection = edgeData.physCrosssection;
                    newNode.data.wireInfo_crosssectionUnit = edgeData.physCrosssectionUnit;
                    newNode.data.wireInfo_color = edgeData.color;
                    //console.log(edgeData.physLength, edgeData.physCrosssection, edgeData.physCrosssectionUnit);
                    reactFlowInstance.addNodes(newNode);
                  }
              }}
            ><InfoCircleOutlined /></button>
          </Tooltip>
          </Flex>
        </div>
    </EdgeLabelRenderer>
    }

    { selected &&
      edgeSegmentsArray.map(({labelX, labelY, active}, index) => (
        <EdgeLabelRenderer
          key={`middle${id}_labelrenderer${index}`}
        >
          <div
            key={`middle${id}_containerdiv${index}`}
            className = "nopan"
            style = {{
              pointerEvents: "all",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              position: "absolute",
            }}
          >
            <div
              className = '${active} ${`${active ?? -1}` !== "-1" ? "active" : ""}'
              data-active={active ?? -1}
              key={`middle${id}_actiondiv${index}`}
              style = {{
                width: (typeof(active)==="number" && active>=0)? "500px": `${handleWidth}px`,
                height: (typeof(active)==="number" && active>=0)? "500px": `${handleWidth}px`,
                borderRadius: "50%",
                //border: "1px solid #AAAAAA",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                key={`middle${id}_handlerdiv${index}`}
                data-active={active ?? -1}
                style = {{
                  position: "absolute",
                  backgroundColor: "white",
                  padding: `${handleWidth}px`,
                  borderRadius: "50%",
                  borderColor: `${edgeData.color_selected}`,
                  borderWidth: `${Math.min(edgeData.width, 3)}px`,
                  borderStyle: "solid",
                  cursor: "pointer",
                }}
                onMouseDown={() => {
                  setNotMooved(false);
                  const edge = reactFlowInstance.getEdge(id);
                  //console.log("OnMouseDown Middle Edge id="+id);
                  const new_edge=edge;

                  if(new_edge?.data != null) {
                    if(new_edge.data?.edgePoints == null) {
                      Object.assign(new_edge.data, {edgePoints: [] as Array<edgePoint>});
                    }
                    (new_edge.data?.edgePoints as Array<edgePoint>).splice(index, 0, {
                      x: labelX,
                      y: labelY,
                      active: index,
                    });
                    reactFlowInstance.updateEdge(id, new_edge);
                  }
                }}
              >
              
              </div>
            </div>
          </div>
        </EdgeLabelRenderer>
      ))
    }

    { !selected && edgePoints.length>0 && 
      edgePoints.map(({x, y}, index) => (
        <EdgeLabelRenderer
          key={`edge${id}_smootherendererend${index}`}
        >
          <div
          key={`edge${id}_smoothediv${index}`}
          style = {{
            transform: `translate(-50%, -50%) translate(${x}px,${y}px)`,
            position: "absolute",
            backgroundColor: `${edgeData.color}`,
            padding: "0px",
            cursor: "pointer",
            borderRadius: "50%",
            borderColor: `${edgeData.color}`,
            borderWidth: edgeData.width/2,
            borderStyle: "solid",
          }}
          >

          </div>
        </EdgeLabelRenderer>

      ))
    }

    { selected && edgePoints.length>0 && 
      edgePoints.map(({x, y, active}, index) => (
        <EdgeLabelRenderer
          key={`edge${id}_labelrenderer${index}`}
        >
          <div
            key={`edge${id}_containerdiv${index}`}
            className = "nopan"
            style = {{
              pointerEvents: "all",
              transform: `translate(-50%, -50%) translate(${x}px,${y}px)`,
              position: "absolute",
            }}
          >
            <div
              className = '${active} ${`${active ?? -1}` !== "-1" ? "active" : ""}'
              data-active={active ?? -1}
              key={`edge${id}_actiondiv${index}`}
              style = {{
                width: (typeof(active)==="number" && active>=0)? "500px": `${handleWidth}px`,
                height: (typeof(active)==="number" && active>=0)? "500px": `${handleWidth}px`,
                borderRadius: "50%",
                //border: "1px solid #AAAAAA",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseUp={()=>releaseAllActive(index)}
              onTouchEnd={()=>releaseAllActive(index)}
              onMouseMove = {(event)=>{
                let activeEdge = -1;
                activeEdge = parseInt((event.target as HTMLDivElement).dataset.active ?? "-1");
                moveEdge(activeEdge, event.clientX, event.clientY, index);
              }}
              onTouchMove={(event) =>{
                event.preventDefault();
                let activeEdge = -1;
                activeEdge = parseInt((event.target as HTMLDivElement).dataset.active ?? "-1");
                moveEdge(activeEdge, event.touches[0].clientX, event.touches[0].clientY, index);
              }}
            >
              <div
                key={`edge${id}_handlerdiv${index}`}
                data-active={active ?? -1}
                style = {{
                  backgroundColor: `${edgeData.color_selected}`,
                  padding: `${handleWidth}px`,
                  cursor: "pointer",
                  borderRadius: "50%",
                  borderColor: `${edgeData.color_selected}`,
                  borderWidth: `${Math.min(edgeData.width, 3)}px`,
                  borderStyle: "solid",
                }}
                onMouseDown={()=>snapActive(index)}
                onTouchStart={()=>snapActive(index)}

              >

              </div>
            </div>
          </div>
        </EdgeLabelRenderer>
      ))
    }


    </>
  );
}
