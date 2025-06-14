import {type Node} from '@xyflow/react';
import {ComponentDataType, ImageDataType} from '../../types';

export const Router: Node = {
    id: '',
    type: 'general-component-type',
    position: { x: 0, y: 0 },
    origin: [0.5, 0.5],
    data: { 
        image: {url:"./Router.png", width: 200, height: 132} as ImageDataType,
        technicalID: "Router",
        name: "compData.Router.name",
        description: "compData.Router.descriptionShort",
        popover: {
            description: "compData.Router.description",
        },
        technicalVersion: 1,
        group: "others",
        rotation: 0,
        borderWidth: 2,
        resizableX: false,
        rotatable: true,
        handles: [
        {
            "borderColor": "#8c8c8c",
            "borderLineWidth": 2,
            "borderRadius": "5%",
            "borderType": "dotted",
            "description": "Ethernet (LAN)",
            "functions": [
                "eth"
            ],
            "height":30,
            "hid": "ETH",
            "name": "Ethernet",
            "position": "left",
            "postype": "right",
            "tolVmax": 0,
            "tolVmin": 0,
            "type": "source",
            "Vout": 0,
            "width": 16,
            "x": 192,
            "xalign": "start",
            "y": 100.5,
            "yalign": "start",
            prefferedLineWidth: 5,
        },
        ]
    } as ComponentDataType,
}