import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "MHC_PWMBoard",
    "version": 1,
    "display": {
      "name": "compData.MHC_PWMBoard.name",
      "descriptionShort": "compData.MHC_PWMBoard.descriptionShort",
      "description": "compData.MHC_PWMBoard.description",
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
        "url": "./MHC_PWMBoard.jpg",
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
        "x": 20,
        "y": 43,
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
          "toleranceMin": 12,
          "toleranceMax": 48
        },
        "maxCrossSectionAbsolute": 2.5,
        "behavior": {
          "preferredLineWidth": 4
        },
        internallyProtected: true
      },
      {
        "id": "GND",
        "name": "GND (input)",
        "description": "GND",
        "type": "source",
        "x": 20,
        "y": 65,
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
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 0
        },
        "maxCrossSectionAbsolute": 2.5,
        "behavior": {
          "preferredLineWidth": 4
        }
      },
      {
        "id": "PWMIN1",
        "name": "PWM input 1",
        "description": "PWM input 1",
        "type": "source",
        "x": 20,
        "y": 87,
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
        "behavior": {
          "preferredLineWidth": 2
        }
      },
      {
        "id": "PWMIN2",
        "name": "PWM input 2",
        "description": "PWM input 2",
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
        "behavior": {
          "preferredLineWidth": 2
        }
      },
      {
        "id": "PWMIN3",
        "name": "PWM input 3",
        "description": "PWM input 3",
        "type": "source",
        "x": 20,
        "y": 131,
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
        "behavior": {
          "preferredLineWidth": 2
        }
      },
      {
        "id": "VOUT",
        "name": "Power output +",
        "description": "Power output + (fused)",
        "type": "source",
        "x": 312,
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
          "outDependency": "VIN",
          "toleranceMin": 0,
          "toleranceMax": 48
        },
        "maxCrossSectionAbsolute": 2.5,
        "behavior": {
          "preferredLineWidth": 4
        }
      },
      {
        "id": "PWMOUT1",
        "name": "PWM output 1",
        "description": "PWM Output 1",
        "type": "source",
        "x": 312,
        "y": 70,
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
          "pwm_out"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 48
        },
        "maxCrossSectionAbsolute": 2.5,
        "behavior": {
          "controllableBy": "PWMIN1",
          "preferredLineWidth": 3
        }
      },
      {
        "id": "PWMOUT2",
        "name": "PWM output 2",
        "description": "PWM Output 2",
        "type": "source",
        "x": 312,
        "y": 91,
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
          "pwm_out"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 48
        },
        "maxCrossSectionAbsolute": 2.5,
        "behavior": {
          "controllableBy": "PWMIN2",
          "preferredLineWidth": 3
        }
      },
      {
        "id": "PWMOUT3",
        "name": "PWM output 3",
        "description": "PWM Output 3",
        "type": "source",
        "x": 312,
        "y": 113,
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
          "pwm_out"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 48
        },
        "maxCrossSectionAbsolute": 2.5,
        "behavior": {
          "controllableBy": "PWMIN3",
          "preferredLineWidth": 3
        }
      }
    ],
    "fields": [
      {
        "id": "Fuse",
        "type": "select",
        "name": "Fuse: ",
        "selectedValue": 15,
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
            "x": 85,
            "y": 5
          },
          {
            "value": 3,
            "label": "3 A",
            "image": {
              "url": "./miniOTO_3A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 85,
            "y": 5
          },
          {
            "value": 4,
            "label": "4 A",
            "image": {
              "url": "./miniOTO_4A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 85,
            "y": 5
          },
          {
            "value": 5,
            "label": "5 A",
            "image": {
              "url": "./miniOTO_5A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 85,
            "y": 5
          },
          {
            "value": 7.5,
            "label": "7.5 A",
            "image": {
              "url": "./miniOTO_7.5A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 85,
            "y": 5
          },
          {
            "value": 10,
            "label": "10 A",
            "image": {
              "url": "./miniOTO_10A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 85,
            "y": 5
          },
          {
            "value": 15,
            "label": "15 A",
            "image": {
              "url": "./miniOTO_15A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 85,
            "y": 5
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
            "x": 198,
            "y": 84
          },
          {
            "value": 4,
            "label": "4 A",
            "image": {
              "url": "./miniOTO_4A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 198,
            "y": 84
          },
          {
            "value": 5,
            "label": "5 A",
            "image": {
              "url": "./miniOTO_5A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 198,
            "y": 84
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
            "x": 198,
            "y": 123
          },
          {
            "value": 3,
            "label": "3 A",
            "image": {
              "url": "./miniOTO_3A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 198,
            "y": 123
          },
          {
            "value": 4,
            "label": "4 A",
            "image": {
              "url": "./miniOTO_4A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 198,
            "y": 123
          },
          {
            "value": 5,
            "label": "5 A",
            "image": {
              "url": "./miniOTO_5A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 198,
            "y": 123
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
            "x": 222,
            "y": 166
          },
          {
            "value": 3,
            "label": "3 A",
            "image": {
              "url": "./miniOTO_3A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 222,
            "y": 166
          },
          {
            "value": 4,
            "label": "4 A",
            "image": {
              "url": "./miniOTO_4A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 222,
            "y": 166
          },
          {
            "value": 5,
            "label": "5 A",
            "image": {
              "url": "./miniOTO_5A_top.jpg",
              "width": 60,
              "height": 20
            },
            "x": 222,
            "y": 166
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
        "toHandle": "VOUT",
        "fuseId": "Fuse",
        "nominalCurrentField": "Fuse"
      }
    ],
    "runtime": {
      "inputFieldsBox": {
        "x": 156,
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
