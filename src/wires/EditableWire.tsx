import {useState, useEffect, useRef, useCallback} from 'react';

import {
  EdgeProps,
  getStraightPath,
  BaseEdge,
  EdgeLabelRenderer,
  useReactFlow,
  useInternalNode,
  type Edge,
  type Node,
} from "@xyflow/react";

import { useTranslation } from "react-i18next";

import {InputNumber, Flex, Tooltip, Popover, ColorPicker, ColorPickerProps, Radio, Select} from 'antd';

import {DeleteOutlined, ColumnWidthOutlined, InfoCircleOutlined, ShareAltOutlined, BranchesOutlined} from '@ant-design/icons'
import Icon from '@ant-design/icons';

import LineWidthSvg from '../icons/linewidth.svg?react';
import CrosssectionSvg from '../icons/crosssection.svg?react';

import { gray, red, green, blue, cyan, purple, magenta, gold } from '@ant-design/colors';

import "./EditableWire.css";
import { WireInfoNode } from "../components/catalog/internalTemplates.ts";

import {ComponentDataType, EdgeDataType, edgePoint, XYPoint, intersectionPoint, segmentData, type EditableWire} from "../types.ts";
import {canonicalizeColorForCompare, colorNameToRGBString, findHandleData, getRenderedWireEndpoint, postypeToAdjustedXY} from "../utils/utils_functions.ts";
import { collapseMergeableSolderJoints, getSolderJointEndpointIds } from "../utils/wireMerge.ts";
import { getSegmentOrientation, moveWireSegment, type SegmentOrientation } from "../utils/wireSegmentMove.ts";
import { applySolderJointSegmentMove } from "../utils/solderJointSegmentMove.ts";
import { snapWireSegmentAxisValue } from "../utils/wireSegmentSnap.ts";
import { useUndoRedo } from "../utils/undoRedo.tsx";
import { useSelectedElementsCount } from "../utils/useSelectedElementsCount.ts";
import { createDiagramCheckContext } from "../check/checkContext.ts";
import { useZustandStore } from "../utils/pathfinder_functions.ts";
import { routeWireWithPathfinder } from "../utils/rotateWireRouting.ts";
import { useSimulationResultStore } from "../simulation/simulationResultStore.ts";
import {
  DEFAULT_USB_WIRE_AWG,
  GENERAL_WIRE_AWG_PRESETS,
  GENERAL_WIRE_MM2_PRESETS,
  USB_WIRE_AWG_PRESETS,
  USB_WIRE_MM2_PRESETS,
} from "./wireDefaults.ts";

const ROUNDN=1;
const SEGMENT_DRAG_THRESHOLD = 4;
const PIN_STUB_LENGTH = 12;
const SEGMENT_DRAG_HANDLE_GAP_PX = 16;
const SEGMENT_DRAG_CENTER_GAP_PX = 20;
const SEGMENT_DRAG_MIN_PART_LENGTH_PX = 8;
const SEGMENT_DRAG_DEBUG_STORAGE_KEY = 'wledWireSegmentDragDebug';
const SEGMENT_TOUCH_DRAG_RESTART_SUPPRESS_MS = 450;
const WIRE_TOOLBAR_WIDTH_PX = 190;
const WIRE_TOOLBAR_HEIGHT_PX = 34;
const WIRE_TOOLBAR_GAP_PX = 12;
const WIRE_TOOLBAR_VIEWPORT_MARGIN_PX = 12;
const WIRE_TOOLBAR_HANDLE_CLEARANCE_PX = 14;
const WIRE_TOOLBAR_OVERLAP_PENALTY = 10000;
const WIRE_JUMP_MIN_RADIUS = 3;
const WIRE_JUMP_MAX_RADIUS = 18;
const WIRE_JUMP_BASE_RADIUS = 1.5;
const WIRE_JUMP_CLEARANCE = 1;
const WIRE_JUMP_MIN_SIN_ANGLE = 0.35;
const WIRE_JUMP_SPLINE_SIN_ANGLE = 0.58;
const WIRE_JUMP_SPLINE_MAX_LENGTH_FACTOR = 1.6;
const WIRE_JUMP_SPLINE_HEIGHT_FACTOR = 0.85;
const WIRE_JUMP_HALO_COLOR = '#fff';
const WIRE_JUMP_HALO_WIDTH_EXTRA = 3;
const WIRE_JUMP_MERGE_GAP = 2;
const WIRE_JUMP_MERGED_HEIGHT_EXTRA = 1.5;
const MIXED_WIRE_VALUE_PLACEHOLDER = "-";

let globalSegmentDragSession = 0;
let globalSegmentDragCleanup: (() => void) | null = null;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const finiteNumberOr = (value: unknown, fallback: number) => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

type AggregatedWireValue<T> =
  | {kind: 'empty'}
  | {kind: 'mixed'}
  | {kind: 'single'; value: T};

const aggregateWireValue = <T,>(
  edges: Edge<EdgeDataType>[],
  getValue: (edge: Edge<EdgeDataType>) => T | null | undefined,
): AggregatedWireValue<T> => {
  const rawValues = edges.map(getValue);
  const values = rawValues.filter((value): value is T => value !== null && value !== undefined);
  const hasMissingValue = rawValues.length !== values.length;

  if(values.length === 0) return {kind: 'empty'};
  if(hasMissingValue) return {kind: 'mixed'};

  const first = values[0];
  return values.every((value) => Object.is(value, first))
    ? {kind: 'single', value: first}
    : {kind: 'mixed'};
};

const aggregatedValueOrUndefined = <T,>(value: AggregatedWireValue<T>) => (
  value.kind === 'single' ? value.value : undefined
);

const rectsOverlap = (
  a: {left: number; right: number; top: number; bottom: number},
  b: {left: number; right: number; top: number; bottom: number},
) => (
  a.left < b.right &&
  a.right > b.left &&
  a.top < b.bottom &&
  a.bottom > b.top
);

