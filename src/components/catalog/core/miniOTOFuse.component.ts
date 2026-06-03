import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "miniOTOFuse",
    "version": 1,
    "display": {
      "name": "compData.miniOTOFuse.name",
      "descriptionShort": "compData.miniOTOFuse.descriptionShort",
      "description": "compData.miniOTOFuse.description",
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
        "url": "./miniOTO_5A.jpg",
        "width": 60,
        "height": 89
      },
      "rotation": 0,
      "rotatable": true,
      "resizableX": false,
      "borderWidth": 2
    },
    "physical": {
      "lengthStep": 0.016667
    },
    "handles": [
      {
        "id": "1",
        "name": "1",
        "description": "1",
        "type": "source",
        "x": 6.8,
        "y": 79,
        "xalign": "start",
        "yalign": "start",
        "width": 15,
        "height": 20,
        "postype": "bottom",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "red",
          "lineWidth": 0.5,
          "radius": "10%"
        },
        "voltage": {},
        "behavior": {
          "mustBeConnected": true,
          "preferredLineWidth": 4,
          "preferredLineDirection": "left"
        },
        "internallyProtected": true
      },
      {
        "id": "2",
        "name": "2",
        "description": "2",
        "type": "source",
        "x": 52.2,
        "y": 79,
        "xalign": "start",
        "yalign": "start",
        "width": 15,
        "height": 20,
        "postype": "bottom",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "red",
          "lineWidth": 0.5,
          "radius": "10%"
        },
        "voltage": {},
        "behavior": {
          "mustBeConnected": true,
          "preferredLineWidth": 4,
          "preferredLineDirection": "right"
        },
        "internallyProtected": true
      }
    ],
    "fields": [
      {
        "id": "NominalValue",
        "type": "select",
        "name": "I",
        "selectedValue": 5,
        "unit": "A",
        "options": [
          {
            "value": 2,
            "label": "2 A",
            "image": {
              "url": "./miniOTO_2A.jpg",
              "width": 60,
              "height": 89
            },
            "x": 0,
            "y": 0
          },
          {
            "value": 3,
            "label": "3 A",
            "image": {
              "url": "./miniOTO_3A.png",
              "width": 60,
              "height": 89
            },
            "x": 0,
            "y": 0
          },
          {
            "value": 4,
            "label": "4 A",
            "image": {
              "url": "./miniOTO_4A.jpg",
              "width": 60,
              "height": 89
            },
            "x": 0,
            "y": 0
          },
          {
            "value": 5,
            "label": "5 A",
            "image": {
              "url": "./miniOTO_5A.jpg",
              "width": 60,
              "height": 89
            },
            "x": 0,
            "y": 0
          },
          {
            "value": 7.5,
            "label": "7.5 A",
            "image": {
              "url": "./miniOTO_7.5A.jpg",
              "width": 60,
              "height": 89
            },
            "x": 0,
            "y": 0
          },
          {
            "value": 10,
            "label": "10 A",
            "image": {
              "url": "./miniOTO_10A.jpg",
              "width": 60,
              "height": 89
            },
            "x": 0,
            "y": 0
          },
          {
            "value": 15,
            "label": "15 A",
            "image": {
              "url": "./miniOTO_15A.jpg",
              "width": 60,
              "height": 89
            },
            "x": 0,
            "y": 0
          },
          {
            "value": 20,
            "label": "20 A",
            "image": {
              "url": "./miniOTO_20A.jpg",
              "width": 60,
              "height": 89
            },
            "x": 0,
            "y": 0
          },
          {
            "value": 30,
            "label": "30 A",
            "image": {
              "url": "./miniOTO_30A.jpg",
              "width": 60,
              "height": 89
            },
            "x": 0,
            "y": 0
          }
        ],
        "ui": {
          "displayName": false,
          "customImage": true,
          "color": "white",
          "fieldWidth": 70,
          "hide": false,
          "showNameIfSelected": false
        }
      }
    ],
    "internalConnections": [
      {
        "kind": "fuse",
        "fromHandle": "1",
        "toHandle": "2",
        "fuseId": "NominalValue",
        "nominalCurrentField": "NominalValue"
      }
    ],
    "simulation": {
      "version": 1,
      "elements": [
        {
          "id": "fuse",
          "type": "fuse",
          "terminals": {
            "a": "1",
            "b": "2"
          },
          "parameters": {
            "resistanceOhm": {
              "table": {
                "2": 0.085,
                "3": 0.051,
                "4": 0.03,
                "5": 0.025,
                "10": 0.0108,
                "15": 0.0065,
                "20": 0.0048,
                "30": 0.0029,
                "7.5": 0.018
              },
              "by": {
                "select": "NominalValue"
              },
              "default": 0.01
            },
            "nominalCurrentA": {
              "select": "NominalValue"
            }
          }
        }
      ]
    },
    "runtime": {
      "inputFieldsBox": {
        "x": 31,
        "y": 25.5,
        "borderType": "transparent",
        "borderColor": "black",
        "borderLineWidth": 0,
        "borderRadius": "0%",
        "backgroundColor": "transparent",
        "rotate180only": true
      }
    }
  }
});
