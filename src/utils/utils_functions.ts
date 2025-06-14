import { gray, red, green, blue, cyan, purple, magenta, gold } from '@ant-design/colors';
import {Rect, ReactFlowInstance, getNodesBounds, type Edge, type Node} from '@xyflow/react';
import {EdgeDataType, DirectionType, HandleDataType, PhysLengthType, XYPoint, ComponentDataType} from '../types';

export type nearestPoint = {
  pType: undefined | "edge" | "corner";
  x:number;
  y: number;
  edgeID:string;
  segmentNumber: number;
  distance: number;
  color: string;
}

// calculates distance between the point (x,y) and a line segment defined by two points (x1,y1) and (x2,y2)
export function pDistance(x:number, y:number, x1:number, y1:number, x2:number, y2:number) {
  var A = x - x1;
  var B = y - y1;
  var C = x2 - x1;
  var D = y2 - y1;

  var dot = A * C + B * D;
  var len_sq = C * C + D * D;
  var param = -1;
  if (len_sq != 0) //in case of line length = 0
      param = dot / len_sq;

  var xx, yy;
  if (param < 0 || param > 1) {
    return [10000, 0, 0];
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  var dx = x - xx;
  var dy = y - yy;
  return [Math.sqrt(dx * dx + dy * dy), xx, yy];
}

//write a typescript function that converts color as string (like "red", "blue") into string "rgb(r,g,b)" like rgb(5,10,30)
function colorStringToRgbString(color: string):  string | undefined {
    const colorMap: Record<string, string> = {
      salmon: red[3],
      lightred: red[3],
      red: red[5],
      darkred: red[7],
      black: gray[9],
      lime: green[5],
      lightgreen: green[5],
      darkgreen: green[7],
      green: green[7],
      lightblue: blue[5],
      dodgerblue: blue[5],
      darkblue: blue[7],
      blue: blue[7],
      cyan: cyan[5],
      magenta: magenta[5],
      purple: purple[5],
      gold: gold[5],
    }
    return colorMap[color] || undefined;
  }

  export function rectToRotatedRect(rect:Rect, rotation:number) {
      const rotatedRect = {} as Rect;
      rotatedRect.x=rect.x+rect.width/2- ((rotation==0 || rotation==180)?rect.width/2:rect.height/2);
      rotatedRect.y=rect.y+rect.height/2- ((rotation==0 || rotation==180)?rect.height/2:rect.width/2);
      rotatedRect.width = (rotation==0 || rotation==180)?rect.width:rect.height;
      rotatedRect.height = (rotation==0 || rotation==180)?rect.height:rect.width;
      return rotatedRect;
  }

  // Function to get the current URL of the page without any parameters and without subdirectories
  export function getCurrentURL() {
    const url = window.location.href;
    const urlParts = url.split("?")[0].split("/");
    const baseUrl = urlParts.slice(0, 3).join("/") + "/";
    return baseUrl;
  }

  export function colorNameToRGBString(colorName: string): string {
    // if already rgb
    const match1 = colorName.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (match1) {
      const [_, r, g, b] = match1;
      return `rgb(${r},${g},${b})`;
    }

    // if in the colorMap
    let rgbString = colorStringToRgbString(colorName);
    if (rgbString) {
      return rgbString;
    }
    
    // Create a temporary element to use the browser's color parsing
    const tempElement = document.createElement("div");
    tempElement.style.color = colorName;
    document.body.appendChild(tempElement);
  
    // Get the computed color style (usually returns in rgb format)
    const computedColor = getComputedStyle(tempElement).color;
  
    // Remove the element from the DOM
    document.body.removeChild(tempElement);
  
    // Match the rgb values using a regular expression
    const match = computedColor.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (match) {
      const [_, r, g, b] = match;
      return `rgb(${r},${g},${b})`;
    } else {
      return "rgb(0,0,0)"; // Invalid color name
    }
  }

  // This function return bounds considering all edges and nodes (even if rotated)
  export function getAdaptedBounds(reactFlow:ReactFlowInstance, NodesBoundsArr: {id: string, rect: Rect}[]):Rect{
    let nodesBounds = getNodesBounds(reactFlow.getNodes());
    if(NodesBoundsArr.length===0) return {x:0, y:0, width:0, height:0};
    //let nodesBounds = NodesBoundsArr[0].rect;
    // for all nodes check if they are within nodebounds, therwise extend nodesBounds
    // it considers rotating what standard react-flow does not do
    /*
    const nodes = reactFlow.getNodes();
    nodes.forEach((node) => {
      const nodeData = node.data as ComponentDataType;
      const nodeRect = NodesBoundsArr.filter((nodeBounds) => nodeBounds.id === node.id)[0].rect;
      if (nodeData.image) {
        // in this version of rotation there is no need to rotate
        //const rotatedRect= rectToRotatedRect(nodeRect, nodeData.rotation);
        const rotatedRect = nodeRect;
  
        if (rotatedRect.x < nodesBounds.x) {
          nodesBounds.width = nodesBounds.x + nodesBounds.width - rotatedRect.x;
          nodesBounds.x = rotatedRect.x;
        }
        if (rotatedRect.y < nodesBounds.y) {
          nodesBounds.height = nodesBounds.y + nodesBounds.height - rotatedRect.y;
          nodesBounds.y = rotatedRect.y;
        }
        if (rotatedRect.x + rotatedRect.width > nodesBounds.x + nodesBounds.width) {
          nodesBounds.width = rotatedRect.x + rotatedRect.width - nodesBounds.x;
        }
        if (rotatedRect.y + rotatedRect.height > nodesBounds.y + nodesBounds.height) {
          nodesBounds.height = rotatedRect.y + rotatedRect.height - nodesBounds.y;
        }
      }
    });
   */
    const edges = reactFlow.getEdges();
    // for all edges check if they are within nodebounds, therwise extend nodesBounds
    edges.forEach((edge) => {
      const edgeData = edge.data as EdgeDataType;
      edgeData.edgePoints.forEach((point) => {
        if (point.x < nodesBounds.x) {
          nodesBounds.width = nodesBounds.x + nodesBounds.width - point.x;
          nodesBounds.x = point.x;
        }
        if (point.y < nodesBounds.y) {
          nodesBounds.height = nodesBounds.y + nodesBounds.height - point.y;
          nodesBounds.y = point.y;
        }
        if (point.x > nodesBounds.x + nodesBounds.width) {
          nodesBounds.width = point.x - nodesBounds.x;
        }
        if (point.y > nodesBounds.y + nodesBounds.height) {
          nodesBounds.height = point.y - nodesBounds.y;
        }
      })
  
    });
  
    return nodesBounds;
  }

  export function postypeToAdjustedXY(postype: string, sourceX:number, sourceY:number, handleWidth:number, handleHeight:number, rotation:number) {
    const ROUNDN=1;
    let sourceXadjusted=sourceX;
    let sourceYadjusted=sourceY;
    if(postype == "centered") {
      sourceXadjusted=sourceX+handleWidth/2;
      sourceYadjusted=sourceY;
    } else {
      const posArray=["left", "top", "right", "bottom", "left", "top", "right", "bottom"];
      const posIndex= (postype=="left")?0:((postype=="top")?1:((postype=="right")?2:(3)));
      const rotated_postype=posArray[posIndex+rotation/90];
      if(rotated_postype == "right") {
        sourceXadjusted=sourceX+handleWidth;
        sourceYadjusted=sourceY;
      }
      if(rotated_postype == "top") {
        sourceXadjusted=sourceX+handleWidth/2;
        sourceYadjusted=sourceY-handleHeight/2;
      }
      if(rotated_postype == "bottom") {
        sourceXadjusted=sourceX+handleWidth/2;
        sourceYadjusted=sourceY+handleHeight/2;
      }
    }
    return [Math.round(sourceXadjusted/ROUNDN)*ROUNDN, Math.round(sourceYadjusted/ROUNDN)*ROUNDN];
  }

  // for connection different function, sinc eit always starts in the middle pr default
   export function postypeToAdjustedXYConn(postype: string, sourceX:number, sourceY:number, handleWidth:number, handleHeight:number, rotation:number) {
    const ROUNDN=1;
    let sourceXadjusted=sourceX;
    let sourceYadjusted=sourceY;
    if(postype == "centered") {
      sourceXadjusted=sourceX;
      sourceYadjusted=sourceY;
    } else {
      const posArray=["left", "top", "right", "bottom", "left", "top", "right", "bottom"];
      const posIndex= (postype=="left")?0:((postype=="top")?1:((postype=="right")?2:(3)));
      const rotated_postype=posArray[posIndex+rotation/90];
      if(rotated_postype == "right") {
        sourceXadjusted=sourceX+((rotation==0 || rotation==180)?handleWidth:handleHeight)/2;
        sourceYadjusted=sourceY;
      }
      if(rotated_postype == "top") {
        sourceXadjusted=sourceX;
        sourceYadjusted=sourceY-((rotation==0 || rotation==180)?handleHeight:handleWidth)/2;
      }
      if(rotated_postype == "bottom") {
        sourceXadjusted=sourceX;
        sourceYadjusted=sourceY+((rotation==0 || rotation==180)?handleHeight:handleWidth)/2;
      }
      if(rotated_postype == "left") {
        sourceXadjusted=sourceX-((rotation==0 || rotation==180)?handleWidth:handleHeight)/2;
        sourceYadjusted=sourceY;
      }
    }
    return [Math.round(sourceXadjusted/ROUNDN)*ROUNDN, Math.round(sourceYadjusted/ROUNDN)*ROUNDN];
  }

  // function get nearest point on one of edges to the given toX and toY point.
  // used in ConnectionLine
  export function getNearestEdgePoint(toX: number, toY: number, edges:Edge[], fromX: number, fromY: number): nearestPoint {
    const retval={pType: undefined, x:0, y:0, edgeID: "", segmentNumber: 0, distance:0} as nearestPoint;
    const minAbs=5;
    const maxDist=10;
  
    // check all edges
    edges.forEach((edge)=>{
      if(edge.type=="editable-wire-type") {
        const edgeData=edge.data as EdgeDataType;
        const edgePoints = edgeData.edgePoints ?? [];
        const edgeSegmentsCount = edgePoints.length + 1;
        // go over all segments
        for (let i = 0; i < edgeSegmentsCount; i++) {
          let segmentSourceX, segmentSourceY, segmentTargetX, segmentTargetY;
          if (i === 0) {
            segmentSourceX = (edgeData.startXY?.x || 0);
            segmentSourceY = (edgeData.startXY?.y || 0);
          } else {
            const edgePoint = edgePoints[i - 1];
            segmentSourceX = edgePoint.x;
            segmentSourceY = edgePoint.y;
          }
          if (i === edgeSegmentsCount - 1) {
            segmentTargetX = (edgeData.endXY?.x || 0);
            segmentTargetY = (edgeData.endXY?.y || 0);
          } else {
            const edgePoint = edgePoints[i];
            segmentTargetX = edgePoint.x;
            segmentTargetY = edgePoint.y;
          }
  
          const segmentLength=Math.sqrt((segmentSourceX-segmentTargetX)**2+(segmentSourceY-segmentTargetY)**2);
          if(segmentLength>=minAbs*2+1) {
            const [dist, x0, y0]=pDistance(toX, toY, segmentSourceX, segmentSourceY, segmentTargetX, segmentTargetY);
            if(dist<=maxDist) {
              const dist1=Math.sqrt((segmentSourceX-x0)**2+(segmentSourceY-y0)**2);
              const dist2=Math.sqrt((segmentTargetX-x0)**2+(segmentTargetY-y0)**2);
              if(((retval.pType==undefined) || (retval.distance>dist)) && dist1>minAbs && dist2>minAbs) {
                retval.distance=dist;
                retval.x=x0;
                retval.y=y0;
                retval.edgeID=edge.id;
                retval.segmentNumber=i;
                retval.pType = "edge";
                retval.color = edgeData.color;
                // try to draw straight line in x or y direction id target line is in x or y direction too
                const dx=Math.abs(x0-fromX);
                //console.log(fromX, x0, segmentSourceY, segmentTargetY);
                if(dx<minAbs && segmentSourceY==segmentTargetY) {
                  retval.x=fromX;
                } else {
                  const dy=Math.abs(y0-fromY);
                  if(dy<minAbs && segmentSourceX==segmentTargetX) {
                    retval.y=fromY;
                  }
                }
              }
            }
  
          }
  
        }
        // now also check edge points
        edgePoints.forEach((point,i)=>{
          const dist=Math.sqrt((point.x-toX)**2+(point.y-toY)**2);
            if(dist<=maxDist) {
              if((retval.pType==undefined) || (retval.distance>dist)) {
                retval.distance=dist;
                retval.x=point.x;
                retval.y=point.y;
                retval.edgeID=edge.id;
                retval.segmentNumber=i;
                retval.pType = "corner";
                retval.color = edgeData.color;
              }
            }
        })
  
      }
    })
  
    return retval;
  }

  export function rotatePrefferedLineDirection(prefferedLineDirection: DirectionType, rotation: number):DirectionType{
    if(prefferedLineDirection!=undefined) {
    const dirArray=["left", "up", "right", "down", "left", "up", "right", "down"] as DirectionType[];
    const dirIndex= (prefferedLineDirection=="left")?0:((prefferedLineDirection=="up")?1:((prefferedLineDirection=="right")?2:(3)));
    return dirArray[dirIndex+rotation/90];
    }
    return undefined;
  }

  export function stripCheckAndDivideIfMiddleConnection(reactFlow: ReactFlowInstance, handleAndNodeArray: Array<{thisParamsNodeID:string, thisParamsHandleID:string}>){
    (handleAndNodeArray).map(({thisParamsNodeID, thisParamsHandleID})=>{
    const thisNode=reactFlow.getNode(thisParamsNodeID);
    if(thisNode!=undefined) {
      const repeatedHandleArray = (thisNode.data.repeatedHandleArray || []) as Array<HandleDataType>;
      // soure handle id is thisParamsHandle. Find if this handle is in the repeatedHandleArray
      const thisHandleIndexInRHA = repeatedHandleArray.findIndex((handleData)=>(handleData.hid===thisParamsHandleID));
      //console.log("II thisHandleIndexInRHA=", thisHandleIndexInRHA);
      // if not found, will return -1. proceed if found
      if(thisHandleIndexInRHA >=0) {
        //get repeatIndex for this handle, it will show the position
        const repeatIndex = repeatedHandleArray[thisHandleIndexInRHA].repeatIndex;
        //console.log("II repeatIndex=", repeatIndex);
        if(repeatIndex !== undefined) {
          // check if in physLengths array there is already object with startIndex == repeatIndex
          //console.log("II thisNode.data.physLengths=", thisNode.data.physLengths);
          const physLengths= (thisNode.data.physLengths || [{startIndex: 0, length:undefined}]) as PhysLengthType[];
          //console.log("IIa physLengths=", physLengths);
          // proceed only if in phyLengths array there is no this index already
          if(physLengths.findIndex((physLength)=>(physLength.startIndex===repeatIndex))===-1) {
            //console.log("IIb physLengths=", physLengths);
            //insert new element into phyLengths array
            // for that first find previous startIndex
            // for that first filter only objects with startIndex<repeatIndex
            const plFiltered = physLengths.filter((physLength)=>(physLength.startIndex<repeatIndex));
            const previousRepeatIndexObj = (plFiltered.reduce((prev, current) => (prev.startIndex > current.startIndex) ? prev : current));
            //console.log("II previousRepeatIndexObj=", previousRepeatIndexObj);
            // find positionIndex of previuous Element in array
            const posPreviousIndexInArray = physLengths.findIndex((physLength)=>(physLength.startIndex===previousRepeatIndexObj.startIndex));
            //console.log("II posPreviousIndexInArray=", posPreviousIndexInArray);
            let firstLength=undefined;
            let secondLength=undefined;
            if (physLengths[posPreviousIndexInArray].length !== undefined) {
              // divide length in two parts
              const InitialLength=physLengths[posPreviousIndexInArray].length;
              firstLength=Math.round(InitialLength/2*100)/100;
              // if physLengthStep is defined, correct eventually first length
              if(thisNode.data.physLengthStep) {
                const stepSize = thisNode.data.physLengthStep as number;
                const numberOfFullSteps=Math.round(firstLength/stepSize);
                firstLength = Math.round(numberOfFullSteps*stepSize*100)/100;
              }
              secondLength = InitialLength-firstLength;
            }
            // insert new element to array and change previous length
            //console.log("III physLenghts=", physLengths);
            physLengths[posPreviousIndexInArray].length=firstLength;
            physLengths.splice(posPreviousIndexInArray+1,0,{startIndex: repeatIndex, length: secondLength} as PhysLengthType);
            //console.log("IV physLengths=", physLengths);
            reactFlow.updateNodeData(thisParamsNodeID, {physLengths: physLengths});
          }
        }
      }
    }
  });
}

// this function returns middle of the handle considering rotation, coordinates relative to node position (without border)
export function getHandleMiddleRealPosition(node:Node, handleID:string):XYPoint {
  const compData=node.data as ComponentDataType;
  const rotatable=compData.rotatable;
  const rotation=rotatable?compData.rotation:0;
  const nodeLength=(compData?.nodeLength || 1);
  const nodeBasicSizeX=compData.image?.width || 0;
  const nodeBasicSizeY=compData.image?.height || 0;
  // const rotationSwapImgWH = (rotation==90) || (rotation==270);

  let handle = compData.handles.find((handle)=> (handle.hid==handleID));
    if(!handle) {
        handle=compData.repeatedHandleArray?.find((handleData)=>(handleData.hid==handleID));
    }

  // const rotated_width=((rotationSwapImgWH)?handle?.height:handle?.width) || 0;
  //const rotated_height=((rotationSwapImgWH)?handle?.width:handle?.height) || 0;
  const original_left=(handle?.xalign=="start")?(handle?.x || 0):nodeLength*nodeBasicSizeX-(handle?.x || 0);
  const original_top=(handle?.yalign=="start")?(handle?.y || 0):(compData.image?.height || 0)-(handle?.y || 0);
  const rotated_left=(rotation==0)?original_left:((rotation==90)?nodeBasicSizeY-original_top:((rotation==180)?nodeLength*nodeBasicSizeX-original_left:(original_top)));
  const rotated_top=(rotation==0)?original_top:((rotation==90)?original_left:((rotation==180)?nodeBasicSizeY-original_top:(nodeLength*nodeBasicSizeX-original_left)));
  //console.log("rotated_left, rotated_top", rotated_left, rotated_top);
  //console.log("rotated_width, rotated_height", rotated_width, rotated_height);

  return {x: rotated_left, y: rotated_top};
}