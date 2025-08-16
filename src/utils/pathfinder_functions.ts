import {type Node, type Edge, ReactFlowInstance} from '@xyflow/react';
import {ComponentDataType, type edgePoint, type EdgeDataType, ImageDataType, DirectionType} from '../types';

import {Graph, astar, GridNode} from "../utils/astar.ts"
import { create } from 'zustand';

import { pDistance, type nearestPoint, postypeToAdjustedXYConn, rotatePrefferedLineDirection, getHandleMiddleRealPosition} from './utils_functions.ts';

// ZustandStore  is used to save the state of pathFindingEnabled switch and pass data from ConnectionLine
// to onConnectEnd()
export interface PFState {
  pathFindingEnabled: boolean,
  enablePF: () => void,
  disablePF: () => void,
  togglePF: () => void,
  edgePoints: edgePoint[];
  nearestPoint: nearestPoint;
  setEdgePoint: (newEdgePoints: edgePoint[]) => void;
  setNearestPoint: (newNearestPoint: nearestPoint) => void;
}

export const useZustandStore = create<PFState>((set) => ({
  pathFindingEnabled: true, // true: default connection line is pathfinder type (false: just straight line from handle to handle)
  enablePF: () => set(() => ({ pathFindingEnabled: true})),
  disablePF: () => set(() => ({ pathFindingEnabled: false})),
  togglePF: () => set((state) => ({ pathFindingEnabled: !state.pathFindingEnabled})),
  edgePoints: [] as edgePoint[],
  nearestPoint: {pType: undefined, x:0, y:0, edgeID: "", segmentNumber: 0, distance:0, color: "black"} as nearestPoint,
  setEdgePoint: (newEdgePoints) => set(() => ({ edgePoints: newEdgePoints})),
  setNearestPoint: (newNearestPoint) =>set(() => ({ nearestPoint: newNearestPoint})),
}))


export function findLastIndex<T>(array: Array<T>, predicate: (value: T, index: number, obj: T[]) => boolean): number {
    let l = array.length;
    while (l--) {
        if (predicate(array[l], l, array))
            return l;
    }
    return -1;
}

export function getMatrixIndexForNodeHandle(nodeDim: {x:number, y:number, w:number, h:number}, nodeTechnicalId: string, x:number, y:number, x_arr: number[], y_arr: number[], prefferedLineDirection: DirectionType, matrix: number[][]) {
  const x0 = nodeDim.x;
  const y0 = nodeDim.y;
  const x1 = nodeDim.x+nodeDim.w;
  const y1 = nodeDim.y+nodeDim.h;
  //console.log([x0,y0],[x1,y1],[fromXadapted, fromYadapted]);
  let dist_left=pDistance(x, y, x0, y0, x0, y1)[0];
  let dist_right=pDistance(x, y, x1, y0, x1, y1)[0];
  let dist_top=pDistance(x, y, x0, y0, x1, y0)[0];
  let dist_bottom=pDistance(x, y, x0, y1, x1, y1)[0]
  // if direction is predefined by the handle prefferedLineDirection, then use it
  if(prefferedLineDirection) {
    // set respective direction distance to 0, others  at least 1
    if(prefferedLineDirection=="left") {dist_left=0; dist_right=Math.max(1,dist_right); dist_top=Math.max(1,dist_top); dist_bottom=Math.max(1,dist_bottom);}
    if(prefferedLineDirection=="right") {dist_left=Math.max(1,dist_left); dist_right=0; dist_top=Math.max(1,dist_top); dist_bottom=Math.max(1,dist_bottom);}
    if(prefferedLineDirection=="up") {dist_left=Math.max(1,dist_left); dist_right=Math.max(1,dist_right); dist_top=0; dist_bottom=Math.max(1,dist_bottom);}
    if(prefferedLineDirection=="down") {dist_left=Math.max(1,dist_left); dist_right=Math.max(1,dist_right); dist_top=Math.max(1,dist_top); dist_bottom=0;}
  }
  let matrix_index_x=0;
  let matrix_index_y=0;
  if(nodeTechnicalId=="SolderJoint") {
    matrix_index_x = findLastIndex(x_arr, (element)=>element<=x);
    matrix_index_y = findLastIndex(y_arr, (element)=>element<=y);
    return [matrix_index_x, matrix_index_y];
  }
  //console.log("Dist: ", dist_left, dist_right, dist_top, dist_bottom);
  if(dist_left<dist_right && dist_left<dist_top && dist_left<dist_bottom) {
    // left is smallest distance
    // special case: if (x,y) is left from x0 (left node border), then the handle is outside of node (probably special case of selectedField with image outside of node)
    // then take next matrix on the left of x, otherwise on the left of x0
    matrix_index_x = findLastIndex(x_arr, (element)=>element<=Math.min(x0,x))-1;
    if(matrix_index_x<0) matrix_index_x=0;
    matrix_index_y = findLastIndex(y_arr, (element)=>element<=y);
    while(matrix[matrix_index_x][matrix_index_y]==0) {
      matrix_index_x=matrix_index_x-1;
    }
  } else if(dist_right<dist_top && dist_right<dist_bottom) {
    // right is smallest distance
    matrix_index_x = x_arr.findIndex((element)=>element>Math.max(x,x1));
    matrix_index_y = findLastIndex(y_arr, (element)=>element<=y);
    if(matrix_index_x>=matrix.length) matrix_index_x=matrix.length-1;
    //console.log("matrix_index_x, matrix_index_y:", matrix_index_x, matrix_index_y);
    //console.log(matrix.length, matrix[0].length);
    while(matrix[matrix_index_x][matrix_index_y]==0) {
      matrix_index_x=matrix_index_x+1;
    }
  } else if(dist_top<dist_bottom) {
    // top is smallest distance
    matrix_index_x = findLastIndex(x_arr, (element)=>element<=x);
    matrix_index_y = findLastIndex(y_arr, (element)=>element<=Math.min(y0,y))-1;
    while(matrix[matrix_index_x][matrix_index_y]==0) {
      matrix_index_y=matrix_index_y-1;
    }
  } else {
    // bottom is smallest distance
    matrix_index_x = findLastIndex(x_arr, (element)=>element<=x);
    matrix_index_y = y_arr.findIndex((element)=>element>Math.max(y,y1));
    while(matrix[matrix_index_x][matrix_index_y]==0) {
      matrix_index_y=matrix_index_y+1;
    }
  }
  return [matrix_index_x, matrix_index_y]
}

