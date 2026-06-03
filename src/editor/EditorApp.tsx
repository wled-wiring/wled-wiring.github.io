import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  ConfigProvider,
  Divider,
  Flex,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DeleteOutlined,
  DownloadOutlined,
  FolderOpenOutlined,
  LeftOutlined,
  PlusOutlined,
  RightOutlined,
  SaveOutlined,
  UpOutlined,
  DownOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';
import '../i18n';
import LocaleSwitcher from '../utils/LocaleSwitcher';
import { edgeTypes } from '../wires';
import { nodeTypes } from '../components';
import type {
  ComponentDefinition,
  ComponentFieldDefinition,
  ComponentHandleDefinition,
  ComponentInternalConnectionDefinition,
  ComponentPackage,
  ComponentRuntimeDefinition,
} from '../components/catalog/componentSchema';
import { getAllComponentDefinitions } from '../components/catalog/componentRegistry';
import { createReactFlowTemplate, normalizeComponentPackage } from '../components/catalog/normalizeComponent';
import {
  KNOWN_COMPONENT_GROUPS,
  KNOWN_HANDLE_FUNCTIONS,
  validateComponentPackage,
  type ComponentValidationIssue,
} from '../components/catalog/validateComponent';
import type {
  ComponentSimulationElementType,
  ComponentSimulationElementUse,
  SimulationParameterPrimitive,
  SimulationParameterRef,
} from '../simulation/simulationTypes';

const LOCAL_STORAGE_KEY = 'wled-wiring-component-editor-drafts-v1';

const { TextArea } = Input;

type PreviewFlowControls = {
  fitView: (options?: {padding?: number; duration?: number}) => Promise<boolean>;
};

const HANDLE_TYPE_OPTIONS = ['source', 'target'].map((value) => ({value, label: value}));
const HANDLE_ALIGN_OPTIONS = ['start', 'end'].map((value) => ({value, label: value}));
const HANDLE_POSTYPE_OPTIONS = ['centered', 'top', 'bottom', 'left', 'right'].map((value) => ({value, label: value}));
const HANDLE_POSITION_OPTIONS = ['left', 'right', 'top', 'bottom'].map((value) => ({value, label: value}));
const CONNECTION_KIND_OPTIONS = ['short', 'fuse'].map((value) => ({value, label: value}));
const FIELD_TYPE_OPTIONS = ['number', 'select'].map((value) => ({value, label: value}));
const SIMULATION_ELEMENT_TYPES: ComponentSimulationElementType[] = [
  'resistor',
  'shortBridge',
  'voltageSource',
  'currentSource',
  'constantPowerSink',
  'fuse',
  'digitalLed',
  'dcdcConverter',
  'diode',
];

const SIMULATION_ELEMENT_DEFINITIONS: Record<
  ComponentSimulationElementType,
  {terminals: string[]; parameters: string[]}
> = {
  resistor: {terminals: ['a', 'b'], parameters: ['resistanceOhm']},
  shortBridge: {terminals: ['a', 'b'], parameters: []},
  voltageSource: {
    terminals: ['positive', 'negative'],
    parameters: ['voltageV', 'currentLimitA', 'voltageDropPctAt150Current'],
  },
  currentSource: {terminals: ['positive', 'negative'], parameters: ['currentA']},
  constantPowerSink: {terminals: ['positive', 'negative'], parameters: ['powerW', 'minVoltageV']},
  fuse: {terminals: ['a', 'b'], parameters: ['resistanceOhm', 'nominalCurrentA']},
  digitalLed: {
    terminals: ['supplyIn', 'supplyOut', 'gndIn', 'gndOut'],
    parameters: [
      'supplyResistanceOhm',
      'gndResistanceOhm',
      'ledType',
      'ledsPerMeter',
      'physLedsPerLogicLed',
      'currentCurve',
    ],
  },
  dcdcConverter: {
    terminals: ['inPositive', 'inNegative', 'outPositive', 'outNegative'],
    parameters: ['outputVoltageV', 'efficiency', 'outputCurrentLimitA', 'voltageDropPctAt150Current'],
  },
  diode: {terminals: ['anode', 'cathode'], parameters: ['forwardVoltageV']},
};

type DraftEntry = {
  id: string;
  updatedAt: string;
  componentPackage: ComponentPackage;
};

const createEmptyPackage = (): ComponentPackage => ({
  schemaVersion: 1,
  source: {type: 'local'},
  component: {
    id: 'MyComponent',
    version: 1,
    display: {
      name: {default: 'My component'},
      descriptionShort: {default: 'Short component description'},
      description: {default: ''},
      group: 'others',
    },
    geometry: {
      image: {
        url: './my-component.png',
        width: 120,
        height: 80,
      },
      rotation: 0,
      rotatable: true,
      resizableX: false,
      resizableY: false,
      borderWidth: 2,
    },
    handles: [],
  },
});

const clonePackageForLocalEdit = (componentPackage: ComponentPackage): ComponentPackage => ({
  ...structuredClone(componentPackage),
  source: {type: 'local', packageId: `local-${componentPackage.component.id}`},
});

const readDrafts = (): DraftEntry[] => {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeDrafts = (drafts: DraftEntry[]) => {
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(drafts));
};

const packageDraftId = (componentPackage: ComponentPackage) => (
  `${componentPackage.source.type}:${'packageId' in componentPackage.source ? componentPackage.source.packageId ?? '' : ''}:${componentPackage.component.id}`
);

const localizedTextToInput = (value: ComponentDefinition['display']['name'] | undefined): string => {
  if (typeof value === 'string') return value;
  return value?.default ?? '';
};

const inputToLocalizedText = (value: string) => ({default: value});

