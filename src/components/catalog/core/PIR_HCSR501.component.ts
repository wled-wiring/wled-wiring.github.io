import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "PIR_HCSR501",
    "version": 1,
    "display": {
      "name": "compData.PIR_HCSR501.name",
      "descriptionShort": "compData.PIR_HCSR501.descriptionShort",
      "description": "compData.PIR_HCSR501.description",
      "group": "electronics"
    },
    "geometry": {
      "image": {
        "url": "./PIR_HCSR501.png",
        "width": 128,
        "height": 146
      },
      "rotation": 0,
      "rotatable": true,
      "resizableX": false,
      "borderWidth": 2,
      "nodeOrigin": [
        0.5,
        0.5
      ]
    },
    "handles": [
      {
        "id": "GND",
        "name": "GND",
        "description": "GND",
        "type": "source",
        "x": 13,
        "y": 61,
        "xalign": "start",
        "yalign": "start",
        "width": 12,
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
        "relatedToHandle": ["V"],
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
        "id": "OUT",
        "name": "OUT",
        "description": "Output",
        "type": "source",
        "x": 13,
        "y": 72.2,
        "xalign": "start",
        "yalign": "start",
        "width": 12,
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
      },
      {
        "id": "V",
        "name": "+V",
        "description": "Supply voltage (5-12V)",
        "type": "source",
        "x": 13,
        "y": 83.3,
        "xalign": "start",
        "yalign": "start",
        "width": 12,
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
          "toleranceMin": 0,
          "toleranceMax": 12
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
            "positive": "V",
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