type optm = {
  x0: number,
  y0: number, 
  x1: number,
  y1: number,
}

function getOptionImgXY(option_x: number, option_y:number, node_position_x: number,
          node_position_y:number,opt_img_width: number, opt_img_height: number,
          nodeLength: number, nodeBasicSizeX: number, nodeBasicSizeY: number, nodeRotation: number, MARGIN:number): optm {
  let opt_x0=option_x + node_position_x;
  let opt_y0=option_y + node_position_y;
  let opt_x1=opt_x0 + opt_img_width;
  let opt_y1=opt_y0 + opt_img_height;
  //console.log("opt x0,y0,x1,y1",opt_x0,opt_y0,opt_x1, opt_y1)

  if(nodeRotation==180) {
    opt_x1=nodeLength*nodeBasicSizeX-option_x + node_position_x;
    opt_y1=nodeBasicSizeY-option_y + node_position_y;
    opt_x0=opt_x1-opt_img_width;
    opt_y0=opt_y1 - opt_img_height;
  }
  if(nodeRotation==90) {
    opt_x1 = node_position_x + nodeBasicSizeY - option_y;
    opt_x0=opt_x1-opt_img_height;
    opt_y0=node_position_y + option_x;
    opt_y1=opt_y0+opt_img_width;
  }
  if(nodeRotation==270) {
    opt_x0 = node_position_x + option_y;
    opt_x1 = opt_x0 + opt_img_height;
    opt_y1 = node_position_y + nodeLength*nodeBasicSizeX - option_x;
    opt_y0 = opt_y1-opt_img_width;
  }
  // with marging
  const optm_x0=Math.round((opt_x0-MARGIN)*32)/32;
  const optm_y0=Math.round((opt_y0-MARGIN)*32)/32;
  const optm_x1=Math.round((opt_x1+MARGIN)*32)/32;
  const optm_y1=Math.round((opt_y1+MARGIN)*32)/32;

  return {x0: optm_x0, y0: optm_y0, x1: optm_x1, y1: optm_y1} as optm;
  
}