const safeJsonParse = <Value,>(value: string): {ok: true; value: Value} | {ok: false; message: string} => {
  try {
    return {ok: true, value: JSON.parse(value) as Value};
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
};

const formatJson = (value: unknown) => JSON.stringify(value ?? null, null, 2);

const downloadPackage = (componentPackage: ComponentPackage) => {
  const blob = new Blob([`${JSON.stringify(componentPackage, null, 2)}\n`], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${componentPackage.component.id || 'component'}.component.json`;
  anchor.click();
  URL.revokeObjectURL(url);
};

const validationColumns: ColumnsType<ComponentValidationIssue & {key: string}> = [
  {
    title: 'Severity',
    dataIndex: 'severity',
    key: 'severity',
    width: 96,
    render: (severity: ComponentValidationIssue['severity']) => (
      <Tag color={severity === 'error' ? 'red' : 'orange'}>{severity}</Tag>
    ),
  },
  {
    title: 'Path',
    dataIndex: 'path',
    key: 'path',
    width: 260,
  },
  {
    title: 'Message',
    dataIndex: 'message',
    key: 'message',
  },
];

const useJsonSection = <Value,>(
  value: Value,
  onApply: (value: Value) => void,
  errorPrefix: string,
) => {
  const [text, setText] = useState(formatJson(value));
  const [error, setError] = useState<string | undefined>();

  const reset = (nextValue: Value) => {
    setText(formatJson(nextValue));
    setError(undefined);
  };

  useEffect(() => {
    setText(formatJson(value));
    setError(undefined);
  }, [value]);

  const apply = () => {
    const parsed = safeJsonParse<Value>(text);
    if (!parsed.ok) {
      setError(`${errorPrefix}: ${parsed.message}`);
      return false;
    }
    setError(undefined);
    onApply(parsed.value);
    return true;
  };

  return {text, setText, error, apply, reset};
};

type JsonSectionProps = {
  title: string;
  description: string;
  text: string;
  error?: string;
  onChange: (value: string) => void;
  onApply: () => void;
};

const JsonSection = ({title, description, text, error, onChange, onApply}: JsonSectionProps) => (
  <Flex vertical gap={8}>
    <Typography.Text strong>{title}</Typography.Text>
    <Typography.Text type="secondary">{description}</Typography.Text>
    {error && <Alert type="error" message={error} showIcon />}
    <TextArea
      value={text}
      onChange={(event) => onChange(event.target.value)}
      autoSize={{minRows: 12, maxRows: 24}}
      spellCheck={false}
      style={{fontFamily: 'Consolas, monospace'}}
    />
    <Button onClick={onApply}>{title}</Button>
  </Flex>
);

type StructuredSectionProps = {
  ui: React.ReactNode;
  json: React.ReactNode;
};

const StructuredSection = ({ui, json}: StructuredSectionProps) => {
  const {t} = useTranslation(['main']);

  return (
    <Tabs
      items={[
        {key: 'ui', label: t('componentEditor.editorModes.ui'), children: ui},
        {key: 'json', label: t('componentEditor.editorModes.json'), children: json},
      ]}
    />
  );
};

const handleOptions = (handles: ComponentHandleDefinition[]) => (
  handles.map((handle) => ({value: handle.id, label: handle.id || '(empty)'}))
);

const updateArrayItem = <Value,>(
  values: Value[],
  index: number,
  updater: (value: Value) => Value,
): Value[] => values.map((value, itemIndex) => (itemIndex === index ? updater(value) : value));

const removeArrayItem = <Value,>(values: Value[], index: number): Value[] => (
  values.filter((_, itemIndex) => itemIndex !== index)
);

const toPrimitive = (value: string, type: 'number' | 'string' | 'boolean'): SimulationParameterPrimitive => {
  if (type === 'number') return Number(value) || 0;
  if (type === 'boolean') return value === 'true';
  return value;
};

const getParameterKind = (value: SimulationParameterRef): string => {
  if (typeof value !== 'object' || value === null) return typeof value;
  if ('const' in value) return 'const';
  if ('field' in value) return 'field';
  if ('select' in value) return 'select';
  if ('ledSimulationOption' in value) return 'ledSimulationOption';
  return 'json';
};

type ParameterRefEditorProps = {
  value: SimulationParameterRef;
  fields: ComponentFieldDefinition[];
  onChange: (value: SimulationParameterRef) => void;
};

const ParameterJsonTextArea = ({value, onChange}: ParameterRefEditorProps) => {
  const [text, setText] = useState(formatJson(value));

  useEffect(() => {
    setText(formatJson(value));
  }, [value]);

  return (
    <TextArea
      value={text}
      autoSize={{minRows: 2, maxRows: 6}}
      style={{fontFamily: 'Consolas, monospace', width: 320}}
      onChange={(event) => setText(event.target.value)}
      onBlur={() => {
        const parsed = safeJsonParse<SimulationParameterRef>(text);
        if (parsed.ok) onChange(parsed.value);
      }}
    />
  );
};

const ParameterRefEditor = ({value, fields, onChange}: ParameterRefEditorProps) => {
  const kind = getParameterKind(value);
  const fieldOptions = fields.map((field) => ({value: field.id, label: field.id}));
  const selectFieldOptions = fields
    .filter((field) => field.type === 'select')
    .map((field) => ({value: field.id, label: field.id}));
  const primitiveType: 'number' | 'string' | 'boolean' = typeof value === 'boolean'
    ? 'boolean'
    : typeof value === 'string'
      ? 'string'
      : 'number';
  const primitiveValue = typeof value === 'object' && value !== null && 'const' in value ? value.const : value;

  return (
    <Flex gap={8} wrap="wrap" align="start">
      <Select
        value={kind}
        style={{width: 148}}
        options={[
          {value: 'number', label: 'number'},
          {value: 'string', label: 'string'},
          {value: 'boolean', label: 'boolean'},
          {value: 'const', label: 'const'},
          {value: 'field', label: 'field'},
          {value: 'select', label: 'select'},
          {value: 'ledSimulationOption', label: 'LED option'},
          {value: 'json', label: 'JSON'},
        ]}
        onChange={(nextKind) => {
          if (nextKind === 'number') onChange(0);
          else if (nextKind === 'string') onChange('');
          else if (nextKind === 'boolean') onChange(false);
          else if (nextKind === 'const') onChange({const: 0});
          else if (nextKind === 'field') onChange({field: fields[0]?.id ?? ''});
          else if (nextKind === 'select') onChange({select: selectFieldOptions[0]?.value ?? ''});
          else if (nextKind === 'ledSimulationOption') onChange({ledSimulationOption: 'supplyResistance'});
          else onChange({const: 0});
        }}
      />
      {(kind === 'number' || kind === 'string' || kind === 'boolean') && (
        <>
          <Select
            value={primitiveType}
            style={{width: 104}}
            options={[
              {value: 'number', label: 'number'},
              {value: 'string', label: 'string'},
              {value: 'boolean', label: 'boolean'},
            ]}
            onChange={(nextType) => onChange(toPrimitive(String(value), nextType))}
          />
          {primitiveType === 'boolean' ? (
            <Checkbox checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
          ) : (
            <Input
              value={String(value)}
              onChange={(event) => onChange(toPrimitive(event.target.value, primitiveType))}
              style={{width: 180}}
            />
          )}
        </>
      )}
      {kind === 'const' && typeof value === 'object' && value !== null && 'const' in value && (
        <Input
          value={String(primitiveValue)}
          onChange={(event) => {
            const constType = typeof primitiveValue === 'boolean'
              ? 'boolean'
              : typeof primitiveValue === 'string'
                ? 'string'
                : 'number';
            onChange({const: toPrimitive(event.target.value, constType)});
          }}
          style={{width: 180}}
        />
      )}
      {kind === 'field' && typeof value === 'object' && value !== null && 'field' in value && (
        <Select
          value={value.field}
          options={fieldOptions}
          style={{width: 220}}
          onChange={(field) => onChange({...value, field})}
        />
      )}
      {kind === 'select' && typeof value === 'object' && value !== null && 'select' in value && (
        <Select
          value={value.select}
          options={selectFieldOptions}
          style={{width: 220}}
          onChange={(select) => onChange({...value, select})}
        />
      )}
      {kind === 'ledSimulationOption' && typeof value === 'object' && value !== null && 'ledSimulationOption' in value && (
        <Select
          value={value.ledSimulationOption}
          options={[
            {value: 'supplyResistance', label: 'supplyResistance'},
            {value: 'gndResistance', label: 'gndResistance'},
            {value: 'currentCurve', label: 'currentCurve'},
          ]}
          style={{width: 220}}
          onChange={(ledSimulationOption) => onChange({ledSimulationOption})}
        />
      )}
      {kind === 'json' && (
        <ParameterJsonTextArea value={value} fields={fields} onChange={onChange} />
      )}
    </Flex>
  );
};

type HandlesEditorProps = {
  handles: ComponentHandleDefinition[];
  fields: ComponentFieldDefinition[];
  selectedHandleId?: string;
  onSelectedHandleIdChange: (handleId: string | undefined) => void;
  onChange: (handles: ComponentHandleDefinition[]) => void;
};

const HandlesEditor = ({handles, fields, selectedHandleId, onSelectedHandleIdChange, onChange}: HandlesEditorProps) => {
  const {t} = useTranslation(['main']);
  const fieldOptions = fields.map((field) => ({value: field.id, label: field.id}));
  const selectedIndex = handles.findIndex((handle) => handle.id === selectedHandleId);
  const activeIndex = selectedIndex >= 0 ? selectedIndex : handles.length > 0 ? 0 : -1;
  const activeHandle = activeIndex >= 0 ? handles[activeIndex] : undefined;

  useEffect(() => {
    if (handles.length === 0) {
      if (selectedHandleId !== undefined) onSelectedHandleIdChange(undefined);
      return;
    }
    if (selectedIndex < 0) {
      onSelectedHandleIdChange(handles[0].id);
    }
  }, [handles, onSelectedHandleIdChange, selectedHandleId, selectedIndex]);

  const createHandle = (): ComponentHandleDefinition => ({
    id: `handle_${handles.length + 1}`,
    name: {default: `Handle ${handles.length + 1}`},
    type: 'source',
    x: 0,
    y: 0,
    xalign: 'start',
    yalign: 'start',
    width: 6,
    height: 6,
    postype: 'centered',
    position: 'left',
    border: {type: 'solid', color: '#000000', lineWidth: 1, radius: '30%'},
  });

  const updateActiveHandle = (updater: (handle: ComponentHandleDefinition) => ComponentHandleDefinition) => {
    if (activeIndex < 0) return;
    const nextHandles = updateArrayItem(handles, activeIndex, updater);
    onChange(nextHandles);
  };

  const deleteActiveHandle = () => {
    if (activeIndex < 0) return;
    const nextHandles = removeArrayItem(handles, activeIndex);
    onChange(nextHandles);
    onSelectedHandleIdChange(nextHandles[Math.min(activeIndex, nextHandles.length - 1)]?.id);
  };

  const handleOptionsWithIndex = handles.map((handle, index) => ({
    value: handle.id,
    label: `${index + 1}. ${handle.id || t('componentEditor.labels.unnamed')}`,
  }));

  if (!activeHandle) {
    return (
      <Flex vertical gap={8}>
        <Button
          icon={<PlusOutlined />}
          onClick={() => {
            const newHandle = createHandle();
            onChange(handles.concat(newHandle));
            onSelectedHandleIdChange(newHandle.id);
          }}
        >
          {t('componentEditor.actions.addHandle')}
        </Button>
        <Alert type="info" message={t('componentEditor.messages.noHandles')} showIcon />
      </Flex>
    );
  }

  return (
    <Flex vertical gap={8}>
      <Flex gap={8} wrap="wrap" align="center">
        <Select
          showSearch
          optionFilterProp="label"
          value={activeHandle.id}
          options={handleOptionsWithIndex}
          style={{minWidth: 260, flex: '1 1 260px'}}
          onChange={onSelectedHandleIdChange}
        />
        <Button
          icon={<PlusOutlined />}
          onClick={() => {
            const newHandle = createHandle();
            onChange(handles.concat(newHandle));
            onSelectedHandleIdChange(newHandle.id);
          }}
        >
          {t('componentEditor.actions.addHandle')}
        </Button>
        <Button icon={<DeleteOutlined />} onClick={deleteActiveHandle}>
          {t('componentEditor.actions.deleteHandle')}
        </Button>
      </Flex>
        <Card
          key={`${activeHandle.id}-${activeIndex}`}
          size="small"
          title={activeHandle.id || t('componentEditor.labels.unnamed')}
        >
          <Form layout="vertical">
            <Flex gap={8} wrap="wrap">
              <Form.Item label={t('componentEditor.fields.handleId')} style={{flex: '1 1 160px'}}>
                <Input
                  value={activeHandle.id}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    updateActiveHandle((item) => ({...item, id: nextId}));
                    onSelectedHandleIdChange(nextId);
                  }}
                />
              </Form.Item>
              <Form.Item label={t('componentEditor.fields.name')} style={{flex: '1 1 180px'}}>
                <Input
                  value={localizedTextToInput(activeHandle.name)}
                  onChange={(event) => updateActiveHandle((item) => ({
                    ...item,
                    name: inputToLocalizedText(event.target.value),
                  }))}
                />
              </Form.Item>
              <Form.Item label={t('componentEditor.fields.handleType')} style={{width: 120}}>
                <Select
                  value={activeHandle.type}
                  options={HANDLE_TYPE_OPTIONS}
                  onChange={(type) => updateActiveHandle((item) => ({...item, type}))}
                />
              </Form.Item>
            </Flex>
            <Flex gap={8} wrap="wrap">
              {(['x', 'y', 'width', 'height'] as const).map((key) => (
                <Form.Item key={key} label={key} style={{width: 108}}>
                  <InputNumber
                    value={activeHandle[key]}
                    onChange={(value) => updateActiveHandle((item) => ({
                      ...item,
                      [key]: value ?? 0,
                    }))}
                    style={{width: '100%'}}
                  />
                </Form.Item>
              ))}
              <Form.Item label="xalign" style={{width: 112}}>
                <Select
                  value={activeHandle.xalign}
                  options={HANDLE_ALIGN_OPTIONS}
                  onChange={(xalign) => updateActiveHandle((item) => ({...item, xalign}))}
                />
              </Form.Item>
              <Form.Item label="yalign" style={{width: 112}}>
                <Select
                  value={activeHandle.yalign}
                  options={HANDLE_ALIGN_OPTIONS}
                  onChange={(yalign) => updateActiveHandle((item) => ({...item, yalign}))}
                />
              </Form.Item>
              <Form.Item label="postype" style={{width: 132}}>
                <Select
                  value={activeHandle.postype}
                  options={HANDLE_POSTYPE_OPTIONS}
                  onChange={(postype) => updateActiveHandle((item) => ({...item, postype}))}
                />
              </Form.Item>
              <Form.Item label="position" style={{width: 132}}>
                <Select
                  value={activeHandle.position}
                  options={HANDLE_POSITION_OPTIONS}
                  onChange={(position) => updateActiveHandle((item) => ({...item, position}))}
                />
              </Form.Item>
            </Flex>
            <Form.Item label={t('componentEditor.fields.functions')}>
              <Select
                mode="multiple"
                value={activeHandle.functions ?? []}
                options={KNOWN_HANDLE_FUNCTIONS.map((value) => ({value, label: value}))}
                onChange={(functions) => updateActiveHandle((item) => ({
                  ...item,
                  functions: functions.length > 0 ? functions : undefined,
                }))}
              />
            </Form.Item>
            <Flex gap={8} wrap="wrap">
              <Form.Item label={t('componentEditor.fields.borderColor')} style={{width: 128}}>
                <Input
                  type="color"
                  value={activeHandle.border?.color ?? '#000000'}
                  onChange={(event) => updateActiveHandle((item) => ({
                    ...item,
                    border: {...(item.border ?? {type: 'solid', lineWidth: 1, radius: '30%'}), color: event.target.value},
                  }))}
                />
              </Form.Item>
              <Form.Item label={t('componentEditor.fields.borderType')} style={{width: 128}}>
                <Input
                  value={activeHandle.border?.type ?? ''}
                  onChange={(event) => updateActiveHandle((item) => ({
                    ...item,
                    border: {...(item.border ?? {color: '#000000', lineWidth: 1, radius: '30%'}), type: event.target.value},
                  }))}
                />
              </Form.Item>
              <Form.Item label={t('componentEditor.fields.borderLineWidth')} style={{width: 128}}>
                <InputNumber
                  min={0}
                  value={activeHandle.border?.lineWidth}
                  onChange={(lineWidth) => updateActiveHandle((item) => ({
                    ...item,
                    border: {...(item.border ?? {type: 'solid', color: '#000000', radius: '30%'}), lineWidth: lineWidth ?? 0},
                  }))}
                  style={{width: '100%'}}
                />
              </Form.Item>
              <Form.Item label={t('componentEditor.fields.borderRadius')} style={{width: 128}}>
                <Input
                  value={activeHandle.border?.radius ?? ''}
                  onChange={(event) => updateActiveHandle((item) => ({
                    ...item,
                    border: {...(item.border ?? {type: 'solid', color: '#000000', lineWidth: 1}), radius: event.target.value},
                  }))}
                />
              </Form.Item>
            </Flex>
            <Flex gap={8} wrap="wrap">
              <Form.Item label="Vout" style={{width: 120}}>
                <InputNumber
                  value={activeHandle.voltage?.out}
                  onChange={(out) => updateActiveHandle((item) => ({
                    ...item,
                    voltage: {...(item.voltage ?? {}), out: out ?? undefined},
                  }))}
                  style={{width: '100%'}}
                />
              </Form.Item>
              <Form.Item label="Vout dependency" style={{width: 180}}>
                <Select
                  allowClear
                  value={activeHandle.voltage?.outDependency}
                  options={handleOptions(handles)}
                  onChange={(outDependency) => updateActiveHandle((item) => ({
                    ...item,
                    voltage: {...(item.voltage ?? {}), outDependency},
                  }))}
                />
              </Form.Item>
              <Form.Item label="Tol min" style={{width: 120}}>
                <InputNumber
                  value={activeHandle.voltage?.toleranceMin}
                  onChange={(toleranceMin) => updateActiveHandle((item) => ({
                    ...item,
                    voltage: {...(item.voltage ?? {}), toleranceMin: toleranceMin ?? undefined},
                  }))}
                  style={{width: '100%'}}
                />
              </Form.Item>
              <Form.Item label="Tol max" style={{width: 120}}>
                <InputNumber
                  value={activeHandle.voltage?.toleranceMax}
                  onChange={(toleranceMax) => updateActiveHandle((item) => ({
                    ...item,
                    voltage: {...(item.voltage ?? {}), toleranceMax: toleranceMax ?? undefined},
                  }))}
                  style={{width: '100%'}}
                />
              </Form.Item>
              <Form.Item label="Imax" style={{width: 120}}>
                <InputNumber
                  min={0}
                  addonAfter="A"
                  value={activeHandle.Imax}
                  onChange={(Imax) => updateActiveHandle((item) => ({
                    ...item,
                    Imax: Imax ?? undefined,
                  }))}
                  style={{width: '100%'}}
                />
              </Form.Item>
              <Form.Item label="Cross abs" style={{width: 140}}>
                <InputNumber
                  min={0}
                  addonAfter="mm2"
                  value={activeHandle.maxCrossSectionAbsolute}
                  onChange={(maxCrossSectionAbsolute) => updateActiveHandle((item) => ({
                    ...item,
                    maxCrossSectionAbsolute: maxCrossSectionAbsolute ?? undefined,
                  }))}
                  style={{width: '100%'}}
                />
              </Form.Item>
              <Form.Item label="Cross warn" style={{width: 140}}>
                <InputNumber
                  min={0}
                  addonAfter="mm2"
                  value={activeHandle.maxCrossSectionWarning}
                  onChange={(maxCrossSectionWarning) => updateActiveHandle((item) => ({
                    ...item,
                    maxCrossSectionWarning: maxCrossSectionWarning ?? undefined,
                  }))}
                  style={{width: '100%'}}
                />
              </Form.Item>
            </Flex>
            <Form.Item label={t('componentEditor.fields.relatedToHandle')}>
              <Select
                allowClear
                mode="multiple"
                optionFilterProp="label"
                value={activeHandle.relatedToHandle ?? []}
                options={handleOptions(handles).filter((option) => option.value !== activeHandle.id)}
                onChange={(relatedToHandle) => updateActiveHandle((item) => ({
                  ...item,
                  relatedToHandle: relatedToHandle.length > 0 ? relatedToHandle : undefined,
                }))}
              />
            </Form.Item>
            <Space wrap>
              {(['repeated', 'repeatAtFirst', 'mustBeConnected', 'changeColorAutomatically', 'internallyProtected'] as const).map((key) => (
                <Checkbox
                  key={key}
                  checked={Boolean(activeHandle.behavior?.[key])}
                  onChange={(event) => updateActiveHandle((item) => ({
                    ...item,
                    behavior: {...(item.behavior ?? {}), [key]: event.target.checked},
                  }))}
                >
                  {key}
                </Checkbox>
              ))}
            </Space>
            <Flex gap={8} wrap="wrap" style={{marginTop: 8}}>
              <Form.Item label="controllableBy" style={{width: 180}}>
                <Select
                  allowClear
                  value={activeHandle.behavior?.controllableBy}
                  options={handleOptions(handles)}
                  onChange={(controllableBy) => updateActiveHandle((item) => ({
                    ...item,
                    behavior: {...(item.behavior ?? {}), controllableBy},
                  }))}
                />
              </Form.Item>
              <Form.Item label="preferredLineWidth" style={{width: 160}}>
                <InputNumber
                  value={activeHandle.behavior?.preferredLineWidth}
                  onChange={(preferredLineWidth) => updateActiveHandle((item) => ({
                    ...item,
                    behavior: {...(item.behavior ?? {}), preferredLineWidth: preferredLineWidth ?? undefined},
                  }))}
                  style={{width: '100%'}}
                />
              </Form.Item>
              <Form.Item label="preferredLineDirection" style={{width: 180}}>
                <Select
                  allowClear
                  value={activeHandle.behavior?.preferredLineDirection}
                  options={['up', 'down', 'left', 'right'].map((value) => ({value, label: value}))}
                  onChange={(preferredLineDirection) => updateActiveHandle((item) => ({
                    ...item,
                    behavior: {...(item.behavior ?? {}), preferredLineDirection},
                  }))}
                />
              </Form.Item>
            </Flex>
            <Form.Item label={t('componentEditor.fields.hideConditions')}>
              <Select
                mode="multiple"
                value={(activeHandle.behavior?.hideConditions ?? []).map((condition) => condition.fieldId)}
                options={fieldOptions}
                onChange={(fieldIds) => updateActiveHandle((item) => ({
                  ...item,
                  behavior: {
                    ...(item.behavior ?? {}),
                    hideConditions: fieldIds.map((fieldId) => ({
                      fieldId,
                      values: item.behavior?.hideConditions?.find((condition) => condition.fieldId === fieldId)?.values ?? [],
                    })),
                  },
                }))}
              />
            </Form.Item>
          </Form>
        </Card>
    </Flex>
  );
};

type FieldsEditorProps = {
  fields: ComponentFieldDefinition[];
  selectedFieldIndex: number | undefined;
  onSelectedFieldIndexChange: (index: number | undefined) => void;
  onChange: (fields: ComponentFieldDefinition[]) => void;
};

const FieldsEditor = ({fields, selectedFieldIndex, onSelectedFieldIndexChange, onChange}: FieldsEditorProps) => {
  const {t} = useTranslation(['main']);
  const activeIndex = selectedFieldIndex !== undefined && selectedFieldIndex >= 0 && selectedFieldIndex < fields.length
    ? selectedFieldIndex
    : fields.length > 0 ? 0 : -1;
  const activeField = activeIndex >= 0 ? fields[activeIndex] : undefined;

  useEffect(() => {
    if (fields.length === 0) {
      if (selectedFieldIndex !== undefined) onSelectedFieldIndexChange(undefined);
      return;
    }
    if (selectedFieldIndex === undefined || selectedFieldIndex < 0 || selectedFieldIndex >= fields.length) {
      onSelectedFieldIndexChange(0);
    }
  }, [fields.length, onSelectedFieldIndexChange, selectedFieldIndex]);

  const createNumberField = (): ComponentFieldDefinition => ({
    id: `field_${fields.length + 1}`,
    type: 'number',
    name: {default: `Field ${fields.length + 1}`},
    value: 0,
    min: 0,
    max: 100,
    step: 1,
  });

  const updateActiveField = (updater: (field: ComponentFieldDefinition) => ComponentFieldDefinition) => {
    if (activeIndex < 0) return;
    onChange(updateArrayItem(fields, activeIndex, updater));
  };

  const deleteActiveField = () => {
    if (activeIndex < 0) return;
    const nextFields = removeArrayItem(fields, activeIndex);
    onChange(nextFields);
    onSelectedFieldIndexChange(nextFields.length > 0 ? Math.min(activeIndex, nextFields.length - 1) : undefined);
  };

  const fieldOptionsWithIndex = fields.map((field, index) => ({
    value: index,
    label: `${index + 1}. ${field.id || t('componentEditor.labels.unnamed')}`,
  }));

  if (!activeField) {
    return (
      <Flex vertical gap={8}>
        <Button
          icon={<PlusOutlined />}
          onClick={() => {
            const newField = createNumberField();
            onChange(fields.concat(newField));
            onSelectedFieldIndexChange(fields.length);
          }}
        >
          {t('componentEditor.actions.addField')}
        </Button>
        <Alert type="info" message={t('componentEditor.messages.noFields')} showIcon />
      </Flex>
    );
  }

  return (
    <Flex vertical gap={8}>
      <Flex gap={8} wrap="wrap" align="center">
        <Select
          showSearch
          optionFilterProp="label"
          value={activeIndex}
          options={fieldOptionsWithIndex}
          style={{minWidth: 260, flex: '1 1 260px'}}
          onChange={onSelectedFieldIndexChange}
        />
        <Button
          icon={<PlusOutlined />}
          onClick={() => {
            const newField = createNumberField();
            onChange(fields.concat(newField));
            onSelectedFieldIndexChange(fields.length);
          }}
        >
          {t('componentEditor.actions.addField')}
        </Button>
        <Button icon={<DeleteOutlined />} onClick={deleteActiveField}>
          {t('componentEditor.actions.deleteField')}
        </Button>
      </Flex>
        <Card
          key={`${activeField.id}-${activeIndex}`}
          size="small"
          title={activeField.id || t('componentEditor.labels.unnamed')}
        >
          <Form layout="vertical">
            <Flex gap={8} wrap="wrap">
              <Form.Item label={t('componentEditor.fields.fieldId')} style={{flex: '1 1 160px'}}>
                <Input
                  value={activeField.id}
                  onChange={(event) => updateActiveField((item) => ({...item, id: event.target.value}))}
                />
              </Form.Item>
              <Form.Item label={t('componentEditor.fields.name')} style={{flex: '1 1 180px'}}>
                <Input
                  value={localizedTextToInput(activeField.name)}
                  onChange={(event) => updateActiveField((item) => ({
                    ...item,
                    name: inputToLocalizedText(event.target.value),
                  }))}
                />
              </Form.Item>
              <Form.Item label={t('componentEditor.fields.fieldType')} style={{width: 132}}>
                <Select
                  value={activeField.type}
                  options={FIELD_TYPE_OPTIONS}
                  onChange={(type) => updateActiveField((item) => (
                    type === 'number'
                      ? {
                          id: item.id,
                          type: 'number',
                          name: item.name,
                          value: 'value' in item ? item.value : 0,
                          min: 0,
                          max: 100,
                          step: 1,
                          unit: item.unit,
                          ui: item.ui,
                        }
                      : {
                          id: item.id,
                          type: 'select',
                          name: item.name,
                          selectedValue: 0,
                          options: [{value: 0, label: {default: 'Option 0'}}],
                          unit: item.unit,
                          ui: item.ui,
                        }
                  ))}
                />
              </Form.Item>
              <Form.Item label={t('componentEditor.fields.unit')} style={{width: 120}}>
                <Input
                  value={activeField.unit}
                  onChange={(event) => updateActiveField((item) => ({
                    ...item,
                    unit: event.target.value || undefined,
                  }))}
                />
              </Form.Item>
            </Flex>
            {activeField.type === 'number' ? (
              <Flex gap={8} wrap="wrap">
                {(['value', 'min', 'max', 'step'] as const).map((key) => (
                  <Form.Item key={key} label={key} style={{width: 120}}>
                    <InputNumber
                      value={activeField[key]}
                      onChange={(value) => updateActiveField((item) => (
                        item.type === 'number' ? {...item, [key]: value ?? 0} : item
                      ))}
                      style={{width: '100%'}}
                    />
                  </Form.Item>
                ))}
              </Flex>
            ) : (
              <Flex vertical gap={8}>
                <Form.Item label={t('componentEditor.fields.selectedValue')} style={{maxWidth: 220}}>
                  <Select
                    value={activeField.selectedValue}
                    options={activeField.options.map((option) => ({value: option.value, label: `${option.value}: ${localizedTextToInput(option.label)}`}))}
                    onChange={(selectedValue) => updateActiveField((item) => (
                      item.type === 'select' ? {...item, selectedValue} : item
                    ))}
                  />
                </Form.Item>
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => updateActiveField((item) => (
                    item.type === 'select'
                      ? {
                          ...item,
                          options: item.options.concat({
                            value: item.options.length,
                            label: {default: `Option ${item.options.length}`},
                          }),
                        }
                      : item
                  ))}
                >
                  {t('componentEditor.actions.addOption')}
                </Button>
                {activeField.options.map((option, optionIndex) => (
                  <Flex key={`${option.value}-${optionIndex}`} gap={8} wrap="wrap" align="center">
                    <InputNumber
                      value={option.value}
                      onChange={(value) => updateActiveField((item) => (
                        item.type === 'select'
                          ? {
                              ...item,
                              options: updateArrayItem(item.options, optionIndex, (current) => ({
                                ...current,
                                value: value ?? 0,
                              })),
                            }
                          : item
                      ))}
                      style={{width: 96}}
                    />
                    <Input
                      value={localizedTextToInput(option.label)}
                      onChange={(event) => updateActiveField((item) => (
                        item.type === 'select'
                          ? {
                              ...item,
                              options: updateArrayItem(item.options, optionIndex, (current) => ({
                                ...current,
                                label: inputToLocalizedText(event.target.value),
                              })),
                            }
                          : item
                      ))}
                      style={{width: 220}}
                    />
                    <InputNumber
                      placeholder="x"
                      value={option.x}
                      onChange={(x) => updateActiveField((item) => (
                        item.type === 'select'
                          ? {
                              ...item,
                              options: updateArrayItem(item.options, optionIndex, (current) => ({...current, x: x ?? undefined})),
                            }
                          : item
                      ))}
                      style={{width: 96}}
                    />
                    <InputNumber
                      placeholder="y"
                      value={option.y}
                      onChange={(y) => updateActiveField((item) => (
                        item.type === 'select'
                          ? {
                              ...item,
                              options: updateArrayItem(item.options, optionIndex, (current) => ({...current, y: y ?? undefined})),
                            }
                          : item
                      ))}
                      style={{width: 96}}
                    />
                    <Button
                      icon={<DeleteOutlined />}
                      onClick={() => updateActiveField((item) => (
                        item.type === 'select' ? {...item, options: removeArrayItem(item.options, optionIndex)} : item
                      ))}
                    />
                  </Flex>
                ))}
              </Flex>
            )}
            <Divider style={{margin: '8px 0'}} />
            <Space wrap>
              {(['displayName', 'hide', 'showNameIfSelected', 'customImage'] as const).map((key) => (
                <Checkbox
                  key={key}
                  checked={Boolean(activeField.ui?.[key])}
                  onChange={(event) => updateActiveField((item) => ({
                    ...item,
                    ui: {...(item.ui ?? {}), [key]: event.target.checked},
                  }))}
                >
                  {key}
                </Checkbox>
              ))}
            </Space>
          </Form>
        </Card>
    </Flex>
  );
};

type ConnectionsEditorProps = {
  connections: ComponentInternalConnectionDefinition[];
  handles: ComponentHandleDefinition[];
  fields: ComponentFieldDefinition[];
  selectedConnectionIndex: number | undefined;
  onSelectedConnectionIndexChange: (index: number | undefined) => void;
  onChange: (connections: ComponentInternalConnectionDefinition[]) => void;
};

const ConnectionsEditor = ({
  connections,
  handles,
  fields,
  selectedConnectionIndex,
  onSelectedConnectionIndexChange,
  onChange,
}: ConnectionsEditorProps) => {
  const {t} = useTranslation(['main']);
  const handleSelectOptions = handleOptions(handles);
  const numberFieldOptions = fields
    .filter((field) => field.type === 'number')
    .map((field) => ({value: field.id, label: field.id}));
  const activeIndex = selectedConnectionIndex !== undefined
    && selectedConnectionIndex >= 0
    && selectedConnectionIndex < connections.length
    ? selectedConnectionIndex
    : connections.length > 0 ? 0 : -1;
  const activeConnection = activeIndex >= 0 ? connections[activeIndex] : undefined;

  useEffect(() => {
    if (connections.length === 0) {
      if (selectedConnectionIndex !== undefined) onSelectedConnectionIndexChange(undefined);
      return;
    }
    if (
      selectedConnectionIndex === undefined
      || selectedConnectionIndex < 0
      || selectedConnectionIndex >= connections.length
    ) {
      onSelectedConnectionIndexChange(0);
    }
  }, [connections.length, onSelectedConnectionIndexChange, selectedConnectionIndex]);

  const createConnection = (): ComponentInternalConnectionDefinition => ({
    kind: 'short',
    fromHandle: handles[0]?.id ?? '',
    toHandle: handles[1]?.id ?? handles[0]?.id ?? '',
  });

  const updateActiveConnection = (
    updater: (connection: ComponentInternalConnectionDefinition) => ComponentInternalConnectionDefinition,
  ) => {
    if (activeIndex < 0) return;
    onChange(updateArrayItem(connections, activeIndex, updater));
  };

  const deleteActiveConnection = () => {
    if (activeIndex < 0) return;
    const nextConnections = removeArrayItem(connections, activeIndex);
    onChange(nextConnections);
    onSelectedConnectionIndexChange(
      nextConnections.length > 0 ? Math.min(activeIndex, nextConnections.length - 1) : undefined,
    );
  };

  const connectionOptionsWithIndex = connections.map((connection, index) => ({
    value: index,
    label: `${index + 1}. ${connection.kind}: ${connection.fromHandle} -> ${connection.toHandle}`,
  }));

  if (!activeConnection) {
    return (
      <Flex vertical gap={8}>
        <Button
          icon={<PlusOutlined />}
          onClick={() => {
            const newConnection = createConnection();
            onChange(connections.concat(newConnection));
            onSelectedConnectionIndexChange(connections.length);
          }}
        >
          {t('componentEditor.actions.addConnection')}
        </Button>
        <Alert type="info" message={t('componentEditor.messages.noConnections')} showIcon />
      </Flex>
    );
  }

  return (
    <Flex vertical gap={8}>
      <Flex gap={8} wrap="wrap" align="center">
        <Select
          showSearch
          optionFilterProp="label"
          value={activeIndex}
          options={connectionOptionsWithIndex}
          style={{minWidth: 300, flex: '1 1 300px'}}
          onChange={onSelectedConnectionIndexChange}
        />
        <Button
          icon={<PlusOutlined />}
          onClick={() => {
            const newConnection = createConnection();
            onChange(connections.concat(newConnection));
            onSelectedConnectionIndexChange(connections.length);
          }}
        >
          {t('componentEditor.actions.addConnection')}
        </Button>
        <Button icon={<DeleteOutlined />} onClick={deleteActiveConnection}>
          {t('componentEditor.actions.deleteConnection')}
        </Button>
      </Flex>
        <Card
          key={`${activeConnection.kind}-${activeConnection.fromHandle}-${activeConnection.toHandle}-${activeIndex}`}
          size="small"
          title={`${activeConnection.kind}: ${activeConnection.fromHandle} -> ${activeConnection.toHandle}`}
        >
          <Flex gap={8} wrap="wrap">
            <Form.Item label={t('componentEditor.fields.connectionKind')} style={{width: 132}}>
              <Select
                value={activeConnection.kind}
                options={CONNECTION_KIND_OPTIONS}
                onChange={(kind) => updateActiveConnection((item) => (
                  kind === 'fuse'
                    ? {
                        kind: 'fuse',
                        fromHandle: item.fromHandle,
                        toHandle: item.toHandle,
                        fuseId: item.kind === 'fuse' ? item.fuseId : `fuse_${activeIndex + 1}`,
                      }
                    : {kind: 'short', fromHandle: item.fromHandle, toHandle: item.toHandle}
                ))}
              />
            </Form.Item>
            <Form.Item label={t('componentEditor.fields.fromHandle')} style={{width: 180}}>
              <Select
                value={activeConnection.fromHandle}
                options={handleSelectOptions}
                onChange={(fromHandle) => updateActiveConnection((item) => ({...item, fromHandle}))}
              />
            </Form.Item>
            <Form.Item label={t('componentEditor.fields.toHandle')} style={{width: 180}}>
              <Select
                value={activeConnection.toHandle}
                options={handleSelectOptions}
                onChange={(toHandle) => updateActiveConnection((item) => ({...item, toHandle}))}
              />
            </Form.Item>
            {activeConnection.kind === 'fuse' && (
              <>
                <Form.Item label="fuseId" style={{width: 160}}>
                  <Input
                    value={activeConnection.fuseId}
                    onChange={(event) => updateActiveConnection((item) => (
                      item.kind === 'fuse' ? {...item, fuseId: event.target.value} : item
                    ))}
                  />
                </Form.Item>
                <Form.Item label="nominalCurrent" style={{width: 160}}>
                  <InputNumber
                    value={activeConnection.nominalCurrent}
                    onChange={(nominalCurrent) => updateActiveConnection((item) => (
                      item.kind === 'fuse' ? {...item, nominalCurrent: nominalCurrent ?? undefined} : item
                    ))}
                    style={{width: '100%'}}
                  />
                </Form.Item>
                <Form.Item label="nominalCurrentField" style={{width: 200}}>
                  <Select
                    allowClear
                    value={activeConnection.nominalCurrentField}
                    options={numberFieldOptions}
                    onChange={(nominalCurrentField) => updateActiveConnection((item) => (
                      item.kind === 'fuse' ? {...item, nominalCurrentField} : item
                    ))}
                  />
                </Form.Item>
              </>
            )}
          </Flex>
        </Card>
    </Flex>
  );
};

type SimulationEditorProps = {
  simulation: ComponentPackage['component']['simulation'] | undefined;
  handles: ComponentHandleDefinition[];
  fields: ComponentFieldDefinition[];
  selectedElementIndex: number | undefined;
  onSelectedElementIndexChange: (index: number | undefined) => void;
  onChange: (simulation: ComponentPackage['component']['simulation'] | undefined) => void;
};

const defaultParameterValue = (parameter: string): SimulationParameterRef => (
  parameter.toLowerCase().includes('resistance') ? 0.001 : 0
);

const createSimulationElement = (
  type: ComponentSimulationElementType,
  index: number,
  handles: ComponentHandleDefinition[],
): ComponentSimulationElementUse => {
  const definition = SIMULATION_ELEMENT_DEFINITIONS[type];
  const terminals = Object.fromEntries(
    definition.terminals.map((terminal, terminalIndex) => [terminal, handles[terminalIndex]?.id ?? handles[0]?.id ?? '']),
  );
  const parameters = Object.fromEntries(
    definition.parameters.map((parameter) => [parameter, defaultParameterValue(parameter)]),
  );
  return {
    id: `${type}_${index + 1}`,
    type,
    terminals,
    ...(definition.parameters.length > 0 ? {parameters} : {}),
  } as ComponentSimulationElementUse;
};

const SimulationEditor = ({
  simulation,
  handles,
  fields,
  selectedElementIndex,
  onSelectedElementIndexChange,
  onChange,
}: SimulationEditorProps) => {
  const {t} = useTranslation(['main']);
  const elements = simulation?.elements ?? [];
  const handleSelectOptions = handleOptions(handles);
  const activeIndex = selectedElementIndex !== undefined && selectedElementIndex >= 0 && selectedElementIndex < elements.length
    ? selectedElementIndex
    : elements.length > 0 ? 0 : -1;
  const activeElement = activeIndex >= 0 ? elements[activeIndex] : undefined;

  useEffect(() => {
    if (elements.length === 0) {
      if (selectedElementIndex !== undefined) onSelectedElementIndexChange(undefined);
      return;
    }
    if (selectedElementIndex === undefined || selectedElementIndex < 0 || selectedElementIndex >= elements.length) {
      onSelectedElementIndexChange(0);
    }
  }, [elements.length, onSelectedElementIndexChange, selectedElementIndex]);

  const setElements = (nextElements: ComponentSimulationElementUse[]) => {
    onChange(nextElements.length > 0 ? {version: 1, elements: nextElements} : undefined);
  };

  const updateActiveElement = (updater: (element: ComponentSimulationElementUse) => ComponentSimulationElementUse) => {
    if (activeIndex < 0) return;
    setElements(updateArrayItem(elements, activeIndex, updater));
  };

  const deleteActiveElement = () => {
    if (activeIndex < 0) return;
    const nextElements = removeArrayItem(elements, activeIndex);
    setElements(nextElements);
    onSelectedElementIndexChange(nextElements.length > 0 ? Math.min(activeIndex, nextElements.length - 1) : undefined);
  };

  const elementOptionsWithIndex = elements.map((element, index) => ({
    value: index,
    label: `${index + 1}. ${element.id || t('componentEditor.labels.unnamed')}`,
  }));

  if (!activeElement) {
    return (
      <Flex vertical gap={8}>
        <Button
          icon={<PlusOutlined />}
          onClick={() => {
            const newElement = createSimulationElement('resistor', elements.length, handles);
            setElements(elements.concat(newElement));
            onSelectedElementIndexChange(elements.length);
          }}
        >
          {t('componentEditor.actions.addSimulationElement')}
        </Button>
        <Alert type="info" message={t('componentEditor.messages.noSimulationElements')} showIcon />
      </Flex>
    );
  }

  return (
    <Flex vertical gap={8}>
      <Flex gap={8} wrap="wrap" align="center">
        <Select
          showSearch
          optionFilterProp="label"
          value={activeIndex}
          options={elementOptionsWithIndex}
          style={{minWidth: 260, flex: '1 1 260px'}}
          onChange={onSelectedElementIndexChange}
        />
        <Button
          icon={<PlusOutlined />}
          onClick={() => {
            const newElement = createSimulationElement('resistor', elements.length, handles);
            setElements(elements.concat(newElement));
            onSelectedElementIndexChange(elements.length);
          }}
        >
          {t('componentEditor.actions.addSimulationElement')}
        </Button>
        <Button icon={<DeleteOutlined />} onClick={deleteActiveElement}>
          {t('componentEditor.actions.deleteSimulationElement')}
        </Button>
      </Flex>
      {(() => {
        const definition = SIMULATION_ELEMENT_DEFINITIONS[activeElement.type];
        const parameters = activeElement.parameters ?? {};

        return (
          <Card
            key={`${activeElement.id}-${activeIndex}`}
            size="small"
            title={activeElement.id || t('componentEditor.labels.unnamed')}
          >
            <Form layout="vertical">
              <Flex gap={8} wrap="wrap">
                <Form.Item label={t('componentEditor.fields.elementId')} style={{flex: '1 1 180px'}}>
                  <Input
                    value={activeElement.id}
                    onChange={(event) => updateActiveElement((item) => ({
                      ...item,
                      id: event.target.value,
                    }))}
                  />
                </Form.Item>
                <Form.Item label={t('componentEditor.fields.elementType')} style={{width: 220}}>
                  <Select
                    value={activeElement.type}
                    options={SIMULATION_ELEMENT_TYPES.map((value) => ({value, label: value}))}
                    onChange={(type) => updateActiveElement((item) => ({
                      ...createSimulationElement(type, activeIndex, handles),
                      id: item.id,
                    }))}
                  />
                </Form.Item>
              </Flex>
              <Typography.Text strong>{t('componentEditor.labels.terminals')}</Typography.Text>
              <Flex gap={8} wrap="wrap" style={{marginTop: 8}}>
                {definition.terminals.map((terminal) => (
                  <Form.Item key={terminal} label={terminal} style={{width: 200}}>
                    <Select
                      value={(activeElement.terminals as Record<string, string>)[terminal]}
                      options={handleSelectOptions}
                      onChange={(handleId) => updateActiveElement((item) => ({
                        ...item,
                        terminals: {...item.terminals, [terminal]: handleId},
                      } as ComponentSimulationElementUse))}
                    />
                  </Form.Item>
                ))}
              </Flex>
              {definition.parameters.length > 0 && (
                <>
                  <Typography.Text strong>{t('componentEditor.labels.parameters')}</Typography.Text>
                  <Flex vertical gap={8} style={{marginTop: 8}}>
                    {definition.parameters.map((parameter) => (
                      <Flex key={parameter} gap={8} align="center" wrap="wrap">
                        <Typography.Text style={{width: 180}}>{parameter}</Typography.Text>
                        <ParameterRefEditor
                          value={(parameters as Record<string, SimulationParameterRef>)[parameter] ?? defaultParameterValue(parameter)}
                          fields={fields}
                          onChange={(value) => updateActiveElement((item) => ({
                            ...item,
                            parameters: {...(item.parameters ?? {}), [parameter]: value},
                          } as ComponentSimulationElementUse))}
                        />
                      </Flex>
                    ))}
                  </Flex>
                </>
              )}
            </Form>
          </Card>
        );
      })()}
    </Flex>
  );
};

const ComponentEditorContent = () => {
  const {t} = useTranslation(['main']);
  const {token} = theme.useToken();
  const [messageApi, messageContextHolder] = message.useMessage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewFlowRef = useRef<PreviewFlowControls | null>(null);

  const [componentPackage, setComponentPackage] = useState<ComponentPackage>(createEmptyPackage());
  const [drafts, setDrafts] = useState<DraftEntry[]>(readDrafts);
  const [activeEditorTab, setActiveEditorTab] = useState('basics');
  const [previewFitNonce, setPreviewFitNonce] = useState(0);
  const [selectedHandleId, setSelectedHandleId] = useState<string | undefined>(
    () => componentPackage.component.handles[0]?.id,
  );
  const [selectedFieldIndex, setSelectedFieldIndex] = useState<number | undefined>(
    () => ((componentPackage.component.fields?.length ?? 0) > 0 ? 0 : undefined),
  );
  const [selectedConnectionIndex, setSelectedConnectionIndex] = useState<number | undefined>(
    () => ((componentPackage.component.internalConnections?.length ?? 0) > 0 ? 0 : undefined),
  );
  const [selectedSimulationElementIndex, setSelectedSimulationElementIndex] = useState<number | undefined>(
    () => ((componentPackage.component.simulation?.elements?.length ?? 0) > 0 ? 0 : undefined),
  );

  const coreDefinitions = useMemo(() => getAllComponentDefinitions(), []);
  const validation = useMemo(() => validateComponentPackage(componentPackage), [componentPackage]);

  const previewTemplate = useMemo(() => {
    if (!validation.valid) return undefined;
    try {
      return createReactFlowTemplate(normalizeComponentPackage(componentPackage));
    } catch {
      return undefined;
    }
  }, [componentPackage, validation.valid]);

  const handlesJson = useJsonSection<ComponentHandleDefinition[]>(
    componentPackage.component.handles,
    (handles) => setComponentPackage((current) => ({
      ...current,
      component: {...current.component, handles},
    })),
    t('componentEditor.messages.invalidJson'),
  );

  const fieldsJson = useJsonSection<ComponentFieldDefinition[]>(
    componentPackage.component.fields ?? [],
    (fields) => setComponentPackage((current) => ({
      ...current,
      component: {...current.component, fields: fields.length > 0 ? fields : undefined},
    })),
    t('componentEditor.messages.invalidJson'),
  );

  const connectionsJson = useJsonSection<ComponentInternalConnectionDefinition[]>(
    componentPackage.component.internalConnections ?? [],
    (internalConnections) => setComponentPackage((current) => ({
      ...current,
      component: {
        ...current.component,
        internalConnections: internalConnections.length > 0 ? internalConnections : undefined,
      },
    })),
    t('componentEditor.messages.invalidJson'),
  );

  const simulationJson = useJsonSection<ComponentPackage['component']['simulation'] | null>(
    componentPackage.component.simulation ?? null,
    (simulation) => setComponentPackage((current) => ({
      ...current,
      component: {...current.component, simulation: simulation ?? undefined},
    })),
    t('componentEditor.messages.invalidJson'),
  );

  const runtimeJson = useJsonSection<ComponentRuntimeDefinition | null>(
    componentPackage.component.runtime ?? null,
    (runtime) => setComponentPackage((current) => ({
      ...current,
      component: {...current.component, runtime: runtime ?? undefined},
    })),
    t('componentEditor.messages.invalidJson'),
  );

  const resetJsonSections = (nextPackage: ComponentPackage) => {
    handlesJson.reset(nextPackage.component.handles);
    fieldsJson.reset(nextPackage.component.fields ?? []);
    connectionsJson.reset(nextPackage.component.internalConnections ?? []);
    simulationJson.reset(nextPackage.component.simulation ?? null);
    runtimeJson.reset(nextPackage.component.runtime ?? null);
  };

  const replacePackage = (nextPackage: ComponentPackage) => {
    setComponentPackage(nextPackage);
    setSelectedHandleId(nextPackage.component.handles[0]?.id);
    setSelectedFieldIndex((nextPackage.component.fields?.length ?? 0) > 0 ? 0 : undefined);
    setSelectedConnectionIndex((nextPackage.component.internalConnections?.length ?? 0) > 0 ? 0 : undefined);
    setSelectedSimulationElementIndex((nextPackage.component.simulation?.elements?.length ?? 0) > 0 ? 0 : undefined);
    setPreviewFitNonce((value) => value + 1);
    resetJsonSections(nextPackage);
  };

  const updateComponent = (updater: (component: ComponentDefinition) => ComponentDefinition) => {
    setComponentPackage((current) => ({
      ...current,
      component: updater(current.component),
    }));
  };

  const saveDraft = () => {
    const entry: DraftEntry = {
      id: packageDraftId(componentPackage),
      updatedAt: new Date().toISOString(),
      componentPackage,
    };
    const nextDrafts = drafts.filter((draft) => draft.id !== entry.id).concat(entry);
    setDrafts(nextDrafts);
    writeDrafts(nextDrafts);
    messageApi.success(t('componentEditor.messages.savedLocal'));
  };

  const importFile = (file: File) => {
    file.text()
      .then((content) => {
        const parsed = safeJsonParse<ComponentPackage>(content);
        if (!parsed.ok) {
          messageApi.error(parsed.message);
          return;
        }
        replacePackage(parsed.value);
        messageApi.success(t('componentEditor.messages.imported'));
      })
      .catch(() => messageApi.error(t('componentEditor.messages.importFailed')));
  };

  const validationRows = validation.issues.map((issue, index) => ({...issue, key: String(index)}));
  const selectedHandleIndex = componentPackage.component.handles.findIndex((handle) => handle.id === selectedHandleId);
  const selectedHandle = selectedHandleIndex >= 0 ? componentPackage.component.handles[selectedHandleIndex] : undefined;
  const handlesTabActive = activeEditorTab === 'handles';

  useEffect(() => {
    if (componentPackage.component.handles.length === 0) {
      if (selectedHandleId !== undefined) setSelectedHandleId(undefined);
      return;
    }
    if (!selectedHandle) {
      setSelectedHandleId(componentPackage.component.handles[0].id);
    }
  }, [componentPackage.component.handles, selectedHandle, selectedHandleId]);

  const nudgeSelectedHandle = (dx: number, dy: number) => {
    if (selectedHandleIndex < 0) return;
    updateComponent((component) => ({
      ...component,
      handles: updateArrayItem(component.handles, selectedHandleIndex, (handle) => ({
        ...handle,
        x: handle.x + dx,
        y: handle.y + dy,
      })),
    }));
  };
  const updateSelectedHandlePosition = (patch: Partial<Pick<ComponentHandleDefinition, 'x' | 'y'>>) => {
    if (selectedHandleIndex < 0) return;
    updateComponent((component) => ({
      ...component,
      handles: updateArrayItem(component.handles, selectedHandleIndex, (handle) => ({
        ...handle,
        ...patch,
      })),
    }));
  };
  const previewNodes = previewTemplate
    ? [{
        ...previewTemplate,
        id: 'preview',
        position: {x: 40, y: 40},
        data: {
          ...previewTemplate.data,
          editorSelectedHandleId: handlesTabActive ? selectedHandleId : undefined,
          editorOnHandleSelect: handlesTabActive ? setSelectedHandleId : undefined,
        },
      }]
    : [];

  useEffect(() => {
    if (!previewFlowRef.current || previewNodes.length === 0) return;
    window.requestAnimationFrame(() => {
      previewFlowRef.current?.fitView({padding: 0.2, duration: 200});
    });
  }, [previewFitNonce, previewNodes.length]);

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.compactAlgorithm,
        token: {fontSize: 14},
      }}
    >
      {messageContextHolder}
      <div className="component-editor-shell">
        <header className="component-editor-header" style={{borderBottomColor: token.colorBorder}}>
          <Flex align="center" gap={8} wrap="wrap">
            <Typography.Title level={3} style={{margin: 0}}>
              {t('componentEditor.title')}
            </Typography.Title>
            <Tag color={validation.valid ? 'green' : 'red'}>
              {validation.valid ? t('componentEditor.valid') : t('componentEditor.invalid')}
            </Tag>
          </Flex>
          <Space wrap>
            <Button icon={<PlusOutlined />} onClick={() => replacePackage(createEmptyPackage())}>
              {t('componentEditor.actions.new')}
            </Button>
            <Select
              showSearch
              placeholder={t('componentEditor.actions.openCore')}
              optionFilterProp="label"
              style={{minWidth: 220}}
              options={coreDefinitions.map((definition) => ({
                value: definition.componentId,
                label: definition.componentId,
              }))}
              onSelect={(componentId) => {
                const definition = coreDefinitions.find((item) => item.componentId === componentId);
                if (definition) replacePackage(clonePackageForLocalEdit(definition.package));
              }}
            />
            <Select
              placeholder={t('componentEditor.actions.openLocal')}
              style={{minWidth: 220}}
              options={drafts.map((draft) => ({
                value: draft.id,
                label: `${draft.componentPackage.component.id} (${new Date(draft.updatedAt).toLocaleString()})`,
              }))}
              onSelect={(draftId) => {
                const draft = drafts.find((item) => item.id === draftId);
                if (draft) replacePackage(structuredClone(draft.componentPackage));
              }}
            />
            <Button icon={<SaveOutlined />} onClick={saveDraft}>
              {t('componentEditor.actions.saveLocal')}
            </Button>
            <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()}>
              {t('componentEditor.actions.importJson')}
            </Button>
            <Button icon={<DownloadOutlined />} onClick={() => downloadPackage(componentPackage)}>
              {t('componentEditor.actions.exportJson')}
            </Button>
            <Button icon={<FolderOpenOutlined />} href="./">
              {t('componentEditor.actions.backToDesigner')}
            </Button>
            <LocaleSwitcher />
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json,.component.json"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) importFile(file);
              }}
            />
          </Space>
        </header>

        <main className="component-editor-main">
          <section className="component-editor-form">
            <Tabs
              activeKey={activeEditorTab}
              onChange={setActiveEditorTab}
              items={[
                {
                  key: 'basics',
                  label: t('componentEditor.tabs.basics'),
                  children: (
                    <Form layout="vertical">
                      <Form.Item label={t('componentEditor.fields.id')}>
                        <Input
                          value={componentPackage.component.id}
                          onChange={(event) => {
                            updateComponent((component) => ({...component, id: event.target.value}));
                          }}
                        />
                      </Form.Item>
                      <Form.Item label={t('componentEditor.fields.version')}>
                        <InputNumber
                          min={1}
                          precision={0}
                          value={componentPackage.component.version}
                          onChange={(value) => {
                            updateComponent((component) => ({...component, version: value ?? 1}));
                          }}
                          style={{width: '100%'}}
                        />
                      </Form.Item>
                      <Form.Item label={t('componentEditor.fields.name')}>
                        <Input
                          value={localizedTextToInput(componentPackage.component.display.name)}
                          onChange={(event) => {
                            updateComponent((component) => ({
                              ...component,
                              display: {...component.display, name: inputToLocalizedText(event.target.value)},
                            }));
                          }}
                        />
                      </Form.Item>
                      <Form.Item label={t('componentEditor.fields.descriptionShort')}>
                        <Input
                          value={localizedTextToInput(componentPackage.component.display.descriptionShort)}
                          onChange={(event) => {
                            updateComponent((component) => ({
                              ...component,
                              display: {
                                ...component.display,
                                descriptionShort: inputToLocalizedText(event.target.value),
                              },
                            }));
                          }}
                        />
                      </Form.Item>
                      <Form.Item label={t('componentEditor.fields.description')}>
                        <TextArea
                          value={localizedTextToInput(componentPackage.component.display.description)}
                          autoSize={{minRows: 3, maxRows: 8}}
                          onChange={(event) => {
                            updateComponent((component) => ({
                              ...component,
                              display: {
                                ...component.display,
                                description: inputToLocalizedText(event.target.value),
                              },
                            }));
                          }}
                        />
                      </Form.Item>
                      <Form.Item label={t('componentEditor.fields.group')}>
                        <Select
                          value={componentPackage.component.display.group}
                          options={KNOWN_COMPONENT_GROUPS.map((group) => ({value: group, label: group}))}
                          onChange={(group) => {
                            updateComponent((component) => ({
                              ...component,
                              display: {...component.display, group},
                            }));
                          }}
                        />
                      </Form.Item>
                      <Checkbox
                        checked={componentPackage.component.display.showName}
                        onChange={(event) => {
                          updateComponent((component) => ({
                            ...component,
                            display: {...component.display, showName: event.target.checked},
                          }));
                        }}
                      >
                        {t('componentEditor.fields.showName')}
                      </Checkbox>
                    </Form>
                  ),
                },
                {
                  key: 'geometry',
                  label: t('componentEditor.tabs.geometry'),
                  children: (
                    <Form layout="vertical">
                      <Form.Item label={t('componentEditor.fields.imageUrl')}>
                        <Input
                          value={componentPackage.component.geometry.image?.url}
                          onChange={(event) => {
                            updateComponent((component) => ({
                              ...component,
                              geometry: {
                                ...component.geometry,
                                image: {
                                  url: event.target.value,
                                  width: component.geometry.image?.width ?? 120,
                                  height: component.geometry.image?.height ?? 80,
                                },
                              },
                            }));
                          }}
                        />
                      </Form.Item>
                      <Flex gap={8}>
                        <Form.Item label={t('componentEditor.fields.imageWidth')} style={{flex: 1}}>
                          <InputNumber
                            min={1}
                            value={componentPackage.component.geometry.image?.width}
                            onChange={(value) => {
                              updateComponent((component) => ({
                                ...component,
                                geometry: {
                                  ...component.geometry,
                                  image: {
                                    url: component.geometry.image?.url ?? '',
                                    width: value ?? 1,
                                    height: component.geometry.image?.height ?? 80,
                                  },
                                },
                              }));
                            }}
                            style={{width: '100%'}}
                          />
                        </Form.Item>
                        <Form.Item label={t('componentEditor.fields.imageHeight')} style={{flex: 1}}>
                          <InputNumber
                            min={1}
                            value={componentPackage.component.geometry.image?.height}
                            onChange={(value) => {
                              updateComponent((component) => ({
                                ...component,
                                geometry: {
                                  ...component.geometry,
                                  image: {
                                    url: component.geometry.image?.url ?? '',
                                    width: component.geometry.image?.width ?? 120,
                                    height: value ?? 1,
                                  },
                                },
                              }));
                            }}
                            style={{width: '100%'}}
                          />
                        </Form.Item>
                      </Flex>
                      <Flex gap={8}>
                        <Form.Item label={t('componentEditor.fields.rotation')} style={{flex: 1}}>
                          <InputNumber
                            value={componentPackage.component.geometry.rotation}
                            onChange={(value) => {
                              updateComponent((component) => ({
                                ...component,
                                geometry: {...component.geometry, rotation: value ?? 0},
                              }));
                            }}
                            style={{width: '100%'}}
                          />
                        </Form.Item>
                        <Form.Item label={t('componentEditor.fields.borderWidth')} style={{flex: 1}}>
                          <InputNumber
                            min={0}
                            value={componentPackage.component.geometry.borderWidth}
                            onChange={(value) => {
                              updateComponent((component) => ({
                                ...component,
                                geometry: {...component.geometry, borderWidth: value ?? 0},
                              }));
                            }}
                            style={{width: '100%'}}
                          />
                        </Form.Item>
                        <Form.Item label={t('componentEditor.fields.lengthStep')} style={{flex: 1}}>
                          <InputNumber
                            min={0}
                            value={componentPackage.component.physical?.lengthStep}
                            onChange={(value) => {
                              updateComponent((component) => ({
                                ...component,
                                physical: value === null || value === undefined ? undefined : {lengthStep: value},
                              }));
                            }}
                            style={{width: '100%'}}
                          />
                        </Form.Item>
                      </Flex>
                      <Space wrap>
                        <Checkbox
                          checked={componentPackage.component.geometry.rotatable}
                          onChange={(event) => {
                            updateComponent((component) => ({
                              ...component,
                              geometry: {...component.geometry, rotatable: event.target.checked},
                            }));
                          }}
                        >
                          {t('componentEditor.fields.rotatable')}
                        </Checkbox>
                        <Checkbox
                          checked={componentPackage.component.geometry.resizableX}
                          onChange={(event) => {
                            updateComponent((component) => ({
                              ...component,
                              geometry: {...component.geometry, resizableX: event.target.checked},
                            }));
                          }}
                        >
                          {t('componentEditor.fields.resizableX')}
                        </Checkbox>
                        <Checkbox
                          checked={componentPackage.component.geometry.resizableY}
                          onChange={(event) => {
                            updateComponent((component) => ({
                              ...component,
                              geometry: {...component.geometry, resizableY: event.target.checked},
                            }));
                          }}
                        >
                          {t('componentEditor.fields.resizableY')}
                        </Checkbox>
                        <Checkbox
                          checked={componentPackage.component.geometry.noBackgroundImage}
                          onChange={(event) => {
                            updateComponent((component) => ({
                              ...component,
                              geometry: {...component.geometry, noBackgroundImage: event.target.checked},
                            }));
                          }}
                        >
                          {t('componentEditor.fields.noBackgroundImage')}
                        </Checkbox>
                      </Space>
                    </Form>
                  ),
                },
                {
                  key: 'handles',
                  label: t('componentEditor.tabs.handles'),
                  children: (
                    <StructuredSection
                      ui={(
                        <HandlesEditor
                          handles={componentPackage.component.handles}
                          fields={componentPackage.component.fields ?? []}
                          selectedHandleId={selectedHandleId}
                          onSelectedHandleIdChange={setSelectedHandleId}
                          onChange={(handles) => {
                            updateComponent((component) => ({...component, handles}));
                          }}
                        />
                      )}
                      json={(
                        <JsonSection
                          title={t('componentEditor.sections.applyHandles')}
                          description={t('componentEditor.sections.handlesDescription')}
                          text={handlesJson.text}
                          error={handlesJson.error}
                          onChange={handlesJson.setText}
                          onApply={handlesJson.apply}
                        />
                      )}
                    />
                  ),
                },
                {
                  key: 'fields',
                  label: t('componentEditor.tabs.fields'),
                  children: (
                    <StructuredSection
                      ui={(
                        <FieldsEditor
                          fields={componentPackage.component.fields ?? []}
                          selectedFieldIndex={selectedFieldIndex}
                          onSelectedFieldIndexChange={setSelectedFieldIndex}
                          onChange={(fields) => {
                            updateComponent((component) => ({
                              ...component,
                              fields: fields.length > 0 ? fields : undefined,
                            }));
                          }}
                        />
                      )}
                      json={(
                        <JsonSection
                          title={t('componentEditor.sections.applyFields')}
                          description={t('componentEditor.sections.fieldsDescription')}
                          text={fieldsJson.text}
                          error={fieldsJson.error}
                          onChange={fieldsJson.setText}
                          onApply={fieldsJson.apply}
                        />
                      )}
                    />
                  ),
                },
                {
                  key: 'connections',
                  label: t('componentEditor.tabs.connections'),
                  children: (
                    <StructuredSection
                      ui={(
                        <ConnectionsEditor
                          connections={componentPackage.component.internalConnections ?? []}
                          handles={componentPackage.component.handles}
                          fields={componentPackage.component.fields ?? []}
                          selectedConnectionIndex={selectedConnectionIndex}
                          onSelectedConnectionIndexChange={setSelectedConnectionIndex}
                          onChange={(internalConnections) => {
                            updateComponent((component) => ({
                              ...component,
                              internalConnections: internalConnections.length > 0 ? internalConnections : undefined,
                            }));
                          }}
                        />
                      )}
                      json={(
                        <JsonSection
                          title={t('componentEditor.sections.applyConnections')}
                          description={t('componentEditor.sections.connectionsDescription')}
                          text={connectionsJson.text}
                          error={connectionsJson.error}
                          onChange={connectionsJson.setText}
                          onApply={connectionsJson.apply}
                        />
                      )}
                    />
                  ),
                },
                {
                  key: 'simulation',
                  label: t('componentEditor.tabs.simulation'),
                  children: (
                    <StructuredSection
                      ui={(
                        <SimulationEditor
                          simulation={componentPackage.component.simulation}
                          handles={componentPackage.component.handles}
                          fields={componentPackage.component.fields ?? []}
                          selectedElementIndex={selectedSimulationElementIndex}
                          onSelectedElementIndexChange={setSelectedSimulationElementIndex}
                          onChange={(simulation) => {
                            updateComponent((component) => ({...component, simulation}));
                          }}
                        />
                      )}
                      json={(
                        <JsonSection
                          title={t('componentEditor.sections.applySimulation')}
                          description={t('componentEditor.sections.simulationDescription')}
                          text={simulationJson.text}
                          error={simulationJson.error}
                          onChange={simulationJson.setText}
                          onApply={simulationJson.apply}
                        />
                      )}
                    />
                  ),
                },
                {
                  key: 'runtime',
                  label: t('componentEditor.tabs.runtime'),
                  children: (
                    <JsonSection
                      title={t('componentEditor.sections.applyRuntime')}
                      description={t('componentEditor.sections.runtimeDescription')}
                      text={runtimeJson.text}
                      error={runtimeJson.error}
                      onChange={runtimeJson.setText}
                      onApply={runtimeJson.apply}
                    />
                  ),
                },
              ]}
            />
          </section>

          <aside className="component-editor-preview">
            <Typography.Title level={4}>{t('componentEditor.preview.title')}</Typography.Title>
            <div className="component-editor-flow" style={{borderColor: token.colorBorder}}>
              <ReactFlow
                nodes={previewNodes}
                edges={[]}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                onInit={(instance) => {
                  previewFlowRef.current = instance;
                  instance.fitView({padding: 0.2});
                }}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
              >
                <Background variant={BackgroundVariant.Dots} gap={16} />
                <Controls />
              </ReactFlow>
            </div>
            <Flex vertical gap={8} className="component-editor-preview-handle-tools">
              <Typography.Text strong>{t('componentEditor.preview.selectedHandle')}</Typography.Text>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                value={selectedHandle?.id}
                placeholder={t('componentEditor.preview.selectHandle')}
                options={componentPackage.component.handles.map((handle, index) => ({
                  value: handle.id,
                  label: `${index + 1}. ${handle.id || t('componentEditor.labels.unnamed')}`,
                }))}
                onChange={setSelectedHandleId}
              />
              {selectedHandle && (
                <>
                  <Flex gap={8} wrap="wrap">
                    <Form.Item label="x" style={{marginBottom: 0, flex: '1 1 120px'}}>
                      <InputNumber
                        value={selectedHandle.x}
                        onChange={(value) => updateSelectedHandlePosition({x: value ?? 0})}
                        style={{width: '100%'}}
                      />
                    </Form.Item>
                    <Form.Item label="y" style={{marginBottom: 0, flex: '1 1 120px'}}>
                      <InputNumber
                        value={selectedHandle.y}
                        onChange={(value) => updateSelectedHandlePosition({y: value ?? 0})}
                        style={{width: '100%'}}
                      />
                    </Form.Item>
                  </Flex>
                  <Flex gap={8} align="center" wrap="wrap">
                    <Typography.Text type="secondary">{t('componentEditor.preview.nudge')}</Typography.Text>
                    <Button icon={<LeftOutlined />} onClick={() => nudgeSelectedHandle(-1, 0)} />
                    <Button icon={<RightOutlined />} onClick={() => nudgeSelectedHandle(1, 0)} />
                    <Button icon={<UpOutlined />} onClick={() => nudgeSelectedHandle(0, -1)} />
                    <Button icon={<DownOutlined />} onClick={() => nudgeSelectedHandle(0, 1)} />
                  </Flex>
                </>
              )}
            </Flex>
            <Divider />
            <Typography.Title level={4}>{t('componentEditor.validation.title')}</Typography.Title>
            {validationRows.length === 0 ? (
              <Alert type="success" message={t('componentEditor.validation.noIssues')} showIcon />
            ) : (
              <Table
                size="small"
                columns={validationColumns}
                dataSource={validationRows}
                pagination={false}
                scroll={{x: 520}}
              />
            )}
          </aside>
        </main>
      </div>
    </ConfigProvider>
  );
};

const EditorApp = () => (
  <ReactFlowProvider>
    <ComponentEditorContent />
  </ReactFlowProvider>
);

export default EditorApp;
