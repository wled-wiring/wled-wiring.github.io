import {type Node, type Edge, ReactFlowInstance} from '@xyflow/react';
import {ComponentDataType, type edgePoint, type EdgeDataType, ImageDataType, DirectionType, XYPoint} from '../types';

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

const clampMatrixIndex = (index: number, maxIndex: number) => Math.min(Math.max(index, 0), Math.max(maxIndex, 0));

const walkToFreeMatrixIndex = (
  matrix: number[][],
  matrix_index_x: number,
  matrix_index_y: number,
  step_x: number,
  step_y: number,
) => {
  const max_x = matrix.length - 1;
  const max_y = (matrix[0]?.length ?? 1) - 1;
  let next_x = clampMatrixIndex(matrix_index_x, max_x);
  let next_y = clampMatrixIndex(matrix_index_y, max_y);

  while(matrix[next_x]?.[next_y] === 0) {
    const candidate_x = next_x + step_x;
    const candidate_y = next_y + step_y;
    if(candidate_x < 0 || candidate_x > max_x || candidate_y < 0 || candidate_y > max_y) break;
    next_x = candidate_x;
    next_y = candidate_y;
  }

  return [next_x, next_y];
};

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
    [matrix_index_x, matrix_index_y] = walkToFreeMatrixIndex(matrix, matrix_index_x, matrix_index_y, -1, 0);
  } else if(dist_right<dist_top && dist_right<dist_bottom) {
    // right is smallest distance
    matrix_index_x = x_arr.findIndex((element)=>element>Math.max(x,x1));
    if(matrix_index_x<0) matrix_index_x=matrix.length-1;
    matrix_index_y = findLastIndex(y_arr, (element)=>element<=y);
    if(matrix_index_x>=matrix.length) matrix_index_x=matrix.length-1;
    //console.log("matrix_index_x, matrix_index_y:", matrix_index_x, matrix_index_y);
    //console.log(matrix.length, matrix[0].length);
    [matrix_index_x, matrix_index_y] = walkToFreeMatrixIndex(matrix, matrix_index_x, matrix_index_y, 1, 0);
  } else if(dist_top<dist_bottom) {
    // top is smallest distance
    matrix_index_x = findLastIndex(x_arr, (element)=>element<=x);
    matrix_index_y = findLastIndex(y_arr, (element)=>element<=Math.min(y0,y))-1;
    [matrix_index_x, matrix_index_y] = walkToFreeMatrixIndex(matrix, matrix_index_x, matrix_index_y, 0, -1);
  } else {
    // bottom is smallest distance
    matrix_index_x = findLastIndex(x_arr, (element)=>element<=x);
    matrix_index_y = y_arr.findIndex((element)=>element>Math.max(y,y1));
    if(matrix_index_y<0) matrix_index_y=(matrix[0]?.length ?? 1)-1;
    [matrix_index_x, matrix_index_y] = walkToFreeMatrixIndex(matrix, matrix_index_x, matrix_index_y, 0, 1);
  }
  return [matrix_index_x, matrix_index_y]
}

type optm = {
  x0: number,
  y0: number,
  x1: number,
  y1: number,
}

type ObstacleRect = optm & {
  nodeId: string;
};

type PathPoint = XYPoint & {
  xm?: number;
  ym?: number;
};

type BuildPathOptions = {
  obstacleRects?: ObstacleRect[];
  sourceNodeId?: string;
  targetNodeId?: string;
  sourceDirection?: DirectionType;
  targetDirection?: DirectionType;
};

export type PathfinderWireRoute = {
  startXY: XYPoint;
  endXY: XYPoint;
  edgePoints: edgePoint[];
};

const EPSILON = 0.001;
const ROUTE_LENGTH_WEIGHT = 0.01;
const ROUTE_CORNER_PENALTY = 30;
const ROUTE_INTERSECTION_PENALTY = 80;
const ROUTE_REPEATED_PARTNER_CROSSING_PENALTY = 160;
const ROUTE_OVERLAP_PENALTY = 120;
const WIRE_PARALLEL_SPACING_TOL = 7;
const WIRE_SHIFT_STEP = 2;

const sameNumber = (a: number, b: number) => Math.abs(a - b) <= EPSILON;

const samePoint = (a: XYPoint, b: XYPoint) => sameNumber(a.x, b.x) && sameNumber(a.y, b.y);

const isHorizontal = (a: XYPoint, b: XYPoint) => sameNumber(a.y, b.y);

const isVertical = (a: XYPoint, b: XYPoint) => sameNumber(a.x, b.x);

const isOrthogonalSegment = (a: XYPoint, b: XYPoint) => isHorizontal(a, b) || isVertical(a, b);

const pointDistance = (a: XYPoint, b: XYPoint) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

const oppositeDirection = (direction: DirectionType): DirectionType => {
  if(direction === 'left') return 'right';
  if(direction === 'right') return 'left';
  if(direction === 'up') return 'down';
  if(direction === 'down') return 'up';
  return undefined;
};

const directionFromPoints = (from: XYPoint, to: XYPoint): DirectionType => {
  if(isHorizontal(from, to)) {
    if(to.x > from.x + EPSILON) return 'right';
    if(to.x < from.x - EPSILON) return 'left';
  }

  if(isVertical(from, to)) {
    if(to.y > from.y + EPSILON) return 'down';
    if(to.y < from.y - EPSILON) return 'up';
  }

  return undefined;
};

