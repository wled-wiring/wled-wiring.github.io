import type { Node } from '@xyflow/react';

import { ComponentList } from '../components/ComponentList.ts';
import { ComponentDataType } from '../types';
import { withUpdatedLedSimulationOptionDefaults } from '../simulation/ledStripSimulationOptions';

const ignoredComponentDataKeys = new Set([
    "rotation",
    "selectedHid",
    "checkHighlighted",
    "simulationHighlighted",
    "simulationHighlightedHandleIds",
    "nodeLength",
    "repeatedHandleArray",
    "physLengths",
    "InfoText",
    "infoText",
    "textColor",
    "infoTextSize",
    "color",
    "onlyBorder",
    "wireInfoForNodeId",
    "correspondingWireSelected",
    "wireInfo_length",
    "wireInfo_crosssection",
    "wireInfo_crosssectionUnit",
    "wireInfo_color",
    "ledSimulationOptionValues",
]);

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === "object" && value !== null && !Array.isArray(value)
);

const findByIdentityKey = (
    array: unknown[],
    identityKey: string,
    identityValue: unknown,
) => array.find((item) => isRecord(item) && item[identityKey] === identityValue);

type CompareContext = {
    componentTechnicalID: string;
    currentComponentData: ComponentDataType;
    templateComponentData: ComponentDataType;
    path: string[];
}

export type ComponentUpdateChange = {
    key: string;
    path: string;
    currentValue: string;
    templateValue: string;
}

export type ComponentTemplateUpdateInfo = {
    nodeId: string;
    technicalID: string;
    templateData: ComponentDataType;
    changes: ComponentUpdateChange[];
}

const shouldIgnoreTemplateCompareKey = (key: string, context: CompareContext) => {
    if(context.path.length===0 && ignoredComponentDataKeys.has(key)) return true;
    if(context.path[0]==="inputFields" && key==="value") return true;
    if(context.path[0]==="selectFields" && key==="selectedValue") return true;
    if(context.path[0]==="handles" && context.componentTechnicalID==="SolderJoint" && (key==="borderColor" || key==="changeColorAutomatically")) return true;
    if(
        context.path[0]==="image" &&
        (key==="width" || key==="height") &&
        (context.currentComponentData.applyNodeResizer || context.templateComponentData.applyNodeResizer)
    ) return true;

    return false;
};

const valuesDifferFromTemplate = (
    currentValue: unknown,
    templateValue: unknown,
    context: CompareContext,
): boolean => {
    if(Array.isArray(templateValue)) {
        if(!Array.isArray(currentValue)) return templateValue.length>0;

        if(context.path.length===1 && context.path[0]==="handles") {
            return templateValue.some((templateItem) => {
                if(!isRecord(templateItem)) return true;
                const currentItem = findByIdentityKey(currentValue, "hid", templateItem.hid);
                return valuesDifferFromTemplate(currentItem, templateItem, context);
            });
        }

        if(context.path.length===1 && (context.path[0]==="inputFields" || context.path[0]==="selectFields")) {
            return templateValue.some((templateItem) => {
                if(!isRecord(templateItem)) return true;
                const currentItem = findByIdentityKey(currentValue, "technicalID", templateItem.technicalID);
                return valuesDifferFromTemplate(currentItem, templateItem, context);
            });
        }

        if(currentValue.length!==templateValue.length) return true;

        return templateValue.some((templateItem, index) => (
            valuesDifferFromTemplate(currentValue[index], templateItem, {
                ...context,
                path: context.path.concat(String(index)),
            })
        ));
    }

    if(isRecord(templateValue)) {
        if(!isRecord(currentValue)) return true;

        return Object.keys(templateValue).some((key) => {
            if(shouldIgnoreTemplateCompareKey(key, context)) return false;

            return valuesDifferFromTemplate(currentValue[key], templateValue[key], {
                ...context,
                path: context.path.concat(key),
            });
        });
    }

    return !Object.is(currentValue, templateValue);
};

