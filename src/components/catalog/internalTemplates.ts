import { createReactFlowTemplate, normalizeComponentPackage } from './normalizeComponent';
import { defineComponent } from './defineComponent';

const wireInfoNodePackage = defineComponent({
  schemaVersion: 1,
  source: {type: 'core'},
  component: {
    id: 'WireInfoNode',
    version: 1,
    display: {
      name: 'compData.WireInfoNode.name',
      descriptionShort: 'compData.WireInfoNode.descriptionShort',
      description: 'compData.WireInfoNode.description',
      group: 'special',
    },
    geometry: {
      image: {url: './WireInfo.jpg', width: 100, height: 50},
      nodeOrigin: [0.5, 0.5],
      noBackgroundImage: true,
      rotation: 0,
      rotatable: false,
      resizableX: false,
      borderWidth: 2,
    },
    handles: [],
    runtime: {
      wireInfoForNodeId: '',
      correspondingWireSelected: false,
    },
  },
});

export const WireInfoNode = createReactFlowTemplate(normalizeComponentPackage(wireInfoNodePackage));