const rectOverlapArea = (
  a: {left: number; right: number; top: number; bottom: number},
  b: {left: number; right: number; top: number; bottom: number},
) => {
  if(!rectsOverlap(a, b)) return 0;

  return (Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
    (Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
};

const mergeIntervals = (intervals: Array<{start: number; end: number}>) => (
  intervals
    .filter((interval) => interval.end > interval.start)
    .sort((a, b) => a.start - b.start)
    .reduce<Array<{start: number; end: number}>>((merged, interval) => {
      const previous = merged[merged.length - 1];
      if(!previous || interval.start > previous.end) {
        merged.push({...interval});
      } else {
        previous.end = Math.max(previous.end, interval.end);
      }
      return merged;
    }, [])
);

const isValueInIntervals = (value: number, intervals: Array<{start: number; end: number}>) => (
  intervals.some((interval) => value > interval.start && value < interval.end)
);

const findClosestAllowedValue = (
  desired: number,
  min: number,
  max: number,
  forbiddenIntervals: Array<{start: number; end: number}>,
) => {
  if(max <= min) return min;

  const mergedIntervals = mergeIntervals(forbiddenIntervals)
    .map((interval) => ({
      start: clamp(interval.start, min, max),
      end: clamp(interval.end, min, max),
    }))
    .filter((interval) => interval.end > interval.start);
  const clampedDesired = clamp(desired, min, max);
  if(!isValueInIntervals(clampedDesired, mergedIntervals)) return clampedDesired;

  const candidates = [
    min,
    max,
    ...mergedIntervals.flatMap((interval) => [interval.start, interval.end]),
  ]
    .map((candidate) => clamp(candidate, min, max))
    .filter((candidate) => !isValueInIntervals(candidate, mergedIntervals));

  return candidates.reduce(
    (best, candidate) => (
      Math.abs(candidate - desired) < Math.abs(best - desired) ? candidate : best
    ),
    clampedDesired,
  );
};

const intersectIntervals = (
  first: {start: number; end: number} | null,
  second: {start: number; end: number} | null,
) => {
  if(!first || !second) return null;

  const start = Math.max(first.start, second.start);
  const end = Math.min(first.end, second.end);
  return end > start ? {start, end} : null;
};

const rangeOverlapIntervalForShift = (
  rangeStart: number,
  rangeEnd: number,
  obstacleStart: number,
  obstacleEnd: number,
  direction: number,
) => {
  if(Math.abs(direction) < 0.0001) {
    return rangeStart < obstacleEnd && rangeEnd > obstacleStart
      ? {start: Number.NEGATIVE_INFINITY, end: Number.POSITIVE_INFINITY}
      : null;
  }

  const shiftStart = (obstacleStart - rangeEnd) / direction;
  const shiftEnd = (obstacleEnd - rangeStart) / direction;
  return {
    start: Math.min(shiftStart, shiftEnd),
    end: Math.max(shiftStart, shiftEnd),
  };
};

const constrainShiftForViewport = (
  position: number,
  min: number,
  max: number,
  direction: number,
) => {
  if(Math.abs(direction) < 0.0001) {
    return position >= min && position <= max
      ? {start: Number.NEGATIVE_INFINITY, end: Number.POSITIVE_INFINITY}
      : null;
  }

  const shiftStart = (min - position) / direction;
  const shiftEnd = (max - position) / direction;
  return {
    start: Math.min(shiftStart, shiftEnd),
    end: Math.max(shiftStart, shiftEnd),
  };
};

const shiftRectAlongVector = (
  rect: {left: number; right: number; top: number; bottom: number},
  vector: {x: number; y: number},
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  obstacleRects: Array<{left: number; right: number; top: number; bottom: number}>,
) => {
  const viewportShiftRange = intersectIntervals(
    constrainShiftForViewport(rect.left, minX, maxX, vector.x),
    constrainShiftForViewport(rect.top, minY, maxY, vector.y),
  );
  if(!viewportShiftRange) return {x: clamp(rect.left, minX, maxX), y: clamp(rect.top, minY, maxY)};

  const forbiddenShifts = obstacleRects
    .map((obstacleRect) => intersectIntervals(
      rangeOverlapIntervalForShift(rect.left, rect.right, obstacleRect.left, obstacleRect.right, vector.x),
      rangeOverlapIntervalForShift(rect.top, rect.bottom, obstacleRect.top, obstacleRect.bottom, vector.y),
    ))
    .filter((interval): interval is {start: number; end: number} => interval !== null);

  const shift = findClosestAllowedValue(0, viewportShiftRange.start, viewportShiftRange.end, forbiddenShifts);
  return {
    x: rect.left + vector.x * shift,
    y: rect.top + vector.y * shift,
  };
};

type WireToolbarAnchor = XYPoint & {
  segmentIndex?: number;
};

const calculateWireJumpRadius = (
  upperWireWidth: unknown,
  lowerWireWidth: unknown,
  sinAngle: number,
) => {
  const upperWidth = finiteNumberOr(upperWireWidth, 1);
  const lowerWidth = finiteNumberOr(lowerWireWidth, 1);
  const angleFactor = 1 / Math.max(sinAngle, WIRE_JUMP_MIN_SIN_ANGLE);
  const rawRadius = WIRE_JUMP_BASE_RADIUS
    + WIRE_JUMP_CLEARANCE
    + lowerWidth * 0.55 * angleFactor
    + upperWidth * 0.55;

  return clamp(rawRadius, WIRE_JUMP_MIN_RADIUS, WIRE_JUMP_MAX_RADIUS);
};

const calculateSegmentSinAngle = (
  upperSegment: {x0: number; y0: number; x1: number; y1: number},
  lowerSegment: {x0: number; y0: number; x1: number; y1: number},
) => {
  const upperDx = upperSegment.x1 - upperSegment.x0;
  const upperDy = upperSegment.y1 - upperSegment.y0;
  const lowerDx = lowerSegment.x1 - lowerSegment.x0;
  const lowerDy = lowerSegment.y1 - lowerSegment.y0;
  const upperLength = Math.sqrt(upperDx ** 2 + upperDy ** 2);
  const lowerLength = Math.sqrt(lowerDx ** 2 + lowerDy ** 2);
  return upperLength > 0 && lowerLength > 0
    ? Math.abs(upperDx * lowerDy - upperDy * lowerDx) / (upperLength * lowerLength)
    : 1;
};

const getEdgeRenderLayer = (edge: Edge, edgeIndex: number) => (
  typeof edge.zIndex === 'number' && Number.isFinite(edge.zIndex)
    ? edge.zIndex
    : edgeIndex
);

const isWireRenderedAbove = (edgeId: string, otherEdge: Edge, edges: Edge[]) => {
  const edgeIndex = edges.findIndex((edge) => edge.id === edgeId);
  const otherEdgeIndex = edges.findIndex((edge) => edge.id === otherEdge.id);
  if(edgeIndex < 0 || otherEdgeIndex < 0) return false;

  const edgeLayer = getEdgeRenderLayer(edges[edgeIndex], edgeIndex);
  const otherEdgeLayer = getEdgeRenderLayer(otherEdge, otherEdgeIndex);
  if(edgeLayer !== otherEdgeLayer) return edgeLayer > otherEdgeLayer;

  return edgeIndex > otherEdgeIndex;
};

const POINT_LINE_EPSILON = 0.001;

const arePointsCollinear = (a: XYPoint, b: XYPoint, c: XYPoint) => (
  Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) <= POINT_LINE_EPSILON
);

const closestPointOnLine = (point: XYPoint, lineStart: XYPoint, lineEnd: XYPoint) => {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lengthSquared = dx * dx + dy * dy;
  if(lengthSquared <= POINT_LINE_EPSILON) return undefined;

  const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSquared;
  return {
    x: lineStart.x + t * dx,
    y: lineStart.y + t * dy,
  };
};

const distanceBetweenPoints = (a: XYPoint, b: XYPoint) => (
  Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
);

const snapPointToLine = (
  point: XYPoint,
  lineStart: XYPoint,
  lineEnd: XYPoint,
  snapDistance: number,
) => {
  const closestPoint = closestPointOnLine(point, lineStart, lineEnd);
  if(!closestPoint) return point;

  return distanceBetweenPoints(point, closestPoint) <= snapDistance
    ? closestPoint
    : point;
};

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
  const checkHighlighted=Boolean(edgeData.checkHighlighted);
  const simulationHighlighted=Boolean(edgeData.simulationHighlighted);

  const edgePoints = edgeData.edgePoints ?? [];

  // if edge is not selected, check if some edge points can be removed since they are on a straight line
  if(!selected && edgeData.startXY && edgeData.endXY) {
      let i=-1;
      while(i<edgePoints.length-1) {
        let deleted=true;
        while(deleted && i<edgePoints.length-1) {
          const p0=(i==-1)?edgeData.startXY:edgePoints[i];
          const p1=edgePoints[i+1];
          const p2=(i==edgePoints.length-2)?edgeData.endXY:edgePoints[i+2];
          if(arePointsCollinear(p0, p1, p2)){
            edgePoints.splice(i+1,1);
          } else {
            deleted=false;
            i=i+1;
          }
        }
      }
  }

  const edgeSegmentsCount = edgePoints.length + 1;
  const edgeSegmentsArray = [] as Array<segmentData>;

  const [notMooved, setNotMooved] = useState(true);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(-1);
  const [segmentDragDebugMessage, setSegmentDragDebugMessage] = useState('');
  const [wireToolbarAnchor, setWireToolbarAnchor] = useState<WireToolbarAnchor | null>(null);
  const [selectedNetworkEdgeIds, setSelectedNetworkEdgeIds] = useState<string[] | null>(null);

  const reactFlowInstance=useReactFlow();
  const { takeSnapshot } = useUndoRedo();
  const pathFindingEnabled = useZustandStore((state) => state.pathFindingEnabled);
  const setSimulationWireHover = useSimulationResultStore((state) => state.setWireHover);
  const edgePointDragSnapshotTakenRef = useRef(false);
  const segmentDragCleanupRef = useRef<(() => void) | null>(null);
  const suppressSegmentTouchDragUntilRef = useRef(0);
  const segmentDragRef = useRef<{
    sessionId: number;
    segmentIndex: number;
    orientation: SegmentOrientation;
    inputType: 'mouse' | 'touch';
    startClientX: number;
    startClientY: number;
    initialPoints: XYPoint[];
    initialNodes: Node[];
    initialEdges: Edge[];
    hasMoved: boolean;
    snapshotTaken: boolean;
    usedSolderJointMove: boolean;
  } | null>(null);

  const selectedElementsCount = useSelectedElementsCount();
  const multipleSelect = selectedElementsCount > 1;
  const segmentDragDebugEnabled = (
    typeof window !== 'undefined' &&
    window.localStorage.getItem(SEGMENT_DRAG_DEBUG_STORAGE_KEY) === '1'
  );

  const debugSegmentDrag = (message: string, details?: unknown) => {
    if(!segmentDragDebugEnabled) return;

    const timestamp = new Date().toLocaleTimeString();
    setSegmentDragDebugMessage(`${timestamp} ${message}`);
    console.debug('[wire-segment-drag]', message, details ?? '');
  };

  const cloneSegmentDragNodes = (nodes: Node[]) => nodes.map((node) => ({
    ...node,
    position: {...node.position},
    data: {...node.data},
  }));

  const cloneSegmentDragEdges = (edges: Edge[]) => edges.map((edge) => {
    const clonedData = edge.data
      ? {
        ...(edge.data as EdgeDataType),
        startXY: (edge.data as EdgeDataType).startXY
          ? {...((edge.data as EdgeDataType).startXY as XYPoint)}
          : undefined,
        endXY: (edge.data as EdgeDataType).endXY
          ? {...((edge.data as EdgeDataType).endXY as XYPoint)}
          : undefined,
        edgePoints: [ ...(((edge.data as EdgeDataType).edgePoints ?? []).map((point) => ({...point}))) ],
      }
      : edge.data;

    return {
      ...edge,
      data: clonedData,
    };
  });

  const sourceNode = useInternalNode(source);
  const preserveStartPinStub = (sourceNode?.data as ComponentDataType | undefined)?.technicalID !== 'SolderJoint';
  const sourceHandle=sourceNode?.internals.handleBounds?.source?.filter((handle)=>(handle.id==sourceHandleId))[0];
  //console.log("Computed from data", [(sourceHandle?.x || 0)+(sourceHandle?.width || 0)/2+(sourceNode?.position.x || 0), (sourceHandle?.y || 0)+(sourceNode?.position.y || 0)]);
  //console.log(sourceHandle);
  //console.log("Edge original sourceX, sourceY = ", [sourceX, sourceY])

  const sourceHandleDef = findHandleData(sourceNode, sourceHandleId);
  
  let sourceXadjusted=Math.round(sourceX/ROUNDN)*ROUNDN;
  let sourceYadjusted=Math.round(sourceY/ROUNDN)*ROUNDN;
  const sourceNodeRotation = (sourceNode?.data.rotation as number);

  const renderedSourceEndpoint = getRenderedWireEndpoint(sourceNode, sourceHandleId);
  if(renderedSourceEndpoint) {
    sourceXadjusted = renderedSourceEndpoint.x;
    sourceYadjusted = renderedSourceEndpoint.y;
  } else if(sourceHandleDef!=undefined) {
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
  const preserveEndPinStub = (targetNode?.data as ComponentDataType | undefined)?.technicalID !== 'SolderJoint';
  const targetHandle=targetNode?.internals.handleBounds?.source?.filter((handle)=>(handle.id==targetHandleId))[0];
  const targetHandleDef = findHandleData(targetNode, targetHandleId);
  
  let targetXadjusted=Math.round(targetX/ROUNDN)*ROUNDN;
  let targetYadjusted=Math.round(targetY/ROUNDN)*ROUNDN;
  const targetNodeRotation = (targetNode?.data.rotation as number);
  
  const renderedTargetEndpoint = getRenderedWireEndpoint(targetNode, targetHandleId);
  if(renderedTargetEndpoint) {
    targetXadjusted = renderedTargetEndpoint.x;
    targetYadjusted = renderedTargetEndpoint.y;
  } else if(targetHandleDef!=undefined) {
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
  const wireJumpHaloPaths = [] as Array<{path: string; width: number}>;
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
                const upperSegmentLength = Math.sqrt((x1-x0) ** 2 + (y1-y0) ** 2);
                const ux = upperSegmentLength > 0 ? (x1-x0) / upperSegmentLength : 1;
                const uy = upperSegmentLength > 0 ? (y1-y0) / upperSegmentLength : 0;
                const sinAngle = calculateSegmentSinAngle(
                  {x0, y0, x1, y1},
                  {x0: x2, y0: y2, x1: x3, y1: y3},
                );
                const jumpRadius = calculateWireJumpRadius(
                  edgeData?.width,
                  edges[i].data?.width,
                  sinAngle,
                );
                const useSplineBridge = sinAngle < WIRE_JUMP_SPLINE_SIN_ANGLE;
                const bridgeHalfLength = useSplineBridge
                  ? jumpRadius * clamp(1 / Math.max(sinAngle, WIRE_JUMP_MIN_SIN_ANGLE), 1.15, WIRE_JUMP_SPLINE_MAX_LENGTH_FACTOR)
                  : jumpRadius;
                const min_a=bridgeHalfLength*bridgeHalfLength;
                // only draw intersection jumps on the wire that is visually above the crossing partner.
                if (a1>min_a && a2>min_a && isWireRenderedAbove(id, edges[i], edges)) {
                  //console.log("INTERSECTION at ["+String(px)+", "+String(py)+"]");
                  const xs1 = px - ux * bridgeHalfLength;
                  const ys1 = py - uy * bridgeHalfLength;
                  const xs2 = px + ux * bridgeHalfLength;
                  const ys2 = py + uy * bridgeHalfLength;
                  const normalX = -uy;
                  const normalY = ux;
                  const bridgeHeight = useSplineBridge
                    ? clamp(jumpRadius * WIRE_JUMP_SPLINE_HEIGHT_FACTOR, 3, 12)
                    : jumpRadius;
                  const bridgePath = useSplineBridge
                    ? `Q ${px + normalX * bridgeHeight} ${py + normalY * bridgeHeight} ${xs2} ${ys2}`
                    : `A ${jumpRadius} ${jumpRadius} 0 0 0 ${xs2} ${ys2}`;

                  const distanceFromSegmentStart = Math.sqrt(a1);
                  const shouldDrawHalo = (
                    canonicalizeColorForCompare(edgeData?.color) ===
                    canonicalizeColorForCompare(edges[i].data?.color)
                  );
                  
                  intersections.push({
                    x:px,
                    y: py,
                    segmentIndex: k,
                    partnerId: edges[i].id,
                    partnerSegmentIndex: m,
                    xs1,
                    xs2,
                    ys1,
                    ys2,
                    radius: jumpRadius,
                    bridgePath,
                    bridgeStartDistance: distanceFromSegmentStart - bridgeHalfLength,
                    bridgeEndDistance: distanceFromSegmentStart + bridgeHalfLength,
                    bridgeHeight,
                    shouldDrawHalo,
                    distanceFromSegmentStart,
                  });

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
    this_intersect.sort((a, b)=>(a.distanceFromSegmentStart - b.distanceFromSegmentStart));

    const segmentSourceX = edgeSegmentsArray[i].segmentSourceX;
    const segmentSourceY = edgeSegmentsArray[i].segmentSourceY;
    const segmentTargetX = edgeSegmentsArray[i].segmentTargetX;
    const segmentTargetY = edgeSegmentsArray[i].segmentTargetY;
    const segmentLength = Math.sqrt((segmentTargetX - segmentSourceX) ** 2 + (segmentTargetY - segmentSourceY) ** 2);
    const ux = segmentLength > 0 ? (segmentTargetX - segmentSourceX) / segmentLength : 1;
    const uy = segmentLength > 0 ? (segmentTargetY - segmentSourceY) / segmentLength : 0;
    const normalX = -uy;
    const normalY = ux;
    const mergeGap = Math.max(WIRE_JUMP_MERGE_GAP, finiteNumberOr(edgeData?.width, 1) * 0.5);
    let intersectionGroup = [] as Array<intersectionPoint>;

    const appendIntersectionGroup = (group: Array<intersectionPoint>) => {
      if(group.length===0) return;

      if(group.length===1) {
        const intersection = group[0];
        const bridgeSegmentPath = `M${intersection.xs1} ${intersection.ys1} ${intersection.bridgePath}`;
        edgeSegmentsArray[i].edgePath = edgeSegmentsArray[i].edgePath + ` L${intersection.xs1} ${intersection.ys1} ${intersection.bridgePath}`;
        if(intersection.shouldDrawHalo) {
          wireJumpHaloPaths.push({
            path: bridgeSegmentPath,
            width: finiteNumberOr(edgeData?.width, 1) + WIRE_JUMP_HALO_WIDTH_EXTRA,
          });
        }
        return;
      }

      const startDistance = clamp(
        Math.min(...group.map((intersection) => intersection.bridgeStartDistance)),
        0,
        segmentLength,
      );
      const endDistance = clamp(
        Math.max(...group.map((intersection) => intersection.bridgeEndDistance)),
        0,
        segmentLength,
      );
      const startX = segmentSourceX + ux * startDistance;
      const startY = segmentSourceY + uy * startDistance;
      const endX = segmentSourceX + ux * endDistance;
      const endY = segmentSourceY + uy * endDistance;
      const centerDistance = (startDistance + endDistance) / 2;
      const centerX = segmentSourceX + ux * centerDistance;
      const centerY = segmentSourceY + uy * centerDistance;
      const bridgeHeight = clamp(
        Math.max(...group.map((intersection) => intersection.bridgeHeight)) +
          Math.min(group.length - 1, 2) * WIRE_JUMP_MERGED_HEIGHT_EXTRA,
        WIRE_JUMP_MIN_RADIUS,
        WIRE_JUMP_MAX_RADIUS,
      );
      const bridgePath = `Q ${centerX + normalX * bridgeHeight} ${centerY + normalY * bridgeHeight} ${endX} ${endY}`;
      const bridgeSegmentPath = `M${startX} ${startY} ${bridgePath}`;
      edgeSegmentsArray[i].edgePath = edgeSegmentsArray[i].edgePath + ` L${startX} ${startY} ${bridgePath}`;
      if(group.some((intersection) => intersection.shouldDrawHalo)) {
        wireJumpHaloPaths.push({
          path: bridgeSegmentPath,
          width: finiteNumberOr(edgeData?.width, 1) + WIRE_JUMP_HALO_WIDTH_EXTRA,
        });
      }
    };

    for(let j = 0; j < this_intersect.length; j++) {
      const intersection = this_intersect[j];
      const groupEndDistance = intersectionGroup.length > 0
        ? Math.max(...intersectionGroup.map((groupIntersection) => groupIntersection.bridgeEndDistance))
        : undefined;
      if(groupEndDistance !== undefined && intersection.bridgeStartDistance > groupEndDistance + mergeGap) {
        appendIntersectionGroup(intersectionGroup);
        intersectionGroup = [];
      }
      intersectionGroup.push(intersection);
    }
    appendIntersectionGroup(intersectionGroup);

    edgeSegmentsArray[i].edgePath = edgeSegmentsArray[i].edgePath + ` L${edgeSegmentsArray[i].segmentTargetX} ${edgeSegmentsArray[i].segmentTargetY}`;
  }


  const cleanupSegmentDrag = () => {
    const hadTouchDrag = segmentDragRef.current?.inputType === 'touch';
    globalSegmentDragSession += 1;
    globalSegmentDragCleanup?.();
    globalSegmentDragCleanup = null;
    if(segmentDragCleanupRef.current) {
      segmentDragCleanupRef.current();
    }
    segmentDragCleanupRef.current = null;
    segmentDragRef.current = null;
    setActiveSegmentIndex(-1);
    if(hadTouchDrag) {
      suppressSegmentTouchDragUntilRef.current = window.performance.now() + SEGMENT_TOUCH_DRAG_RESTART_SUPPRESS_MS;
    }
    debugSegmentDrag('cleanup segment drag');
  };

  const snapActive = (index: number) => {
    if(!edgePointDragSnapshotTakenRef.current) {
      takeSnapshot('move wire point');
      edgePointDragSnapshotTakenRef.current = true;
    }
    const edges = reactFlowInstance.getEdges();
    const edgeIndex = edges.findIndex((edge) => edge.id === id);
    const new_data=edgeData;
    new_data.edgePoints[index].active=edgeIndex;
    reactFlowInstance.updateEdgeData(id, new_data, {replace: true});
  }

  const releaseAllActive = (index?: number) => {
    const edge = reactFlowInstance.getEdge(id);
    const currentEdgeData = edge?.data as EdgeDataType | undefined;
    if(!edge || !currentEdgeData) return;

    const nextEdgePoints = (currentEdgeData.edgePoints ?? []).map((point, pointIndex) => ({
      ...point,
      active: index === undefined || pointIndex === index ? -1 : point.active,
    }));

    reactFlowInstance.updateEdge(id, {
      ...edge,
      data: {
        ...currentEdgeData,
        edgePoints: nextEdgePoints,
      },
    });
    edgePointDragSnapshotTakenRef.current = false;
  }

  const moveEdge = (activeEdge: number,  clientX: number, clientY: number, index: number) => {
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
      const snaparea=5;
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
      const previousPoint = {
        x: edgeSegmentsArray[index].segmentSourceX,
        y: edgeSegmentsArray[index].segmentSourceY,
      };
      const nextPoint = {
        x: edgeSegmentsArray[index+1].segmentTargetX,
        y: edgeSegmentsArray[index+1].segmentTargetY,
      };
      const snappedPosition = snapPointToLine(position, previousPoint, nextPoint, snaparea);
      (new_edge.data?.edgePoints  as Array<edgePoint>)[index] = {
        x: snappedPosition.x,
        y: snappedPosition.y,
        active: activeEdge,
      };
      reactFlowInstance.updateEdge(id, new_edge);
    }
    // update all edges to force them redraw considering possible new/changed intersection posints
    const new_edges=reactFlowInstance.getEdges();
    reactFlowInstance.setEdges(new_edges);

    //console.log("moved to x="+String(position.x)+" and y="+String(position.y) + ", eventX="+String(event.clientX)+", eventY="+String(event.clientY));
   }

  const startSegmentDrag = ({
    clientX,
    clientY,
    index,
    inputType,
    pointerId,
    preventDefault,
  }: {
    clientX: number;
    clientY: number;
    index: number;
    inputType: 'mouse' | 'touch';
    pointerId?: number;
    preventDefault: () => void;
  }) => {
    if(inputType === 'touch' && window.performance.now() < suppressSegmentTouchDragUntilRef.current) {
      debugSegmentDrag('touch segment drag suppressed after release', {index, clientX, clientY});
      return;
    }

    const segment = edgeSegmentsArray[index];
    const orientation = getSegmentOrientation(
      {x: segment.segmentSourceX, y: segment.segmentSourceY},
      {x: segment.segmentTargetX, y: segment.segmentTargetY},
    );
    if(!orientation) {
      debugSegmentDrag('start ignored: segment is not orthogonal', {index, segment});
      return;
    }

    const currentEdge = reactFlowInstance.getEdge(id);
    const currentEdgeData = currentEdge?.data as EdgeDataType | undefined;
    if(!currentEdgeData) {
      debugSegmentDrag('start ignored: edge data missing', {index, edgeId: id});
      return;
    }

    preventDefault();
    releaseAllActive();
    cleanupSegmentDrag();

    debugSegmentDrag('segment drag start', {
      index,
      orientation,
      clientX,
      clientY,
      edgePoints: currentEdgeData.edgePoints?.length ?? 0,
    });

    const initialNodes = cloneSegmentDragNodes(reactFlowInstance.getNodes());
    const initialEdges = cloneSegmentDragEdges(reactFlowInstance.getEdges());
    const sessionId = globalSegmentDragSession + 1;
    globalSegmentDragSession = sessionId;

    segmentDragRef.current = {
      sessionId,
      segmentIndex: index,
      orientation,
      inputType,
      startClientX: clientX,
      startClientY: clientY,
      initialPoints: [
        {x: sourceXadjusted, y: sourceYadjusted},
        ...((currentEdgeData.edgePoints ?? []).map((point) => ({x: point.x, y: point.y}))),
        {x: targetXadjusted, y: targetYadjusted},
      ],
      initialNodes,
      initialEdges,
      hasMoved: false,
      snapshotTaken: false,
      usedSolderJointMove: false,
    };
    if(pointerId !== undefined) {
      const handleWindowPointerMove = (event: PointerEvent) => {
        if(event.pointerId !== pointerId) return;
        event.preventDefault();
        handleSegmentPointerMove(event.clientX, event.clientY, sessionId);
      };
      const handleWindowPointerRelease = (event: PointerEvent) => {
        if(event.pointerId !== pointerId) return;
        cleanupSegmentDrag();
      };

      window.addEventListener('pointermove', handleWindowPointerMove);
      window.addEventListener('pointerup', handleWindowPointerRelease);
      window.addEventListener('pointercancel', handleWindowPointerRelease);
      segmentDragCleanupRef.current = () => {
        window.removeEventListener('pointermove', handleWindowPointerMove);
        window.removeEventListener('pointerup', handleWindowPointerRelease);
        window.removeEventListener('pointercancel', handleWindowPointerRelease);
      };
    } else {
      const handleWindowMouseMove = (event: MouseEvent) => {
        handleSegmentPointerMove(event.clientX, event.clientY, sessionId);
      };
      const handleWindowTouchMove = (event: TouchEvent) => {
        const touch = event.touches[0];
        if(!touch) return;

        event.preventDefault();
        handleSegmentPointerMove(touch.clientX, touch.clientY, sessionId);
      };

      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('touchmove', handleWindowTouchMove, {passive: false});
      segmentDragCleanupRef.current = () => {
        window.removeEventListener('mousemove', handleWindowMouseMove);
        window.removeEventListener('touchmove', handleWindowTouchMove);
      };
    }
    globalSegmentDragCleanup = segmentDragCleanupRef.current;
    setActiveSegmentIndex(index);
  };

  const handleSegmentPointerMove = (clientX: number, clientY: number, sessionId?: number) => {
    const drag = segmentDragRef.current;
    if(sessionId !== undefined && sessionId !== globalSegmentDragSession) {
      debugSegmentDrag('move ignored: stale global segment drag session', {
        clientX,
        clientY,
        sessionId,
        activeSessionId: globalSegmentDragSession,
      });
      return;
    }
    if(!drag) {
      debugSegmentDrag('move ignored: no active segment drag', {clientX, clientY});
      return;
    }
    if(sessionId !== undefined && sessionId !== drag.sessionId) {
      debugSegmentDrag('move ignored: replaced segment drag session', {clientX, clientY, sessionId});
      return;
    }

    const moveDistance = Math.sqrt(
      (clientX - drag.startClientX) ** 2 + (clientY - drag.startClientY) ** 2,
    );
    if(!drag.hasMoved && moveDistance < SEGMENT_DRAG_THRESHOLD) {
      debugSegmentDrag('move below threshold', {
        moveDistance,
        threshold: SEGMENT_DRAG_THRESHOLD,
      });
      return;
    }

    if(!drag.snapshotTaken) {
      takeSnapshot('move wire segment');
      drag.snapshotTaken = true;
      debugSegmentDrag('segment drag snapshot taken', {segmentIndex: drag.segmentIndex});
    }
    drag.hasMoved = true;
    setNotMooved(false);

    const position = reactFlowInstance.screenToFlowPosition({
      x: clientX,
      y: clientY,
    });
    const rawAxisValue = drag.orientation === 'horizontal' ? position.y : position.x;
    const snapResult = snapWireSegmentAxisValue({
      points: drag.initialPoints,
      segmentIndex: drag.segmentIndex,
      orientation: drag.orientation,
      axisValue: rawAxisValue,
      zoom: reactFlowInstance.getZoom(),
    });
    const axisValue = snapResult.axisValue;
    const solderJointMoveResult = applySolderJointSegmentMove({
      nodes: drag.initialNodes,
      edges: drag.initialEdges,
      movedEdgeId: id,
      movedPoints: drag.initialPoints,
      segmentIndex: drag.segmentIndex,
      orientation: drag.orientation,
      axisValue,
      pinStubLength: PIN_STUB_LENGTH,
    });
    if(solderJointMoveResult.handled) {
      drag.usedSolderJointMove = true;
      reactFlowInstance.setNodes(cloneSegmentDragNodes(solderJointMoveResult.nodes));
      reactFlowInstance.setEdges(cloneSegmentDragEdges(solderJointMoveResult.edges));
      debugSegmentDrag('solder joint moved with segment', {
        segmentIndex: drag.segmentIndex,
        axisValue,
        snap: snapResult.snapped ? snapResult.reason : undefined,
      });
      return;
    }

    if(drag.usedSolderJointMove) {
      reactFlowInstance.setNodes(cloneSegmentDragNodes(drag.initialNodes));
    }

    const result = moveWireSegment({
      points: drag.initialPoints,
      segmentIndex: drag.segmentIndex,
      axisValue,
      pinStubLength: PIN_STUB_LENGTH,
      preserveStartPinStub,
      preserveEndPinStub,
    });
    if(!result) {
      debugSegmentDrag('move ignored: geometry returned no result', {
        segmentIndex: drag.segmentIndex,
        axisValue,
        orientation: drag.orientation,
      });
      return;
    }

    const latestEdges = drag.usedSolderJointMove
      ? cloneSegmentDragEdges(drag.initialEdges)
      : reactFlowInstance.getEdges();
    const currentEdge = latestEdges.find((edge) => edge.id === id);
    const currentEdgeData = currentEdge?.data as EdgeDataType | undefined;
    if(!currentEdge || !currentEdgeData) {
      debugSegmentDrag('move ignored: current edge missing', {edgeId: id});
      return;
    }

    const updatedEdge = {
      ...currentEdge,
      data: {
        ...currentEdgeData,
        edgePoints: result.edgePoints,
        startXY: result.points[0],
        endXY: result.points[result.points.length - 1],
      },
    };

    reactFlowInstance.setEdges(
      latestEdges.map((edge) => (
        edge.id === id
          ? updatedEdge
          : {...edge}
      )),
    );
    debugSegmentDrag('segment moved', {
      segmentIndex: drag.segmentIndex,
      axisValue,
      edgePoints: result.edgePoints.map((point) => ({x: point.x, y: point.y})),
      snap: snapResult.snapped ? snapResult.reason : undefined,
    });
  };

  const handleWidth = Math.min(edgeData?.width+2,3);

  const edgeButtonsFallbackPosition={x: edgeSegmentsArray[0].labelX, y: edgeSegmentsArray[0].labelY, segmentIndex: 0};
  const calculateWireToolbarPosition = () => {
    const anchor = wireToolbarAnchor ?? edgeButtonsFallbackPosition;
    if(typeof document === 'undefined') return {x: anchor.x + 5, y: anchor.y + 5};

    const flowElement = document.querySelector('.react-flow') as HTMLElement | null;
    const flowRect = flowElement?.getBoundingClientRect();
    if(!flowRect) return {x: anchor.x + 5, y: anchor.y + 5};

    const anchorScreen = reactFlowInstance.flowToScreenPosition(anchor);
    const zoom = reactFlowInstance.getZoom();
    const toolbarWidth = WIRE_TOOLBAR_WIDTH_PX / zoom;
    const toolbarHeight = WIRE_TOOLBAR_HEIGHT_PX / zoom;
    const gap = WIRE_TOOLBAR_GAP_PX / zoom;
    const handlePoints = [
      ...edgeSegmentsArray.map((segment) => ({x: segment.labelX, y: segment.labelY})),
      ...edgePoints.map((point) => ({x: point.x, y: point.y})),
    ];
    const handleRects = handlePoints.map((point) => {
      const screenPoint = reactFlowInstance.flowToScreenPosition(point);
      return {
        left: screenPoint.x - WIRE_TOOLBAR_HANDLE_CLEARANCE_PX,
        right: screenPoint.x + WIRE_TOOLBAR_HANDLE_CLEARANCE_PX,
        top: screenPoint.y - WIRE_TOOLBAR_HANDLE_CLEARANCE_PX,
        bottom: screenPoint.y + WIRE_TOOLBAR_HANDLE_CLEARANCE_PX,
      };
    });

    const minX = flowRect.left + WIRE_TOOLBAR_VIEWPORT_MARGIN_PX;
    const maxX = flowRect.right - WIRE_TOOLBAR_VIEWPORT_MARGIN_PX - WIRE_TOOLBAR_WIDTH_PX;
    const minY = flowRect.top + WIRE_TOOLBAR_VIEWPORT_MARGIN_PX;
    const maxY = flowRect.bottom - WIRE_TOOLBAR_VIEWPORT_MARGIN_PX - WIRE_TOOLBAR_HEIGHT_PX;
    const maxAllowedX = Math.max(minX, maxX);
    const maxAllowedY = Math.max(minY, maxY);
    const anchorSegment = edgeSegmentsArray[anchor.segmentIndex ?? 0] ?? edgeSegmentsArray[0];
    const segmentStartScreen = reactFlowInstance.flowToScreenPosition({
      x: anchorSegment.segmentSourceX,
      y: anchorSegment.segmentSourceY,
    });
    const segmentEndScreen = reactFlowInstance.flowToScreenPosition({
      x: anchorSegment.segmentTargetX,
      y: anchorSegment.segmentTargetY,
    });
    const segmentOrientation = getSegmentOrientation(
      {x: anchorSegment.segmentSourceX, y: anchorSegment.segmentSourceY},
      {x: anchorSegment.segmentTargetX, y: anchorSegment.segmentTargetY},
    );
    const screenCandidates: Array<{x: number; y: number; intendedX: number; intendedY: number; priority: number}> = [];
    const addCandidate = (candidate: {x: number; y: number; intendedX: number; intendedY: number; priority: number}) => {
      screenCandidates.push(candidate);
    };

    if(segmentOrientation === 'horizontal') {
      const segmentY = (segmentStartScreen.y + segmentEndScreen.y) / 2;
      [
        {intendedY: segmentY + WIRE_TOOLBAR_GAP_PX, priority: 0},
        {intendedY: segmentY - WIRE_TOOLBAR_GAP_PX - WIRE_TOOLBAR_HEIGHT_PX, priority: 8},
      ].forEach(({intendedY, priority}) => {
        const y = clamp(intendedY, minY, maxAllowedY);
        const candidateVerticalRange = {
          top: y,
          bottom: y + WIRE_TOOLBAR_HEIGHT_PX,
        };
        const forbiddenXIntervals = handleRects
          .filter((handleRect) => (
            candidateVerticalRange.top < handleRect.bottom &&
            candidateVerticalRange.bottom > handleRect.top
          ))
          .map((handleRect) => ({
            start: handleRect.left - WIRE_TOOLBAR_WIDTH_PX,
            end: handleRect.right,
          }));
        const intendedX = anchorScreen.x - WIRE_TOOLBAR_WIDTH_PX / 2;
        const x = findClosestAllowedValue(intendedX, minX, maxAllowedX, forbiddenXIntervals);
        addCandidate({x, y, intendedX, intendedY, priority});
      });
    } else if(segmentOrientation === 'vertical') {
      const segmentX = (segmentStartScreen.x + segmentEndScreen.x) / 2;
      [
        {intendedX: segmentX + WIRE_TOOLBAR_GAP_PX, priority: 0},
        {intendedX: segmentX - WIRE_TOOLBAR_GAP_PX - WIRE_TOOLBAR_WIDTH_PX, priority: 8},
      ].forEach(({intendedX, priority}) => {
        const x = clamp(intendedX, minX, maxAllowedX);
        const candidateHorizontalRange = {
          left: x,
          right: x + WIRE_TOOLBAR_WIDTH_PX,
        };
        const forbiddenYIntervals = handleRects
          .filter((handleRect) => (
            candidateHorizontalRange.left < handleRect.right &&
            candidateHorizontalRange.right > handleRect.left
          ))
          .map((handleRect) => ({
            start: handleRect.top - WIRE_TOOLBAR_HEIGHT_PX,
            end: handleRect.bottom,
          }));
        const intendedY = anchorScreen.y - WIRE_TOOLBAR_HEIGHT_PX / 2;
        const y = findClosestAllowedValue(intendedY, minY, maxAllowedY, forbiddenYIntervals);
        addCandidate({x, y, intendedX, intendedY, priority});
      });
    } else {
      const segmentDx = segmentEndScreen.x - segmentStartScreen.x;
      const segmentDy = segmentEndScreen.y - segmentStartScreen.y;
      const segmentLength = Math.sqrt(segmentDx ** 2 + segmentDy ** 2);
      if(segmentLength > 0) {
        const tangent = {
          x: segmentDx / segmentLength,
          y: segmentDy / segmentLength,
        };
        const normal = {
          x: -tangent.y,
          y: tangent.x,
        };
        const halfToolbar = {
          x: WIRE_TOOLBAR_WIDTH_PX / 2,
          y: WIRE_TOOLBAR_HEIGHT_PX / 2,
        };
        const normalHalfExtent = Math.abs(normal.x) * halfToolbar.x + Math.abs(normal.y) * halfToolbar.y;

        [1, -1].forEach((side, index) => {
          const intendedCenter = {
            x: anchorScreen.x + normal.x * side * (normalHalfExtent + WIRE_TOOLBAR_GAP_PX),
            y: anchorScreen.y + normal.y * side * (normalHalfExtent + WIRE_TOOLBAR_GAP_PX),
          };
          const intendedX = intendedCenter.x - halfToolbar.x;
          const intendedY = intendedCenter.y - halfToolbar.y;
          const shiftedPosition = shiftRectAlongVector(
            {
              left: intendedX,
              right: intendedX + WIRE_TOOLBAR_WIDTH_PX,
              top: intendedY,
              bottom: intendedY + WIRE_TOOLBAR_HEIGHT_PX,
            },
            tangent,
            minX,
            maxAllowedX,
            minY,
            maxAllowedY,
            handleRects,
          );
          addCandidate({
            x: shiftedPosition.x,
            y: shiftedPosition.y,
            intendedX,
            intendedY,
            priority: index * 8,
          });
        });
      }
    }

    if(screenCandidates.length === 0) {
      const intendedX = anchorScreen.x + WIRE_TOOLBAR_GAP_PX;
      const intendedY = anchorScreen.y + WIRE_TOOLBAR_GAP_PX;
      addCandidate({
        x: clamp(intendedX, minX, maxAllowedX),
        y: clamp(intendedY, minY, maxAllowedY),
        intendedX,
        intendedY,
        priority: 20,
      });
    }

    const scoredCandidates = screenCandidates.map((screenCandidate) => {
      const candidateRect = {
        left: screenCandidate.x,
        right: screenCandidate.x + WIRE_TOOLBAR_WIDTH_PX,
        top: screenCandidate.y,
        bottom: screenCandidate.y + WIRE_TOOLBAR_HEIGHT_PX,
      };
      const overlapArea = handleRects.reduce(
        (sum, handleRect) => sum + rectOverlapArea(candidateRect, handleRect),
        0,
      );
      const dx = anchorScreen.x < candidateRect.left
        ? candidateRect.left - anchorScreen.x
        : Math.max(anchorScreen.x - candidateRect.right, 0);
      const dy = anchorScreen.y < candidateRect.top
        ? candidateRect.top - anchorScreen.y
        : Math.max(anchorScreen.y - candidateRect.bottom, 0);
      const distanceFromAnchor = Math.sqrt(dx ** 2 + dy ** 2);
      const clampDistance = Math.abs(screenCandidate.x - screenCandidate.intendedX) +
        Math.abs(screenCandidate.y - screenCandidate.intendedY);

      return {
        x: screenCandidate.x,
        y: screenCandidate.y,
        score: overlapArea * WIRE_TOOLBAR_OVERLAP_PENALTY +
          distanceFromAnchor * 4 +
          clampDistance * 3 +
          screenCandidate.priority,
      };
    });
    const candidate = scoredCandidates.reduce(
      (bestCandidate, candidate) => (
        candidate.score < bestCandidate.score ? candidate : bestCandidate
      ),
      scoredCandidates[0] ?? {
        x: clamp(anchorScreen.x + WIRE_TOOLBAR_GAP_PX, minX, Math.max(minX, maxX)),
        y: clamp(anchorScreen.y + WIRE_TOOLBAR_GAP_PX, minY, Math.max(minY, maxY)),
        score: 0,
      },
    );
    const position = reactFlowInstance.screenToFlowPosition({x: candidate.x, y: candidate.y});

    return {
      x: position.x,
      y: position.y,
      width: toolbarWidth,
      height: toolbarHeight,
      gap,
    };
  };
  const edgeButtonsPosition = calculateWireToolbarPosition();

  const updateWireDataAndCollapseIfPossible = (
    patch: Partial<EdgeDataType>,
    wireInfoPatch?: Partial<ComponentDataType>,
    shouldTakeSnapshot = true,
  ) => {
    if(shouldTakeSnapshot) takeSnapshot('update wire');
    const nodes = reactFlowInstance.getNodes().map((node) => {
      if(!wireInfoPatch || node.data.wireInfoForNodeId!==id || node.data.technicalID!=="WireInfoNode") return node;

      return {
        ...node,
        data: {
          ...node.data,
          ...wireInfoPatch,
        },
      };
    });
    const currentEdges = reactFlowInstance.getEdges();
    let changedEdge: Edge | undefined;

    const nextEdges = currentEdges.map((edge) => {
      if(edge.id !== id) return edge;

      changedEdge = {
        ...edge,
        data: {
          ...(edge.data as EdgeDataType),
          ...patch,
        },
      };
      return changedEdge;
    });

    if(!changedEdge) return;

    const collapseResult = collapseMergeableSolderJoints({
      nodes,
      edges: nextEdges,
      candidateSolderJointIds: getSolderJointEndpointIds(nodes, changedEdge),
    });

    reactFlowInstance.setNodes(collapseResult.nodes);
    reactFlowInstance.setEdges(collapseResult.edges);
  };

  const findElementaryNetForWire = () => {
    const context = createDiagramCheckContext(
      reactFlowInstance.getNodes() as Node<ComponentDataType>[],
      reactFlowInstance.getEdges() as Edge<EdgeDataType>[],
    );

    return context.elementaryNets.find((net) => net.edges.some((edge) => edge.id === id));
  };

  const selectWireNetwork = () => {
    const net = findElementaryNetForWire();
    if(!net) return;

    const networkEdgeIds = new Set(net.edges.map((edge) => edge.id));
    setSelectedNetworkEdgeIds(Array.from(networkEdgeIds));
    reactFlowInstance.setNodes((nodes) => nodes.map((node) => (
      node.data.checkHighlighted
        ? {
          ...node,
          data: {
            ...node.data,
            checkHighlighted: false,
          },
        }
        : node
    )));
    reactFlowInstance.setEdges((edges) => edges.map((edge) => ({
      ...edge,
      data: {
        ...(edge.data as EdgeDataType),
        checkHighlighted: networkEdgeIds.has(edge.id),
      },
    })));
  };



  const clearSelectedWireNetwork = useCallback(() => {
    setSelectedNetworkEdgeIds(null);
    reactFlowInstance.setNodes((nodes) => nodes.map((node) => (
      node.data.checkHighlighted
        ? {
          ...node,
          data: {
            ...node.data,
            checkHighlighted: false,
          },
        }
        : node
    )));
    reactFlowInstance.setEdges((edges) => edges.map((edge) => (
      edge.data?.checkHighlighted
        ? {
          ...edge,
          data: {
            ...(edge.data as EdgeDataType),
            checkHighlighted: false,
          },
        }
        : edge
    )));
  }, [setSelectedNetworkEdgeIds, reactFlowInstance]);

  const getSolderJointHandleIdsForEdges = (
    nodes: Node<ComponentDataType>[],
    edges: Edge<EdgeDataType>[],
  ) => {
    const solderJointIds = new Set(
      nodes
        .filter((node) => node.data.technicalID === "SolderJoint")
        .map((node) => node.id),
    );
    const handleIdsByNodeId = new Map<string, Set<string> | null>();

    const addHandle = (nodeId: string, handleId?: string | null) => {
      if(!solderJointIds.has(nodeId)) return;
      if(!handleId) {
        handleIdsByNodeId.set(nodeId, null);
        return;
      }

      const existingHandleIds = handleIdsByNodeId.get(nodeId);
      if(existingHandleIds===null) return;

      const nextHandleIds = existingHandleIds ?? new Set<string>();
      nextHandleIds.add(handleId);
      handleIdsByNodeId.set(nodeId, nextHandleIds);
    };

    edges.forEach((edge) => {
      addHandle(edge.source, edge.sourceHandle);
      addHandle(edge.target, edge.targetHandle);
    });

    return handleIdsByNodeId;
  };

  const updateSelectedNetworkWireData = (
    patch: Partial<EdgeDataType>,
    wireInfoPatch?: Partial<ComponentDataType>,
  ) => {
    const networkEdgeIds = new Set(selectedNetworkEdgeIds ?? []);
    if(networkEdgeIds.size === 0) {
      updateWireDataAndCollapseIfPossible(patch, wireInfoPatch);
      return;
    }

    takeSnapshot('update wire network');
    const flowNodes = reactFlowInstance.getNodes() as Node<ComponentDataType>[];
    const currentEdges = reactFlowInstance.getEdges() as Edge<EdgeDataType>[];
    const networkEdges = currentEdges.filter((edge) => networkEdgeIds.has(edge.id));
    const solderJointHandleIds = getSolderJointHandleIdsForEdges(flowNodes, networkEdges);
    const wireColorPatch = typeof patch.color === 'string' ? patch.color : undefined;

    const nodes = flowNodes.map((node) => {
      const nextData: Partial<ComponentDataType> = {};

      if(wireInfoPatch && node.data.technicalID==="WireInfoNode" && networkEdgeIds.has(String(node.data.wireInfoForNodeId))) {
        Object.assign(nextData, wireInfoPatch);
      }

      const selectedSolderJointHandleIds = solderJointHandleIds.get(node.id);
      if(wireColorPatch && node.data.technicalID==="SolderJoint" && selectedSolderJointHandleIds!==undefined) {
        nextData.handles = node.data.handles.map((handle) => (
          selectedSolderJointHandleIds===null || selectedSolderJointHandleIds.has(handle.hid)
            ? {
              ...handle,
              borderColor: wireColorPatch,
            }
            : handle
        ));
      }

      if(Object.keys(nextData).length===0) return node;

      return {
        ...node,
        data: {
          ...node.data,
          ...nextData,
        },
      };
    });
    const changedEdges: Edge[] = [];
    const nextEdges = currentEdges.map((edge) => {
      if(!networkEdgeIds.has(edge.id)) return edge;

      const changedEdge = {
        ...edge,
        data: {
          ...(edge.data as EdgeDataType),
          ...patch,
          checkHighlighted: true,
        },
      };
      changedEdges.push(changedEdge);
      return changedEdge;
    });
    const candidateSolderJointIds = Array.from(new Set(
      changedEdges.flatMap((edge) => getSolderJointEndpointIds(nodes, edge)),
    ));
    const collapseResult = collapseMergeableSolderJoints({
      nodes,
      edges: nextEdges,
      candidateSolderJointIds,
    });

    reactFlowInstance.setNodes(collapseResult.nodes);
    reactFlowInstance.setEdges(collapseResult.edges);
    setSelectedNetworkEdgeIds(
      collapseResult.edges
        .filter((edge) => edge.data?.checkHighlighted)
        .map((edge) => edge.id),
    );
  };

  const deleteSelectedNetwork = () => {
    const networkEdgeIds = selectedNetworkEdgeIds ?? [];
    if(networkEdgeIds.length === 0) {
      reactFlowInstance.deleteElements({ edges: [{id}] });
      return;
    }

    const networkEdgeIdSet = new Set(networkEdgeIds);
    const flowNodes = reactFlowInstance.getNodes() as Node<ComponentDataType>[];
    const currentEdges = reactFlowInstance.getEdges() as Edge<EdgeDataType>[];
    const networkEdges = currentEdges.filter((edge) => networkEdgeIdSet.has(edge.id));
    const solderJointHandleIds = getSolderJointHandleIdsForEdges(flowNodes, networkEdges);
    const networkSolderJointIds = Array.from(solderJointHandleIds.keys());
    const deletableSolderJointIds = networkSolderJointIds.filter((solderJointId) => (
      currentEdges
        .filter((edge) => edge.source === solderJointId || edge.target === solderJointId)
        .every((edge) => networkEdgeIdSet.has(edge.id))
    ));

    reactFlowInstance.deleteElements({
      edges: networkEdgeIds.map((edgeId) => ({id: edgeId})),
      nodes: deletableSolderJointIds.map((nodeId) => ({id: nodeId})),
    });
    setSelectedNetworkEdgeIds(null);
  };

  const rerouteWireWithPathfinder = () => {
    if(selectedNetworkActive || !pathFindingEnabled) return;

    const edge = reactFlowInstance.getEdge(id);
    const edgeData = edge?.data as EdgeDataType | undefined;
    if(!edge || !edgeData) return;

    const routingEdges = reactFlowInstance.getEdges().filter((candidate) => candidate.id !== id);
    const route = routeWireWithPathfinder(
      reactFlowInstance.getNodes() as Node<ComponentDataType>[],
      routingEdges,
      edge,
    );
    if(!route) return;

    takeSnapshot('reroute wire');
    reactFlowInstance.updateEdge(id, {
      ...edge,
      data: {
        ...edgeData,
        ...route,
      },
    });
  };

  const updateWireInfoNodes = (patch: Partial<ComponentDataType>) => {
    const nodes = reactFlowInstance.getNodes();
    nodes.filter((node)=>node.data.wireInfoForNodeId==id && node.data.technicalID=="WireInfoNode").map((node)=>{
      reactFlowInstance.updateNodeData(node.id, patch);
    });
  };

  const selectedNetworkActive = Boolean(selectedNetworkEdgeIds?.length);
  const selectableNetworkEdgeCount = findElementaryNetForWire()?.edges.length ?? 0;
  const showWireNetworkButton = selectedNetworkActive || selectableNetworkEdgeCount > 1;
  const activeWireEdges = selectedNetworkActive
    ? (reactFlowInstance.getEdges() as Edge<EdgeDataType>[]).filter((edge) => (
      selectedNetworkEdgeIds?.includes(edge.id)
    ))
    : (reactFlowInstance.getEdge(id) ? [reactFlowInstance.getEdge(id) as Edge<EdgeDataType>] : []);
  const activeWireWidth = aggregateWireValue(activeWireEdges, (edge) => edge.data?.width);
  const activeWireCrosssection = aggregateWireValue(activeWireEdges, (edge) => edge.data?.physCrosssection);
  const activeWireCrosssectionUnit = aggregateWireValue(activeWireEdges, (edge) => edge.data?.physCrosssectionUnit);
  const activeWireScopeUsesOnlyUsbPresets = (
    activeWireEdges.length > 0 &&
    activeWireEdges.every((edge) => edge.data?.physType === "usb")
  );
  const updateActiveWireScope = (
    patch: Partial<EdgeDataType>,
    wireInfoPatch?: Partial<ComponentDataType>,
    shouldTakeSnapshot = true,
  ) => {
    if(selectedNetworkActive) {
      updateSelectedNetworkWireData(patch, wireInfoPatch);
    } else {
      updateWireDataAndCollapseIfPossible(patch, wireInfoPatch, shouldTakeSnapshot);
    }
  };

  const contentPhysLineLength = (
    <InputNumber
      size={reactFlowInstance.getZoom()<0.7?"large":"small"}
      style={{ width: "10em"}}
      suffix="m"
      defaultValue={(edgeData.physLength || 0.1) as number}
      min={0.1} max={100}
      onChange={(value)=>{
        if(selectedNetworkActive) {
          updateSelectedNetworkWireData(
            {physLength: value},
            {wireInfo_length: value},
          );
        } else {
          takeSnapshot('update wire length');
          reactFlowInstance.updateEdgeData(id, {physLength: value});
          updateWireInfoNodes({wireInfo_length: value});
        }
        //console.log(reactFlowInstance.getZoom())
      }}
    />
  );

  const contentLineWidth = (
    <>
    <Radio.Group
      value={aggregatedValueOrUndefined(activeWireWidth)}
      options={[
        { value: 1, label: "1px" },
        { value: 2, label: "2px" },
        { value: 3, label: "3px" },
        { value: 4, label: "4px" },
        { value: 5, label: "5px" },
        { value: 6, label: "6px" },
      ]}
      onChange={(e)=>{
        updateActiveWireScope({width: e.target.value});
      }}
    />
    </>
  );

  const crosssectionsMM2 = activeWireScopeUsesOnlyUsbPresets ? [...USB_WIRE_MM2_PRESETS] : [...GENERAL_WIRE_MM2_PRESETS];
  const crosssectionsAWG = activeWireScopeUsesOnlyUsbPresets ? [...USB_WIRE_AWG_PRESETS] : [...GENERAL_WIRE_AWG_PRESETS];
  const activeCrosssectionUnit = aggregatedValueOrUndefined(activeWireCrosssectionUnit);
  const activeCrosssectionOptions = activeCrosssectionUnit === "AWG" ? crosssectionsAWG : crosssectionsMM2;
  const activeCrosssectionValue = activeCrosssectionUnit
    ? aggregatedValueOrUndefined(activeWireCrosssection)
    : undefined;

  const contentPhysLineCrosssection = (
    <>
    <Select
      value={activeCrosssectionValue}
      placeholder={activeWireCrosssection.kind === 'mixed' ? MIXED_WIRE_VALUE_PLACEHOLDER : undefined}
      disabled={!activeCrosssectionUnit}
      options={activeCrosssectionOptions.map(val=>({label: String(val), value: val}))}
      style={{width:100}}
      onChange={(value)=>{
        updateActiveWireScope(
          {physCrosssection: value},
          {wireInfo_crosssection: value},
        );
        setOpenWireCrosssection(false);
      }}
    />
    &nbsp;
    <Select
      value={aggregatedValueOrUndefined(activeWireCrosssectionUnit)}
      placeholder={activeWireCrosssectionUnit.kind === 'mixed' ? MIXED_WIRE_VALUE_PLACEHOLDER : undefined}
      options={[
        {value: "mm2", label: "mm2"},
        {value: "AWG", label: "AWG"},
      ]}
      style={{width:70}}
      onChange={(value)=>{
        const physCrosssectionvalue = value === "mm2"
          ? crosssectionsMM2[0]
          : activeWireScopeUsesOnlyUsbPresets
            ? DEFAULT_USB_WIRE_AWG
            : crosssectionsAWG[3];
        updateActiveWireScope(
          {physCrosssection: physCrosssectionvalue, physCrosssectionUnit: value},
          {wireInfo_crosssectionUnit: value, wireInfo_crosssection: physCrosssectionvalue},
        );
        //setOpenWireCrosssection(false);
      }}
    />
    </>
  );


  const customColorPanelRender: ColorPickerProps['panelRender'] = (_,{ components: { Presets } }) => (
        <Presets />
  );

  useEffect(() => {
    setNotMooved(Boolean(selected));
  }, [selected]);

  useEffect(() => {
    if(!selected && selectedNetworkEdgeIds) {
      clearSelectedWireNetwork();
    }
  }, [selected, selectedNetworkEdgeIds, clearSelectedWireNetwork]);

  useEffect(() => () => {
    if(segmentDragRef.current) {
      globalSegmentDragSession += 1;
      globalSegmentDragCleanup?.();
      globalSegmentDragCleanup = null;
      segmentDragRef.current = null;
    }
    if(segmentDragCleanupRef.current) {
      segmentDragCleanupRef.current();
      segmentDragCleanupRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handleRelease = () => {
      releaseAllActive();
      cleanupSegmentDrag();
    };

    window.addEventListener('mouseup', handleRelease);
    window.addEventListener('touchend', handleRelease);
    window.addEventListener('touchcancel', handleRelease);
    window.addEventListener('blur', handleRelease);

    return () => {
      window.removeEventListener('mouseup', handleRelease);
      window.removeEventListener('touchend', handleRelease);
      window.removeEventListener('touchcancel', handleRelease);
      window.removeEventListener('blur', handleRelease);
    };
  });

  const [openColorPicker, setOpenColorPicker] = useState(false);
  const [openWireCrosssection, setOpenWireCrosssection] = useState(false);

  const setWireToolbarAnchorFromPointer = (clientX: number, clientY: number, segmentIndex: number) => {
    setWireToolbarAnchor({
      ...reactFlowInstance.screenToFlowPosition({
        x: clientX,
        y: clientY,
      }),
      segmentIndex,
    });
  };

  return (
    <>
      {wireJumpHaloPaths.map(({ path, width }, index) => (
        <BaseEdge
          key={`edge${id}_jumphalo${index}`}
          path={path}
          interactionWidth={0}
          style = {{
            stroke: WIRE_JUMP_HALO_COLOR,
            strokeWidth: width,
            strokeLinecap: "round",
            strokeLinejoin: "round",
            pointerEvents: "none",
          }}
        />
      ))}
      {edgeSegmentsArray.map(({ edgePath }, index) => (
        <g key={`edge${id}_segment${index}`}>
          <BaseEdge
            path={edgePath}
            markerEnd={markerEnd}
            interactionWidth={0}
            style = {{
              stroke: selected ? `${edgeData.color_selected}` : `${edgeData?.color}`,
              strokeWidth: (checkHighlighted || simulationHighlighted) ? edgeData.width + 3 : edgeData.width,
              strokeLinecap: "round",
              strokeLinejoin: "round",
              //fill: "none",
              filter: simulationHighlighted
                ? "drop-shadow(0px 0px 4px #1677ff)"
                : checkHighlighted
                  ? "drop-shadow(0px 0px 4px #faad14)"
                  : (edgeData.correspondingInfoNodeSelected?"drop-shadow(0px 0px 2px)":""), //url(/filters.svg#double)
            }}
          />
          <path
            d={edgePath}
            fill="none"
            stroke="transparent"
            strokeWidth={10}
            strokeLinecap="round"
            className="react-flow__edge-interaction"
            onMouseMove={(event) => {
              const flowPosition = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
              });
              setSimulationWireHover({
                edgeId: id,
                x: flowPosition.x,
                y: flowPosition.y,
              });
            }}
            onMouseLeave={() => {
              setSimulationWireHover(null);
            }}
            onMouseDown={(event) => {
              if(event.button !== 0) return;
              setSimulationWireHover(null);
              setWireToolbarAnchorFromPointer(event.clientX, event.clientY, index);
            }}
            onTouchStart={(event) => {
              const touch = event.touches[0];
              if(!touch) return;
              setWireToolbarAnchorFromPointer(touch.clientX, touch.clientY, index);
            }}
          />
        </g>
      ))}
      {edgePoints.map(({x, y}, index) => (
        <circle
          key={`edge${id}_corner${index}`}
          cx={x}
          cy={y}
          r={((checkHighlighted || simulationHighlighted) ? edgeData.width + 3 : edgeData.width) / 2}
          fill={selected ? `${edgeData.color_selected}` : `${edgeData.color}`}
          stroke={selected ? `${edgeData.color_selected}` : `${edgeData.color}`}
          strokeWidth={0}
          pointerEvents="none"
          style={{
            filter: simulationHighlighted
              ? "drop-shadow(0px 0px 4px #1677ff)"
              : checkHighlighted
                ? "drop-shadow(0px 0px 4px #faad14)"
                : (edgeData.correspondingInfoNodeSelected ? "drop-shadow(0px 0px 2px)" : ""),
          }}
        />
      ))}

    {selected && !multipleSelect && segmentDragDebugEnabled && <EdgeLabelRenderer>
        <div
          className='nopan nodrag'
          style={{
            pointerEvents: "none",
            transform: `translate(${edgeButtonsPosition.x + 5}px,${edgeButtonsPosition.y + 42}px)`,
            position: "absolute",
            zIndex: 200,
            background: "rgba(255, 255, 255, 0.94)",
            border: "1px solid #faad14",
            color: "#262626",
            fontFamily: "monospace",
            fontSize: 11 / Math.min(reactFlowInstance.getZoom(), 1.4),
            lineHeight: 1.4,
            maxWidth: 360,
            padding: "4px 6px",
            whiteSpace: "pre-wrap",
          }}
        >
          {segmentDragDebugMessage || `Debug active: ${SEGMENT_DRAG_DEBUG_STORAGE_KEY}=1`}
        </div>
      </EdgeLabelRenderer>
    }

    {selected && !multipleSelect && notMooved && <EdgeLabelRenderer>
        <div
          className='nopan nodrag pointer-events-auto absolute'
          style = {{
            pointerEvents: "all",
            transform: `translate(${edgeButtonsPosition.x}px,${edgeButtonsPosition.y}px)`,
            position: "absolute",
            zIndex: 1000,
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
                  deleteSelectedNetwork();
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
              onOpenChange={(open) => {
                if(open) takeSnapshot('update wire color');
                setOpenColorPicker(open);
              }}
              //format={"rgb"}
              onChange={(_,color)=>{
                updateActiveWireScope(
                  {color: color, color_selected: color},
                  {wireInfo_color: color},
                  false,
                );
                setOpenColorPicker(false);
              }}
              style={{zoom: 1/Math.min(reactFlowInstance.getZoom(), 1.6)}}
            />
          </Tooltip>
          {!selectedNetworkActive &&
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
          }
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
          {!selectedNetworkActive &&
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
                      takeSnapshot('add wire info');
                      const newNode = structuredClone(WireInfoNode);
                      newNode.id = String(Math.random());
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
          }
          {!selectedNetworkActive && pathFindingEnabled &&
            <Tooltip
              title={t('tooltip.rerouteWire')}
              placement="bottom"
            >
              <button
                style={{
                  fontSize: 14/reactFlowInstance.getZoom(),
                }}
                onClick={rerouteWireWithPathfinder}
              ><BranchesOutlined /></button>
            </Tooltip>
          }
          {showWireNetworkButton &&
            <Tooltip
              title={t(selectedNetworkActive ? 'tooltip.clearWireNetwork' : 'tooltip.selectWireNetwork')}
              placement="bottom"
            >
              <button
                style={{
                  fontSize: 14/reactFlowInstance.getZoom(),
                  backgroundColor: selectedNetworkActive ? "#e6f4ff" : undefined,
                }}
                onClick={() => {
                  if(selectedNetworkActive) {
                    clearSelectedWireNetwork();
                  } else {
                    selectWireNetwork();
                  }
                }}
              ><ShareAltOutlined /></button>
            </Tooltip>
          }
          </Flex>
        </div>
    </EdgeLabelRenderer>
    }

    { selected && !multipleSelect &&
      edgeSegmentsArray.map((segment, index) => {
        const orientation = getSegmentOrientation(
          {x: segment.segmentSourceX, y: segment.segmentSourceY},
          {x: segment.segmentTargetX, y: segment.segmentTargetY},
        );
        if(!orientation) return null;

        const segmentLength = Math.sqrt(
          (segment.segmentTargetX - segment.segmentSourceX) ** 2 +
          (segment.segmentTargetY - segment.segmentSourceY) ** 2,
        );
        const zoom = reactFlowInstance.getZoom();
        const segmentLengthPx = segmentLength * zoom;
        const handleGapPx = Math.min(SEGMENT_DRAG_HANDLE_GAP_PX, segmentLengthPx / 4);
        const centerGapPx = Math.min(SEGMENT_DRAG_CENTER_GAP_PX, segmentLengthPx / 4);
        const segmentDragPartLength = (segmentLengthPx - handleGapPx * 2 - centerGapPx) / 2;
        if(segmentDragPartLength < SEGMENT_DRAG_MIN_PART_LENGTH_PX) return null;

        const startOffset = -(centerGapPx / 2 + segmentDragPartLength / 2);
        const endOffset = centerGapPx / 2 + segmentDragPartLength / 2;
        const startSegmentDragFromEvent = (
          clientX: number,
          clientY: number,
          inputType: 'mouse' | 'touch',
          pointerId: number | undefined,
          preventDefault: () => void,
        ) => startSegmentDrag({
          clientX,
          clientY,
          index,
          inputType,
          pointerId,
          preventDefault,
        });

        return (
          <EdgeLabelRenderer
            key={`segmentdrag${id}_labelrenderer${index}`}
          >
            <div
              className="nopan nodrag"
              style={{
                pointerEvents: "all",
                transform: `translate(-50%, -50%) translate(${segment.labelX}px,${segment.labelY}px)`,
                position: "absolute",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  width: activeSegmentIndex === index
                    ? `${orientation === 'horizontal' ? Math.max(segmentLengthPx, 500) : 500}px`
                    : (orientation === 'horizontal' ? `${segmentLengthPx}px` : "18px"),
                  height: activeSegmentIndex === index
                    ? `${orientation === 'vertical' ? Math.max(segmentLengthPx, 500) : 500}px`
                    : (orientation === 'vertical' ? `${segmentLengthPx}px` : "18px"),
                  cursor: orientation === 'horizontal' ? "ns-resize" : "ew-resize",
                  touchAction: "none",
                  position: "relative",
                  zIndex: 1,
                  pointerEvents: activeSegmentIndex === index ? "all" : "none",
                }}
                onMouseUp={() => cleanupSegmentDrag()}
                onTouchEnd={() => cleanupSegmentDrag()}
              >
                {[startOffset, endOffset].map((offset) => (
                  <div
                    key={`segmentdrag${id}_${index}_${offset}`}
                    style={{
                      position: "absolute",
                      left: orientation === 'horizontal' ? `calc(50% + ${offset}px - ${segmentDragPartLength / 2}px)` : "0px",
                      top: orientation === 'vertical' ? `calc(50% + ${offset}px - ${segmentDragPartLength / 2}px)` : "0px",
                      width: orientation === 'horizontal' ? `${segmentDragPartLength}px` : "18px",
                      height: orientation === 'vertical' ? `${segmentDragPartLength}px` : "18px",
                      pointerEvents: "all",
                    }}
                    onPointerDown={(event) => {
                      if(event.pointerType === 'mouse' && event.button !== 0) return;
                      event.stopPropagation();
                      event.preventDefault();
                      debugSegmentDrag('segment drag handle pointer down', {
                        index,
                        pointerType: event.pointerType,
                        clientX: event.clientX,
                        clientY: event.clientY,
                        offset,
                      });
                      startSegmentDragFromEvent(
                        event.clientX,
                        event.clientY,
                        event.pointerType === 'mouse' ? 'mouse' : 'touch',
                        event.pointerId,
                        () => {},
                      );
                    }}
                  />
                ))}
              </div>
            </div>
          </EdgeLabelRenderer>
        );
      })
    }

    { selected && !multipleSelect &&
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
              zIndex: 20,
            }}
          >
            <div
              className={`${active ?? -1} ${`${active ?? -1}` !== "-1" ? "active" : ""}`}
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
                position: "relative",
                zIndex: 2,
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
                  touchAction: "none",
                }}
                onMouseDown={(event) => {
                  if(event.button !== 0) return;
                  setNotMooved(false);
                  takeSnapshot('add wire point');
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
                onTouchStart={(event) => {
                  const touch = event.touches[0];
                  if(!touch) return;
                  event.preventDefault();
                  setNotMooved(false);
                  takeSnapshot('add wire point');
                  const edge = reactFlowInstance.getEdge(id);
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

    { selected && !multipleSelect && edgePoints.length>0 && 
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
              zIndex: 30,
            }}
          >
            <div
              className={`${active ?? -1} ${`${active ?? -1}` !== "-1" ? "active" : ""}`}
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
                position: "relative",
                zIndex: 3,
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
                  touchAction: "none",
                }}
                onMouseDown={(event)=>{
                  if(event.button !== 0) return;
                  snapActive(index);
                }}
                onTouchStart={(event)=>{
                  event.preventDefault();
                  snapActive(index);
                }}

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