const closestNodeBorderDirection = (
  nodeDim: {x:number, y:number, w:number, h:number},
  x: number,
  y: number,
): DirectionType => {
  const x0 = nodeDim.x;
  const y0 = nodeDim.y;
  const x1 = nodeDim.x + nodeDim.w;
  const y1 = nodeDim.y + nodeDim.h;

  const dist_left = pDistance(x, y, x0, y0, x0, y1)[0];
  const dist_right = pDistance(x, y, x1, y0, x1, y1)[0];
  const dist_top = pDistance(x, y, x0, y0, x1, y0)[0];
  const dist_bottom = pDistance(x, y, x0, y1, x1, y1)[0];

  if(dist_left < dist_right && dist_left < dist_top && dist_left < dist_bottom) return "left";
  if(dist_right < dist_top && dist_right < dist_bottom) return "right";
  if(dist_top < dist_bottom) return "up";
  return "down";
};

export const endpointLineDirection = (
  node: Node | undefined,
  handle: {prefferedLineDirection?: DirectionType} | undefined,
  x: number,
  y: number,
): DirectionType => {
  if(!node || (node.data as ComponentDataType | undefined)?.technicalID === "SolderJoint") return undefined;

  const rotation = (node.data as ComponentDataType).rotation;
  const prefferedLineDirection = rotatePrefferedLineDirection(handle?.prefferedLineDirection, rotation);
  if(prefferedLineDirection) return prefferedLineDirection;

  const nodeWidth = node.measured?.width || node.width || 0;
  const nodeHeight = node.measured?.height || node.height || 0;
  if(nodeWidth <= 0 || nodeHeight <= 0) return undefined;

  return closestNodeBorderDirection(
    {x: node.position.x, y: node.position.y, w: nodeWidth, h: nodeHeight},
    x,
    y,
  );
};

const rangesOverlap = (a1: number, a2: number, b1: number, b2: number) => (
  Math.max(Math.min(a1, a2), Math.min(b1, b2)) < Math.min(Math.max(a1, a2), Math.max(b1, b2)) - EPSILON
);

const segmentIntersectsRect = (from: XYPoint, to: XYPoint, rect: optm) => {
  if(isVertical(from, to)) {
    return (
      from.x > rect.x0 + EPSILON &&
      from.x < rect.x1 - EPSILON &&
      rangesOverlap(from.y, to.y, rect.y0, rect.y1)
    );
  }

  if(isHorizontal(from, to)) {
    return (
      from.y > rect.y0 + EPSILON &&
      from.y < rect.y1 - EPSILON &&
      rangesOverlap(from.x, to.x, rect.x0, rect.x1)
    );
  }

  return true;
};

const segmentAllowed = (
  from: XYPoint,
  to: XYPoint,
  options: BuildPathOptions,
  ignoredNodeIds: Set<string>,
) => (
  isOrthogonalSegment(from, to) &&
  !(options.obstacleRects ?? []).some((rect) => (
    !ignoredNodeIds.has(rect.nodeId) &&
    segmentIntersectsRect(from, to, rect)
  ))
);

const edgeSegments = (edge: Edge) => {
  const edgeData = edge.data as EdgeDataType | undefined;
  if(!edgeData?.startXY || !edgeData.endXY) return [];

  const points = [
    edgeData.startXY,
    ...(edgeData.edgePoints ?? []),
    edgeData.endXY,
  ];

  return points.slice(0, -1).map((point, index) => ({
    id: edge.id,
    from: point,
    to: points[index + 1],
  }));
};

const pathSegments = (points: XYPoint[]) => (
  points.slice(0, -1).map((point, index) => ({
    from: point,
    to: points[index + 1],
  }))
);

const orthogonalSegmentsCross = (
  a: {from: XYPoint; to: XYPoint},
  b: {from: XYPoint; to: XYPoint},
) => {
  const aVertical = isVertical(a.from, a.to);
  const bVertical = isVertical(b.from, b.to);
  if(aVertical === bVertical) return false;

  const vertical = aVertical ? a : b;
  const horizontal = aVertical ? b : a;
  const x = vertical.from.x;
  const y = horizontal.from.y;

  return (
    x > Math.min(horizontal.from.x, horizontal.to.x) + EPSILON &&
    x < Math.max(horizontal.from.x, horizontal.to.x) - EPSILON &&
    y > Math.min(vertical.from.y, vertical.to.y) + EPSILON &&
    y < Math.max(vertical.from.y, vertical.to.y) - EPSILON
  );
};

const orthogonalSegmentsOverlap = (
  a: {from: XYPoint; to: XYPoint},
  b: {from: XYPoint; to: XYPoint},
) => {
  if(isVertical(a.from, a.to) && isVertical(b.from, b.to) && Math.abs(a.from.x - b.from.x) <= WIRE_PARALLEL_SPACING_TOL) {
    return rangesOverlap(a.from.y, a.to.y, b.from.y, b.to.y);
  }

  if(isHorizontal(a.from, a.to) && isHorizontal(b.from, b.to) && Math.abs(a.from.y - b.from.y) <= WIRE_PARALLEL_SPACING_TOL) {
    return rangesOverlap(a.from.x, a.to.x, b.from.x, b.to.x);
  }

  return false;
};

const isProtectedEndpointStubIndex = (points: XYPoint[], index: number) => (
  points.length > 2 &&
  (index === 1 || index === points.length - 2)
);

