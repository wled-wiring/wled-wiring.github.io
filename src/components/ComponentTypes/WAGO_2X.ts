import {type Node} from '@xyflow/react';
import {ComponentDataType, ImageDataType, HandleDataType} from '../../types';

export const WAGO_2X: Node = {
    id: '',
    type: 'general-component-type',
    position: { x: 0, y: 0 },

    data: { 
        image: {url:"./WAGO_2X.jpg", width: 40, height: 56} as ImageDataType,
        technicalID: "WAGO_2X",
        name: "compData.WAGO_2X.name",
        description: "compData.WAGO_2X.descriptionShort",
        popover: {
            description: "compData.WAGO_2X.description",
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
                description: "Terminal 1",
                functions: [
                    "suppl_conn", "general_conn"
                ],
                height: 10,
                hid: "1",
                name: "Terminal 1",
                position: "left",
                postype: "bottom",
                tolVmax: 0,
                tolVmin: 0,
                type: "source",
                Vout: 0,
                width: 12,
                x: 11,
                xalign: "start",
                y: 51,
                yalign: "start",
                prefferedLineWidth: 1,
            } as HandleDataType,
            {
                borderColor: "black",
                borderLineWidth: 0.8,
                borderRadius: "20%",
                borderType: "dotted",
                description: "Terminal 2",
                functions: [
                    "suppl_conn", "general_conn"
                ],
                height: 10,
                hid: "2",
                name: "Terminal 2",
                position: "left",
                postype: "bottom",
                tolVmax: 0,
                tolVmin: 0,
                type: "source",
                Vout: 0,
                width: 12,
                x: 29,
                xalign: "start",
                y: 51,
                yalign: "start",
                prefferedLineWidth: 1,
            } as HandleDataType,
           
        ]
    } as ComponentDataType,
}