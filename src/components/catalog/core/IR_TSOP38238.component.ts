import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "IR_TSOP38238",
    "version": 1,
    "display": {
      "name": "compData.IR_TSOP38238.name",
      "descriptionShort": "compData.IR_TSOP38238.descriptionShort",
      "description": "compData.IR_TSOP38238.description",
      "group": "electronics"
    },
    "geometry": {
      "image": {
        "url": "./IR_TSOP38238.jpg",
        "width": 25,
        "height": 81
      },
      "rotation": 0,
      "rotatable": true,
      "resizableX": false,
      "borderWidth": 2
    },
    "handles": [
      {
        "id": "OUT",
        "name": "OUT",
        "description": "Output",
        "type": "source",
        "x": 1.5,
        "y": 76,
        "xalign": "start",
        "yalign": "start",
        "width": 6,
        "height": 10,
        "postype": "bottom",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "20%"
        },
        "functions": [
          "dig_out"
        ],
        "voltage": {
          "out": 3.3,
          "toleranceMin": 0,
          "toleranceMax": 5
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "mustBeConnected": true,
          "preferredLineWidth": 1
        }
      },
      {
        "id": "GND",
        "name": "GND",
        "description": "GND",
        "type": "source",
        "x": 12.5,
        "y": 76,
        "xalign": "start",
        "yalign": "start",
        "width": 6,
        "height": 10,
        "postype": "bottom",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "black",
          "lineWidth": 0.8,
          "radius": "20%"
        },
        "functions": [
          "gnd"
        ],
        "relatedToHandle": ["3V3"],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 0
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "preferredLineWidth": 1
        }
      },
      {
        "id": "3V3",
        "name": "+3.3 V",
        "description": "Supply voltage",
        "type": "source",
        "x": 23,
        "y": 76,
        "xalign": "start",
        "yalign": "start",
        "width": 6,
        "height": 10,
        "postype": "bottom",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "red",
          "lineWidth": 0.8,
          "radius": "20%"
        },
        "functions": [
          "suppl_in"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 3,
          "toleranceMax": 3.6
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "preferredLineWidth": 1
        }
      }
    ],
    "simulation": {
      "version": 1,
      "elements": [
        {
          "id": "idle-load-3V3",
          "type": "constantPowerSink",
          "terminals": {
            "positive": "3V3",
            "negative": "GND"
          },
          "parameters": {
            "powerW": 0.01,
            "minVoltageV": 3
          }
        }
      ]
    }
  }
});
