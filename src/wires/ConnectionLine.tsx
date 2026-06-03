import { useEffect } from 'react';
import { ConnectionLineComponentProps, useConnection, useReactFlow} from '@xyflow/react';
import { ComponentDataType, edgePoint, DirectionType} from '../types';

import {postypeToAdjustedXYConn, getNearestEdgePoint, nearestPoint, getRenderedWireEndpoint} from "../utils/utils_functions.ts";

import {
  createMatrix,
  getPathResult,
  buildPath,
  endpointLineDirection,
  useZustandStore,
  normalizePathfinderWireRoute,
  findNonOrthogonalPathfinderRouteSegments,
} from "../utils/pathfinder_functions.ts";

import {GridNode} from "../utils/astar.ts";

const sameNumber = (a: number | undefined, b: number | undefined) => (
  Object.is(a, b)
);

const sameNearestPoint = (a: nearestPoint, b: nearestPoint) => (
  a.pType === b.pType &&
  sameNumber(a.x, b.x) &&
  sameNumber(a.y, b.y) &&
  a.edgeID === b.edgeID &&
  a.segmentNumber === b.segmentNumber &&
  sameNumber(a.distance, b.distance) &&
  a.color === b.color
);

const sameEdgePoints = (a: edgePoint[], b: edgePoint[]) => (
  a.length === b.length &&
  a.every((point, index) => (
    sameNumber(point.x, b[index].x) &&
    sameNumber(point.y, b[index].y) &&
    point.active === b[index].active
  ))
);

const edgePointsKey = (points: edgePoint[]) => (
  points
    .map((point) => `${String(point.x)}:${String(point.y)}:${String(point.active)}`)
    .join('|')
);

const numberFromKey = (value: string) => (
  value === 'NaN' ? NaN : Number(value)
);

const activeFromKey = (value: string) => (
  value === 'undefined' ? undefined : Number(value)
);

const edgePointsFromKey = (key: string) => (
  key === ''
    ? []
    : key.split('|').map((pointKey) => {
      const [x, y, active] = pointKey.split(':');
      return {
        x: numberFromKey(x),
        y: numberFromKey(y),
        active: activeFromKey(active),
      } as edgePoint;
    })
);


