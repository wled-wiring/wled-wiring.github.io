import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "MHC_Relay12V",
    "version": 1,
    "display": {
      "name": "compData.MHC_Relay12V.name",
      "descriptionShort": "compData.MHC_Relay12V.descriptionShort",
      "description": "compData.MHC_Relay12V.description",
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
        "url": "./MHC_Relay12V.png",
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
        "id": "VIN1",
        "name": "Power supply input",
        "description": "12 V DC power supply",
        "type": "source",
        "x": 20,
        "y": 40.5,
        "xalign": "start",
        "yalign": "start",
        "width": 30,
        "height": 18,
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
          "toleranceMax": 14
        },
		"Imax": 20,
        "maxCrossSectionAbsolute": 2.5,
        "behavior": {
          "preferredLineWidth": 4
        },
        "internallyProtected": true
      },
      {
        "id": "VIN2",
        "name": "Power supply input",
        "description": "12 V DC power supply",
        "type": "source",
        "x": 20,
        "y": 62,
        "xalign": "start",
        "yalign": "start",
        "width": 30,
        "height": 18,
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
          "toleranceMax": 14
        },
		"Imax": 20,
        "maxCrossSectionAbsolute": 2.5,
        "behavior": {
          "preferredLineWidth": 4
        },
        "internallyProtected": true
      },
      {
        "id": "CTRL1",
        "name": "Control input 1",
        "description": "Control input for relay 1",
        "type": "source",
        "x": 20,
        "y": 88,
        "xalign": "start",
        "yalign": "start",
        "width": 30,
        "height": 18,
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
        "maxCrossSectionAbsolute": 2.5,
        "behavior": {}
      },
      {
        "id": "CTRL2",
        "name": "Control input 2",
        "description": "Control input for relay 2",
        "type": "source",
        "x": 20,
        "y": 109,
        "xalign": "start",
        "yalign": "start",
        "width": 30,
        "height": 18,
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
        "maxCrossSectionAbsolute": 2.5,
        "behavior": {}
      },
      {
        "id": "GND1",
        "name": "GND (input)",
        "description": "GND",
        "type": "source",
        "x": 20,
        "y": 135,
        "xalign": "start",
        "yalign": "start",
        "width": 30,
        "height": 18,
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
        "relatedToHandle": ["VIN1", "VIN2"],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 0
        },
		"Imax": 20,
        "maxCrossSectionAbsolute": 2.5,
        "behavior": {
          "preferredLineWidth": 4
        }
      },
      {
        "id": "GND2",
        "name": "GND (input)",
        "description": "GND",
        "type": "source",
        "x": 20,
        "y": 156,
        "xalign": "start",
        "yalign": "start",
        "width": 30,
        "height": 18,
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
        "relatedToHandle": ["VIN1", "VIN2"],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 0
        },
		"Imax": 20,
        "maxCrossSectionAbsolute": 2.5,
        "behavior": {
          "preferredLineWidth": 4
        }
      },
      {
        "id": "VOUT1",
        "name": "Power output 1 (NC)",
        "description": "Power output (fused, enabled when no control signal)",
        "type": "source",
        "x": 311,
        "y": 48,
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
          "outDependency": "VIN1",
          "toleranceMin": 0,
          "toleranceMax": 26
        },
        "maxCrossSectionAbsolute": 2.5,
        "behavior": {
          "controllableBy": "CTRL1",
          "preferredLineWidth": 4
        }
      },
      {
        "id": "VOUT2",
        "name": "Power output 1 (NO)",
        "description": "Power output (fused, enabled when control signal applied)",
        "type": "source",
        "x": 311,
        "y": 69,
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
          "outDependency": "VIN1",
          "toleranceMin": 0,
          "toleranceMax": 26
        },
        "maxCrossSectionAbsolute": 2.5,
        "behavior": {
          "controllableBy": "CTRL1",
          "preferredLineWidth": 4
        }
      },
      {
        "id": "VOUT3",
        "name": "Power output 2 (NC)",
        "description": "Power output (fused, enabled when no control signal)",
        "type": "source",
        "x": 311,
        "y": 95,
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
          "outDependency": "VIN2",
          "toleranceMin": 0,
          "toleranceMax": 26
        },
        "maxCrossSectionAbsolute": 2.5,
        "behavior": {
          "controllableBy": "CTRL2",
          "preferredLineWidth": 4
        }
      },
      {
        "id": "VOUT4",
        "name": "Power output 2 (NO)",
        "description": "Power output (fused, enabled when control signal applied)",
        "type": "source",
        "x": 311,
        "y": 116,
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
          "outDependency": "VIN2",
          "toleranceMin": 0,
          "toleranceMax": 26
        },
        "maxCrossSectionAbsolute": 2.5,
        "behavior": {
          "controllableBy": "CTRL2",
          "preferredLineWidth": 4
        }
      }
    ],
    "fields": [
      {
        "id": "Fuse1",
        "type": "select",
        "name": "Fuse1: ",
        "selectedValue": 10,
        "unit": "A",
        "options": [
          {
            "value": 4,
            "label": "4 A",
            "image": {
              "url": "./miniOTO_4A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 83,
            "y": 43
          },
          {
            "value": 5,
            "label": "5 A",
            "image": {
              "url": "./miniOTO_5A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 83,
            "y": 43
          },
          {
            "value": 7.5,
            "label": "7.5 A",
            "image": {
              "url": "./miniOTO_7.5A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 83,
            "y": 43
          },
          {
            "value": 10,
            "label": "10 A",
            "image": {
              "url": "./miniOTO_10A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 83,
            "y": 43
          }
        ],
        "ui": {
          "displayName": false,
          "customImage": true,
          "color": "black",
          "fieldWidth": 100,
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
            "value": 4,
            "label": "4 A",
            "image": {
              "url": "./miniOTO_4A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 133,
            "y": 9
          },
          {
            "value": 5,
            "label": "5 A",
            "image": {
              "url": "./miniOTO_5A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 83,
            "y": 136
          },
          {
            "value": 7.5,
            "label": "7.5 A",
            "image": {
              "url": "./miniOTO_7.5A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 83,
            "y": 136
          },
          {
            "value": 10,
            "label": "10 A",
            "image": {
              "url": "./miniOTO_10A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 83,
            "y": 136
          }
        ],
        "ui": {
          "displayName": false,
          "customImage": true,
          "color": "black",
          "fieldWidth": 100,
          "hide": true,
          "showNameIfSelected": true
        }
      }
    ],
    "internalConnections": [
      {
        "kind": "fuse",
        "fromHandle": "VIN1",
        "toHandle": "VOUT1",
        "fuseId": "Fuse1",
        "nominalCurrentField": "Fuse1"
      },
      {
        "kind": "fuse",
        "fromHandle": "VIN1",
        "toHandle": "VOUT2",
        "fuseId": "Fuse1",
        "nominalCurrentField": "Fuse1"
      },
      {
        "kind": "fuse",
        "fromHandle": "VIN2",
        "toHandle": "VOUT3",
        "fuseId": "Fuse2",
        "nominalCurrentField": "Fuse2"
      },
      {
        "kind": "fuse",
        "fromHandle": "VIN2",
        "toHandle": "VOUT4",
        "fuseId": "Fuse2",
        "nominalCurrentField": "Fuse2"
      }
    ],
    "simulation": {
      "version": 1,
      "elements": [
        {
          "id": "vin-bridge-1-2",
          "type": "shortBridge",
          "terminals": {
            "a": "VIN1",
            "b": "VIN2"
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
          "id": "vin1-vout1-nc-fuse",
          "type": "fuse",
          "terminals": {
            "a": "VIN1",
            "b": "VOUT1"
          },
          "parameters": {
            "resistanceOhm": {
              "table": {
                "4": 0.04,
                "5": 0.035,
                "10": 0.0208,
                "7.5": 0.028
              },
              "by": {
                "select": "Fuse1"
              },
              "default": 0.0208
            },
            "nominalCurrentA": {
              "select": "Fuse1"
            }
          }
        },
        {
          "id": "vin1-vout2-no-fuse",
          "type": "fuse",
          "terminals": {
            "a": "VIN1",
            "b": "VOUT2"
          },
          "parameters": {
            "resistanceOhm": {
              "table": {
                "4": 0.04,
                "5": 0.035,
                "10": 0.0208,
                "7.5": 0.028
              },
              "by": {
                "select": "Fuse1"
              },
              "default": 0.0208
            },
            "nominalCurrentA": {
              "select": "Fuse1"
            }
          }
        },
        {
          "id": "vin2-vout3-nc-fuse",
          "type": "fuse",
          "terminals": {
            "a": "VIN2",
            "b": "VOUT3"
          },
          "parameters": {
            "resistanceOhm": {
              "table": {
                "4": 0.04,
                "5": 0.035,
                "10": 0.0208,
                "7.5": 0.028
              },
              "by": {
                "select": "Fuse2"
              },
              "default": 0.0208
            },
            "nominalCurrentA": {
              "select": "Fuse2"
            }
          }
        },
        {
          "id": "vin2-vout4-no-fuse",
          "type": "fuse",
          "terminals": {
            "a": "VIN2",
            "b": "VOUT4"
          },
          "parameters": {
            "resistanceOhm": {
              "table": {
                "4": 0.04,
                "5": 0.035,
                "10": 0.0208,
                "7.5": 0.028
              },
              "by": {
                "select": "Fuse2"
              },
              "default": 0.0208
            },
            "nominalCurrentA": {
              "select": "Fuse2"
            }
          }
        }
      ]
    },
    "runtime": {
      "inputFieldsBox": {
        "x": 120,
        "y": 83,
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
