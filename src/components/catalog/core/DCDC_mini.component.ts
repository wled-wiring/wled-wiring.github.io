import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "DCDC_mini",
    "version": 1,
    "display": {
      "name": "compData.DCDC_mini.name",
      "descriptionShort": "compData.DCDC_mini.descriptionShort",
      "description": "compData.DCDC_mini.description",
      "group": "electronics",
      "buyLinks": []
    },
    "geometry": {
      "image": {
        "url": "./DCDC_mini.jpg",
        "width": 57,
        "height": 36
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
        "description": "Input positive (0-23 V)",
        "type": "source",
        "x": 3,
        "y": 3,
        "xalign": "start",
        "yalign": "start",
        "width": 6,
        "height": 6,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "red",
          "lineWidth": 1,
          "radius": "50%"
        },
        "functions": [
          "suppl_in"
        ],
        "voltage": {
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
        "x": 3,
        "y": 33,
        "xalign": "start",
        "yalign": "start",
        "width": 6,
        "height": 6,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "black",
          "lineWidth": 1,
          "radius": "50%"
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
        "x": 53.5,
        "y": 3,
        "xalign": "start",
        "yalign": "start",
        "width": 6,
        "height": 6,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "red",
          "lineWidth": 1,
          "radius": "50%"
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
        "x": 53.5,
        "y": 33,
        "xalign": "start",
        "yalign": "start",
        "width": 3,
        "height": 3,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "black",
          "lineWidth": 1,
          "radius": "50%"
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
        "max": 17,
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
        "value": 1,
        "min": 0.1,
        "max": 3,
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
        "x": 28.5,
        "y": 48,
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
