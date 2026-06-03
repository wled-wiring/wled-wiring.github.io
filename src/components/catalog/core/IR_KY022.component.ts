import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "IR_KY022",
    "version": 1,
    "display": {
      "name": "compData.IR_KY022.name",
      "descriptionShort": "compData.IR_KY022.descriptionShort",
      "description": "compData.IR_KY022.description",
      "group": "electronics"
    },
    "geometry": {
      "image": {
        "url": "./IR_KY022.png",
        "width": 106,
        "height": 62
      },
      "rotation": 0,
      "rotatable": true,
      "resizableX": false,
      "borderWidth": 2
    },
    "handles": [
      {
        "id": "GND",
        "name": "GND",
        "description": "GND",
        "type": "source",
        "x": 5,
        "y": 28,
        "xalign": "start",
        "yalign": "start",
        "width": 10,
        "height": 6,
        "postype": "left",
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
        "x": 5,
        "y": 38.4,
        "xalign": "start",
        "yalign": "start",
        "width": 10,
        "height": 6,
        "postype": "left",
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
      },
      {
        "id": "OUT",
        "name": "OUT",
        "description": "Output",
        "type": "source",
        "x": 5,
        "y": 49.2,
        "xalign": "start",
        "yalign": "start",
        "width": 10,
        "height": 6,
        "postype": "left",
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
