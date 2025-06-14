import { useEffect } from 'react';
import { ConnectionLineComponentProps, useConnection, useReactFlow} from '@xyflow/react';
import { ComponentDataType, edgePoint, DirectionType} from '../types';

import {postypeToAdjustedXYConn, getNearestEdgePoint, nearestPoint, rotatePrefferedLineDirection} from "../utils/utils_functions.ts";

import {createMatrix, getPathResult, buildPath, useZustandStore} from "../utils/pathfinder_functions.ts";

import {GridNode} from "../utils/astar.ts";

export default ({ fromX, fromY, toX, toY }:ConnectionLineComponentProps) => {
  const connection = useConnection();
  const reactFlow=useReactFlow();

  const PFEnabled=useZustandStore((state)=>state.pathFindingEnabled);

  const DEBUGMODE=0;
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
  //console.log(fromXadapted, fromYadapted);

  let fromHandle_prefferedLineDirectionRotated=rotatePrefferedLineDirection(sourceHandle?.prefferedLineDirection, fromNodeData.rotation);
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
    toHandle_prefferedLineDirectionRotated=rotatePrefferedLineDirection(targetHandle?.prefferedLineDirection, toNodeData.rotation);
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

  useEffect(() => {
      //useZustandStore((state)=>state.setNearestPoint(retval));
      useZustandStore.setState({nearestPoint:retval});
    }, [retval]);

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
    const myPath = buildPath(edges, result, matrix, x_arr, y_arr, fromXadapted, fromYadapted, toXadapted, toYadapted, start_matrix_index_x, start_matrix_index_y);
    //console.log("ConnLine myPath: ", myPath);

    // build PathStroke for ConnectionLine
    myPathStroke=`M${myPath[0].x},${myPath[0].y}`;
    for(let i=1; i<myPath.length; i++) {
      myPathStroke=myPathStroke+` L${myPath[i].x},${myPath[i].y}`
    }

    // build edgePoints array that will be passed to the edge Constructor on onConnectEnd
    if(myPath.length>2) {
      for(let i=1; i<myPath.length-1; i++) {
        edgePoints.push({x:myPath[i].x, y:myPath[i].y});
      }
    }
  }

  useEffect(() => {
      useZustandStore.setState({edgePoints:edgePoints});
    }, [edgePoints]);


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
      {DEBUGMODE && x_arr.map((x)=>{
        return <line x1={String(x)} y1={String(y_arr[0])} x2={String(x)} y2={String(y_arr[y_arr.length-1])} stroke="red" stroke-width="0.5"/>;
      })
      }
      {DEBUGMODE && y_arr.map((y)=>{
        return <line x1={String(x_arr[0])} y1={String(y)} x2={String(x_arr[x_arr.length-1])} y2={String(y)} stroke="red" stroke-width="0.5"/>;
      })
      }
      {
        DEBUGMODE && matrix[0].map((_, row_index) => {
          return matrix.map((_, col_index) => {
            if (matrix[col_index][row_index]==0) {
            return <rect width={x_arr[col_index+1]-x_arr[col_index]} height={y_arr[row_index+1]-y_arr[row_index]} x={x_arr[col_index]} y={y_arr[row_index]} rx="0" ry="0" fill="blue" fillOpacity="0.2"/>
            } else {
              return <></>
            }
          })
        })
      }
      { DEBUGMODE && result &&
        result.map((obj)=>{
          return <rect width={x_arr[obj.x+1]-x_arr[obj.x]} height={y_arr[obj.y+1]-y_arr[obj.y]} x={x_arr[obj.x]} y={y_arr[obj.y]} rx="0" ry="0" fill="green" fillOpacity="0.2"/>
        })
      }
      { DEBUGMODE && <rect width={x_arr[start_matrix_index_x+1]-x_arr[start_matrix_index_x]} height={y_arr[start_matrix_index_y+1]-y_arr[start_matrix_index_y]} x={x_arr[start_matrix_index_x]} y={y_arr[start_matrix_index_y]} rx="0" ry="0" fill="black" fillOpacity="0.4"/>
      }
    </g>
  );
};
