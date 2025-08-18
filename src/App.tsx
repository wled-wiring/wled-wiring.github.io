import { useCallback, useState, useEffect } from 'react';
import { ConfigProvider, theme, message, notification, Button, Modal } from 'antd';
import { useTranslation } from "react-i18next";
import { DndProvider } from 'react-dnd-multi-backend'
import { HTML5toTouch } from 'rdndmb-html5-to-touch'
import { useDrop } from 'react-dnd';

import { type HandleDataType, PhysLengthType, ItemTypes, ComponentDataType, EdgeDataType} from './types';
import "./i18n"
import LocaleSwitcher from "./utils/LocaleSwitcher";
import Sidebar from './sidebar/Sidebar';
import { getAdaptedBounds } from './utils/utils_functions.ts';
import { useZustandStore } from './utils/pathfinder_functions.ts';
import ConnectionLine from './wires/ConnectionLine.tsx';

import {postypeToAdjustedXYConn, stripCheckAndDivideIfMiddleConnection} from "./utils/utils_functions.ts";

import { SolderJoint } from './components/ComponentTypes/SolderJoint.ts';

import {SelectOutlined, DeleteOutlined} from '@ant-design/icons';
import ConnectionIcon from './icons/connection.svg?react';
import ConnectionPFIcon from './icons/connectionPF.svg?react';

import { useShallow } from 'zustand/react/shallow';

import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  type OnEdgesChange,
  type OnNodesChange,
  type OnConnectEnd,
  applyEdgeChanges,
  applyNodeChanges,
  BackgroundVariant,
  ConnectionLineType,
  ConnectionMode,
  ReactFlowProvider,
  useReactFlow,
  OnDelete,
  OnInit,
  OnSelectionChangeFunc,
  Edge,
  Panel,
  ControlButton,
  type Node,
  type Connection,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import {initialNodes, nodeTypes } from './components';
import {edgeTypes} from './wires';

const defaultEdgeOptions = {
  type: "editable-wire-type",
  data: { type: "straight",
       edgePoints: [ ],
       color: "#FF0072",
       color_selected: "#b1b1b1",
       width: 1,
       physLength: 0.1,
       physCrosssection: 0.75,
       physCrosssectionUnit: "mm2",
       physType: "single",
  } as EdgeDataType
};

