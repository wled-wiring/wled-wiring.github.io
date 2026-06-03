import { useMemo, useState, type ReactNode } from "react";

import { useEdges, useNodes, useViewport, type Edge, type Node } from "@xyflow/react";
import { LineChartOutlined } from "@ant-design/icons";
import { Button, Modal, Tooltip } from "antd";
import { useTranslation } from "react-i18next";

import type { ComponentDataType, EdgeDataType, XYPoint } from "../types";
import { getRenderedWireEndpoint } from "../utils/utils_functions";
import { useSimulationResultStore, type SimulationDisplayMode } from "./simulationResultStore";
import type { SimulationPinResult, SimulationResult } from "./simulationTypes";

type OverlayValueLine =
  | {kind: "text"; text: string}
  | {kind: "ledVoltage"; value: string; qualifier?: "min"}
  | {kind: "usbVoltage"; value: string};

type OverlayLabel = {
  id: string;
  kind: "voltage" | "voltageDelta" | "voltageDeltaMin" | "wireCurrent" | "wireHover";
  valueLines: OverlayValueLine[];
  ledPlotTarget?: LedVoltagePlotTarget;
  x: number;
  y: number;
  anchorX: number;
  anchorY: number;
  width: number;
  height: number;
  targetBounds?: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
};

type OverlayArrow = {
  id: string;
  kind: "current" | "voltageDelta";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  bidirectional: boolean;
  bounds?: Rect;
};

type SegmentPoint = {
  point: XYPoint;
  direction: XYPoint;
  from: XYPoint;
  to: XYPoint;
  length: number;
};

type Rect = {left: number; right: number; top: number; bottom: number};

type LedVoltagePlotTarget = {
  nodeId: string;
  sourceElementId?: string;
};

type LedVoltagePlotPoint = {
  distanceM: number;
  deltaVoltageV: number;
  sectionIndex?: number;
  logicLedIndex?: number;
  physicalLedCount?: number;
};

type LedVoltagePlotData = LedVoltagePlotTarget & {
  title: string;
  points: LedVoltagePlotPoint[];
  sectionMarkersM: number[];
  minPoint: LedVoltagePlotPoint;
  logicalLedCount: number;
  physicalLedCount: number;
};

const LABEL_PADDING_X = 8;
const LABEL_HEIGHT = 20;
const LEADER_LINE_THRESHOLD = 28;
const OVERLAP_PADDING = 4;
const VOLTAGE_LABEL_GAP = 18;
const WIRE_ARROW_LENGTH_PX = 14;
const WIRE_ARROW_STROKE_WIDTH = 2;
const WIRE_ARROW_MIN_GAP_PX = 2;
const WIRE_ARROW_CROSSING_PADDING_PX = 4;
const VOLTAGE_DELTA_ARROW_OFFSET_PX = 9;
const VOLTAGE_DELTA_LABEL_GAP_PX = 24;
const VOLTAGE_DELTA_ARROW_STROKE_WIDTH = 2;
const VOLTAGE_DELTA_ARROW_BOUNDS_PADDING = 2;
const WIRE_LABEL_GAP = 20;
const HOVER_NORMAL_DISPLAY_DISTANCE = 40;
const HOVER_HORIZONTAL_LABEL_EXTRA_GAP_PX = 16;
const COMPONENT_OBSTACLE_PADDING = 3;
const WIRE_OBSTACLE_PADDING = 5;
const LED_PLOT_BUTTON_WIDTH = 22;
const DEFAULT_WIRE_CURRENT_DISPLAY_THRESHOLD_A = 0.02;

const textLine = (text: string): OverlayValueLine => ({kind: "text", text});
const ledVoltageLine = (value: number, qualifier?: "min"): OverlayValueLine => ({
  kind: "ledVoltage",
  qualifier,
  value: `${value.toFixed(2)} V`,
});

const formatVoltage = (value: number) => textLine(`${value >= 0 ? "+" : ""}${value.toFixed(2)} V`);
const formatUsbVoltage = (value: number): OverlayValueLine => ({kind: "usbVoltage", value: `${value.toFixed(2)} V`});
const formatDeltaVoltage = (value: number) => ledVoltageLine(value);
const formatMinDeltaVoltage = (value: number) => ledVoltageLine(value, "min");
const formatCurrent = (value: number) => textLine(`${Math.abs(value).toFixed(2)} A`);

const overlayValueLineText = (line: OverlayValueLine) => {
  if(line.kind === "text") return line.text;
  if(line.kind === "usbVoltage") return `VUSB=${line.value}`;
  return line.qualifier === "min"
    ? `VLED,min=${line.value}`
    : `VLED=${line.value}`;
};

const renderOverlayValueLine = (line: OverlayValueLine): ReactNode => {
  if(line.kind === "text") return line.text;
  if(line.kind === "usbVoltage") {
    return (
      <>
        V<sub>USB</sub>={line.value}
      </>
    );
  }

  return (
    <>
      V<sub>LED{line.qualifier === "min" ? ",min" : ""}</sub>={line.value}
    </>
  );
};

const pinResultHasVoltage = (result: SimulationPinResult) => result.voltageV !== undefined;

const allNodeHandles = (node: Node<ComponentDataType>) => [
  ...(node.data.handles ?? []),
  ...(node.data.repeatedHandleArray ?? []),
];

const nodeHandleHasAnyFunction = (
  node: Node<ComponentDataType> | undefined,
  handleId: string,
  functions: string[],
) => {
  const handle = node ? allNodeHandles(node).find((candidate) => candidate.hid === handleId) : undefined;
  return handle?.functions?.some((fn) => functions.includes(fn)) ?? false;
};

const showWireCurrentInDisplayMode = (
  currentA: number,
  displayMode: SimulationDisplayMode,
) => (
  displayMode === "extended" ||
  currentA < -DEFAULT_WIRE_CURRENT_DISPLAY_THRESHOLD_A ||
  currentA > DEFAULT_WIRE_CURRENT_DISPLAY_THRESHOLD_A
);

const showPinVoltageInDisplayMode = (
  node: Node<ComponentDataType> | undefined,
  handleId: string,
  displayMode: SimulationDisplayMode,
) => (
  displayMode === "extended" ||
  nodeHandleHasAnyFunction(node, handleId, ["suppl_out", "usb_power_out"])
);

const screenPoint = (point: XYPoint, viewport: {x: number; y: number; zoom: number}) => ({
  x: (point.x * viewport.zoom) + viewport.x,
  y: (point.y * viewport.zoom) + viewport.y,
});

const wirePoints = (
  nodeById: Map<string, Node<ComponentDataType>>,
  edge: Edge<EdgeDataType>,
) => {
  const sourceNode = nodeById.get(edge.source);
  const targetNode = nodeById.get(edge.target);
  const sourceEndpoint = getRenderedWireEndpoint(sourceNode, edge.sourceHandle) ?? edge.data?.startXY;
  const targetEndpoint = getRenderedWireEndpoint(targetNode, edge.targetHandle) ?? edge.data?.endXY;
  if(!sourceEndpoint || !targetEndpoint) return [];

  return [
    sourceEndpoint,
    ...(edge.data?.edgePoints ?? []),
    targetEndpoint,
  ];
};

const pinHasConnectedWire = (
  edges: Edge<EdgeDataType>[],
  nodeId: string,
  handleId: string,
) => edges.some((edge) => (
  (edge.source === nodeId && edge.sourceHandle === handleId) ||
  (edge.target === nodeId && edge.targetHandle === handleId)
));

const isLedSupplyVoltagePin = (
  node: Node<ComponentDataType>,
  handleId: string,
) => (
  node.data.group === "led" &&
  /^(?:\d+V)_(?:start|end|middle_\d+)$/.test(handleId)
);

const overlayScale = (zoom: number) => Math.min(1, Math.max(0.55, zoom));

const estimateLabelSize = (valueLines: OverlayValueLine[], scale: number, hasAction = false) => {
  const longest = Math.max(...valueLines.map((value) => overlayValueLineText(value).length), 1);
  return {
    width: (Math.max(42, longest * 6 + LABEL_PADDING_X * 2) + (hasAction ? LED_PLOT_BUTTON_WIDTH : 0)) * scale,
    height: LABEL_HEIGHT * Math.max(valueLines.length, 1) * scale,
  };
};

