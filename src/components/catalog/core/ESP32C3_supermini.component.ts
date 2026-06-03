import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "ESP32C3_supermini",
    "version": 1,
    "display": {
      "name": "compData.ESP32C3_supermini.name",
      "descriptionShort": "compData.ESP32C3_supermini.descriptionShort",
      "description": "compData.ESP32C3_supermini.description",
      "group": "controller"
    },
    "geometry": {
      "image": {
        "url": "./ESP32C3_supermini.png",
        "width": 110,
        "height": 83
      },
      "rotation": 0,
      "rotatable": true,
      "resizableX": false,
      "borderWidth": 2
    },
    "handles": [
      {
        "id": "USB",
        "name": "USB",
        "description": "USB (power and data)",
        "type": "source",
        "x": 17,
        "y": 41,
        "xalign": "start",
        "yalign": "start",
        "width": 35,
        "height": 40,
        "postype": "left",
        "position": "left",
        "border": {
          "type": "dotted",
          "color": "#8c8c8c",
          "lineWidth": 2,
          "radius": "5%"
        },
        "functions": [
          "usb_full"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 5.5
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {}
      },
      {
        "id": "5V",
        "name": "5V",
        "description": "5V",
        "type": "source",
        "x": 14,
        "y": 6,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "red",
          "lineWidth": 1,
          "radius": "50%"
        },
        "functions": [
          "suppl_in",
          "suppl_out"
        ],
        "voltage": {
          "out": 5,
          "toleranceMin": 0,
          "toleranceMax": 5.5
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
		"Imax": 1.1,
        "behavior": {}
      },
      {
        "id": "GND",
        "name": "GND",
        "description": "GND",
        "type": "source",
        "x": 26,
        "y": 6,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "black",
          "lineWidth": 1,
          "radius": "50%"
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
		"Imax": 1.2,
        "behavior": {}
      },
      {
        "id": "3V3",
        "name": "3.3 V",
        "description": "3.3 V",
        "type": "source",
        "x": 38,
        "y": 6,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "red",
          "lineWidth": 1,
          "radius": "50%"
        },
        "functions": [
          "suppl_in",
          "suppl_out"
        ],
        "voltage": {
          "out": 3.3,
          "toleranceMin": 3,
          "toleranceMax": 3.6
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
		"Imax": 0.2,
        "behavior": {}
      },
      {
        "id": "GPIO4",
        "name": "GPIO 4",
        "description": "Digital In/Out, Analog In (ADC1)",
        "type": "source",
        "x": 50,
        "y": 6,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "green",
          "lineWidth": 1,
          "radius": "50%"
        },
        "functions": [
          "dig_in",
          "dig_out",
          "an_in"
        ],
        "voltage": {
          "out": 3.3,
          "toleranceMin": 0,
          "toleranceMax": 3.6
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {}
      },
      {
        "id": "GPIO3",
        "name": "GPIO 3",
        "description": "Digital In/Out, Analog In (ADC1)",
        "type": "source",
        "x": 62,
        "y": 6,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "green",
          "lineWidth": 1,
          "radius": "50%"
        },
        "functions": [
          "dig_in",
          "dig_out",
          "an_in"
        ],
        "voltage": {
          "out": 0,
          "toleranceMin": 0,
          "toleranceMax": 3.6
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {}
      },
      {
        "id": "GPIO2",
        "name": "GPIO 2",
        "description": "Digital In/Out, Analog In (ADC1); be careful: strapping pin, do not push LOW at boot",
        "type": "source",
        "x": 72,
        "y": 6,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "green",
          "lineWidth": 1,
          "radius": "50%"
        },
        "functions": [
          "dig_in",
          "dig_out",
          "an_in"
        ],
        "voltage": {
          "out": 3.3,
          "toleranceMin": 0,
          "toleranceMax": 3.6
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {}
      },
      {
        "id": "GPIO1",
        "name": "GPIO 1",
        "description": "Digital In/Out, Analog In (ADC1)",
        "type": "source",
        "x": 84,
        "y": 6,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "green",
          "lineWidth": 1,
          "radius": "50%"
        },
        "functions": [
          "dig_in",
          "dig_out",
          "an_in"
        ],
        "voltage": {
          "out": 3.3,
          "toleranceMin": 0,
          "toleranceMax": 3.6
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {}
      },
      {
        "id": "GPIO0",
        "name": "GPIO 0",
        "description": "Digital In/Out, Analog In (ADC1)",
        "type": "source",
        "x": 96,
        "y": 6,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "green",
          "lineWidth": 1,
          "radius": "50%"
        },
        "functions": [
          "dig_in",
          "dig_out",
          "an_in"
        ],
        "voltage": {
          "out": 3.3,
          "toleranceMin": 0,
          "toleranceMax": 3.6
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {}
      },
      {
        "id": "GPIO5",
        "name": "GPIO 5",
        "description": "Digital In/Out, Analog In (ADC2)",
        "type": "source",
        "x": 14,
        "y": 77,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "green",
          "lineWidth": 1,
          "radius": "50%"
        },
        "functions": [
          "dig_in",
          "dig_out",
          "an_in"
        ],
        "voltage": {
          "out": 3.3,
          "toleranceMin": 0,
          "toleranceMax": 3.6
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {}
      },
      {
        "id": "GPIO6",
        "name": "GPIO 6",
        "description": "Digital In/Out",
        "type": "source",
        "x": 26,
        "y": 77,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "green",
          "lineWidth": 1,
          "radius": "50%"
        },
        "functions": [
          "dig_in",
          "dig_out"
        ],
        "voltage": {
          "out": 3.3,
          "toleranceMin": 0,
          "toleranceMax": 3.6
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {}
      },
      {
        "id": "GPIO7",
        "name": "GPIO 7",
        "description": "Digital In/Out; onboard RGB LED",
        "type": "source",
        "x": 38,
        "y": 77,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "green",
          "lineWidth": 1,
          "radius": "50%"
        },
        "functions": [
          "dig_in",
          "dig_out"
        ],
        "voltage": {
          "out": 3.3,
          "toleranceMin": 0,
          "toleranceMax": 3.6
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {}
      },
      {
        "id": "GPIO8",
        "name": "GPIO 8",
        "description": "Digital In/Out; be careful: strapping pin, do not push LOW at boot",
        "type": "source",
        "x": 50,
        "y": 77,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "green",
          "lineWidth": 1,
          "radius": "50%"
        },
        "functions": [
          "dig_in",
          "dig_out"
        ],
        "voltage": {
          "out": 3.3,
          "toleranceMin": 0,
          "toleranceMax": 3.6
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {}
      },
      {
        "id": "GPIO9",
        "name": "GPIO 9",
        "description": "Digital In/Out",
        "type": "source",
        "x": 62,
        "y": 77,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "green",
          "lineWidth": 1,
          "radius": "50%"
        },
        "functions": [
          "dig_in",
          "dig_out"
        ],
        "voltage": {
          "out": 3.3,
          "toleranceMin": 0,
          "toleranceMax": 3.6
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {}
      },
      {
        "id": "GPIO10",
        "name": "GPIO 10",
        "description": "Digital In/Out",
        "type": "source",
        "x": 73,
        "y": 77,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "green",
          "lineWidth": 1,
          "radius": "50%"
        },
        "functions": [
          "dig_in",
          "dig_out"
        ],
        "voltage": {
          "out": 3.3,
          "toleranceMin": 0,
          "toleranceMax": 3.6
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {}
      },
      {
        "id": "GPIO20",
        "name": "GPIO 20 (RX)",
        "description": "Digital In/Out; be careful: used for USB",
        "type": "source",
        "x": 85,
        "y": 77,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "green",
          "lineWidth": 1,
          "radius": "50%"
        },
        "functions": [
          "dig_in",
          "dig_out"
        ],
        "voltage": {
          "out": 3.3,
          "toleranceMin": 0,
          "toleranceMax": 3.6
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {}
      },
      {
        "id": "GPIO21",
        "name": "GPIO 21 (TX)",
        "description": "Digital In/Out; be careful: used for USB",
        "type": "source",
        "x": 97,
        "y": 77,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "green",
          "lineWidth": 1,
          "radius": "50%"
        },
        "functions": [
          "dig_in",
          "dig_out"
        ],
        "voltage": {
          "out": 3.3,
          "toleranceMin": 0,
          "toleranceMax": 3.6
        },
        "maxCrossSectionAbsolute": 0.75,
        "maxCrossSectionWarning": 0.5,
        "behavior": {}
      }
    ],
    "simulation": {
      "version": 1,
      "ports": [
        {
          "id": "usb-power",
          "type": "usbPowerPair",
          "handle": "USB",
          "positiveTerminal": "USB.VBUS",
          "negativeTerminal": "USB.GND"
        }
      ],
      "elements": [
        {
          "id": "usb-gnd-bridge",
          "type": "shortBridge",
          "terminals": {
            "a": "USB.GND",
            "b": "GND"
          }
        },
        {
          "id": "usb-vbus-diode",
          "type": "diode",
          "terminals": {
            "anode": "USB.VBUS",
            "cathode": "5V"
          },
          "parameters": {
            "forwardVoltageV": 0.4
          }
        },
        {
          "id": "idle-load-5V",
          "type": "constantPowerSink",
          "terminals": {
            "positive": "5V",
            "negative": "GND"
          },
          "parameters": {
            "powerW": 0.3,
            "minVoltageV": 3
          }
        },
        {
          "id": "idle-load-3V3",
          "type": "constantPowerSink",
          "terminals": {
            "positive": "3V3",
            "negative": "GND"
          },
          "parameters": {
            "powerW": 0.3,
            "minVoltageV": 3
          }
        }
      ]
    }
  }
});
