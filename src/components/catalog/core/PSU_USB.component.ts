import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "PSU_USB",
    "version": 1,
    "display": {
      "name": "compData.PSU_USB.name",
      "descriptionShort": "compData.PSU_USB.descriptionShort",
      "description": "compData.PSU_USB.description",
      "group": "psu"
    },
    "geometry": {
      "image": {
        "url": "./PSU_USB.png",
        "width": 200,
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
        "id": "usb",
        "name": "USB",
        "description": "USB (GND, 5V)",
        "type": "source",
        "x": 197,
        "y": 49.5,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 32,
        "postype": "right",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "#8c8c8c",
          "lineWidth": 2,
          "radius": "5%"
        },
        "functions": [
          "usb_power_out"
        ],
        "voltage": {
          "out": 5,
          "toleranceMin": 0,
          "toleranceMax": 5
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "preferredLineWidth": 5
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
      "ports": [
        {
          "id": "usb-power",
          "type": "usbPowerPair",
          "handle": "usb",
          "positiveTerminal": "USB.VBUS",
          "negativeTerminal": "USB.GND"
        }
      ],
      "elements": [
        {
          "id": "source",
          "type": "voltageSource",
          "terminals": {
            "positive": "USB.VBUS",
            "negative": "USB.GND"
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