export function createMatrix(nodes:Node[]):{x_arr: number[], y_arr:number[], matrix:number[][]} {
  let x_arr=[] as number[];
  let y_arr=[] as number[];
  let matrix=Array(2).fill(null).map(() => Array(2).fill(1));

  const MARGIN=5;
  let x_arr_1=[] as number[];
  let y_arr_1=[] as number[];
  nodes.forEach((node)=>{
    if(node.data?.technicalID!="SolderJoint" && node.data?.technicalID!="InfoNode" && node.data?.technicalID!="WireInfoNode") {
      
      
      const x0=Math.round((node.position.x-MARGIN)*32)/32;
      const y0=Math.round((node.position.y-MARGIN)*32)/32;
      const x1=Math.round((node.position.x+(node.measured?.width || node.width || 0)+MARGIN)*32)/32;
      const y1=Math.round((node.position.y+(node.measured?.height || node.height || 0)+MARGIN)*32)/32;
      if(!x_arr_1.includes(x0)) x_arr_1.push(x0);
      if(!y_arr_1.includes(y0)) y_arr_1.push(y0);
      if(!x_arr_1.includes(x1)) x_arr_1.push(x1);
      if(!y_arr_1.includes(y1)) y_arr_1.push(y1);

      const nodeRotation=(node.data as ComponentDataType).rotation;
      const nodeLength=(node.data as ComponentDataType).nodeLength || 1;
      const nodeBasicSizeX=(node.data as ComponentDataType).image?.width || 0;
      const nodeBasicSizeY=(node.data as ComponentDataType).image?.height || 0;
      // nodes may have selectFields with some options (when selected) drawing  picture outside of node bounds
      // in this case we have to handle them as nodes
      (node.data as ComponentDataType).selectFields?.forEach((selectField)=> {
        // get the option selected
        if(selectField.customImage) {
          //console.log("Option", selectField.technicalID);
          const option=selectField.options.find((option)=>option.value==selectField.selectedValue);
          const opt_img_width=((option?.img as ImageDataType).width || 0);
          const opt_img_height=((option?.img as ImageDataType).height || 0);
          if(opt_img_width>0 && opt_img_height>0 && ((option?.x || 0)<0 || (option?.x || 0)+opt_img_width>nodeLength*nodeBasicSizeX || (option?.y || 0)<0 || (option?.y || 0)+opt_img_height>nodeBasicSizeY)) {

            // get option Image coord considering margin and node rotation
            const optm=getOptionImgXY((option?.x || 0), (option?.y || 0), node.position.x, node.position.y, opt_img_width, opt_img_height, nodeLength, nodeBasicSizeX, nodeBasicSizeY, nodeRotation, MARGIN);
            // add only if not already there and if it is not inside of the parent node
            // to avoid not needed lines
            if(!x_arr_1.includes(optm.x0) && !(optm.x0>x0 && optm.x0<x1 && optm.y0>y0 && optm.y1<y1)) x_arr_1.push(optm.x0);
            if(!y_arr_1.includes(optm.y0) && !(optm.y0>y0 && optm.y0<y1 && optm.x0>x0 && optm.x1<x1)) y_arr_1.push(optm.y0);
            if(!x_arr_1.includes(optm.x1) && !(optm.x1>x0 && optm.x1<x1 && optm.y0>y0 && optm.y1<y1)) x_arr_1.push(optm.x1);
            if(!y_arr_1.includes(optm.y1) && !(optm.y1>y0 && optm.y1<y1 && optm.x0>x0 && optm.x1<x1)) y_arr_1.push(optm.y1);
          }
        }
      })
    }

  })
  // additionally consider solder joints if they outside the grid, add grid lines
  nodes.forEach((node)=>{
    if(node.data?.technicalID=="SolderJoint") {
      const x0=Math.round((node.position.x-MARGIN)*32)/32;
      const y0=Math.round((node.position.y-MARGIN)*32)/32;
      if(x0>Math.max(...x_arr_1) || x0<Math.min(...x_arr_1)) x_arr_1.push(x0);
      if(y0>Math.max(...y_arr_1) || y0<Math.min(...y_arr_1)) y_arr_1.push(y0);
    }
  })
  x_arr=x_arr_1.sort((a,b)=>a-b);
  //console.log("xarr", x_arr);
  y_arr=y_arr_1.sort((a,b)=>a-b);
  //console.log("yarr", y_arr);
    // add additionally more space on each side
  const ADDSPACE=60;
  x_arr.unshift(x_arr[0]-ADDSPACE);
  x_arr.push(x_arr[x_arr.length-1]+ADDSPACE);
  y_arr.unshift(y_arr[0]-ADDSPACE);
  y_arr.push(y_arr[y_arr.length-1]+ADDSPACE);

  matrix=Array(x_arr.length-1).fill(null).map(() => Array(y_arr.length-1).fill(1));
  // define overlaps (matrix elements where there is a node or part of the node)
  const MARGIN1=MARGIN-1; // must be smaller
  nodes.forEach((node)=>{
    if(node.data?.technicalID!="SolderJoint" && node.data?.technicalID!="InfoNode" && node.data?.technicalID!="WireInfoNode") {
      const x0=Math.round((node.position.x-MARGIN1)*32)/32;
      const y0=Math.round((node.position.y-MARGIN1)*32)/32;
      const x1=Math.round((node.position.x+(node.measured?.width || node.width || 0)+MARGIN1)*32)/32;
      const y1=Math.round((node.position.y+(node.measured?.height || node.height || 0)+MARGIN1)*32)/32;
      const first_x_index = x_arr.findIndex((element) => element > x0)-1;
      const last_x_index = findLastIndex(x_arr,(element) => element < x1);
      //console.log(x_arr, x0, first_x_index, x1, last_x_index);
      const first_y_index = y_arr.findIndex((element) => element > y0)-1;
      const last_y_index = findLastIndex(y_arr,(element) => element < y1);
      //console.log("idx: ", first_x_index, last_x_index, first_y_index, last_y_index);
      if(first_x_index>=0 && last_x_index>=0 && first_y_index>=0 && last_y_index>=0) {
        for(let i=0; i<x_arr.length; i++) { // i is x dimension
          for(let j=0; j<x_arr.length; j++) { // j is 
            if (i>=first_x_index && i<=last_x_index && j>=first_y_index && j<=last_y_index) {
              matrix[i][j]=0;
            }
          }
        }
      }
      const nodeRotation=(node.data as ComponentDataType).rotation;
      const nodeLength=(node.data as ComponentDataType).nodeLength || 1;
      const nodeBasicSizeX=(node.data as ComponentDataType).image?.width || 0;
      const nodeBasicSizeY=(node.data as ComponentDataType).image?.height || 0;
      (node.data as ComponentDataType).selectFields?.forEach((selectField)=> {
        if(selectField.customImage) {
          //console.log("Option", selectField.technicalID);
          const option=selectField.options.find((option)=>option.value==selectField.selectedValue);
          const opt_img_width=((option?.img as ImageDataType).width || 0);
          const opt_img_height=((option?.img as ImageDataType).height || 0);
          if(opt_img_width>0 && opt_img_height>0 && ((option?.x || 0)<0 || (option?.x || 0)+opt_img_width>nodeLength*nodeBasicSizeX || (option?.y || 0)<0 || (option?.y || 0)+opt_img_height>nodeBasicSizeY)) {

            // get option Image coord considering margin and node rotation
            const optm=getOptionImgXY((option?.x || 0), (option?.y || 0), node.position.x, node.position.y, opt_img_width, opt_img_height, nodeLength, nodeBasicSizeX, nodeBasicSizeY, nodeRotation, MARGIN1);
            const first_x_index = x_arr.findIndex((element) => element > optm.x0)-1;
            const last_x_index = findLastIndex(x_arr,(element) => element < optm.x1);
            //console.log(x_arr, optm.x0, first_x_index, optm.x1, last_x_index);
            const first_y_index = y_arr.findIndex((element) => element > optm.y0)-1;
            const last_y_index = findLastIndex(y_arr,(element) => element < optm.y1);
            //console.log("idx: ", first_x_index, last_x_index, first_y_index, last_y_index);
            if(first_x_index>=0 && last_x_index>=0 && first_y_index>=0 && last_y_index>=0) {
              for(let i=0; i<x_arr.length; i++) { // i is x dimension
                for(let j=0; j<x_arr.length; j++) { // j is 
                  if (i>=first_x_index && i<=last_x_index && j>=first_y_index && j<=last_y_index) {
                    matrix[i][j]=0;
                  }
                }
              }
            }
          }
        }
      });

    }
  })

  return {x_arr, y_arr, matrix};
}

