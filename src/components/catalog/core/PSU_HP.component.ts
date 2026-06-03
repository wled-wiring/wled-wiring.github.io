import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "PSU_HP",
    "version": 1,
    "display": {
      "name": "compData.PSU_HP.name",
      "descriptionShort": "compData.PSU_HP.descriptionShort",
      "description": "compData.PSU_HP.description",
      "group": "psu"
    },
    "geometry": {
      "image": {
        "url": "./PSU_HP.jpg",
        "width": 300,
        "height": 180
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
        "id": "Vout1",
        "name": "Vout",
        "description": "Vout (#1)",
        "type": "source",
        "x": 290,
        "y": 34,
        "xalign": "start",
        "yalign": "start",
        "width": 12,
        "height": 12,
        "postype": "right",
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
          "outDependency": "source_voltage"
        },
        "maxCrossSectionAbsolute": 4,
        "maxCrossSectionWarning": 2.5,
        "behavior": {
          "preferredLineWidth": 3
        }
      },
      {
        "id": "Vout2",
        "name": "Vout",
        "description": "Vout (#2)",
        "type": "source",
        "x": 290,
        "y": 49,
        "xalign": "start",
        "yalign": "start",
        "width": 12,
        "height": 12,
        "postype": "right",
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
          "outDependency": "source_voltage"
        },
        "maxCrossSectionAbsolute": 4,
        "maxCrossSectionWarning": 2.5,
        "behavior": {
          "preferredLineWidth": 3
        }
      },
      {
        "id": "Vout3",
        "name": "Vout",
        "description": "Vout (#3)",
        "type": "source",
        "x": 290,
        "y": 64,
        "xalign": "start",
        "yalign": "start",
        "width": 12,
        "height": 12,
        "postype": "right",
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
          "outDependency": "source_voltage"
        },
        "maxCrossSectionAbsolute": 4,
        "maxCrossSectionWarning": 2.5,
        "behavior": {
          "preferredLineWidth": 3
        }
      },
      {
        "id": "GND1",
        "name": "GND",
        "description": "GND (#1)",
        "type": "source",
        "x": 290,
        "y": 79,
        "xalign": "start",
        "yalign": "start",
        "width": 12,
        "height": 12,
        "postype": "right",
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
        "voltage": {},
        "maxCrossSectionAbsolute": 4,
        "maxCrossSectionWarning": 2.5,
        "behavior": {
          "preferredLineWidth": 3
        }
      },
      {
        "id": "GND2",
        "name": "GND",
        "description": "GND (#2)",
        "type": "source",
        "x": 290,
        "y": 94,
        "xalign": "start",
        "yalign": "start",
        "width": 12,
        "height": 12,
        "postype": "right",
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
        "voltage": {},
        "maxCrossSectionAbsolute": 4,
        "maxCrossSectionWarning": 2.5,
        "behavior": {
          "preferredLineWidth": 3
        }
      },
      {
        "id": "GND3",
        "name": "GND",
        "description": "GND (#3)",
        "type": "source",
        "x": 290,
        "y": 109,
        "xalign": "start",
        "yalign": "start",
        "width": 12,
        "height": 12,
        "postype": "right",
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
        "voltage": {},
        "maxCrossSectionAbsolute": 4,
        "maxCrossSectionWarning": 2.5,
        "behavior": {
          "preferredLineWidth": 3
        }
      },
      {
        "id": "PE",
        "name": "PE",
        "description": "Protective earth",
        "type": "source",
        "x": 291,
        "y": 124,
        "xalign": "start",
        "yalign": "start",
        "width": 12,
        "height": 12,
        "postype": "right",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "#ccff33",
          "lineWidth": 1,
          "radius": "20%"
        },
        "functions": [
          "pe_in"
        ],
        "voltage": {},
        "maxCrossSectionAbsolute": 4,
        "maxCrossSectionWarning": 2.5,
        "behavior": {
          "preferredLineWidth": 3
        }
      },
      {
        "id": "N",
        "name": "N",
        "description": "Neutral 110~V/230~V",
        "type": "source",
        "x": 291,
        "y": 139,
        "xalign": "start",
        "yalign": "start",
        "width": 12,
        "height": 12,
        "postype": "right",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "#005ce6",
          "lineWidth": 1,
          "radius": "20%"
        },
        "functions": [
          "neutral_in"
        ],
        "voltage": {},
        "maxCrossSectionAbsolute": 4,
        "maxCrossSectionWarning": 2.5,
        "behavior": {
          "preferredLineWidth": 3
        }
      },
      {
        "id": "L",
        "name": "L",
        "description": "Line 110~V/230~V",
        "type": "source",
        "x": 291,
        "y": 154,
        "xalign": "start",
        "yalign": "start",
        "width": 12,
        "height": 12,
        "postype": "right",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "#996600",
          "lineWidth": 1,
          "radius": "20%"
        },
        "functions": [
          "line_in"
        ],
        "voltage": {},
        "maxCrossSectionAbsolute": 4,
        "maxCrossSectionWarning": 2.5,
        "behavior": {
          "preferredLineWidth": 3
        }
      }
    ],
    "fields": [
      {
        "id": "source_voltage",
        "type": "number",
        "name": "V",
        "value": 5,
        "min": 1,
        "max": 48,
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
        "value": 10,
        "min": 0,
        "max": 100,
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
          "id": "source",
          "type": "voltageSource",
          "terminals": {
            "positive": "Vout1",
            "negative": "GND1"
          },
          "parameters": {
            "voltageV": {
              "field": "source_voltage"
            },
            "currentLimitA": {
              "field": "source_current"
            },
            "voltageDropPctAt150Current": 50
          }
        },
        {
          "id": "vout-bridge-1-2",
          "type": "shortBridge",
          "terminals": {
            "a": "Vout1",
            "b": "Vout2"
          }
        },
        {
          "id": "vout-bridge-1-3",
          "type": "shortBridge",
          "terminals": {
            "a": "Vout1",
            "b": "Vout3"
          }
        },
        {
          "id": "gnd-bridge-1-2",
          "type": "shortBridge",
          "terminals": {
            "a": "GND1",
            "b": "GND2"
          }
        },
        {
          "id": "gnd-bridge-1-3",
          "type": "shortBridge",
          "terminals": {
            "a": "GND1",
            "b": "GND3"
          }
        }
      ]
    },
    "runtime": {
      "inputFieldsBox": {
        "x": 220,
        "y": 90,
        "borderType": "solid",
        "borderColor": "black",
        "borderLineWidth": 0,
        "borderRadius": "0%",
        "backgroundColor": "transparent"
      }
    }
  }
});
