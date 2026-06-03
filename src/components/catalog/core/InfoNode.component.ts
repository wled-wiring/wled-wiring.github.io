import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "InfoNode",
    "version": 1,
    "display": {
      "name": "compData.InfoNode.name",
      "descriptionShort": "compData.InfoNode.descriptionShort",
      "description": "compData.InfoNode.description",
      "group": "others"
    },
    "geometry": {
      "image": {
        "url": "./Info.jpg",
        "width": 100,
        "height": 50
      },
      "noBackgroundImage": true,
      "rotation": 0,
      "rotatable": false,
      "resizableX": false,
      "borderWidth": 0,
      "nodeOrigin": [
        0.5,
        0.5
      ]
    },
    "handles": [],
    "runtime": {
      "applyNodeResizer": true,
      "changableTextColor": true,
      "textColor": "#000000",
      "infoText": "",
      "infoTextSize": 12,
      "infoTextFontFamily": "Arial, sans-serif",
      "infoTextBold": false,
      "infoTextAlign": "left"
    }
  }
});