export function getPathResult(matrix: number[][], x_arr: number[], y_arr: number[], fromNode:Node|undefined, toNode:Node|undefined, fromXadapted:number, fromYadapted:number, toXadapted: number, toYadapted:number, fromHandle_prefferedLineDirectionRotated: DirectionType, toHandle_prefferedLineDirectionRotated: DirectionType) {
  var graph = new Graph(matrix);
  //console.log("graph: ", graph.grid);
  // define start for astar algorithm
  // our starting point is fromXadapted; fromYadapted
  // the first segment will always go from starting point to the  border of the component that is closest to the starting point and then to the 
  // next free matrix element
  // first, lets find the border. Find distance from fromXadapted; fromYadapted to each border
  // TODO: special cases: (fromXadapted, fromYadapted) is outside of the node, SodlerJoint
  let result=undefined;
  let start_matrix_index_x=0;
  let start_matrix_index_y=0;  
  let end_matrix_index_x=0;
  let end_matrix_index_y=0;
  if(fromNode) {
    [start_matrix_index_x, start_matrix_index_y] = getMatrixIndexForNodeHandle(
      {x:fromNode.position.x, y: fromNode.position.y, w: (fromNode.measured?.width || fromNode.width || 0), h: (fromNode.measured?.height || fromNode.height || 0)},
      (fromNode.data as ComponentDataType).technicalID, fromXadapted, fromYadapted, x_arr, y_arr, fromHandle_prefferedLineDirectionRotated, matrix
    );
    var start = graph.grid[start_matrix_index_x][start_matrix_index_y];

    end_matrix_index_x=Math.min(Math.max(findLastIndex(x_arr, (element)=>element<=toXadapted),0),matrix.length-1);
    end_matrix_index_y=Math.min(Math.max(findLastIndex(y_arr, (element)=>element<=toYadapted),0),matrix[0].length-1);
    
    if(toNode) {
       [end_matrix_index_x, end_matrix_index_y] = getMatrixIndexForNodeHandle(
        {x: (toNode?.position.x || 0), y: (toNode?.position.y || 0), w: (toNode?.measured?.width || toNode?.width || 0), h: (toNode?.measured?.height || toNode?.height || 0)},
        (toNode?.data as ComponentDataType).technicalID, toXadapted, toYadapted, x_arr, y_arr, toHandle_prefferedLineDirectionRotated, matrix
      );
    }
    var end = graph.grid[end_matrix_index_x][end_matrix_index_y];
    result = astar.search(graph, start, end);   
  } 
  return {result, start_matrix_index_x, start_matrix_index_y, end_matrix_index_x, end_matrix_index_y};
}

