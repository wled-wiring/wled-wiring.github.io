export type DiagramCheckSeverity = 'error' | 'warning' | 'info';

export type DiagramCheckTarget = {
  type: 'node' | 'edge';
  id: string;
  handleId?: string;
  label?: string;
};

export type DiagramCheckIssueFingerprint = {
  scope: 'net' | 'component' | 'handle' | 'edge' | 'diagram';
  key: string;
  problem: string;
};

export type DiagramCheckDeduplicationMode =
  | 'user-friendly'
  | 'diagnostic'
  | 'diagnostic-with-suppression-markers';

export type DiagramCheckIssue = {
  id: string;
  severity: DiagramCheckSeverity;
  priority?: number;
  specificity?: number;
  suppresses?: string[];
  suppressedBy?: string[];
  fingerprint?: DiagramCheckIssueFingerprint;
  suppressed?: boolean;
  suppressedByIssueIds?: string[];
  diagnosticOnly?: boolean;
  title: string;
  shortDescription: string;
  description: string;
  recommendation?: string;
  targets?: DiagramCheckTarget[];
  ruleId?: string;
};