const ConnectionLine = ({ fromX, fromY, toX, toY }:ConnectionLineComponentProps) => {
  const connection = useConnection();
  const reactFlow=useReactFlow();

  const PFEnabled=useZustandStore((state)=>state.pathFindingEnabled);

  const DEBUGMODE=false;
  let myPathStroke="";
  let x_arr=[] as number[];
  let y_arr=[] as number[];
  let result: (GridNode[] | undefined) =[] as GridNode[];
  let matrix=Array(2).fill(null).map(() => Array(2).fill(1));
  let start_matrix_index_x=0;
  let start_matrix_index_y=0;  

  let fromXadapted = fromX;
  let fromYadapted = fromY;
  let toXadapted = toX;
  let toYadapted = toY;

  const fromNodeData = connection.fromNode?.data as ComponentDataType;
  const fromHandleId = connection.fromHandle?.id;
  let sourceHandle=fromNodeData.handles?.find((handleData)=>(handleData.hid===fromHandleId));
  if(!sourceHandle) {
    sourceHandle=fromNodeData.repeatedHandleArray?.find((handleData)=>(handleData.hid===fromHandleId));
  }
  // adapt start since in reactflow connection line is always from the middle of the handle
  [fromXadapted, fromYadapted] = postypeToAdjustedXYConn(
      (sourceHandle?.postype || "left"),
      fromX,
      fromY,
      sourceHandle?.width || 0,
      sourceHandle?.height || 0,
      fromNodeData.rotation
    );
  const renderedSourceEndpoint = getRenderedWireEndpoint(connection.fromNode ?? undefined, fromHandleId);
  if(renderedSourceEndpoint) {
    fromXadapted = renderedSourceEndpoint.x;
    fromYadapted = renderedSourceEndpoint.y;
  }
  //console.log(fromXadapted, fromYadapted);

  let fromHandle_prefferedLineDirectionRotated=endpointLineDirection(connection.fromNode ?? undefined, sourceHandle, fromXadapted, fromYadapted);
  let toHandle_prefferedLineDirectionRotated=undefined as DirectionType;

  if(connection.toNode) {
    const toNodeData = connection.toNode?.data as ComponentDataType;
    const toHandleId = connection.toHandle?.id;
    let targetHandle=toNodeData.handles?.find((handleData)=>(handleData.hid===toHandleId));
    if(!targetHandle) {
        targetHandle=toNodeData.repeatedHandleArray?.find((handleData)=>(handleData.hid===toHandleId));
    }
    // adapt end since in reactflow connection line is always from the middle of the handle
    [toXadapted, toYadapted] = postypeToAdjustedXYConn(
      (targetHandle?.postype || "left"),
      toX,
      toY,
      targetHandle?.width || 0,
      targetHandle?.height || 0,
      toNodeData.rotation
    );
    const renderedTargetEndpoint = getRenderedWireEndpoint(connection.toNode ?? undefined, toHandleId);
    if(renderedTargetEndpoint) {
      toXadapted = renderedTargetEndpoint.x;
      toYadapted = renderedTargetEndpoint.y;
    }
    toHandle_prefferedLineDirectionRotated=endpointLineDirection(connection.toNode ?? undefined, targetHandle, toXadapted, toYadapted);
  }

  let retval={pType: undefined, x:0, y:0, edgeID:"",  segmentNumber: 0, distance: 1000,  color: ""} as nearestPoint;

  if(!connection.toHandle) {
    const edges=reactFlow.getEdges();
    //console.log("ConnLineCall", fromXadapted, fromYadapted);
    //console.log(toX, toY, edges, fromXadapted, fromYadapted);
    retval=getNearestEdgePoint(toX, toY, edges, fromXadapted, fromYadapted);
    if(retval.pType!=undefined) {
      toXadapted=retval.x;
      toYadapted=retval.y;
    }
  }

  const retvalPType = retval.pType;
  const retvalX = retval.x;
  const retvalY = retval.y;
  const retvalEdgeID = retval.edgeID;
  const retvalSegmentNumber = retval.segmentNumber;
  const retvalDistance = retval.distance;
  const retvalColor = retval.color;

  useEffect(() => {
      const nearestPointForStore = {
        pType: retvalPType,
        x: retvalX,
        y: retvalY,
        edgeID: retvalEdgeID,
        segmentNumber: retvalSegmentNumber,
        distance: retvalDistance,
        color: retvalColor,
      } as nearestPoint;

      useZustandStore.setState((state) => {
        if (sameNearestPoint(state.nearestPoint, nearestPointForStore)) {
          return state;
        }
        return {nearestPoint: nearestPointForStore};
      });
    }, [retvalPType, retvalX, retvalY, retvalEdgeID, retvalSegmentNumber, retvalDistance, retvalColor]);

  const edgePoints=[] as edgePoint[];

  // if pathfindind enabled, then do it
  if(PFEnabled) {
    const nodes = reactFlow.getNodes();
    const fromNode=nodes.find((node)=>node.id==connection.fromNode?.id);
    const toNode=nodes.find((node)=>node.id==connection.toNode?.id);

    // first create matrix and two arrays to represent areas
    const rev=createMatrix(nodes);
    x_arr = rev.x_arr;
    y_arr = rev.y_arr;
    matrix = rev.matrix;

    //find path using modified A-Star algorithm (return areas on the matrix)
    const rev1=getPathResult(matrix, x_arr, y_arr, fromNode, toNode, fromXadapted, fromYadapted, toXadapted, toYadapted, fromHandle_prefferedLineDirectionRotated, toHandle_prefferedLineDirectionRotated);
    result=rev1.result;
    start_matrix_index_x=rev1.start_matrix_index_x;
    start_matrix_index_y=rev1.start_matrix_index_y;

    // build path itself from the result
    const edges=reactFlow.getEdges();
    const myPath = buildPath(
      edges,
      result,
      matrix,
      x_arr,
      y_arr,
      fromXadapted,
      fromYadapted,
      toXadapted,
      toYadapted,
      start_matrix_index_x,
      start_matrix_index_y,
      {
        obstacleRects: rev.obstacleRects,
        sourceNodeId: connection.fromNode?.id,
        targetNodeId: connection.toNode?.id,
        sourceDirection: fromHandle_prefferedLineDirectionRotated,
        targetDirection: toHandle_prefferedLineDirectionRotated,
      },
    );
    const route = normalizePathfinderWireRoute(
      {x: fromXadapted, y: fromYadapted},
      {x: toXadapted, y: toYadapted},
      myPath.slice(1, -1).map((point) => ({x: point.x, y: point.y})),
      fromHandle_prefferedLineDirectionRotated,
      toHandle_prefferedLineDirectionRotated,
    );
    const routeDiagnostics = findNonOrthogonalPathfinderRouteSegments(route);
    if(import.meta.env.DEV && routeDiagnostics.length>0) {
      console.warn('[wire-routing] non-orthogonal connection preview route', routeDiagnostics);
    }
    const normalizedPath = [
      route.startXY,
      ...route.edgePoints.map((point) => ({x: point.x, y: point.y})),
      route.endXY,
    ];
    //console.log("ConnLine myPath: ", myPath);

    // build PathStroke for ConnectionLine
    myPathStroke=`M${normalizedPath[0].x},${normalizedPath[0].y}`;
    for(let i=1; i<normalizedPath.length; i++) {
      myPathStroke=myPathStroke+` L${normalizedPath[i].x},${normalizedPath[i].y}`
    }

    // build edgePoints array that will be passed to the edge Constructor on onConnectEnd
    if(route.edgePoints.length>0) {
      route.edgePoints.forEach((point) => {
        edgePoints.push(point);
      });
    }
  }

  const edgePointsSignature = edgePointsKey(edgePoints);

  useEffect(() => {
      const edgePointsForStore = edgePointsFromKey(edgePointsSignature);

      useZustandStore.setState((state) => {
        if (sameEdgePoints(state.edgePoints, edgePointsForStore)) {
          return state;
        }
        return {edgePoints: edgePointsForStore};
      });
    }, [edgePointsSignature]);


  return (
    <g>
      {PFEnabled && <path
        fill="none"
        stroke={"gray"}
        strokeWidth={2}
        d={myPathStroke}
      />}
      {retval.pType!=undefined && <circle
        cx={retval.x}
        cy={retval.y}
        fill={retval.color}
        r={4}
        stroke={retval.color}
        strokeWidth={1.5}
      />
      }
      { (DEBUGMODE || !PFEnabled) && <path
        fill="none"
        stroke={"gray"}
        strokeWidth={1}
        d={`M${fromXadapted},${fromYadapted} L ${toXadapted},${toYadapted}`}
      />
      }
      {DEBUGMODE && x_arr.map((x, index)=>{
        return <line key={`debug-x-${index}-${x}`} x1={String(x)} y1={String(y_arr[0])} x2={String(x)} y2={String(y_arr[y_arr.length-1])} stroke="red" strokeWidth="0.5"/>;
      })
      }
      {DEBUGMODE && y_arr.map((y, index)=>{
        return <line key={`debug-y-${index}-${y}`} x1={String(x_arr[0])} y1={String(y)} x2={String(x_arr[x_arr.length-1])} y2={String(y)} stroke="red" strokeWidth="0.5"/>;
      })
      }
      {
        DEBUGMODE && matrix[0].map((_, row_index) => {
          return matrix.map((_, col_index) => {
            if (matrix[col_index][row_index]==0) {
            return <rect key={`debug-matrix-${col_index}-${row_index}`} width={x_arr[col_index+1]-x_arr[col_index]} height={y_arr[row_index+1]-y_arr[row_index]} x={x_arr[col_index]} y={y_arr[row_index]} rx="0" ry="0" fill="blue" fillOpacity="0.2"/>
            } else {
              return null
            }
          })
        })
      }
      { DEBUGMODE && result &&
        result.map((obj, index)=>{
          return <rect key={`debug-result-${index}-${obj.x}-${obj.y}`} width={x_arr[obj.x+1]-x_arr[obj.x]} height={y_arr[obj.y+1]-y_arr[obj.y]} x={x_arr[obj.x]} y={y_arr[obj.y]} rx="0" ry="0" fill="green" fillOpacity="0.2"/>
        })
      }
      { DEBUGMODE && <rect width={x_arr[start_matrix_index_x+1]-x_arr[start_matrix_index_x]} height={y_arr[start_matrix_index_y+1]-y_arr[start_matrix_index_y]} x={x_arr[start_matrix_index_x]} y={y_arr[start_matrix_index_y]} rx="0" ry="0" fill="black" fillOpacity="0.4"/>
      }
    </g>
  );
};

export default ConnectionLine;
