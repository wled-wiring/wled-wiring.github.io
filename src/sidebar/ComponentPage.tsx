
import { Flex, Card, Divider, theme, Popover, Table, Button, message } from 'antd';

import {ComponentList} from '../components/ComponentList';
import {ComponentDataType} from '../types';

import { DragableComponent } from './DragableComponent';
import { useReactFlow} from '@xyflow/react';

import { useTranslation } from "react-i18next";

const ComponentGroups=["controller", "led", "psu", "levelshifter", "electronics", "others"];

export const ComponentPage = () => {
  const {t} = useTranslation(['main']);
  const { token } = theme.useToken();
  const reactFlowInstance=useReactFlow();
  const [messageApi, messageContextHolder] = message.useMessage();

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
      <Flex  wrap id="componentPageFlexDiv" vertical>
        {ComponentGroups.map((group) => {
          const ComponentListForGroup=ComponentList.filter((component) => (component.data as ComponentDataType).group === group);
          if(ComponentListForGroup.length>0) {
            return <div key={"Group_"+group }>
              <Divider key={"Divider_"+group }
                style={{fontSize: token.fontSize}}
              >
                {t('componentGroupTypes.'+group)}
              </Divider>
            <Flex  wrap id="componentGroupFlexDiv">
            {ComponentListForGroup.map((component) => {
              const compData=(component.data as ComponentDataType);
              const connectionListData = compData.handles?.map((handle) => {
                return {
                  pinName: handle.name,
                  description: handle.description,
                };
              }
              ) || [];

              if(compData.image !== undefined) {
                return <Card
                    key={"Card_"+compData.technicalID}
                    hoverable
                    size='small'
                    title=<>{t(compData.name)}<br/>{t(compData.description)}</>
                    extra = {
                      <Popover
                        title=<>
                          <span>{t('sidebar.components.popoverTitle')}</span>&nbsp;&nbsp;&nbsp;
                          <Button
                            onClick={(_)=>{
                              const position=reactFlowInstance.screenToFlowPosition({x:5,y:10});
                              position.x=position.x+(compData.image?.width || 0)/2;
                              position.y=position.y+(compData.image?.height || 0)/2;
                              const type='general-component-type';
                              const newNode = {
                                id: String(Math.random()),
                                type,
                                position,
                                data: structuredClone(compData),
                              };
                              reactFlowInstance.setNodes((nds) => nds.concat(newNode));
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
                                  size='small'
                                  tableLayout='auto'
                                  virtual
                                  pagination={{ position: ['topRight'], pageSize: 5 }}
                                >
                                </Table>
                              </div>
                            }
                          </div>
                        }
                      
                      ><span style={{color: "blue"}}><b>...</b></span></Popover>
                    }
                    style={{ 
                      width: 120,
                      margin: 5,
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
            </Flex>
            </div>
          } else {
            return <div key={"Group_"+group }></div>;
          }
        })
        }
      </Flex>
    </div>
}
