import { defineComponent } from '../defineComponent';

export default defineComponent({
  "schemaVersion": 1,
  "source": {
    "type": "core"
  },
  "component": {
    "id": "ESP8266D1mini",
    "version": 1,
    "display": {
      "name": "compData.ESP8266D1mini.name",
      "descriptionShort": "compData.ESP8266D1mini.descriptionShort",
      "description": "compData.ESP8266D1mini.description",
      "group": "controller",
      "buyLinks": []
    },
    "geometry": {
      "image": {
        "url": "./ESP8266D1mini.jpg",
        "width": 162,
        "height": 118
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
        "x": 3,
        "y": 56,
        "xalign": "start",
        "yalign": "start",
        "width": 8,
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
        "x": 45.5,
        "y": 5,
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
        "id": "GPIO15",
        "name": "GPIO 15 (D8)",
        "description": "Digital In/Out; SPI CS",
        "type": "source",
        "x": 57,
        "y": 5,
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
        "id": "GPIO13",
        "name": "GPIO 13 (D7)",
        "description": "Digital In/Out, SPI MOSI",
        "type": "source",
        "x": 69,
        "y": 5,
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
        "id": "GPIO12",
        "name": "GPIO 12 (D6)",
        "description": "Digital In/Out, SPI MISO",
        "type": "source",
        "x": 81,
        "y": 5,
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
        "id": "GPIO14",
        "name": "GPIO 14 (D5)",
        "description": "Digital In/Out, SPI SCLK",
        "type": "source",
        "x": 92.5,
        "y": 5,
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
        "id": "GPIO16",
        "name": "GPIO 16 (D0)",
        "description": "Digital In/Out, wake up pin",
        "type": "source",
        "x": 104.2,
        "y": 5,
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
        "id": "ADC0",
        "name": "ADC0 (A0)",
        "description": "Analog In",
        "type": "source",
        "x": 116,
        "y": 5,
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
        "id": "RST",
        "name": "Reset",
        "description": "Reset input",
        "type": "source",
        "x": 127.5,
        "y": 5,
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
        "x": 45.3,
        "y": 113,
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
        "x": 56.8,
        "y": 113,
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
        "id": "GPIO2",
        "name": "GPIO 2 (D4)",
        "description": "Digital In/Out",
        "type": "source",
        "x": 68.9,
        "y": 113,
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
        "id": "GPIO0",
        "name": "GPIO 0 (D3)",
        "description": "Digital In/Out; be careful: if LOW during boot, then enters flash mode",
        "type": "source",
        "x": 81,
        "y": 113,
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
        "id": "GPIO4",
        "name": "GPIO 4 (D2)",
        "description": "Digital In/Out, I2C SDA",
        "type": "source",
        "x": 92.5,
        "y": 113,
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
        "id": "GPIO5",
        "name": "GPIO 5 (D1)",
        "description": "Digital In/Out, I2C SCL",
        "type": "source",
        "x": 104.2,
        "y": 113,
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
        "id": "GPIO3",
        "name": "GPIO 3 (RX)",
        "description": "Digital In/Out; be careful: used for USB",
        "type": "source",
        "x": 116,
        "y": 113,
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
        "id": "GPIO1",
        "name": "GPIO 1 (TX)",
        "description": "Digital In/Out; be careful: used for USB",
        "type": "source",
        "x": 127.5,
        "y": 113,
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
            "powerW": 0.5,
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
            "powerW": 0.5,
            "minVoltageV": 3
          }
        }
      ]
    },
    "runtime": {
      "noBackgroundImageURL": false
    }
  }
});