export function buildPath(edges:Edge[], result:GridNode[]|undefined, matrix: number[][], x_arr: number[], y_arr: number[], fromXadapted:number, fromYadapted:number, toXadapted: number, toYadapted:number, start_matrix_index_x:number, start_matrix_index_y:number ){
  const myPath = [{x:fromXadapted, y:fromYadapted, xm: findLastIndex(x_arr, (element)=>element<=fromXadapted), ym: findLastIndex(y_arr, (element)=>element<=fromYadapted)}];
  //console.log(result);
  const STEPXY=15;

  if(result) {
    if(myPath[0].xm!=start_matrix_index_x || myPath[0].ym!=start_matrix_index_y) {
      let next_x=0;
      let next_y=0;
      if(start_matrix_index_x>myPath[0].xm) {
        // step from left to the right: keep y, define x
        next_y=myPath[0].y;
        next_x=(x_arr[start_matrix_index_x] + x_arr[start_matrix_index_x+1])/2;
        next_x=Math.min(x_arr[start_matrix_index_x] + STEPXY, next_x);
      }
      if(start_matrix_index_x<myPath[0].xm) {
        // step from right to the left: keep y, define x
        next_y=myPath[0].y;
        next_x=(x_arr[start_matrix_index_x] + x_arr[start_matrix_index_x+1])/2;
        next_x=Math.max(x_arr[start_matrix_index_x+1] - STEPXY, next_x);
      }
      if(start_matrix_index_y>myPath[0].ym) {
        // step top-down: keep x, define y
        next_x=myPath[0].x;
        next_y=(y_arr[start_matrix_index_y] + y_arr[start_matrix_index_y+1])/2;
        next_y=Math.min(y_arr[start_matrix_index_y] + STEPXY, next_y);
      }
      if(start_matrix_index_y<myPath[0].ym) {
        // step bottom-up: keep x, define y
        next_x=myPath[0].x;
        next_y=(y_arr[start_matrix_index_y] + y_arr[start_matrix_index_y+1])/2;
        next_y=Math.max(y_arr[start_matrix_index_y+1] - STEPXY, next_y);
      }
      myPath.push({x:next_x, y:next_y, xm: start_matrix_index_x, ym: start_matrix_index_y});
    }
    for(let i=0; i<result.length; i++) {
      let next_x=0;
      let next_y=0;
      if(result[i].direction?.[0]==1) {
        // step from left to the right: keep y, define x
        next_y=myPath[myPath.length-1].y;
        next_x=(x_arr[result[i].x] + x_arr[result[i].x+1])/2;
        next_x=Math.min(x_arr[result[i].x] + STEPXY, next_x);
      }
      if(result[i].direction?.[0]==-1) {
        // step from right to the left: keep y, define x
        next_y=myPath[myPath.length-1].y;
        next_x=(x_arr[result[i].x] + x_arr[result[i].x+1])/2;
        next_x=Math.max(x_arr[result[i].x+1] - STEPXY, next_x);
      }
      if(result[i].direction?.[1]==1) {
        // step top-down: keep x, define y
        next_x=myPath[myPath.length-1].x;
        next_y=(y_arr[result[i].y] + y_arr[result[i].y+1])/2;
        next_y=Math.min(y_arr[result[i].y] + STEPXY, next_y);
      }
      if(result[i].direction?.[1]==-1) {
        // step bottom-up: keep x, define y
        next_x=myPath[myPath.length-1].x;
        next_y=(y_arr[result[i].y] + y_arr[result[i].y+1])/2;
        next_y=Math.max(y_arr[result[i].y+1] - STEPXY, next_y);
      }
      myPath.push({x:next_x, y:next_y, xm: result[i].x, ym: result[i].y});
    }
    const toX_matrix_index=Math.min(Math.max(findLastIndex(x_arr, (element)=>element<=toXadapted),0),matrix.length-1);
    const toY_matrix_index=Math.min(Math.max(findLastIndex(y_arr, (element)=>element<=toYadapted),0),matrix[0].length-1);
    if(myPath[myPath.length-1].xm!=toX_matrix_index || myPath[myPath.length-1].ym!=toY_matrix_index) {
      myPath.push({x:toXadapted, y:toYadapted, xm: toX_matrix_index, ym: toY_matrix_index});
    } else {
      myPath[myPath.length-1].x=toXadapted;
      myPath[myPath.length-1].y=toYadapted;
    }
  } else {
    myPath.push({x:toXadapted, y:toYadapted, xm: findLastIndex(x_arr, (element)=>element<=toXadapted), ym: findLastIndex(y_arr, (element)=>element<=toYadapted)});
  }

  // "synchronise" coord from the end
  for(let i=myPath.length-1; i>1; i--) {
    if(myPath[i].xm==myPath[i-1].xm) myPath[i-1].x=myPath[i].x;
    if(myPath[i].ym==myPath[i-1].ym) myPath[i-1].y=myPath[i].y;
  }
  
  // check first segment, if it is not straight line, we must add a point
  if(myPath.length>1) {
    if(myPath[0].x!=myPath[1].x && myPath[0].y!=myPath[1].y) {
      if(myPath[0].xm==myPath[1].xm) {
        myPath.splice(1,0,{x: myPath[0].x, y: myPath[1].y, xm:myPath[1].xm, ym: myPath[1].ym});
      } else if (myPath[0].ym==myPath[1].ym) {
        myPath.splice(1,0,{x: myPath[1].x, y: myPath[0].y, xm:myPath[1].xm, ym: myPath[1].ym});
      }
    }
  }
  
  // check if a straigh line consist af many steps, delete inbetween points
  // in y direction (the same x coordinate one three edge points i, i+1, i+2)
  let i=0;
  while(i<myPath.length-2) {
    let deleted=true;
    while(deleted && i<myPath.length-2)
    if(myPath[i].x==myPath[i+1].x && myPath[i+1].x==myPath[i+2].x){
      myPath.splice(i+1,1);
    } else {
      deleted=false;
      i=i+1;
    }
  }
  // in x direction (the same y coordinate one three edge points i, i+1, i+2)
  i=0;
  while(i<myPath.length-2) {
    let deleted=true;
    while(deleted && i<myPath.length-2)
    if(myPath[i].y==myPath[i+1].y && myPath[i+1].y==myPath[i+2].y){
      myPath.splice(i+1,1);
    } else {
      deleted=false;
      i=i+1;
    }
  }

  // for all segments execpt the first and the last check if the segment would cover already existing another edge segment, then shift this line a little bit
  // cylce over 1...
  for(let i=1; i<myPath.length-2; i++) {
    const tx1=myPath[i].x;
    const tx2=myPath[i+1].x;
    const ty1=myPath[i].y;
    const ty2=myPath[i+1].y;
    // if x coordinates of the segment the same, then it is a vertical line
    if(tx1==tx2) {
      let covering=checkCoveringVertical(tx1, ty1, ty2, 3, edges);
      //console.log("Check Segment", tx1, ty1, ty2, covering);
      if(covering) {
        // define in what direction there is more space
        let direction=1; // positive direction per default
        let distanceInOtherDir=tx1-x_arr[myPath[i].xm];
        let distanceInMainDir=x_arr[myPath[i].xm+1]-tx1;
        if(distanceInOtherDir>distanceInMainDir) {
          // change direction and swap distances
          direction=-1;
          const temp=distanceInMainDir;
          distanceInMainDir=distanceInOtherDir;
          distanceInOtherDir=temp;
        }
        // make steps array (steps to try the shift)
        // first with bigger step
        let StepSize=8;
        let stepsInMainDir=Math.floor(distanceInMainDir/StepSize);
        let steps=[];
        for(let j=1; j<=stepsInMainDir; j++) steps.push(j*StepSize*direction);
        let stepsInOtherDir=Math.max((Math.floor(distanceInOtherDir/StepSize)-1),0);
        for(let j=1; j<=stepsInOtherDir; j++) steps.push(j*StepSize*direction*(-1));
        // second with smaller step
        StepSize=4;
        stepsInMainDir=Math.floor(distanceInMainDir/StepSize);
        for(let j=1; j<=stepsInMainDir; j++) steps.push(j*StepSize*direction);
        stepsInOtherDir=Math.max((Math.floor(distanceInOtherDir/StepSize)-1),0);
        for(let j=1; j<=stepsInOtherDir; j++) steps.push(j*StepSize*direction*(-1));
        // third with very small step
        StepSize=2;
        stepsInMainDir=Math.floor(distanceInMainDir/StepSize);
        for(let j=1; j<=stepsInMainDir; j++) steps.push(j*StepSize*direction);
        stepsInOtherDir=Math.max((Math.floor(distanceInOtherDir/StepSize)-1),0);
        for(let j=1; j<=stepsInOtherDir; j++) steps.push(j*StepSize*direction*(-1));
        //remove duplicates
        //console.log(steps);
        steps = [...new Set(steps)];
        //console.log(steps);
        for(let step_index=0; step_index<steps.length; step_index++) {
          covering=checkCoveringVertical(tx1+steps[step_index], ty1, ty2, 3, edges);
          if(!covering) {
            myPath[i].x=tx1+steps[step_index];
            myPath[i+1].x=myPath[i].x;
            break;
          }
        }
      }
    }
    // if y coordinates of the segment the same, then it is a horizontal line
    if(ty1==ty2) {
      let covering=checkCoveringHorizontal(ty1, tx1, tx2, 3, edges);
      if(covering) {
        // define in what direction there is more space
        let direction=1; // positive direction per default
        let distanceInOtherDir=ty1-y_arr[myPath[i].ym];
        let distanceInMainDir=y_arr[myPath[i].ym+1]-ty1;
        if(distanceInOtherDir>distanceInMainDir) {
          // change direction and swap distances
          direction=-1;
          const temp=distanceInMainDir;
          distanceInMainDir=distanceInOtherDir;
          distanceInOtherDir=temp;
        }
        // make steps array
        // first with bigger step
        let StepSize=8;
        let stepsInMainDir=Math.floor(distanceInMainDir/StepSize);
        let steps=[];
        for(let j=1; j<=stepsInMainDir; j++) steps.push(j*StepSize*direction);
        let stepsInOtherDir=Math.max((Math.floor(distanceInOtherDir/StepSize)-1),0);
        for(let j=1; j<=stepsInOtherDir; j++) steps.push(j*StepSize*direction*(-1));
        // second with smaller step
        StepSize=4;
        stepsInMainDir=Math.floor(distanceInMainDir/StepSize);
        for(let j=1; j<=stepsInMainDir; j++) steps.push(j*StepSize*direction);
        stepsInOtherDir=Math.max((Math.floor(distanceInOtherDir/StepSize)-1),0);
        for(let j=1; j<=stepsInOtherDir; j++) steps.push(j*StepSize*direction*(-1));
        // third with very small step
        StepSize=2;
        stepsInMainDir=Math.floor(distanceInMainDir/StepSize);
        for(let j=1; j<=stepsInMainDir; j++) steps.push(j*StepSize*direction);
        stepsInOtherDir=Math.max((Math.floor(distanceInOtherDir/StepSize)-1),0);
        for(let j=1; j<=stepsInOtherDir; j++) steps.push(j*StepSize*direction*(-1));
        //remove duplicates
        steps = [...new Set(steps)];
        for(let step_index=0; step_index<steps.length; step_index++) {
          covering=checkCoveringHorizontal(ty1+steps[step_index], tx1, tx2, 3, edges);
          if(!covering) {
            myPath[i].y=ty1+steps[step_index];
            myPath[i+1].y=myPath[i].y;
            //console.log("Step applied step, index: ", steps[step_index], step_index);
            break;
          }
        }
      }
    }

  }
  return myPath;
}

