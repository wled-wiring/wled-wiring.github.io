import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "INMP441",
    "version": 1,
    "display": {
      "name": "compData.INMP441.name",
      "descriptionShort": "compData.INMP441.descriptionShort",
      "description": "compData.INMP441.description",
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
        "url": "./INMP441.jpg",
        "width": 60,
        "height": 60
      },
      "rotation": 0,
      "rotatable": true,
      "resizableX": false,
      "borderWidth": 2
    },
    "handles": [
      {
        "id": "LR",
        "name": "L/R",
        "description": "L/R selection. For WLED must be tied to GND",
        "type": "source",
        "x": 13,
        "y": 19,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "black",
          "lineWidth": 0.8,
          "radius": "50%"
        },
        "functions": [
          "dig_in"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 3.6
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "mustBeConnected": true,
          "preferredLineWidth": 1
        }
      },
      {
        "id": "WS",
        "name": "WS",
        "description": "WS",
        "type": "source",
        "x": 13,
        "y": 30,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "blue",
          "lineWidth": 0.8,
          "radius": "50%"
        },
        "functions": [
          "dig_in"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 3.6
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "mustBeConnected": true,
          "preferredLineWidth": 1
        }
      },
      {
        "id": "SCK",
        "name": "SCK",
        "description": "SCK",
        "type": "source",
        "x": 13,
        "y": 41,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "blue",
          "lineWidth": 0.8,
          "radius": "50%"
        },
        "functions": [
          "dig_in"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 3.6
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
        "x": 46.5,
        "y": 19,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "black",
          "lineWidth": 0.8,
          "radius": "50%"
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
        "name": "3.3 V",
        "description": "3.3 V supply",
        "type": "source",
        "x": 46.5,
        "y": 30,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "red",
          "lineWidth": 0.8,
          "radius": "50%"
        },
        "functions": [
          "suppl_in"
        ],
        "voltage": {
          "out": 3.3,
          "toleranceMin": 0,
          "toleranceMax": 3.6
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "preferredLineWidth": 1
        }
      },
      {
        "id": "SD",
        "name": "SD",
        "description": "Data output",
        "type": "source",
        "x": 46.5,
        "y": 41,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "blue",
          "lineWidth": 0.8,
          "radius": "50%"
        },
        "functions": [
          "dig_out"
        ],
        "voltage": {
          "out": 3.3,
          "toleranceMin": 0,
          "toleranceMax": 3.6
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