const wireSegments = (points: XYPoint[]) => (
  points.slice(0, -1).map((from, index) => {
    const to = points[index + 1];
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    return {
      from,
      to,
      length,
      index,
      direction: length > 0
        ? {x: (to.x - from.x) / length, y: (to.y - from.y) / length}
        : {x: 0, y: 0},
    };
  }).filter((segment) => segment.length > 0)
);

const longestSegmentMidpoint = (points: XYPoint[]): SegmentPoint | undefined => {
  if(points.length < 2) return undefined;

  const segment = wireSegments(points)
    .sort((a, b) => b.length - a.length)[0];
  if(!segment) return undefined;

  return {
    point: {
      x: segment.from.x + (segment.to.x - segment.from.x) / 2,
      y: segment.from.y + (segment.to.y - segment.from.y) / 2,
    },
    direction: segment.direction,
    from: segment.from,
    to: segment.to,
    length: segment.length,
  };
};

const closestPointOnSegment = (point: XYPoint, from: XYPoint, to: XYPoint) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  if(lengthSquared <= 0) return {point: from, ratio: 0, distance: Math.hypot(point.x - from.x, point.y - from.y)};

  const ratio = Math.min(1, Math.max(0, ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared));
  const closest = {
    x: from.x + dx * ratio,
    y: from.y + dy * ratio,
  };

  return {
    point: closest,
    ratio,
    distance: Math.hypot(point.x - closest.x, point.y - closest.y),
  };
};

const closestPointOnPolyline = (points: XYPoint[], point: XYPoint): SegmentPoint | undefined => {
  const segment = wireSegments(points)
    .map((candidate) => ({
      ...candidate,
      closest: closestPointOnSegment(point, candidate.from, candidate.to),
    }))
    .sort((a, b) => a.closest.distance - b.closest.distance)[0];
  if(!segment) return undefined;

  return {
    point: segment.closest.point,
    direction: segment.direction,
    from: segment.from,
    to: segment.to,
    length: segment.length,
  };
};

const pointAtSegmentRatio = (
  segment: Pick<SegmentPoint, "from" | "to" | "direction" | "length">,
  ratio: number,
): SegmentPoint => ({
  point: {
    x: segment.from.x + (segment.to.x - segment.from.x) * ratio,
    y: segment.from.y + (segment.to.y - segment.from.y) * ratio,
  },
  direction: segment.direction,
  from: segment.from,
  to: segment.to,
  length: segment.length,
});

const rectsOverlap = (
  a: {left: number; right: number; top: number; bottom: number},
  b: {left: number; right: number; top: number; bottom: number},
) => (
  a.left < b.right &&
  a.right > b.left &&
  a.top < b.bottom &&
  a.bottom > b.top
);

const labelRect = (label: Pick<OverlayLabel, "x" | "y" | "width" | "height">) => ({
  left: label.x - label.width / 2,
  right: label.x + label.width / 2,
  top: label.y - label.height / 2,
  bottom: label.y + label.height / 2,
});

const screenSegmentRect = (
  from: XYPoint,
  to: XYPoint,
  viewport: {x: number; y: number; zoom: number},
  padding: number,
) => {
  const start = screenPoint(from, viewport);
  const end = screenPoint(to, viewport);
  return {
    left: Math.min(start.x, end.x) - padding,
    right: Math.max(start.x, end.x) + padding,
    top: Math.min(start.y, end.y) - padding,
    bottom: Math.max(start.y, end.y) + padding,
  };
};

const nodeObstacleRects = (
  nodes: Node<ComponentDataType>[],
  viewport: {x: number; y: number; zoom: number},
) => nodes.map((node) => {
  const width = node.measured?.width ?? node.width ?? node.data.image?.width ?? 0;
  const height = node.measured?.height ?? node.height ?? node.data.image?.height ?? 0;
  const topLeft = screenPoint(node.position, viewport);
  return {
    left: topLeft.x - COMPONENT_OBSTACLE_PADDING,
    right: topLeft.x + width * viewport.zoom + COMPONENT_OBSTACLE_PADDING,
    top: topLeft.y - COMPONENT_OBSTACLE_PADDING,
    bottom: topLeft.y + height * viewport.zoom + COMPONENT_OBSTACLE_PADDING,
  };
});

const handleObstacleRects = (
  nodes: Node<ComponentDataType>[],
  viewport: {x: number; y: number; zoom: number},
) => nodes.flatMap((node) => (
  [...(node.data.handles ?? []), ...(node.data.repeatedHandleArray ?? [])].flatMap((handle) => {
    const endpoint = getRenderedWireEndpoint(node, handle.hid);
    if(!endpoint) return [];

    const center = screenPoint(endpoint, viewport);
    const width = Math.max(8, (handle.width ?? 8) * viewport.zoom);
    const height = Math.max(8, (handle.height ?? 8) * viewport.zoom);
    return [{
      left: center.x - width / 2 - COMPONENT_OBSTACLE_PADDING,
      right: center.x + width / 2 + COMPONENT_OBSTACLE_PADDING,
      top: center.y - height / 2 - COMPONENT_OBSTACLE_PADDING,
      bottom: center.y + height / 2 + COMPONENT_OBSTACLE_PADDING,
    }];
  })
));

const wireObstacleRects = (
  edges: Edge<EdgeDataType>[],
  nodeById: Map<string, Node<ComponentDataType>>,
  viewport: {x: number; y: number; zoom: number},
) => edges.flatMap((edge) => {
  const points = wirePoints(nodeById, edge);
  return wireSegments(points).map((segment) => screenSegmentRect(
    segment.from,
    segment.to,
    viewport,
    Math.max(WIRE_OBSTACLE_PADDING, ((edge.data?.width ?? 1) * viewport.zoom) / 2 + WIRE_OBSTACLE_PADDING),
  ));
});

const wireArrowBlockingRects = (
  edges: Edge<EdgeDataType>[],
  nodeById: Map<string, Node<ComponentDataType>>,
  viewport: {x: number; y: number; zoom: number},
  activeEdgeId: string,
) => edges.flatMap((edge) => {
  if(edge.id === activeEdgeId) return [];

  const points = wirePoints(nodeById, edge);
  return wireSegments(points).map((segment) => screenSegmentRect(
    segment.from,
    segment.to,
    viewport,
    Math.max(
      WIRE_ARROW_CROSSING_PADDING_PX,
      ((edge.data?.width ?? 1) * viewport.zoom) / 2 + WIRE_ARROW_CROSSING_PADDING_PX,
    ),
  ));
});

const hoverPreferredNormal = (
  currentDirection: XYPoint,
) => {
  const normal = {x: -currentDirection.y, y: currentDirection.x};
  if(Math.abs(currentDirection.x) >= Math.abs(currentDirection.y)) {
    return normal.y < 0 ? normal : {x: -normal.x, y: -normal.y};
  }

  return normal.x < 0 ? normal : {x: -normal.x, y: -normal.y};
};

const arrowRect = (
  center: XYPoint,
  direction: XYPoint,
  normal: XYPoint,
  lengthPx: number,
  paddingPx: number,
) => {
  const halfLength = lengthPx / 2;
  const halfThickness = WIRE_ARROW_STROKE_WIDTH / 2 + paddingPx;
  const corners = [
    {
      x: center.x - direction.x * halfLength - normal.x * halfThickness,
      y: center.y - direction.y * halfLength - normal.y * halfThickness,
    },
    {
      x: center.x - direction.x * halfLength + normal.x * halfThickness,
      y: center.y - direction.y * halfLength + normal.y * halfThickness,
    },
    {
      x: center.x + direction.x * halfLength - normal.x * halfThickness,
      y: center.y + direction.y * halfLength - normal.y * halfThickness,
    },
    {
      x: center.x + direction.x * halfLength + normal.x * halfThickness,
      y: center.y + direction.y * halfLength + normal.y * halfThickness,
    },
  ];

  return {
    left: Math.min(...corners.map((corner) => corner.x)),
    right: Math.max(...corners.map((corner) => corner.x)),
    top: Math.min(...corners.map((corner) => corner.y)),
    bottom: Math.max(...corners.map((corner) => corner.y)),
  };
};

