
import { useReactFlow, useUpdateNodeInternals, getViewportForBounds, Rect, type Node} from '@xyflow/react';
import { Flex, Button, Divider, theme, Modal, Tooltip, message, Select, Input, Typography } from 'antd';
import {CopyOutlined} from '@ant-design/icons'
import { useState } from 'react';

import { useTranslation } from "react-i18next";

import { toPng, toJpeg, toSvg } from 'html-to-image';

import {
  useDiagramCheckSettingsStore,
} from '../check/checkSettingsStore';
import { useDiagramCheckResultStore } from '../check/diagramCheckResultStore';
import { getCurrentURL, getAdaptedBounds } from '../utils/utils_functions';
import { createDiagramExportJson } from '../utils/exportModel';
import { applyComponentTemplateUpdatesToNodes, findNodeComponentTemplateUpdates } from '../utils/componentTemplateUpdates';
import { useUndoRedo } from '../utils/undoRedo';
import { parseImportedFlow, type ImportedFlow } from '../utils/diagramModel';
import { markAutosaveManuallySaved } from '../utils/autosaveStorage';
import { useAutosaveSettingsStore } from '../utils/autosaveSettingsStore';
import { useDiagramSaveStatusStore } from '../utils/diagramSaveStatusStore';

type WritableFileHandle = {
  name: string;
  getFile: () => Promise<File>;
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void>;
    close: () => Promise<void>;
  }>;
};

type FilePickerWindow = Window & typeof globalThis & {
  showOpenFilePicker?: (options?: {
    types?: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
    multiple?: boolean;
  }) => Promise<WritableFileHandle[]>;
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<WritableFileHandle>;
};

const DefaultModelFileName = 'wled-wiring.json';

const modelJsonFileType = {
  description: 'WLED wiring model',
  accept: { 'application/json': ['.json'] },
};

