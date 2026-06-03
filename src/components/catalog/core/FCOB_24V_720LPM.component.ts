import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "FCOB_24V_720LPM",
    "version": 1,
    "display": {
      "name": "compData.FCOB_24V_720LPM.name",
      "descriptionShort": "compData.FCOB_24V_720LPM.descriptionShort",
      "description": "compData.FCOB_24V_720LPM.description",
      "group": "led",
      "showName": true
    },
    "geometry": {
      "image": {
        "url": "./FCOB_24V_720LPM.jpg",
        "width": 107,
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
        "y": 2,
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
        "Imax": 10,
        "maxCrossSectionAbsolute": 0.75,
        
        "behavior": {
          "preferredLineDirection": "left"
        }
      },
      {
        "id": "DATA_start",
        "name": "DATA input",
        "description": "",
        "type": "source",
        "x": 2.7,
        "y": 19,
        "xalign": "start",
        "yalign": "start",
        "width": 6,
        "height": 4,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "30%"
        },
        "functions": [
          "dig_in"
        ],
        "voltage": {
          "toleranceMin": 4.5,
          "toleranceMax": 5.2
        },
        "maxCrossSectionAbsolute": 0.75,
        
        "behavior": {
          "mustBeConnected": true,
          "preferredLineDirection": "left"
        }
      },
      {
        "id": "GND_start",
        "name": "GND pin",
        "description": "",
        "type": "source",
        "x": 2.7,
        "y": 22.8,
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
          "gnd"
        ],
        "voltage": {},
        "Imax": 10,
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
        "y": 2,
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
        "Imax": 10,
        "maxCrossSectionAbsolute": 0.75,
        
        "behavior": {
          "preferredLineDirection": "right"
        }
      },
      {
        "id": "DATA_end",
        "name": "DATA output",
        "description": "",
        "type": "source",
        "x": 2.7,
        "y": 19,
        "xalign": "end",
        "yalign": "start",
        "width": 6,
        "height": 4,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "30%"
        },
        "functions": [
          "dig_out"
        ],
        "voltage": {
          "out": 5,
          "toleranceMin": 4.5,
          "toleranceMax": 5.2
        },
        "maxCrossSectionAbsolute": 0.75,
        
        "behavior": {
          "preferredLineDirection": "right"
        }
      },
      {
        "id": "GND_end",
        "name": "GND pin",
        "description": "",
        "type": "source",
        "x": 2.7,
        "y": 22.8,
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
          "gnd"
        ],
        "voltage": {},
        "Imax": 10,
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
        "y": 2,
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
        "Imax": 10,
        "maxCrossSectionAbsolute": 0.75,
        
        "behavior": {
          "repeated": true,
          "repeatAtFirst": false
        }
      },
      {
        "id": "DATA_middle",
        "name": "DATA",
        "description": "",
        "type": "source",
        "x": 0,
        "y": 19,
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
          "not_connected"
        ],
        "voltage": {
          "toleranceMin": 4.5,
          "toleranceMax": 5.2
        },
        "maxCrossSectionAbsolute": 0.75,
        
        "behavior": {
          "repeated": true,
          "repeatAtFirst": false
        }
      },
      {
        "id": "GND_middle",
        "name": "GND pin",
        "description": "GND",
        "type": "source",
        "x": 0,
        "y": 22.4,
        "xalign": "start",
        "yalign": "start",
        "width": 10,
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
          "gnd"
        ],
        "voltage": {},
        "Imax": 10,
        "maxCrossSectionAbsolute": 0.75,
        
        "behavior": {
          "repeated": true,
          "repeatAtFirst": false
        }
      }
    ],
    "simulation": {
      "version": 1,
      "elements": [
        {
          "id": "strip-led",
          "type": "digitalLed",
          "terminals": {
            "supplyIn": "24V_start",
            "supplyOut": "24V_end",
            "gndIn": "GND_start",
            "gndOut": "GND_end"
          },
          "parameters": {
            "supplyResistanceOhm": {
              "ledSimulationOption": "supplyResistance"
            },
            "gndResistanceOhm": {
              "ledSimulationOption": "gndResistance"
            },
            "ledType": "FCOB_24V_RGB",
            "ledsPerMeter": 240,
            "physLedsPerLogicLed": 12,
            "currentCurve": {
              "ledSimulationOption": "currentCurve"
            }
          }
        }
      ]
    },
    "runtime": {
      "ledSimulationOptions": {
        "supplyResistance": {
          "options": [
            "narrow_fcob_path_good",
            "narrow_fcob_path_typical",
            "narrow_fcob_path_bad",
            "bright_fcob_path_good",
            "bright_fcob_path_typical",
            "bright_fcob_path_bad"
          ],
          "recommended": "bright_fcob_path_typical"
        },
        "gndResistance": {
          "options": [
            "narrow_fcob_path_good",
            "narrow_fcob_path_typical",
            "narrow_fcob_path_bad",
            "bright_fcob_path_good",
            "bright_fcob_path_typical",
            "bright_fcob_path_bad"
          ],
          "recommended": "narrow_fcob_path_typical"
        },
        "currentCurve": {
          "options": [
            "ws28xx_fcob_rgb_24v_720lpm_typical"
          ],
          "recommended": "ws28xx_fcob_rgb_24v_720lpm_typical"
        }
      },
      "ledSimulationOptionValues": {
        "supplyResistance": "bright_fcob_path_typical",
        "gndResistance": "narrow_fcob_path_typical",
        "currentCurve": "ws28xx_fcob_rgb_24v_720lpm_typical"
      }
    }
  }
});
