import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "AN_WHITE_24V_240LPM",
    "version": 1,
    "display": {
      "name": "compData.AN_WHITE_24V_240LPM.name",
      "descriptionShort": "compData.AN_WHITE_24V_240LPM.descriptionShort",
      "description": "compData.AN_WHITE_24V_240LPM.description",
      "group": "led",
      "showName": true
    },
    "geometry": {
      "image": {
        "url": "./AN_WHITE_24V_240LPM.jpg",
        "width": 62,
        "height": 25
      },
      "rotation": 0,
      "rotatable": true,
      "resizableX": true,
      "borderWidth": 2,
      "nodeOrigin": [
        0.5,
        0.5
      ]
    },
    "physical": {
      "lengthStep": 0.016667
    },
    "handles": [
      {
        "id": "24V_start",
        "name": "24V pin",
        "description": "24V supply input",
        "type": "source",
        "x": 2.7,
        "y": 21.5,
        "xalign": "start",
        "yalign": "start",
        "width": 6,
        "height": 5,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "red",
          "lineWidth": 0.8,
          "radius": "30%"
        },
        "functions": [
          "suppl_in"
        ],
        "voltage": {
          "toleranceMin": 20,
          "toleranceMax": 24
        },
        "maxCrossSectionAbsolute": 0.75,
        
        "behavior": {
          "preferredLineDirection": "left"
        }
      },
      {
        "id": "W_start",
        "name": "W pin",
        "description": "W",
        "type": "source",
        "x": 2.7,
        "y": 4,
        "xalign": "start",
        "yalign": "start",
        "width": 6,
        "height": 5,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "black",
          "lineWidth": 0.8,
          "radius": "30%"
        },
        "functions": [
          "pwm_in_W"
        ],
        "voltage": {},
        "maxCrossSectionAbsolute": 0.75,
        
        "behavior": {
          "preferredLineDirection": "left"
        }
      },
      {
        "id": "24V_end",
        "name": "24V pin",
        "description": "24V supply input",
        "type": "source",
        "x": 2.7,
        "y": 21.5,
        "xalign": "end",
        "yalign": "start",
        "width": 6,
        "height": 5,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "red",
          "lineWidth": 0.8,
          "radius": "30%"
        },
        "functions": [
          "suppl_in"
        ],
        "voltage": {
          "toleranceMin": 20,
          "toleranceMax": 24
        },
        "maxCrossSectionAbsolute": 0.75,
        
        "behavior": {
          "preferredLineDirection": "right"
        }
      },
      {
        "id": "W_end",
        "name": "W pin",
        "description": "W",
        "type": "source",
        "x": 2.7,
        "y": 4,
        "xalign": "end",
        "yalign": "start",
        "width": 6,
        "height": 5,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "black",
          "lineWidth": 0.8,
          "radius": "30%"
        },
        "functions": [
          "pwm_in_W"
        ],
        "voltage": {},
        "maxCrossSectionAbsolute": 0.75,
        
        "behavior": {
          "preferredLineDirection": "right"
        }
      },
      {
        "id": "24V_middle",
        "name": "24V pin",
        "description": "24V supply input",
        "type": "source",
        "x": 0,
        "y": 21.5,
        "xalign": "start",
        "yalign": "start",
        "width": 12,
        "height": 5,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "red",
          "lineWidth": 0.8,
          "radius": "30%"
        },
        "functions": [
          "suppl_in"
        ],
        "voltage": {
          "toleranceMin": 20,
          "toleranceMax": 24
        },
        "maxCrossSectionAbsolute": 0.75,
        
        "behavior": {
          "repeated": true,
          "repeatAtFirst": false
        }
      },
      {
        "id": "W_middle",
        "name": "W pin",
        "description": "W",
        "type": "source",
        "x": 0,
        "y": 4,
        "xalign": "start",
        "yalign": "start",
        "width": 12,
        "height": 5,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "black",
          "lineWidth": 0.8,
          "radius": "30%"
        },
        "functions": [
          "pwm_in_W"
        ],
        "voltage": {},
        "maxCrossSectionAbsolute": 0.75,
        
        "behavior": {
          "repeated": true,
          "repeatAtFirst": false
        }
      }
    ]
  }
});
