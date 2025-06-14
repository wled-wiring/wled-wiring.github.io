import { useState } from 'react';
import { ConfigProvider, Input, Select, theme} from 'antd';
import { useTranslation } from "react-i18next";

import { type ComponentDataType, EdgeDataType } from '../types';
import "../i18n"
import LocaleSwitcher from "../utils/LocaleSwitcher";
import {ComponentList} from "../components/ComponentList.ts"

import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  ConnectionLineType,
  ConnectionMode,
  ReactFlowProvider,
  XYPosition
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import {nodeTypes } from '../components';
import {edgeTypes} from '../wires';

const defaultEdgeOptions = {
  type: "editable-wire-type",
  data: { type: "straight",
       edgePoints: [ ],
       color: "#FF0072",
       color_selected: "#b1b1b1",
       width: 1,
       physLength: 0.1,
       physCrosssection: 0.75,
       physCrosssectionUnit: "mm2",
       physType: "single",
  } as EdgeDataType
};


const { TextArea } = Input;

const FlowApp = () => {
  const [nodes, setNodes] = useState([] as Array<{id: string, position: XYPosition, type: string, data: ComponentDataType}>);
  const [dataEdited, setDataEdited]=useState("");
  const [bgColor, setBgColor]=useState("white");
  
  const {t} = useTranslation(['main']);
  const { token } = theme.useToken();

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.compactAlgorithm,
        token: {
          fontSize: 14,
        },
        components: {
          Card: {
            headerPaddingSM: 6,
            bodyPaddingSM: 6,
            headerFontSizeSM: 10,
          },
        },
      }}
    >
      <div id="app_container">
        <div id="headerRow" style={{borderBottomColor: token.colorBorder}}>
            <div style={{flex: "1 1 auto", textAlign: 'center'}}>
              <h2 
                style={{marginTop: 4, marginBottom: 4, minWidth: 300}}
              >{t('title')}</h2>
            </div>
            <div style={{flex: "0 0 auto", marginRight: 8, marginTop: 4, marginBottom: 4, marginLeft: 4}}> 
                <LocaleSwitcher />
            </div>
        </div>

        <div id="mainRow">
          <div id="reactflowDiv" style={{borderColor: token.colorBorder}}>
            <ReactFlow
              data-testid="reactflow_pane"
              nodes={nodes}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              connectionLineType={ConnectionLineType.Straight}
              connectionMode={ConnectionMode.Loose}
              defaultEdgeOptions={defaultEdgeOptions}
              snapToGrid={true}
              snapGrid={[2,2]}
              fitView
            >
              <Background 
              variant={BackgroundVariant.Dots}
              offset={0}
              gap={16}
              />
              <Controls />
            </ReactFlow>
          </div>
          <div id="sidebarEditorDiv" style={{borderColor: token.colorBorder}}>
            <Select
              options={ComponentList.map((item)=>({value: item.data.technicalID, label: (item.data as ComponentDataType).technicalID}))}
              placeholder="Select component ..."
              onSelect={(value,_)=> {
                const type='general-component-type';
                const data = ComponentList.filter((node)=>node.data.technicalID==value)[0].data as ComponentDataType;
                const newNode = {
                  id: String(Math.random()),
                  type,
                  position: {x:0, y:0} as XYPosition,
                  data,
                };
                setNodes((nds) => {
                  nds=[newNode];
                  console.log(nds);
                  return nds;
                });

                setDataEdited(JSON.stringify(data, null, 2));
              }}
            ></Select>
            <TextArea
              value={dataEdited}
              style={{backgroundColor: bgColor}}
              onChange={(event)=>{
                setDataEdited(event.target.value);

                try {
                  const newdata = JSON.parse(event.target.value);
                  if(newdata) {
                    const type='general-component-type';
                    const newNode = {
                      id: String(Math.random()),
                      type,
                      position: {x:0, y:0} as XYPosition,
                      data: newdata,
                    };
                    setNodes((nds) => {
                      nds=[newNode];
                      console.log(nds);
                      return nds;
                    });
                  }
                  setBgColor("white");
                } catch (e) {
                  setBgColor("#FFCCCB");
                }

              }}

            >
            </TextArea>
            
          </div>
        </div>
        <div id="footerRow" className="flex-container" style={{borderTopColor: token.colorBorder}}>
        </div>
      </div>
    </ConfigProvider>
  );
}

const EditorApp = () => (
  <ReactFlowProvider>
    <FlowApp />
 </ReactFlowProvider>
);

export default EditorApp;
