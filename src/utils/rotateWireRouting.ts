import type { Edge, Node } from '@xyflow/react';

import type { ComponentDataType, DirectionType, EdgeDataType, XYPoint, edgePoint } from '../types';
import {
  buildPath,
  createMatrix,
  endpointLineDirection,
  getPathResult,
} from './pathfinder_functions';
import {
  findHandleData,
  getRenderedWireEndpoint,
} from './utils_functions';

export const ROTATE_WIRE_PIN_STUB_ENABLED = true;
export const ROTATE_WIRE_SHIFT_BENDS_ENABLED = false;
export const ROTATE_WIRE_PATHFINDER_ENABLED = true;

const ROTATE_WIRE_PIN_STUB_LENGTH = 12;
const EPSILON = 0.001;
const PATHFINDER_ENDPOINT_ANCHOR_TOLERANCE = 32;

type RotateComponentWiresParams = {
  nodes: Node[];
  edges: Edge[];
  nodeId: string;
  newRotation: number;
  pathFindingEnabled: boolean;
};

type RerouteWireItem = {
  edge: Edge;
  originalIndex: number;
  sourcePoint: XYPoint;
  targetPoint: XYPoint;
  distance: number;
  pairKey: string;
};

type RerouteWireGroup = {
  pairKey: string;
  items: RerouteWireItem[];
  originalIndex: number;
  minDistance: number;
  averageDistance: number;
};

type RouteWireWithPathfinderOptions = {
  enforceEndpointDirections?: boolean;
  bindToRenderedEndpoints?: boolean;
};

type WireRoute = {
  startXY: XYPoint;
  endXY: XYPoint;
  edgePoints: edgePoint[];
};

type WireRoutingDiagnostic = {
  edgeId: string;
  segmentIndex: number;
  from: XYPoint;
  to: XYPoint;
};

const getRotatedNodeSize = (node: Node, rotation: number) => {
  const nodeData = getNodeData(node);
  const image = nodeData?.image;
  if(!nodeData || !image) return undefined;

  const nodeLength = nodeData.nodeLength || 1;
  const borderWidth = nodeData.borderWidth || 0;
  const rotationSwapsSize = rotation === 90 || rotation === 270;
  const contentWidth = rotationSwapsSize ? image.height : nodeLength * image.width;
  const contentHeight = rotationSwapsSize ? nodeLength * image.width : image.height;

  return {
    width: contentWidth + borderWidth * 2,
    height: contentHeight + borderWidth * 2,
  };
};

const normalizeEndpointForRenderedWire = (
  point: XYPoint,
  direction: DirectionType,
  role: 'source' | 'target',
) => {
  if(role === 'target') return point;

  if(directionIsHorizontal(direction)) return {...point, y: Math.round(point.y)};
  if(directionIsVertical(direction)) return {...point, x: Math.round(point.x)};
  return point;
};

const pointFromEdgePoint = (point: edgePoint): XYPoint => ({x: point.x, y: point.y});

const edgePointFromPoint = (point: XYPoint): edgePoint => ({
  x: point.x,
  y: point.y,
  active: -1,
});

const sameNumber = (a: number, b: number) => Math.abs(a - b) <= EPSILON;

const isHorizontalOrVertical = (a: XYPoint, b: XYPoint) => (
  sameNumber(a.x, b.x) || sameNumber(a.y, b.y)
);

const isFinitePoint = (point: XYPoint | undefined): point is XYPoint => (
  Boolean(point) &&
  Number.isFinite(point?.x) &&
  Number.isFinite(point?.y)
);

const isGeometricallyCollinear = (a: XYPoint, b: XYPoint, c: XYPoint) => (
  Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) <= EPSILON
);

const isOrthogonallyCollinear = (a: XYPoint, b: XYPoint, c: XYPoint) => (
  (sameNumber(a.x, b.x) && sameNumber(b.x, c.x)) ||
  (sameNumber(a.y, b.y) && sameNumber(b.y, c.y))
);

const isProtectedEndpointStubIndex = (points: XYPoint[], index: number) => (
  points.length > 2 &&
  (index === 1 || index === points.length - 2)
);

