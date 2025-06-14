import {type Node} from '@xyflow/react';
import {ComponentDataType, ImageDataType, HandleDataType, CompInputFieldDataType, CompInputFieldsBoxType} from '../../types';

export const PSU_USB: Node = {
    id: '',
    type: 'general-component-type',
    position: { x: 0, y: 0 },
    origin: [0.5, 0.5],
    data: { 
        image: {url:"./PSU_USB.png", width: 200, height: 99} as ImageDataType,
        technicalID: "PSU_USB",
        name: "compData.PSU_USB.name",
        description: "compData.PSU_USB.descriptionShort",
        popover: {
            description: "compData.PSU_USB.description",
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
            borderColor: "#8c8c8c",
            borderLineWidth: 2,
            borderRadius: "5%",
            borderType: "dotted",
            description: "USB (GND, 5V)",
            functions: [
                "usb_power_out"
            ],
            height: 32,
            hid: "usb",
            name: "USB",
            position: "left",
            postype: "right",
            tolVmax: 5,
            tolVmin: 0,
            type: "source",
            Vout: 5,
            width: 8,
            x: 197,
            xalign: "start",
            y: 49.5,
            yalign: "start",
            prefferedLineWidth: 5,
        } as HandleDataType,
        ]
    } as ComponentDataType,
}