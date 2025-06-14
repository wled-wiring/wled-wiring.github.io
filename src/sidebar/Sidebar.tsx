import type { CSSProperties } from 'react';

import { useTranslation } from "react-i18next";

import type { CollapseProps } from 'antd';
import { Collapse, theme } from 'antd';

import {ComponentPage} from './ComponentPage';
import {ImportExportPage} from './ImportExportPage';

const Sidebar = () => {
  const {t} = useTranslation(['main']);

  const { token } = theme.useToken();

  const panelStyle: React.CSSProperties = {
    border: 'none',
    borderRadius: 0,
    borderBottomColor: token.colorBorder,
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
  };
  
  const getItems: (panelStyle: CSSProperties) => CollapseProps['items'] = (panelStyle) => [
  {
    key: '1',
    label: <span>{t('sidebar.export.title')}</span>,
    children: ImportExportPage(),
    style: panelStyle,
  },
  {
    key: '2',
    label: <span>{t('sidebar.components.title')}</span>,
    children: ComponentPage(),
    style: panelStyle,
  },
  {
    key: '3',
    label: <span>{t('sidebar.check.title')}</span>,
    children: <div>{t('sidebar.check.comingSoon')}</div>,
    style: panelStyle,
  },
  {
    key: '4',
    label: <span>{t('sidebar.simulation.title')}</span>,
    children: <div>{t('sidebar.simulation.comingSoon')}</div>,
    style: panelStyle,
  },
];

  return (
    <Collapse 
      accordion ghost
      items={getItems(panelStyle)}
      defaultActiveKey={['2']}
      />
  );
};

export default Sidebar;