const removeRedundantPoints = (points: XYPoint[], preserveEndpointStubs = false) => {
  const withoutDuplicates = points.filter((point, index) => (
    index === 0 || !sameNumber(point.x, points[index - 1].x) || !sameNumber(point.y, points[index - 1].y)
  ));
  const compacted = [...withoutDuplicates];

  let changed = true;
  while(changed) {
    changed = false;
    for(let index = 1; index < compacted.length - 1; index += 1) {
      if(preserveEndpointStubs && isProtectedEndpointStubIndex(compacted, index)) continue;

      const canRemovePoint = preserveEndpointStubs
        ? isOrthogonallyCollinear(compacted[index - 1], compacted[index], compacted[index + 1])
        : isGeometricallyCollinear(compacted[index - 1], compacted[index], compacted[index + 1]);

      if(canRemovePoint) {
        compacted.splice(index, 1);
        changed = true;
        break;
      }
    }
  }

  return compacted;
};

const getNodeData = (node: Node | undefined) => node?.data as ComponentDataType | undefined;

const getHandle = (node: Node | undefined, handleId?: string | null) => {
  return findHandleData(node, handleId);
};

const getHandleConnectionPoint = (node: Node, handleId?: string | null): XYPoint | undefined => {
  return getRenderedWireEndpoint(node, handleId);
};

const getEdgePoints = (edgeData: EdgeDataType) => (
  [
    edgeData.startXY,
    ...(edgeData.edgePoints ?? []).map(pointFromEdgePoint),
    edgeData.endXY,
  ].filter((point): point is XYPoint => Boolean(point))
);

const getRoutePoints = (route: WireRoute) => [
  route.startXY,
  ...route.edgePoints.map(pointFromEdgePoint),
  route.endXY,
];

export const findNonOrthogonalWireRouteSegments = (
  edgeId: string,
  route: WireRoute,
): WireRoutingDiagnostic[] => {
  const points = getRoutePoints(route);
  return points
    .slice(0, -1)
    .flatMap((point, index) => {
      const nextPoint = points[index + 1];
      return nextPoint && !isHorizontalOrVertical(point, nextPoint)
        ? [{
          edgeId,
          segmentIndex: index,
          from: point,
          to: nextPoint,
        }]
        : [];
    });
};

const warnNonOrthogonalWireRouteSegments = (
  edgeId: string,
  route: WireRoute,
  context: string,
) => {
  if(!import.meta.env.DEV) return;

  const diagnostics = findNonOrthogonalWireRouteSegments(edgeId, route);
  if(diagnostics.length === 0) return;

  console.warn(`[wire-routing] non-orthogonal ${context} route`, diagnostics);
};

const pointFromDirection = (start: XYPoint, direction: DirectionType, length: number): XYPoint | undefined => {
  if(direction === 'right') return {x: start.x + length, y: start.y};
  if(direction === 'left') return {x: start.x - length, y: start.y};
  if(direction === 'down') return {x: start.x, y: start.y + length};
  if(direction === 'up') return {x: start.x, y: start.y - length};
  return undefined;
};

const oppositeDirection = (direction: DirectionType): DirectionType => {
  if(direction === 'left') return 'right';
  if(direction === 'right') return 'left';
  if(direction === 'up') return 'down';
  if(direction === 'down') return 'up';
  return undefined;
};

const segmentLeavesInDirection = (from: XYPoint, to: XYPoint, direction: DirectionType) => {
  if(direction === 'right') return sameNumber(from.y, to.y) && to.x > from.x + EPSILON;
  if(direction === 'left') return sameNumber(from.y, to.y) && to.x < from.x - EPSILON;
  if(direction === 'down') return sameNumber(from.x, to.x) && to.y > from.y + EPSILON;
  if(direction === 'up') return sameNumber(from.x, to.x) && to.y < from.y - EPSILON;
  return true;
};

const directionIsHorizontal = (direction: DirectionType) => direction === 'left' || direction === 'right';

const directionIsVertical = (direction: DirectionType) => direction === 'up' || direction === 'down';

const forceStubOntoEndpointAxis = (
  endpoint: XYPoint,
  stub: XYPoint,
  direction: DirectionType,
) => {
  if(directionIsHorizontal(direction)) return {...stub, y: endpoint.y};
  if(directionIsVertical(direction)) return {...stub, x: endpoint.x};
  return stub;
};

