import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "IRLZ44N",
    "version": 1,
    "display": {
      "name": "compData.IRLZ44N.name",
      "descriptionShort": "compData.IRLZ44N.descriptionShort",
      "description": "compData.IRLZ44N.description",
      "group": "electronics"
    },
    "geometry": {
      "image": {
        "url": "./IRLZ44N.jpg",
        "width": 40,
        "height": 115
      },
      "rotation": 0,
      "rotatable": true,
      "resizableX": false,
      "borderWidth": 2
    },
    "handles": [
      {
        "id": "G",
        "name": "Gate",
        "description": "Gate",
        "type": "source",
        "x": 9,
        "y": 110,
        "xalign": "start",
        "yalign": "start",
        "width": 6,
        "height": 10,
        "postype": "bottom",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "20%"
        },
        "functions": [
          "dig_in"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 16
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "mustBeConnected": true,
          "preferredLineWidth": 1
        }
      },
      {
        "id": "D",
        "name": "Drain",
        "description": "Drain",
        "type": "source",
        "x": 20,
        "y": 110,
        "xalign": "start",
        "yalign": "start",
        "width": 6,
        "height": 10,
        "postype": "bottom",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "20%"
        },
        "functions": [
          "pwm_out"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 55
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "mustBeConnected": true,
          "preferredLineWidth": 1
        }
      },
      {
        "id": "S",
        "name": "Source",
        "description": "Source",
        "type": "source",
        "x": 31,
        "y": 110,
        "xalign": "start",
        "yalign": "start",
        "width": 6,
        "height": 10,
        "postype": "bottom",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
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
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {
          "preferredLineWidth": 1
        }
      }
    ]
  }
});