const chooseArrowPoint = (
  point: SegmentPoint,
  currentDirection: XYPoint,
  normal: XYPoint,
  arrowOffsetPx: number,
  viewport: {x: number; y: number; zoom: number},
  blockingRects: Array<{left: number; right: number; top: number; bottom: number}>,
) => {
  const minimumMarginFlow = WIRE_ARROW_LENGTH_PX / 2 / Math.max(viewport.zoom, 0.001);
  const availableLength = Math.max(point.length - minimumMarginFlow * 2, 0);
  const preferredRatio = availableLength > 0
    ? Math.min(1, Math.max(0, ((point.point.x - point.from.x) * point.direction.x + (point.point.y - point.from.y) * point.direction.y) / point.length))
    : 0.5;
  const maxRatioShift = availableLength > 0 ? availableLength / point.length / 2 : 0;
  const ratioOffsets = [0, 0.12, -0.12, 0.22, -0.22, 0.34, -0.34, 0.44, -0.44];
  const candidateRatios = ratioOffsets
    .map((offset) => Math.min(1, Math.max(0, preferredRatio + offset)))
    .filter((ratio) => Math.abs(ratio - 0.5) <= 0.5 && Math.abs(ratio - preferredRatio) <= Math.max(maxRatioShift, 0.02));

  const candidates = Array.from(new Set(candidateRatios.map((ratio) => ratio.toFixed(4))))
    .map((ratio) => pointAtSegmentRatio(point, Number(ratio)))
    .map((candidate) => {
      const candidateScreen = screenPoint(candidate.point, viewport);
      const arrowCenter = {
        x: candidateScreen.x + normal.x * arrowOffsetPx,
        y: candidateScreen.y + normal.y * arrowOffsetPx,
      };
      const rect = arrowRect(
        arrowCenter,
        currentDirection,
        normal,
        WIRE_ARROW_LENGTH_PX,
        WIRE_ARROW_CROSSING_PADDING_PX,
      );
      const blockingPenalty = blockingRects.reduce((sum, blockingRect) => (
        sum + rectOverlapPenalty(rect, blockingRect)
      ), 0);
      const shiftPenalty = Math.hypot(
        candidateScreen.x - screenPoint(point.point, viewport).x,
        candidateScreen.y - screenPoint(point.point, viewport).y,
      ) * 0.15;

      return {candidate, penalty: blockingPenalty * 10 + shiftPenalty};
    })
    .sort((a, b) => a.penalty - b.penalty);

  return candidates[0]?.candidate ?? point;
};

const rectOverlapPenalty = (
  rect: {left: number; right: number; top: number; bottom: number},
  obstacle: {left: number; right: number; top: number; bottom: number},
) => {
  if(!rectsOverlap(rect, obstacle)) return 0;
  return (Math.min(rect.right, obstacle.right) - Math.max(rect.left, obstacle.left)) *
    (Math.min(rect.bottom, obstacle.bottom) - Math.max(rect.top, obstacle.top));
};

const chooseLabelPosition = (
  anchor: XYPoint,
  direction: XYPoint,
  normal: XYPoint,
  size: {width: number; height: number},
  existingLabels: OverlayLabel[],
  obstacles: Array<{left: number; right: number; top: number; bottom: number}>,
  labelGapPx = WIRE_LABEL_GAP,
) => {
  const candidates = [
    {x: anchor.x + normal.x * labelGapPx, y: anchor.y + normal.y * labelGapPx},
    {x: anchor.x - normal.x * labelGapPx, y: anchor.y - normal.y * labelGapPx},
    {x: anchor.x + direction.x * labelGapPx, y: anchor.y + direction.y * labelGapPx},
    {x: anchor.x - direction.x * labelGapPx, y: anchor.y - direction.y * labelGapPx},
    {x: anchor.x + (normal.x + direction.x) * labelGapPx, y: anchor.y + (normal.y + direction.y) * labelGapPx},
    {x: anchor.x + (normal.x - direction.x) * labelGapPx, y: anchor.y + (normal.y - direction.y) * labelGapPx},
    {x: anchor.x - (normal.x + direction.x) * labelGapPx, y: anchor.y - (normal.y + direction.y) * labelGapPx},
    {x: anchor.x - (normal.x - direction.x) * labelGapPx, y: anchor.y - (normal.y - direction.y) * labelGapPx},
  ];

  return candidates
    .map((candidate) => {
      const rect = labelRect({...candidate, ...size});
      const obstaclePenalty = obstacles.reduce((sum, obstacle) => sum + rectOverlapPenalty(rect, obstacle), 0);
      const labelPenalty = existingLabels.reduce((sum, label) => (
        sum + rectOverlapPenalty(rect, labelRect(label)) * 3
      ), 0);
      const distancePenalty = Math.hypot(candidate.x - anchor.x, candidate.y - anchor.y) * 0.05;
      return {candidate, penalty: obstaclePenalty + labelPenalty + distancePenalty};
    })
    .sort((a, b) => a.penalty - b.penalty)[0].candidate;
};

const chooseVoltageLabelPosition = (
  anchor: XYPoint,
  size: {width: number; height: number},
  existingLabels: OverlayLabel[],
  obstacles: Array<{left: number; right: number; top: number; bottom: number}>,
) => {
  const gap = VOLTAGE_LABEL_GAP;
  const candidates = [
    {x: anchor.x, y: anchor.y - gap},
    {x: anchor.x + gap, y: anchor.y},
    {x: anchor.x, y: anchor.y + gap},
    {x: anchor.x - gap, y: anchor.y},
    {x: anchor.x + gap, y: anchor.y - gap},
    {x: anchor.x - gap, y: anchor.y - gap},
    {x: anchor.x + gap, y: anchor.y + gap},
    {x: anchor.x - gap, y: anchor.y + gap},
    {x: anchor.x, y: anchor.y - gap * 1.7},
    {x: anchor.x + gap * 1.7, y: anchor.y},
    {x: anchor.x, y: anchor.y + gap * 1.7},
    {x: anchor.x - gap * 1.7, y: anchor.y},
  ];

  return candidates
    .map((candidate) => {
      const rect = labelRect({...candidate, ...size});
      const obstaclePenalty = obstacles.reduce((sum, obstacle) => sum + rectOverlapPenalty(rect, obstacle), 0);
      const labelPenalty = existingLabels.reduce((sum, label) => (
        sum + rectOverlapPenalty(rect, labelRect(label)) * 4
      ), 0);
      const distancePenalty = Math.hypot(candidate.x - anchor.x, candidate.y - anchor.y) * 0.08;
      return {candidate, penalty: obstaclePenalty + labelPenalty + distancePenalty};
    })
    .sort((a, b) => a.penalty - b.penalty)[0].candidate;
};

const createVoltageLabel = (
  id: string,
  value: number,
  anchor: XYPoint,
  scale: number,
  existingLabels: OverlayLabel[],
  obstacles: Array<{left: number; right: number; top: number; bottom: number}>,
): OverlayLabel => {
  const valueLines = [formatVoltage(value)];
  const size = estimateLabelSize(valueLines, scale);
  const position = chooseVoltageLabelPosition(anchor, size, existingLabels, obstacles);

  return {
    id,
    kind: "voltage",
    valueLines,
    x: position.x,
    y: position.y,
    anchorX: anchor.x,
    anchorY: anchor.y,
    width: size.width,
    height: size.height,
  };
};

const createUsbVoltageLabel = (
  id: string,
  value: number,
  anchor: XYPoint,
  scale: number,
  existingLabels: OverlayLabel[],
  obstacles: Array<{left: number; right: number; top: number; bottom: number}>,
): OverlayLabel => {
  const valueLines = [formatUsbVoltage(value)];
  const size = estimateLabelSize(valueLines, scale);
  const position = chooseVoltageLabelPosition(anchor, size, existingLabels, obstacles);

  return {
    id,
    kind: "voltage",
    valueLines,
    x: position.x,
    y: position.y,
    anchorX: anchor.x,
    anchorY: anchor.y,
    width: size.width,
    height: size.height,
  };
};

const isLedNode = (node: Node<ComponentDataType>) => node.data.group === "led";

const ledPairedGndHandleId = (handleId: string) => {
  const match = /^(\d+V)_(start|end|middle_\d+)$/.exec(handleId);
  return match ? `GND_${match[2]}` : undefined;
};

const ledStripHandlePosition = (handleId: string) => {
  const match = /^(?:\d+V)_(start|end|middle_\d+)$/.exec(handleId);
  if(!match) return undefined;
  if(match[1].startsWith("middle_")) return "middle";
  return match[1] as "start" | "end";
};