const FlowApp = () => {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState([] as Edge[]);
  const [messageApi, messageContextHolder] = message.useMessage();
  const [notificationApi, notificationContextHolder] = notification.useNotification();
  const PFEnabled=useZustandStore(useShallow((state)=>state.pathFindingEnabled));
  const [selectedNodes, setSelectedNodes] = useState([] as Node[]);
  const [selectedEdges, setSelectedEdges] = useState([] as Edge[]);

  const [isLegalNoticeModalOpen, setIsLegalNoticeModalOpen] = useState(false);
  const [isDataPrivacyModalOpen, setIsDataPrivacyModalOpen] = useState(false);
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [isLinksModalOpen, setIsLinksModalOpen] = useState(false);
  const [panOnDrag, setPanOnDrag] = useState(true);

  //const [mouseXYPosition, setmouseXYPosition] = useState({x:0, y:0} as XYPoint);

  const togglePF=useZustandStore((state)=>state.togglePF);

  // trigger state is used to trigger edges to redraw
  // its value will be changed by node change (like mooving)
  // then it is used inside if hook 
  const [triggerState, SetTriggerState] = useState(0);  

  const {t} = useTranslation(['main']);
  const { token } = theme.useToken();

  const reactFlow = useReactFlow();

  const url_params_object = new URLSearchParams( window.location.search );
  const link=url_params_object.get("link");

  const onInit:OnInit = useCallback((rflow) => {
    if(link) {
      if(link.length==24 || link.length==17 || link.length==18) {
        const linktofile="https://raw.githubusercontent.com/wled-development/wled-wiring-store/refs/heads/main/"+link+".json";
        // fetch link to file
        //console.log("LOADING");
        messageApi.open({
          type: 'loading',
          content: t('message.loadingModel'),
          duration: 0,
        });
        fetch(linktofile)
          .then((response) => {
            if (response.ok) {
              return response.json();
            }
          })
          .then((data) => {
            //console.log("Fetched data=", data);
            rflow.setNodes(data.nodes || []);
            rflow.setEdges(data.edges || []);
            rflow.setViewport(data.viewport);
            messageApi.destroy();
            notificationApi['success']({
              message: t('message.loadModelSuccessShort'),
              description: t('message.loadModelSuccess'),
            });
          })
          .catch(() => {
            messageApi.destroy();
            notificationApi['error']({
              message: t('message.loadModelErrorShort'),
              description: t('message.loadModelError'),
            });
          });
      } else {
        notificationApi['error']({
          message: t('message.loadModelErrorShort'),
          description: t('message.loadModelWrongLink'),
        });
      }
    }
  }, [link]);

  //const [{ canDrop, isOver }, drop] = useDrop(() => ({
  const [,drop] = useDrop(() => ({
    accept: ItemTypes.NODE,
    //drop: () => ({ name: 'YourRactFlow' }),
    drop(_item: ComponentDataType, monitor) {
      //console.log("DROP to x,y = ", monitor.getClientOffset());
      const xy=monitor.getClientOffset();
      //console.log("DROP to x,y = ", xy?.x, xy?.y);
      let position=reactFlow.screenToFlowPosition(xy || {x:0, y:0});
      position.x=position.x-(_item.image?.width || 0)/2;
      position.y=position.y-(_item.image?.height || 0)/2;
      //console.log("DROP to flow x,y =", position);
      //console.log("DROPPED ITEM=", _item);
      const type='general-component-type';
      const newNode = {
        id: String(Math.random()),
        type,
        position,
        data: structuredClone(_item),
      };
      setNodes((nds) => nds.concat(newNode));

      return {name: 'YourRactFlow' };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }))

  const onConnectEnd: OnConnectEnd = useCallback((_, connectionState)=>{

    // depending on the case we sill store source or source&target handles here to check later if 
    // they belong to the repeatedHAndleArray taht would mean we have divide the respective LED strip into physical sections
    let handleAndNodeArray=[] as Array<{thisParamsNodeID:string, thisParamsHandleID: string}>;

    if (connectionState.isValid) {
      // this we add an edge between existing nodes
      const sourceNode=connectionState.fromNode;

      const sourceNodeData=sourceNode?.data as ComponentDataType;
      let sourceHandle=sourceNodeData.handles?.find((handleData)=>(handleData.hid===connectionState.fromHandle?.id));
      if(!sourceHandle) {
        sourceHandle=sourceNodeData.repeatedHandleArray?.find((handleData)=>(handleData.hid===connectionState.fromHandle?.id));
      }
      const params = {
        source: connectionState.fromNode?.id, target: connectionState.toNode?.id,
        sourceHandle: connectionState.fromHandle?.id, targetHandle: connectionState.toHandle?.id
      } as Connection;
      const color = sourceHandle?.borderColor || "#000000";
      // default line width is 2, if no preffered defined
      const width = sourceHandle?.prefferedLineWidth || 2;

      const edgePoints=useZustandStore.getState().edgePoints;
      // define wire (in reactflow called "edge")
      setEdges(
        (edges) => {
          // get maximal zIndex of already existing edges
          let maxZIndex = 0;
          if(edges.length>0) {
            maxZIndex = edges.reduce((prev, current) => ( (prev.zIndex? prev.zIndex : 0)> (current.zIndex? current.zIndex:0)) ? prev : current).zIndex || 0;
          }
          const edg = addEdge({...params, type: "editable-wire-type", selected: false,
            zIndex: (maxZIndex?maxZIndex:0)+1, id: String((maxZIndex?maxZIndex:0)+1),
            data: {
              edgePoints: edgePoints,
              color: color,
              color_selected:
              color, 
              width: width,
              physLength: 0.1,
              physCrosssection: 0.75,
              physCrosssectionUnit: "mm2",
              physType: "single",
          }}, edges);
          SetTriggerState(triggerState+1);
          return edg;
        }
      );
      
      const targetNode=reactFlow.getNode(params.target);
      const targetNodeData=targetNode?.data as ComponentDataType;
      // set color of the target handle if it has property changeColorAutomatically (for example SolderJoint)
      if(targetNodeData && targetNodeData.handles && targetNodeData.handles.length>0) {
        if(targetNodeData.handles[0].changeColorAutomatically) {
          const newHandles=structuredClone(targetNodeData.handles);
          newHandles[0].borderColor=color;
          //newHandles[0].changeColorAutomatically=false;
          reactFlow.updateNodeData(params.target, {handles: newHandles});
        }
      }
      
      handleAndNodeArray=[{thisParamsNodeID: params.source,thisParamsHandleID: params.sourceHandle},
                                {thisParamsNodeID: params.target,thisParamsHandleID: params.targetHandle}
                                ] as Array<{thisParamsNodeID:string, thisParamsHandleID: string}>;
    } else {
      const edges = reactFlow.getEdges();
      
      // adjust from x the same way as ConnectionLine.tsx it does
      const fromX=connectionState.from?.x || 0;
      const fromY=connectionState.from?.y || 0;
      const fromNodeData = connectionState.fromNode?.data as ComponentDataType;
      const fromHandleId = connectionState.fromHandle?.id;
      let sourceHandle=fromNodeData.handles?.find((handleData)=>(handleData.hid===fromHandleId));
      if(!sourceHandle) {
        sourceHandle=fromNodeData.repeatedHandleArray?.find((handleData)=>(handleData.hid===fromHandleId));
      }
      let fromXadapted=fromX;
      let fromYadapted=fromY; 
    [fromXadapted, fromYadapted] = postypeToAdjustedXYConn(
          (sourceHandle?.postype || "left"),
          fromX,
          fromY,
          sourceHandle?.width || 0,
          sourceHandle?.height || 0,
          fromNodeData.rotation
        );
      
      const retval=useZustandStore.getState().nearestPoint;   
      const edgePoints=useZustandStore.getState().edgePoints;

      if(retval.pType!=undefined) {
        // put SolderJoint node at this position
        const type='general-component-type';
        const newNode = {
          id: String(Math.random()),
          type,
          position: {x: retval.x-10, y: retval.y-10}, // TBC: why 10? appatently must be handle position plus 2 (borderWidth?)
          data: structuredClone(SolderJoint.data),
        };
        (newNode.data as ComponentDataType).handles[0].borderColor = retval.color;
        setNodes((nds) => nds.concat(newNode));
        //divide existing edge into two parts
        // first add new edge
        let maxZIndex = 0;
        if(edges.length>0) {
          maxZIndex = edges.reduce((prev, current) => ( (prev.zIndex? prev.zIndex : 0)> (current.zIndex? current.zIndex:0)) ? prev : current).zIndex || 0;
        }
        let newEdge=structuredClone(edges.find((edge)=>(edge.id==retval.edgeID))) as Edge;
        newEdge.id=String((maxZIndex?maxZIndex:0)+1);
        newEdge.zIndex=(maxZIndex?maxZIndex:0)+1;
        newEdge.source=newNode.id;
        newEdge.sourceHandle=(newNode.data as ComponentDataType).handles[0].hid;
        const startEdgePointIndex=(retval.pType=="edge")?retval.segmentNumber:retval.segmentNumber+1;
        const totalEdgePointAlt=(newEdge.data as EdgeDataType).edgePoints.length;
        if(startEdgePointIndex>totalEdgePointAlt) {
          (newEdge.data as EdgeDataType).edgePoints=[];
        } else {
          (newEdge.data as EdgeDataType).edgePoints=(newEdge.data as EdgeDataType).edgePoints.slice(startEdgePointIndex,totalEdgePointAlt);
        }
        (newEdge.data as EdgeDataType).startXY={x:retval.x, y:retval.y};
        setEdges((edg)=>edg.concat(newEdge));
        // shorten existing edge

        let updatedEdge=structuredClone(edges.find((edge)=>(edge.id==retval.edgeID))) as Edge;
        updatedEdge.target=newNode.id;
        updatedEdge.targetHandle=(newNode.data as ComponentDataType).handles[0].hid;
        const endEdgePointIndex=(retval.pType=="edge")?retval.segmentNumber:retval.segmentNumber;
        if(endEdgePointIndex<=0) {
          (updatedEdge.data as EdgeDataType).edgePoints=[];
        } else {
          (updatedEdge.data as EdgeDataType).edgePoints=(updatedEdge.data as EdgeDataType).edgePoints.slice(0,endEdgePointIndex);
        }
        (updatedEdge.data as EdgeDataType).endXY={x:retval.x, y:retval.y};
        reactFlow.updateEdge(retval.edgeID,updatedEdge);

        // and at the end new edge with modified connection
        let veryNewEdge=structuredClone(updatedEdge);
        veryNewEdge.id=String(newEdge.zIndex+1);
        veryNewEdge.zIndex=newEdge.zIndex+1;
        (veryNewEdge.data as EdgeDataType).edgePoints=[];
        veryNewEdge.source=connectionState.fromNode?.id || "";
        veryNewEdge.sourceHandle=connectionState.fromHandle?.id || "";
        (veryNewEdge.data as EdgeDataType).startXY={x:fromXadapted, y:fromYadapted};
        (veryNewEdge.data as EdgeDataType).edgePoints=edgePoints;
        setEdges((edg)=>edg.concat(veryNewEdge));

        handleAndNodeArray=[
            {thisParamsNodeID: connectionState.fromNode?.id,thisParamsHandleID: connectionState.fromHandle?.id}
          ] as Array<{thisParamsNodeID:string, thisParamsHandleID: string}>;
      }

    }

    stripCheckAndDivideIfMiddleConnection(reactFlow, handleAndNodeArray);

  }, [setNodes, setEdges, reactFlow.screenToFlowPosition, triggerState, PFEnabled]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds1) => {
      const nds = applyNodeChanges(changes, nds1);
      //console.log(nds);
      SetTriggerState(triggerState+1);
      return nds;
    }),
    [setNodes, triggerState],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((edges) => {
      const edg = applyEdgeChanges(changes, edges);
      //console.log(edg);
      return edg;
    }),
    [setEdges],
  );

  const onSelectionChange:OnSelectionChangeFunc = useCallback(({ nodes, edges }) => {
    setPanOnDrag(true);
    setSelectedNodes(nodes);
    setSelectedEdges(edges);
    // if just one node selected and this node is WireInfoNode, then
    if(nodes.length==1) {
      if(nodes[0].data.technicalID=="WireInfoNode" && nodes[0].data.wireInfoForNodeId !=="") {
        const alledges=reactFlow.getEdges();
        alledges.filter((edge)=>edge.data?.correspondingInfoNodeSelected==true).map((edge)=>{
          reactFlow.updateEdgeData(edge.id, {correspondingInfoNodeSelected: false});
        })
        alledges.filter((edge)=>edge.id==nodes[0].data.wireInfoForNodeId).map((edge)=>{
          reactFlow.updateEdgeData(edge.id, {correspondingInfoNodeSelected: true});
        })
      }
    } else {
      const alledges=reactFlow.getEdges();
        alledges.filter((edge)=>edge.data?.correspondingInfoNodeSelected==true).map((edge)=>{
          reactFlow.updateEdgeData(edge.id, {correspondingInfoNodeSelected: false});
        })
    }
    if(edges.length==1) {
      // if just one edge selected, then find corresponding WireInfoNode and set its correspondingWireSelected to true
      const allnodes=reactFlow.getNodes();
      allnodes.filter((node)=>(node.data.technicalID=="WireInfoNode" && node.data.correspondingWireSelected)).map((node)=>{
          reactFlow.updateNodeData(node.id, {correspondingWireSelected: false});
        });
      allnodes.filter((node)=>(node.data.technicalID=="WireInfoNode" && node.data.wireInfoForNodeId==edges[0].id)).map((node)=>{
          reactFlow.updateNodeData(node.id, {correspondingWireSelected: true});
        });
    } else {
      // if more than one or none edge selected, then set all WireInfoNode correspondingWireSelected to false
      const allnodes=reactFlow.getNodes();
      allnodes.filter((node)=>(node.data.technicalID=="WireInfoNode" && node.data.correspondingWireSelected)).map((node)=>{
        reactFlow.updateNodeData(node.id, {correspondingWireSelected: false});
      });
      
    }

  }, []);

  const onDeleteNodeOrEdge: OnDelete= useCallback((params)=> {
    // if edge deleted and it has connected WireInfoNode
    params.edges.map((edge)=>{
      const allnodes = reactFlow.getNodes();
      allnodes.filter((node)=>(node.data.wireInfoForNodeId==edge.id && node.data.technicalID=="WireInfoNode")).map((node)=>{
        reactFlow.deleteElements({ nodes: [{id: node.id}] });
      })
    })

    // deleted edge can mean that data.physLengths[] array must be changed for the node.
    // go for all nodes and check if in this array there are objects with startIndex for which
    // handles in repeatedHandleArray exist but no one handle has connections
    nodes.map((node)=>{
      //console.log("DELETE Checking node id=",node.id);
      const physLengths= (node.data.physLengths || [{startIndex: 0, length:undefined}]) as PhysLengthType[];
      const objWithMaxStartIndex = (physLengths.reduce((prev, current) => (prev.startIndex > current.startIndex) ? prev : current));
      //console.log("DELETE objWithMaxStartIndex=", objWithMaxStartIndex);
      for(let index=1; index<=objWithMaxStartIndex.startIndex; index++) {
        //console.log("DELETE Checking index=", index);
        // fiter only elements with the index
        const indexInPL = physLengths.findIndex((physLength)=>(physLength.startIndex==index));
        //const pFiltered = physLengths.filter((physLength)=>(physLength.startIndex==index));
        //console.log("DELETE indexInPL=", indexInPL);
        if(indexInPL>0) {
          // Ok, there is an element, so check if in repeatedHandleArray there are handles with this index exist
          const repeatedHandleArray = (node.data.repeatedHandleArray || []) as Array<HandleDataType>;
          const repeatedHandleArrayFiltered = repeatedHandleArray.filter((handleData)=>(handleData.repeatIndex===index));
          let notConnected=true;
          // check if there are some edges connected to this node and handle
          //console.log("DELETE edges=", edges);
          //console.log("DELETE edges to delete=", params.edges);
          repeatedHandleArrayFiltered.map((handleData)=>{
              const edgesWithoutToBeDeleted=edges.filter((edge)=>(
                !params.edges.map(edgedel=>edgedel.id).includes(edge.id)
              ));
              //console.log("DELETE edges without to be deleted=", edgesWithoutToBeDeleted);
              const edgesFiltered = edgesWithoutToBeDeleted.filter((edge)=>(
                (edge.source==node.id && edge.sourceHandle==handleData.hid) ||
                (edge.target==node.id && edge.targetHandle==handleData.hid))
              );
              //console.log("DELETE edges filtered=", edgesFiltered);

              if(edgesFiltered.length>0) {
                notConnected=false;
              }
          });
          //console.log("DELETE notConnected=", notConnected);
          if(notConnected) {
            // TODO: adapt length and delete element indexInPL from physLengths[]
            const length = physLengths[indexInPL-1].length;
            if(length != undefined) {
              physLengths[indexInPL-1].length=length+(physLengths[indexInPL].length || 0);
            }
            physLengths.splice(indexInPL,1);
            reactFlow.updateNodeData(node.id, {physLengths: physLengths});
          }

        }
      }
  });
    //console.log("Some Edge or Node deleted");
  },[edges]);

  // ensures that edges are redrawn if triggerState changes
  useEffect(() => {
    setEdges((eds) => 
      //return new object (but indentical to the previous) to indicate to reactflow to redraw
      eds.map((edge) => ({...edge})),
    );
  }, [triggerState, setEdges]);



  return (
    <ConfigProvider
      theme={{
        algorithm: theme.compactAlgorithm,
        token: {
          fontSize: 14,
        },
        components: {
          Card: {
            headerPaddingSM: 6,
            bodyPaddingSM: 6,
            headerFontSizeSM: 10,
          },
        },
      }}
    >
      {messageContextHolder}
      {notificationContextHolder}
      <div id="app_container">
        <div id="headerRow" style={{borderBottomColor: token.colorBorder}}>
            <div style={{flex: "1 1 auto", textAlign: 'center'}}>
              <h2 
                style={{marginTop: 4, marginBottom: 4, minWidth: 300}}
              >{t('title')}</h2>
            </div>
            <div style={{flex: "0 0 auto", marginRight: 8, marginTop: 4, marginBottom: 4, marginLeft: 4}}> 
                <LocaleSwitcher />
            </div>
        </div>

        <div id="mainRow">
          <div id="reactflowDiv" style={{borderColor: token.colorBorder}}>
            <ReactFlow
              ref={drop}
              data-testid="reactflow_pane"
              nodes={nodes}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              edges={edges}
              edgeTypes={edgeTypes}
              onEdgesChange={onEdgesChange}
              onConnectEnd={onConnectEnd}
              onInit={onInit}
              connectionLineType={ConnectionLineType.Straight}
              connectionMode={ConnectionMode.Loose}
              connectionLineComponent={ConnectionLine}
              defaultEdgeOptions={defaultEdgeOptions}
              onDelete={onDeleteNodeOrEdge}
              onSelectionChange={onSelectionChange}
              //onMouseMove={(event)=>{
              //  const pos=reactFlow.screenToFlowPosition({x:event.clientX, y:event.clientY});
              //  setmouseXYPosition(pos);
              //}}
              /*
              onSelectionStart={(e)=>{
                console.log("Sel Start: ", e.clientX, e.clientY);
              }}
              onSelectionEnd={(e)=>{
                console.log("Sel Stop: ",e.clientX, e.clientY);
              }}
              onSelectionDragStart={(e)=>{
                console.log("Drag Start: ", e.clientX, e.clientY);
              }}
              onSelectionDragStop={(e)=>{
                console.log("Drag Stop: ",e.clientX, e.clientY);
              }}
              onSelectionDrag={(e)=>{
                console.log("Drag: ", e.movementX, e.movementY);
              }}
                */
              snapToGrid={true}
              snapGrid={[1,1]}
              panOnDrag={panOnDrag}
              selectionOnDrag={!panOnDrag}
              fitView
            >
              <Background 
              variant={BackgroundVariant.Dots}
              offset={0}
              gap={16}
              />
              <Controls 
                onFitView={()=>{
                  const NodesBounds=reactFlow.getNodes().map((node) => ({id: node.id, rect: reactFlow.getNodesBounds([node.id])}));
                  const Bounds=getAdaptedBounds(reactFlow, NodesBounds);
                  setTimeout(() => {
                    reactFlow.fitBounds(Bounds, {duration: 0});
                  }, 1);
                }}
              >
                <ControlButton
                  onClick={() => {
                    setPanOnDrag(false);
                  }}
                  title={t('tooltip.selectMulti')}
                >
                  <SelectOutlined />
                </ControlButton>
                <ControlButton
                  onClick={() => {
                    reactFlow.deleteElements({nodes: selectedNodes, edges: selectedEdges});
                  }}
                  title={t('tooltip.deleteSelected')}
                >
                  <DeleteOutlined />
                </ControlButton>
                <ControlButton
                  onClick={() => {
                    togglePF();
                  }}
                  title={t('tooltip.switchConnLineType')}
                >
                  {PFEnabled?<ConnectionPFIcon/>:<ConnectionIcon/>}
                  { nodes.length === 0 && 
                    <div
                      style={{
                        position: "absolute",
                        left: 30,
                        whiteSpace: "nowrap",
                        fontWeight: "bold",
                      }}
                    >
                      &larr; {t('tooltip.switchConnLineTypeHINT')}
                    </div>
                  }
                </ControlButton>
              </Controls>

              { nodes.length === 0 &&
                <Panel position="top-center">
                  <span
                    style={{
                      fontSize: 16,
                      color: token.colorText,
                    }}
                  
                  >{t('dragComponents')}</span>
                </Panel>
              }
            </ReactFlow>
          </div>
          <div id="sidebarDiv" style={{borderColor: token.colorBorder}}>
            <Sidebar />
          </div>
        </div>
        <div id="footerRow" className="flex-container" style={{borderTopColor: token.colorBorder}}>
              <Button
                type="link"
                onClick={()=>{
                  setIsLegalNoticeModalOpen(true);
                }}
              >{t('footRow.legalNotice.title')}</Button>
              <Button
                type="link"
                onClick={()=>{
                  setIsDataPrivacyModalOpen(true);
                }}
              >{t('footRow.dataPrivacy.title')}</Button>
              <Button
                type="link"
                onClick={()=>{
                  setIsContributeModalOpen(true);
                }}
              >{t('footRow.contribute.title')}</Button>
              <Button
                type="link"
                onClick={()=>{
                  setIsLinksModalOpen(true);
                }}
              >{t('footRow.links.title')}</Button>
        </div>
      </div>
      <Modal
        title={t('footRow.legalNotice.title')}
        open={isLegalNoticeModalOpen}
        cancelButtonProps={{ style: { display: 'none' } }}
        onOk={()=>setIsLegalNoticeModalOpen(false)} onCancel={()=>setIsLegalNoticeModalOpen(false)}
      >
        <div
          style={{
            maxHeight: 400,
            maxWidth: 400,
            overflowY: "scroll"
          }}
        >
          <div
            style={{
              marginLeft: 2,
              marginRight: 20
            }}
          >
          {t('footRow.legalNotice.responsible')}<br/>
          {t('footRow.legalNotice.address')}<br/>
          {t('footRow.legalNotice.contact')}<br/><br/>
          {t('footRow.legalNotice.disputeText')}&nbsp;<a target="_blank" rel="noopener noreferrer" href='https://ec.europa.eu/consumers/odr/'>https://ec.europa.eu/consumers/odr/</a><br/><br/>
          {t('footRow.legalNotice.disputeSettlmentText')}
          </div>
        </div>
      </Modal>
      <Modal
        title={t('footRow.dataPrivacy.title')}
        open={isDataPrivacyModalOpen}
        cancelButtonProps={{ style: { display: 'none' } }}
        onOk={()=>setIsDataPrivacyModalOpen(false)} onCancel={()=>setIsDataPrivacyModalOpen(false)}
      >
        <div
          style={{
            maxHeight: 400,
            maxWidth: 400,
            overflowY: "scroll",
          }}
        >
          <div
            style={{
              marginLeft: 2,
              marginRight: 20
            }}
          >
          {t('footRow.dataPrivacy.text1')}&nbsp;<a target="_blank" rel="noopener noreferrer" href='https://docs.github.com/en/github/site-policy/github-privacy-statement'>https://docs.github.com/en/github/site-policy/github-privacy-statement</a><br/><br/>
          {t('footRow.dataPrivacy.text2')}&nbsp;<a target="_blank" rel="noopener noreferrer" href='https://shop.myhome-control.de/Information/Datenschutz/'>https://shop.myhome-control.de/Information/Datenschutz/</a><br/><br/>
          {t('footRow.dataPrivacy.text3')}<br/><br/>
          </div>
        </div>
      </Modal>
      <Modal
        title={t('footRow.contribute.title')}
        open={isContributeModalOpen}
        cancelButtonProps={{ style: { display: 'none' } }}
        onOk={()=>setIsContributeModalOpen(false)} onCancel={()=>setIsContributeModalOpen(false)}
      >
        <div
          style={{
            maxHeight: 400,
            maxWidth: 400,
            overflowY: "scroll",
          }}
        >
          <div
            style={{
              marginLeft: 2,
              marginRight: 20
            }}
          >
          {t('footRow.contribute.text')}
          <br/>
          <a href="https://github.com/wled-wiring/wled-wiring.github.io" target="_blank" rel="noopener noreferrer">GitHub Link</a>
          </div>
        </div>
      </Modal>
      <Modal
        title={t('footRow.links.title')}
        open={isLinksModalOpen}
        cancelButtonProps={{ style: { display: 'none' } }}
        onOk={()=>setIsLinksModalOpen(false)} onCancel={()=>setIsLinksModalOpen(false)}
      >
        <div
          style={{
            maxHeight: 400,
            maxWidth: 400,
            overflowY: "scroll",
          }}
        >
          <div
            style={{
              marginLeft: 2,
              marginRight: 20
            }}
          >
          {t('footRow.links.link1Text')}&nbsp;<a href="https://kno.wled.ge/" target="_blank"  rel="noopener">know.led.ge</a><br/>
          {t('footRow.links.link2Text')}&nbsp;<a href="https://wled-faq.github.io" target="_blank"  rel="noopener">wled-faq.github.io</a><br/>
          {t('footRow.links.link3Text')}&nbsp;<a href="https://wled-calculator.github.io" target="_blank"  rel="noopener">wled-calculator.github.io</a><br/>
          {t('footRow.links.link4Text')}&nbsp;<a href="https://wled-install.github.io" target="_blank"  rel="noopener">wled-install.github.io</a><br/>
          {t('footRow.links.link5Text')}&nbsp;<a href="https://wled-compile.github.io" target="_blank"  rel="noopener">wled-compile.github.io</a><br/>
          {t('footRow.links.link6Text')}&nbsp;<a href="https://shop.myhome-control.de" target="_blank">MyHome-Control Shop</a><br/>
          {t('footRow.links.link7Text')}&nbsp;<a href="https://wled.shop" target="_blank">WLED Shop</a><br/>
          </div>
        </div>
      </Modal>
    </ConfigProvider>
  );
}

const App = () => (
  <ReactFlowProvider>
    <DndProvider options={HTML5toTouch}>
          <FlowApp />
    </DndProvider>
 </ReactFlowProvider>
);

export default App;
