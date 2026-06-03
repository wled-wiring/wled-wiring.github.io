import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "PSU_USB_WIRES",
    "version": 1,
    "display": {
      "name": "compData.PSU_USB_WIRES.name",
      "descriptionShort": "compData.PSU_USB_WIRES.descriptionShort",
      "description": "compData.PSU_USB_WIRES.description",
      "group": "psu"
    },
    "geometry": {
      "image": {
        "url": "./PSU_USB_WIRES.png",
        "width": 237,
        "height": 99
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
        "id": "VOUT",
        "name": "5V out",
        "description": "+5V supply output",
        "type": "source",
        "x": 232,
        "y": 46,
        "xalign": "start",
        "yalign": "start",
        "width": 12,
        "height": 8,
        "postype": "right",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "red",
          "lineWidth": 1,
          "radius": "5%"
        },
        "functions": [
          "suppl_out"
        ],
        "voltage": {
          "out": 5,
          "toleranceMin": 0,
          "toleranceMax": 5
        },
        "behavior": {
          "preferredLineWidth": 2
        }
      },
      {
        "id": "GND",
        "name": "GND",
        "description": "GND (output)",
        "type": "source",
        "x": 232,
        "y": 54,
        "xalign": "start",
        "yalign": "start",
        "width": 12,
        "height": 8,
        "postype": "right",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "black",
          "lineWidth": 1,
          "radius": "5%"
        },
        "functions": [
          "gnd"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 0
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "preferredLineWidth": 2
        }
      }
    ],
    "fields": [
      {
        "id": "source_current",
        "type": "number",
        "name": "Imax",
        "value": 3,
        "min": 0,
        "max": 5,
        "step": 0.1,
        "unit": "A",
        "ui": {
          "color": "#757575",
          "fieldWidth": 70
        }
      }
    ],
    "simulation": {
      "version": 1,
      "elements": [
        {
          "id": "source",
          "type": "voltageSource",
          "terminals": {
            "positive": "VOUT",
            "negative": "GND"
          },
          "parameters": {
            "voltageV": 5,
            "currentLimitA": {
              "field": "source_current"
            },
            "voltageDropPctAt150Current": 50
          }
        }
      ]
    },
    "runtime": {
      "inputFieldsBox": {
        "x": 104,
        "y": 24,
        "borderType": "solid",
        "borderColor": "black",
        "borderLineWidth": 0,
        "borderRadius": "0%",
        "backgroundColor": "transparent"
      }
    }
  }
});