const compactPathPoints = <T extends XYPoint>(points: T[], preserveEndpointStubs = false): T[] => {
  const withoutDuplicates = points.filter((point, index) => (
    index === 0 || !samePoint(point, points[index - 1])
  ));

  const compacted = [...withoutDuplicates];
  let changed = true;
  while(changed) {
    changed = false;
    for(let index = 1; index < compacted.length - 1; index += 1) {
      if(preserveEndpointStubs && isProtectedEndpointStubIndex(compacted, index)) continue;

      const prev = compacted[index - 1];
      const point = compacted[index];
      const next = compacted[index + 1];
      if(
        (sameNumber(prev.x, point.x) && sameNumber(point.x, next.x)) ||
        (sameNumber(prev.y, point.y) && sameNumber(point.y, next.y))
      ) {
        compacted.splice(index, 1);
        changed = true;
        break;
      }
    }
  }

  return compacted;
};

const pathIsAllowed = (points: XYPoint[], options: BuildPathOptions) => (
  pathSegments(points).every((segment, index) => {
    const ignoredNodeIds = new Set<string>();
    if(index === 0 && options.sourceNodeId) ignoredNodeIds.add(options.sourceNodeId);
    if(index === points.length - 2 && options.targetNodeId) ignoredNodeIds.add(options.targetNodeId);
    return segmentAllowed(segment.from, segment.to, options, ignoredNodeIds);
  })
);

const routeConflictMetrics = (points: XYPoint[], edges: Edge[]) => {
  const segments = pathSegments(points);
  const existingSegments = edges.flatMap(edgeSegments);
  let intersections = 0;
  let overlaps = 0;

  segments.forEach((segment) => {
    existingSegments.forEach((existingSegment) => {
      if(orthogonalSegmentsCross(segment, existingSegment)) {
        intersections += 1;
      } else if(orthogonalSegmentsOverlap(segment, existingSegment)) {
        overlaps += 1;
      }
    });
  });

  return {intersections, overlaps};
};

const routeConflictMetricsAreBetter = (
  candidate: {intersections: number; overlaps: number},
  current: {intersections: number; overlaps: number},
) => (
  candidate.overlaps < current.overlaps ||
  (
    candidate.overlaps === current.overlaps &&
    candidate.intersections < current.intersections
  )
);

const clampIndex = (index: number, min: number, max: number) => Math.min(Math.max(index, min), max);

const segmentMatrixIndexes = (arr: number[], from: number, to: number, maxIndex: number) => {
  const minValue = Math.min(from, to);
  const maxValue = Math.max(from, to);
  const indexes = [] as number[];

  for(let index = 0; index < maxIndex; index += 1) {
    if(rangesOverlap(arr[index], arr[index + 1], minValue, maxValue)) {
      indexes.push(index);
    }
  }

  if(indexes.length > 0) return indexes;

  const middle = (minValue + maxValue) / 2;
  return [clampIndex(findLastIndex(arr, (element) => element <= middle), 0, maxIndex - 1)];
};

const verticalCorridorCellIsFree = (matrix: number[][], matrixX: number, matrixYs: number[]) => (
  matrixX >= 0 &&
  matrixX < matrix.length &&
  matrixYs.every((matrixY) => matrix[matrixX]?.[matrixY] === 1)
);

const horizontalCorridorCellIsFree = (matrix: number[][], matrixXs: number[], matrixY: number) => (
  matrixY >= 0 &&
  matrix[0] !== undefined &&
  matrixY < matrix[0].length &&
  matrixXs.every((matrixX) => matrix[matrixX]?.[matrixY] === 1)
);

const verticalFreeCorridor = (
  matrix: number[][],
  x_arr: number[],
  y_arr: number[],
  x: number,
  y1: number,
  y2: number,
) => {
  const matrixYs = segmentMatrixIndexes(y_arr, y1, y2, matrix[0]?.length ?? 0);
  const baseMatrixX = clampIndex(findLastIndex(x_arr, (element) => element <= x), 0, matrix.length - 1);
  if(!verticalCorridorCellIsFree(matrix, baseMatrixX, matrixYs)) return undefined;

  let firstMatrixX = baseMatrixX;
  let lastMatrixX = baseMatrixX;
  while(firstMatrixX > 0 && verticalCorridorCellIsFree(matrix, firstMatrixX - 1, matrixYs)) {
    firstMatrixX -= 1;
  }
  while(lastMatrixX < matrix.length - 1 && verticalCorridorCellIsFree(matrix, lastMatrixX + 1, matrixYs)) {
    lastMatrixX += 1;
  }

  return {
    min: x_arr[firstMatrixX],
    max: x_arr[lastMatrixX + 1],
  };
};

const horizontalFreeCorridor = (
  matrix: number[][],
  x_arr: number[],
  y_arr: number[],
  y: number,
  x1: number,
  x2: number,
) => {
  const matrixXs = segmentMatrixIndexes(x_arr, x1, x2, matrix.length);
  const baseMatrixY = clampIndex(findLastIndex(y_arr, (element) => element <= y), 0, (matrix[0]?.length ?? 1) - 1);
  if(!horizontalCorridorCellIsFree(matrix, matrixXs, baseMatrixY)) return undefined;

  let firstMatrixY = baseMatrixY;
  let lastMatrixY = baseMatrixY;
  while(firstMatrixY > 0 && horizontalCorridorCellIsFree(matrix, matrixXs, firstMatrixY - 1)) {
    firstMatrixY -= 1;
  }
  while(matrix[0] !== undefined && lastMatrixY < matrix[0].length - 1 && horizontalCorridorCellIsFree(matrix, matrixXs, lastMatrixY + 1)) {
    lastMatrixY += 1;
  }

  return {
    min: y_arr[firstMatrixY],
    max: y_arr[lastMatrixY + 1],
  };
};

