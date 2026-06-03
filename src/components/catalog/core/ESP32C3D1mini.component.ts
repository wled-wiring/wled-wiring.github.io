import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "ESP32C3D1mini",
    "version": 1,
    "display": {
      "name": "compData.ESP32C3D1mini.name",
      "descriptionShort": "compData.ESP32C3D1mini.descriptionShort",
      "description": "compData.ESP32C3D1mini.description",
      "group": "controller"
    },
    "geometry": {
      "image": {
        "url": "./ESP32C3D1mini.png",
        "width": 158,
        "height": 122
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
        "y": 58,
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
        "id": "3V3",
        "name": "3.3 V",
        "description": "3.3 V",
        "type": "source",
        "x": 40.9,
        "y": 5.2,
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
        "id": "GPIO5",
        "name": "GPIO 5",
        "description": "Digital In/Out, Analog In (ADC2)",
        "type": "source",
        "x": 53,
        "y": 5.2,
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
        "id": "GPIO4",
        "name": "GPIO 4",
        "description": "Digital In/Out, Analog In (ADC1)",
        "type": "source",
        "x": 64.6,
        "y": 5.2,
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
        "x": 76.4,
        "y": 5.2,
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
        "x": 88,
        "y": 5.2,
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
        "id": "GPIO2",
        "name": "GPIO 2",
        "description": "Digital In/Out, Analog In (ADC1); be careful: strapping pin, do not push LOW at boot",
        "type": "source",
        "x": 100,
        "y": 5.2,
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
        "x": 111.5,
        "y": 5.2,
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
        "id": "EN",
        "name": "Enable",
        "description": "Enable input: shutdown if LOW",
        "type": "source",
        "x": 123.4,
        "y": 5.2,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
        "height": 8,
        "postype": "centered",
        "position": "left",
        "border": {
          "type": "dashed",
          "color": "blue",
          "lineWidth": 1,
          "radius": "50%"
        },
        "functions": [
          "rst"
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
        "id": "5V",
        "name": "5V",
        "description": "5V",
        "type": "source",
        "x": 40.6,
        "y": 112,
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
        "x": 52.1,
        "y": 112,
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
        "id": "GPIO6",
        "name": "GPIO 6",
        "description": "Digital In/Out",
        "type": "source",
        "x": 64.3,
        "y": 112,
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
        "x": 76,
        "y": 112,
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
        "x": 87.6,
        "y": 112,
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
        "x": 99.6,
        "y": 112,
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
        "x": 111.2,
        "y": 112,
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
        "x": 123,
        "y": 112,
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
