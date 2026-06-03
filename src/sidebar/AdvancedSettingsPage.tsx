import { Button, Drawer, Form, InputNumber, Select, Space, Switch, Typography } from 'antd';
import { ExperimentOutlined, SettingOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useDiagramCheckSettingsStore } from '../check/checkSettingsStore';
import { useDiagramCheckResultStore } from '../check/diagramCheckResultStore';
import { useSimulationSettingsStore } from '../simulation/simulationSettingsStore';
import { clearAutosave } from '../utils/autosaveStorage';
import { useAutosaveSettingsStore } from '../utils/autosaveSettingsStore';
import { ENABLE_DIAGRAM_AUTOSAVE } from '../utils/autosaveFeatureFlags';

export const AdvancedSettingsPage = () => {
  const {t} = useTranslation(['main']);
  const [wireSettingsOpen, setWireSettingsOpen] = useState(false);
  const [simulationSettingsOpen, setSimulationSettingsOpen] = useState(false);
  const wireAmpacitySettings = useDiagramCheckSettingsStore((state) => state.settings.wireAmpacity);
  const setWireAmpacitySettings = useDiagramCheckSettingsStore((state) => state.setWireAmpacitySettings);
  const clearDiagramCheckResult = useDiagramCheckResultStore((state) => state.clearResult);
  const allowSimulationWithDiagramCheckErrors = useSimulationSettingsStore((state) => state.allowSimulationWithDiagramCheckErrors);
  const setAllowSimulationWithDiagramCheckErrors = useSimulationSettingsStore((state) => state.setAllowSimulationWithDiagramCheckErrors);
  const autosaveEnabled = useAutosaveSettingsStore((state) => state.autosaveEnabled);
  const setAutosaveEnabled = useAutosaveSettingsStore((state) => state.setAutosaveEnabled);

  return (
    <>
      <Space direction="vertical" style={{width: '100%'}}>
        <Button
          icon={<SettingOutlined />}
          onClick={() => setWireSettingsOpen(true)}
          block
        >
          {t('sidebar.tools.wireInstallationButton')}
        </Button>
        <Typography.Text type="secondary">
          {t('sidebar.tools.wireInstallationDescription')}
        </Typography.Text>
        <Button
          icon={<ExperimentOutlined />}
          onClick={() => setSimulationSettingsOpen(true)}
          block
        >
          {t('sidebar.advancedSettings.simulationSettingsButton')}
        </Button>
        <Typography.Text type="secondary">
          {t('sidebar.advancedSettings.simulationSettingsDescription')}
        </Typography.Text>
        {ENABLE_DIAGRAM_AUTOSAVE && (
          <Form layout="vertical" style={{width: '100%'}}>
            <Form.Item
              label={t('sidebar.advancedSettings.autosaveEnabledLabel')}
              extra={t('sidebar.advancedSettings.autosaveEnabledDescription')}
            >
              <Switch
                checked={autosaveEnabled}
                onChange={(checked) => {
                  setAutosaveEnabled(checked);
                  if(!checked) clearAutosave();
                }}
              />
            </Form.Item>
          </Form>
        )}
      </Space>
      <Drawer
        title={t('sidebar.tools.wireInstallationTitle')}
        open={wireSettingsOpen}
        onClose={() => setWireSettingsOpen(false)}
        width={360}
      >
        <Form layout="vertical">
          <Form.Item label={t('sidebar.tools.wireInstallationTypeLabel')}>
            <Select
              value={wireAmpacitySettings.installation}
              options={[
                {
                  value: 'surface',
                  label: t('sidebar.tools.wireInstallationTypes.surface'),
                },
                {
                  value: 'conduit',
                  label: t('sidebar.tools.wireInstallationTypes.conduit'),
                },
                {
                  value: 'insulatedWall',
                  label: t('sidebar.tools.wireInstallationTypes.insulatedWall'),
                },
              ]}
              onChange={(installation) => {
                clearDiagramCheckResult();
                setWireAmpacitySettings({
                  ...wireAmpacitySettings,
                  installation,
                });
              }}
            />
          </Form.Item>
          <Form.Item label={t('sidebar.tools.ambientTemperatureLabel')}>
            <InputNumber
              min={10}
              max={60}
              step={1}
              addonAfter="°C"
              value={wireAmpacitySettings.ambientTempC}
              onChange={(ambientTempC) => {
                clearDiagramCheckResult();
                setWireAmpacitySettings({
                  ...wireAmpacitySettings,
                  ambientTempC: ambientTempC ?? 25,
                });
              }}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Drawer>
      <Drawer
        title={t('sidebar.advancedSettings.simulationSettingsTitle')}
        open={simulationSettingsOpen}
        onClose={() => setSimulationSettingsOpen(false)}
        width={360}
      >
        <Form layout="vertical">
          <Form.Item
            label={t('sidebar.advancedSettings.allowSimulationWithDiagramCheckErrorsLabel')}
            extra={t('sidebar.advancedSettings.allowSimulationWithDiagramCheckErrorsDescription')}
          >
            <Switch
              checked={allowSimulationWithDiagramCheckErrors}
              onChange={setAllowSimulationWithDiagramCheckErrors}
            />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
};