const distanceOutsideRect = (point: XYPoint, bounds: Rect) => {
  const dx = point.x < bounds.left
    ? bounds.left - point.x
    : point.x > bounds.right
      ? point.x - bounds.right
      : 0;
  const dy = point.y < bounds.top
    ? bounds.top - point.y
    : point.y > bounds.bottom
      ? point.y - bounds.bottom
      : 0;

  return Math.hypot(dx, dy);
};

const insetRect = (bounds: Rect, inset: number): Rect => ({
  left: bounds.left + inset,
  right: bounds.right - inset,
  top: bounds.top + inset,
  bottom: bounds.bottom - inset,
});

const screenLineRect = (from: XYPoint, to: XYPoint, padding: number): Rect => ({
  left: Math.min(from.x, to.x) - padding,
  right: Math.max(from.x, to.x) + padding,
  top: Math.min(from.y, to.y) - padding,
  bottom: Math.max(from.y, to.y) + padding,
});

const chooseVoltageDeltaNormal = (
  supplyAnchor: XYPoint,
  gndAnchor: XYPoint,
  direction: XYPoint,
  baseNormal: XYPoint,
  supplyHandleId: string,
  nodeBounds: Rect,
  wireObstacles: Rect[],
) => {
  const handlePosition = ledStripHandlePosition(supplyHandleId);
  const innerBounds = insetRect(nodeBounds, VOLTAGE_DELTA_ARROW_BOUNDS_PADDING);
  const normals = [baseNormal, {x: -baseNormal.x, y: -baseNormal.y}];
  const nodeCenter = {
    x: (nodeBounds.left + nodeBounds.right) / 2,
    y: (nodeBounds.top + nodeBounds.bottom) / 2,
  };

  return normals
    .map((normal) => {
      const arrowStart = {
        x: supplyAnchor.x + normal.x * VOLTAGE_DELTA_ARROW_OFFSET_PX,
        y: supplyAnchor.y + normal.y * VOLTAGE_DELTA_ARROW_OFFSET_PX,
      };
      const arrowEnd = {
        x: gndAnchor.x + normal.x * VOLTAGE_DELTA_ARROW_OFFSET_PX,
        y: gndAnchor.y + normal.y * VOLTAGE_DELTA_ARROW_OFFSET_PX,
      };
      const rect = screenLineRect(
        arrowStart,
        arrowEnd,
        VOLTAGE_DELTA_ARROW_STROKE_WIDTH / 2 + VOLTAGE_DELTA_ARROW_BOUNDS_PADDING,
      );
      const wirePenalty = wireObstacles.reduce((sum, obstacle) => sum + rectOverlapPenalty(rect, obstacle), 0);
      const outsidePenalty = distanceOutsideRect(arrowStart, innerBounds) + distanceOutsideRect(arrowEnd, innerBounds);
      const center = {
        x: (arrowStart.x + arrowEnd.x) / 2,
        y: (arrowStart.y + arrowEnd.y) / 2,
      };
      const centerPenalty = Math.hypot(center.x - nodeCenter.x, center.y - nodeCenter.y) * 0.01;
      const directionTieBreaker = Math.abs(direction.x) >= Math.abs(direction.y)
        ? (normal.y < 0 ? 0 : 0.1)
        : (normal.x < 0 ? 0 : 0.1);
      const endpointPenalty = handlePosition === "start" || handlePosition === "end"
        ? outsidePenalty * 1000 + centerPenalty
        : wirePenalty * 12 + outsidePenalty * 3 + centerPenalty + directionTieBreaker;

      return {normal, penalty: endpointPenalty};
    })
    .sort((a, b) => a.penalty - b.penalty)[0].normal;
};

const voltageDeltaLeaderTarget = (
  labelPosition: XYPoint,
  arrowStart: XYPoint,
  arrowEnd: XYPoint,
  fallbackNormal: XYPoint,
) => {
  const closest = closestPointOnSegment(labelPosition, arrowStart, arrowEnd).point;
  const dx = labelPosition.x - closest.x;
  const dy = labelPosition.y - closest.y;
  const length = Math.hypot(dx, dy);
  const outward = length > 0.001
    ? {x: dx / length, y: dy / length}
    : fallbackNormal;
  const offset = VOLTAGE_DELTA_ARROW_STROKE_WIDTH / 2 + 0.75;

  return {
    x: closest.x + outward.x * offset,
    y: closest.y + outward.y * offset,
  };
};

const createVoltageDeltaOverlay = (
  id: string,
  node: Node<ComponentDataType>,
  supplyHandleId: string,
  supplyAnchor: XYPoint,
  gndAnchor: XYPoint,
  deltaV: number,
  viewport: {x: number; y: number; zoom: number},
  scale: number,
  existingLabels: OverlayLabel[],
  obstacles: Array<{left: number; right: number; top: number; bottom: number}>,
  wireObstacles: Rect[],
) => {
  const dx = gndAnchor.x - supplyAnchor.x;
  const dy = gndAnchor.y - supplyAnchor.y;
  const length = Math.hypot(dx, dy) || 1;
  const direction = {x: dx / length, y: dy / length};
  const normal = {x: -direction.y, y: direction.x};
  const preferredNormal = chooseVoltageDeltaNormal(
    supplyAnchor,
    gndAnchor,
    direction,
    normal,
    supplyHandleId,
    nodeScreenBounds(node, viewport),
    wireObstacles,
  );
  const arrowStart = {
    x: supplyAnchor.x + preferredNormal.x * VOLTAGE_DELTA_ARROW_OFFSET_PX,
    y: supplyAnchor.y + preferredNormal.y * VOLTAGE_DELTA_ARROW_OFFSET_PX,
  };
  const arrowEnd = {
    x: gndAnchor.x + preferredNormal.x * VOLTAGE_DELTA_ARROW_OFFSET_PX,
    y: gndAnchor.y + preferredNormal.y * VOLTAGE_DELTA_ARROW_OFFSET_PX,
  };
  const arrowCenter = {
    x: (arrowStart.x + arrowEnd.x) / 2,
    y: (arrowStart.y + arrowEnd.y) / 2,
  };
  const valueLines = [formatDeltaVoltage(deltaV)];
  const size = estimateLabelSize(valueLines, scale);
  const labelPosition = chooseLabelPosition(
    arrowCenter,
    direction,
    preferredNormal,
    size,
    existingLabels,
    obstacles,
    VOLTAGE_DELTA_LABEL_GAP_PX,
  );
  const leaderTarget = voltageDeltaLeaderTarget(labelPosition, arrowStart, arrowEnd, preferredNormal);

  return {
    arrow: {
      id: `voltage-delta-arrow:${id}`,
      kind: "voltageDelta" as const,
      startX: arrowStart.x,
      startY: arrowStart.y,
      endX: arrowEnd.x,
      endY: arrowEnd.y,
      bidirectional: false,
    },
    label: {
      id: `voltage-delta:${id}`,
      kind: "voltageDelta" as const,
      valueLines,
      x: labelPosition.x,
      y: labelPosition.y,
      anchorX: leaderTarget.x,
      anchorY: leaderTarget.y,
      width: size.width,
      height: size.height,
    },
  };
};

const nodeScreenBounds = (
  node: Node<ComponentDataType>,
  viewport: {x: number; y: number; zoom: number},
) => {
  const width = node.measured?.width ?? node.width ?? node.data.image?.width ?? 0;
  const height = node.measured?.height ?? node.height ?? node.data.image?.height ?? 0;
  const topLeft = screenPoint(node.position, viewport);

  return {
    left: topLeft.x,
    right: topLeft.x + width * viewport.zoom,
    top: topLeft.y,
    bottom: topLeft.y + height * viewport.zoom,
    centerX: topLeft.x + width * viewport.zoom / 2,
    centerY: topLeft.y + height * viewport.zoom / 2,
  };
};

