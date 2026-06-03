import type { Edge, Node } from '@xyflow/react';

import type { ComponentDataType, EdgeDataType, edgePoint, XYPoint } from '../types';

type SolderJointWireEnd = {
  nodeId: string;
  handleId?: string | null;
  xy?: XYPoint;
};

type OrientedWire = {
  edge: Edge;
  outerEnd: SolderJointWireEnd;
  jointEnd: SolderJointWireEnd;
  pointsFromOuterToJoint: XYPoint[];
};

type CollapseSolderJointsParams = {
  nodes: Node[];
  edges: Edge[];
  candidateSolderJointIds: Iterable<string | null | undefined>;
};

type CollapseSolderJointsAfterWireDeleteParams = {
  nodes: Node[];
  edgesBeforeDelete: Edge[];
  deletedEdges: Edge[];
  deletedNodes?: Node[];
};

type CollapseSolderJointsResult = {
  nodes: Node[];
  edges: Edge[];
  collapsedSolderJointIds: string[];
};

const pointEquals = (a: XYPoint, b: XYPoint) => a.x === b.x && a.y === b.y;

const isComponentNode = (node: Node, technicalID: string) => (
  (node.data as ComponentDataType | undefined)?.technicalID === technicalID
);

const isEditableWire = (edge: Edge) => edge.type === 'editable-wire-type';

const getEdgeData = (edge: Edge) => edge.data as EdgeDataType | undefined;

const getEdgePolyline = (edge: Edge): XYPoint[] | undefined => {
  const edgeData = getEdgeData(edge);
  if(!edgeData?.startXY || !edgeData?.endXY) return undefined;

  return [
    edgeData.startXY,
    ...(edgeData.edgePoints ?? []).map(({x, y}) => ({x, y})),
    edgeData.endXY,
  ];
};

const reversePoints = (points: XYPoint[]) => [...points].reverse();

const getOrientedWire = (edge: Edge, solderJointId: string): OrientedWire | undefined => {
  const polyline = getEdgePolyline(edge);
  if(!polyline) return undefined;

  if(edge.source === solderJointId) {
    return {
      edge,
      outerEnd: {
        nodeId: edge.target,
        handleId: edge.targetHandle,
        xy: polyline[polyline.length - 1],
      },
      jointEnd: {
        nodeId: edge.source,
        handleId: edge.sourceHandle,
        xy: polyline[0],
      },
      pointsFromOuterToJoint: reversePoints(polyline),
    };
  }

  if(edge.target === solderJointId) {
    return {
      edge,
      outerEnd: {
        nodeId: edge.source,
        handleId: edge.sourceHandle,
        xy: polyline[0],
      },
      jointEnd: {
        nodeId: edge.target,
        handleId: edge.targetHandle,
        xy: polyline[polyline.length - 1],
      },
      pointsFromOuterToJoint: polyline,
    };
  }

  return undefined;
};

const areWirePropertiesCompatible = (edgeA: Edge, edgeB: Edge) => {
  const dataA = getEdgeData(edgeA);
  const dataB = getEdgeData(edgeB);
  if(!dataA || !dataB) return false;

  return (
    dataA.color === dataB.color &&
    dataA.color_selected === dataB.color_selected &&
    dataA.width === dataB.width &&
    dataA.physCrosssection === dataB.physCrosssection &&
    dataA.physCrosssectionUnit === dataB.physCrosssectionUnit &&
    dataA.physType === dataB.physType
  );
};

const mergePhysicalLength = (
  lengthA: EdgeDataType['physLength'],
  lengthB: EdgeDataType['physLength'],
) => (
  typeof lengthA === 'number' && typeof lengthB === 'number'
    ? lengthA + lengthB
    : null
);

const areCollinear = (a: XYPoint, b: XYPoint, c: XYPoint) => (
  (a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y)
);

export const simplifyWirePath = (points: XYPoint[]) => {
  const simplified: XYPoint[] = [];

  points.forEach((point) => {
    if(simplified.length>0 && pointEquals(simplified[simplified.length - 1], point)) return;

    simplified.push({...point});

    while(simplified.length>=3) {
      const lastIndex = simplified.length - 1;
      const before = simplified[lastIndex - 2];
      const middle = simplified[lastIndex - 1];
      const after = simplified[lastIndex];

      if(!areCollinear(before, middle, after)) break;

      simplified.splice(lastIndex - 1, 1);
    }
  });

  return simplified;
};

const buildMergedEdge = (wireA: OrientedWire, wireB: OrientedWire): Edge | undefined => {
  if(
    wireA.outerEnd.nodeId === wireB.outerEnd.nodeId &&
    wireA.outerEnd.handleId === wireB.outerEnd.handleId
  ) return undefined;

  const dataA = getEdgeData(wireA.edge);
  const dataB = getEdgeData(wireB.edge);
  if(!dataA || !dataB) return undefined;

  const pointsFromJointToOuterB = reversePoints(wireB.pointsFromOuterToJoint);
  const rawMergedPoints = wireA.pointsFromOuterToJoint.concat(pointsFromJointToOuterB.slice(1));
  const mergedPoints = simplifyWirePath(rawMergedPoints);
  if(mergedPoints.length<2) return undefined;

  const mergedEdge = structuredClone(wireA.edge);
  const startXY = mergedPoints[0];
  const endXY = mergedPoints[mergedPoints.length - 1];

  mergedEdge.source = wireA.outerEnd.nodeId;
  mergedEdge.sourceHandle = wireA.outerEnd.handleId;
  mergedEdge.target = wireB.outerEnd.nodeId;
  mergedEdge.targetHandle = wireB.outerEnd.handleId;
  mergedEdge.selected = false;
  mergedEdge.data = {
    ...structuredClone(dataA),
    edgePoints: mergedPoints.slice(1, -1).map((point) => ({...point, active: -1} as edgePoint)),
    startXY,
    endXY,
    physLength: mergePhysicalLength(dataA.physLength, dataB.physLength),
    correspondingInfoNodeSelected: false,
    checkHighlighted: Boolean(dataA.checkHighlighted || dataB.checkHighlighted),
    simulationHighlighted: Boolean(dataA.simulationHighlighted || dataB.simulationHighlighted),
  } as EdgeDataType;

  return mergedEdge;
};

