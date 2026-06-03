import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "WS2813_5V_60LPM",
    "version": 1,
    "display": {
      "name": "compData.WS2813_5V_60LPM.name",
      "descriptionShort": "compData.WS2813_5V_60LPM.descriptionShort",
      "description": "compData.WS2813_5V_60LPM.description",
      "group": "led",
      "showName": true
    },
    "geometry": {
      "image": {
        "url": "./WS2813_5V_60LPM.png",
        "width": 42,
        "height": 25
      },
      "rotation": 0,
      "rotatable": true,
      "resizableX": true,
      "borderWidth": 2,
      "nodeOrigin": [
        0.5,
        0.5
      ]
    },
    "physical": {
      "lengthStep": 0.016667
    },
    "handles": [
      {
        "id": "5V_start",
        "name": "5V pin",
        "description": "5V supply input",
        "type": "source",
        "x": 2.7,
        "y": 22.4,
        "xalign": "start",
        "yalign": "start",
        "width": 6,
        "height": 5,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "red",
          "lineWidth": 0.8,
          "radius": "30%"
        },
        "functions": [
          "suppl_in"
        ],
        "voltage": {
          "toleranceMin": 4,
          "toleranceMax": 5
        },
        "Imax": 10,
        "maxCrossSectionAbsolute": 0.75,
        
        "behavior": {
          "preferredLineDirection": "left"
        }
      },
      {
        "id": "BACKUP_start",
        "name": "Backup input",
        "description": "Must be tied to GND",
        "type": "source",
        "x": 2.7,
        "y": 9.6,
        "xalign": "start",
        "yalign": "start",
        "width": 6,
        "height": 5,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "30%"
        },
        "functions": [
          "dig_backup_in"
        ],
        "voltage": {
          "toleranceMin": 4.5,
          "toleranceMax": 5.2
        },
        "maxCrossSectionAbsolute": 0.75,
        
        "behavior": {
          "mustBeConnected": true,
          "preferredLineDirection": "left"
        }
      },
      {
        "id": "DATA_start",
        "name": "DATA input",
        "description": "",
        "type": "source",
        "x": 2.7,
        "y": 16,
        "xalign": "start",
        "yalign": "start",
        "width": 6,
        "height": 5,
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
          "toleranceMin": 4.5,
          "toleranceMax": 5.2
        },
        "maxCrossSectionAbsolute": 0.75,
        
        "behavior": {
          "mustBeConnected": true,
          "preferredLineDirection": "left"
        }
      },
      {
        "id": "GND_start",
        "name": "GND pin",
        "description": "",
        "type": "source",
        "x": 2.7,
        "y": 3.2,
        "xalign": "start",
        "yalign": "start",
        "width": 6,
        "height": 5,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "black",
          "lineWidth": 0.8,
          "radius": "30%"
        },
        "functions": [
          "gnd"
        ],
        "voltage": {},
        "Imax": 10,
        "maxCrossSectionAbsolute": 0.75,
        
        "behavior": {
          "preferredLineDirection": "left"
        }
      },
      {
        "id": "5V_end",
        "name": "5V pin",
        "description": "5V supply input",
        "type": "source",
        "x": 2.7,
        "y": 22.4,
        "xalign": "end",
        "yalign": "start",
        "width": 6,
        "height": 5,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "red",
          "lineWidth": 0.8,
          "radius": "30%"
        },
        "functions": [
          "suppl_in"
        ],
        "voltage": {
          "toleranceMin": 4,
          "toleranceMax": 5
        },
        "Imax": 10,
        "maxCrossSectionAbsolute": 0.75,
        
        "behavior": {
          "preferredLineDirection": "right"
        }
      },
      {
        "id": "BACKUP_end",
        "name": "Backup output",
        "description": "",
        "type": "source",
        "x": 2.7,
        "y": 9.6,
        "xalign": "end",
        "yalign": "start",
        "width": 6,
        "height": 5,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "30%"
        },
        "functions": [
          "dig_backup_out"
        ],
        "voltage": {
          "out": 5,
          "toleranceMin": 4.5,
          "toleranceMax": 5.2
        },
        "maxCrossSectionAbsolute": 0.75,
        
        "behavior": {
          "preferredLineDirection": "right"
        }
      },
      {
        "id": "DATA_end",
        "name": "DATA output",
        "description": "",
        "type": "source",
        "x": 2.7,
        "y": 16,
        "xalign": "end",
        "yalign": "start",
        "width": 6,
        "height": 5,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "30%"
        },
        "functions": [
          "dig_out"
        ],
        "voltage": {
          "out": 5,
          "toleranceMin": 4.5,
          "toleranceMax": 5.2
        },
        "maxCrossSectionAbsolute": 0.75,
        
        "behavior": {
          "preferredLineDirection": "right"
        }
      },
      {
        "id": "GND_end",
        "name": "GND pin",
        "description": "",
        "type": "source",
        "x": 2.7,
        "y": 3.2,
        "xalign": "end",
        "yalign": "start",
        "width": 6,
        "height": 5,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "black",
          "lineWidth": 0.8,
          "radius": "30%"
        },
        "functions": [
          "gnd"
        ],
        "voltage": {},
        "Imax": 10,
        "maxCrossSectionAbsolute": 0.75,
        
        "behavior": {
          "preferredLineDirection": "right"
        }
      },
      {
        "id": "5V_middle",
        "name": "5V pin",
        "description": "5V supply input",
        "type": "source",
        "x": 0,
        "y": 22.4,
        "xalign": "start",
        "yalign": "start",
        "width": 10,
        "height": 5,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "red",
          "lineWidth": 0.8,
          "radius": "30%"
        },
        "functions": [
          "suppl_in"
        ],
        "voltage": {
          "toleranceMin": 4,
          "toleranceMax": 5
        },
        "Imax": 10,
        "maxCrossSectionAbsolute": 0.75,
        
        "behavior": {
          "repeated": true,
          "repeatAtFirst": false
        }
      },
      {
        "id": "BACKUP_middle",
        "name": "Backup",
        "description": "Must be tied to GND",
        "type": "source",
        "x": 0,
        "y": 9.6,
        "xalign": "start",
        "yalign": "start",
        "width": 10,
        "height": 5,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "30%"
        },
        "functions": [
          "not_connected"
        ],
        "voltage": {
          "toleranceMin": 4.5,
          "toleranceMax": 5.2
        },
        "maxCrossSectionAbsolute": 0.75,
        
        "behavior": {
          "repeated": true,
          "repeatAtFirst": false
        }
      },
      {
        "id": "DATA_middle",
        "name": "DATA",
        "description": "",
        "type": "source",
        "x": 0,
        "y": 16,
        "xalign": "start",
        "yalign": "start",
        "width": 10,
        "height": 5,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "green",
          "lineWidth": 0.8,
          "radius": "30%"
        },
        "functions": [
          "not_connected"
        ],
        "voltage": {
          "toleranceMin": 4.5,
          "toleranceMax": 5.2
        },
        "maxCrossSectionAbsolute": 0.75,
        
        "behavior": {
          "repeated": true,
          "repeatAtFirst": false
        }
      },
      {
        "id": "GND_middle",
        "name": "GND pin",
        "description": "GND",
        "type": "source",
        "x": 0,
        "y": 3.2,
        "xalign": "start",
        "yalign": "start",
        "width": 10,
        "height": 5,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "black",
          "lineWidth": 0.8,
          "radius": "30%"
        },
        "functions": [
          "gnd"
        ],
        "voltage": {},
        "Imax": 10,
        "maxCrossSectionAbsolute": 0.75,
        
        "behavior": {
          "repeated": true,
          "repeatAtFirst": false
        }
      }
    ]
  }
});
