import { Suspense, lazy, forwardRef, memo, useCallback, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { ConfigProvider, theme, message, notification, Button, Modal, Select } from 'antd';
import { useTranslation } from "react-i18next";
import { DndProvider } from 'react-dnd-multi-backend'
import { HTML5toTouch } from 'rdndmb-html5-to-touch'
import { useDrop } from 'react-dnd';

import { type HandleDataType, PhysLengthType, ItemTypes, ComponentDataType, EdgeDataType} from './types';
import "./i18n"
import LocaleSwitcher from "./utils/LocaleSwitcher";
import Sidebar from './sidebar/Sidebar';
import { ComponentDragPreviewLayer } from './sidebar/ComponentDragPreviewLayer.tsx';
import type { SidebarComponentDragItem } from './sidebar/dragTypes.ts';
import { getAdaptedBounds } from './utils/utils_functions.ts';
import {
  endpointLineDirection,
  findNonOrthogonalPathfinderRouteSegments,
  normalizePathfinderWireRoute,
  useZustandStore,
} from './utils/pathfinder_functions.ts';
import ConnectionLine from './wires/ConnectionLine.tsx';
import { applyComponentTemplateUpdatesToNodes, findNodeComponentTemplateUpdates } from './utils/componentTemplateUpdates.ts';
import { collapseMergeableSolderJoints, collapseMergeableSolderJointsAfterWireDelete } from './utils/wireMerge.ts';
import {
  adjustOrthogonalWiresForMovedNodes,
  createOrthogonalWireDragSnapshot,
  type OrthogonalWireDragSnapshot,
} from './utils/orthogonalWireRouting.ts';
import { snapMovedNodePositions } from './utils/nodeMoveSnap.ts';
import {
  UndoRedoProvider,
  useUndoRedoController,
  type DiagramSnapshot,
} from './utils/undoRedo.tsx';

import {getRenderedWireEndpoint, postypeToAdjustedXYConn, stripCheckAndDivideIfMiddleConnection} from "./utils/utils_functions.ts";

import { getComponentTemplate } from './components/catalog/componentRegistry.ts';

import {SelectOutlined, DeleteOutlined, RedoOutlined, UndoOutlined} from '@ant-design/icons';
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
  useUpdateNodeInternals,
  OnDelete,
  OnInit,
  OnSelectionChangeFunc,
  Edge,
  Panel,
  ControlButton,
  type Node,
  type Connection,
  type OnNodeDrag,
  type OnBeforeDelete,
  type ReactFlowInstance,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import {initialNodes, nodeTypes } from './components';
import {edgeTypes} from './wires';
import { SimulationOverlay } from './simulation/SimulationOverlay.tsx';
import { initializeLedSimulationOptionValues } from './simulation/ledStripSimulationOptions.ts';
import { ENABLE_COMPONENT_EDITOR_FOOTER_LINK } from './editor/componentEditorFeatureFlags.ts';
import { wirePhysicalDefaultsForConnection } from './wires/wireDefaults.ts';
import { useDiagramCheckSettingsStore } from './check/checkSettingsStore.ts';
import { useDiagramCheckResultStore } from './check/diagramCheckResultStore.ts';
import { parseImportedFlowObject, type ImportedFlow } from './utils/diagramModel.ts';
import {
  clearAutosave,
  readAutosave,
  writeReactFlowAutosave,
} from './utils/autosaveStorage.ts';
import { useAutosaveSettingsStore } from './utils/autosaveSettingsStore.ts';
import { useDiagramSaveStatusStore } from './utils/diagramSaveStatusStore.ts';
import { ENABLE_DIAGRAM_AUTOSAVE } from './utils/autosaveFeatureFlags.ts';

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

const snapGrid: [number, number] = [1, 1];

const ComponentEditorApp = lazy(() => import('./editor/EditorApp.tsx'));

const exampleOptions = [
  {labelKey: 'examples.example1', value: 'examples/example1'},
  {labelKey: 'examples.example2', value: 'examples/example2'},
  {labelKey: 'examples.example3', value: 'examples/example3'},
  {labelKey: 'examples.example4', value: 'examples/example4'},
  {labelKey: 'examples.example5', value: 'examples/example5'},
];

type AntdMessageApi = ReturnType<typeof message.useMessage>[0];
type AntdNotificationApi = ReturnType<typeof notification.useNotification>[0];
type AntdModalApi = ReturnType<typeof Modal.useModal>[0];

type FlowCanvasHandle = {
  getDiagramSnapshot: () => DiagramSnapshot;
  restoreDiagramSnapshot: (snapshot: DiagramSnapshot) => void;
};

type FlowCanvasProps = {
  undoRedo: ReturnType<typeof useUndoRedoController>;
  messageApi: AntdMessageApi;
  notificationApi: AntdNotificationApi;
  modalApi: AntdModalApi;
};

type FlowControlsProps = {
  canRedo: boolean;
  canUndo: boolean;
  deleteSelectedTitle: string;
  isPathfindingEnabled: boolean;
  isSelectionModeEnabled: boolean;
  onDeleteSelected: () => void;
  onFitView: () => void;
  onRedo: () => void;
  onTogglePathfinding: () => void;
  onToggleSelectionMode: () => void;
  onUndo: () => void;
  selectMultiTitle: string;
  switchConnectionLineTitle: string;
};

const FlowControls = memo(({
  canRedo,
  canUndo,
  deleteSelectedTitle,
  isPathfindingEnabled,
  isSelectionModeEnabled,
  onDeleteSelected,
  onFitView,
  onRedo,
  onTogglePathfinding,
  onToggleSelectionMode,
  onUndo,
  selectMultiTitle,
  switchConnectionLineTitle,
}: FlowControlsProps) => (
  <Controls onFitView={onFitView}>
    <ControlButton
      onClick={onUndo}
      disabled={!canUndo}
      title="Undo (Ctrl+Z)"
    >
      <UndoOutlined />
    </ControlButton>
    <ControlButton
      onClick={onRedo}
      disabled={!canRedo}
      title="Redo (Ctrl+Shift+Z)"
    >
      <RedoOutlined />
    </ControlButton>
    <ControlButton
      onClick={onToggleSelectionMode}
      className={isSelectionModeEnabled ? "control-button--active" : undefined}
      aria-pressed={isSelectionModeEnabled}
      title={selectMultiTitle}
    >
      <SelectOutlined />
    </ControlButton>
    <ControlButton
      onClick={onDeleteSelected}
      title={deleteSelectedTitle}
    >
      <DeleteOutlined />
    </ControlButton>
    <ControlButton
      onClick={onTogglePathfinding}
      title={switchConnectionLineTitle}
    >
      {isPathfindingEnabled ? <ConnectionPFIcon/> : <ConnectionIcon/>}
    </ControlButton>
  </Controls>
));

FlowControls.displayName = "FlowControls";

const FlowCanvas = forwardRef<FlowCanvasHandle, FlowCanvasProps>(({
  undoRedo,
  messageApi,
  notificationApi,
  modalApi,
}, ref) => {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState([] as Edge[]);
  const PFEnabled=useZustandStore(useShallow((state)=>state.pathFindingEnabled));
  const [selectedNodes, setSelectedNodes] = useState([] as Node[]);
  const [selectedEdges, setSelectedEdges] = useState([] as Edge[]);
  const orthogonalWireDragSnapshotRef = useRef<OrthogonalWireDragSnapshot | null>(null);
  const autosaveRestoreCheckedRef = useRef(false);
  const diagramDirtyTrackingReadyRef = useRef(false);
  const skipNextDirtyMarkRef = useRef(false);

  const [panOnDrag, setPanOnDrag] = useState(true);
  const [autosaveReady, setAutosaveReady] = useState(false);

  //const [mouseXYPosition, setmouseXYPosition] = useState({x:0, y:0} as XYPoint);

  const togglePF=useZustandStore((state)=>state.togglePF);

  // trigger state is used to trigger edges to redraw
  // its value will be changed by node change (like mooving)
  // then it is used inside if hook 
  const [triggerState, SetTriggerState] = useState(0);  

  const {t} = useTranslation(['main']);
  const { token } = theme.useToken();

  const reactFlow = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const diagramCheckSettings = useDiagramCheckSettingsStore((state) => state.settings);
  const setDiagramCheckSettingsFromExport = useDiagramCheckSettingsStore((state) => state.setSettingsFromExport);
  const clearDiagramCheckResult = useDiagramCheckResultStore((state) => state.clearResult);
  const autosaveEnabled = useAutosaveSettingsStore((state) => state.autosaveEnabled);
  const hasUnsavedChanges = useDiagramSaveStatusStore((state) => state.hasUnsavedChanges);
  const markDiagramUnsaved = useDiagramSaveStatusStore((state) => state.markUnsaved);
  const markDiagramSaved = useDiagramSaveStatusStore((state) => state.markSaved);

  const getDiagramSnapshot = useCallback((): DiagramSnapshot => ({
    nodes: reactFlow.getNodes(),
    edges: reactFlow.getEdges(),
  }), [reactFlow]);

  const restoreDiagramSnapshot = useCallback((snapshot: DiagramSnapshot) => {
    clearDiagramCheckResult();
    setNodes(snapshot.nodes);
    setEdges(snapshot.edges);
    setTimeout(() => {
      snapshot.nodes.forEach((node) => updateNodeInternals(node.id));
    }, 0);
    SetTriggerState((value) => value + 1);
  }, [clearDiagramCheckResult, setEdges, setNodes, updateNodeInternals]);

  useImperativeHandle(ref, () => ({
    getDiagramSnapshot,
    restoreDiagramSnapshot,
  }), [getDiagramSnapshot, restoreDiagramSnapshot]);

  const url_params_object = new URLSearchParams( window.location.search );
  const link=url_params_object.get("link");

  const askForComponentTemplateUpdates = useCallback((loadedNodes: Node[]) => {
    const updateInfos = findNodeComponentTemplateUpdates(loadedNodes, t('sidebar.components.updateValueMissing'));
    if(updateInfos.length===0) return;

    modalApi.confirm({
      title: t('message.componentUpdatesAvailableTitle'),
      content: t('message.componentUpdatesAvailableDescription', { count: updateInfos.length }),
      okText: t('message.componentUpdatesApplyAll'),
      cancelText: t('message.componentUpdatesSkip'),
      onOk: () => {
        let updatedNodeIds: string[] = [];
        undoRedo.takeSnapshot('component template update');
        setNodes((currentNodes) => {
          const result = applyComponentTemplateUpdatesToNodes(currentNodes);
          updatedNodeIds = result.updatedNodeIds;
          return result.nodes;
        });
        setTimeout(() => {
          updatedNodeIds.forEach((nodeId) => updateNodeInternals(nodeId));
        }, 0);
        notificationApi['success']({
          message: t('message.componentUpdatesAppliedShort'),
          description: t('message.componentUpdatesAllApplied', { count: updateInfos.length }),
        });
      },
    });
  }, [modalApi, notificationApi, setNodes, t, undoRedo, updateNodeInternals]);

  const applyImportedFlow = useCallback((
    flow: ImportedFlow,
    options?: {
      notify?: boolean;
      askForUpdates?: boolean;
      rflow?: ReactFlowInstance;
      markSaved?: boolean;
    },
  ) => {
    if(options?.markSaved) {
      skipNextDirtyMarkRef.current = true;
    }

    const targetFlow = options?.rflow ?? reactFlow;
    clearDiagramCheckResult();
    setNodes(flow.nodes);
    setEdges(flow.edges);
    targetFlow.setViewport(flow.viewport);
    setDiagramCheckSettingsFromExport(flow.checkSettings);
    undoRedo.clearHistory();
    setTimeout(() => {
      flow.nodes.forEach((node) => updateNodeInternals(node.id));
      if(options?.askForUpdates !== false) {
        askForComponentTemplateUpdates(flow.nodes);
      }
    }, 0);
    SetTriggerState((value) => value + 1);

    if(options?.notify) {
      notificationApi['success']({
        message: t('message.loadModelSuccessShort'),
        description: t('message.loadModelSuccess'),
      });
    }

    if(options?.markSaved) {
      markDiagramSaved();
    }
  }, [
    askForComponentTemplateUpdates,
    clearDiagramCheckResult,
    markDiagramSaved,
    notificationApi,
    reactFlow,
    setDiagramCheckSettingsFromExport,
    setEdges,
    setNodes,
    t,
    undoRedo,
    updateNodeInternals,
  ]);

  const loadModelFromLink = useCallback((modelLink: string, rflow: ReactFlowInstance = reactFlow) => {
    if(modelLink.length==24 || modelLink.length==17 || modelLink.length==18) {
      const linktofile="https://raw.githubusercontent.com/wled-development/wled-wiring-store/refs/heads/main/"+modelLink+".json";
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
          throw new Error('Model file could not be loaded');
        })
        .then((data) => {
          const flow = parseImportedFlowObject(data);
          applyImportedFlow(flow, {
            askForUpdates: false,
            markSaved: true,
            rflow,
          });
          messageApi.destroy();
          notificationApi['success']({
            message: t('message.loadModelSuccessShort'),
            description: t('message.loadModelSuccess'),
          });
          setTimeout(() => {
            askForComponentTemplateUpdates(flow.nodes);
          }, 0);
          setAutosaveReady(true);
        })
        .catch(() => {
          messageApi.destroy();
          notificationApi['error']({
            message: t('message.loadModelErrorShort'),
            description: t('message.loadModelError'),
          });
          setAutosaveReady(true);
        });
    } else {
      notificationApi['error']({
        message: t('message.loadModelErrorShort'),
        description: t('message.loadModelWrongLink'),
      });
      setAutosaveReady(true);
    }
  }, [applyImportedFlow, askForComponentTemplateUpdates, messageApi, notificationApi, reactFlow, t]);

  const onInit:OnInit = useCallback((rflow) => {
    if(link) {
      loadModelFromLink(link, rflow);
    }
  }, [link, loadModelFromLink]);

  useEffect(() => {
    if(autosaveRestoreCheckedRef.current) return;
    autosaveRestoreCheckedRef.current = true;

    if(!ENABLE_DIAGRAM_AUTOSAVE) {
      setAutosaveReady(true);
      return;
    }

    if(link) return;

    if(!autosaveEnabled) {
      setAutosaveReady(true);
      return;
    }

    const autosave = readAutosave();
    if(!autosave || (autosave.diagram.nodes.length === 0 && autosave.diagram.edges.length === 0)) {
      setAutosaveReady(true);
      return;
    }

    modalApi.confirm({
      title: t('autosave.restoreTitle'),
      content: (
        <div>
          <p>{t('autosave.restoreDescription')}</p>
          <p>{t('autosave.savedAt', {
            value: new Date(autosave.savedAt).toLocaleString(),
          })}</p>
          {autosave.documentFileName &&
            <p>{t('autosave.documentFileName', { name: autosave.documentFileName })}</p>
          }
          {autosave.lastManualSaveAt &&
            <p>{t('autosave.lastManualSaveAt', {
              value: new Date(autosave.lastManualSaveAt).toLocaleString(),
            })}</p>
          }
        </div>
      ),
      okText: t('autosave.continueButton'),
      cancelText: t('autosave.newDiagramButton'),
      onOk: () => {
        applyImportedFlow(autosave.diagram, {
          askForUpdates: true,
          markSaved: true,
          notify: true,
        });
        setAutosaveReady(true);
      },
      onCancel: () => {
        clearAutosave();
        markDiagramSaved();
        setAutosaveReady(true);
      },
    });

  }, [applyImportedFlow, autosaveEnabled, link, markDiagramSaved, modalApi, t]);

  const saveAutosaveNow = useCallback(() => {
    if(!ENABLE_DIAGRAM_AUTOSAVE) return;
    if(!autosaveEnabled || !autosaveReady) return;

    try {
      writeReactFlowAutosave(reactFlow);
    } catch {
      notificationApi['warning']({
        message: t('autosave.saveFailedTitle'),
        description: t('autosave.saveFailedDescription'),
      });
    }
  }, [autosaveEnabled, autosaveReady, notificationApi, reactFlow, t]);

  useEffect(() => {
    if(!ENABLE_DIAGRAM_AUTOSAVE) return;
    if(!autosaveEnabled || !autosaveReady) return;

    const timeout = window.setTimeout(saveAutosaveNow, 1500);
    return () => window.clearTimeout(timeout);
  }, [autosaveEnabled, autosaveReady, diagramCheckSettings, edges, nodes, saveAutosaveNow]);

  useEffect(() => {
    if(!autosaveReady) return;

    if(!diagramDirtyTrackingReadyRef.current) {
      diagramDirtyTrackingReadyRef.current = true;
      markDiagramSaved();
      return;
    }

    if(skipNextDirtyMarkRef.current) {
      skipNextDirtyMarkRef.current = false;
      markDiagramSaved();
      return;
    }

    markDiagramUnsaved();
  }, [autosaveReady, diagramCheckSettings, edges, markDiagramSaved, markDiagramUnsaved, nodes]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if(!hasUnsavedChanges) return;

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if(!ENABLE_DIAGRAM_AUTOSAVE) return;

    const handleVisibilityChange = () => {
      if(document.visibilityState === 'hidden') {
        saveAutosaveNow();
      }
    };

    window.addEventListener('pagehide', saveAutosaveNow);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', saveAutosaveNow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [saveAutosaveNow]);

  //const [{ canDrop, isOver }, drop] = useDrop(() => ({
  const [,drop] = useDrop(() => ({
    accept: ItemTypes.NODE,
    //drop: () => ({ name: 'YourRactFlow' }),
    drop(_item: SidebarComponentDragItem, monitor) {
      //console.log("DROP to x,y = ", monitor.getClientOffset());
      const xy=monitor.getClientOffset();
      const componentData = _item.componentData;
      //console.log("DROP to x,y = ", xy?.x, xy?.y);
      let position=reactFlow.screenToFlowPosition(xy || {x:0, y:0});
      position.x=position.x-(componentData.image?.width || 0)/2;
      position.y=position.y-(componentData.image?.height || 0)/2;
      //console.log("DROP to flow x,y =", position);
      //console.log("DROPPED ITEM=", _item);
      const type='general-component-type';
      const newNode = {
        id: String(Math.random()),
        type,
        position,
        data: initializeLedSimulationOptionValues(structuredClone(componentData)),
      };
      undoRedo.takeSnapshot('add component');
      setNodes((nds) => nds.concat(newNode));

      return {name: 'YourRactFlow' };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [reactFlow, setNodes, undoRedo])

  const onConnectEnd: OnConnectEnd = useCallback((_, connectionState)=>{

    // depending on the case we sill store source or source&target handles here to check later if 
    // they belong to the repeatedHAndleArray taht would mean we have divide the respective LED strip into physical sections
    let handleAndNodeArray=[] as Array<{thisParamsNodeID:string, thisParamsHandleID: string}>;

    if (connectionState.isValid) {
      undoRedo.takeSnapshot('connect wire');
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
      const candidateSolderJointIds = [connectionState.fromNode, connectionState.toNode]
        .filter((node) => node?.data.technicalID === 'SolderJoint')
        .map((node) => node?.id);
      const color = sourceHandle?.borderColor || "#000000";
      // default line width is 2, if no preffered defined
      const width = sourceHandle?.prefferedLineWidth || 2;

      const edgePoints=useZustandStore.getState().edgePoints;
      const targetNodeForRoute=connectionState.toNode ?? reactFlow.getNode(params.target);
      const targetNodeDataForRoute=targetNodeForRoute?.data as ComponentDataType | undefined;
      let targetHandle=targetNodeDataForRoute?.handles?.find((handleData)=>(handleData.hid===connectionState.toHandle?.id));
      if(!targetHandle) {
        targetHandle=targetNodeDataForRoute?.repeatedHandleArray?.find((handleData)=>(handleData.hid===connectionState.toHandle?.id));
      }
      const renderedSourceEndpoint = getRenderedWireEndpoint(sourceNode ?? undefined, connectionState.fromHandle?.id);
      const renderedTargetEndpoint = getRenderedWireEndpoint(targetNodeForRoute ?? undefined, connectionState.toHandle?.id);
      const sourceDirection = renderedSourceEndpoint
        ? endpointLineDirection(sourceNode ?? undefined, sourceHandle, renderedSourceEndpoint.x, renderedSourceEndpoint.y)
        : undefined;
      const targetDirection = renderedTargetEndpoint
        ? endpointLineDirection(targetNodeForRoute ?? undefined, targetHandle, renderedTargetEndpoint.x, renderedTargetEndpoint.y)
        : undefined;
      const pathfinderRoute = PFEnabled && renderedSourceEndpoint && renderedTargetEndpoint
        ? normalizePathfinderWireRoute(
          renderedSourceEndpoint,
          renderedTargetEndpoint,
          edgePoints,
          sourceDirection,
          targetDirection,
        )
        : undefined;
      if(import.meta.env.DEV && pathfinderRoute) {
        const diagnostics = findNonOrthogonalPathfinderRouteSegments(pathfinderRoute);
        if(diagnostics.length>0) {
          console.warn('[wire-routing] non-orthogonal created connection route', diagnostics);
        }
      }
      const edgeRouteData = pathfinderRoute
        ? {
          edgePoints: pathfinderRoute.edgePoints,
          startXY: pathfinderRoute.startXY,
          endXY: pathfinderRoute.endXY,
        }
        : {
          edgePoints: PFEnabled ? edgePoints : [],
        };
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
              ...edgeRouteData,
              color: color,
              color_selected:
              color, 
              width: width,
              physLength: 0.1,
              ...wirePhysicalDefaultsForConnection(nodes as Node<ComponentDataType>[], params),
          }}, edges);
          SetTriggerState((value) => value + 1);
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

      if(candidateSolderJointIds.length>0) {
        setTimeout(() => {
          const collapseResult = collapseMergeableSolderJoints({
            nodes: reactFlow.getNodes(),
            edges: reactFlow.getEdges(),
            candidateSolderJointIds,
          });

          if(collapseResult.collapsedSolderJointIds.length>0) {
            setNodes(collapseResult.nodes);
            setEdges(collapseResult.edges);
            SetTriggerState((value) => value + 1);
          }
        }, 0);
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
      const renderedSourceEndpoint = getRenderedWireEndpoint(connectionState.fromNode ?? undefined, fromHandleId);
      if(renderedSourceEndpoint) {
        fromXadapted=renderedSourceEndpoint.x;
        fromYadapted=renderedSourceEndpoint.y;
      }
      
      const retval=useZustandStore.getState().nearestPoint;   
      const edgePoints=useZustandStore.getState().edgePoints;

      if(retval.pType!=undefined) {
        const solderJointTemplate = getComponentTemplate('SolderJoint');
        if(!solderJointTemplate) return;
        undoRedo.takeSnapshot('connect wire to existing wire');
        // put SolderJoint node at this position
        const type='general-component-type';
        const newNode = {
          id: String(Math.random()),
          type,
          position: {x: retval.x-10, y: retval.y-10}, // TBC: why 10? appatently must be handle position plus 2 (borderWidth?)
          data: structuredClone(solderJointTemplate.data),
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
        const sourceDirection = endpointLineDirection(
          connectionState.fromNode ?? undefined,
          sourceHandle,
          fromXadapted,
          fromYadapted,
        );
        const routeToWire = PFEnabled
          ? normalizePathfinderWireRoute(
            {x:fromXadapted, y:fromYadapted},
            {x:retval.x, y:retval.y},
            edgePoints,
            sourceDirection,
            undefined,
          )
          : undefined;
        (veryNewEdge.data as EdgeDataType).startXY=routeToWire?.startXY ?? {x:fromXadapted, y:fromYadapted};
        (veryNewEdge.data as EdgeDataType).endXY=routeToWire?.endXY ?? {x:retval.x, y:retval.y};
        (veryNewEdge.data as EdgeDataType).edgePoints=routeToWire?.edgePoints ?? edgePoints;
        setEdges((edg)=>edg.concat(veryNewEdge));

        handleAndNodeArray=[
            {thisParamsNodeID: connectionState.fromNode?.id,thisParamsHandleID: connectionState.fromHandle?.id}
          ] as Array<{thisParamsNodeID:string, thisParamsHandleID: string}>;
      }

    }

    stripCheckAndDivideIfMiddleConnection(reactFlow, handleAndNodeArray);

  }, [PFEnabled, nodes, setNodes, setEdges, reactFlow, undoRedo]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds1) => {
      const nds = applyNodeChanges(changes, nds1);
      //console.log(nds);
      SetTriggerState((value) => value + 1);
      return nds;
    }),
    [setNodes],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((edges) => {
      const edg = applyEdgeChanges(changes, edges);
      //console.log(edg);
      return edg;
    }),
    [setEdges],
  );

  const onNodeDragStart: OnNodeDrag = useCallback(() => {
    undoRedo.takeSnapshot('move component');
    orthogonalWireDragSnapshotRef.current = createOrthogonalWireDragSnapshot(
      reactFlow.getNodes(),
      reactFlow.getEdges(),
    );
  }, [reactFlow, undoRedo]);

  const getNodesWithDraggedPositions = useCallback((draggedNodes: Node[]) => {
    const nodeById = new Map(reactFlow.getNodes().map((node) => [node.id, node]));

    draggedNodes.forEach((node) => {
      nodeById.set(node.id, node);
    });

    return Array.from(nodeById.values());
  }, [reactFlow]);

  const onNodeDrag: OnNodeDrag = useCallback((_, __, draggedNodes) => {
    const snapshot = orthogonalWireDragSnapshotRef.current;
    if (!snapshot) return;
    const snapResult = snapMovedNodePositions({
      snapshot,
      currentNodes: getNodesWithDraggedPositions(draggedNodes),
      draggedNodeIds: draggedNodes.map((node) => node.id),
      zoom: reactFlow.getZoom(),
    });
    if(snapResult.snapped) {
      setNodes(snapResult.nodes);
    }

    if(PFEnabled) {
      setEdges(adjustOrthogonalWiresForMovedNodes(
        snapshot,
        snapResult.nodes,
      ));
    }
  }, [PFEnabled, getNodesWithDraggedPositions, reactFlow, setEdges, setNodes]);

  const onNodeDragStop: OnNodeDrag = useCallback((_, __, draggedNodes) => {
    const snapshot = orthogonalWireDragSnapshotRef.current;
    if (!snapshot) return;
    const snapResult = snapMovedNodePositions({
      snapshot,
      currentNodes: getNodesWithDraggedPositions(draggedNodes),
      draggedNodeIds: draggedNodes.map((node) => node.id),
      zoom: reactFlow.getZoom(),
    });
    if(snapResult.snapped) {
      setNodes(snapResult.nodes);
    }

    if(PFEnabled) {
      setEdges(adjustOrthogonalWiresForMovedNodes(
        snapshot,
        snapResult.nodes,
      ));
    }
    orthogonalWireDragSnapshotRef.current = null;
    SetTriggerState((value) => value + 1);
  }, [PFEnabled, getNodesWithDraggedPositions, reactFlow, setEdges, setNodes]);

  const onBeforeDelete: OnBeforeDelete = useCallback(async ({ nodes, edges }) => {
    if (nodes.length > 0 || edges.length > 0) {
      undoRedo.takeSnapshot('delete');
    }

    return true;
  }, [undoRedo]);

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

  }, [reactFlow]);

  const onDeleteNodeOrEdge: OnDelete= useCallback((params)=> {
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
    const solderJointCollapseResult = collapseMergeableSolderJointsAfterWireDelete({
      nodes,
      edgesBeforeDelete: edges,
      deletedEdges: params.edges,
      deletedNodes: params.nodes,
    });

    setNodes(solderJointCollapseResult.nodes);
    setEdges(solderJointCollapseResult.edges);
    if(solderJointCollapseResult.collapsedSolderJointIds.length>0) {
      SetTriggerState((value) => value + 1);
    }
    //console.log("Some Edge or Node deleted");
  },[edges, nodes, reactFlow, setEdges, setNodes]);

  // ensures that edges are redrawn if triggerState changes
  useEffect(() => {
    setEdges((eds) => 
      //return new object (but indentical to the previous) to indicate to reactflow to redraw
      eds.map((edge) => ({...edge})),
    );
  }, [triggerState, setEdges]);

  const fitViewToDiagram = useCallback(() => {
    const NodesBounds=reactFlow.getNodes().map((node) => ({id: node.id, rect: reactFlow.getNodesBounds([node.id])}));
    const Bounds=getAdaptedBounds(reactFlow, NodesBounds);
    setTimeout(() => {
      reactFlow.fitBounds(Bounds, {duration: 0});
    }, 1);
  }, [reactFlow]);

  const toggleSelectionMode = useCallback(() => {
    setPanOnDrag((enabled) => !enabled);
  }, []);

  const deleteSelectedElements = useCallback(() => {
    reactFlow.deleteElements({nodes: selectedNodes, edges: selectedEdges});
  }, [reactFlow, selectedEdges, selectedNodes]);

  const togglePathfinding = useCallback(() => {
    togglePF();
  }, [togglePF]);



  return (
    <div id="reactflowDiv" style={{borderColor: token.colorBorder}}>
      <ReactFlow
        ref={(element) => {
          drop(element);
        }}
        className={!panOnDrag ? "react-flow--multiselect" : undefined}
        data-testid="reactflow_pane"
        nodes={nodes}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
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
        onBeforeDelete={onBeforeDelete}
        onSelectionChange={onSelectionChange}
        snapToGrid={true}
        snapGrid={snapGrid}
        panOnDrag={panOnDrag}
        selectionOnDrag={!panOnDrag}
        fitView
      >
        <Background 
        variant={BackgroundVariant.Dots}
        offset={0}
        gap={16}
        />
        <SimulationOverlay />
        <FlowControls
          canRedo={undoRedo.canRedo}
          canUndo={undoRedo.canUndo}
          deleteSelectedTitle={t('tooltip.deleteSelected')}
          isPathfindingEnabled={PFEnabled}
          isSelectionModeEnabled={!panOnDrag}
          onDeleteSelected={deleteSelectedElements}
          onFitView={fitViewToDiagram}
          onRedo={undoRedo.redo}
          onTogglePathfinding={togglePathfinding}
          onToggleSelectionMode={toggleSelectionMode}
          onUndo={undoRedo.undo}
          selectMultiTitle={t('tooltip.selectMulti')}
          switchConnectionLineTitle={t('tooltip.switchConnLineType')}
        />

        { nodes.length === 0 &&
          <Panel position="top-center">
            <div
              style={{
                alignItems: "center",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontSize: 16,
                  color: token.colorText,
                }}
              >{t('dragComponents')}</span>
              <Select
                showSearch
                placeholder={t('sidebar.export.selectExample')}
                optionFilterProp="label"
                style={{minWidth: 280}}
                options={exampleOptions.map((option) => ({
                  label: t(option.labelKey),
                  value: option.value,
                }))}
                onSelect={(value) => {
                  loadModelFromLink(value);
                }}
              />
            </div>
          </Panel>
        }
      </ReactFlow>
    </div>
  );
});