const findWireInfoNodesForEdges = (nodes: Node[], edgeIds: Set<string>) => (
  nodes.filter((node) => (
    isComponentNode(node, 'WireInfoNode') &&
    edgeIds.has(String((node.data as ComponentDataType).wireInfoForNodeId))
  ))
);

export const getSolderJointEndpointIds = (nodes: Node[], edge: Edge | undefined) => {
  if(!edge) return [];

  return [edge.source, edge.target].filter((nodeId) => {
    const node = nodes.find((candidate) => candidate.id === nodeId);
    return Boolean(node && isComponentNode(node, 'SolderJoint'));
  });
};

export const collapseMergeableSolderJoints = ({
  nodes,
  edges,
  candidateSolderJointIds,
}: CollapseSolderJointsParams): CollapseSolderJointsResult => {
  let nextNodes = nodes;
  let nextEdges = edges;
  const collapsedSolderJointIds: string[] = [];

  for(const solderJointId of new Set(candidateSolderJointIds)) {
    if(!solderJointId) continue;

    const solderJointNode = nextNodes.find((node) => node.id === solderJointId);
    if(!solderJointNode || !isComponentNode(solderJointNode, 'SolderJoint')) continue;

    const connectedWires = nextEdges.filter((edge) => (
      isEditableWire(edge) &&
      (edge.source === solderJointId || edge.target === solderJointId)
    ));
    if(connectedWires.length!==2) continue;

    const [edgeA, edgeB] = connectedWires;
    if(!areWirePropertiesCompatible(edgeA, edgeB)) continue;

    const wireInfoNodes = findWireInfoNodesForEdges(nextNodes, new Set([edgeA.id, edgeB.id]));
    const wireInfoEdgeIds = new Set(wireInfoNodes.map((node) => String((node.data as ComponentDataType).wireInfoForNodeId)));
    if(wireInfoEdgeIds.size>1) continue;

    const wireA = getOrientedWire(edgeA, solderJointId);
    const wireB = getOrientedWire(edgeB, solderJointId);
    if(!wireA || !wireB) continue;

    const mergedEdge = buildMergedEdge(wireA, wireB);
    if(!mergedEdge) continue;

    nextEdges = nextEdges
      .filter((edge) => edge.id !== edgeA.id && edge.id !== edgeB.id)
      .concat(mergedEdge);

    nextNodes = nextNodes
      .filter((node) => node.id !== solderJointId)
      .map((node) => {
        if(!isComponentNode(node, 'WireInfoNode')) return node;
        const nodeData = node.data as ComponentDataType;
        if(nodeData.wireInfoForNodeId !== edgeA.id && nodeData.wireInfoForNodeId !== edgeB.id) return node;

        return {
          ...node,
          data: {
            ...nodeData,
            wireInfoForNodeId: mergedEdge.id,
            wireInfo_length: (mergedEdge.data as EdgeDataType).physLength,
            wireInfo_crosssection: (mergedEdge.data as EdgeDataType).physCrosssection,
            wireInfo_crosssectionUnit: (mergedEdge.data as EdgeDataType).physCrosssectionUnit,
            wireInfo_color: (mergedEdge.data as EdgeDataType).color,
            correspondingWireSelected: false,
          },
        };
      });

    collapsedSolderJointIds.push(solderJointId);
  }

  return {
    nodes: nextNodes,
    edges: nextEdges,
    collapsedSolderJointIds,
  };
};

export const collapseMergeableSolderJointsAfterWireDelete = ({
  nodes,
  edgesBeforeDelete,
  deletedEdges,
  deletedNodes = [],
}: CollapseSolderJointsAfterWireDeleteParams): CollapseSolderJointsResult => {
  const deletedEdgeIds = new Set(deletedEdges.map((edge) => edge.id));
  const deletedNodeIds = new Set(deletedNodes.map((node) => node.id));
  const deletedWireInfoNodeIds = new Set(
    findWireInfoNodesForEdges(nodes, deletedEdgeIds).map((node) => node.id),
  );
  const affectedNodeIds = new Set(
    deletedEdges.flatMap((edge) => [edge.source, edge.target]),
  );

  let nextNodes = nodes.filter((node) => (
    !deletedNodeIds.has(node.id) &&
    !deletedWireInfoNodeIds.has(node.id)
  ));
  let nextEdges = edgesBeforeDelete.filter((edge) => (
    !deletedEdgeIds.has(edge.id) &&
    !deletedNodeIds.has(edge.source) &&
    !deletedNodeIds.has(edge.target)
  ));

  return collapseMergeableSolderJoints({
    nodes: nextNodes,
    edges: nextEdges,
    candidateSolderJointIds: affectedNodeIds,
  });
};
