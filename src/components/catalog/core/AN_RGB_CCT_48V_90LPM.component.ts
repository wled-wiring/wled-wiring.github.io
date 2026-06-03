import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "AN_RGB_CCT_48V_90LPM",
    "version": 1,
    "display": {
      "name": "compData.AN_RGB_CCT_48V_90LPM.name",
      "descriptionShort": "compData.AN_RGB_CCT_48V_90LPM.descriptionShort",
      "description": "compData.AN_RGB_CCT_48V_90LPM.description",
      "group": "led",
      "showName": true
    },
    "geometry": {
      "image": {
        "url": "./AN_RGB_CCT_48V_90LPM.jpg",
        "width": 417,
        "height": 30
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
        "id": "48V_start",
        "name": "48V (+)",
        "description": "+48V supply",
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
          "toleranceMin": 40,
          "toleranceMax": 48
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
        "y": 8,
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
        "y": 13,
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
        "y": 17,
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
        "id": "WW_start",
        "name": "Warm White",
        "description": "Warm White (-)",
        "type": "source",
        "x": 2.5,
        "y": 22,
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
          "pwm_in_WW"
        ],
        "voltage": {},
        "maxCrossSectionAbsolute": 0.75,
        
        "behavior": {
          "preferredLineDirection": "left"
        }
      },
      {
        "id": "W_start",
        "name": "White",
        "description": "White (-)",
        "type": "source",
        "x": 2.5,
        "y": 27,
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
          "pwm_in_W"
        ],
        "voltage": {},
        "maxCrossSectionAbsolute": 0.75,
        
        "behavior": {
          "preferredLineDirection": "left"
        }
      },
      {
        "id": "48V_end",
        "name": "48V (+)",
        "description": "+48V supply",
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
          "toleranceMin": 40,
          "toleranceMax": 48
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
        "y": 8,
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
        "y": 13,
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
        "y": 17,
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
        "id": "WW_end",
        "name": "Warm White",
        "description": "Warm White (-)",
        "type": "source",
        "x": 2.5,
        "y": 22,
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
          "pwm_in_WW"
        ],
        "voltage": {},
        "maxCrossSectionAbsolute": 0.75,
        
        "behavior": {
          "preferredLineDirection": "right"
        }
      },
      {
        "id": "W_end",
        "name": "White",
        "description": "White (-)",
        "type": "source",
        "x": 2.5,
        "y": 27,
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
          "pwm_in_W"
        ],
        "voltage": {},
        "maxCrossSectionAbsolute": 0.75,
        
        "behavior": {
          "preferredLineDirection": "right"
        }
      },
      {
        "id": "48V_middle",
        "name": "48V (+)",
        "description": "+48V supply",
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
          "toleranceMin": 40,
          "toleranceMax": 48
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
        "y": 8,
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
        "y": 13,
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
        "y": 17,
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
      },
      {
        "id": "WW_middle",
        "name": "Warm White",
        "description": "Warm White (-)",
        "type": "source",
        "x": 0,
        "y": 22,
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
          "pwm_in_WW"
        ],
        "voltage": {},
        "maxCrossSectionAbsolute": 0.75,
        
        "behavior": {
          "repeated": true,
          "repeatAtFirst": false
        }
      },
      {
        "id": "W_middle",
        "name": "White",
        "description": "White (-)",
        "type": "source",
        "x": 0,
        "y": 27,
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
