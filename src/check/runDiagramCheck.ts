import type { Edge, Node } from '@xyflow/react';

import i18next from '../i18n';
import type { ComponentDataType, EdgeDataType } from '../types';
import {
  normalizeDiagramCheckSettings,
  type DiagramCheckSettings,
} from './checkSettingsStore';
import { createDiagramCheckContext } from './checkContext';
import type { DiagramCheckDeduplicationMode, DiagramCheckIssue } from './diagramCheckTypes';
import { normalizeDiagramCheckIssues } from './normalizeDiagramCheckIssues';
import { diagramCheckRules } from './rules';

export const DEFAULT_DIAGRAM_CHECK_DEDUPLICATION_MODE: DiagramCheckDeduplicationMode = 'user-friendly';

type DiagramExportModel = {
  nodes?: Node<ComponentDataType>[];
  edges?: Edge<EdgeDataType>[];
  checkSettings?: Partial<DiagramCheckSettings>;
};

type RunDiagramCheckOptions = {
  deduplicationMode?: DiagramCheckDeduplicationMode;
  checkSettings?: Partial<DiagramCheckSettings>;
};

export function createDiagramCheckContextFromJson(jsonData: string) {
  const model = JSON.parse(jsonData) as DiagramExportModel;
  const nodes = model.nodes || [];
  const edges = model.edges || [];

  return createDiagramCheckContext(nodes, edges);
}

export function runDiagramCheck(
  jsonData: string,
  options: RunDiagramCheckOptions = {},
): DiagramCheckIssue[] {
  const deduplicationMode = options.deduplicationMode || DEFAULT_DIAGRAM_CHECK_DEDUPLICATION_MODE;
  const model = JSON.parse(jsonData) as DiagramExportModel;
  const nodes = model.nodes || [];
  const settings = normalizeDiagramCheckSettings(options.checkSettings || model.checkSettings);

  if (nodes.length === 0) {
    const t = i18next.getFixedT(null, 'main', 'sidebar.check.issues.diagramEmpty');

    return [{
      id: 'diagram-empty',
      severity: 'info',
      priority: 100,
      specificity: 80,
      fingerprint: {
        scope: 'diagram',
        key: 'diagram',
        problem: 'diagram-empty',
      },
      title: t('title'),
      shortDescription: t('shortDescription'),
      description: t('description'),
      recommendation: t('recommendation'),
      ruleId: 'diagram-empty',
    }];
  }

  const context = createDiagramCheckContextFromJson(jsonData);
  const rawIssues = diagramCheckRules.flatMap((rule) => rule.check(context, settings));

  if (deduplicationMode === 'diagnostic') {
    return rawIssues;
  }

  const issuesForMode = deduplicationMode === 'user-friendly'
    ? rawIssues.filter((issue) => !issue.diagnosticOnly)
    : rawIssues;

  return normalizeDiagramCheckIssues(issuesForMode, {
    includeSuppressed: deduplicationMode === 'diagnostic-with-suppression-markers',
  });
}
