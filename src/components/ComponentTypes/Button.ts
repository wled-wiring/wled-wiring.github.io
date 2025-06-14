import {type Node} from '@xyflow/react';
import {ComponentDataType, ImageDataType, HandleDataType} from '../../types';

export const Button: Node = {
    id: '',
    type: 'general-component-type',
    position: { x: 0, y: 0 },
    origin: [0.5, 0.5],
    data: { 
        image: {url:"./Button.jpg", width: 80, height: 29} as ImageDataType,
        technicalID: "Button",
        name: "compData.Button.name",
        description: "compData.Button.descriptionShort",
        technicalVersion: 1,
        group: "electronics",
        rotation: 0,
        borderWidth: 2,
        resizableX: false,
        rotatable: true,
        popover: {
            description: "compData.Button.description",
            buyLinks: [
            ]
        },
        handles: [
        {
            borderColor: "green",
            borderLineWidth: 0.8,
            borderRadius: "30%",
            borderType: "dotted",
            description: "Terminal 1",
            functions: [
                "dig_in"
            ],
            height: 4,
            hid: "1",
            name: "1",
            position: "left",
            postype: "centered",
            tolVmax: 250,
            tolVmin: 0,
            type: "source",
            Vout: 0,
            width: 10,
            x: 5.5,
            xalign: "start",
            y: 27,
            yalign: "start",
            prefferedLineWidth: 1,
        } as HandleDataType,
        {
            borderColor: "green",
            borderLineWidth: 0.8,
            borderRadius: "30%",
            borderType: "dotted",
            description: "Terminal 2",
            functions: [
                "dig_in"
            ],
            height: 4,
            hid: "2",
            name: "2",
            position: "left",
            postype: "centered",
            tolVmax: 250,
            tolVmin: 0,
            type: "source",
            Vout: 0,
            width: 10,
            x: 75,
            xalign: "start",
            y: 27,
            yalign: "start",
            prefferedLineWidth: 1,
        } as HandleDataType,
        ]
    } as ComponentDataType,
}