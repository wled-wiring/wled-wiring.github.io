import {type Node} from '@xyflow/react';
import {ComponentDataType, ImageDataType } from '../../types';

export const LineBoxNode: Node = {
    id: '',
    type: 'general-component-type',
    position: { x: 0, y: 0 },
    origin: [0.5, 0.5],
    data: { 
        image: {url:"./LineBox.jpg", width: 100, height: 10} as ImageDataType,
        technicalID: "LineBoxNode",
        name: "compData.LineBoxNode.name",
        description: "compData.LineBoxNode.descriptionShort",
        popover: {
            description: "compData.LineBoxNode.description",
        },
        technicalVersion: 1,
        group: "others",
        rotation: 0,
        rotatable: false,
        borderWidth: 2,
        resizableX: false,
        noBackgroundImage: true,
        applyNodeResizer: true,
        putToBackground: true,
        changableColor: true,
        onlyBorder: false,
        color: "#000000",
        handles: [
        ]
    } as ComponentDataType,
}