const forceEndpointStubsOntoAxes = (
  points: XYPoint[],
  sourceDirection: DirectionType,
  targetDirection: DirectionType,
) => {
  if(points.length < 2) return points;

  const nextPoints = points.map((point) => ({...point}));

  if(sourceDirection) {
    const sourceStub = forceStubOntoEndpointAxis(nextPoints[0], nextPoints[1], sourceDirection);
    nextPoints[1] = segmentLeavesInDirection(nextPoints[0], sourceStub, sourceDirection)
      ? sourceStub
      : pointFromDirection(nextPoints[0], sourceDirection, ROTATE_WIRE_PIN_STUB_LENGTH) ?? sourceStub;
  }

  if(targetDirection) {
    const targetStubIndex = nextPoints.length - 2;
    const targetEndpointIndex = nextPoints.length - 1;
    const targetIncomingDirection = oppositeDirection(targetDirection);
    const targetStub = forceStubOntoEndpointAxis(
      nextPoints[targetEndpointIndex],
      nextPoints[targetStubIndex],
      targetDirection,
    );
    nextPoints[targetStubIndex] = segmentLeavesInDirection(targetStub, nextPoints[targetEndpointIndex], targetIncomingDirection)
      ? targetStub
      : pointFromDirection(nextPoints[targetEndpointIndex], targetDirection, ROTATE_WIRE_PIN_STUB_LENGTH) ?? targetStub;
  }

  return nextPoints;
};

const addStub = (
  points: XYPoint[],
  atStart: boolean,
  direction: DirectionType,
) => {
  const endpoint = atStart ? points[0] : points[points.length - 1];
  const stubPoint = pointFromDirection(endpoint, direction, ROTATE_WIRE_PIN_STUB_LENGTH);
  if(!stubPoint) return points;

  return atStart
    ? [endpoint, stubPoint, ...points.slice(1)]
    : [...points.slice(0, -1), stubPoint, endpoint];
};

const shiftBendAfterStub = (points: XYPoint[], atStart: boolean, direction: DirectionType) => {
  if(points.length < 3 || !direction) return points;

  const nextPoints = points.map((point) => ({...point}));
  const stubPointIndex = atStart ? 1 : nextPoints.length - 2;
  const bendIndex = atStart ? 2 : nextPoints.length - 3;
  const stubPoint = nextPoints[stubPointIndex];
  const bendPoint = nextPoints[bendIndex];
  if(!stubPoint || !bendPoint || isHorizontalOrVertical(stubPoint, bendPoint)) return nextPoints;

  const bendIsOppositeStub = atStart
    ? bendIndex >= nextPoints.length - 2
    : bendIndex <= 1;
  if(bendIsOppositeStub) {
    const insertedPoint = directionIsHorizontal(direction)
      ? {x: stubPoint.x, y: bendPoint.y}
      : {x: bendPoint.x, y: stubPoint.y};

    if(atStart) {
      nextPoints.splice(stubPointIndex + 1, 0, insertedPoint);
    } else {
      nextPoints.splice(stubPointIndex, 0, insertedPoint);
    }
    return nextPoints;
  }

  if(directionIsHorizontal(direction)) {
    nextPoints[bendIndex] = {...bendPoint, x: stubPoint.x};
  } else {
    nextPoints[bendIndex] = {...bendPoint, y: stubPoint.y};
  }

  return nextPoints;
};

const nodeIsSolderJoint = (node: Node | undefined) => (
  getNodeData(node)?.technicalID === 'SolderJoint'
);

const distanceBetweenPoints = (a: XYPoint, b: XYPoint) => (
  Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
);

const getRenderedEndpointAnchor = (
  renderedPoint: XYPoint | undefined,
  pathfinderPoint: XYPoint,
) => (
  isFinitePoint(renderedPoint) &&
  distanceBetweenPoints(renderedPoint, pathfinderPoint) <= PATHFINDER_ENDPOINT_ANCHOR_TOLERANCE
    ? renderedPoint
    : pathfinderPoint
);

const segmentAxis = (from: XYPoint, to: XYPoint): 'horizontal' | 'vertical' => {
  if(sameNumber(from.x, to.x)) return 'vertical';
  if(sameNumber(from.y, to.y)) return 'horizontal';

  return Math.abs(to.x - from.x) >= Math.abs(to.y - from.y)
    ? 'horizontal'
    : 'vertical';
};

const forcePointOntoEndpointAxis = (
  point: XYPoint,
  endpoint: XYPoint,
  axis: 'horizontal' | 'vertical',
) => (
  axis === 'vertical'
    ? {...point, x: endpoint.x}
    : {...point, y: endpoint.y}
);

