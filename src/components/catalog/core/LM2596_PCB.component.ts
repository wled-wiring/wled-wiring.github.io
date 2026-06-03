import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "LM2596_PCB",
    "version": 1,
    "display": {
      "name": "compData.LM2596_PCB.name",
      "descriptionShort": "compData.LM2596_PCB.descriptionShort",
      "description": "compData.LM2596_PCB.description",
      "group": "electronics"
    },
    "geometry": {
      "image": {
        "url": "./LM2596_PCB.jpg",
        "width": 170,
        "height": 81
      },
      "rotation": 0,
      "rotatable": true,
      "resizableX": false,
      "borderWidth": 2
    },
    "handles": [
      {
        "id": "IN",
        "name": "Input +",
        "description": "Input positive (0-38 V)",
        "type": "source",
        "x": 6,
        "y": 6,
        "xalign": "start",
        "yalign": "start",
        "width": 12,
        "height": 12,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "red",
          "lineWidth": 1,
          "radius": "20%"
        },
        "functions": [
          "suppl_in"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 40
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "preferredLineWidth": 3,
          "preferredLineDirection": "left"
        }
      },
      {
        "id": "GND1",
        "name": "GND",
        "description": "GND",
        "type": "source",
        "x": 6,
        "y": 75,
        "xalign": "start",
        "yalign": "start",
        "width": 12,
        "height": 12,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "black",
          "lineWidth": 1,
          "radius": "20%"
        },
        "functions": [
          "gnd"
        ],
        "relatedToHandle": ["IN"],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 0
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "preferredLineWidth": 3,
          "preferredLineDirection": "left"
        }
      },
      {
        "id": "OUT",
        "name": "Output +",
        "description": "Adjustable output",
        "type": "source",
        "x": 163,
        "y": 6,
        "xalign": "start",
        "yalign": "start",
        "width": 12,
        "height": 12,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "red",
          "lineWidth": 1,
          "radius": "20%"
        },
        "functions": [
          "suppl_out"
        ],
        "voltage": {
          "outDependency": "source_voltage",
          "toleranceMin": 0,
          "toleranceMax": 40
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "preferredLineWidth": 3,
          "preferredLineDirection": "right"
        }
      },
      {
        "id": "GND2",
        "name": "GND",
        "description": "GND",
        "type": "source",
        "x": 163,
        "y": 75,
        "xalign": "start",
        "yalign": "start",
        "width": 12,
        "height": 12,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "black",
          "lineWidth": 1,
          "radius": "20%"
        },
        "functions": [
          "gnd"
        ],
        "relatedToHandle": ["OUT"],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 0
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "preferredLineWidth": 3,
          "preferredLineDirection": "right"
        }
      }
    ],
    "fields": [
      {
        "id": "source_voltage",
        "type": "number",
        "name": "Vout",
        "value": 5,
        "min": 1,
        "max": 37,
        "step": 0.1,
        "unit": "V",
        "ui": {
          "color": "black",
          "fieldWidth": 70
        }
      },
      {
        "id": "source_current",
        "type": "number",
        "name": "Imax",
        "value": 1.5,
        "min": 0.1,
        "max": 5,
        "step": 0.1,
        "unit": "A",
        "ui": {
          "color": "black",
          "fieldWidth": 70
        }
      }
    ],
    "simulation": {
      "version": 1,
      "elements": [
        {
          "id": "dcdc",
          "type": "dcdcConverter",
          "terminals": {
            "inPositive": "IN",
            "inNegative": "GND1",
            "outPositive": "OUT",
            "outNegative": "GND2"
          },
          "parameters": {
            "outputVoltageV": {
              "field": "source_voltage"
            },
            "currentLimitA": {
              "field": "source_current"
            },
            "efficiency": 0.9,
            "voltageDropPctAt150Current": 50
          }
        },
        {
          "id": "gnd-bridge",
          "type": "shortBridge",
          "terminals": {
            "a": "GND1",
            "b": "GND2"
          }
        }
      ]
    },
    "runtime": {
      "inputFieldsBox": {
        "x": 85,
        "y": 93,
        "borderType": "solid",
        "borderColor": "black",
        "borderLineWidth": 0,
        "borderRadius": "0%",
        "backgroundColor": "transparent",
        "rotate180only": true
      }
    }
  }
});
