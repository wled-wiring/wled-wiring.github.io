import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "WS2814_12V_30LPM",
    "version": 1,
    "display": {
      "name": "compData.WS2814_12V_30LPM.name",
      "descriptionShort": "compData.WS2814_12V_30LPM.descriptionShort",
      "description": "compData.WS2814_12V_30LPM.description",
      "group": "led",
      "showName": true
    },
    "geometry": {
      "image": {
        "url": "./WS2814_12V_30LPM.png",
        "width": 253,
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
        "id": "12V_start",
        "name": "12V pin",
        "description": "12V supply input",
        "type": "source",
        "x": 2.7,
        "y": 5.5,
        "xalign": "start",
        "yalign": "start",
        "width": 6,
        "height": 6,
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
          "toleranceMin": 10,
          "toleranceMax": 12
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
        "y": 13,
        "xalign": "start",
        "yalign": "start",
        "width": 6,
        "height": 6,
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
        "y": 20,
        "xalign": "start",
        "yalign": "start",
        "width": 6,
        "height": 4,
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
        "id": "12V_end",
        "name": "12V pin",
        "description": "12V supply input",
        "type": "source",
        "x": 2.7,
        "y": 5.5,
        "xalign": "end",
        "yalign": "start",
        "width": 6,
        "height": 6,
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
          "toleranceMin": 10,
          "toleranceMax": 12
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
        "y": 13,
        "xalign": "end",
        "yalign": "start",
        "width": 6,
        "height": 6,
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
        "y": 20,
        "xalign": "end",
        "yalign": "start",
        "width": 6,
        "height": 4,
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
        "id": "12V_middle",
        "name": "12V pin",
        "description": "12V supply input",
        "type": "source",
        "x": 0,
        "y": 5.5,
        "xalign": "start",
        "yalign": "start",
        "width": 10,
        "height": 6,
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
          "toleranceMin": 10,
          "toleranceMax": 12
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
        "y": 13,
        "xalign": "start",
        "yalign": "start",
        "width": 10,
        "height": 6,
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
        "y": 20,
        "xalign": "start",
        "yalign": "start",
        "width": 10,
        "height": 6,
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
            "supplyIn": "12V_start",
            "supplyOut": "12V_end",
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
            "ledType": "WS2814_12V",
            "ledsPerMeter": 30,
            "physLedsPerLogicLed": 3,
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
            "typical_5mm",
            "good_5mm",
            "poor_5mm"
          ],
          "recommended": "typical_5mm"
        },
        "gndResistance": {
          "options": [
            "typical_5mm",
            "good_5mm",
            "poor_5mm"
          ],
          "recommended": "typical_5mm"
        },
        "currentCurve": {
          "options": [
            "ws2814_12v_typical"
          ],
          "recommended": "ws2814_12v_typical"
        }
      },
      "ledSimulationOptionValues": {
        "supplyResistance": "typical_5mm",
        "gndResistance": "typical_5mm",
        "currentCurve": "ws2814_12v_typical"
      }
    }
  }
});
