import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "Kerko",
    "version": 1,
    "display": {
      "name": "compData.Kerko.name",
      "descriptionShort": "compData.Kerko.descriptionShort",
      "description": "compData.Kerko.description",
      "group": "electronics"
    },
    "geometry": {
      "image": {
        "url": "./Kerko.jpg",
        "width": 52,
        "height": 26
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
        "id": "1",
        "name": "1",
        "description": "Terminal 1",
        "type": "source",
        "x": 5.5,
        "y": 1.8,
        "xalign": "start",
        "yalign": "start",
        "width": 10,
        "height": 4,
        "postype": "left",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "black",
          "lineWidth": 0.8,
          "radius": "30%"
        },
        "functions": [
          "dig_in"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 250
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "mustBeConnected": true,
          "preferredLineWidth": 1
        }
      },
      {
        "id": "2",
        "name": "2",
        "description": "Terminal 2",
        "type": "source",
        "x": 5.5,
        "y": 25,
        "xalign": "start",
        "yalign": "start",
        "width": 10,
        "height": 4,
        "postype": "left",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "black",
          "lineWidth": 0.8,
          "radius": "30%"
        },
        "functions": [
          "dig_in"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 250
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "mustBeConnected": true,
          "preferredLineWidth": 1
        }
      }
    ],
    "fields": [
      {
        "id": "NominalValue",
        "type": "select",
        "name": "C",
        "selectedValue": 100,
        "unit": "F",
        "options": [
          {
            "value": 1,
            "label": "1.0 nF"
          },
          {
            "value": 1.2,
            "label": "1.2 nF"
          },
          {
            "value": 1.5,
            "label": "1.5 nF"
          },
          {
            "value": 1.8,
            "label": "1.8 nF"
          },
          {
            "value": 2.2,
            "label": "2.2 nF"
          },
          {
            "value": 2.7,
            "label": "2.7 nF"
          },
          {
            "value": 3.3,
            "label": "3.3 nF"
          },
          {
            "value": 3.9,
            "label": "3.9 nF"
          },
          {
            "value": 4.7,
            "label": "4.7 nF"
          },
          {
            "value": 5.6,
            "label": "5.6 nF"
          },
          {
            "value": 6.8,
            "label": "6.8 nF"
          },
          {
            "value": 8.2,
            "label": "8.2 nF"
          },
          {
            "value": 10,
            "label": "10 nF"
          },
          {
            "value": 12,
            "label": "12 nF"
          },
          {
            "value": 15,
            "label": "15 nF"
          },
          {
            "value": 18,
            "label": "18 nF"
          },
          {
            "value": 22,
            "label": "22 nF"
          },
          {
            "value": 27,
            "label": "27 nF"
          },
          {
            "value": 33,
            "label": "33 nF"
          },
          {
            "value": 39,
            "label": "39 nF"
          },
          {
            "value": 47,
            "label": "47 nF"
          },
          {
            "value": 56,
            "label": "56 nF"
          },
          {
            "value": 68,
            "label": "68 nF"
          },
          {
            "value": 82,
            "label": "82 nF"
          },
          {
            "value": 100,
            "label": "100 nF"
          },
          {
            "value": 120,
            "label": "120 nF"
          },
          {
            "value": 150,
            "label": "150 nF"
          },
          {
            "value": 180,
            "label": "180 nF"
          },
          {
            "value": 220,
            "label": "220 nF"
          },
          {
            "value": 270,
            "label": "270 nF"
          },
          {
            "value": 330,
            "label": "330 nF"
          },
          {
            "value": 390,
            "label": "390 nF"
          },
          {
            "value": 470,
            "label": "470 nF"
          },
          {
            "value": 560,
            "label": "560 nF"
          },
          {
            "value": 680,
            "label": "680 nF"
          },
          {
            "value": 820,
            "label": "820 nF"
          }
        ],
        "ui": {
          "displayName": false,
          "customImage": false,
          "color": "black",
          "fieldWidth": 100
        }
      }
    ],
    "runtime": {
      "inputFieldsBox": {
        "x": 40,
        "y": 32,
        "borderType": "transparent",
        "borderColor": "black",
        "borderLineWidth": 0,
        "borderRadius": "0%",
        "backgroundColor": "transparent",
        "rotate180only": true
      }
    },
    "simulation": {
      "version": 1
    }
  }
});