const chooseLedStripSummaryPosition = (
  bounds: ReturnType<typeof nodeScreenBounds>,
  size: {width: number; height: number},
  existingLabels: OverlayLabel[],
  obstacles: Array<{left: number; right: number; top: number; bottom: number}>,
) => {
  const gap = 24;
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const isHorizontal = width >= height;
  const shifts = [0, -0.18, 0.18, -0.32, 0.32, -0.44, 0.44];
  const candidates = shifts.flatMap((shift) => {
    if(isHorizontal) {
      const x = bounds.centerX + shift * width;
      return [
        {x, y: bounds.top - gap},
        {x, y: bounds.bottom + gap},
      ];
    }

    const y = bounds.centerY + shift * height;
    return [
      {x: bounds.left - gap, y},
      {x: bounds.right + gap, y},
    ];
  });

  return candidates
    .map((candidate, index) => {
      const rect = labelRect({...candidate, ...size});
      const obstaclePenalty = obstacles.reduce((sum, obstacle) => sum + rectOverlapPenalty(rect, obstacle), 0);
      const labelPenalty = existingLabels.reduce((sum, label) => (
        sum + rectOverlapPenalty(rect, labelRect(label)) * 8
      ), 0);
      const distancePenalty = Math.hypot(candidate.x - bounds.centerX, candidate.y - bounds.centerY) * 0.06;
      const orderPenalty = index * 0.35;
      return {candidate, penalty: obstaclePenalty + labelPenalty + distancePenalty + orderPenalty};
    })
    .sort((a, b) => a.penalty - b.penalty)[0].candidate;
};

const closestPointOnRectBoundary = (
  point: XYPoint,
  bounds: {left: number; right: number; top: number; bottom: number},
) => ({
  x: Math.min(bounds.right, Math.max(bounds.left, point.x)),
  y: Math.min(bounds.bottom, Math.max(bounds.top, point.y)),
});

const createLedStripMinDeltaLabel = (
  node: Node<ComponentDataType>,
  sourceElementId: string | undefined,
  minDeltaVoltageV: number,
  ledPlotTarget: LedVoltagePlotTarget | undefined,
  viewport: {x: number; y: number; zoom: number},
  scale: number,
  existingLabels: OverlayLabel[],
  obstacles: Array<{left: number; right: number; top: number; bottom: number}>,
): OverlayLabel => {
  const valueLines = [formatMinDeltaVoltage(minDeltaVoltageV)];
  const size = estimateLabelSize(valueLines, scale, ledPlotTarget !== undefined);
  const bounds = nodeScreenBounds(node, viewport);
  const position = chooseLedStripSummaryPosition(bounds, size, existingLabels, obstacles);
  const anchor = closestPointOnRectBoundary(position, bounds);

  return {
    id: `led-delta-min:${node.id}:${sourceElementId ?? "strip"}`,
    kind: "voltageDeltaMin",
    valueLines,
    ledPlotTarget,
    x: position.x,
    y: position.y,
    anchorX: anchor.x,
    anchorY: anchor.y,
    width: size.width,
    height: size.height,
    targetBounds: {
      left: bounds.left,
      right: bounds.right,
      top: bounds.top,
      bottom: bounds.bottom,
    },
  };
};

const roundedCurrentIsZero = (value: number) => Math.abs(value) < 0.005;

const createWireCurrentOverlay = (
  id: string,
  point: SegmentPoint,
  currentA: number,
  wireWidth: number,
  viewport: {x: number; y: number; zoom: number},
  scale: number,
  existingLabels: OverlayLabel[],
  obstacles: Array<{left: number; right: number; top: number; bottom: number}>,
  blockingRects: Array<{left: number; right: number; top: number; bottom: number}>,
  forceBidirectional = false,
  preferredNormal?: XYPoint,
  labelGapPx = WIRE_LABEL_GAP,
) => {
  const bidirectional = forceBidirectional || roundedCurrentIsZero(currentA);
  const currentDirection = currentA >= 0
    ? point.direction
    : {x: -point.direction.x, y: -point.direction.y};
  const normal = preferredNormal ?? {x: -currentDirection.y, y: currentDirection.x};
  const arrowOffsetPx = Math.max(
    WIRE_ARROW_MIN_GAP_PX + WIRE_ARROW_STROKE_WIDTH / 2,
    ((wireWidth * viewport.zoom) / 2) + WIRE_ARROW_MIN_GAP_PX + WIRE_ARROW_STROKE_WIDTH / 2,
  );
  const arrowPoint = chooseArrowPoint(
    point,
    currentDirection,
    normal,
    arrowOffsetPx,
    viewport,
    blockingRects,
  );
  const arrowPointScreen = screenPoint(arrowPoint.point, viewport);
  const arrowCenterScreen = {
    x: arrowPointScreen.x + normal.x * arrowOffsetPx,
    y: arrowPointScreen.y + normal.y * arrowOffsetPx,
  };
  const arrowStart = {
    x: arrowCenterScreen.x - currentDirection.x * WIRE_ARROW_LENGTH_PX / 2,
    y: arrowCenterScreen.y - currentDirection.y * WIRE_ARROW_LENGTH_PX / 2,
  };
  const arrowEnd = {
    x: arrowCenterScreen.x + currentDirection.x * WIRE_ARROW_LENGTH_PX / 2,
    y: arrowCenterScreen.y + currentDirection.y * WIRE_ARROW_LENGTH_PX / 2,
  };
  const valueLines = [formatCurrent(currentA)];
  const size = estimateLabelSize(valueLines, scale);
  const labelPosition = chooseLabelPosition(
    arrowCenterScreen,
    currentDirection,
    normal,
    size,
    existingLabels,
    obstacles,
    labelGapPx,
  );

  return {
    arrow: {
      id: `wire-arrow:${id}`,
      kind: "current" as const,
      startX: arrowStart.x,
      startY: arrowStart.y,
      endX: arrowEnd.x,
      endY: arrowEnd.y,
      bidirectional,
      bounds: arrowRect(
        arrowCenterScreen,
        currentDirection,
        normal,
        WIRE_ARROW_LENGTH_PX,
        WIRE_ARROW_CROSSING_PADDING_PX,
      ),
    },
    label: {
      id: `wire-current:${id}`,
      kind: "wireCurrent" as const,
      valueLines,
      x: labelPosition.x,
      y: labelPosition.y,
      anchorX: arrowCenterScreen.x,
      anchorY: arrowCenterScreen.y,
      width: size.width,
      height: size.height,
    },
  };
};

const labelsOverlap = (a: OverlayLabel, b: OverlayLabel) => (
  Math.abs(a.x - b.x) < (a.width + b.width) / 2 + OVERLAP_PADDING &&
  Math.abs(a.y - b.y) < (a.height + b.height) / 2 + OVERLAP_PADDING
);

const resolveLabelOverlaps = (labels: OverlayLabel[]) => {
  const resolved = labels.map((label) => ({...label}));

  for(let iteration = 0; iteration < 18; iteration += 1) {
    let changed = false;

    for(let aIndex = 0; aIndex < resolved.length; aIndex += 1) {
      for(let bIndex = aIndex + 1; bIndex < resolved.length; bIndex += 1) {
        const a = resolved[aIndex];
        const b = resolved[bIndex];
        if(!labelsOverlap(a, b)) continue;

        const dx = b.x - a.x || 1;
        const dy = b.y - a.y || 1;
        const distance = Math.hypot(dx, dy) || 1;
        const overlapX = (a.width + b.width) / 2 + OVERLAP_PADDING - Math.abs(dx);
        const overlapY = (a.height + b.height) / 2 + OVERLAP_PADDING - Math.abs(dy);
        const push = Math.min(Math.max(overlapX, overlapY), 14) / 2;
        const pushX = (dx / distance) * push;
        const pushY = (dy / distance) * push;

        a.x -= pushX;
        a.y -= pushY;
        b.x += pushX;
        b.y += pushY;
        changed = true;
      }
    }

    if(!changed) break;
  }

  return resolved;
};

const updateTargetBoundaryAnchors = (labels: OverlayLabel[]) => (
  labels.map((label) => {
    if(label.kind !== "voltageDeltaMin" || !label.targetBounds) return label;

    const anchor = closestPointOnRectBoundary(label, label.targetBounds);
    return {
      ...label,
      anchorX: anchor.x,
      anchorY: anchor.y,
    };
  })
);

const leaderLineNeeded = (label: OverlayLabel) => (
  label.kind === "voltage" ||
  label.kind === "voltageDelta" ||
  label.kind === "voltageDeltaMin" ||
  label.kind === "wireCurrent" ||
  label.kind === "wireHover" ||
  Math.hypot(label.x - label.anchorX, label.y - label.anchorY) > LEADER_LINE_THRESHOLD
);