const shiftCandidateOffsets = (coord: number, minCoord: number, maxCoord: number) => {
  const leftSpace = coord - minCoord;
  const rightSpace = maxCoord - coord;
  const preferredDirection = rightSpace >= leftSpace ? 1 : -1;
  const maxDistance = Math.max(leftSpace, rightSpace);
  const offsets = [] as number[];

  for(let distance = WIRE_SHIFT_STEP; distance <= maxDistance + EPSILON; distance += WIRE_SHIFT_STEP) {
    [preferredDirection, preferredDirection * -1].forEach((direction) => {
      const candidate = coord + distance * direction;
      if(candidate > minCoord + EPSILON && candidate < maxCoord - EPSILON) {
        offsets.push(Number((candidate - coord).toFixed(3)));
      }
    });
  }

  return [...new Set(offsets)];
};

const shiftedPathCandidate = (
  points: PathPoint[],
  segmentIndex: number,
  axis: 'x' | 'y',
  coord: number,
) => {
  const candidate = points.map((point) => ({...point}));
  candidate[segmentIndex][axis] = coord;
  candidate[segmentIndex + 1][axis] = coord;
  return candidate;
};

const expandedRange = (
  min: number,
  max: number,
  segmentMin: number,
  segmentMax: number,
  padding = WIRE_SHIFT_STEP,
) => ({
  min: Math.max(segmentMin, min - padding),
  max: Math.min(segmentMax, max + padding),
});

const mergeRanges = (ranges: {min: number; max: number}[]) => {
  const sortedRanges = ranges
    .filter((range) => range.max >= range.min - EPSILON)
    .sort((a, b) => a.min - b.min);
  const merged = [] as {min: number; max: number}[];

  sortedRanges.forEach((range) => {
    const lastRange = merged[merged.length - 1];
    if(!lastRange || range.min > lastRange.max + EPSILON) {
      merged.push({...range});
      return;
    }

    lastRange.max = Math.max(lastRange.max, range.max);
  });

  return merged;
};

const segmentConflictRanges = (
  segment: {from: XYPoint; to: XYPoint},
  edges: Edge[],
) => {
  const segmentVertical = isVertical(segment.from, segment.to);
  const segmentMin = segmentVertical
    ? Math.min(segment.from.y, segment.to.y)
    : Math.min(segment.from.x, segment.to.x);
  const segmentMax = segmentVertical
    ? Math.max(segment.from.y, segment.to.y)
    : Math.max(segment.from.x, segment.to.x);
  const ranges = [] as {min: number; max: number}[];

  edges.flatMap(edgeSegments).forEach((existingSegment) => {
    if(orthogonalSegmentsOverlap(segment, existingSegment)) {
      const overlapMin = segmentVertical
        ? Math.max(Math.min(segment.from.y, segment.to.y), Math.min(existingSegment.from.y, existingSegment.to.y))
        : Math.max(Math.min(segment.from.x, segment.to.x), Math.min(existingSegment.from.x, existingSegment.to.x));
      const overlapMax = segmentVertical
        ? Math.min(Math.max(segment.from.y, segment.to.y), Math.max(existingSegment.from.y, existingSegment.to.y))
        : Math.min(Math.max(segment.from.x, segment.to.x), Math.max(existingSegment.from.x, existingSegment.to.x));
      ranges.push(expandedRange(overlapMin, overlapMax, segmentMin, segmentMax));
      return;
    }

    if(orthogonalSegmentsCross(segment, existingSegment)) {
      const crossValue = segmentVertical ? existingSegment.from.y : existingSegment.from.x;
      ranges.push(expandedRange(crossValue, crossValue, segmentMin, segmentMax));
    }
  });

  return mergeRanges(ranges);
};

const partiallyShiftedPathCandidate = (
  points: PathPoint[],
  segmentIndex: number,
  axis: 'x' | 'y',
  coord: number,
  range: {min: number; max: number},
) => {
  const from = points[segmentIndex];
  const to = points[segmentIndex + 1];
  const spanAxis = axis === 'x' ? 'y' : 'x';
  const segmentStart = from[spanAxis];
  const segmentEnd = to[spanAxis];
  const segmentMin = Math.min(segmentStart, segmentEnd);
  const segmentMax = Math.max(segmentStart, segmentEnd);
  const rangeMin = Math.max(segmentMin, range.min);
  const rangeMax = Math.min(segmentMax, range.max);

  if(rangeMin <= segmentMin + EPSILON && rangeMax >= segmentMax - EPSILON) return undefined;

  const entry = segmentStart <= segmentEnd ? rangeMin : rangeMax;
  const exit = segmentStart <= segmentEnd ? rangeMax : rangeMin;
  const originalEntry = {...from, [spanAxis]: entry};
  const shiftedEntry = {...originalEntry, [axis]: coord};
  const shiftedExit = {...from, [axis]: coord, [spanAxis]: exit};
  const originalExit = {...from, [spanAxis]: exit};

  return compactPathPoints([
    ...points.slice(0, segmentIndex + 1),
    originalEntry,
    shiftedEntry,
    shiftedExit,
    originalExit,
    ...points.slice(segmentIndex + 1),
  ], true);
};

const segmentHasExistingWireConflict = (
  segment: {from: XYPoint; to: XYPoint},
  edges: Edge[],
) => (
  edges.flatMap(edgeSegments).some((existingSegment) => (
    orthogonalSegmentsCross(segment, existingSegment) ||
    orthogonalSegmentsOverlap(segment, existingSegment)
  ))
);

