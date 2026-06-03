import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "Button",
    "version": 1,
    "display": {
      "name": "compData.Button.name",
      "descriptionShort": "compData.Button.descriptionShort",
      "description": "compData.Button.description",
      "group": "electronics",
      "buyLinks": []
    },
    "geometry": {
      "image": {
        "url": "./Button.jpg",
        "width": 80,
        "height": 29
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
        "y": 27,
        "xalign": "start",
        "yalign": "start",
        "width": 10,
        "height": 4,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
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
        "x": 75,
        "y": 27,
        "xalign": "start",
        "yalign": "start",
        "width": 10,
        "height": 4,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
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
        "behavior": {
          "mustBeConnected": true,
          "preferredLineWidth": 1
        }
      }
    ],
    "simulation": {
      "version": 1
    }
  }
});