function checkCoveringVertical(tx: number, ty1:number, ty2: number, TOL: number, edges: Edge[]):boolean {
  for(let e=0; e<edges.length; e++) {
    // build edge segments
    const edge=edges[e];
    const edgeData = edge.data as EdgeDataType;
    const edgePoints = edgeData.edgePoints ?? [];
    const edgeSegmentsCount = edgePoints.length + 1;
    for (let i = 0; i < edgeSegmentsCount; i++) {
        let segmentSourceX: number, segmentSourceY: number, segmentTargetX: number, segmentTargetY: number;
        if (i === 0) {
          segmentSourceX = edgeData.startXY?.x || 0;
          segmentSourceY = edgeData.startXY?.y || 0;
        } else {
          const edgePoint = edgePoints[i - 1];
          segmentSourceX = edgePoint.x;
          segmentSourceY = edgePoint.y;
        }
        if (i === edgeSegmentsCount - 1) {
          segmentTargetX = edgeData.endXY?.x || 0;
          segmentTargetY = edgeData.endXY?.y || 0;
        } else {
          const edgePoint = edgePoints[i];
          segmentTargetX = edgePoint.x;
          segmentTargetY = edgePoint.y;
        }
        // if almost vertical line
        if(Math.abs(segmentSourceX-segmentTargetX)<=2) {
          const minx=Math.min(segmentSourceX,segmentTargetX);
          const maxx=Math.max(segmentSourceX,segmentTargetX);
          if(tx>=minx-TOL && tx<=maxx+TOL && !(Math.max(ty1,ty2)<Math.min(segmentSourceY, segmentTargetY) || Math.min(ty1,ty2)>Math.max(segmentSourceY, segmentTargetY))) {
            return true;
          }

        }
        
      }

  }
  return false;
}

