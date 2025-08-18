import {type Node} from '@xyflow/react';
import {ComponentDataType, ImageDataType, HandleDataType, CompInputFieldDataType, CompInputFieldsBoxType} from '../../types';

export const PSU_USB_WIRES: Node = {
    id: '',
    type: 'general-component-type',
    position: { x: 0, y: 0 },
    origin: [0.5, 0.5],
    data: { 
        image: {url:"./PSU_USB_WIRES.png", width: 237, height: 99} as ImageDataType,
        technicalID: "PSU_USB_WIRES",
        name: "compData.PSU_USB_WIRES.name",
        description: "compData.PSU_USB_WIRES.descriptionShort",
        popover: {
            description: "compData.PSU_USB_WIRES.description",
        },
        technicalVersion: 1,
        group: "psu",
        rotation: 0,
        borderWidth: 2,
        resizableX: false,
        rotatable: true,
        inputFieldsBox: {
            x: 104,
            y: 24,
            borderType: "solid",
            borderColor: "black",
            borderLineWidth: 0,
            borderRadius: "0%",
            backgroundColor: "transparent",
        } as CompInputFieldsBoxType,
        inputFields: [
            {
                technicalID: "source_current",
                type: "number_input",
                name: "Iout",
                value: 3,
                min: 0,
                max: 5,
                step: 0.1,
                unit: "A",
                fieldWidth: 70,
                color: "#757575"
            } as CompInputFieldDataType,
        ],
        handles: [
        {
            borderColor: "red",
            borderLineWidth: 1,
            borderRadius: "5%",
            borderType: "dotted",
            description: "+5V supply output",
            functions: [
                "suppl_out"
            ],
            height: 8,
            hid: "VOUT",
            name: "5V out",
            position: "left",
            postype: "right",
            tolVmax: 5,
            tolVmin: 0,
            type: "source",
            Vout: 5,
            width: 12,
            x: 232,
            xalign: "start",
            y: 46,
            yalign: "start",
            prefferedLineWidth: 2,
        } as HandleDataType,
        {
            borderColor: "black",
            borderLineWidth: 1,
            borderRadius: "5%",
            borderType: "dotted",
            description: "GND (output)",
            functions: [
                "gnd"
            ],
            height: 8,
            hid: "GND",
            name: "GND",
            position: "left",
            postype: "right",
            tolVmax: 0,
            tolVmin: 0,
            type: "source",
            Vout: 0,
            width: 12,
            x: 232,
            xalign: "start",
            y: 54,
            yalign: "start",
            prefferedLineWidth: 2,
        } as HandleDataType,
        ]
    } as ComponentDataType,
}