import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "Router",
    "version": 1,
    "display": {
      "name": "compData.Router.name",
      "descriptionShort": "compData.Router.descriptionShort",
      "description": "compData.Router.description",
      "group": "others"
    },
    "geometry": {
      "image": {
        "url": "./Router.png",
        "width": 200,
        "height": 132
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
        "id": "ETH",
        "name": "Ethernet",
        "description": "Ethernet (LAN)",
        "type": "source",
        "x": 192,
        "y": 100.5,
        "xalign": "start",
        "yalign": "start",
        "width": 16,
        "height": 30,
        "postype": "right",
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
          "toleranceMax": 0
        },
        "behavior": {
          "preferredLineWidth": 5
        }
      }
    ]
  }
});