FlowCanvas.displayName = "FlowCanvas";

const FlowApp = () => {
  const [messageApi, messageContextHolder] = message.useMessage();
  const [notificationApi, notificationContextHolder] = notification.useNotification();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const [isLegalNoticeModalOpen, setIsLegalNoticeModalOpen] = useState(false);
  const [isDataPrivacyModalOpen, setIsDataPrivacyModalOpen] = useState(false);
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [isLinksModalOpen, setIsLinksModalOpen] = useState(false);
  const flowCanvasRef = useRef<FlowCanvasHandle | null>(null);
  const {t} = useTranslation(['main']);
  const { token } = theme.useToken();

  const getDiagramSnapshot = useCallback((): DiagramSnapshot => (
    flowCanvasRef.current?.getDiagramSnapshot() ?? { nodes: [], edges: [] }
  ), []);

  const restoreDiagramSnapshot = useCallback((snapshot: DiagramSnapshot) => {
    flowCanvasRef.current?.restoreDiagramSnapshot(snapshot);
  }, []);

  const undoRedo = useUndoRedoController({
    getSnapshot: getDiagramSnapshot,
    restoreSnapshot: restoreDiagramSnapshot,
  });

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
      <UndoRedoProvider value={undoRedo}>
        {messageContextHolder}
        {notificationContextHolder}
        {modalContextHolder}
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
            <FlowCanvas
              ref={flowCanvasRef}
              undoRedo={undoRedo}
              messageApi={messageApi}
              notificationApi={notificationApi}
              modalApi={modalApi}
            />
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
            {ENABLE_COMPONENT_EDITOR_FOOTER_LINK && (
              <Button
                type="link"
                onClick={() => {
                  window.location.href = './?componentEditor=1';
                }}
              >{t('componentEditor.title')}</Button>
            )}
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
      </UndoRedoProvider>
    </ConfigProvider>
  );
};

const App = () => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('componentEditor') === '1') {
    return (
      <Suspense fallback={null}>
        <ComponentEditorApp />
      </Suspense>
    );
  }

  return (
    <ReactFlowProvider>
      <DndProvider options={HTML5toTouch}>
        <ComponentDragPreviewLayer />
        <FlowApp />
      </DndProvider>
    </ReactFlowProvider>
  );
};

export default App;