const makeRoutePathOrthogonal = (points: XYPoint[], preserveEndpointStubs = false) => {
  const orthogonalPoints: XYPoint[] = [];

  points.forEach((point, index) => {
    if(index === 0) {
      orthogonalPoints.push(point);
      return;
    }

    const previous = orthogonalPoints[orthogonalPoints.length - 1];
    if(!previous || isHorizontalOrVertical(previous, point)) {
      orthogonalPoints.push(point);
      return;
    }

    const next = points[index + 1];
    const viaX = {x: point.x, y: previous.y};
    const viaY = {x: previous.x, y: point.y};
    const via = next && isHorizontalOrVertical(viaY, next) ? viaY : viaX;

    orthogonalPoints.push(via, point);
  });

  return removeRedundantPoints(orthogonalPoints, preserveEndpointStubs);
};

const enforceEndpointDirections = (
  points: XYPoint[],
  sourceDirection: DirectionType,
  targetDirection: DirectionType,
) => {
  if(points.length < 2) return points;

  const nextPoints = points.map((point) => ({...point}));

  if(
    sourceDirection &&
    !segmentLeavesInDirection(nextPoints[0], nextPoints[1], sourceDirection)
  ) {
    const sourceStub = pointFromDirection(nextPoints[0], sourceDirection, ROTATE_WIRE_PIN_STUB_LENGTH);
    if(sourceStub) {
      if(nextPoints.length === 2) {
        nextPoints.splice(1, 0, sourceStub);
      } else {
        nextPoints[1] = sourceStub;
      }
    }
  }

  const targetIncomingDirection = oppositeDirection(targetDirection);
  if(
    targetIncomingDirection &&
    !segmentLeavesInDirection(nextPoints[nextPoints.length - 2], nextPoints[nextPoints.length - 1], targetIncomingDirection)
  ) {
    const targetStub = pointFromDirection(nextPoints[nextPoints.length - 1], targetDirection, ROTATE_WIRE_PIN_STUB_LENGTH);
    if(targetStub) {
      if(nextPoints.length <= 3) {
        nextPoints.splice(nextPoints.length - 1, 0, targetStub);
      } else {
        nextPoints[nextPoints.length - 2] = targetStub;
      }
    }
  }

  const orthogonalPoints = makeRoutePathOrthogonal(nextPoints, true);
  return forceEndpointStubsOntoAxes(orthogonalPoints, sourceDirection, targetDirection);
};

const bindPathfinderPathToRenderedEndpoints = (
  points: XYPoint[],
  renderedStart: XYPoint | undefined,
  renderedEnd: XYPoint | undefined,
) => {
  if(points.length < 2) return points;

  const nextPoints = points.map((point) => ({...point}));
  const startAnchor = getRenderedEndpointAnchor(renderedStart, nextPoints[0]);
  const endAnchor = getRenderedEndpointAnchor(renderedEnd, nextPoints[nextPoints.length - 1]);
  if(nextPoints.length === 2) {
    return makeRoutePathOrthogonal([startAnchor, endAnchor]);
  }

  const startAxis = segmentAxis(nextPoints[0], nextPoints[1]);
  const endAxis = segmentAxis(nextPoints[nextPoints.length - 2], nextPoints[nextPoints.length - 1]);

  nextPoints[0] = startAnchor;
  nextPoints[1] = forcePointOntoEndpointAxis(nextPoints[1], startAnchor, startAxis);
  nextPoints[nextPoints.length - 1] = endAnchor;
  nextPoints[nextPoints.length - 2] = forcePointOntoEndpointAxis(
    nextPoints[nextPoints.length - 2],
    endAnchor,
    endAxis,
  );

  return makeRoutePathOrthogonal(nextPoints);
};

const componentPairKey = (edge: Edge) => (
  [edge.source, edge.target].sort().join('::')
);

const handleSortValue = (item: RerouteWireItem, nodeId: string, axis: 'x' | 'y') => {
  const point = item.edge.source === nodeId ? item.sourcePoint : item.targetPoint;
  return point[axis];
};

