import {type Node} from '@xyflow/react';
import {ComponentDataType, ImageDataType } from '../../types';

export const SolderJoint: Node = {
    id: '',
    type: 'general-component-type',
    position: { x: 0, y: 0 },
    origin: [0.5, 0.5],
    data: { 
        name: "compData.SolderJoint.name",
        description: "compData.SolderJoint.descriptionShort",
        popover: {
            description: "compData.SolderJoint.description",
        },
        technicalID: "SolderJoint",
        technicalVersion: 1,
        group: "others",
        image: {url:"./SolderJoint.jpg", width: 16, height: 16} as ImageDataType,
        noBackgroundImage: true,
        rotation: 0,
        resizableX: false,
        rotatable: false,
        borderWidth: 2,
        handles: [
        {
            hid: "hid1",
            type: "source",
            x: 8,
            y: 8,
            xalign: "start",
            yalign: "start",
            width: 8,
            height: 8,
            borderType: "solid",
            borderColor: "rgb(0,0,0)",
            borderLineWidth: 2,
            borderRadius: "50%",
            postype: "centered",
            position: "left",
            name: "Solder joint pin",
            changeColorAutomatically: true,
        },
        ]
    } as ComponentDataType,
}

