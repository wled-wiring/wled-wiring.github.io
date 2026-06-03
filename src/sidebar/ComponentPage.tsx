import { useEffect, useState } from 'react';
import { Card, Divider, theme, Popover, Table, Button, message } from 'antd';

import {ComponentList} from '../components/ComponentList';
import {ComponentDataType} from '../types';

import { DragableComponent } from './DragableComponent';
import { useReactFlow} from '@xyflow/react';

import { useTranslation } from "react-i18next";
import { useUndoRedo } from '../utils/undoRedo';
import { initializeLedSimulationOptionValues } from '../simulation/ledStripSimulationOptions';
import { ENABLE_SIMULATION_CONTROLS } from '../simulation/simulationFeatureFlags';
import SimulationIcon from '../icons/simulation.svg?react';

const ComponentGroups=["controller", "led", "psu", "levelshifter", "electronics", "others"];
const touchCapablePointerQuery = '(hover: none), (pointer: coarse), (any-pointer: coarse)';
const addComponentScreenMargin = 24;
const addComponentScreenGap = 32;

const clampToRange = (value: number, min: number, max: number) => {
  if(max < min) {
    return (min + max) / 2;
  }

  return Math.min(Math.max(value, min), max);
};

export const ComponentPage = () => {
  const {t} = useTranslation(['main']);
  const { token } = theme.useToken();
  const reactFlowInstance=useReactFlow();
  const [messageApi, messageContextHolder] = message.useMessage();
  const { takeSnapshot } = useUndoRedo();
  const [componentInfoTrigger, setComponentInfoTrigger] = useState<'hover' | 'click'>(() => (
    typeof window !== 'undefined' &&
    window.matchMedia(touchCapablePointerQuery).matches
      ? 'click'
      : 'hover'
  ));

  useEffect(() => {
    const mediaQuery = window.matchMedia(touchCapablePointerQuery);
    const updateTrigger = () => {
      setComponentInfoTrigger(mediaQuery.matches ? 'click' : 'hover');
    };

    updateTrigger();
    mediaQuery.addEventListener('change', updateTrigger);
    return () => mediaQuery.removeEventListener('change', updateTrigger);
  }, []);

  const getAddToDiagramPlacement = (compData: ComponentDataType) => {
    const componentWidth = compData.image?.width || 0;
    const componentHeight = compData.image?.height || 0;
    const flowElement = document.querySelector('#reactflowDiv .react-flow');
    const flowBounds = flowElement?.getBoundingClientRect();

    if(!flowBounds || flowBounds.width <= 0 || flowBounds.height <= 0) {
      const fallbackPosition = reactFlowInstance.screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });

      return {
        position: {
          x: fallbackPosition.x - componentWidth / 2,
          y: fallbackPosition.y - componentHeight / 2,
        },
        shouldCenterAfterAdd: false,
      };
    }

    const screenMargin = Math.min(
      addComponentScreenMargin,
      Math.max(0, flowBounds.width / 2 - 1),
      Math.max(0, flowBounds.height / 2 - 1),
    );
    const visibleTopLeft = reactFlowInstance.screenToFlowPosition({
      x: flowBounds.left + screenMargin,
      y: flowBounds.top + screenMargin,
    });
    const visibleBottomRight = reactFlowInstance.screenToFlowPosition({
      x: flowBounds.right - screenMargin,
      y: flowBounds.bottom - screenMargin,
    });
    const visibleLeft = Math.min(visibleTopLeft.x, visibleBottomRight.x);
    const visibleRight = Math.max(visibleTopLeft.x, visibleBottomRight.x);
    const visibleTop = Math.min(visibleTopLeft.y, visibleBottomRight.y);
    const visibleBottom = Math.max(visibleTopLeft.y, visibleBottomRight.y);
    const visibleCenter = reactFlowInstance.screenToFlowPosition({
      x: flowBounds.left + flowBounds.width / 2,
      y: flowBounds.top + flowBounds.height / 2,
    });
    const nodes = reactFlowInstance.getNodes();
    const flowGap = addComponentScreenGap / Math.max(reactFlowInstance.getZoom(), 0.01);
    const nodeBounds = nodes.map((node) => {
      const nodeData = node.data as ComponentDataType;
      const width = node.measured?.width || node.width || nodeData.image?.width || 0;
      const height = node.measured?.height || node.height || nodeData.image?.height || 0;

      return {
        left: node.position.x,
        top: node.position.y,
        right: node.position.x + width,
        bottom: node.position.y + height,
        width,
        height,
      };
    });
    if(nodeBounds.length > 0) {
      const anchorBottom = Math.max(...nodeBounds.map((bounds) => bounds.bottom));
      const lowestAnchors = nodeBounds.filter((bounds) => Math.abs(bounds.bottom - anchorBottom) < 1);
      const anchor = lowestAnchors.reduce((closest, bounds) => {
        const closestDistance = Math.abs((closest.left + closest.width / 2) - visibleCenter.x);
        const boundsDistance = Math.abs((bounds.left + bounds.width / 2) - visibleCenter.x);

        return boundsDistance < closestDistance ? bounds : closest;
      });
      const position = {
        x: anchor.left + (anchor.width - componentWidth) / 2,
        y: anchor.bottom + flowGap,
      };

      return {
        position,
        shouldCenterAfterAdd:
          position.x < visibleLeft ||
          position.x + componentWidth > visibleRight ||
          position.y < visibleTop ||
          position.y + componentHeight > visibleBottom,
      };
    }

    return {
      position: {
        x: clampToRange(
          visibleCenter.x - componentWidth / 2,
          visibleLeft,
          visibleRight - componentWidth,
        ),
        y: clampToRange(
          visibleCenter.y - componentHeight / 2,
          visibleTop,
          visibleBottom - componentHeight,
        ),
      },
      shouldCenterAfterAdd: false,
    };
  };

  const connectionListColumns=[
    {
      title: t('sidebar.components.popoverContent.listOfConnectionsHeading1'),
      dataIndex: 'pinName',
      key: 'pinName',
      width: 100
    },
    {
      title: t('sidebar.components.popoverContent.listOfConnectionsHeading2'),
      dataIndex: 'description',
      key: 'description',
      width: 300
    }
  ];

    return <div id="componentPageDiv">
      {messageContextHolder}
      <div id="componentPageFlexDiv">
        {ComponentGroups.map((group) => {
          const ComponentListForGroup=ComponentList.filter((component) => (component.data as ComponentDataType).group === group);
          if(ComponentListForGroup.length>0) {
            return <div key={"Group_"+group }>
              <Divider key={"Divider_"+group }
                style={{fontSize: token.fontSize}}
              >
                {t('componentGroupTypes.'+group)}
              </Divider>
            <div className="component-group-grid">
            {ComponentListForGroup.map((component) => {
              const compData=(component.data as ComponentDataType);
              const connectionListData = compData.handles?.map((handle, index) => {
                return {
                  key: `${compData.technicalID}_${handle.hid}_${index}`,
                  pinName: handle.name,
                  description: handle.description,
                };
              }
              ) || [];

              if(compData.image !== undefined) {
                const showSimulationIcon = ENABLE_SIMULATION_CONTROLS && compData.simdata !== undefined;
                return <Card
                    key={"Card_"+compData.technicalID}
                    hoverable
                    size='small'
                    title=<>{t(compData.name)}<br/>{t(compData.description)}</>
                    extra = {
                      <div className="component-card-extra">
                        {showSimulationIcon && (
                          <SimulationIcon
                            className="component-card-simulation-icon"
                            aria-hidden="true"
                            focusable="false"
                          />
                        )}
                        <Popover
                          trigger={componentInfoTrigger}
                          title=<>
                            <span>{t('sidebar.components.popoverTitle')}</span>&nbsp;&nbsp;&nbsp;
                            <Button
                              onClick={(_)=>{
                                const {position, shouldCenterAfterAdd}=getAddToDiagramPlacement(compData);
                                const type='general-component-type';
                                const newNode = {
                                  id: String(Math.random()),
                                  type,
                                  position,
                                  data: initializeLedSimulationOptionValues(structuredClone(compData)),
                                };
                                takeSnapshot('add component');
                                reactFlowInstance.setNodes((nds) => nds.concat(newNode));
                                if(shouldCenterAfterAdd) {
                                  window.requestAnimationFrame(() => {
                                    reactFlowInstance.setCenter(
                                      position.x + (compData.image?.width || 0) / 2,
                                      position.y + (compData.image?.height || 0) / 2,
                                      {
                                        duration: 250,
                                        zoom: reactFlowInstance.getZoom(),
                                      },
                                    );
                                  });
                                }
                                messageApi.open({
                                  type: 'success',
                                  content:  t('message.compAddSuccess'),
                                });
                              }}
                            >
                            {t('sidebar.components.addButtonText')}
                            </Button>
                          </>
                          content= {
                            <div
                              style={{
                                maxWidth: 400,
                                maxHeight: 600,
                              }}
                            >
                              {compData.popover?.description && <p>{t(compData.popover.description)}</p>}
                              {compData.popover?.buyLinks && compData.popover?.buyLinks.length>0 &&
                                <div>
                                  <u>{t('sidebar.components.popoverContent.whereToBuy')}</u><ul>
                                  {compData.popover.buyLinks.map((link, index) => {
                                    return <li key={index}>
                                      <a href={link.url} target="_blank">{link.text}</a>
                                    </li>;
                                  })}
                                  </ul>
                                </div>
                              }
                              {
                                compData.handles && compData.handles.length>0 &&
                                <div
                                  style={{
                                    maxWidth: 400,
                                    maxHeight: 400,
                                  }}
                                >
                                  <u>{t('sidebar.components.popoverContent.listOfConnections')}</u>
                                  <Table
                                    columns={connectionListColumns}
                                    dataSource={connectionListData}
                                    rowKey="key"
                                    size='small'
                                    tableLayout='auto'
                                    pagination={{ position: ['topRight'], pageSize: 5 }}
                                  >
                                  </Table>
                                </div>
                              }
                            </div>
                          }
                        
                        ><span style={{color: "blue", touchAction: "manipulation"}}><b>...</b></span></Popover>
                      </div>
                    }
                    style={{ 
                      fontSize: 12,
                    }}
                    >
                      <DragableComponent 
                        key={compData.technicalID}
                        data={compData}
                      />
                  </Card>
              } else {
                return <div key={"Card_"+compData.technicalID}></div>;
              }
            })
            }
            </div>
            </div>
          } else {
            return <div key={"Group_"+group }></div>;
          }
        })
        }
      </div>
    </div>
}
