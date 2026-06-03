import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "local",
    "packageId": "local-MHC_V57"
  },
  "component": {
    "id": "MHC_V57",
    "version": 1,
    "display": {
      "name": "compData.MHC_V57.name",
      "descriptionShort": "compData.MHC_V57.descriptionShort",
      "description": "compData.MHC_V57.description",
      "group": "controller",
      "buyLinks": [
        {
          "text": "MyHome-Control Shop (Germnany)",
          "url": "https://shop.myhome-control.de/"
        }
      ]
    },
    "geometry": {
      "image": {
        "url": "./MHC_V57.png",
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
        "name": "Power supply (input)",
        "description": "5-24 V DC power supply",
        "type": "source",
        "x": 20,
        "y": 44.5,
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
          "toleranceMin": 4,
          "toleranceMax": 26
        },
        "maxCrossSectionAbsolute": 2.5,
        "behavior": {
          "preferredLineWidth": 4
        },
        "internallyProtected": true
      },
      {
        "id": "GND1",
        "name": "GND",
        "description": "GND",
        "type": "source",
        "x": 20,
        "y": 66.5,
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
        relatedToHandle: ["VIN"],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 0
        },
		"Imax": 15,
        "maxCrossSectionAbsolute": 2.5,
        "behavior": {
          "preferredLineWidth": 4
        }
      },
      {
        "id": "DAT2",
        "name": "Data 2 out (GPIO 18)",
        "description": "LED data out",
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
          "toleranceMax": 0
        },
        "maxCrossSectionAbsolute": 2.5,
        "behavior": {}
      },
      {
        "id": "CLK2",
        "name": "Clock 2 out (GPIO 13)",
        "description": "LED data or clock out",
        "type": "source",
        "x": 20,
        "y": 157,
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
          "dig_out"
        ],
        "voltage": {
          "out": 5,
          "toleranceMin": 0,
          "toleranceMax": 0
        },
        "maxCrossSectionAbsolute": 2.5,
        "behavior": {}
      },
      {
        "id": "VOUT",
        "name": "Power output",
        "description": "Power output (fused)",
        "type": "source",
        "x": 310,
        "y": 47,
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
          "preferredLineWidth": 4
        }
      },
      {
        "id": "GND2",
        "name": "GND",
        "description": "GND",
        "type": "source",
        "x": 310,
        "y": 68.5,
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
        relatedToHandle: ["VOUT"],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 0
        },
		"Imax": 15,
        "maxCrossSectionAbsolute": 2.5,
        "behavior": {
          "preferredLineWidth": 4
        }
      },
      {
        "id": "DAT",
        "name": "Data out (GPIO 16)",
        "description": "LED data out",
        "type": "source",
        "x": 310,
        "y": 91.3,
        "xalign": "start",
        "yalign": "start",
        "width": 30,
        "height": 18,
        "postype": "right",
        "position": "left",
        "border": {
          "type": "dashed",
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
          "toleranceMax": 0
        },
        "maxCrossSectionAbsolute": 2.5,
        "behavior": {}
      },
      {
        "id": "CLK",
        "name": "Clock out (GPIO 12)",
        "description": "LED data or clock out",
        "type": "source",
        "x": 310,
        "y": 113.6,
        "xalign": "start",
        "yalign": "start",
        "width": 30,
        "height": 18,
        "postype": "right",
        "position": "left",
        "border": {
          "type": "dashed",
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
          "toleranceMax": 0
        },
        "maxCrossSectionAbsolute": 2.5,
        "behavior": {}
      },
      {
        "id": "GND3",
        "name": "GND",
        "description": "GND",
        "type": "source",
        "x": 4,
        "y": 91,
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
		"Imax": 1,
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "hideConditions": [
            {
              "fieldId": "LineInMic",
              "values": [
                1,
                2,
                3
              ]
            }
          ]
        }
      },
      {
        "id": "GPIO15",
        "name": "GPIO 15",
        "description": "GPIO 15",
        "type": "source",
        "x": 4,
        "y": 102,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "20%"
        },
        "functions": [
          "dig_in",
          "dig_out"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 3.6
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "hideConditions": [
            {
              "fieldId": "LineInMic",
              "values": [
                1,
                2,
                3
              ]
            }
          ]
        }
      },
      {
        "id": "GPIO14",
        "name": "GPIO 14",
        "description": "Digital In/Out",
        "type": "source",
        "x": 4,
        "y": 113,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "20%"
        },
        "functions": [
          "dig_in",
          "dig_out"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 3.6
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "hideConditions": [
            {
              "fieldId": "LineInMic",
              "values": [
                1,
                2,
                3
              ]
            }
          ]
        }
      },
      {
        "id": "3V3_1",
        "name": "3.3V output",
        "description": "3.3 V output from internal voltage regulator",
        "type": "source",
        "x": 24,
        "y": 91,
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
          "radius": "20%"
        },
        "functions": [
          "suppl_out"
        ],
        "voltage": {
          "out": 3.3,
          "toleranceMin": 0,
          "toleranceMax": 0
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "hideConditions": [
            {
              "fieldId": "LineInMic",
              "values": [
                1,
                2,
                3
              ]
            }
          ]
        }
      },
      {
        "id": "GND4",
        "name": "GND",
        "description": "GND",
        "type": "source",
        "x": 24,
        "y": 102,
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
		"Imax": 1,
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "hideConditions": [
            {
              "fieldId": "LineInMic",
              "values": [
                1,
                2,
                3
              ]
            }
          ]
        }
      },
      {
        "id": "GPIO36",
        "name": "GPIO 36",
        "description": "Digital or analog input",
        "type": "source",
        "x": 24,
        "y": 113,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "20%"
        },
        "functions": [
          "dig_in",
          "an_in"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 3.6
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "hideConditions": [
            {
              "fieldId": "LineInMic",
              "values": [
                1,
                2,
                3
              ]
            }
          ]
        }
      },
      {
        "id": "GND5",
        "name": "GND",
        "description": "GND",
        "type": "source",
        "x": 36,
        "y": 91,
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
		"Imax": 1,
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "hideConditions": [
            {
              "fieldId": "LineInMic",
              "values": [
                1,
                2,
                3
              ]
            }
          ]
        }
      },
      {
        "id": "3V3_2",
        "name": "3.3V output",
        "description": "3.3 V output from internal voltage regulator",
        "type": "source",
        "x": 36,
        "y": 102,
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
          "radius": "20%"
        },
        "functions": [
          "suppl_out"
        ],
        "voltage": {
          "out": 3.3,
          "toleranceMin": 0,
          "toleranceMax": 0
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "hideConditions": [
            {
              "fieldId": "LineInMic",
              "values": [
                1,
                2,
                3
              ]
            }
          ]
        }
      },
      {
        "id": "GPIO32",
        "name": "GPIO 32",
        "description": "Digital In/Out",
        "type": "source",
        "x": 36,
        "y": 113,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "20%"
        },
        "functions": [
          "dig_in",
          "dig_out"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 3.6
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "hideConditions": [
            {
              "fieldId": "LineInMic",
              "values": [
                1,
                2,
                3
              ]
            }
          ]
        }
      },
      {
        "id": "GPIO0",
        "name": "GPIO 0",
        "description": "Digital In/Out (be careful: strapping pin, enters serial bootloader when pulled LOW during reset)",
        "type": "source",
        "x": 48,
        "y": 91,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "20%"
        },
        "functions": [
          "dig_in",
          "dig_out"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 3.6
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "hideConditions": [
            {
              "fieldId": "LineInMic",
              "values": [
                1,
                2
              ]
            }
          ]
        }
      },
      {
        "id": "GPIO1",
        "name": "GPIO 1",
        "description": "Digital In/Out. Normally used for serial communication",
        "type": "source",
        "x": 48,
        "y": 102,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "20%"
        },
        "functions": [
          "dig_in",
          "dig_out"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 3.6
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "hideConditions": [
            {
              "fieldId": "LineInMic",
              "values": [
                1,
                2
              ]
            }
          ]
        }
      },
      {
        "id": "GPIO3",
        "name": "GPIO 3",
        "description": "Digital In/Out. Normally used for serial communication",
        "type": "source",
        "x": 48,
        "y": 113,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "20%"
        },
        "functions": [
          "dig_in",
          "dig_out"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 3.6
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "hideConditions": [
            {
              "fieldId": "LineInMic",
              "values": [
                1,
                2
              ]
            }
          ]
        }
      },
      {
        "id": "GND6",
        "name": "GND",
        "description": "GND",
        "type": "source",
        "x": 163,
        "y": 84,
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
		"Imax": 1,
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "hideConditions": [
            {
              "fieldId": "Ethernet",
              "values": [
                1
              ]
            }
          ]
        }
      },
      {
        "id": "3V3_3",
        "name": "3.3V output",
        "description": "3.3 V output from internal voltage regulator",
        "type": "source",
        "x": 163,
        "y": 95,
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
          "radius": "20%"
        },
        "functions": [
          "suppl_out"
        ],
        "voltage": {
          "out": 3.3,
          "toleranceMin": 0,
          "toleranceMax": 0
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "hideConditions": [
            {
              "fieldId": "Ethernet",
              "values": [
                1
              ]
            }
          ]
        }
      },
      {
        "id": "GPIO4",
        "name": "GPIO 4 (SW)",
        "description": "Digital In/Out (Switch)",
        "type": "source",
        "x": 163,
        "y": 106,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "20%"
        },
        "functions": [
          "dig_in",
          "dig_out"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 3.6
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "hideConditions": [
            {
              "fieldId": "Ethernet",
              "values": [
                1
              ]
            }
          ]
        }
      },
      {
        "id": "GPIO0_1",
        "name": "GPIO 0",
        "description": "Digital In/Out (be crafeul: strapping pin, enters serial bootloader when pulled LOW during reset)",
        "type": "source",
        "x": 74,
        "y": 182.5,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "20%"
        },
        "functions": [
          "dig_in",
          "dig_out"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 3.6
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "hideConditions": [
            {
              "fieldId": "USB",
              "values": [
                1
              ]
            }
          ]
        }
      },
      {
        "id": "RST",
        "name": "Reset",
        "description": "Reset input. Pull low to reset the controller",
        "type": "source",
        "x": 85,
        "y": 182.5,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "20%"
        },
        "functions": [
          "rst"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 3.6
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "hideConditions": [
            {
              "fieldId": "USB",
              "values": [
                1
              ]
            }
          ]
        }
      },
      {
        "id": "3V3_4",
        "name": "3.3V output",
        "description": "3.3 V output from internal voltage regulator",
        "type": "source",
        "x": 96,
        "y": 182.5,
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
          "radius": "20%"
        },
        "functions": [
          "suppl_out"
        ],
        "voltage": {
          "out": 3.3,
          "toleranceMin": 0,
          "toleranceMax": 0
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "hideConditions": [
            {
              "fieldId": "USB",
              "values": [
                1
              ]
            }
          ]
        }
      },
      {
        "id": "GPIO3_1",
        "name": "GPIO 3",
        "description": "Digital In/Out. Normally used for serial communication",
        "type": "source",
        "x": 107,
        "y": 182.5,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "20%"
        },
        "functions": [
          "dig_in",
          "dig_out"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 3.6
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "hideConditions": [
            {
              "fieldId": "USB",
              "values": [
                1
              ]
            }
          ]
        }
      },
      {
        "id": "GPIO1_1",
        "name": "GPIO 1",
        "description": "Digital In/Out. Normally used for serial communication",
        "type": "source",
        "x": 118,
        "y": 182.5,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "20%"
        },
        "functions": [
          "dig_in",
          "dig_out"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 3.6
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "hideConditions": [
            {
              "fieldId": "USB",
              "values": [
                1
              ]
            }
          ]
        }
      },
      {
        "id": "GND7",
        "name": "GND",
        "description": "GND",
        "type": "source",
        "x": 129,
        "y": 182.5,
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
		"Imax": 1,
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "hideConditions": [
            {
              "fieldId": "USB",
              "values": [
                1
              ]
            }
          ]
        }
      },
      {
        "id": "VIN_2",
        "name": "Voltage supply",
        "description": "Voltage supply input (for test purposes only)",
        "type": "source",
        "x": 140,
        "y": 182.5,
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
          "radius": "20%"
        },
        "functions": [
          "suppl_out"
        ],
        "voltage": {
          "out": 3.3,
          "toleranceMin": 0,
          "toleranceMax": 0
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "hideConditions": [
            {
              "fieldId": "USB",
              "values": [
                1
              ]
            }
          ]
        }
      },
      {
        "id": "DAT_1",
        "name": "Data out (GPIO 16)",
        "description": "LED data out (use this one for tests only)",
        "type": "source",
        "x": 151,
        "y": 182.5,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
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
          "out": 5,
          "toleranceMin": 0,
          "toleranceMax": 0
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "hideConditions": [
            {
              "fieldId": "USB",
              "values": [
                1
              ]
            }
          ]
        }
      },
      {
        "id": "GPIO17",
        "name": "GPIO 17",
        "description": "Digital In/Out",
        "type": "source",
        "x": 299,
        "y": 148.8,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "20%"
        },
        "functions": [
          "dig_in",
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
          "hideConditions": [
            {
              "fieldId": "Ethernet",
              "values": [
                1
              ]
            }
          ]
        }
      },
      {
        "id": "GPIO25",
        "name": "GPIO 25",
        "description": "Digital In/Out",
        "type": "source",
        "x": 310,
        "y": 148.8,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "20%"
        },
        "functions": [
          "dig_in",
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
          "hideConditions": [
            {
              "fieldId": "Ethernet",
              "values": [
                1
              ]
            }
          ]
        }
      },
      {
        "id": "GPIO26",
        "name": "GPIO 26",
        "description": "Digital In/Out",
        "type": "source",
        "x": 321,
        "y": 148.8,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "20%"
        },
        "functions": [
          "dig_in",
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
          "hideConditions": [
            {
              "fieldId": "Ethernet",
              "values": [
                1
              ]
            }
          ]
        }
      },
      {
        "id": "GPIO19",
        "name": "GPIO 19",
        "description": "Digital In/Out",
        "type": "source",
        "x": 299,
        "y": 159.8,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "20%"
        },
        "functions": [
          "dig_in",
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
          "hideConditions": [
            {
              "fieldId": "Ethernet",
              "values": [
                1
              ]
            }
          ]
        }
      },
      {
        "id": "GPIO5",
        "name": "GPIO 5",
        "description": "Digital In/Out",
        "type": "source",
        "x": 310,
        "y": 159.8,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "20%"
        },
        "functions": [
          "dig_in",
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
          "hideConditions": [
            {
              "fieldId": "Ethernet",
              "values": [
                1
              ]
            }
          ]
        }
      },
      {
        "id": "GPIO27",
        "name": "GPIO 27",
        "description": "Digital In/Out",
        "type": "source",
        "x": 321,
        "y": 159.8,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "20%"
        },
        "functions": [
          "dig_in",
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
          "hideConditions": [
            {
              "fieldId": "Ethernet",
              "values": [
                1
              ]
            }
          ]
        }
      },
      {
        "id": "GND8",
        "name": "GND",
        "description": "GND",
        "type": "source",
        "x": 273.3,
        "y": 177.4,
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
		"Imax": 1,
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "hideConditions": [
            {
              "fieldId": "Ethernet",
              "values": [
                1
              ]
            }
          ]
        }
      },
      {
        "id": "3V3_5",
        "name": "3.3V output",
        "description": "3.3 V output from internal voltage regulator",
        "type": "source",
        "x": 284.3,
        "y": 177.4,
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
          "radius": "20%"
        },
        "functions": [
          "suppl_out"
        ],
        "voltage": {
          "out": 3.3,
          "toleranceMin": 0,
          "toleranceMax": 0
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "hideConditions": [
            {
              "fieldId": "Ethernet",
              "values": [
                1
              ]
            }
          ]
        }
      },
      {
        "id": "GPIO33",
        "name": "GPIO 33",
        "description": "Digital In/Out",
        "type": "source",
        "x": 295.3,
        "y": 177.4,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "20%"
        },
        "functions": [
          "dig_in",
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
          "hideConditions": [
            {
              "fieldId": "Ethernet",
              "values": [
                1
              ]
            }
          ]
        }
      },
      {
        "id": "GPIO23",
        "name": "GPIO 23",
        "description": "Digital In/Out",
        "type": "source",
        "x": 273.3,
        "y": 188.4,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "20%"
        },
        "functions": [
          "dig_in",
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
          "hideConditions": [
            {
              "fieldId": "Ethernet",
              "values": [
                1
              ]
            }
          ]
        }
      },
      {
        "id": "GPIO22",
        "name": "GPIO 22",
        "description": "Digital In/Out",
        "type": "source",
        "x": 284.3,
        "y": 188.4,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "20%"
        },
        "functions": [
          "dig_in",
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
          "hideConditions": [
            {
              "fieldId": "Ethernet",
              "values": [
                1
              ]
            }
          ]
        }
      },
      {
        "id": "GPIO21",
        "name": "GPIO 21",
        "description": "Digital In/Out",
        "type": "source",
        "x": 295.3,
        "y": 188.4,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "20%"
        },
        "functions": [
          "dig_in",
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
          "hideConditions": [
            {
              "fieldId": "Ethernet",
              "values": [
                1
              ]
            }
          ]
        }
      },
      {
        "id": "AUDIO",
        "name": "Line - In",
        "description": "Audio input for sound reactive WLED",
        "type": "source",
        "x": -106,
        "y": 157,
        "xalign": "start",
        "yalign": "start",
        "width": 12,
        "height": 23,
        "postype": "left",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "blue",
          "lineWidth": 1,
          "radius": "20%"
        },
        "functions": [
          "audio_in"
        ],
        "voltage": {
          "out": 3.3,
          "toleranceMin": 0,
          "toleranceMax": 3.6
        },
        "behavior": {
          "preferredLineWidth": 3,
          "hideConditions": [
            {
              "fieldId": "LineInMic",
              "values": [
                0,
                1,
                3
              ]
            }
          ]
        }
      },
      {
        "id": "usb",
        "name": "USB",
        "description": "USB (power and data)",
        "type": "source",
        "x": 135,
        "y": 264,
        "xalign": "start",
        "yalign": "start",
        "width": 35,
        "height": 30,
        "postype": "bottom",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "#8c8c8c",
          "lineWidth": 2,
          "radius": "5%"
        },
        "functions": [
          "usb_full"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 5
        },
        "behavior": {
          "preferredLineWidth": 5,
          "hideConditions": [
            {
              "fieldId": "USB",
              "values": [
                0
              ]
            }
          ]
        }
      },
      {
        "id": "ETH",
        "name": "Ethernet",
        "description": "Ethernet (LAN)",
        "type": "source",
        "x": 220,
        "y": 304,
        "xalign": "start",
        "yalign": "start",
        "width": 70,
        "height": 10,
        "postype": "bottom",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "#8c8c8c",
          "lineWidth": 2,
          "radius": "5%"
        },
        "functions": [
          "eth"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 5
        },
        "behavior": {
          "preferredLineWidth": 5,
          "hideConditions": [
            {
              "fieldId": "Ethernet",
              "values": [
                0
              ]
            }
          ]
        }
      },
      {
        "id": "RS485CH1B",
        "name": "Channel 1, B",
        "description": "Channel 1, B",
        "type": "source",
        "x": -113,
        "y": 115,
        "xalign": "start",
        "yalign": "start",
        "width": 25,
        "height": 12,
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
          "out": 5,
          "toleranceMin": -7,
          "toleranceMax": 12
        },
        "maxCrossSectionAbsolute": 0.75,
        "behavior": {
          "preferredLineWidth": 2,
          "hideConditions": [
            {
              "fieldId": "LineInMic",
              "values": [
                0,
                1,
                2
              ]
            }
          ]
        }
      },
      {
        "id": "RS485CH1GND",
        "name": "Channel 1, GND",
        "description": "Channel 1, GND",
        "type": "source",
        "x": -113,
        "y": 127,
        "xalign": "start",
        "yalign": "start",
        "width": 25,
        "height": 12,
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
		"Imax": 0.2,
        "maxCrossSectionAbsolute": 0.75,
        "behavior": {
          "preferredLineWidth": 2,
          "hideConditions": [
            {
              "fieldId": "LineInMic",
              "values": [
                0,
                1,
                2
              ]
            }
          ]
        }
      },
      {
        "id": "RS485CH1A",
        "name": "Channel 1, A",
        "description": "Channel 1, A",
        "type": "source",
        "x": -113,
        "y": 140,
        "xalign": "start",
        "yalign": "start",
        "width": 25,
        "height": 12,
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
          "out": 5,
          "toleranceMin": -7,
          "toleranceMax": 12
        },
        "maxCrossSectionAbsolute": 0.75,
        "behavior": {
          "preferredLineWidth": 2,
          "hideConditions": [
            {
              "fieldId": "LineInMic",
              "values": [
                0,
                1,
                2
              ]
            }
          ]
        }
      },
      {
        "id": "RS485CH2B",
        "name": "Channel 2, B",
        "description": "Channel 2, B",
        "type": "source",
        "x": -113,
        "y": 153,
        "xalign": "start",
        "yalign": "start",
        "width": 25,
        "height": 12,
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
          "out": 5,
          "toleranceMin": -7,
          "toleranceMax": 12
        },
        "maxCrossSectionAbsolute": 0.75,
        "behavior": {
          "preferredLineWidth": 2,
          "hideConditions": [
            {
              "fieldId": "LineInMic",
              "values": [
                0,
                1,
                2
              ]
            }
          ]
        }
      },
      {
        "id": "RS485CH2GND",
        "name": "Channel 2, GND",
        "description": "Channel 2, GND",
        "type": "source",
        "x": -113,
        "y": 165,
        "xalign": "start",
        "yalign": "start",
        "width": 25,
        "height": 12,
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
		"Imax": 0.2,
        "maxCrossSectionAbsolute": 0.75,
        "behavior": {
          "preferredLineWidth": 2,
          "hideConditions": [
            {
              "fieldId": "LineInMic",
              "values": [
                0,
                1,
                2
              ]
            }
          ]
        }
      },
      {
        "id": "RS485CH2A",
        "name": "Channel 2, A",
        "description": "Channel 2, A",
        "type": "source",
        "x": -113,
        "y": 178,
        "xalign": "start",
        "yalign": "start",
        "width": 25,
        "height": 12,
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
          "out": 5,
          "toleranceMin": -7,
          "toleranceMax": 12
        },
        "maxCrossSectionAbsolute": 0.75,
        "behavior": {
          "preferredLineWidth": 2,
          "hideConditions": [
            {
              "fieldId": "LineInMic",
              "values": [
                0,
                1,
                2
              ]
            }
          ]
        }
      }
    ],
    "fields": [
      {
        "id": "Fuse",
        "type": "select",
        "name": "Fuse: ",
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
            "x": 80,
            "y": 7
          },
          {
            "value": 3,
            "label": "3 A",
            "image": {
              "url": "./miniOTO_3A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 80,
            "y": 7
          },
          {
            "value": 4,
            "label": "4 A",
            "image": {
              "url": "./miniOTO_4A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 80,
            "y": 7
          },
          {
            "value": 5,
            "label": "5 A",
            "image": {
              "url": "./miniOTO_5A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 80,
            "y": 7
          },
          {
            "value": 7.5,
            "label": "7.5 A",
            "image": {
              "url": "./miniOTO_7.5A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 80,
            "y": 7
          },
          {
            "value": 10,
            "label": "10 A",
            "image": {
              "url": "./miniOTO_10A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 80,
            "y": 7
          },
          {
            "value": 15,
            "label": "15 A",
            "image": {
              "url": "./miniOTO_15A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 80,
            "y": 7
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
        "id": "LineInMic",
        "type": "select",
        "name": "Adapter/mic: ",
        "selectedValue": 0,
        "unit": "",
        "options": [
          {
            "value": 0,
            "label": "No",
            "image": {
              "url": "",
              "width": 0,
              "height": 0
            },
            "x": 0,
            "y": 0
          },
          {
            "value": 1,
            "label": "Microphone",
            "image": {
              "url": "./INMP441_SOLDERED.png",
              "width": 60,
              "height": 60
            },
            "x": -5,
            "y": 70
          },
          {
            "value": 2,
            "label": "Line-In",
            "image": {
              "url": "./MHC_LineInToI2S.png",
              "width": 166,
              "height": 102
            },
            "x": -112,
            "y": 82
          },
          {
            "value": 3,
            "label": "RS-485/DMX",
            "image": {
              "url": "./MHC_RS485DMX.png",
              "width": 166,
              "height": 102
            },
            "x": -126,
            "y": 85
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
        "id": "USB",
        "type": "select",
        "name": "USB Adapter: ",
        "selectedValue": 0,
        "unit": "",
        "options": [
          {
            "value": 0,
            "label": "No",
            "image": {
              "url": "",
              "width": 0,
              "height": 0
            },
            "x": 0,
            "y": 0
          },
          {
            "value": 1,
            "label": "Yes",
            "image": {
              "url": "./MHC_USB_Adapter.png",
              "width": 90,
              "height": 100
            },
            "x": 66,
            "y": 178
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
        "id": "Ethernet",
        "type": "select",
        "name": "Ethernet Adapter: ",
        "selectedValue": 0,
        "unit": "",
        "options": [
          {
            "value": 0,
            "label": "No",
            "image": {
              "url": "",
              "width": 0,
              "height": 0
            },
            "x": 0,
            "y": 0
          },
          {
            "value": 1,
            "label": "Yes",
            "image": {
              "url": "./MHC_Ethernet_Adapter.png",
              "width": 170,
              "height": 230
            },
            "x": 157,
            "y": 78
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
        "fromHandle": "VIN",
        "toHandle": "VOUT",
        "fuseId": "Fuse",
        "nominalCurrentField": "Fuse"
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
          "id": "usb-gnd-bridge",
          "type": "shortBridge",
          "terminals": {
            "a": "USB.GND",
            "b": "GND1"
          }
        },
        {
          "id": "usb-vbus-diode",
          "type": "diode",
          "terminals": {
            "anode": "USB.VBUS",
            "cathode": "VIN"
          },
          "parameters": {
            "forwardVoltageV": 0.4
          }
        },
        {
          "id": "vin-vout-fuse",
          "type": "fuse",
          "terminals": {
            "a": "VIN",
            "b": "VOUT"
          },
          "parameters": {
            "resistanceOhm": {
              "table": {
                "2": 0.095,
                "3": 0.061,
                "4": 0.04,
                "5": 0.035,
                "10": 0.0208,
                "15": 0.0165,
                "7.5": 0.028
              },
              "by": {
                "select": "Fuse"
              },
              "default": 0.0065
            },
            "nominalCurrentA": {
              "select": "Fuse"
            }
          }
        },
        {
          "id": "controller-idle-load",
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
        },
        {
          "id": "gnd-bridge-1-4",
          "type": "shortBridge",
          "terminals": {
            "a": "GND1",
            "b": "GND4"
          }
        },
        {
          "id": "gnd-bridge-1-5",
          "type": "shortBridge",
          "terminals": {
            "a": "GND1",
            "b": "GND5"
          }
        },
        {
          "id": "gnd-bridge-1-6",
          "type": "shortBridge",
          "terminals": {
            "a": "GND1",
            "b": "GND6"
          }
        },
        {
          "id": "gnd-bridge-1-7",
          "type": "shortBridge",
          "terminals": {
            "a": "GND1",
            "b": "GND7"
          }
        },
        {
          "id": "gnd-bridge-1-8",
          "type": "shortBridge",
          "terminals": {
            "a": "GND1",
            "b": "GND8"
          }
        },
        {
          "id": "rs485-ch1-gnd-bridge",
          "type": "shortBridge",
          "terminals": {
            "a": "GND1",
            "b": "RS485CH1GND"
          }
        },
        {
          "id": "rs485-ch2-gnd-bridge",
          "type": "shortBridge",
          "terminals": {
            "a": "GND1",
            "b": "RS485CH2GND"
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
