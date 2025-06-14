
import { useReactFlow, getViewportForBounds, Rect} from '@xyflow/react';
import { Flex, Button, Divider, theme, Modal, Tooltip, message, Select } from 'antd';
import {CopyOutlined} from '@ant-design/icons'
import { useState } from 'react';

import { useTranslation } from "react-i18next";

import { toPng, toJpeg, toSvg } from 'html-to-image';

import { getCurrentURL, getAdaptedBounds } from '../utils/utils_functions';


export const ImportExportPage = () => {
  const {t} = useTranslation(['main']);
  const { token } = theme.useToken();
  const reactFlow = useReactFlow();
  const [messageApi, messageContextHolder] = message.useMessage();

  function createInfoElement(nodesBounds:Rect, textScalefactor:number, textOffset:number):HTMLElement{
    const element=document.createElement('div');
    element.innerHTML="Made by WLED Wiring Designer: "+getCurrentURL();
    element.style.position="absolute";
    element.style.fontSize=String(nodesBounds.height/40)+"px";
    element.style.color="rgba(0,0,0,0.5)";
    element.style.top=String(nodesBounds.y-nodesBounds.height/textScalefactor-textOffset)+"px";
    element.style.left=nodesBounds.x+"px"; 
    return element;
  }

  function generateDataForExport():{element:HTMLElement, viewport:{x:number, y:number, zoom:number}, imageWidth:number, imageHeight:number}{
    const NodesBoundsArr=reactFlow.getNodes().map((node) => ({id: node.id, rect: reactFlow.getNodesBounds([node.id])}));
    const nodesBounds=getAdaptedBounds(reactFlow, NodesBoundsArr);

    const imageWidth = 1024;
    const imageHeight = imageWidth * (nodesBounds.height / nodesBounds.width);

    const doc=document.querySelector('.react-flow__viewport') as HTMLElement;
    const textScalefactor=40;
    const textOffset=10;
    const element = createInfoElement(nodesBounds, textScalefactor, textOffset);
    doc.insertAdjacentElement('afterbegin', element);
    const Offset=nodesBounds.height/textScalefactor+textOffset;
    nodesBounds.y=nodesBounds.y-Offset;
    nodesBounds.height=nodesBounds.height+Offset;

    const viewport = getViewportForBounds(
      nodesBounds,
      imageWidth,
      imageHeight,
      0.1,
      10,
      0.02
    );
    return {element, viewport, imageWidth, imageHeight};
  }

  const ExportFileName="wled-wiring";

  const [open, setOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [modalText, setModalText] = useState("");
  const [modalLinkText, setModalLinkText] = useState("");
  const [modalErrorText, setModalErrorText] = useState("");
  const [modalOkButtonDisabled, setModalOkButtonDisabled] = useState(false);
  const [modalCancelText, setModalCancelText] = useState("Cancel");
  const [shareLink, setShareLink] = useState("");

  const handleOk = () => {
    setConfirmLoading(true);
    setModalLinkText(t('sidebar.export.share.modalLinkText'));
    setModalText(t('sidebar.export.share.modalLinkBeingGenerated'));
    const reactFlowObject={};
    Object.assign(reactFlowObject, reactFlow.toObject(), {application: {version: 1, name: 'WLED Wiring Model', url: getCurrentURL()}});
    const data = JSON.stringify(reactFlowObject);
    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data
    };
    fetch('https://wled-api.myhome-control.de/wled-wiring/gate_post2.php', requestOptions)
        .then(response => {
          if (response.ok) {
            return response.text();
          }
        })
        .then(data=>{
          if(data && data.length==24){
            setShareLink(getCurrentURL()+"?link="+data);
          } else {
            setModalErrorText(t('sidebar.export.share.modalLinkError'));
            setModalLinkText("");
          }
          setModalText("");
          setConfirmLoading(false);
          setModalOkButtonDisabled(true);
          setModalCancelText(t('sidebar.export.share.modalButtonClose'));   
          
        })
        .catch(() => {
          setModalErrorText(t('sidebar.export.share.modalLinkError'));
          setModalLinkText("");
          setModalText("");
          setConfirmLoading(false);
          setModalOkButtonDisabled(true);
          setModalCancelText(t('sidebar.export.share.modalButtonCancel'));
        });
  };


    return <div id="componentPageDiv">
      {messageContextHolder}        
      <Flex  gap="small" id="componentPageFlexDiv" vertical>
        <Divider key={"Divider1" }
            style={{fontSize: token.fontSize}}
          >
            {t('sidebar.export.dividerSaveOpen')}
        </Divider>
        <Button
          onClick={() => {
            const reactFlowObject={};
            Object.assign(reactFlowObject, reactFlow.toObject(), {application: {version: 1, name: 'WLED Wiring Model', url: getCurrentURL()}});
            const data = JSON.stringify(reactFlowObject);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = ExportFileName+".json"; // name of the file to be downloaded
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url); // free up memory

          }}
        >{t('sidebar.export.buttonSave')}</Button>
        <Button
           onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (event) => {
              const file = (event.target as HTMLInputElement).files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                  const jsonData = e.target?.result;
                  if (jsonData) {
                    const flow = JSON.parse(jsonData as string);
                    if (flow) {
                      const { x = 0, y = 0, zoom = 1 } = flow.viewport;
                      reactFlow.setNodes(flow.nodes || []);
                      reactFlow.setEdges(flow.edges || []);
                      reactFlow.setViewport({ x, y, zoom });
                    }
                  }
                };
                reader.readAsText(file);
              }
            };
            input.click();
           }}
        >{t('sidebar.export.buttonOpen')}</Button>
        <Divider key={"Divider2" }
            style={{fontSize: token.fontSize}}
          >
            {t('sidebar.export.dividerExport')}
        </Divider>
        <Button
           onClick={() => {
            const {element, viewport, imageWidth, imageHeight} = generateDataForExport();
            toPng(document.querySelector('.react-flow__viewport') as HTMLElement, {
              backgroundColor: 'white',
              width: imageWidth,
              height: imageHeight,
              style: {
                width: String(imageWidth),
                height: String(imageHeight),
                transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
              },
            }).then((dataUrl) => {
              const a = document.createElement('a');
              a.setAttribute('download', ExportFileName+'.png');
              a.setAttribute('href', dataUrl);
              a.click();
              element.remove();
            });
           }}
        >{t('sidebar.export.buttonExportPNG')}</Button>
        <Button
           onClick={() => {
            const {element, viewport, imageWidth, imageHeight} = generateDataForExport();
            toJpeg(document.querySelector('.react-flow__viewport') as HTMLElement, {
              backgroundColor: 'white',
              width: imageWidth,
              height: imageHeight,
              style: {
                width: String(imageWidth),
                height: String(imageHeight),
                transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
              },
            }).then((dataUrl) => {
              const a = document.createElement('a');
              a.setAttribute('download', ExportFileName+'.jpg');
              a.setAttribute('href', dataUrl);
              a.click();
              element.remove();
            });
           }}
        >{t('sidebar.export.buttonExportJPEG')}</Button>
        <Button
           onClick={() => {
            const {element, viewport, imageWidth, imageHeight} = generateDataForExport();
            toSvg(document.querySelector('.react-flow__viewport') as HTMLElement, {
              backgroundColor: 'white',
              width: imageWidth,
              height: imageHeight,
              style: {
                width: String(imageWidth),
                height: String(imageHeight),
                transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
              },
            }).then((dataUrl) => {
              const a = document.createElement('a');
              a.setAttribute('download', ExportFileName+'.svg');
              a.setAttribute('href', dataUrl);
              a.click();
              element.remove();
            });
           }}
        >{t('sidebar.export.buttonExportSVG')}</Button>
        
      <Divider
        key={"Divider3"}
        style={{fontSize: token.fontSize}}
      >
        {t('sidebar.export.dividerShare')}
      </Divider>
      <Button
          onClick={() => {
            setShareLink("");
            setOpen(true);
          }}
        >{t('sidebar.export.buttonShare')}</Button>
      <Divider
        key={"Divider4"}
        style={{fontSize: token.fontSize}}
      >
        {t('sidebar.export.dividerExamples')}
      </Divider>
      <Select
        showSearch
        placeholder={t('sidebar.export.selectExample')}
        optionFilterProp="label"
        options={[
          {label: t('examples.example1'), value: "examples/example1"},
          {label: t('examples.example2'), value: "examples/example2"},
          {label: t('examples.example3'), value: "examples/example3"},
        ]}
        onSelect={(value,_) => {
          window.open(getCurrentURL()+'?link='+value, '_blank')?.focus();
        }}
      >
      </Select>
      </Flex>

      <Modal
        title={t('sidebar.export.share.modalTitle')}
        open={open}
        onOk={handleOk}
        confirmLoading={confirmLoading}
        okButtonProps={{ disabled: modalOkButtonDisabled }}
        okText={"Ok"}
        cancelText={modalCancelText}
        onCancel={() => {
          setOpen(false);
          setModalOkButtonDisabled(false);
          setModalText("");
          setModalErrorText("");
          setModalLinkText("");
          setShareLink("");
          setConfirmLoading(false);
          setModalCancelText(t('sidebar.export.share.modalButtonCancel'));
        }}
      >
        <p>{t('sidebar.export.share.modalAttentionText')}</p>
        <div><span style={{color:'red'}}>{modalErrorText}</span><span style={{color:'green'}}>{modalLinkText}</span>{modalText}<span style={{backgroundColor:"rgba(0,0,0,0.1)", marginLeft: "5px", marginRight: "5px"}}>{shareLink}</span>
        <Tooltip
            title={t('sidebar.export.share.tooltipCopyLink')}
            placement="top"
        >
          <Button
            type="primary"
            icon={<CopyOutlined />}
            style={{
              display: shareLink.length > 0 ? 'inline-block' : 'none',
            }}
            onClick={() => {
              navigator.clipboard.writeText(shareLink);
              messageApi.open({
                type: 'success',
                content: t('sidebar.export.share.messageLinkCopied'),
                duration: 2,
              });
            }}
          >
          </Button>
        </Tooltip>
        </div>
      </Modal>
    </div>
}