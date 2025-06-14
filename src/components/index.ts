import { type NodeTypes, type Node } from '@xyflow/react';

import { GeneralComponent } from './GeneralComponent';
//import { ComponentList } from './ComponentList';

function TEST_BuildInitialNodes() {
  const nodes=[] as Node[];
  return nodes;
}

export const initialNodes: Node[] = TEST_BuildInitialNodes();

export const nodeTypes = {
  'general-component-type': GeneralComponent,
  // Add any of your custom nodes here!
} satisfies NodeTypes;
