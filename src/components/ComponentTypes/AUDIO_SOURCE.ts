import {type Node} from '@xyflow/react';
import {ComponentDataType, ImageDataType} from '../../types';

export const AUDIO_SOURCE: Node = {
    id: '',
    type: 'general-component-type',
    position: { x: 0, y: 0 },
    origin: [0.5, 0.5],
    data: { 
        image: {url:"./Audio_source.png", width: 200, height: 111} as ImageDataType,
        technicalID: "AUDIO_SOURCE",
        name: "compData.AUDIO_SOURCE.name",
        description: "compData.AUDIO_SOURCE.descriptionShort",
        popover: {
            description: "compData.AUDIO_SOURCE.description",
            buyLinks: [
            ]
        },
        technicalVersion: 1,
        group: "others",
        rotation: 0,
        borderWidth: 2,
        resizableX: false,
        rotatable: true,
        handles: [
        {
            "borderColor": "blue",
            "borderLineWidth": 2,
            "borderRadius": "5%",
            "borderType": "dotted",
            "description": "Audio output",
            "functions": [
                "audio_out"
            ],
            "height":16,
            "hid": "AUDIO",
            "name": "Line-Out",
            "position": "left",
            "postype": "right",
            "tolVmax": 0,
            "tolVmin": 0,
            "type": "source",
            "Vout": 0,
            "width": 12,
            "x": 193.5,
            "xalign": "start",
            "y": 78,
            "yalign": "start",
            prefferedLineWidth: 3,
        },
        ]
    } as ComponentDataType,
}