import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DeleteOutlined, InfoCircleOutlined, LoadingOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { useEdges, useNodes, useReactFlow, type Edge, type Node } from "@xyflow/react";
import { Alert, Button, Collapse, Empty, Flex, List, Modal, Segmented, Select, Slider, Space, Tag, Typography, theme, type CollapseProps } from "antd";
import { useTranslation } from "react-i18next";

import { createSimulationFingerprint } from "./simulationFingerprint";
import { logSimulationDebug } from "./simulationDebug";
import { runSimulationInWorker, type SimulationWorkerRun } from "./runSimulationInWorker";
import { useSimulationResultStore, type SimulationDisplayMode } from "./simulationResultStore";
import { DEBUG_BYPASS_SIMULATION_DIAGRAM_CHECK } from "./simulationFeatureFlags";
import { useSimulationSettingsStore } from "./simulationSettingsStore";
import type {
  LedSimulationColorMode,
  SimulationCheckIssue,
  SimulationIssueFormattedNumber,
  SimulationIssueMessage,
  SimulationModel,
  SimulationSettings,
  SimulationTarget,
} from "./simulationTypes";
import { useDiagramCheckResultStore } from "../check/diagramCheckResultStore";
import { useDiagramCheckSettingsStore } from "../check/checkSettingsStore";
import type { ComponentDataType, EdgeDataType } from "../types";
import { getComponentDisplayName } from "../utils/componentDisplayName";

type SimulationUiStatus = "idle" | "running" | "success" | "failed" | "blocked";
type SimulationGateState = "ready" | "debug-bypass" | "settings-bypass" | "not-checked" | "stale" | "has-errors";

const severityColor: Record<SimulationCheckIssue["severity"], string> = {
  error: "red",
  warning: "gold",
  info: "blue",
};

const colorModeOptions: {value: LedSimulationColorMode; labelKey: string}[] = [
  {value: "RGB_WHITE", labelKey: "rgbWhite"},
  {value: "SEPARATE_WHITE", labelKey: "separateWhite"},
  {value: "SEPARATE_AND_RGB_WHITE", labelKey: "separateAndRgbWhite"},
  {value: "R", labelKey: "red"},
  {value: "G", labelKey: "green"},
  {value: "B", labelKey: "blue"},
];

const isFormattedNumber = (value: unknown): value is SimulationIssueFormattedNumber => (
  typeof value === "object" &&
  value !== null &&
  "value" in value &&
  "minimumFractionDigits" in value &&
  "maximumFractionDigits" in value
);

const getSimulationModelStats = (model: SimulationModel) => {
  const simulatedCircuitNodeIds = new Set(
    model.elements.flatMap((element) => Object.values(element.terminals)),
  );

  return {
    components: model.components.filter((component) => component.elementIds.length > 0).length,
    wires: model.wires.filter((wire) => (
      simulatedCircuitNodeIds.has(wire.sourceCircuitNodeId) &&
      simulatedCircuitNodeIds.has(wire.targetCircuitNodeId)
    )).length,
  };
};

const allNodeHandles = (node: Node<ComponentDataType>) => [
  ...(node.data.handles || []),
  ...(node.data.repeatedHandleArray || []),
];

const findNodeForSimulationElement = (
  elementId: string,
  nodes: Node<ComponentDataType>[],
) => {
  if(!elementId.startsWith("component:")) return undefined;

  const elementPath = elementId.slice("component:".length);
  return nodes.find((node) => (
    elementPath === node.id || elementPath.startsWith(`${node.id}:`)
  ));
};

type SimulationPageProps = {
  isOpen: boolean;
};