const LED_PLOT_KEY_SEPARATOR = "\u001f";

const ledPlotKey = (target: LedVoltagePlotTarget) => `${target.nodeId}${LED_PLOT_KEY_SEPARATOR}${target.sourceElementId ?? ""}`;

const ledStripSectionMarkersM = (node: Node<ComponentDataType> | undefined) => {
  if(!node?.data.physLengths) return [];

  const sorted = [...node.data.physLengths]
    .filter((physLength) => (
      Number.isInteger(physLength.startIndex) &&
      typeof physLength.length === "number" &&
      Number.isFinite(physLength.length) &&
      physLength.length > 0
    ))
    .sort((a, b) => a.startIndex - b.startIndex);

  let distanceM = 0;
  return sorted.flatMap((physLength, index) => {
    distanceM += physLength.length as number;
    return index < sorted.length - 1 ? [distanceM] : [];
  });
};

const createLedVoltagePlotData = (
  simulationResult: SimulationResult | null,
  nodes: Node<ComponentDataType>[],
) => {
  if(!simulationResult) return new Map<string, LedVoltagePlotData>();

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const groups = new Map<string, LedVoltagePlotPoint[]>();

  simulationResult.ledElementVoltageResults.forEach((result) => {
    if(
      result.distanceM === undefined ||
      result.deltaVoltageV === undefined ||
      !Number.isFinite(result.distanceM) ||
      !Number.isFinite(result.deltaVoltageV)
    ) {
      return;
    }

    const key = ledPlotKey(result);
    const group = groups.get(key) ?? [];
    group.push({
      distanceM: result.distanceM,
      deltaVoltageV: result.deltaVoltageV,
      sectionIndex: result.sectionIndex,
      logicLedIndex: result.logicLedIndex,
      physicalLedCount: result.physicalLedCount,
    });
    groups.set(key, group);
  });

  const plotData = new Map<string, LedVoltagePlotData>();
  groups.forEach((rawPoints, key) => {
    const points = [...rawPoints].sort((a, b) => a.distanceM - b.distanceM);
    if(points.length < 2) return;

    const [nodeId, sourceElementIdValue] = key.split(LED_PLOT_KEY_SEPARATOR);
    const node = nodeById.get(nodeId);
    const minPoint = points.reduce((lowest, point) => (
      point.deltaVoltageV < lowest.deltaVoltageV ? point : lowest
    ), points[0]);
    const physicalLedCount = points.reduce((total, point) => total + (
      typeof point.physicalLedCount === "number" && Number.isFinite(point.physicalLedCount)
        ? point.physicalLedCount
        : 1
    ), 0);

    plotData.set(key, {
      nodeId,
      sourceElementId: sourceElementIdValue || undefined,
      title: node?.data.technicalID || nodeId,
      points,
      sectionMarkersM: ledStripSectionMarkersM(node),
      minPoint,
      logicalLedCount: points.length,
      physicalLedCount,
    });
  });

  return plotData;
};

const niceTicks = (min: number, max: number, count: number) => {
  if(!Number.isFinite(min) || !Number.isFinite(max) || count <= 1) return [min, max];
  if(Math.abs(max - min) < 1e-9) {
    const padding = Math.max(Math.abs(max) * 0.05, 0.1);
    min -= padding;
    max += padding;
  }

  return Array.from({length: count}, (_unused, index) => min + (max - min) * index / (count - 1));
};