const groupSortAxis = (items: RerouteWireItem[], nodeId: string): 'x' | 'y' => {
  const valuesX = items.map((item) => handleSortValue(item, nodeId, 'x'));
  const valuesY = items.map((item) => handleSortValue(item, nodeId, 'y'));
  const spreadX = Math.max(...valuesX) - Math.min(...valuesX);
  const spreadY = Math.max(...valuesY) - Math.min(...valuesY);
  return spreadX >= spreadY ? 'x' : 'y';
};

const sortGroupItems = (group: RerouteWireGroup) => {
  const [firstNodeId, secondNodeId] = group.pairKey.split('::');
  const firstAxis = groupSortAxis(group.items, firstNodeId);
  const secondAxis = groupSortAxis(group.items, secondNodeId);

  return [...group.items].sort((a, b) => (
    a.distance - b.distance ||
    handleSortValue(a, firstNodeId, firstAxis) - handleSortValue(b, firstNodeId, firstAxis) ||
    handleSortValue(a, secondNodeId, secondAxis) - handleSortValue(b, secondNodeId, secondAxis) ||
    a.originalIndex - b.originalIndex
  ));
};

const getRerouteWireItems = (nodes: Node[], edges: Edge[]) => (
  edges.flatMap((edge, originalIndex): RerouteWireItem[] => {
    const edgeData = edge.data as EdgeDataType | undefined;
    if(edge.type !== 'editable-wire-type' || !edgeData || !edge.sourceHandle || !edge.targetHandle) return [];

    const sourceNode = nodes.find((node) => node.id === edge.source);
    const targetNode = nodes.find((node) => node.id === edge.target);
    if(!sourceNode || !targetNode) return [];

    const sourcePoint = getHandleConnectionPoint(sourceNode, edge.sourceHandle);
    const targetPoint = getHandleConnectionPoint(targetNode, edge.targetHandle);
    if(!sourcePoint || !targetPoint) return [];

    return [{
      edge,
      originalIndex,
      sourcePoint,
      targetPoint,
      distance: distanceBetweenPoints(sourcePoint, targetPoint),
      pairKey: componentPairKey(edge),
    }];
  })
);

const getSortedRerouteWireItems = (nodes: Node[], edges: Edge[]) => {
  const items = getRerouteWireItems(nodes, edges);
  const groupByPairKey = new Map<string, RerouteWireItem[]>();

  items.forEach((item) => {
    groupByPairKey.set(item.pairKey, [...(groupByPairKey.get(item.pairKey) ?? []), item]);
  });

  const groups = Array.from(groupByPairKey.entries()).map(([pairKey, groupItems]): RerouteWireGroup => ({
    pairKey,
    items: groupItems,
    originalIndex: Math.min(...groupItems.map((item) => item.originalIndex)),
    minDistance: Math.min(...groupItems.map((item) => item.distance)),
    averageDistance: groupItems.reduce((sum, item) => sum + item.distance, 0) / groupItems.length,
  }));

  return groups
    .sort((a, b) => (
      a.minDistance - b.minDistance ||
      a.averageDistance - b.averageDistance ||
      a.originalIndex - b.originalIndex
    ))
    .flatMap(sortGroupItems);
};