const selectBestShiftedSegmentPath = (
  myPath: PathPoint[],
  segmentIndex: number,
  axis: 'x' | 'y',
  corridor: {min: number; max: number},
  edges: Edge[],
  options: BuildPathOptions,
) => {
  const currentSegment = {
    from: myPath[segmentIndex],
    to: myPath[segmentIndex + 1],
  };

  if(!segmentHasExistingWireConflict(currentSegment, edges)) return undefined;

  const coord = myPath[segmentIndex][axis];
  let bestPath = myPath;
  let bestMetrics = routeConflictMetrics(myPath, edges);
  let bestScore = routeScore(myPath, edges);

  for(const offset of shiftCandidateOffsets(coord, corridor.min, corridor.max)) {
    const candidateCoord = coord + offset;
    const candidatePath = shiftedPathCandidate(myPath, segmentIndex, axis, candidateCoord);
    if(!pathIsAllowed(candidatePath, options)) continue;

    const candidateMetrics = routeConflictMetrics(candidatePath, edges);
    const candidateScore = routeScore(candidatePath, edges);
    if(
      routeConflictMetricsAreBetter(candidateMetrics, bestMetrics) ||
      (
        candidateMetrics.overlaps === bestMetrics.overlaps &&
        candidateMetrics.intersections === bestMetrics.intersections &&
        candidateScore + EPSILON < bestScore
      )
    ) {
      bestPath = candidatePath;
      bestMetrics = candidateMetrics;
      bestScore = candidateScore;
    }
  }

  return bestPath === myPath ? undefined : bestPath;
};

const selectBestPartiallyShiftedSegmentPath = (
  myPath: PathPoint[],
  segmentIndex: number,
  axis: 'x' | 'y',
  matrix: number[][],
  x_arr: number[],
  y_arr: number[],
  edges: Edge[],
  options: BuildPathOptions,
) => {
  const currentSegment = {
    from: myPath[segmentIndex],
    to: myPath[segmentIndex + 1],
  };
  const conflictRanges = segmentConflictRanges(currentSegment, edges);
  if(conflictRanges.length === 0) return undefined;

  const coord = myPath[segmentIndex][axis];
  let bestPath = myPath;
  let bestMetrics = routeConflictMetrics(myPath, edges);
  let bestScore = routeScore(myPath, edges);

  for(const range of conflictRanges) {
    const corridor = axis === 'x'
      ? verticalFreeCorridor(matrix, x_arr, y_arr, coord, range.min, range.max)
      : horizontalFreeCorridor(matrix, x_arr, y_arr, coord, range.min, range.max);
    if(!corridor) continue;

    for(const offset of shiftCandidateOffsets(coord, corridor.min, corridor.max)) {
      const candidateCoord = coord + offset;
      const candidatePath = partiallyShiftedPathCandidate(myPath, segmentIndex, axis, candidateCoord, range);
      if(!candidatePath || !pathIsAllowed(candidatePath, options)) continue;

      const candidateMetrics = routeConflictMetrics(candidatePath, edges);
      const candidateScore = routeScore(candidatePath, edges);
      if(
        routeConflictMetricsAreBetter(candidateMetrics, bestMetrics) ||
        (
          candidateMetrics.overlaps === bestMetrics.overlaps &&
          candidateMetrics.intersections === bestMetrics.intersections &&
          candidateScore + EPSILON < bestScore
        )
      ) {
        bestPath = candidatePath;
        bestMetrics = candidateMetrics;
        bestScore = candidateScore;
      }
    }
  }

  return bestPath === myPath ? undefined : bestPath;
};

const shiftVerticalSegmentAwayFromCovering = (
  myPath: PathPoint[],
  segmentIndex: number,
  matrix: number[][],
  x_arr: number[],
  y_arr: number[],
  edges: Edge[],
  options: BuildPathOptions,
) => {
  const tx = myPath[segmentIndex].x;
  const ty1 = myPath[segmentIndex].y;
  const ty2 = myPath[segmentIndex + 1].y;

  const corridor = verticalFreeCorridor(matrix, x_arr, y_arr, tx, ty1, ty2);
  const bestPath = (corridor
    ? selectBestShiftedSegmentPath(myPath, segmentIndex, 'x', corridor, edges, options)
    : undefined)
    ?? selectBestPartiallyShiftedSegmentPath(myPath, segmentIndex, 'x', matrix, x_arr, y_arr, edges, options);
  if(!bestPath) return;

  myPath.splice(0, myPath.length, ...bestPath);
};

const shiftHorizontalSegmentAwayFromCovering = (
  myPath: PathPoint[],
  segmentIndex: number,
  matrix: number[][],
  x_arr: number[],
  y_arr: number[],
  edges: Edge[],
  options: BuildPathOptions,
) => {
  const ty = myPath[segmentIndex].y;
  const tx1 = myPath[segmentIndex].x;
  const tx2 = myPath[segmentIndex + 1].x;

  const corridor = horizontalFreeCorridor(matrix, x_arr, y_arr, ty, tx1, tx2);
  const bestPath = (corridor
    ? selectBestShiftedSegmentPath(myPath, segmentIndex, 'y', corridor, edges, options)
    : undefined)
    ?? selectBestPartiallyShiftedSegmentPath(myPath, segmentIndex, 'y', matrix, x_arr, y_arr, edges, options);
  if(!bestPath) return;

  myPath.splice(0, myPath.length, ...bestPath);
};

