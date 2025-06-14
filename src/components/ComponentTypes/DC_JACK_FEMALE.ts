import {type Node} from '@xyflow/react';
import {ComponentDataType, ImageDataType, HandleDataType} from '../../types';

export const DC_JACK_FEMALE: Node = {
    id: '',
    type: 'general-component-type',
    position: { x: 0, y: 0 },

    data: { 
        image: {url:"./DC_Jack_Female.png", width: 90, height: 35} as ImageDataType,
        technicalID: "DC_JACK_FEMALE",
        name: "compData.DC_JACK_FEMALE.name",
        description: "compData.DC_JACK_FEMALE.descriptionShort",
        technicalVersion: 1,
        group: "electronics",
        rotation: 0,
        borderWidth: 2,
        resizableX: false,
        rotatable: true,
        popover: {
            description: "compData.DC_JACK_FEMALE.description",
            buyLinks: [
            ]
        },
        handles: [
            {
                borderColor: "black",
                borderLineWidth: 0.8,
                borderRadius: "20%",
                borderType: "dotted",
                description: "GND",
                functions: [
                    "gnd"
                ],
                height: 10,
                hid: "GND",
                name: "GND",
                position: "left",
                postype: "right",
                tolVmax: 0,
                tolVmin: 0,
                type: "source",
                Vout: 0,
                width: 12,
                x: 84,
                xalign: "start",
                y: 12,
                yalign: "start",
                prefferedLineWidth: 1,
            } as HandleDataType,
            {
                borderColor: "red",
                borderLineWidth: 0.8,
                borderRadius: "20%",
                borderType: "dotted",
                description: "Supply voltage",
                functions: [
                    "suppl_in"
                ],
                height: 10,
                hid: "3V3",
                name: "+3.3 V",
                position: "left",
                postype: "right",
                tolVmax: 3.6,
                tolVmin: 0,
                type: "source",
                Vout: 0,
                width: 12,
                x: 84,
                xalign: "start",
                y: 24.5,
                yalign: "start",
                prefferedLineWidth: 1,
            } as HandleDataType,
        ]
    } as ComponentDataType,
}