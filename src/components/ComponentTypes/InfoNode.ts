import {type Node} from '@xyflow/react';
import {ComponentDataType, ImageDataType } from '../../types';

export const InfoNode: Node = {
    id: '',
    type: 'general-component-type',
    position: { x: 0, y: 0 },
    origin: [0.5, 0.5],
    data: { 
        image: {url:"./Info.jpg", width: 100, height: 50} as ImageDataType,
        technicalID: "InfoNode",
        name: "compData.InfoNode.name",
        description: "compData.InfoNode.descriptionShort",
        popover: {
            description: "compData.InfoNode.description",
        },
        technicalVersion: 1,
        group: "others",
        changableTextColor: true,
        textColor: "#000000",
        rotation: 0,
        rotatable: false,
        borderWidth: 0,
        resizableX: false,
        noBackgroundImage: true,
        infoText: "",
        infoTextSize: 12,
        //applyNodeResizer: true,
        handles: [
        ]
    } as ComponentDataType,
}