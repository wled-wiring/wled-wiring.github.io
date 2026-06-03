import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "WAGO_2X",
    "version": 1,
    "display": {
      "name": "compData.WAGO_2X.name",
      "descriptionShort": "compData.WAGO_2X.descriptionShort",
      "description": "compData.WAGO_2X.description",
      "group": "electronics"
    },
    "geometry": {
      "image": {
        "url": "./WAGO_2X.jpg",
        "width": 40,
        "height": 56
      },
      "rotation": 0,
      "rotatable": true,
      "resizableX": false,
      "borderWidth": 2
    },
    "handles": [
      {
        "id": "1",
        "name": "Terminal 1",
        "description": "Terminal 1",
        "type": "source",
        "x": 11,
        "y": 51,
        "xalign": "start",
        "yalign": "start",
        "width": 12,
        "height": 10,
        "postype": "bottom",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "black",
          "lineWidth": 0.8,
          "radius": "20%"
        },
        "functions": [
          "suppl_conn",
          "general_conn"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 0
        },
        "Imax": 32,
        "maxCrossSectionAbsolute": 4,
        "behavior": {
          "preferredLineWidth": 1
        }
      },
      {
        "id": "2",
        "name": "Terminal 2",
        "description": "Terminal 2",
        "type": "source",
        "x": 29,
        "y": 51,
        "xalign": "start",
        "yalign": "start",
        "width": 12,
        "height": 10,
        "postype": "bottom",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "black",
          "lineWidth": 0.8,
          "radius": "20%"
        },
        "functions": [
          "suppl_conn",
          "general_conn"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 0
        },
        "Imax": 32,
        "maxCrossSectionAbsolute": 4,
        "behavior": {
          "preferredLineWidth": 1
        }
      }
    ],
    "simulation": {
      "version": 1,
      "elements": [
        {
          "id": "terminal-bridge",
          "type": "shortBridge",
          "terminals": {
            "a": "1",
            "b": "2"
          }
        }
      ]
    }
  }
});
