import {type Node} from '@xyflow/react';
import {ComponentDataType, ImageDataType, HandleDataType, CompInputFieldsBoxType} from '../../types';

export const Resistor: Node = {
    id: '',
    type: 'general-component-type',
    position: { x: 0, y: 0 },
    origin: [0.5, 0.5],
    data: { 
        image: {url:"./Resistor.jpg", width: 74, height: 26} as ImageDataType,
        technicalID: "Resistor",
        name: "compData.Resistor.name",
        description: "compData.Resistor.descriptionShort",
        popover: {
            description: "compData.Resistor.description",
        },
        technicalVersion: 1,
        group: "electronics",
        rotation: 0,
        borderWidth: 2,
        resizableX: false,
        rotatable: true,
        inputFieldsBox: {
            x: 37,
            y: 32,
            borderType: "transparent",
            borderColor: "black",
            borderLineWidth: 0,
            borderRadius: "0%",
            backgroundColor: "transparent",
            rotate180only: true,
        } as CompInputFieldsBoxType,
        selectFields: [
            {
            technicalID: "NominalValue",
            name: "R",
            displayName: false,
            selectedValue: 100,
            unit: "Ohm",
            fieldWidth: 100,
            customImage: false,
            color: "black",
            options: [
                {"value": 1.0, "label": "1.0 Ohm"},
                {"value": 1.2, "label": "1.2 Ohm"},
                {"value": 1.5, "label": "1.5 Ohm"},
                {"value": 1.8, "label": "1.8 Ohm"},
                {"value": 2.2, "label": "2.2 Ohm"},
                {"value": 2.7, "label": "2.7 Ohm"},
                {"value": 3.3, "label": "3.3 Ohm"},
                {"value": 3.9, "label": "3.9 Ohm"},
                {"value": 4.7, "label": "4.7 Ohm"},
                {"value": 5.6, "label": "5.6 Ohm"},
                {"value": 6.8, "label": "6.8 Ohm"},
                {"value": 8.2, "label": "8.2 Ohm"},

                {"value": 10, "label": "10 Ohm"},
                {"value": 12, "label": "12 Ohm"},
                {"value": 15, "label": "15 Ohm"},
                {"value": 18, "label": "18 Ohm"},
                {"value": 22, "label": "22 Ohm"},
                {"value": 27, "label": "27 Ohm"},
                {"value": 33, "label": "33 Ohm"},
                {"value": 39, "label": "39 Ohm"},
                {"value": 47, "label": "47 Ohm"},
                {"value": 56, "label": "56 Ohm"},
                {"value": 68, "label": "68 Ohm"},
                {"value": 82, "label": "82 Ohm"},

                {"value": 100, "label": "100 Ohm"},
                {"value": 120, "label": "120 Ohm"},
                {"value": 150, "label": "150 Ohm"},
                {"value": 180, "label": "180 Ohm"},
                {"value": 220, "label": "220 Ohm"},
                {"value": 270, "label": "270 Ohm"},
                {"value": 330, "label": "330 Ohm"},
                {"value": 390, "label": "390 Ohm"},
                {"value": 470, "label": "470 Ohm"},
                {"value": 560, "label": "560 Ohm"},
                {"value": 680, "label": "680 Ohm"},
                {"value": 820, "label": "820 Ohm"},

                {"value": 1000, "label": "1.0 kOhm"},
                {"value": 1200, "label": "1.2 kOhm"},
                {"value": 1500, "label": "1.5 kOhm"},
                {"value": 1800, "label": "1.8 kOhm"},
                {"value": 2200, "label": "2.2 kOhm"},
                {"value": 2700, "label": "2.7 kOhm"},
                {"value": 3300, "label": "3.3 kOhm"},
                {"value": 3900, "label": "3.9 kOhm"},
                {"value": 4700, "label": "4.7 kOhm"},
                {"value": 5600, "label": "5.6 kOhm"},
                {"value": 6800, "label": "6.8 kOhm"},
                {"value": 8200, "label": "8.2 kOhm"},

                {"value": 10000, "label": "10 kOhm"},
                {"value": 12000, "label": "12 kOhm"},
                {"value": 15000, "label": "15 kOhm"},
                {"value": 18000, "label": "18 kOhm"},
                {"value": 22000, "label": "22 kOhm"},
                {"value": 27000, "label": "27 kOhm"},
                {"value": 33000, "label": "33 kOhm"},
                {"value": 39000, "label": "39 kOhm"},
                {"value": 47000, "label": "47 kOhm"},
                {"value": 56000, "label": "56 kOhm"},
                {"value": 68000, "label": "68 kOhm"},
                {"value": 82000, "label": "82 kOhm"},

                {"value": 100000, "label": "100 kOhm"},
                {"value": 120000, "label": "120 kOhm"},
                {"value": 150000, "label": "150 kOhm"},
                {"value": 180000, "label": "180 kOhm"},
                {"value": 220000, "label": "220 kOhm"},
                {"value": 270000, "label": "270 kOhm"},
                {"value": 330000, "label": "330 kOhm"},
                {"value": 390000, "label": "390 kOhm"},
                {"value": 470000, "label": "470 kOhm"},
                {"value": 560000, "label": "560 kOhm"},
                {"value": 680000, "label": "680 kOhm"},
                {"value": 820000, "label": "820 kOhm"},

                {"value": 1000000, "label": "1.0 MOhm"},
                {"value": 1200000, "label": "1.2 MOhm"},
                {"value": 1500000, "label": "1.5 MOhm"},
                {"value": 1800000, "label": "1.8 MOhm"},
                {"value": 2200000, "label": "2.2 MOhm"},
                {"value": 2700000, "label": "2.7 MOhm"},
                {"value": 3300000, "label": "3.3 MOhm"},
                {"value": 3900000, "label": "3.9 MOhm"},
                {"value": 4700000, "label": "4.7 MOhm"},
                {"value": 5600000, "label": "5.6 MOhm"},
                {"value": 6800000, "label": "6.8 MOhm"},
                {"value": 8200000, "label": "8.2 MOhm"},

                {"value": 10000000, "label": "10 MOhm"},
                {"value": 12000000, "label": "12 MOhm"},
                {"value": 15000000, "label": "15 MOhm"},
                {"value": 18000000, "label": "18 MOhm"},
                {"value": 22000000, "label": "22 MOhm"},
                {"value": 27000000, "label": "27 MOhm"},
                {"value": 33000000, "label": "33 MOhm"},
                {"value": 39000000, "label": "39 MOhm"},
                {"value": 47000000, "label": "47 MOhm"},
                {"value": 56000000, "label": "56 MOhm"},
                {"value": 68000000, "label": "68 MOhm"},
                {"value": 82000000, "label": "82 MOhm"},

                {"value": 100000000, "label": "100 MOhm"},
                {"value": 120000000, "label": "120 MOhm"},
                {"value": 150000000, "label": "150 MOhm"},
                {"value": 180000000, "label": "180 MOhm"},
                {"value": 220000000, "label": "220 MOhm"},
                {"value": 270000000, "label": "270 MOhm"},
                {"value": 330000000, "label": "330 MOhm"},
                {"value": 390000000, "label": "390 MOhm"},
                {"value": 470000000, "label": "470 MOhm"},
                {"value": 560000000, "label": "560 MOhm"},
                {"value": 680000000, "label": "680 MOhm"},
                {"value": 820000000, "label": "820 MOhm"}
            ],
            },
        ],
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
            postype: "left",
            tolVmax: 250,
            tolVmin: 0,
            type: "source",
            Vout: 0,
            width: 10,
            x: 5.5,
            xalign: "start",
            y: 13,
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
            postype: "right",
            tolVmax: 250,
            tolVmin: 0,
            type: "source",
            Vout: 0,
            width: 10,
            x: 69,
            xalign: "start",
            y: 13,
            yalign: "start",
            prefferedLineWidth: 1,
        } as HandleDataType,
        ]
    } as ComponentDataType,
}