function checkCoveringHorizontal(ty: number, tx1:number, tx2: number, TOL: number, edges: Edge[]):boolean {
  for(let e=0; e<edges.length; e++) {
    // build edge segments
    const edge=edges[e];
    const edgeData = edge.data as EdgeDataType;
    const edgePoints = edgeData.edgePoints ?? [];
    const edgeSegmentsCount = edgePoints.length + 1;
    for (let i = 0; i < edgeSegmentsCount; i++) {
        let segmentSourceX: number, segmentSourceY: number, segmentTargetX: number, segmentTargetY: number;
        if (i === 0) {
          segmentSourceX = edgeData.startXY?.x || 0;
          segmentSourceY = edgeData.startXY?.y || 0;
        } else {
          const edgePoint = edgePoints[i - 1];
          segmentSourceX = edgePoint.x;
          segmentSourceY = edgePoint.y;
        }
        if (i === edgeSegmentsCount - 1) {
          segmentTargetX = edgeData.endXY?.x || 0;
          segmentTargetY = edgeData.endXY?.y || 0;
        } else {
          const edgePoint = edgePoints[i];
          segmentTargetX = edgePoint.x;
          segmentTargetY = edgePoint.y;
        }
        // if almost vertical line
        if(Math.abs(segmentSourceY-segmentTargetY)<=2) {
          const miny=Math.min(segmentSourceY,segmentTargetY);
          const maxy=Math.max(segmentSourceY,segmentTargetY);
          if(ty>=miny-TOL && ty<=maxy+TOL && !(Math.max(tx1,tx2)<Math.min(segmentSourceX, segmentTargetX) || Math.min(tx1,tx2)>Math.max(segmentSourceX, segmentTargetX))) {
            return true;
          }
        }
      }
  }
  return false;
}


