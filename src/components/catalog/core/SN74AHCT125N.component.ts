import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "SN74AHCT125N",
    "version": 1,
    "display": {
      "name": "compData.SN74AHCT125N.name",
      "descriptionShort": "compData.SN74AHCT125N.descriptionShort",
      "description": "compData.SN74AHCT125N.description",
      "group": "levelshifter"
    },
    "geometry": {
      "image": {
        "url": "./SN74AHCT125N.jpg",
        "width": 40,
        "height": 97
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
        "id": "1OE",
        "name": "/1OE",
        "description": "Output 1 enable (inverted)",
        "type": "source",
        "x": 2,
        "y": 10,
        "xalign": "start",
        "yalign": "start",
        "width": 4,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "5%"
        },
        "functions": [
          "dig_in"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 5
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "preferredLineWidth": 1
        }
      },
      {
        "id": "1A",
        "name": "1A",
        "description": "Input 1",
        "type": "source",
        "x": 2,
        "y": 23,
        "xalign": "start",
        "yalign": "start",
        "width": 4,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "5%"
        },
        "functions": [
          "dig_in"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 5
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "preferredLineWidth": 1
        }
      },
      {
        "id": "1Y",
        "name": "1Y",
        "description": "Output 1",
        "type": "source",
        "x": 2,
        "y": 35.6,
        "xalign": "start",
        "yalign": "start",
        "width": 4,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "5%"
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
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "preferredLineWidth": 1
        }
      },
      {
        "id": "2OE",
        "name": "/2OE",
        "description": "Output 2 enable (inverted)",
        "type": "source",
        "x": 2,
        "y": 48.5,
        "xalign": "start",
        "yalign": "start",
        "width": 4,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "5%"
        },
        "functions": [
          "dig_in"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 5
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "preferredLineWidth": 1
        }
      },
      {
        "id": "2A",
        "name": "2A",
        "description": "Input 2",
        "type": "source",
        "x": 2,
        "y": 61,
        "xalign": "start",
        "yalign": "start",
        "width": 4,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "5%"
        },
        "functions": [
          "dig_in"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 5
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "preferredLineWidth": 1
        }
      },
      {
        "id": "2Y",
        "name": "2Y",
        "description": "Output 2",
        "type": "source",
        "x": 2,
        "y": 74,
        "xalign": "start",
        "yalign": "start",
        "width": 4,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "5%"
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
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "preferredLineWidth": 1
        }
      },
      {
        "id": "GND",
        "name": "GND",
        "description": "GND",
        "type": "source",
        "x": 2,
        "y": 87,
        "xalign": "start",
        "yalign": "start",
        "width": 4,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "black",
          "lineWidth": 0.8,
          "radius": "5%"
        },
        "functions": [
          "gnd"
        ],
        "relatedToHandle": ["VCC"],
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
        "id": "VCC",
        "name": "VCC",
        "description": "Voltage supply",
        "type": "source",
        "x": 38,
        "y": 10,
        "xalign": "start",
        "yalign": "start",
        "width": 4,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "red",
          "lineWidth": 0.8,
          "radius": "5%"
        },
        "functions": [
          "suppl_in"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 5
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "preferredLineWidth": 1
        }
      },
      {
        "id": "4OE",
        "name": "/4OE",
        "description": "Output 4 enable (inverted)",
        "type": "source",
        "x": 38,
        "y": 23,
        "xalign": "start",
        "yalign": "start",
        "width": 4,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "5%"
        },
        "functions": [
          "dig_in"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 5
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "preferredLineWidth": 1
        }
      },
      {
        "id": "4A",
        "name": "4A",
        "description": "Input 4",
        "type": "source",
        "x": 38,
        "y": 35.6,
        "xalign": "start",
        "yalign": "start",
        "width": 4,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "5%"
        },
        "functions": [
          "dig_in"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 5
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "preferredLineWidth": 1
        }
      },
      {
        "id": "4Y",
        "name": "4Y",
        "description": "Output 4",
        "type": "source",
        "x": 38,
        "y": 48.5,
        "xalign": "start",
        "yalign": "start",
        "width": 4,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "5%"
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
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "preferredLineWidth": 1
        }
      },
      {
        "id": "3OE",
        "name": "/3OE",
        "description": "Output 3 enable (inverted)",
        "type": "source",
        "x": 38,
        "y": 61,
        "xalign": "start",
        "yalign": "start",
        "width": 4,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "5%"
        },
        "functions": [
          "dig_in"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 5
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "preferredLineWidth": 1
        }
      },
      {
        "id": "3A",
        "name": "3A",
        "description": "Input 3",
        "type": "source",
        "x": 38,
        "y": 74,
        "xalign": "start",
        "yalign": "start",
        "width": 4,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "5%"
        },
        "functions": [
          "dig_in"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 5
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "preferredLineWidth": 1
        }
      },
      {
        "id": "3Y",
        "name": "3Y",
        "description": "Output 3",
        "type": "source",
        "x": 38,
        "y": 87,
        "xalign": "start",
        "yalign": "start",
        "width": 4,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "5%"
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
          "id": "idle-load",
          "type": "constantPowerSink",
          "terminals": {
            "positive": "VCC",
            "negative": "GND"
          },
          "parameters": {
            "powerW": 0.05,
            "minVoltageV": 3
          }
        }
      ]
    }
  }
});
