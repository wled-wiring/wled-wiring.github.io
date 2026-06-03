import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useReactFlow, type Edge, type Node } from '@xyflow/react';
import { Alert, Button, Collapse, Empty, Flex, List, Modal, Segmented, Space, Tag, Typography, theme, type CollapseProps } from 'antd';
import { SafetyCertificateOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

import type { CheckNet } from '../check/checkContext';
import { createDiagramCheckContextFromJson, runDiagramCheck } from '../check/runDiagramCheck';
import type { DiagramCheckDeduplicationMode, DiagramCheckIssue, DiagramCheckSeverity, DiagramCheckTarget } from '../check/diagramCheckTypes';
import { useDiagramCheckResultStore } from '../check/diagramCheckResultStore';
import { createDiagramExportJson } from '../utils/exportModel';
import { createDiagramFingerprint } from '../utils/diagramFingerprint';
import {
  effectiveSignalRoleDiagnosticsForNet,
  getDiagramCheckRuleInfos,
  type EffectiveSignalRoleDiagnostic,
} from '../check/rules';
import type { ComponentDataType, EdgeDataType } from '../types';
import { getComponentDisplayName } from '../utils/componentDisplayName';
import { readableWireLabel } from '../utils/wireLabel';

const severityColor: Record<DiagramCheckSeverity, string> = {
  error: 'red',
  warning: 'gold',
  info: 'blue',
};

const SHOW_DIAGRAM_CHECK_DIAGNOSTICS = false;
const SHOW_NET_DEBUG = false;

const netDebugTargets = (net: CheckNet): DiagramCheckTarget[] => {
  const nodeTargets = new Map<string, DiagramCheckTarget>();
  const edgeTargets = new Map<string, DiagramCheckTarget>();

  net.handles.forEach((handle) => {
    nodeTargets.set(handle.node.id, {
      type: 'node',
      id: handle.node.id,
      label: getComponentDisplayName(handle.node.data, handle.node.id),
    });
  });

  net.edges.forEach((edge) => {
    edgeTargets.set(edge.id, {
      type: 'edge',
      id: edge.id,
      label: readableWireLabel(edge, net.handles.map((handle) => handle.node)),
    });
  });

  return [...nodeTargets.values(), ...edgeTargets.values()];
};

const handleDebugLabel = (handle: CheckNet['handles'][number]) => (
  `${getComponentDisplayName(handle.node.data, handle.node.id)}.${handle.handle.hid} (${handle.functions.join(', ') || 'none'})`
);

const effectiveRoleDebugLabel = (diagnostic: EffectiveSignalRoleDiagnostic) => {
  const base = `${diagnostic.signalLabel}: ${handleDebugLabel(diagnostic.handle)}`;
  if (diagnostic.status === 'unclear') return `${base} -> unclear (${diagnostic.reason})`;

  return `${base} -> ${diagnostic.direction} / ${diagnostic.confidence} (${diagnostic.reason})`;
};

type DiagramCheckPageProps = {
  isOpen: boolean;
};

export const DiagramCheckPage = ({ isOpen }: DiagramCheckPageProps) => {
  const { t, i18n } = useTranslation(['main']);
  const { token } = theme.useToken();
  const reactFlow = useReactFlow();
  const diagramCheckResult = useDiagramCheckResultStore((state) => state.result);
  const setDiagramCheckResult = useDiagramCheckResultStore((state) => state.setResult);
  const [issues, setIssues] = useState<DiagramCheckIssue[] | null>(null);
  const [netDebugNets, setNetDebugNets] = useState<CheckNet[] | null>(null);
  const [effectiveRoleDebugByNetId, setEffectiveRoleDebugByNetId] = useState<Record<string, EffectiveSignalRoleDiagnostic[]>>({});
  const [activeIssueKeys, setActiveIssueKeys] = useState<string[]>([]);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [deduplicationMode, setDeduplicationMode] = useState<DiagramCheckDeduplicationMode>('user-friendly');
  const previousLanguageRef = useRef(i18n.resolvedLanguage);

  const clearHighlights = useCallback(() => {
    reactFlow.setNodes((nodes) => nodes.map((node) => ({
      ...node,
      selected: node.data.checkHighlighted ? false : node.selected,
      data: {
        ...node.data,
        checkHighlighted: false,
      },
    })));

    reactFlow.setEdges((edges) => edges.map((edge) => ({
      ...edge,
      selected: edge.data?.checkHighlighted ? false : edge.selected,
      data: {
        ...edge.data,
        checkHighlighted: false,
      },
    })));
  }, [reactFlow]);

  const highlightTargets = useCallback((targets: DiagramCheckTarget[] = []) => {
    const highlightedNodeIds = new Set(targets.filter((target) => target.type === 'node').map((target) => target.id));
    const highlightedEdgeIds = new Set(targets.filter((target) => target.type === 'edge').map((target) => target.id));

    reactFlow.setNodes((nodes) => nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        checkHighlighted: node.data.technicalID !== 'SolderJoint' && highlightedNodeIds.has(node.id),
      },
    })));

    reactFlow.setEdges((edges) => edges.map((edge) => ({
      ...edge,
      data: {
        ...edge.data,
        checkHighlighted: highlightedEdgeIds.has(edge.id),
      },
    })));
  }, [reactFlow]);

  const updateIssues = useCallback((
    keepActiveIssue = false,
    nextDeduplicationMode: DiagramCheckDeduplicationMode = SHOW_DIAGRAM_CHECK_DIAGNOSTICS
      ? deduplicationMode
      : 'user-friendly',
  ) => {
    const jsonData = createDiagramExportJson(reactFlow);
    const nextIssues = runDiagramCheck(jsonData, { deduplicationMode: nextDeduplicationMode });
    const fingerprint = createDiagramFingerprint(
      reactFlow.getNodes() as Node<ComponentDataType>[],
      reactFlow.getEdges() as Edge<EdgeDataType>[],
    );
    const debugContext = SHOW_NET_DEBUG ? createDiagramCheckContextFromJson(jsonData) : undefined;
    const activeIssueId = activeIssueKeys[activeIssueKeys.length - 1];
    const activeIssue = keepActiveIssue
      ? nextIssues.find((issue) => issue.id === activeIssueId)
      : undefined;

    setIssues(nextIssues);
    setDiagramCheckResult({
      fingerprint,
      issues: nextIssues,
      checkedAt: Date.now(),
    });
    if (debugContext) {
      const debugNets = [
        ...debugContext.elementaryNets,
        ...debugContext.fusedNets,
        ...debugContext.componentLinkedNets,
        ...debugContext.componentLinkedElementaryBasedNets,
      ];
      setNetDebugNets(debugNets);
      setEffectiveRoleDebugByNetId(Object.fromEntries(
        debugNets.map((net) => [
          net.id,
          effectiveSignalRoleDiagnosticsForNet(debugContext, net),
        ]),
      ));
    } else {
      setNetDebugNets(null);
      setEffectiveRoleDebugByNetId({});
    }
    setActiveIssueKeys(activeIssue ? activeIssueKeys : []);

    if (activeIssue) {
      highlightTargets(activeIssue.targets);
    } else {
      clearHighlights();
    }
  }, [activeIssueKeys, clearHighlights, deduplicationMode, highlightTargets, reactFlow, setDiagramCheckResult]);

  const runCheck = () => {
    updateIssues(false);
  };

  const updateDeduplicationMode = (nextDeduplicationMode: DiagramCheckDeduplicationMode) => {
    setDeduplicationMode(nextDeduplicationMode);
    if (issues !== null) {
      updateIssues(true, nextDeduplicationMode);
    }
  };

  const targetLabel = useCallback((target: DiagramCheckTarget) => {
    if (target.type === 'node') {
      const node = reactFlow.getNode(target.id) as Node<ComponentDataType> | undefined;
      return node ? getComponentDisplayName(node.data, node.id) : target.label || target.id;
    }

    const edge = reactFlow.getEdge(target.id) as Edge<EdgeDataType> | undefined;
    if (!edge) return target.label || target.id;

    const sourceNode = reactFlow.getNode(edge.source) as Node<ComponentDataType> | undefined;
    const targetNode = reactFlow.getNode(edge.target) as Node<ComponentDataType> | undefined;

    return readableWireLabel(edge, [sourceNode, targetNode].filter((node): node is Node<ComponentDataType> => Boolean(node)));
  }, [reactFlow]);

  const showAffectedTarget = useCallback((target: DiagramCheckTarget) => {
    if (target.type !== 'node') return true;

    const node = reactFlow.getNode(target.id) as Node<ComponentDataType> | undefined;
    return node?.data.technicalID !== 'SolderJoint';
  }, [reactFlow]);

  useEffect(() => {
    if (diagramCheckResult !== null) return;

    setIssues(null);
    setNetDebugNets(null);
    setEffectiveRoleDebugByNetId({});
    setActiveIssueKeys([]);
    clearHighlights();
  }, [clearHighlights, diagramCheckResult]);

  useEffect(() => {
    if (previousLanguageRef.current === i18n.resolvedLanguage) return;

    previousLanguageRef.current = i18n.resolvedLanguage;
    if (issues === null) return;

    updateIssues(true);
  }, [i18n.resolvedLanguage, issues, updateIssues]);

  useEffect(() => {
    if (isOpen) return;

    setActiveIssueKeys([]);
    clearHighlights();
  }, [clearHighlights, isOpen]);

  const issueItems: CollapseProps['items'] = useMemo(() => (
    issues?.map((issue) => {
      const visibleTargets = issue.targets?.filter(showAffectedTarget) || [];

      return {
      key: issue.id,
      label: (
        <Space size={6} align="start">
          <Tag color={severityColor[issue.severity]} style={{ marginInlineEnd: 0 }}>
            {t(`sidebar.check.severity.${issue.severity}`)}
          </Tag>
          <span>{issue.title}</span>
          {issue.suppressed &&
            <Tag color="default" style={{ marginInlineEnd: 0 }}>
              {t('sidebar.check.diagnostics.suppressedTag')}
            </Tag>
          }
        </Space>
      ),
      children: (
        <Flex gap="small" vertical>
          {deduplicationMode !== 'user-friendly' &&
            <Flex gap={4} wrap="wrap">
              <Tag>{t(`sidebar.check.diagnostics.mode.${deduplicationMode}`)}</Tag>
              {issue.fingerprint &&
                <Tag>{`${issue.fingerprint.scope}:${issue.fingerprint.problem}`}</Tag>
              }
              {typeof issue.specificity === 'number' &&
                <Tag>{t('sidebar.check.diagnostics.specificity', { value: issue.specificity })}</Tag>
              }
              {issue.suppressedByIssueIds && issue.suppressedByIssueIds.length > 0 &&
                <Tag color="default">
                  {t('sidebar.check.diagnostics.suppressedBy', {
                    ids: issue.suppressedByIssueIds.join(', '),
                  })}
                </Tag>
              }
            </Flex>
          }
          <Typography.Text>{issue.description}</Typography.Text>
          {issue.recommendation &&
            <Alert
              type="info"
              showIcon
              message={t('sidebar.check.recommendation')}
              description={issue.recommendation}
            />
          }
          {visibleTargets.length > 0 &&
            <List
              size="small"
              header={t('sidebar.check.affectedElements')}
              dataSource={visibleTargets}
              renderItem={(target) => (
                <List.Item>
                  <Typography.Text>
                    {t(`sidebar.check.targetTypes.${target.type}`)}: {targetLabel(target)}
                  </Typography.Text>
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
    };
    })
  ), [deduplicationMode, issues, showAffectedTarget, t, targetLabel, token.colorBorder]);

  const ruleInfos = getDiagramCheckRuleInfos();
  const ruleInfoItems: CollapseProps['items'] = ruleInfos.map((rule) => ({
    key: rule.id,
    label: (
      <Space size={6} align="start">
        <Typography.Text strong>{rule.title}</Typography.Text>
        <Tag>{rule.checks.length}</Tag>
      </Space>
    ),
    children: (
      <Flex gap="small" vertical>
        <Typography.Text type="secondary">{rule.description}</Typography.Text>
        <List
          size="small"
          dataSource={rule.checks}
          renderItem={(check) => (
            <List.Item>
              <Flex gap={2} vertical>
                <Typography.Text>{check.title}</Typography.Text>
                <Typography.Text type="secondary">{check.description}</Typography.Text>
              </Flex>
            </List.Item>
          )}
        />
      </Flex>
    ),
  }));

  const netDebugItems: CollapseProps['items'] = useMemo(() => (
    netDebugNets?.map((net) => {
      const roleDiagnostics = effectiveRoleDebugByNetId[net.id] || [];

      return {
      key: net.id,
      label: (
        <Space size={6} align="start" wrap>
          <Tag color={net.layer === 'elementary' ? 'blue' : net.layer === 'fused' ? 'orange' : net.layer === 'component-linked' ? 'purple' : 'cyan'}>
            {net.layer}
          </Tag>
          <Typography.Text>{net.id}</Typography.Text>
          {net.classifications.map((classification) => (
            <Tag key={classification}>{classification}</Tag>
          ))}
        </Space>
      ),
      children: (
        <Flex gap="small" vertical>
          <Button size="small" onClick={() => highlightTargets(netDebugTargets(net))}>
            Highlight net
          </Button>
          <Typography.Text type="secondary">
            Components: {net.componentIds.length ? net.componentIds.join(', ') : 'none'}
          </Typography.Text>
          <Typography.Text type="secondary">
            Child nets: {net.childNetIds.length ? net.childNetIds.join(', ') : 'none'}
          </Typography.Text>
          <List
            size="small"
            header="Pins"
            dataSource={net.handles}
            renderItem={(handle) => (
              <List.Item>
                <Typography.Text>{handleDebugLabel(handle)}</Typography.Text>
              </List.Item>
            )}
          />
          {net.edges.length > 0 &&
            <List
              size="small"
              header="Wires"
              dataSource={net.edges}
              renderItem={(edge) => (
                <List.Item>
                  <Typography.Text>{`${edge.id}: ${readableWireLabel(edge, net.handles.map((handle) => handle.node))}`}</Typography.Text>
                </List.Item>
              )}
            />
          }
          {roleDiagnostics.length > 0 &&
            <List
              size="small"
              header="Effective signal roles"
              dataSource={roleDiagnostics}
              renderItem={(diagnostic) => (
                <List.Item>
                  <Typography.Text type={diagnostic.status === 'unclear' ? 'warning' : undefined}>
                    {effectiveRoleDebugLabel(diagnostic)}
                  </Typography.Text>
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
    };
    })
  ), [effectiveRoleDebugByNetId, highlightTargets, netDebugNets, token.colorBorder]);

  return (
    <Flex gap="small" vertical>
      <Alert
        type="info"
        showIcon
        message={t('sidebar.check.betaNoticeTitle')}
        description={t('sidebar.check.betaNoticeDescription')}
        action={
          <Button
            size="small"
            icon={<UnorderedListOutlined />}
            onClick={() => setRulesModalOpen(true)}
          >
            {t('sidebar.check.rulesButton')}
          </Button>
        }
      />

      <Modal
        title={t('sidebar.check.rulesModalTitle')}
        open={rulesModalOpen}
        onCancel={() => setRulesModalOpen(false)}
        footer={null}
      >
        <Flex gap="small" vertical>
          <Typography.Text type="secondary">
            {t('sidebar.check.rulesModalDescription')}
          </Typography.Text>
          <Collapse
            defaultActiveKey={ruleInfos.map((rule) => rule.id)}
            items={ruleInfoItems}
          />
        </Flex>
      </Modal>

      <Button
        type="primary"
        icon={<SafetyCertificateOutlined />}
        onClick={runCheck}
      >
        {t('sidebar.check.buttonRun')}
      </Button>

      {SHOW_DIAGRAM_CHECK_DIAGNOSTICS &&
        <Flex gap={4} vertical>
          <Typography.Text type="secondary">
            {t('sidebar.check.diagnostics.modeLabel')}
          </Typography.Text>
          <Segmented<DiagramCheckDeduplicationMode>
            size="small"
            value={deduplicationMode}
            options={[
              {
                label: t('sidebar.check.diagnostics.mode.user-friendly'),
                value: 'user-friendly',
              },
              {
                label: t('sidebar.check.diagnostics.mode.diagnostic'),
                value: 'diagnostic',
              },
              {
                label: t('sidebar.check.diagnostics.mode.diagnostic-with-suppression-markers'),
                value: 'diagnostic-with-suppression-markers',
              },
            ]}
            onChange={updateDeduplicationMode}
            block
          />
        </Flex>
      }

      {issues === null &&
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('sidebar.check.notChecked')}
        />
      }

      {issues !== null && issues.length === 0 &&
        <Alert
          type="success"
          showIcon
          message={t('sidebar.check.noIssuesTitle')}
          description={t('sidebar.check.noIssuesDescription')}
        />
      }

      {issues !== null && issues.length > 0 &&
        <>
          <Typography.Text type="secondary">
            {t('sidebar.check.issueCount', { count: issues.length })}
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
              if (activeIssue) {
                highlightTargets(activeIssue.targets);
              } else {
                clearHighlights();
              }
            }}
          />
        </>
      }

      {SHOW_NET_DEBUG && netDebugNets !== null &&
        <Collapse
          ghost
          items={[
            {
              key: 'net-debug',
              label: `Net debug (${netDebugNets.length})`,
              children: (
                <Collapse
                  ghost
                  items={netDebugItems}
                />
              ),
            },
          ]}
        />
      }
    </Flex>
  );
};