const routeScore = (points: XYPoint[], edges: Edge[]) => {
  const segments = pathSegments(points);
  const existingSegments = edges.flatMap(edgeSegments);
  const crossingCountsByPartner = new Map<string, number>();
  let intersections = 0;
  let overlaps = 0;

  segments.forEach((segment) => {
    existingSegments.forEach((existingSegment) => {
      if(orthogonalSegmentsCross(segment, existingSegment)) {
        intersections += 1;
        crossingCountsByPartner.set(
          existingSegment.id,
          (crossingCountsByPartner.get(existingSegment.id) ?? 0) + 1,
        );
      } else if(orthogonalSegmentsOverlap(segment, existingSegment)) {
        overlaps += 1;
      }
    });
  });

  const repeatedPartnerCrossings = Array.from(crossingCountsByPartner.values())
    .reduce((sum, count) => sum + Math.max(0, count - 1), 0);
  const length = segments.reduce((sum, segment) => sum + pointDistance(segment.from, segment.to), 0);
  const corners = Math.max(0, points.length - 2);

  return (
    length * ROUTE_LENGTH_WEIGHT +
    corners * ROUTE_CORNER_PENALTY +
    intersections * ROUTE_INTERSECTION_PENALTY +
    repeatedPartnerCrossings * ROUTE_REPEATED_PARTNER_CROSSING_PENALTY +
    overlaps * ROUTE_OVERLAP_PENALTY
  );
};

const shortcutCandidates = (from: XYPoint, to: XYPoint): XYPoint[][] => {
  if(isOrthogonalSegment(from, to)) return [[from, to]];

  return [
    [from, {x: to.x, y: from.y}, to],
    [from, {x: from.x, y: to.y}, to],
  ];
};

const pathMatchesEndpointDirections = (points: XYPoint[], options: BuildPathOptions) => {
  if(points.length < 2) return false;

  if(
    options.sourceDirection &&
    directionFromPoints(points[0], points[1]) !== options.sourceDirection
  ) {
    return false;
  }

  if(
    options.targetDirection &&
    directionFromPoints(points[points.length - 2], points[points.length - 1]) !== oppositeDirection(options.targetDirection)
  ) {
    return false;
  }

  return true;
};

const routeIsBetter = (
  candidateMetrics: {intersections: number; overlaps: number},
  currentMetrics: {intersections: number; overlaps: number},
  candidateScore: number,
  currentScore: number,
) => (
  routeConflictMetricsAreBetter(candidateMetrics, currentMetrics) ||
  (
    candidateMetrics.overlaps === currentMetrics.overlaps &&
    candidateMetrics.intersections === currentMetrics.intersections &&
    candidateScore + EPSILON < currentScore
  )
);

const simplifyEndpointShortcuts = (
  points: PathPoint[],
  edges: Edge[],
  options: BuildPathOptions,
) => {
  if(points.length < 3) return points;

  let bestPath = points;
  let bestMetrics = routeConflictMetrics(bestPath, edges);
  let bestScore = routeScore(bestPath, edges);
  const start = points[0];
  const end = points[points.length - 1];

  for(const candidate of shortcutCandidates(start, end)) {
    const routeCandidate = compactPathPoints(candidate as PathPoint[], true);
    if(!pathMatchesEndpointDirections(routeCandidate, options)) continue;
    if(!pathIsAllowed(routeCandidate, options)) continue;

    const candidateMetrics = routeConflictMetrics(routeCandidate, edges);
    const candidateScore = routeScore(routeCandidate, edges);
    if(routeIsBetter(candidateMetrics, bestMetrics, candidateScore, bestScore)) {
      bestPath = routeCandidate;
      bestMetrics = candidateMetrics;
      bestScore = candidateScore;
    }
  }

  return bestPath;
};

const simplifyOrthogonalPath = (
  points: PathPoint[],
  edges: Edge[],
  options: BuildPathOptions,
) => {
  if(points.length < 3 || !options.obstacleRects?.length) return compactPathPoints(points, true);

  let bestPath = compactPathPoints(points, true);
  let bestMetrics = routeConflictMetrics(bestPath, edges);
  let bestScore = routeScore(bestPath, edges);
  let changed = true;

  while(changed) {
    changed = false;
    const firstOptimizableIndex = bestPath.length > 2 ? 1 : 0;
    const lastOptimizableIndex = bestPath.length > 2 ? bestPath.length - 2 : bestPath.length - 1;

    for(let startIndex = firstOptimizableIndex; startIndex < lastOptimizableIndex - 1; startIndex += 1) {
      let acceptedPath: PathPoint[] | undefined;
      let acceptedMetrics = bestMetrics;
      let acceptedScore = bestScore;

      for(let endIndex = lastOptimizableIndex; endIndex >= startIndex + 2; endIndex -= 1) {
        const from = bestPath[startIndex];
        const to = bestPath[endIndex];

        for(const candidate of shortcutCandidates(from, to)) {
          const compactCandidate = compactPathPoints(candidate as PathPoint[]);
          const routeCandidate = compactPathPoints([
            ...bestPath.slice(0, startIndex),
            ...compactCandidate,
            ...bestPath.slice(endIndex + 1),
          ], true);
          if(!pathIsAllowed(routeCandidate, options)) continue;

          const candidateScore = routeScore(routeCandidate, edges);
          const candidateMetrics = routeConflictMetrics(routeCandidate, edges);
          if(
            routeConflictMetricsAreBetter(candidateMetrics, bestMetrics) ||
            (
              candidateMetrics.overlaps === bestMetrics.overlaps &&
              candidateMetrics.intersections === bestMetrics.intersections &&
              candidateScore + EPSILON < acceptedScore
            )
          ) {
            acceptedPath = routeCandidate;
            acceptedMetrics = candidateMetrics;
            acceptedScore = candidateScore;
          }
        }
      }

      if(acceptedPath) {
        bestPath = acceptedPath;
        bestMetrics = acceptedMetrics;
        bestScore = acceptedScore;
        changed = true;
        break;
      }
    }
  }

  return simplifyEndpointShortcuts(bestPath, edges, options);
};

