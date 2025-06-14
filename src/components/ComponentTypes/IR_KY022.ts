import {type Node} from '@xyflow/react';
import {ComponentDataType, ImageDataType, HandleDataType} from '../../types';

export const IR_KY022: Node = {
    id: '',
    type: 'general-component-type',
    position: { x: 0, y: 0 },

    data: { 
        image: {url:"./IR_KY022.png", width: 106, height: 62} as ImageDataType,
        technicalID: "IR_KY022",
        name: "compData.IR_KY022.name",
        description: "compData.IR_KY022.descriptionShort",
        popover: {
            description: "compData.IR_KY022.description",
        },
        technicalVersion: 1,
        group: "electronics",
        rotation: 0,
        borderWidth: 2,
        resizableX: false,
        rotatable: true,
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
                height: 6,
                hid: "GND",
                name: "GND",
                position: "left",
                postype: "left",
                tolVmax: 0,
                tolVmin: 0,
                type: "source",
                Vout: 0,
                width: 10,
                x: 5,
                xalign: "start",
                y: 28,
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
                height: 6,
                hid: "3V3",
                name: "+3.3 V",
                position: "left",
                postype: "left",
                tolVmax: 3.6,
                tolVmin: 0,
                type: "source",
                Vout: 0,
                width: 10,
                x: 5,
                xalign: "start",
                y: 38.4,
                yalign: "start",
                prefferedLineWidth: 1,
            } as HandleDataType,
            {
                borderColor: "green",
                borderLineWidth: 0.8,
                borderRadius: "20%",
                borderType: "dotted",
                description: "Output",
                functions: [
                    "dig_out"
                ],
                height: 6,
                hid: "OUT",
                name: "OUT",
                position: "left",
                postype: "left",
                tolVmax: 5,
                tolVmin: 0,
                type: "source",
                Vout: 3.3,
                width: 10,
                x: 5,
                xalign: "start",
                y: 49.2,
                yalign: "start",
                prefferedLineWidth: 1,
            } as HandleDataType,

        ]
    } as ComponentDataType,
}