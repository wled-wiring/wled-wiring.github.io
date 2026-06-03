import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "AN_RGB_24V_120LPM",
    "version": 1,
    "display": {
      "name": "compData.AN_RGB_24V_120LPM.name",
      "descriptionShort": "compData.AN_RGB_24V_120LPM.descriptionShort",
      "description": "compData.AN_RGB_24V_120LPM.description",
      "group": "led",
      "showName": true
    },
    "geometry": {
      "image": {
        "url": "./AN_RGB_24V_120LPM.jpg",
        "width": 125,
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
        "name": "24V (+)",
        "description": "+24V supply",
        "type": "source",
        "x": 2.5,
        "y": 3,
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
        "id": "R_start",
        "name": "RED",
        "description": "RED (-)",
        "type": "source",
        "x": 2.5,
        "y": 9,
        "xalign": "start",
        "yalign": "start",
        "width": 6,
        "height": 5,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "30%"
        },
        "functions": [
          "pwm_in_R"
        ],
        "voltage": {},
        "maxCrossSectionAbsolute": 0.75,
        "behavior": {
          "preferredLineDirection": "left"
        }
      },
      {
        "id": "G_start",
        "name": "GREEN",
        "description": "GREEN (-)",
        "type": "source",
        "x": 2.5,
        "y": 15,
        "xalign": "start",
        "yalign": "start",
        "width": 6,
        "height": 5,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "30%"
        },
        "functions": [
          "pwm_in_G"
        ],
        "voltage": {},
        "maxCrossSectionAbsolute": 0.75,
        "behavior": {
          "preferredLineDirection": "left"
        }
      },
      {
        "id": "B_start",
        "name": "BLUE",
        "description": "BLUE (-)",
        "type": "source",
        "x": 2.5,
        "y": 21,
        "xalign": "start",
        "yalign": "start",
        "width": 6,
        "height": 5,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "30%"
        },
        "functions": [
          "pwm_in_B"
        ],
        "voltage": {},
        "maxCrossSectionAbsolute": 0.75,
        "behavior": {
          "preferredLineDirection": "left"
        }
      },
      {
        "id": "24V_end",
        "name": "24V (+)",
        "description": "+24V supply",
        "type": "source",
        "x": 2.5,
        "y": 3,
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
        "id": "R_end",
        "name": "RED",
        "description": "RED (-)",
        "type": "source",
        "x": 2.5,
        "y": 9,
        "xalign": "end",
        "yalign": "start",
        "width": 6,
        "height": 5,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "30%"
        },
        "functions": [
          "pwm_in_R"
        ],
        "voltage": {},
        "maxCrossSectionAbsolute": 0.75,
        "behavior": {
          "preferredLineDirection": "right"
        }
      },
      {
        "id": "G_end",
        "name": "GREEN",
        "description": "GREEN (-)",
        "type": "source",
        "x": 2.5,
        "y": 15,
        "xalign": "end",
        "yalign": "start",
        "width": 6,
        "height": 5,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "30%"
        },
        "functions": [
          "pwm_in_G"
        ],
        "voltage": {},
        "maxCrossSectionAbsolute": 0.75,
        "behavior": {
          "preferredLineDirection": "right"
        }
      },
      {
        "id": "B_end",
        "name": "BLUE",
        "description": "BLUE (-)",
        "type": "source",
        "x": 2.5,
        "y": 21,
        "xalign": "end",
        "yalign": "start",
        "width": 6,
        "height": 5,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "30%"
        },
        "functions": [
          "pwm_in_B"
        ],
        "voltage": {},
        "maxCrossSectionAbsolute": 0.75,
        "behavior": {
          "preferredLineDirection": "right"
        }
      },
      {
        "id": "24V_middle",
        "name": "24V (+)",
        "description": "+24V supply",
        "type": "source",
        "x": 0,
        "y": 3,
        "xalign": "start",
        "yalign": "start",
        "width": 10,
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
        "id": "R_middle",
        "name": "RED",
        "description": "RED (-)",
        "type": "source",
        "x": 0,
        "y": 9,
        "xalign": "start",
        "yalign": "start",
        "width": 10,
        "height": 5,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "30%"
        },
        "functions": [
          "pwm_in_R"
        ],
        "voltage": {},
        "maxCrossSectionAbsolute": 0.75,
        "behavior": {
          "repeated": true,
          "repeatAtFirst": false
        }
      },
      {
        "id": "G_middle",
        "name": "GREEN",
        "description": "GREEN (-)",
        "type": "source",
        "x": 0,
        "y": 15,
        "xalign": "start",
        "yalign": "start",
        "width": 6,
        "height": 5,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "30%"
        },
        "functions": [
          "pwm_in_G"
        ],
        "voltage": {},
        "maxCrossSectionAbsolute": 0.75,
        "behavior": {
          "repeated": true,
          "repeatAtFirst": false
        }
      },
      {
        "id": "B_middle",
        "name": "BLUE",
        "description": "BLUE (-)",
        "type": "source",
        "x": 0,
        "y": 21,
        "xalign": "start",
        "yalign": "start",
        "width": 6,
        "height": 5,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "30%"
        },
        "functions": [
          "pwm_in_B"
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