const edgePointFromPoint = (point: XYPoint): edgePoint => ({
  x: point.x,
  y: point.y,
  active: -1,
});

const isHorizontalDirection = (direction: DirectionType) => (
  direction === 'left' || direction === 'right'
);

const isVerticalDirection = (direction: DirectionType) => (
  direction === 'up' || direction === 'down'
);

const directOrthogonalPath = (
  start: XYPoint,
  end: XYPoint,
  sourceDirection: DirectionType,
  targetDirection: DirectionType,
) => {
  if(isOrthogonalSegment(start, end)) return [start, end];

  if(isHorizontalDirection(sourceDirection) && isHorizontalDirection(targetDirection)) {
    const midX = (start.x + end.x) / 2;
    return [start, {x: midX, y: start.y}, {x: midX, y: end.y}, end];
  }

  if(isVerticalDirection(sourceDirection) && isVerticalDirection(targetDirection)) {
    const midY = (start.y + end.y) / 2;
    return [start, {x: start.x, y: midY}, {x: end.x, y: midY}, end];
  }

  if(isHorizontalDirection(sourceDirection) || isVerticalDirection(targetDirection)) {
    return [start, {x: end.x, y: start.y}, end];
  }

  return [start, {x: start.x, y: end.y}, end];
};

const makePathfinderRouteOrthogonal = (
  points: XYPoint[],
  sourceDirection: DirectionType,
  targetDirection: DirectionType,
) => {
  if(points.length < 2) return points;

  const orthogonalPoints = points.map((point) => ({...point}));

  if(orthogonalPoints.length === 2) {
    return compactPathPoints(directOrthogonalPath(
      orthogonalPoints[0],
      orthogonalPoints[1],
      sourceDirection,
      targetDirection,
    ) as PathPoint[], true);
  }

  if(sourceDirection && orthogonalPoints[1]) {
    if(isHorizontalDirection(sourceDirection)) {
      orthogonalPoints[1] = {...orthogonalPoints[1], y: orthogonalPoints[0].y};
    } else if(isVerticalDirection(sourceDirection)) {
      orthogonalPoints[1] = {...orthogonalPoints[1], x: orthogonalPoints[0].x};
    }
  }

  if(targetDirection && orthogonalPoints.length > 2) {
    const lastInnerIndex = orthogonalPoints.length - 2;
    if(isHorizontalDirection(targetDirection)) {
      orthogonalPoints[lastInnerIndex] = {
        ...orthogonalPoints[lastInnerIndex],
        y: orthogonalPoints[orthogonalPoints.length - 1].y,
      };
    } else if(isVerticalDirection(targetDirection)) {
      orthogonalPoints[lastInnerIndex] = {
        ...orthogonalPoints[lastInnerIndex],
        x: orthogonalPoints[orthogonalPoints.length - 1].x,
      };
    }
  }

  const expandedPoints: XYPoint[] = [];
  orthogonalPoints.forEach((point, index) => {
    if(index === 0) {
      expandedPoints.push(point);
      return;
    }

    const previous = expandedPoints[expandedPoints.length - 1];
    if(isOrthogonalSegment(previous, point)) {
      expandedPoints.push(point);
      return;
    }

    const next = orthogonalPoints[index + 1];
    const viaX = {x: point.x, y: previous.y};
    const viaY = {x: previous.x, y: point.y};
    const via = next && isOrthogonalSegment(viaY, next) ? viaY : viaX;
    expandedPoints.push(via, point);
  });

  return compactPathPoints(expandedPoints as PathPoint[], true);
};

export const normalizePathfinderWireRoute = (
  startXY: XYPoint,
  endXY: XYPoint,
  edgePoints: edgePoint[],
  sourceDirection: DirectionType = undefined,
  targetDirection: DirectionType = undefined,
): PathfinderWireRoute => {
  const normalizedPoints = makePathfinderRouteOrthogonal(
    [
      startXY,
      ...(edgePoints ?? []).map((point) => ({x: point.x, y: point.y})),
      endXY,
    ],
    sourceDirection,
    targetDirection,
  );

  return {
    startXY: normalizedPoints[0],
    endXY: normalizedPoints[normalizedPoints.length - 1],
    edgePoints: normalizedPoints.slice(1, -1).map(edgePointFromPoint),
  };
};

export const findNonOrthogonalPathfinderRouteSegments = (route: PathfinderWireRoute) => {
  const points = [
    route.startXY,
    ...route.edgePoints.map((point) => ({x: point.x, y: point.y})),
    route.endXY,
  ];

  return points.slice(0, -1).flatMap((point, index) => {
    const nextPoint = points[index + 1];
    return nextPoint && !isOrthogonalSegment(point, nextPoint)
      ? [{segmentIndex: index, from: point, to: nextPoint}]
      : [];
  });
};

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

