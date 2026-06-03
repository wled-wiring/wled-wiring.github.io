import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "Elko",
    "version": 1,
    "display": {
      "name": "compData.Elko.name",
      "descriptionShort": "compData.Elko.descriptionShort",
      "description": "compData.Elko.description",
      "group": "electronics"
    },
    "geometry": {
      "image": {
        "url": "./Elko.jpg",
        "width": 88,
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
        "id": "Plus",
        "name": "Plus",
        "description": "Terminal +",
        "type": "source",
        "x": 5.5,
        "y": 7.5,
        "xalign": "start",
        "yalign": "start",
        "width": 10,
        "height": 4,
        "postype": "left",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "red",
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
        "id": "Minus",
        "name": "Minus",
        "description": "Terminal -",
        "type": "source",
        "x": 23,
        "y": 19.5,
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
            "label": "1.0 uF"
          },
          {
            "value": 1.2,
            "label": "1.2 uF"
          },
          {
            "value": 1.5,
            "label": "1.5 uF"
          },
          {
            "value": 1.8,
            "label": "1.8 uF"
          },
          {
            "value": 2.2,
            "label": "2.2 uF"
          },
          {
            "value": 2.7,
            "label": "2.7 uF"
          },
          {
            "value": 3.3,
            "label": "3.3 uF"
          },
          {
            "value": 3.9,
            "label": "3.9 uF"
          },
          {
            "value": 4.7,
            "label": "4.7 uF"
          },
          {
            "value": 5.6,
            "label": "5.6 uF"
          },
          {
            "value": 6.8,
            "label": "6.8 uF"
          },
          {
            "value": 8.2,
            "label": "8.2 uF"
          },
          {
            "value": 10,
            "label": "10 uF"
          },
          {
            "value": 12,
            "label": "12 uF"
          },
          {
            "value": 15,
            "label": "15 uF"
          },
          {
            "value": 18,
            "label": "18 uF"
          },
          {
            "value": 22,
            "label": "22 uF"
          },
          {
            "value": 27,
            "label": "27 uF"
          },
          {
            "value": 33,
            "label": "33 uF"
          },
          {
            "value": 39,
            "label": "39 uF"
          },
          {
            "value": 47,
            "label": "47 uF"
          },
          {
            "value": 56,
            "label": "56 uF"
          },
          {
            "value": 68,
            "label": "68 uF"
          },
          {
            "value": 82,
            "label": "82 uF"
          },
          {
            "value": 100,
            "label": "100 uF"
          },
          {
            "value": 120,
            "label": "120 uF"
          },
          {
            "value": 150,
            "label": "150 uF"
          },
          {
            "value": 180,
            "label": "180 uF"
          },
          {
            "value": 220,
            "label": "220 uF"
          },
          {
            "value": 270,
            "label": "270 uF"
          },
          {
            "value": 330,
            "label": "330 uF"
          },
          {
            "value": 390,
            "label": "390 uF"
          },
          {
            "value": 470,
            "label": "470 uF"
          },
          {
            "value": 560,
            "label": "560 uF"
          },
          {
            "value": 680,
            "label": "680 uF"
          },
          {
            "value": 820,
            "label": "820 uF"
          },
          {
            "value": 1000,
            "label": "1.0 mF"
          },
          {
            "value": 1200,
            "label": "1.2 mF"
          },
          {
            "value": 1500,
            "label": "1.5 mF"
          },
          {
            "value": 1800,
            "label": "1.8 mF"
          },
          {
            "value": 2200,
            "label": "2.2 mF"
          },
          {
            "value": 2700,
            "label": "2.7 mF"
          },
          {
            "value": 3300,
            "label": "3.3 mF"
          },
          {
            "value": 3900,
            "label": "3.9 mF"
          },
          {
            "value": 4700,
            "label": "4.7 mF"
          },
          {
            "value": 5600,
            "label": "5.6 mF"
          },
          {
            "value": 6800,
            "label": "6.8 mF"
          },
          {
            "value": 8200,
            "label": "8.2 mF"
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
        "x": 65,
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