export const routeWireWithPathfinder = (
  nodes: Node[],
  edges: Edge[],
  edge: Edge,
  options: RouteWireWithPathfinderOptions = {},
) => {
  const sourceNode = nodes.find((node) => node.id === edge.source);
  const targetNode = nodes.find((node) => node.id === edge.target);
  if(!sourceNode || !targetNode || !edge.sourceHandle || !edge.targetHandle) return undefined;

  let sourcePoint = getHandleConnectionPoint(sourceNode, edge.sourceHandle);
  let targetPoint = getHandleConnectionPoint(targetNode, edge.targetHandle);
  if(!sourcePoint || !targetPoint) return undefined;

  const sourceHandle = getHandle(sourceNode, edge.sourceHandle);
  const targetHandle = getHandle(targetNode, edge.targetHandle);
  const sourceDirection = endpointLineDirection(sourceNode, sourceHandle, sourcePoint.x, sourcePoint.y);
  const targetDirection = endpointLineDirection(targetNode, targetHandle, targetPoint.x, targetPoint.y);
  sourcePoint = normalizeEndpointForRenderedWire(sourcePoint, sourceDirection, 'source');
  targetPoint = normalizeEndpointForRenderedWire(targetPoint, targetDirection, 'target');
  const {x_arr, y_arr, matrix, obstacleRects} = createMatrix(nodes);
  const pathResult = getPathResult(
    matrix,
    x_arr,
    y_arr,
    sourceNode,
    targetNode,
    sourcePoint.x,
    sourcePoint.y,
    targetPoint.x,
    targetPoint.y,
    sourceDirection,
    targetDirection,
  );
  const path = buildPath(
    edges,
    pathResult.result,
    matrix,
    x_arr,
    y_arr,
    sourcePoint.x,
    sourcePoint.y,
    targetPoint.x,
    targetPoint.y,
    pathResult.start_matrix_index_x,
    pathResult.start_matrix_index_y,
    {
      obstacleRects,
      sourceNodeId: sourceNode.id,
      targetNodeId: targetNode.id,
      sourceDirection,
      targetDirection,
    },
  );
  const edgeData = edge.data as EdgeDataType | undefined;
  const anchoredPath = options.bindToRenderedEndpoints === false
    ? path
    : bindPathfinderPathToRenderedEndpoints(
      path,
      edgeData?.startXY,
      edgeData?.endXY,
    );
  const finalPath = options.enforceEndpointDirections
    ? enforceEndpointDirections(anchoredPath, sourceDirection, targetDirection)
    : anchoredPath;
  if(finalPath.length < 2) return undefined;

  return {
    startXY: finalPath[0],
    endXY: finalPath[finalPath.length - 1],
    edgePoints: finalPath.slice(1, -1).map(edgePointFromPoint),
  };
};

export const rerouteAllWiresWithPathfinder = (
  nodes: Node[],
  edges: Edge[],
) => {
  const sortedItems = getSortedRerouteWireItems(nodes, edges);
  const updatedEdgeById = new Map<string, Edge>();
  let workingRoutingEdges: Edge[] = [];

  sortedItems.forEach(({edge}) => {
    const edgeData = edge.data as EdgeDataType | undefined;
    if(!edgeData) return;

    const route = routeWireWithPathfinder(nodes, workingRoutingEdges, edge);
    const updatedEdge = route
      ? {
        ...edge,
        data: {
          ...edgeData,
          ...route,
        },
      }
      : edge;

    updatedEdgeById.set(edge.id, updatedEdge);
    workingRoutingEdges = [...workingRoutingEdges, updatedEdge];
  });

  return edges.map((edge) => updatedEdgeById.get(edge.id) ?? edge);
};

const routeWithStubs = (
  nodes: Node[],
  edge: Edge,
  edgeData: EdgeDataType,
  rotatedNodeId: string,
  shiftBends: boolean,
) => {
  const oldPoints = getEdgePoints(edgeData);
  if(oldPoints.length < 2) return undefined;

  const sourceNode = nodes.find((node) => node.id === edge.source);
  const targetNode = nodes.find((node) => node.id === edge.target);
  if(!sourceNode || !targetNode) return undefined;

  let sourcePoint = getHandleConnectionPoint(sourceNode, edge.sourceHandle);
  let targetPoint = getHandleConnectionPoint(targetNode, edge.targetHandle);
  if(!sourcePoint || !targetPoint) return undefined;

  const sourceHandle = getHandle(sourceNode, edge.sourceHandle);
  const targetHandle = getHandle(targetNode, edge.targetHandle);
  const sourceDirection = endpointLineDirection(sourceNode, sourceHandle, sourcePoint.x, sourcePoint.y);
  const targetDirection = endpointLineDirection(targetNode, targetHandle, targetPoint.x, targetPoint.y);
  sourcePoint = normalizeEndpointForRenderedWire(sourcePoint, sourceDirection, 'source');
  targetPoint = normalizeEndpointForRenderedWire(targetPoint, targetDirection, 'target');
  const sourceRotated = edge.source === rotatedNodeId;
  const targetRotated = edge.target === rotatedNodeId;
  const oldInnerPoints = (edgeData.edgePoints ?? []).map(pointFromEdgePoint);
  let points = [sourcePoint, ...oldInnerPoints, targetPoint];

  let sourceStubDirection: DirectionType;
  let targetStubDirection: DirectionType;

  if(sourceRotated) {
    sourceStubDirection = sourceDirection;
    points = addStub(points, true, sourceStubDirection);
  }

  if(targetRotated) {
    targetStubDirection = targetDirection;
    points = addStub(points, false, targetStubDirection);
  }

  if(oldInnerPoints.length === 0 && sourceRotated && !targetRotated && !nodeIsSolderJoint(targetNode)) {
    targetStubDirection = targetDirection;
    points = addStub(points, false, targetStubDirection);
  }

  if(oldInnerPoints.length === 0 && targetRotated && !sourceRotated && !nodeIsSolderJoint(sourceNode)) {
    sourceStubDirection = sourceDirection;
    points = addStub(points, true, sourceStubDirection);
  }

  if(shiftBends) {
    if(sourceStubDirection) {
      points = shiftBendAfterStub(points, true, sourceStubDirection);
    }
    if(targetStubDirection) {
      points = shiftBendAfterStub(points, false, targetStubDirection);
    }
  }

  const compactedPoints = enforceEndpointDirections(points, sourceDirection, targetDirection);
  return {
    startXY: compactedPoints[0],
    endXY: compactedPoints[compactedPoints.length - 1],
    edgePoints: compactedPoints.slice(1, -1).map(edgePointFromPoint),
  };
};