export const SimulationPage = ({ isOpen }: SimulationPageProps) => {
  const { t, i18n } = useTranslation(["main"]);
  const { token } = theme.useToken();
  const reactFlow = useReactFlow<Node<ComponentDataType>, Edge<EdgeDataType>>();
  const nodes = useNodes<Node<ComponentDataType>>();
  const edges = useEdges<Edge<EdgeDataType>>();
  const displayMode = useSimulationResultStore((state) => state.displayMode);
  const setDisplayMode = useSimulationResultStore((state) => state.setDisplayMode);
  const setSimulationOverlayResult = useSimulationResultStore((state) => state.setResult);
  const diagramCheckResult = useDiagramCheckResultStore((state) => state.result);
  const wireAmpacitySettings = useDiagramCheckSettingsStore((state) => state.settings.wireAmpacity);
  const allowSimulationWithDiagramCheckErrors = useSimulationSettingsStore((state) => state.allowSimulationWithDiagramCheckErrors);
  const [settings, setSettings] = useState<SimulationSettings>({
    ledColorMode: "RGB_WHITE",
    brightnessPercent: 100,
  });
  const [status, setStatus] = useState<SimulationUiStatus>("idle");
  const [issues, setIssues] = useState<SimulationCheckIssue[] | null>(null);
  const [modelStats, setModelStats] = useState<{
    components: number;
    wires: number;
  } | null>(null);
  const [resultFingerprint, setResultFingerprint] = useState<string | null>(null);
  const [wasInvalidated, setWasInvalidated] = useState(false);
  const [activeIssueKeys, setActiveIssueKeys] = useState<string[]>([]);
  const [simulationInfoOpen, setSimulationInfoOpen] = useState(false);
  const simulationRequestIdRef = useRef(0);
  const simulationWorkerRunRef = useRef<SimulationWorkerRun | null>(null);
  const currentFingerprintRef = useRef<string | null>(null);

  const currentFingerprint = useMemo(() => (
    createSimulationFingerprint(nodes, edges)
  ), [edges, nodes]);

  useEffect(() => {
    currentFingerprintRef.current = currentFingerprint;
  }, [currentFingerprint]);

  const simulationGate = useMemo((): {state: SimulationGateState; errorCount: number} => {
    if(DEBUG_BYPASS_SIMULATION_DIAGRAM_CHECK) {
      return {state: "debug-bypass", errorCount: 0};
    }

    if(allowSimulationWithDiagramCheckErrors) {
      return {state: "settings-bypass", errorCount: 0};
    }

    if(!diagramCheckResult) {
      return {state: "not-checked", errorCount: 0};
    }

    if(diagramCheckResult.fingerprint !== currentFingerprint) {
      return {state: "stale", errorCount: 0};
    }

    const errorCount = diagramCheckResult.issues.filter((issue) => issue.severity === "error").length;
    if(errorCount > 0) {
      return {state: "has-errors", errorCount};
    }

    return {state: "ready", errorCount: 0};
  }, [allowSimulationWithDiagramCheckErrors, currentFingerprint, diagramCheckResult]);

  const simulationBlocked = simulationGate.state !== "ready" && simulationGate.state !== "debug-bypass" && simulationGate.state !== "settings-bypass";

  const colorModeSelectOptions = useMemo(() => (
    colorModeOptions.map((option) => ({
      value: option.value,
      label: t(`sidebar.simulation.colorModes.${option.labelKey}`),
    }))
  ), [t]);

  const nodeById = useMemo(() => (
    new Map(nodes.map((node) => [node.id, node]))
  ), [nodes]);

  const edgeById = useMemo(() => (
    new Map(edges.map((edge) => [edge.id, edge]))
  ), [edges]);

  const componentLabel = useCallback((nodeId: string) => {
    const node = nodeById.get(nodeId);
    if(!node) return nodeId;

    return getComponentDisplayName(node.data, node.id, t);
  }, [nodeById, t]);

  const pinLabel = useCallback((nodeId: string, handleId: string) => {
    const node = nodeById.get(nodeId);
    const handle = node ? allNodeHandles(node).find((candidate) => candidate.hid === handleId) : undefined;
    const pin = handle?.name || handleId;

    return t("sidebar.simulation.targetPin", {
      component: componentLabel(nodeId),
      pin,
    });
  }, [componentLabel, nodeById, t]);

  const targetLabel = useCallback((target: SimulationTarget) => {
    if(target.type === "node") return componentLabel(target.nodeId);

    if(target.type === "pin") {
      return pinLabel(target.nodeId, target.handleId);
    }

    if(target.type === "wire") {
      const edge = edgeById.get(target.edgeId);
      if(!edge) return target.edgeId;

      const source = edge.sourceHandle ? pinLabel(edge.source, edge.sourceHandle) : componentLabel(edge.source);
      const targetPin = edge.targetHandle ? pinLabel(edge.target, edge.targetHandle) : componentLabel(edge.target);
      return t("sidebar.simulation.targetWire", {
        source,
        target: targetPin,
      });
    }

    const node = findNodeForSimulationElement(target.elementId, nodes);
    if(node) {
      return t("sidebar.simulation.targetComponent", {
        component: componentLabel(node.id),
      });
    }

    return target.elementId;
  }, [componentLabel, edgeById, nodes, pinLabel, t]);

  const formatIssueMessageOptions = useCallback((
    options: SimulationIssueMessage["options"],
  ) => {
    if(!options) return undefined;

    return Object.fromEntries(Object.entries(options).map(([key, value]) => {
      if(!isFormattedNumber(value)) return [key, value];

      return [
        key,
        new Intl.NumberFormat(i18n.resolvedLanguage || i18n.language, {
          minimumFractionDigits: value.minimumFractionDigits,
          maximumFractionDigits: value.maximumFractionDigits,
        }).format(value.value),
      ];
    }));
  }, [i18n.language, i18n.resolvedLanguage]);

  const issueMessageText = useCallback((
    message: SimulationIssueMessage | undefined,
    fallback: string,
  ) => (
    message
      ? String(t(message.key, formatIssueMessageOptions(message.options)))
      : fallback
  ), [formatIssueMessageOptions, t]);

  const clearSimulationHighlights = useCallback(() => {
    reactFlow.setNodes((currentNodes) => currentNodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        simulationHighlighted: false,
        simulationHighlightedHandleIds: undefined,
      },
    })));

    reactFlow.setEdges((currentEdges) => currentEdges.map((edge) => ({
      ...edge,
      data: {
        ...(edge.data as EdgeDataType),
        simulationHighlighted: false,
      },
    })));
  }, [reactFlow]);

  const highlightSimulationTargets = useCallback((targets: SimulationTarget[] = []) => {
    const highlightedNodeIds = new Set<string>();
    const highlightedHandleIdsByNodeId = new Map<string, Set<string>>();
    const highlightedEdgeIds = new Set<string>();

    targets.forEach((target) => {
      if(target.type === "node") {
        highlightedNodeIds.add(target.nodeId);
        return;
      }

      if(target.type === "pin") {
        highlightedNodeIds.add(target.nodeId);
        const highlightedHandleIds = highlightedHandleIdsByNodeId.get(target.nodeId) ?? new Set<string>();
        highlightedHandleIds.add(target.handleId);
        highlightedHandleIdsByNodeId.set(target.nodeId, highlightedHandleIds);
        return;
      }

      if(target.type === "wire") {
        highlightedEdgeIds.add(target.edgeId);
        return;
      }

      const node = findNodeForSimulationElement(target.elementId, reactFlow.getNodes());
      if(node) {
        highlightedNodeIds.add(node.id);
      }
    });

    reactFlow.setNodes((currentNodes) => currentNodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        simulationHighlighted: node.data.technicalID !== "SolderJoint" && highlightedNodeIds.has(node.id),
        simulationHighlightedHandleIds: Array.from(highlightedHandleIdsByNodeId.get(node.id) ?? []),
      },
    })));

    reactFlow.setEdges((currentEdges) => currentEdges.map((edge) => ({
      ...edge,
      data: {
        ...(edge.data as EdgeDataType),
        simulationHighlighted: highlightedEdgeIds.has(edge.id),
      },
    })));
  }, [reactFlow]);

  const applySimulationResult = (simulation: Awaited<SimulationWorkerRun["promise"]>) => {
    const simulationFingerprint = simulation.ok
      ? simulation.result.diagramFingerprint
      : simulation.diagramFingerprint;

    if(currentFingerprintRef.current !== simulationFingerprint) {
      setStatus("idle");
      setIssues(null);
      setModelStats(null);
      setResultFingerprint(null);
      setWasInvalidated(true);
      setSimulationOverlayResult(null);
      setActiveIssueKeys([]);
      clearSimulationHighlights();
      return;
    }

    logSimulationDebug(simulation);
    setIssues(simulation.issues);
    setActiveIssueKeys([]);
    clearSimulationHighlights();

    if(simulation.ok) {
      setResultFingerprint(simulation.result.diagramFingerprint);
      setSimulationOverlayResult(simulation.result);
      setModelStats(getSimulationModelStats(simulation.model));
      setStatus("success");
      return;
    }

    setResultFingerprint(simulation.diagramFingerprint);
    setSimulationOverlayResult(null);
    setStatus("failed");
  };

  const runSimulation = () => {
    if(simulationBlocked) {
      setStatus("blocked");
      setIssues(null);
      setModelStats(null);
      setWasInvalidated(false);
      setSimulationOverlayResult(null);
      setActiveIssueKeys([]);
      clearSimulationHighlights();
      return;
    }

    setStatus("running");
    setIssues(null);
    setModelStats(null);
    setWasInvalidated(false);
    setSimulationOverlayResult(null);
    setActiveIssueKeys([]);
    clearSimulationHighlights();

    simulationWorkerRunRef.current?.terminate();
    const requestId = simulationRequestIdRef.current + 1;
    simulationRequestIdRef.current = requestId;
    const workerRun = runSimulationInWorker({
      requestId,
      nodes: reactFlow.getNodes(),
      edges: reactFlow.getEdges(),
      settings,
      wireAmpacitySettings,
    });
    simulationWorkerRunRef.current = workerRun;

    workerRun.promise
      .then((simulation) => {
        if(simulationRequestIdRef.current !== requestId) return;
        simulationWorkerRunRef.current = null;
        applySimulationResult(simulation);
      })
      .catch((error) => {
        if(simulationRequestIdRef.current !== requestId) return;
        simulationWorkerRunRef.current = null;
        setIssues([{
          id: "simulation-worker:failed",
          severity: "error",
          title: t("sidebar.simulation.workerFailedTitle"),
          description: error instanceof Error ? error.message : String(error),
        }]);
        setResultFingerprint(currentFingerprint);
        setSimulationOverlayResult(null);
        setActiveIssueKeys([]);
        clearSimulationHighlights();
        setStatus("failed");
      });
  };

  const deleteResults = () => {
    simulationRequestIdRef.current += 1;
    simulationWorkerRunRef.current?.terminate();
    simulationWorkerRunRef.current = null;
    setStatus("idle");
    setIssues(null);
    setModelStats(null);
    setResultFingerprint(null);
    setWasInvalidated(false);
    setSimulationOverlayResult(null);
    setActiveIssueKeys([]);
    clearSimulationHighlights();
  };

  useEffect(() => {
    if(!resultFingerprint || status === "running") return;
    if(currentFingerprint === resultFingerprint) return;

    setStatus("idle");
    setIssues(null);
    setModelStats(null);
    setResultFingerprint(null);
    setWasInvalidated(true);
    setSimulationOverlayResult(null);
    setActiveIssueKeys([]);
    clearSimulationHighlights();
  }, [clearSimulationHighlights, currentFingerprint, resultFingerprint, setSimulationOverlayResult, status]);

  useEffect(() => {
    if(isOpen) return;

    setActiveIssueKeys([]);
    clearSimulationHighlights();
  }, [clearSimulationHighlights, isOpen]);

  useEffect(() => () => {
    simulationRequestIdRef.current += 1;
    simulationWorkerRunRef.current?.terminate();
    clearSimulationHighlights();
  }, [clearSimulationHighlights]);

  const issueItems: CollapseProps["items"] = useMemo(() => (
    issues?.map((issueItem) => ({
      key: issueItem.id,
      label: (
        <Space size={6} align="start">
          <Tag color={severityColor[issueItem.severity]} style={{ marginInlineEnd: 0 }}>
            {t(`sidebar.simulation.severity.${issueItem.severity}`)}
          </Tag>
          <span>{issueMessageText(issueItem.titleMessage, issueItem.title)}</span>
        </Space>
      ),
      children: (
        <Flex gap="small" vertical>
          <Typography.Text>
            {issueMessageText(issueItem.descriptionMessage, issueItem.description)}
          </Typography.Text>
          {issueItem.targets && issueItem.targets.length > 0 &&
            <List
              size="small"
              header={t("sidebar.simulation.affectedElements")}
              dataSource={issueItem.targets}
              renderItem={(target) => (
                <List.Item>
                  <Typography.Text>{targetLabel(target)}</Typography.Text>
                </List.Item>
              )}
            />
          }
        </Flex>
      ),
      style: {
        border: `1px solid ${token.colorBorder}`,
        borderRadius: 4,
        marginBottom: 6,
      },
    }))
  ), [issueMessageText, issues, t, targetLabel, token.colorBorder]);

  return (
    <Flex gap="small" vertical>
      <Alert
        type="info"
        showIcon
        message={t("sidebar.simulation.betaNoticeTitle")}
        description={
          <>
            <Button
              size="small"
              icon={<InfoCircleOutlined />}
              onClick={() => setSimulationInfoOpen(true)}
              style={{
                float: "inline-end",
                marginInlineStart: 8,
                marginBlockEnd: 4,
              }}
            >
              {t("sidebar.simulation.infoButton")}
            </Button>
            {t("sidebar.simulation.betaNoticeDescription")}
          </>
        }
      />

      <Modal
        title={t("sidebar.simulation.infoModalTitle")}
        open={simulationInfoOpen}
        onCancel={() => setSimulationInfoOpen(false)}
        footer={null}
      >
        <Flex gap="small" vertical>
          <Typography.Paragraph>
            {t("sidebar.simulation.infoModalIntro")}
          </Typography.Paragraph>
          <List
            size="small"
            dataSource={[
              t("sidebar.simulation.infoModalItems.power"),
              t("sidebar.simulation.infoModalItems.wires"),
              t("sidebar.simulation.infoModalItems.leds"),
              t("sidebar.simulation.infoModalItems.protection"),
              t("sidebar.simulation.infoModalItems.limits"),
            ]}
            renderItem={(item) => (
              <List.Item>
                <Typography.Text>{item}</Typography.Text>
              </List.Item>
            )}
          />
          <Typography.Paragraph>
            <Typography.Text type="danger" strong>
              {t("sidebar.simulation.infoModalCaution.label")}
            </Typography.Text>{" "}
            {t("sidebar.simulation.infoModalCaution.text")}
          </Typography.Paragraph>
          <Collapse
            size="small"
            items={[{
              key: "simulation-models",
              label: t("sidebar.simulation.infoModalModelDetails.title"),
              children: (
                <Flex gap="small" vertical>
                  {["leds", "powerSources", "dcdc", "wires"].map((modelKey) => (
                    <Typography.Paragraph
                      key={modelKey}
                      style={{ marginBottom: 0 }}
                    >
                      <Typography.Text strong>
                        {t(`sidebar.simulation.infoModalModelDetails.${modelKey}.title`)}
                      </Typography.Text>{" "}
                      {t(`sidebar.simulation.infoModalModelDetails.${modelKey}.description`)}
                    </Typography.Paragraph>
                  ))}
                </Flex>
              ),
            }]}
          />
          <Typography.Paragraph type="secondary">
            {t("sidebar.simulation.infoModalNote")}
          </Typography.Paragraph>
        </Flex>
      </Modal>

      <Flex gap={4} vertical>
        <Typography.Text strong>{t("sidebar.simulation.settings")}</Typography.Text>
        <Select
          value={settings.ledColorMode}
          options={colorModeSelectOptions}
          onChange={(ledColorMode) => setSettings((current) => ({
            ...current,
            ledColorMode,
          }))}
        />
      </Flex>

      <Flex gap={4} vertical>
        <Typography.Text>
          {t("sidebar.simulation.brightness", { value: settings.brightnessPercent })}
        </Typography.Text>
        <Slider
          min={0}
          max={100}
          step={1}
          value={settings.brightnessPercent}
          onChange={(brightnessPercent) => setSettings((current) => ({
            ...current,
            brightnessPercent,
          }))}
        />
      </Flex>

      <Space.Compact block>
        <Button
          type="primary"
          icon={status === "running" ? <LoadingOutlined /> : <PlayCircleOutlined />}
          loading={status === "running"}
          disabled={status === "running"}
          onClick={runSimulation}
        >
          {status === "running"
            ? t("sidebar.simulation.running")
            : t("sidebar.simulation.buttonRun")
          }
        </Button>
        <Button
          icon={<DeleteOutlined />}
          disabled={status === "running" || status === "idle"}
          onClick={deleteResults}
        >
          {t("sidebar.simulation.buttonDelete")}
        </Button>
      </Space.Compact>

      <Flex gap={4} vertical>
        <Typography.Text>{t("sidebar.simulation.displayMode.label")}</Typography.Text>
        <Segmented
          block
          value={displayMode}
          options={[
            {
              value: "default",
              label: t("sidebar.simulation.displayMode.default"),
            },
            {
              value: "extended",
              label: t("sidebar.simulation.displayMode.extended"),
            },
          ]}
          onChange={(value) => setDisplayMode(value as SimulationDisplayMode)}
        />
        <Typography.Text type="secondary">
          {t(`sidebar.simulation.displayMode.${displayMode}Description`)}
        </Typography.Text>
      </Flex>

      {simulationGate.state === "debug-bypass" &&
        <Alert
          type="warning"
          showIcon
          message={t("sidebar.simulation.diagramCheckDebugBypass")}
        />
      }

      {simulationGate.state === "settings-bypass" &&
        <Alert
          type="warning"
          showIcon
          message={t("sidebar.simulation.diagramCheckSettingsBypass")}
        />
      }

      {simulationBlocked &&
        <Alert
          type="warning"
          showIcon
          message={t(`sidebar.simulation.diagramCheckGate.${simulationGate.state}.title`, {
            count: simulationGate.errorCount,
          })}
          description={t(`sidebar.simulation.diagramCheckGate.${simulationGate.state}.description`, {
            count: simulationGate.errorCount,
          })}
        />
      }

      {status === "idle" &&
        <>
          {wasInvalidated &&
            <Alert
              type="info"
              showIcon
              message={t("sidebar.simulation.invalidated")}
            />
          }
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t("sidebar.simulation.notRun")}
          />
        </>
      }

      {status === "running" &&
        <Alert
          type="info"
          showIcon
          message={t("sidebar.simulation.running")}
        />
      }

      {status === "success" &&
        <Alert
          type="success"
          showIcon
          message={t("sidebar.simulation.modelReadyTitle")}
          description={modelStats
            ? t("sidebar.simulation.modelReadyDescription", modelStats)
            : undefined
          }
        />
      }

      {status === "failed" &&
        <Alert
          type="error"
          showIcon
          message={t("sidebar.simulation.failedTitle")}
          description={t("sidebar.simulation.failedDescription")}
        />
      }

      {status === "blocked" &&
        <Alert
          type="warning"
          showIcon
          message={t("sidebar.simulation.blockedTitle")}
          description={t("sidebar.simulation.blockedDescription")}
        />
      }

      {issues !== null && issues.length === 0 &&
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t("sidebar.simulation.noIssues")}
        />
      }

      {issues !== null && issues.length > 0 &&
        <>
          <Typography.Text type="secondary">
            {t("sidebar.simulation.issueCount", { count: issues.length })}
          </Typography.Text>
          <Collapse
            ghost
            accordion
            activeKey={activeIssueKeys}
            items={issueItems}
            onChange={(key) => {
              const keys = Array.isArray(key) ? key.map(String) : key ? [String(key)] : [];
              setActiveIssueKeys(keys);
              const activeIssue = issues.find((issue) => issue.id === keys[keys.length - 1]);
              if(activeIssue) {
                highlightSimulationTargets(activeIssue.targets);
              } else {
                clearSimulationHighlights();
              }
            }}
          />
        </>
      }
    </Flex>
  );
};