const formatUpdateValue = (value: unknown, missingText: string) => {
    if(value===undefined) return missingText;
    const formattedValue = typeof value==="string" ? value : JSON.stringify(value);
    if(formattedValue===undefined) return String(value);
    return formattedValue.length>90 ? `${formattedValue.slice(0, 87)}...` : formattedValue;
};

const formatUpdatePath = (path: string[]) => path.join(".");

const buildUpdateChanges = (
    currentValue: unknown,
    templateValue: unknown,
    context: CompareContext,
    missingText: string,
): ComponentUpdateChange[] => {
    if(Array.isArray(templateValue)) {
        if(!Array.isArray(currentValue)) {
            return templateValue.length>0 ? [{
                key: formatUpdatePath(context.path),
                path: formatUpdatePath(context.path),
                currentValue: formatUpdateValue(currentValue, missingText),
                templateValue: formatUpdateValue(templateValue, missingText),
            }] : [];
        }

        if(context.path.length===1 && context.path[0]==="handles") {
            return templateValue.flatMap((templateItem) => {
                if(!isRecord(templateItem)) return [];
                const nextPath = context.path.concat(String(templateItem.hid));
                const currentItem = findByIdentityKey(currentValue, "hid", templateItem.hid);
                return buildUpdateChanges(currentItem, templateItem, {
                    ...context,
                    path: nextPath,
                }, missingText);
            });
        }

        if(context.path.length===1 && (context.path[0]==="inputFields" || context.path[0]==="selectFields")) {
            return templateValue.flatMap((templateItem) => {
                if(!isRecord(templateItem)) return [];
                const nextPath = context.path.concat(String(templateItem.technicalID));
                const currentItem = findByIdentityKey(currentValue, "technicalID", templateItem.technicalID);
                return buildUpdateChanges(currentItem, templateItem, {
                    ...context,
                    path: nextPath,
                }, missingText);
            });
        }

        if(currentValue.length!==templateValue.length || valuesDifferFromTemplate(currentValue, templateValue, context)) {
            return [{
                key: formatUpdatePath(context.path),
                path: formatUpdatePath(context.path),
                currentValue: formatUpdateValue(currentValue, missingText),
                templateValue: formatUpdateValue(templateValue, missingText),
            }];
        }

        return [];
    }

    if(isRecord(templateValue)) {
        if(!isRecord(currentValue)) {
            return [{
                key: formatUpdatePath(context.path),
                path: formatUpdatePath(context.path),
                currentValue: formatUpdateValue(currentValue, missingText),
                templateValue: formatUpdateValue(templateValue, missingText),
            }];
        }

        return Object.keys(templateValue).flatMap((key) => {
            if(shouldIgnoreTemplateCompareKey(key, context)) return [];

            return buildUpdateChanges(currentValue[key], templateValue[key], {
                ...context,
                path: context.path.concat(key),
            }, missingText);
        });
    }

    if(Object.is(currentValue, templateValue)) return [];

    return [{
        key: formatUpdatePath(context.path),
        path: formatUpdatePath(context.path),
        currentValue: formatUpdateValue(currentValue, missingText),
        templateValue: formatUpdateValue(templateValue, missingText),
    }];
};

export const getComponentTemplateData = (technicalID: string) => (
    ComponentList.find((component) => (
        (component.data as ComponentDataType).technicalID === technicalID
    ))?.data as ComponentDataType | undefined
);

export const getComponentUpdateChanges = (
    currentComponentData: ComponentDataType,
    templateComponentData: ComponentDataType,
    missingText: string,
) => buildUpdateChanges(
    currentComponentData,
    templateComponentData,
    {
        componentTechnicalID: currentComponentData.technicalID,
        currentComponentData,
        templateComponentData,
        path: [],
    },
    missingText,
);

