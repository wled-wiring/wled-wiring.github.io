import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "MHC_SwitchBoard",
    "version": 1,
    "display": {
      "name": "compData.MHC_SwitchBoard.name",
      "descriptionShort": "compData.MHC_SwitchBoard.descriptionShort",
      "description": "compData.MHC_SwitchBoard.description",
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
        "url": "./MHC_SwitchBoard.png",
        "width": 332,
        "height": 198
      },
      "rotation": 0,
      "rotatable": true,
      "resizableX": false,
      "borderWidth": 2
    },
    "handles": [
      {
        "id": "VIN",
        "name": "Power supply input +",
        "description": "power supply in +",
        "type": "source",
        "x": 25,
        "y": 145,
        "xalign": "start",
        "yalign": "start",
        "width": 40,
        "height": 22,
        "postype": "left",
        "position": "left",
        "border": {
          "type": "dashed",
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
		"Imax": 20,
        "maxCrossSectionAbsolute": 4,
        "behavior": {
          "preferredLineWidth": 4
        },
        "internallyProtected": true
      },
      {
        "id": "GND",
        "name": "GND (input)",
        "description": "GND",
        "type": "source",
        "x": 25,
        "y": 116,
        "xalign": "start",
        "yalign": "start",
        "width": 40,
        "height": 22,
        "postype": "left",
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
        "relatedToHandle": ["VIN"],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 0
        },
		"Imax": 20,
        "maxCrossSectionAbsolute": 4,
        "behavior": {
          "preferredLineWidth": 4
        }
      },
      {
        "id": "EN1",
        "name": "Enable input",
        "description": "Enable input",
        "type": "source",
        "x": 21,
        "y": 75,
        "xalign": "start",
        "yalign": "start",
        "width": 22,
        "height": 14,
        "postype": "left",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "green",
          "lineWidth": 1,
          "radius": "20%"
        },
        "functions": [
          "dig_in"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 5
        },
		"Imax": 0.5,
        "maxCrossSectionAbsolute": 1,
        "behavior": {}
      },
      {
        "id": "EN2",
        "name": "Enable input",
        "description": "Enable input",
        "type": "source",
        "x": 21,
        "y": 91,
        "xalign": "start",
        "yalign": "start",
        "width": 22,
        "height": 14,
        "postype": "left",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "green",
          "lineWidth": 1,
          "radius": "20%"
        },
        "functions": [
          "dig_in"
        ],
        "voltage": {
          "toleranceMin": 0,
          "toleranceMax": 5
        },
		"Imax": 0.5,
        "maxCrossSectionAbsolute": 1,
        "behavior": {}
      },
      {
        "id": "VOUT1",
        "name": "Power output 1",
        "description": "Power output 1 (fused, switched)",
        "type": "source",
        "x": 314,
        "y": 151,
        "xalign": "start",
        "yalign": "start",
        "width": 30,
        "height": 18,
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
          "outDependency": "VIN",
          "toleranceMin": 0,
          "toleranceMax": 26
        },
        "maxCrossSectionAbsolute": 2.5,
        "behavior": {
          "controllableBy": "EN1",
          "preferredLineWidth": 4
        }
      },
      {
        "id": "GND1",
        "name": "GND (output 1)",
        "description": "GND (output 1)",
        "type": "source",
        "x": 314,
        "y": 129,
        "xalign": "start",
        "yalign": "start",
        "width": 30,
        "height": 18,
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
        "relatedToHandle": ["VOUT1"],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 26
        },
		"Imax": 10,
        "maxCrossSectionAbsolute": 2.5,
        "behavior": {
          "preferredLineWidth": 4
        }
      },
      {
        "id": "VOUT2",
        "name": "Power output 2",
        "description": "Power output 2 (fused, switched)",
        "type": "source",
        "x": 314,
        "y": 107,
        "xalign": "start",
        "yalign": "start",
        "width": 30,
        "height": 18,
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
          "outDependency": "VIN",
          "toleranceMin": 0,
          "toleranceMax": 26
        },
        "maxCrossSectionAbsolute": 2.5,
        "behavior": {
          "controllableBy": "EN1",
          "preferredLineWidth": 4
        }
      },
      {
        "id": "GND2",
        "name": "GND (output 2)",
        "description": "GND (output 2)",
        "type": "source",
        "x": 314,
        "y": 85,
        "xalign": "start",
        "yalign": "start",
        "width": 30,
        "height": 18,
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
        "relatedToHandle": ["VOUT2"],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 26
        },
		"Imax": 10,
        "maxCrossSectionAbsolute": 2.5,
        "behavior": {
          "preferredLineWidth": 4
        }
      },
      {
        "id": "VOUT3",
        "name": "Power output 3",
        "description": "Power output 3 (fused, switched)",
        "type": "source",
        "x": 314,
        "y": 63,
        "xalign": "start",
        "yalign": "start",
        "width": 30,
        "height": 18,
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
          "outDependency": "VIN",
          "toleranceMin": 0,
          "toleranceMax": 26
        },
        "maxCrossSectionAbsolute": 2.5,
        "behavior": {
          "controllableBy": "EN1",
          "preferredLineWidth": 4
        }
      },
      {
        "id": "GND3",
        "name": "GND (output 3)",
        "description": "GND (output 3)",
        "type": "source",
        "x": 314,
        "y": 41,
        "xalign": "start",
        "yalign": "start",
        "width": 30,
        "height": 18,
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
        "relatedToHandle": ["VOUT3"],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 26
        },
		"Imax": 10,
        "maxCrossSectionAbsolute": 2.5,
        "behavior": {
          "preferredLineWidth": 4
        }
      }
    ],
    "fields": [
      {
        "id": "Fuse1",
        "type": "select",
        "name": "Fuse1: ",
        "selectedValue": 5,
        "unit": "A",
        "options": [
          {
            "value": 2,
            "label": "2 A",
            "image": {
              "url": "./miniOTO_2A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 88,
            "y": 168
          },
          {
            "value": 3,
            "label": "3 A",
            "image": {
              "url": "./miniOTO_3A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 88,
            "y": 168
          },
          {
            "value": 4,
            "label": "4 A",
            "image": {
              "url": "./miniOTO_4A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 88,
            "y": 168
          },
          {
            "value": 5,
            "label": "5 A",
            "image": {
              "url": "./miniOTO_5A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 88,
            "y": 168
          }
        ],
        "ui": {
          "displayName": false,
          "customImage": true,
          "color": "black",
          "fieldWidth": 107,
          "hide": true,
          "showNameIfSelected": true
        }
      },
      {
        "id": "Fuse2",
        "type": "select",
        "name": "Fuse2: ",
        "selectedValue": 10,
        "unit": "A",
        "options": [
          {
            "value": 2,
            "label": "2 A",
            "image": {
              "url": "./miniOTO_2A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 88,
            "y": 107
          },
          {
            "value": 3,
            "label": "3 A",
            "image": {
              "url": "./miniOTO_3A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 88,
            "y": 107
          },
          {
            "value": 4,
            "label": "4 A",
            "image": {
              "url": "./miniOTO_4A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 88,
            "y": 107
          },
          {
            "value": 5,
            "label": "5 A",
            "image": {
              "url": "./miniOTO_5A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 88,
            "y": 107
          },
          {
            "value": 7.5,
            "label": "7.5 A",
            "image": {
              "url": "./miniOTO_7.5A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 88,
            "y": 107
          },
          {
            "value": 10,
            "label": "10 A",
            "image": {
              "url": "./miniOTO_10A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 88,
            "y": 107
          }
        ],
        "ui": {
          "displayName": false,
          "customImage": true,
          "color": "black",
          "fieldWidth": 107,
          "hide": true,
          "showNameIfSelected": true
        }
      },
      {
        "id": "Fuse3",
        "type": "select",
        "name": "Fuse3: ",
        "selectedValue": 5,
        "unit": "A",
        "options": [
          {
            "value": 2,
            "label": "2 A",
            "image": {
              "url": "./miniOTO_2A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 88,
            "y": 40
          },
          {
            "value": 3,
            "label": "3 A",
            "image": {
              "url": "./miniOTO_3A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 88,
            "y": 40
          },
          {
            "value": 4,
            "label": "4 A",
            "image": {
              "url": "./miniOTO_4A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 88,
            "y": 40
          },
          {
            "value": 5,
            "label": "5 A",
            "image": {
              "url": "./miniOTO_5A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 88,
            "y": 40
          }
        ],
        "ui": {
          "displayName": false,
          "customImage": true,
          "color": "black",
          "fieldWidth": 107,
          "hide": true,
          "showNameIfSelected": true
        }
      }
    ],
    "internalConnections": [
      {
        "kind": "fuse",
        "fromHandle": "VIN",
        "toHandle": "VOUT1",
        "fuseId": "Fuse1",
        "nominalCurrentField": "Fuse1"
      },
      {
        "kind": "fuse",
        "fromHandle": "VIN",
        "toHandle": "VOUT2",
        "fuseId": "Fuse2",
        "nominalCurrentField": "Fuse2"
      },
      {
        "kind": "fuse",
        "fromHandle": "VIN",
        "toHandle": "VOUT3",
        "fuseId": "Fuse3",
        "nominalCurrentField": "Fuse3"
      },
      {
        "kind": "short",
        "fromHandle": "EN1",
        "toHandle": "EN2"
      }
    ],
    "simulation": {
      "version": 1,
      "elements": [
        {
          "id": "vin-vout1-fuse",
          "type": "fuse",
          "terminals": {
            "a": "VIN",
            "b": "VOUT1"
          },
          "parameters": {
            "resistanceOhm": {
              "table": {
                "2": 0.105,
                "3": 0.071,
                "4": 0.05,
                "5": 0.045,
                "10": 0.0308,
                "15": 0.0265,
                "7.5": 0.038
              },
              "by": {
                "select": "Fuse1"
              },
              "default": 0.0165
            },
            "nominalCurrentA": {
              "select": "Fuse1"
            }
          }
        },
        {
          "id": "vin-vout2-fuse",
          "type": "fuse",
          "terminals": {
            "a": "VIN",
            "b": "VOUT2"
          },
          "parameters": {
            "resistanceOhm": {
              "table": {
                "2": 0.105,
                "3": 0.071,
                "4": 0.05,
                "5": 0.045,
                "10": 0.0308,
                "15": 0.0265,
                "7.5": 0.038
              },
              "by": {
                "select": "Fuse2"
              },
              "default": 0.0165
            },
            "nominalCurrentA": {
              "select": "Fuse2"
            }
          }
        },
        {
          "id": "vin-vout3-fuse",
          "type": "fuse",
          "terminals": {
            "a": "VIN",
            "b": "VOUT3"
          },
          "parameters": {
            "resistanceOhm": {
              "table": {
                "2": 0.105,
                "3": 0.071,
                "4": 0.05,
                "5": 0.045,
                "10": 0.0308,
                "15": 0.0265,
                "7.5": 0.038
              },
              "by": {
                "select": "Fuse3"
              },
              "default": 0.0165
            },
            "nominalCurrentA": {
              "select": "Fuse3"
            }
          }
        },
        {
          "id": "gnd-bridge-input-output-1",
          "type": "shortBridge",
          "terminals": {
            "a": "GND",
            "b": "GND1"
          }
        },
        {
          "id": "gnd-bridge-input-output-2",
          "type": "shortBridge",
          "terminals": {
            "a": "GND",
            "b": "GND2"
          }
        },
        {
          "id": "gnd-bridge-input-output-3",
          "type": "shortBridge",
          "terminals": {
            "a": "GND",
            "b": "GND3"
          }
        },
        {
          "id": "en-bridge-1-2",
          "type": "shortBridge",
          "terminals": {
            "a": "EN1",
            "b": "EN2"
          }
        }
      ]
    },
    "runtime": {
      "inputFieldsBox": {
        "x": 200,
        "y": 85,
        "borderType": "transparent",
        "borderColor": "black",
        "borderLineWidth": 0,
        "borderRadius": "0%",
        "backgroundColor": "transparent",
        "backgroundColorSelected": "white",
        "rotate180only": true
      }
    }
  }
});
