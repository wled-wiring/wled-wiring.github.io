import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "LineBoxNode",
    "version": 1,
    "display": {
      "name": "compData.LineBoxNode.name",
      "descriptionShort": "compData.LineBoxNode.descriptionShort",
      "description": "compData.LineBoxNode.description",
      "group": "others"
    },
    "geometry": {
      "image": {
        "url": "./LineBox.jpg",
        "width": 100,
        "height": 10
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
    "handles": [],
    "runtime": {
      "applyNodeResizer": true,
      "putToBackground": true,
      "onlyBorder": false,
      "changableColor": true,
      "color": "#000000"
    }
  }
});
