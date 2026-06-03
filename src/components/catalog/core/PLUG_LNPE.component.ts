import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "PLUG_LNPE",
    "version": 1,
    "display": {
      "name": "compData.PLUG_LNPE.name",
      "descriptionShort": "compData.PLUG_LNPE.descriptionShort",
      "description": "compData.PLUG_LNPE.description",
      "group": "psu"
    },
    "geometry": {
      "image": {
        "url": "./Plug_LNPE.jpg",
        "width": 120,
        "height": 60
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
        "id": "L",
        "name": "L",
        "description": "Line 110~V/230~V",
        "type": "source",
        "x": 117,
        "y": 18.5,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "right",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "#996600",
          "lineWidth": 0.8,
          "radius": "20%"
        },
        "functions": [
          "line_out"
        ],
        "voltage": {},
        "maxCrossSectionAbsolute": 2.5,
        "behavior": {
          "preferredLineWidth": 3
        }
      },
      {
        "id": "N",
        "name": "N",
        "description": "Neutral 110~V/230~V",
        "type": "source",
        "x": 117,
        "y": 29,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "right",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "#005ce6",
          "lineWidth": 0.8,
          "radius": "20%"
        },
        "functions": [
          "neutral_out"
        ],
        "voltage": {},
        "maxCrossSectionAbsolute": 2.5,
        "behavior": {
          "preferredLineWidth": 3
        }
      },
      {
        "id": "PE",
        "name": "PE",
        "description": "Protective earth",
        "type": "source",
        "x": 117,
        "y": 39.5,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "right",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "#ccff33",
          "lineWidth": 0.8,
          "radius": "20%"
        },
        "functions": [
          "pe_out"
        ],
        "voltage": {},
        "maxCrossSectionAbsolute": 2.5,
        "behavior": {
          "preferredLineWidth": 3
        }
      }
    ]
  }
});