export function findPathBetweenTwoHandles(reactFlow:ReactFlowInstance, fromNodeId: string, fromHandleId: string, toNodeId:string, toHandleId:string):edgePoint[] {
  const nodes = reactFlow.getNodes();
  const fromNode=nodes.find((node)=>node.id==fromNodeId);
  const toNode=nodes.find((node)=>node.id==toNodeId);

  if(fromNode && toNode) {
    // first create matrix and two arrays to represent areas
    const rev=createMatrix(nodes);
    let x_arr = rev.x_arr;
    let y_arr = rev.y_arr;
    let matrix = rev.matrix;

    let fromXadapted = 0;
    let fromYadapted = 0;
    let fromX = 0;
    let fromY = 0;
    let toXadapted = 0;
    let toYadapted = 0;
    let toX = 0;
    let toY = 0;

    const XYpoint = getHandleMiddleRealPosition(fromNode, fromHandleId);
    fromX=XYpoint.x + fromNode.position.x + (fromNode.data as ComponentDataType).borderWidth;
    fromY=XYpoint.y + fromNode.position.y + (fromNode.data as ComponentDataType).borderWidth;

    //console.log("fromNode.position.x, fromNode.position.y", fromNode.position.x, fromNode.position.y);
    //console.log("fromX, fromY", fromX, fromY);

    let startHandle = (fromNode.data as ComponentDataType).handles.find((handle)=> (handle.hid==fromHandleId));
    if(!startHandle) {
        startHandle=(fromNode.data as ComponentDataType).repeatedHandleArray?.find((handleData)=>(handleData.hid==fromHandleId));
    }

    //console.log("startHandle", startHandle);

  [fromXadapted, fromYadapted] = postypeToAdjustedXYConn(
      (startHandle?.postype || "left"),
      fromX,
      fromY,
      startHandle?.width || 0,
      startHandle?.height || 0,
      (fromNode.data as ComponentDataType).rotation
    );
  //console.log("fromXadapted, fromYadapted", fromXadapted, fromYadapted);

    let fromHandle_prefferedLineDirectionRotated=rotatePrefferedLineDirection(startHandle?.prefferedLineDirection, (fromNode.data as ComponentDataType).rotation);

    const XYpoint1 = getHandleMiddleRealPosition(toNode, toHandleId);
    toX=XYpoint1.x + toNode.position.x + (toNode.data as ComponentDataType).borderWidth;
    toY=XYpoint1.y + toNode.position.y + (toNode.data as ComponentDataType).borderWidth;

  let endHandle = (toNode.data as ComponentDataType).handles.find((handle)=> (handle.hid==toHandleId));
    if(!endHandle) {
        endHandle=(toNode.data as ComponentDataType).repeatedHandleArray?.find((handleData)=>(handleData.hid==toHandleId));
    }

  [toXadapted, toYadapted] = postypeToAdjustedXYConn(
      (endHandle?.postype || "left"),
      toX,
      toY,
      endHandle?.width || 0,
      endHandle?.height || 0,
      (toNode.data as ComponentDataType).rotation
    );

    let toHandle_prefferedLineDirectionRotated=rotatePrefferedLineDirection(endHandle?.prefferedLineDirection, (toNode.data as ComponentDataType).rotation);

    //find path using modified A-Star algorithm (return areas on the matrix)
    const rev1=getPathResult(matrix, x_arr, y_arr, fromNode, toNode, fromXadapted, fromYadapted, toXadapted, toYadapted, fromHandle_prefferedLineDirectionRotated, toHandle_prefferedLineDirectionRotated);
    const result=rev1.result;
    const start_matrix_index_x=rev1.start_matrix_index_x;
    const start_matrix_index_y=rev1.start_matrix_index_y;

    // build path itself from the result
    const edges=reactFlow.getEdges();
    const myPath = buildPath(edges, result, matrix, x_arr, y_arr, fromXadapted, fromYadapted, toXadapted, toYadapted, start_matrix_index_x, start_matrix_index_y);
    //console.log("ConnLine myPath: ", myPath);

    const edgePoints=[] as edgePoint[];
    // build edgePoints array that will be passed to the edge Constructor on onConnectEnd
    if(myPath.length>2) {
      for(let i=1; i<myPath.length-1; i++) {
        edgePoints.push({x:myPath[i].x, y:myPath[i].y});
      }
    }
    return edgePoints;
  }
  return [] as edgePoint[];
}