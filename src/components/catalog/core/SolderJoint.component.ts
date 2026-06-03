import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "SolderJoint",
    "version": 1,
    "display": {
      "name": "compData.SolderJoint.name",
      "descriptionShort": "compData.SolderJoint.descriptionShort",
      "description": "compData.SolderJoint.description",
      "group": "others"
    },
    "geometry": {
      "image": {
        "url": "./SolderJoint.jpg",
        "width": 16,
        "height": 16
      },
      "noBackgroundImage": true,
      "rotation": 0,
      "rotatable": false,
      "resizableX": false,
      "borderWidth": 2,
      "nodeOrigin": [
        0.5,
        0.5
      ]
    },
    "handles": [
      {
        "id": "hid1",
        "name": "Solder joint pin",
        "type": "source",
        "x": 8,
        "y": 8,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "solid",
          "color": "rgb(0,0,0)",
          "lineWidth": 2,
          "radius": "50%"
        },
        "voltage": {},
        "behavior": {
          "changeColorAutomatically": true
        },
        "internallyProtected": true
      }
    ],
    "simulation": {
      "version": 1,
      "elements": []
    }
  }
});
