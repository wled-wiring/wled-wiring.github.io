import type { Edge, Node } from "@xyflow/react";

import type { ComponentDataType, EdgeDataType, HandleDataType } from "../types";

export const GENERAL_WIRE_AWG_PRESETS = [24, 22, 20, 18, 16, 14, 12, 10, 8] as const;
export const GENERAL_WIRE_MM2_PRESETS = [0.25, 0.34, 0.5, 0.75, 1, 1.5, 2.5, 4, 6] as const;
export const USB_WIRE_AWG_PRESETS = [24, 26, 28] as const;
export const USB_WIRE_MM2_PRESETS = [0.25, 0.14] as const;
export const DEFAULT_USB_WIRE_AWG = 26;

const handleHasFunction = (
  handle: HandleDataType | undefined,
  fn: "usb_power_out" | "usb_full",
) => handle?.functions?.includes(fn) ?? false;

const findHandle = (
  node: Node<ComponentDataType> | undefined,
  handleId: string | null | undefined,
) => {
  if(!node || !handleId) return undefined;

  return [
    ...(node.data.handles ?? []),
    ...(node.data.repeatedHandleArray ?? []),
  ].find((handle) => handle.hid === handleId);
};

export const isUsbPowerPairConnection = (
  nodes: Node<ComponentDataType>[],
  connection: {
    source: string | null;
    sourceHandle?: string | null;
    target: string | null;
    targetHandle?: string | null;
  },
) => {
  const sourceNode = nodes.find((node) => node.id === connection.source);
  const targetNode = nodes.find((node) => node.id === connection.target);
  const sourceHandle = findHandle(sourceNode, connection.sourceHandle);
  const targetHandle = findHandle(targetNode, connection.targetHandle);

  return (
    (handleHasFunction(sourceHandle, "usb_power_out") && handleHasFunction(targetHandle, "usb_full")) ||
    (handleHasFunction(targetHandle, "usb_power_out") && handleHasFunction(sourceHandle, "usb_full"))
  );
};

export const usbWirePhysicalDefaults = (): Pick<
  EdgeDataType,
  "physCrosssection" | "physCrosssectionUnit" | "physType"
> => ({
  physCrosssection: DEFAULT_USB_WIRE_AWG,
  physCrosssectionUnit: "AWG",
  physType: "usb",
});

export const wirePhysicalDefaultsForConnection = (
  nodes: Node<ComponentDataType>[],
  connection: Pick<Edge, "source" | "sourceHandle" | "target" | "targetHandle">,
): Pick<EdgeDataType, "physCrosssection" | "physCrosssectionUnit" | "physType"> => (
  isUsbPowerPairConnection(nodes, connection)
    ? usbWirePhysicalDefaults()
    : {
      physCrosssection: 0.5,
      physCrosssectionUnit: "mm2",
      physType: "single",
    }
);