const LedVoltagePlot = ({
  data,
  t,
}: {
  data: LedVoltagePlotData;
  t: (key: string, options?: Record<string, unknown>) => string;
}) => {
  const width = 760;
  const height = 380;
  const margin = {top: 22, right: 24, bottom: 52, left: 64};
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const maxDistance = Math.max(...data.points.map((point) => point.distanceM), 0.001);
  const minVoltage = Math.min(...data.points.map((point) => point.deltaVoltageV));
  const maxVoltage = Math.max(...data.points.map((point) => point.deltaVoltageV));
  const voltagePadding = Math.max((maxVoltage - minVoltage) * 0.08, 0.05);
  const yMin = minVoltage - voltagePadding;
  const yMax = maxVoltage + voltagePadding;
  const xTicks = niceTicks(0, maxDistance, 6);
  const yTicks = niceTicks(yMin, yMax, 6);
  const xScale = (distanceM: number) => margin.left + (distanceM / maxDistance) * plotWidth;
  const yScale = (voltageV: number) => margin.top + ((yMax - voltageV) / (yMax - yMin)) * plotHeight;
  const path = data.points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${xScale(point.distanceM).toFixed(2)} ${yScale(point.deltaVoltageV).toFixed(2)}`)
    .join(" ");

  return (
    <div style={{width: "100%"}}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={t("sidebar.simulation.ledVoltagePlot.title")}
        style={{
          display: "block",
          maxHeight: 420,
          width: "100%",
        }}
      >
        <rect x={0} y={0} width={width} height={height} fill="#fff" />
        {xTicks.map((tick) => {
          const x = xScale(tick);
          return (
            <g key={`x-grid:${tick}`}>
              <line x1={x} y1={margin.top} x2={x} y2={margin.top + plotHeight} stroke="#e8e8e8" />
              <text x={x} y={height - 24} textAnchor="middle" fill="#595959" fontSize={11}>
                {tick.toFixed(maxDistance < 10 ? 2 : 1)}
              </text>
            </g>
          );
        })}
        {yTicks.map((tick) => {
          const y = yScale(tick);
          return (
            <g key={`y-grid:${tick}`}>
              <line x1={margin.left} y1={y} x2={margin.left + plotWidth} y2={y} stroke="#e8e8e8" />
              <text x={margin.left - 10} y={y + 4} textAnchor="end" fill="#595959" fontSize={11}>
                {tick.toFixed(2)}
              </text>
            </g>
          );
        })}
        {data.sectionMarkersM.map((distanceM) => {
          if(distanceM <= 0 || distanceM >= maxDistance) return null;
          const x = xScale(distanceM);
          return (
            <g key={`section:${distanceM}`}>
              <line
                x1={x}
                y1={margin.top}
                x2={x}
                y2={margin.top + plotHeight}
                stroke="#fa8c16"
                strokeDasharray="5 4"
                strokeWidth={1.5}
              />
              <text x={x + 5} y={margin.top + 14} fill="#ad4e00" fontSize={10}>
                {distanceM.toFixed(2)} m
              </text>
            </g>
          );
        })}
        <line x1={margin.left} y1={margin.top + plotHeight} x2={margin.left + plotWidth} y2={margin.top + plotHeight} stroke="#8c8c8c" />
        <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + plotHeight} stroke="#8c8c8c" />
        <path d={path} fill="none" stroke="#1677ff" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
        {data.points.map((point) => {
          const isMin = point === data.minPoint;
          return (
            <circle
              key={`${point.distanceM}:${point.logicLedIndex}`}
              cx={xScale(point.distanceM)}
              cy={yScale(point.deltaVoltageV)}
              r={isMin ? 4.5 : 2.6}
              fill={isMin ? "#fa541c" : "#1677ff"}
              stroke="#fff"
              strokeWidth={1.5}
            >
              <title>
                {t("sidebar.simulation.ledVoltagePlot.pointTooltip", {
                  distance: point.distanceM.toFixed(3),
                  voltage: point.deltaVoltageV.toFixed(3),
                  section: point.sectionIndex !== undefined ? point.sectionIndex + 1 : "-",
                  index: point.logicLedIndex !== undefined ? point.logicLedIndex + 1 : "-",
                })}
              </title>
            </circle>
          );
        })}
        <text x={margin.left + plotWidth / 2} y={height - 6} textAnchor="middle" fill="#262626" fontSize={12}>
          {t("sidebar.simulation.ledVoltagePlot.xAxis")}
        </text>
        <text
          x={18}
          y={margin.top + plotHeight / 2}
          textAnchor="middle"
          fill="#262626"
          fontSize={12}
          transform={`rotate(-90 18 ${margin.top + plotHeight / 2})`}
        >
          <tspan>V</tspan>
          <tspan baselineShift="sub" fontSize={8}>LED</tspan>
          <tspan> (V)</tspan>
        </text>
      </svg>
      <div
        style={{
          color: "#595959",
          display: "flex",
          flexWrap: "wrap",
          fontSize: 12,
          gap: 16,
          marginTop: 8,
        }}
      >
        <span>{t("sidebar.simulation.ledVoltagePlot.ledCounts", {
          logical: data.logicalLedCount,
          physical: data.physicalLedCount,
        })}</span>
        <span>{t("sidebar.simulation.ledVoltagePlot.minVoltage", {
          voltage: data.minPoint.deltaVoltageV.toFixed(3),
          distance: data.minPoint.distanceM.toFixed(3),
        })}</span>
      </div>
    </div>
  );
};

const ActiveSimulationOverlay = ({
  simulationResult,
}: {
  simulationResult: SimulationResult;
}) => {
  const {t} = useTranslation(["main"]);
  const displayMode = useSimulationResultStore((state) => state.displayMode);
  const wireHover = useSimulationResultStore((state) => state.wireHover);
  const nodes = useNodes<Node<ComponentDataType>>();
  const edges = useEdges<Edge<EdgeDataType>>();
  const viewport = useViewport();
  const [activePlotTarget, setActivePlotTarget] = useState<LedVoltagePlotTarget | null>(null);

  const selectedWireActive = edges.some((edge) => edge.selected);
  const ledPlotDataByKey = useMemo(
    () => createLedVoltagePlotData(simulationResult, nodes),
    [nodes, simulationResult],
  );
  const activePlotData = activePlotTarget
    ? ledPlotDataByKey.get(ledPlotKey(activePlotTarget))
    : undefined;

  const overlayData = useMemo(() => {
    if(!simulationResult || selectedWireActive) return {labels: [], arrows: []};

    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const wireResultByEdgeId = new Map(simulationResult.wireResults.map((wire) => [wire.edgeId, wire]));
    const scale = overlayScale(viewport.zoom);
    const labels: OverlayLabel[] = [];
    const arrows: OverlayArrow[] = [];
    const currentArrowBlockingRects: Rect[] = [];
    const wireObstacles = wireObstacleRects(edges, nodeById, viewport);
    const obstacles = [
      ...handleObstacleRects(nodes, viewport),
      ...nodeObstacleRects(nodes, viewport),
      ...wireObstacles,
    ];
    const pinResultByNodeHandle = new Map(
      simulationResult.pinResults.map((pinResult) => [`${pinResult.nodeId}:${pinResult.handleId}`, pinResult]),
    );

    edges.forEach((edge) => {
      const wireResult = wireResultByEdgeId.get(edge.id);
      if(!wireResult || wireResult.currentA === undefined) return;
      if(!showWireCurrentInDisplayMode(wireResult.currentA, displayMode)) return;

      const normalPoint = longestSegmentMidpoint(wirePoints(nodeById, edge));
      if(!normalPoint) return;

      const overlay = createWireCurrentOverlay(
        edge.id,
        normalPoint,
        wireResult.currentA,
        edge.data?.width ?? 1,
        viewport,
        scale,
        labels,
        obstacles,
        [
          ...wireArrowBlockingRects(edges, nodeById, viewport, edge.id),
          ...currentArrowBlockingRects,
        ],
        wireResult.displayBidirectional === true,
      );
      arrows.push(overlay.arrow);
      if(overlay.arrow.bounds) {
        currentArrowBlockingRects.push(overlay.arrow.bounds);
      }
      labels.push(overlay.label);
    });

    simulationResult.pinResults
      .filter(pinResultHasVoltage)
      .forEach((pinResult) => {
        const node = nodeById.get(pinResult.nodeId);
        const endpoint = getRenderedWireEndpoint(node, pinResult.handleId);
        if(!node || !endpoint || pinResult.voltageV === undefined) return;

        const connected = pinHasConnectedWire(edges, pinResult.nodeId, pinResult.handleId);
        if(!connected) return;
        if(!showPinVoltageInDisplayMode(node, pinResult.handleId, displayMode)) return;

        const anchor = screenPoint(endpoint, viewport);
        const label = createVoltageLabel(
          `pin:${pinResult.pinId}`,
          pinResult.voltageV,
          anchor,
          scale,
          labels,
          obstacles,
        );
        labels.push(label);
      });

    simulationResult.virtualPinResults
      .filter((virtualPin) => (
        virtualPin.kind === "usbPowerPair" &&
        virtualPin.role === "supply" &&
        virtualPin.voltageLabel === "VUSB" &&
        virtualPin.voltageV !== undefined
      ))
      .forEach((supplyResult) => {
        const gndResult = simulationResult.virtualPinResults.find((candidate) => (
          candidate.kind === "usbPowerPair" &&
          candidate.role === "gnd" &&
          candidate.nodeId === supplyResult.nodeId &&
          candidate.handleId === supplyResult.handleId
        ));
        if(supplyResult.voltageV === undefined || gndResult?.voltageV === undefined) return;

        const node = nodeById.get(supplyResult.nodeId);
        const endpoint = getRenderedWireEndpoint(node, supplyResult.handleId);
        if(!node || !endpoint) return;
        if(!pinHasConnectedWire(edges, supplyResult.nodeId, supplyResult.handleId)) return;

        labels.push(createUsbVoltageLabel(
          `virtual-usb:${supplyResult.virtualPinId}`,
          supplyResult.voltageV - gndResult.voltageV,
          screenPoint(endpoint, viewport),
          scale,
          labels,
          obstacles,
        ));
      });

    nodes
      .filter(isLedNode)
      .forEach((node) => {
        simulationResult.pinResults
          .filter((pinResult) => (
            pinResult.nodeId === node.id &&
            pinResult.voltageV !== undefined &&
            isLedSupplyVoltagePin(node, pinResult.handleId)
          ))
          .forEach((supplyResult) => {
            const gndHandleId = ledPairedGndHandleId(supplyResult.handleId);
            if(!gndHandleId || supplyResult.voltageV === undefined) return;

            const gndResult = pinResultByNodeHandle.get(`${node.id}:${gndHandleId}`);
            if(gndResult?.voltageV === undefined) return;

            const supplyEndpoint = getRenderedWireEndpoint(node, supplyResult.handleId);
            const gndEndpoint = getRenderedWireEndpoint(node, gndHandleId);
            if(!supplyEndpoint || !gndEndpoint) return;

            const overlay = createVoltageDeltaOverlay(
              `${node.id}:${supplyResult.handleId}:${gndHandleId}`,
              node,
              supplyResult.handleId,
              screenPoint(supplyEndpoint, viewport),
              screenPoint(gndEndpoint, viewport),
              supplyResult.voltageV - gndResult.voltageV,
              viewport,
              scale,
              labels,
              obstacles,
              wireObstacles,
            );
            arrows.push(overlay.arrow);
            labels.push(overlay.label);
          });
      });

    if(wireHover) {
      const hoverWireResult = wireResultByEdgeId.get(wireHover.edgeId);
      if(hoverWireResult?.currentA !== undefined) {
        const edge = edges.find((candidate) => candidate.id === wireHover.edgeId);
        const points = edge ? wirePoints(nodeById, edge) : [];
        const normalPoint = longestSegmentMidpoint(points);
        const hoverPoint = closestPointOnPolyline(points, wireHover);
        if(hoverPoint) {
          const normalScreenPoint = normalPoint ? screenPoint(normalPoint.point, viewport) : undefined;
          const hoverScreenPoint = screenPoint(hoverPoint.point, viewport);
          const overlapsNormalDisplay = normalScreenPoint
            ? Math.hypot(
              hoverScreenPoint.x - normalScreenPoint.x,
              hoverScreenPoint.y - normalScreenPoint.y,
            ) < HOVER_NORMAL_DISPLAY_DISTANCE * scale
            : false;

          if(!overlapsNormalDisplay) {
            const hoverDirection = hoverWireResult.currentA >= 0
              ? hoverPoint.direction
              : {x: -hoverPoint.direction.x, y: -hoverPoint.direction.y};
            const hoverNormal = hoverPreferredNormal(hoverDirection);
            const hoverLabelGap = Math.abs(hoverDirection.x) >= Math.abs(hoverDirection.y)
              ? WIRE_LABEL_GAP + HOVER_HORIZONTAL_LABEL_EXTRA_GAP_PX
              : WIRE_LABEL_GAP;
            const overlay = createWireCurrentOverlay(
              `hover:${wireHover.edgeId}`,
              hoverPoint,
              hoverWireResult.currentA,
              edge?.data?.width ?? 1,
              viewport,
              scale,
              labels,
              obstacles,
              [
                ...wireArrowBlockingRects(edges, nodeById, viewport, wireHover.edgeId),
                ...currentArrowBlockingRects,
              ],
              hoverWireResult.displayBidirectional === true,
              hoverNormal,
              hoverLabelGap,
            );
            arrows.push(overlay.arrow);
            labels.push({...overlay.label, id: `wire-hover:${wireHover.edgeId}`, kind: "wireHover"});
          }
        }
      }
    }

    nodes
      .filter(isLedNode)
      .forEach((node) => {
        simulationResult.ledStripVoltageSummaryResults
          .filter((summary) => summary.nodeId === node.id && summary.minDeltaVoltageV !== undefined)
          .forEach((summary) => {
            if(summary.minDeltaVoltageV === undefined) return;
            labels.push(createLedStripMinDeltaLabel(
              node,
              summary.sourceElementId,
              summary.minDeltaVoltageV,
              ledPlotDataByKey.has(ledPlotKey(summary))
                ? {nodeId: summary.nodeId, sourceElementId: summary.sourceElementId}
                : undefined,
              viewport,
              scale,
              labels,
              obstacles,
            ));
          });
      });

    return {
      labels: updateTargetBoundaryAnchors(resolveLabelOverlaps(labels)),
      arrows,
    };
  }, [displayMode, edges, ledPlotDataByKey, nodes, selectedWireActive, simulationResult, viewport, wireHover]);

  if((selectedWireActive && !activePlotData) || (
    overlayData.labels.length === 0 &&
    overlayData.arrows.length === 0 &&
    !activePlotData
  )) {
    return null;
  }

  const scale = overlayScale(viewport.zoom);
  const leaderLines = overlayData.labels.filter(leaderLineNeeded);

  return (
    <>
      {!selectedWireActive && (
        <div
          style={{
            inset: 0,
            overflow: "hidden",
            pointerEvents: "none",
            position: "absolute",
            zIndex: 8,
          }}
        >
          <svg
            width="100%"
            height="100%"
            style={{
              inset: 0,
              position: "absolute",
            }}
          >
            <defs>
              <marker
                id="simulation-current-arrowhead"
                markerHeight="6"
                markerUnits="userSpaceOnUse"
                markerWidth="8"
                orient="auto-start-reverse"
                refX="5"
                refY="3"
              >
                <path d="M0,0 L8,3 L0,6 Z" fill="#1677ff" />
              </marker>
              <marker
                id="simulation-leader-arrowhead"
                markerHeight="5"
                markerWidth="7"
                orient="auto"
                refX="6"
                refY="2.5"
              >
                <path d="M0,0 L7,2.5 L0,5 Z" fill="rgba(38, 38, 38, 0.56)" />
              </marker>
              <marker
                id="simulation-voltage-arrowhead"
                markerHeight="6"
                markerUnits="userSpaceOnUse"
                markerWidth="8"
                orient="auto"
                refX="5"
                refY="3"
              >
                <path d="M0,0 L8,3 L0,6 Z" fill="#fa8c16" />
              </marker>
              <marker
                id="simulation-voltage-leader-arrowhead"
                markerHeight="5"
                markerWidth="7"
                orient="auto"
                refX="7"
                refY="2.5"
              >
                <path d="M0,0 L7,2.5 L0,5 Z" fill="#fa8c16" opacity="0.72" />
              </marker>
            </defs>
            {overlayData.arrows.map((arrow) => (
              <line
                key={arrow.id}
                x1={arrow.startX}
                y1={arrow.startY}
                x2={arrow.endX}
                y2={arrow.endY}
                stroke={arrow.kind === "voltageDelta" ? "#fa8c16" : "#1677ff"}
                strokeLinecap="round"
                strokeWidth={2}
                markerStart={arrow.kind === "current" && arrow.bidirectional ? "url(#simulation-current-arrowhead)" : undefined}
                markerEnd={arrow.kind === "voltageDelta" ? "url(#simulation-voltage-arrowhead)" : "url(#simulation-current-arrowhead)"}
              />
            ))}
            {leaderLines.map((label) => (
              <line
                key={`leader:${label.id}`}
                x1={label.x}
                y1={label.y}
                x2={label.anchorX}
                y2={label.anchorY}
                stroke={label.kind === "voltage" || label.kind === "voltageDelta" || label.kind === "voltageDeltaMin"
                  ? "rgba(250, 140, 22, 0.58)"
                  : "rgba(38, 38, 38, 0.46)"}
                strokeDasharray="3 3"
                strokeWidth={1}
                markerEnd={label.kind === "voltage" || label.kind === "voltageDelta" || label.kind === "voltageDeltaMin"
                  ? "url(#simulation-voltage-leader-arrowhead)"
                  : "url(#simulation-leader-arrowhead)"}
              />
            ))}
          </svg>
          {overlayData.labels.map((label) => (
            <div
              key={label.id}
              className="simulation-overlay-exportable"
              style={{
                alignItems: "center",
                background: label.kind === "voltage"
                  ? "rgba(255, 255, 255, 0.92)"
                  : label.kind === "voltageDelta" || label.kind === "voltageDeltaMin"
                    ? "rgba(255, 247, 230, 0.94)"
                  : "rgba(230, 244, 255, 0.94)",
                border: label.kind === "voltage"
                  ? "1px solid rgba(250, 173, 20, 0.56)"
                  : label.kind === "voltageDelta" || label.kind === "voltageDeltaMin"
                    ? "1px solid rgba(250, 140, 22, 0.62)"
                  : "1px solid rgba(22, 119, 255, 0.48)",
                borderRadius: 4,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.16)",
                color: "#1f1f1f",
                display: "flex",
                fontSize: 10,
                fontVariantNumeric: "tabular-nums",
                gap: 4,
                justifyContent: "center",
                left: label.x,
                lineHeight: 1.2,
                maxWidth: label.ledPlotTarget ? 104 : 72,
                padding: label.ledPlotTarget ? "2px 3px 2px 5px" : "2px 4px",
                position: "absolute",
                textAlign: "center",
                top: label.y,
                transform: `translate(-50%, -50%) scale(${scale})`,
                transformOrigin: "center",
                whiteSpace: "nowrap",
              }}
            >
              <div>
                {label.valueLines.map((value, index) => (
                  <div key={`${overlayValueLineText(value)}:${index}`}>
                    {renderOverlayValueLine(value)}
                  </div>
                ))}
              </div>
              {label.ledPlotTarget && (
                <Tooltip title={t("sidebar.simulation.ledVoltagePlot.openButton")}>
                  <Button
                    aria-label={t("sidebar.simulation.ledVoltagePlot.openButton")}
                    className="simulation-overlay-action"
                    icon={<LineChartOutlined />}
                    onClick={(event) => {
                      event.stopPropagation();
                      setActivePlotTarget(label.ledPlotTarget ?? null);
                    }}
                    onMouseDown={(event) => event.stopPropagation()}
                    size="small"
                    type="text"
                    style={{
                      alignItems: "center",
                      color: "#ad4e00",
                      display: "inline-flex",
                      height: 16,
                      justifyContent: "center",
                      minWidth: 16,
                      padding: 0,
                      pointerEvents: "auto",
                      width: 16,
                    }}
                  />
                </Tooltip>
              )}
            </div>
          ))}
        </div>
      )}
      <Modal
        cancelButtonProps={{style: {display: "none"}}}
        okText={t("sidebar.simulation.ledVoltagePlot.closeButton")}
        onCancel={() => setActivePlotTarget(null)}
        onOk={() => setActivePlotTarget(null)}
        open={activePlotData !== undefined}
        title={activePlotData
          ? t("sidebar.simulation.ledVoltagePlot.modalTitle", {component: activePlotData.title})
          : t("sidebar.simulation.ledVoltagePlot.title")}
        width={860}
      >
        {activePlotData && <LedVoltagePlot data={activePlotData} t={t} />}
      </Modal>
    </>
  );
};

export const SimulationOverlay = () => {
  const simulationResult = useSimulationResultStore((state) => state.result);

  if(!simulationResult) return null;

  return <ActiveSimulationOverlay simulationResult={simulationResult} />;
};
