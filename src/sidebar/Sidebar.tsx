import { memo, useState, type CSSProperties } from 'react';

import { useTranslation } from "react-i18next";

import type { CollapseProps } from 'antd';
import { Alert, Collapse, theme } from 'antd';

import {ComponentPage} from './ComponentPage';
import {ImportExportPage} from './ImportExportPage';
import {DiagramCheckPage} from './DiagramCheckPage';
import {ToolsPage} from './ToolsPage';
import {AdvancedSettingsPage} from './AdvancedSettingsPage';
import { SimulationPage } from '../simulation/SimulationPage';
import { ENABLE_SIMULATION_CONTROLS } from '../simulation/simulationFeatureFlags';

const Sidebar = () => {
  const {t} = useTranslation(['main']);
  const [activePanelKeys, setActivePanelKeys] = useState<string | string[]>(['2']);

  const { token } = theme.useToken();
  const isDiagramCheckOpen = Array.isArray(activePanelKeys)
    ? activePanelKeys.includes('3')
    : activePanelKeys === '3';
  const isSimulationOpen = Array.isArray(activePanelKeys)
    ? activePanelKeys.includes('4')
    : activePanelKeys === '4';

  const panelStyle: React.CSSProperties = {
    border: 'none',
    borderRadius: 0,
    borderBottomColor: token.colorBorder,
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
  };

  const simulationPanel = ENABLE_SIMULATION_CONTROLS
    ? <SimulationPage isOpen={isSimulationOpen} />
    : (
      <Alert
        type="info"
        showIcon
        message={t('sidebar.simulation.inDevelopmentTitle')}
        description={t('sidebar.simulation.comingSoon')}
      />
    );
  
  const getItems: (panelStyle: CSSProperties) => CollapseProps['items'] = (panelStyle) => [
  {
    key: '1',
    label: <span>{t('sidebar.export.title')}</span>,
    children: <ImportExportPage />,
    style: panelStyle,
  },
  {
    key: '2',
    label: <span>{t('sidebar.components.title')}</span>,
    children: <ComponentPage />,
    style: panelStyle,
  },
  {
    key: '3',
    label: <span>{t('sidebar.check.title')}</span>,
    children: <DiagramCheckPage isOpen={isDiagramCheckOpen} />,
    style: panelStyle,
  },
  {
    key: '4',
    label: <span>{t('sidebar.simulation.title')}</span>,
    children: simulationPanel,
    style: panelStyle,
  },
  {
    key: '5',
    label: <span>{t('sidebar.tools.title')}</span>,
    children: <ToolsPage />,
    style: panelStyle,
  },
  {
    key: '6',
    label: <span>{t('sidebar.advancedSettings.title')}</span>,
    children: <AdvancedSettingsPage />,
    style: panelStyle,
  },
];

  return (
    <Collapse 
      accordion ghost
      activeKey={activePanelKeys}
      items={getItems(panelStyle)}
      onChange={setActivePanelKeys}
      />
  );
};

export default memo(Sidebar);