export function createMatrix(nodes:Node[]):{x_arr: number[], y_arr:number[], matrix:number[][], obstacleRects: ObstacleRect[]} {
  let x_arr=[] as number[];
  let y_arr=[] as number[];
  let matrix=Array(2).fill(null).map(() => Array(2).fill(1));
  const obstacleRects = [] as ObstacleRect[];

  const MARGIN=5;
  let x_arr_1=[] as number[];
  let y_arr_1=[] as number[];
  nodes.forEach((node)=>{
    if(node.data?.technicalID!="SolderJoint" && node.data?.technicalID!="InfoNode" && node.data?.technicalID!="WireInfoNode") {
      
      
      const x0=Math.round((node.position.x-MARGIN)*32)/32;
      const y0=Math.round((node.position.y-MARGIN)*32)/32;
      const x1=Math.round((node.position.x+(node.measured?.width || node.width || 0)+MARGIN)*32)/32;
      const y1=Math.round((node.position.y+(node.measured?.height || node.height || 0)+MARGIN)*32)/32;
      obstacleRects.push({x0, y0, x1, y1, nodeId: node.id});
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
            obstacleRects.push({...optm, nodeId: node.id});
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
          for(let j=0; j<y_arr.length; j++) { // j is y dimension
            if (i>=first_x_index && i<=last_x_index && j>=first_y_index && j<=last_y_index) {
              if(matrix[i]?.[j]!==undefined) matrix[i][j]=0;
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
                for(let j=0; j<y_arr.length; j++) { // j is y dimension
                  if (i>=first_x_index && i<=last_x_index && j>=first_y_index && j<=last_y_index) {
                    if(matrix[i]?.[j]!==undefined) matrix[i][j]=0;
                  }
                }
              }
            }
          }
        }
      });

    }
  })

  return {x_arr, y_arr, matrix, obstacleRects};
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

export function buildPath(edges:Edge[], result:GridNode[]|undefined, matrix: number[][], x_arr: number[], y_arr: number[], fromXadapted:number, fromYadapted:number, toXadapted: number, toYadapted:number, start_matrix_index_x:number, start_matrix_index_y:number, options: BuildPathOptions = {} ){
  const myPath = [{x:fromXadapted, y:fromYadapted, xm: findLastIndex(x_arr, (element)=>element<=fromXadapted), ym: findLastIndex(y_arr, (element)=>element<=fromYadapted)}] as PathPoint[];
  //console.log(result);
  const STEPXY=15;

  if(result) {
    const startPathPoint = myPath[0];
    const startPathMatrixX = startPathPoint.xm ?? 0;
    const startPathMatrixY = startPathPoint.ym ?? 0;
    if(startPathMatrixX!=start_matrix_index_x || startPathMatrixY!=start_matrix_index_y) {
      let next_x=0;
      let next_y=0;
      if(start_matrix_index_x>startPathMatrixX) {
        // step from left to the right: keep y, define x
        next_y=myPath[0].y;
        next_x=(x_arr[start_matrix_index_x] + x_arr[start_matrix_index_x+1])/2;
        next_x=Math.min(x_arr[start_matrix_index_x] + STEPXY, next_x);
      }
      if(start_matrix_index_x<startPathMatrixX) {
        // step from right to the left: keep y, define x
        next_y=myPath[0].y;
        next_x=(x_arr[start_matrix_index_x] + x_arr[start_matrix_index_x+1])/2;
        next_x=Math.max(x_arr[start_matrix_index_x+1] - STEPXY, next_x);
      }
      if(start_matrix_index_y>startPathMatrixY) {
        // step top-down: keep x, define y
        next_x=myPath[0].x;
        next_y=(y_arr[start_matrix_index_y] + y_arr[start_matrix_index_y+1])/2;
        next_y=Math.min(y_arr[start_matrix_index_y] + STEPXY, next_y);
      }
      if(start_matrix_index_y<startPathMatrixY) {
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
    if(
      myPath[i].x==myPath[i+1].x &&
      myPath[i+1].x==myPath[i+2].x &&
      !isProtectedEndpointStubIndex(myPath, i + 1)
    ){
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
    if(
      myPath[i].y==myPath[i+1].y &&
      myPath[i+1].y==myPath[i+2].y &&
      !isProtectedEndpointStubIndex(myPath, i + 1)
    ){
      myPath.splice(i+1,1);
    } else {
      deleted=false;
      i=i+1;
    }
  }

  // for all segments except the first and the last check if the segment would cover or cross another edge segment.
  // If needed, shift it inside the whole free corridor, including neighboring grid elements.
  for(let i=1; i<myPath.length-2; i++) {
    const tx1=myPath[i].x;
    const tx2=myPath[i+1].x;
    const ty1=myPath[i].y;
    const ty2=myPath[i+1].y;

    if(tx1==tx2) {
      shiftVerticalSegmentAwayFromCovering(myPath, i, matrix, x_arr, y_arr, edges, options);
    }

    if(ty1==ty2) {
      shiftHorizontalSegmentAwayFromCovering(myPath, i, matrix, x_arr, y_arr, edges, options);
    }

  }
  return simplifyOrthogonalPath(myPath, edges, options);
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

    let fromHandle_prefferedLineDirectionRotated=endpointLineDirection(fromNode, startHandle, fromXadapted, fromYadapted);

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

    let toHandle_prefferedLineDirectionRotated=endpointLineDirection(toNode, endHandle, toXadapted, toYadapted);

    //find path using modified A-Star algorithm (return areas on the matrix)
    const rev1=getPathResult(matrix, x_arr, y_arr, fromNode, toNode, fromXadapted, fromYadapted, toXadapted, toYadapted, fromHandle_prefferedLineDirectionRotated, toHandle_prefferedLineDirectionRotated);
    const result=rev1.result;
    const start_matrix_index_x=rev1.start_matrix_index_x;
    const start_matrix_index_y=rev1.start_matrix_index_y;

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
        sourceNodeId: fromNodeId,
        targetNodeId: toNodeId,
        sourceDirection: fromHandle_prefferedLineDirectionRotated,
        targetDirection: toHandle_prefferedLineDirectionRotated,
      },
    );
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
