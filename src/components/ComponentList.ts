import { ESP32D1mini } from "./ComponentTypes/ESP32D1mini";
import { WS2812B_5V_30LPM } from "./ComponentTypes/WS2812B_5V_30LPM.ts";

import { ESP8266D1mini } from "./ComponentTypes/ESP8266D1mini.ts";
import { ESP32C3D1mini } from "./ComponentTypes/ESP32C3D1mini.ts";
import { ESP32S3D1mini } from "./ComponentTypes/ESP32S3D1mini.ts";
import { miniOTOFuse } from "./ComponentTypes/miniOTOFuse.ts";
import { PSU_USB } from "./ComponentTypes/PSU_USB";
import { PSU_USB_WIRES } from "./ComponentTypes/PSU_USB_WIRES";
import { SolderJoint } from "./ComponentTypes/SolderJoint";
import { InfoNode } from "./ComponentTypes/InfoNode";
import { LineBoxNode } from "./ComponentTypes/LineBoxNode";
import { PSU_HP } from "./ComponentTypes/PSU_HP.ts";
import { PLUG_LNPE } from "./ComponentTypes/Plug_LNPE.ts";
import { SN74AHCT125N } from "./ComponentTypes/SN74AHCT125N.ts";
import { Button } from "./ComponentTypes/Button.ts";
import { PIR_HCSR501 } from "./ComponentTypes/PIR_HCSR501.ts";
import { IR_KY022 } from "./ComponentTypes/IR_KY022.ts";
import { IR_TSOP38238 } from "./ComponentTypes/IR_TSOP38238.ts";
import { DC_JACK_FEMALE } from "./ComponentTypes/DC_JACK_FEMALE.ts";
import { WAGO_2X } from "./ComponentTypes/WAGO_2X.ts";
import { WAGO_3X } from "./ComponentTypes/WAGO_3X.ts";
import { ESP32_30P } from "./ComponentTypes/ESP32_30P.ts";
import { ESP32_38P } from "./ComponentTypes/ESP32_38P.ts";
import { Resistor } from "./ComponentTypes/Resistor.ts";
import { Elko } from "./ComponentTypes/Elko.ts";
import { Kerko } from "./ComponentTypes/Kerko.ts";
import { INMP441 } from "./ComponentTypes/INMP441.ts";
import { LM2596_PCB } from "./ComponentTypes/LM2596_PCB.ts";
import { DCDC_mini } from "./ComponentTypes/DCDC_mini.ts";
import { IRLZ44N } from "./ComponentTypes/IRLZ44N.ts";
import { FUSE_Board } from "./ComponentTypes/FUSE_Board.ts";
import { MHC_V43 } from "./ComponentTypes/MHC_V43.ts";
import {Router} from "./ComponentTypes/Router.ts";
import {AUDIO_SOURCE} from "./ComponentTypes/AUDIO_SOURCE.ts";
import {MHC_V63} from "./ComponentTypes/MHC_V63.ts";
import { MHC_Relay12V} from "./ComponentTypes/MHC_Relay12V.ts";
import { MHC_Relay5V} from "./ComponentTypes/MHC_Relay5V.ts";
import { MHC_Relay24V} from "./ComponentTypes/MHC_Relay24V.ts";
import {WS2814_24V_60LPM} from "./ComponentTypes/WS2814_24V_60LPM.ts";
import {WS2813_5V_60LPM} from "./ComponentTypes/WS2813_5V_60LPM.ts";
import {WS2814_12V_30LPM} from "./ComponentTypes/WS2814_12V_30LPM.ts";
import {WS2818_12V_30LPM} from "./ComponentTypes/WS2818_12V_30LPM.ts";
import {FCOB_12V_720LPM} from "./ComponentTypes/FCOB_12V_720LPM.ts";
import {FCOB_24V_720LPM} from "./ComponentTypes/FCOB_24V_720LPM.ts";
import {FCOB_24V_784LPM} from "./ComponentTypes/FCOB_24V_784LPM.ts";
import {APA102_5V_30LPM} from "./ComponentTypes/APA102_5V_30LPM.ts";
import {AN_WHITE_24V_240LPM} from "./ComponentTypes/AN_WHITE_24V_240LPM.ts";
import {AN_RGB_CCT_48V_90LPM} from "./ComponentTypes/AN_RGB_CCT_48V_90LPM.ts";
import {ESP32C3_supermini} from "./ComponentTypes/ESP32C3_supermini.ts";
import {WS2815_12V_30LPM} from "./ComponentTypes/WS2815_12V_30LPM.ts";
import {WS2805_24V_60LPM} from "./ComponentTypes/WS2805_24V_60LPM.ts";
import {WS2805_12V_60LPM} from "./ComponentTypes/WS2805_12V_60LPM.ts";
import {MHC_SwitchBoard} from "./ComponentTypes/MHC_SwitchBoard.ts";
import {MHC_RS485_R} from "./ComponentTypes/MHC_RS485_R.ts";

export const ComponentList = [
    ESP32D1mini,
    ESP32_30P,
	ESP32_38P,
    ESP8266D1mini,
    ESP32C3D1mini,
    ESP32S3D1mini,
    MHC_V43,
    miniOTOFuse,
    FUSE_Board,
    PSU_USB,
    PSU_USB_WIRES,
    PSU_HP,
    PLUG_LNPE,
    SN74AHCT125N,
    Button,
    Resistor,
    Elko,
    Kerko,
    LM2596_PCB,
    DCDC_mini,
    IRLZ44N,
    INMP441,
    PIR_HCSR501,
    IR_KY022,
    IR_TSOP38238,
    DC_JACK_FEMALE,
    WAGO_2X,
    WAGO_3X,
    SolderJoint,
    InfoNode,
    LineBoxNode,
    Router,
    AUDIO_SOURCE,
    MHC_V63,
    MHC_SwitchBoard,
    MHC_Relay12V,
    MHC_Relay5V,
    MHC_Relay24V,
    MHC_RS485_R,
    WS2812B_5V_30LPM,
    WS2813_5V_60LPM,
    WS2814_12V_30LPM,
    WS2814_24V_60LPM,
    WS2815_12V_30LPM,
    WS2818_12V_30LPM,
    WS2805_24V_60LPM,
    WS2805_12V_60LPM,
    FCOB_12V_720LPM,
    FCOB_24V_720LPM,
    FCOB_24V_784LPM,
    APA102_5V_30LPM,
    AN_WHITE_24V_240LPM,
    AN_RGB_CCT_48V_90LPM,
    ESP32C3_supermini,
] as const;

