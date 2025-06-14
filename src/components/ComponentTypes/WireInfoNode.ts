import {type Node} from '@xyflow/react';
import {ComponentDataType, ImageDataType } from '../../types';

export const WireInfoNode: Node = {
    id: '',
    type: 'general-component-type',
    position: { x: 0, y: 0 },
    origin: [0.5, 0.5],
    data: { 
        image: {url:"./WireInfo.jpg", width: 100, height: 50} as ImageDataType,
        technicalID: "WireInfoNode",
        name: "compData.WireInfoNode.name",
        description: "compData.WireInfoNode.descriptionShort",
        popover: {
            description: "compData.WireInfoNode.description",
        },
        technicalVersion: 1,
        group: "special",
        rotation: 0,
        rotatable: false,
        borderWidth: 2,
        resizableX: false,
        noBackgroundImage: true,
        wireInfoForNodeId: "",
        correspondingWireSelected: false,
        handles: [
        ]
    } as ComponentDataType,
}