import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "MHC_RS485_R",
    "version": 1,
    "display": {
      "name": "compData.MHC_RS485_R.name",
      "descriptionShort": "compData.MHC_RS485_R.descriptionShort",
      "description": "compData.MHC_RS485_R.description",
      "group": "electronics",
      "buyLinks": [
        {
          "text": "MyHome-Control Shop (Germnany)",
          "url": "https://shop.myhome-control.de/"
        }
      ]
    },
    "geometry": {
      "image": {
        "url": "./MHC_RS485_R.png",
        "width": 178,
        "height": 54
      },
      "rotation": 0,
      "rotatable": true,
      "resizableX": false,
      "borderWidth": 2
    },
    "handles": [
      {
        "id": "RS485A",
        "name": "RS-485 input A",
        "description": "RS-485 input A",
        "type": "source",
        "x": 16,
        "y": 10,
        "xalign": "start",
        "yalign": "start",
        "width": 24,
        "height": 14,
        "postype": "left",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 1,
          "radius": "20%"
        },
        "functions": [
          "rs485_A"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 24
        },
        "maxCrossSectionAbsolute": 0.75,
        "behavior": {
          "mustBeConnected": true,
          "preferredLineWidth": 2
        }
      },
      {
        "id": "RS485GND",
        "name": "GND (RS-485)",
        "description": "RS-485 GND",
        "type": "source",
        "x": 16,
        "y": 26,
        "xalign": "start",
        "yalign": "start",
        "width": 24,
        "height": 14,
        "postype": "left",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "black",
          "lineWidth": 1,
          "radius": "20%"
        },
        "functions": [
          "gnd"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 0
        },
		"Imax": 0.5,
        "maxCrossSectionAbsolute": 0.75,
        "behavior": {
          "preferredLineWidth": 2
        }
      },
      {
        "id": "RS485B",
        "name": "RS-485 input B",
        "description": "RS-485 input B",
        "type": "source",
        "x": 16,
        "y": 41,
        "xalign": "start",
        "yalign": "start",
        "width": 24,
        "height": 14,
        "postype": "left",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 1,
          "radius": "20%"
        },
        "functions": [
          "rs485_B"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 24
        },
        "maxCrossSectionAbsolute": 0.75,
        "behavior": {
          "mustBeConnected": true,
          "preferredLineWidth": 2
        }
      },
      {
        "id": "VIN",
        "name": "Power input +",
        "description": "Power input (from LEDs)",
        "type": "source",
        "x": 161,
        "y": 42,
        "xalign": "start",
        "yalign": "start",
        "width": 24,
        "height": 14,
        "postype": "right",
        "position": "left",
        "border": {
          "type": "dotted",
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
          "toleranceMax": 24
        },
        "maxCrossSectionAbsolute": 0.75,
        "behavior": {
          "preferredLineWidth": 2
        },
        "internallyProtected": true
      },
      {
        "id": "GND1",
        "name": "GND (from LEDs)",
        "description": "GND",
        "type": "source",
        "x": 161,
        "y": 10,
        "xalign": "start",
        "yalign": "start",
        "width": 24,
        "height": 14,
        "postype": "right",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "black",
          "lineWidth": 1,
          "radius": "20%"
        },
        "functions": [
          "gnd"
        ],
        "relatedToHandle": ["VIN"],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 26
        },
		"Imax": 0.5,
        "maxCrossSectionAbsolute": 0.75,
        "behavior": {
          "preferredLineWidth": 2
        }
      },
      {
        "id": "DAT",
        "name": "Data output",
        "description": "Data output",
        "type": "source",
        "x": 161,
        "y": 26,
        "xalign": "start",
        "yalign": "start",
        "width": 24,
        "height": 14,
        "postype": "right",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 1,
          "radius": "20%"
        },
        "functions": [
          "dig_out"
        ],
        "voltage": {
          "out": 5,
          "toleranceMin": 0,
          "toleranceMax": 5
        },
        "maxCrossSectionAbsolute": 0.75,
        "behavior": {
          "mustBeConnected": true,
          "preferredLineWidth": 2
        }
      }
    ],
    "simulation": {
      "version": 1,
      "elements": [
        {
          "id": "idle-load",
          "type": "constantPowerSink",
          "terminals": {
            "positive": "VIN",
            "negative": "GND1"
          },
          "parameters": {
            "powerW": 0.5,
            "minVoltageV": 3
          }
        },
        {
          "id": "gnd-bridge-1-2",
          "type": "shortBridge",
          "terminals": {
            "a": "GND1",
            "b": "RS485GND"
          }
        }
      ]
    }
  }
});