const mergeTemplateArrayByIdentity = (
    currentValue: unknown[],
    templateValue: unknown[],
    identityKey: string,
    context: CompareContext,
) => {
    const templateIdentityValues = templateValue
        .filter(isRecord)
        .map((item) => item[identityKey]);

    const updatedTemplateItems = templateValue.map((templateItem) => {
        if(!isRecord(templateItem)) return structuredClone(templateItem);
        const currentItem = findByIdentityKey(currentValue, identityKey, templateItem[identityKey]);
        return mergeTemplateValueIntoCurrent(currentItem, templateItem, context);
    });

    const currentOnlyItems = currentValue.filter((currentItem) => (
        !isRecord(currentItem) || !templateIdentityValues.includes(currentItem[identityKey])
    ));

    return updatedTemplateItems.concat(structuredClone(currentOnlyItems));
};

const mergeTemplateValueIntoCurrent = (
    currentValue: unknown,
    templateValue: unknown,
    context: CompareContext,
): unknown => {
    if(Array.isArray(templateValue)) {
        if(Array.isArray(currentValue)) {
            if(context.path.length===1 && context.path[0]==="handles") {
                return mergeTemplateArrayByIdentity(currentValue, templateValue, "hid", context);
            }

            if(context.path.length===1 && (context.path[0]==="inputFields" || context.path[0]==="selectFields")) {
                return mergeTemplateArrayByIdentity(currentValue, templateValue, "technicalID", context);
            }
        }

        return structuredClone(templateValue);
    }

    if(isRecord(templateValue)) {
        const mergedValue = isRecord(currentValue) ? structuredClone(currentValue) : {};

        Object.keys(templateValue).forEach((key) => {
            if(shouldIgnoreTemplateCompareKey(key, context)) return;

            mergedValue[key] = mergeTemplateValueIntoCurrent(
                isRecord(currentValue) ? currentValue[key] : undefined,
                templateValue[key],
                {
                    ...context,
                    path: context.path.concat(key),
                },
            );
        });

        return mergedValue;
    }

    return structuredClone(templateValue);
};

export const buildUpdatedComponentData = (
    currentComponentData: ComponentDataType,
    templateComponentData: ComponentDataType,
) => withUpdatedLedSimulationOptionDefaults(
    mergeTemplateValueIntoCurrent(
        currentComponentData,
        templateComponentData,
        {
            componentTechnicalID: currentComponentData.technicalID,
            currentComponentData,
            templateComponentData,
            path: [],
        },
    ) as ComponentDataType,
);

export const getNodeComponentTemplateUpdateInfo = (
    node: Node,
    missingText: string,
): ComponentTemplateUpdateInfo | undefined => {
    const componentData = node.data as ComponentDataType | undefined;
    if(!componentData?.technicalID) return undefined;

    const templateData = getComponentTemplateData(componentData.technicalID);
    if(!templateData) return undefined;

    const changes = getComponentUpdateChanges(componentData, templateData, missingText);
    if(changes.length===0) return undefined;

    return {
        nodeId: node.id,
        technicalID: componentData.technicalID,
        templateData,
        changes,
    };
};

export const findNodeComponentTemplateUpdates = (
    nodes: Node[],
    missingText: string,
) => nodes
    .map((node) => getNodeComponentTemplateUpdateInfo(node, missingText))
    .filter((info): info is ComponentTemplateUpdateInfo => Boolean(info));

export const applyComponentTemplateUpdatesToNodes = (nodes: Node[]) => {
    const updatedNodeIds: string[] = [];

    const updatedNodes = nodes.map((node) => {
        const componentData = node.data as ComponentDataType | undefined;
        if(!componentData?.technicalID) return node;

        const templateData = getComponentTemplateData(componentData.technicalID);
        if(!templateData) return node;

        if(getComponentUpdateChanges(componentData, templateData, "").length===0) return node;

        const updatedData = buildUpdatedComponentData(componentData, templateData);
        updatedNodeIds.push(node.id);
        return {
            ...node,
            data: updatedData,
        };
    });

    return {
        nodes: updatedNodes,
        updatedNodeIds,
    };
};