const sanitizeModelFileName = (name: string) => {
  const cleaned = name.trim().replace(/[\\/:*?"<>|]/g, '-');
  const withFallback = cleaned.length > 0 ? cleaned : DefaultModelFileName.replace(/\.json$/i, '');
  return /\.json$/i.test(withFallback) ? withFallback : `${withFallback}.json`;
};

const getExportBaseName = (fileName: string) => (
  sanitizeModelFileName(fileName).replace(/\.json$/i, '') || 'wled-wiring'
);

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const nextAnimationFrame = () => new Promise<void>((resolve) => {
  requestAnimationFrame(() => resolve());
});

const shouldIncludeExportNode = (node: HTMLElement) => (
  !node.closest('.react-flow__controls') &&
  !node.closest('.react-flow__panel') &&
  !node.closest('.react-flow__minimap') &&
  !node.closest('.react-flow__attribution') &&
  !node.closest('.simulation-overlay-action')
);

const expandBoundsToPoint = (bounds: Rect, x: number, y: number) => {
  const minX = Math.min(bounds.x, x);
  const minY = Math.min(bounds.y, y);
  const maxX = Math.max(bounds.x + bounds.width, x);
  const maxY = Math.max(bounds.y + bounds.height, y);

  bounds.x = minX;
  bounds.y = minY;
  bounds.width = maxX - minX;
  bounds.height = maxY - minY;
};

const cloneBounds = (bounds: Rect): Rect => ({
  x: bounds.x,
  y: bounds.y,
  width: bounds.width,
  height: bounds.height,
});

export const ImportExportPage = () => {
  const {t} = useTranslation(['main']);
  const { token } = theme.useToken();
  const reactFlow = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const { clearHistory, takeSnapshot } = useUndoRedo();
  const setDiagramCheckSettingsFromExport = useDiagramCheckSettingsStore((state) => state.setSettingsFromExport);
  const clearDiagramCheckResult = useDiagramCheckResultStore((state) => state.clearResult);
  const autosaveEnabled = useAutosaveSettingsStore((state) => state.autosaveEnabled);
  const markDiagramSaved = useDiagramSaveStatusStore((state) => state.markSaved);
  const [documentFileName, setDocumentFileName] = useState(DefaultModelFileName);
  const [modelFileHandle, setModelFileHandle] = useState<WritableFileHandle | null>(null);
  const [saveAsModalOpen, setSaveAsModalOpen] = useState(false);
  const [saveAsFileName, setSaveAsFileName] = useState(DefaultModelFileName);

  const askForComponentTemplateUpdates = (loadedNodes: Node[]) => {
    const updateInfos = findNodeComponentTemplateUpdates(loadedNodes, t('sidebar.components.updateValueMissing'));
    if(updateInfos.length===0) return;

    modalApi.confirm({
      title: t('message.componentUpdatesAvailableTitle'),
      content: t('message.componentUpdatesAvailableDescription', { count: updateInfos.length }),
      okText: t('message.componentUpdatesApplyAll'),
      cancelText: t('message.componentUpdatesSkip'),
      onOk: () => {
        let updatedNodeIds: string[] = [];
        takeSnapshot('component template update');
        reactFlow.setNodes((currentNodes) => {
          const result = applyComponentTemplateUpdatesToNodes(currentNodes);
          updatedNodeIds = result.updatedNodeIds;
          return result.nodes;
        });
        setTimeout(() => {
          updatedNodeIds.forEach((nodeId) => updateNodeInternals(nodeId));
        }, 0);
        messageApi.open({
          type: 'success',
          content: t('message.componentUpdatesAllApplied', { count: updateInfos.length }),
          duration: 5,
        });
      },
    });
  };

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

  const measureRenderedExportBounds = (
    baseBounds: Rect,
    exportNode: HTMLElement,
    viewport: {x: number; y: number; zoom: number},
  ): Rect => {
    const rootRect = exportNode.getBoundingClientRect();
    const measuredBounds = cloneBounds(baseBounds);
    const candidates = exportNode.querySelectorAll<HTMLElement>(
      '.react-flow__node, .react-flow__node *, .simulation-overlay-exportable',
    );

    candidates.forEach((candidate) => {
      if(!shouldIncludeExportNode(candidate)) return;

      const rect = candidate.getBoundingClientRect();
      if(rect.width <= 0 || rect.height <= 0) return;

      const left = (rect.left - rootRect.left - viewport.x) / viewport.zoom;
      const top = (rect.top - rootRect.top - viewport.y) / viewport.zoom;
      const right = (rect.right - rootRect.left - viewport.x) / viewport.zoom;
      const bottom = (rect.bottom - rootRect.top - viewport.y) / viewport.zoom;

      expandBoundsToPoint(measuredBounds, left, top);
      expandBoundsToPoint(measuredBounds, right, bottom);
    });

    const padding = 12/ Math.max(viewport.zoom, 0.01);
    measuredBounds.x -= padding;
    measuredBounds.y -= padding;
    measuredBounds.width += padding;
    measuredBounds.height += padding;

    return measuredBounds;
  };

  function generateDataForExport(nodesBounds: Rect):{element:HTMLElement, viewport:{x:number, y:number, zoom:number}, imageWidth:number, imageHeight:number, exportNode:HTMLElement}{
    if(nodesBounds.width <= 0 || nodesBounds.height <= 0) {
      nodesBounds = {x: 0, y: 0, width: 1, height: 1};
    }

    const imageWidth = 1024;
    const imageHeight = imageWidth * (nodesBounds.height / nodesBounds.width);

    const doc=document.querySelector('.react-flow__viewport') as HTMLElement;
    const exportNode=document.querySelector('#reactflowDiv .react-flow') as HTMLElement;
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
    return {element, viewport, imageWidth, imageHeight, exportNode};
  }

  const exportDiagramImage = async (
    format: 'png' | 'jpg' | 'svg',
    renderer: typeof toPng,
  ) => {
    const currentViewport = reactFlow.getViewport();
    const NodesBoundsArr=reactFlow.getNodes().map((node) => ({id: node.id, rect: reactFlow.getNodesBounds([node.id])}));
    const baseBounds = NodesBoundsArr.length > 0
      ? getAdaptedBounds(reactFlow, NodesBoundsArr)
      : {x: 0, y: 0, width: 1, height: 1};
    const exportNode=document.querySelector('#reactflowDiv .react-flow') as HTMLElement;
    const originalWidth = exportNode.style.width;
    const originalHeight = exportNode.style.height;
    let exportData: ReturnType<typeof generateDataForExport> | undefined;

    try {
      let measuredBounds = cloneBounds(baseBounds);

      for(let pass = 0; pass < 2; pass += 1) {
        const imageWidth = 1024;
        const imageHeight = imageWidth * (measuredBounds.height / measuredBounds.width);
        const viewport = getViewportForBounds(measuredBounds, imageWidth, imageHeight, 0.1, 10, 0.02);

        exportNode.style.width = `${imageWidth}px`;
        exportNode.style.height = `${imageHeight}px`;
        await reactFlow.setViewport(viewport, {duration: 0});
        await nextAnimationFrame();
        await nextAnimationFrame();

        measuredBounds = measureRenderedExportBounds(measuredBounds, exportNode, viewport);
      }

      exportData = generateDataForExport(measuredBounds);
      exportNode.style.width = `${exportData.imageWidth}px`;
      exportNode.style.height = `${exportData.imageHeight}px`;
      await reactFlow.setViewport(exportData.viewport, {duration: 0});
      await nextAnimationFrame();
      await nextAnimationFrame();

      const dataUrl = await renderer(exportData.exportNode, {
        backgroundColor: 'white',
        width: exportData.imageWidth,
        height: exportData.imageHeight,
        filter: (node) => (
          node instanceof HTMLElement ? shouldIncludeExportNode(node) : true
        ),
        style: {
          height: String(exportData.imageHeight),
          width: String(exportData.imageWidth),
        },
      });

      const a = document.createElement('a');
      a.setAttribute('download', `${exportBaseName}.${format}`);
      a.setAttribute('href', dataUrl);
      a.click();
    } finally {
      exportData?.element.remove();
      exportNode.style.width = originalWidth;
      exportNode.style.height = originalHeight;
      await reactFlow.setViewport(currentViewport, {duration: 0});
    }
  };

  const exportBaseName = getExportBaseName(documentFileName);

  const createModelBlob = () => (
    new Blob([createDiagramExportJson(reactFlow)], { type: 'application/json' })
  );

  const markCurrentModelAsManuallySaved = (fileName: string) => {
    if(!autosaveEnabled) return;

    try {
      markAutosaveManuallySaved(reactFlow, sanitizeModelFileName(fileName));
    } catch {
      // Manual save succeeded; autosave metadata is best effort.
    }
  };

  const saveModelToHandle = async (fileHandle: WritableFileHandle) => {
    const writable = await fileHandle.createWritable();
    await writable.write(createModelBlob());
    await writable.close();
  };

  const downloadModel = (fileName: string) => {
    const nextFileName = sanitizeModelFileName(fileName);
    downloadBlob(createModelBlob(), nextFileName);
    setDocumentFileName(nextFileName);
    markCurrentModelAsManuallySaved(nextFileName);
    markDiagramSaved();
    messageApi.open({
      type: 'success',
      content: t('message.saveModelDownloadStarted'),
      duration: 2,
    });
  };

  const handleSave = async () => {
    if (modelFileHandle) {
      try {
        await saveModelToHandle(modelFileHandle);
        const nextFileName = sanitizeModelFileName(modelFileHandle.name);
        setDocumentFileName(nextFileName);
        markCurrentModelAsManuallySaved(nextFileName);
        markDiagramSaved();
        messageApi.open({
          type: 'success',
          content: t('message.saveModelSuccess'),
          duration: 2,
        });
        return;
      } catch {
        setModelFileHandle(null);
      }
    }

    downloadModel(documentFileName);
  };

  const handleSaveAs = async () => {
    const pickerWindow = window as FilePickerWindow;
    if (pickerWindow.showSaveFilePicker) {
      try {
        const fileHandle = await pickerWindow.showSaveFilePicker({
          suggestedName: sanitizeModelFileName(documentFileName),
          types: [modelJsonFileType],
        });
        await saveModelToHandle(fileHandle);
        setModelFileHandle(fileHandle);
        const nextFileName = sanitizeModelFileName(fileHandle.name);
        setDocumentFileName(nextFileName);
        markCurrentModelAsManuallySaved(nextFileName);
        markDiagramSaved();
        messageApi.open({
          type: 'success',
          content: t('message.saveModelSuccess'),
          duration: 2,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        messageApi.open({
          type: 'error',
          content: t('message.saveModelError'),
          duration: 3,
        });
      }
      return;
    }

    setSaveAsFileName(sanitizeModelFileName(documentFileName));
    setSaveAsModalOpen(true);
  };

  const applyImportedFlow = (flow: ImportedFlow, fileName: string, fileHandle: WritableFileHandle | null) => {
    clearDiagramCheckResult();
    reactFlow.setNodes(flow.nodes);
    reactFlow.setEdges(flow.edges);
    reactFlow.setViewport(flow.viewport);
    setDiagramCheckSettingsFromExport(flow.checkSettings);
    clearHistory();
    setDocumentFileName(sanitizeModelFileName(fileName));
    setModelFileHandle(fileHandle);
    markDiagramSaved();
    messageApi.open({
      type: 'success',
      content: t('message.loadModelSuccess'),
      duration: 2,
    });
    setTimeout(() => {
      askForComponentTemplateUpdates(flow.nodes);
    }, 0);
  };

  const handleOpenFile = async () => {
    const pickerWindow = window as FilePickerWindow;
    if (pickerWindow.showOpenFilePicker) {
      try {
        const [fileHandle] = await pickerWindow.showOpenFilePicker({
          types: [modelJsonFileType],
          multiple: false,
        });
        if (!fileHandle) return;

        const file = await fileHandle.getFile();
        const jsonData = await file.text();
        const flow = parseImportedFlow(jsonData);
        applyImportedFlow(flow, file.name, fileHandle);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        messageApi.open({
          type: 'error',
          content: t('message.loadModelError'),
          duration: 3,
        });
      }
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const jsonData = e.target?.result;
          if (typeof jsonData === 'string') {
            try {
              const flow = parseImportedFlow(jsonData);
              applyImportedFlow(flow, file.name, null);
            } catch {
              messageApi.open({
                type: 'error',
                content: t('message.loadModelError'),
                duration: 3,
              });
            }
          }
        };
        reader.onerror = () => {
          messageApi.open({
            type: 'error',
            content: t('message.loadModelError'),
            duration: 3,
          });
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

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
    const data = createDiagramExportJson(reactFlow);
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
      {modalContextHolder}
      <Flex  gap="small" id="componentPageFlexDiv" vertical>
        <Divider key={"Divider1" }
            style={{fontSize: token.fontSize}}
          >
            {t('sidebar.export.dividerSaveOpen')}
        </Divider>
        <Typography.Text type="secondary">
          {t('sidebar.export.currentFile', { name: documentFileName })}
        </Typography.Text>
        <Button
          onClick={handleSave}
        >{t('sidebar.export.buttonSave')}</Button>
        <Button
          onClick={handleSaveAs}
        >{t('sidebar.export.buttonSaveAs')}</Button>
        <Button
           onClick={handleOpenFile}
        >{t('sidebar.export.buttonOpen')}</Button>
        <Divider key={"Divider2" }
            style={{fontSize: token.fontSize}}
          >
            {t('sidebar.export.dividerExport')}
        </Divider>
        <Button
           onClick={() => { void exportDiagramImage('png', toPng); }}
        >{t('sidebar.export.buttonExportPNG')}</Button>
        <Button
           onClick={() => { void exportDiagramImage('jpg', toJpeg); }}
        >{t('sidebar.export.buttonExportJPEG')}</Button>
        <Button
           onClick={() => { void exportDiagramImage('svg', toSvg); }}
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
          {label: t('examples.example4'), value: "examples/example4"},
          {label: t('examples.example5'), value: "examples/example5"},
        ]}
        onSelect={(value,_) => {
          window.open(getCurrentURL()+'?link='+value, '_blank')?.focus();
        }}
      >
      </Select>
      </Flex>

      <Modal
        title={t('sidebar.export.saveAsModalTitle')}
        open={saveAsModalOpen}
        okText={t('sidebar.export.saveAsModalOk')}
        cancelText={t('sidebar.export.share.modalButtonCancel')}
        onOk={() => {
          const nextFileName = sanitizeModelFileName(saveAsFileName);
          downloadModel(nextFileName);
          setModelFileHandle(null);
          setSaveAsModalOpen(false);
        }}
        onCancel={() => setSaveAsModalOpen(false)}
      >
        <Input
          value={saveAsFileName}
          onChange={(event) => setSaveAsFileName(event.target.value)}
          onPressEnter={() => {
            const nextFileName = sanitizeModelFileName(saveAsFileName);
            downloadModel(nextFileName);
            setModelFileHandle(null);
            setSaveAsModalOpen(false);
          }}
        />
      </Modal>

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