export const rotateComponentWires = ({
  nodes,
  edges,
  nodeId,
  newRotation,
  pathFindingEnabled,
}: RotateComponentWiresParams) => {
  const updatedNodes = nodes.map((node) => (
    node.id === nodeId
      ? (() => {
        const rotatedSize = getRotatedNodeSize(node, newRotation);
        return {
          ...node,
          ...(rotatedSize
            ? {
              width: rotatedSize.width,
              height: rotatedSize.height,
              measured: {
                ...node.measured,
                ...rotatedSize,
              },
            }
            : {}),
          data: {
            ...(node.data as ComponentDataType),
            rotation: newRotation,
          },
        };
      })()
      : node
  ));
  const pathfinderActive = (
    ROTATE_WIRE_PIN_STUB_ENABLED &&
    ROTATE_WIRE_PATHFINDER_ENABLED &&
    pathFindingEnabled
  );
  const shiftBendsActive = (
    ROTATE_WIRE_PIN_STUB_ENABLED &&
    ROTATE_WIRE_SHIFT_BENDS_ENABLED &&
    pathFindingEnabled
  );

  if(!pathFindingEnabled) {
    return edges;
  }

  if(pathfinderActive) {
    let workingEdges = [...edges];
    const affectedEdgeIds = edges
      .filter((edge) => {
        const edgeData = edge.data as EdgeDataType | undefined;
        return (
          edge.type === 'editable-wire-type' &&
          edgeData &&
          (edge.source === nodeId || edge.target === nodeId)
        );
      })
      .map((edge) => edge.id);

    affectedEdgeIds.forEach((edgeId) => {
      const currentEdge = workingEdges.find((edge) => edge.id === edgeId);
      const currentEdgeData = currentEdge?.data as EdgeDataType | undefined;
      if(!currentEdge || !currentEdgeData) return;

      const routingEdges = workingEdges.filter((edge) => edge.id !== edgeId);
      const route = routeWireWithPathfinder(updatedNodes, routingEdges, currentEdge, {
        bindToRenderedEndpoints: false,
        enforceEndpointDirections: true,
      })
        ?? (ROTATE_WIRE_PIN_STUB_ENABLED
          ? routeWithStubs(updatedNodes, currentEdge, currentEdgeData, nodeId, shiftBendsActive)
          : undefined);
      if(!route) return;
      warnNonOrthogonalWireRouteSegments(currentEdge.id, route, 'component rotation');

      const updatedEdge = {
        ...currentEdge,
        data: {
          ...currentEdgeData,
          ...route,
        },
      };

      workingEdges = workingEdges.map((edge) => (
        edge.id === edgeId
          ? updatedEdge
          : edge
      ));
    });

    return workingEdges;
  }

  return edges.map((edge) => {
    const edgeData = edge.data as EdgeDataType | undefined;
    if(edge.type !== 'editable-wire-type' || !edgeData || (edge.source !== nodeId && edge.target !== nodeId)) {
      return edge;
    }

    const route = ROTATE_WIRE_PIN_STUB_ENABLED
      ? routeWithStubs(updatedNodes, edge, edgeData, nodeId, shiftBendsActive)
      : undefined;

    if(!route) return edge;
    warnNonOrthogonalWireRouteSegments(edge.id, route, 'component rotation fallback');

    return {
      ...edge,
      data: {
        ...edgeData,
        ...route,
      },
    };
  });
};
