import type { CSSProperties, FC } from 'react'
import { useDrag } from 'react-dnd'
import { ItemTypes } from '../types'

import { FlowNodeProps } from '../types';

const style: CSSProperties = {
  cursor: 'move',
  float: 'left',
}

interface DropResult {
  name: string
}

export const DragableComponent: FC<FlowNodeProps> = function Box({data}) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.NODE,
    item: data,
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult<DropResult>()
      if (item && dropResult) {
        //alert fires two times in firefox, do not use it
        //alert(`You dropped ${item.name} into ${dropResult.name}!`);
        //console.log(`You dropped ${item.name} into ${dropResult.name}!`);
      }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
      handlerId: monitor.getHandlerId(),
    }),
  }))

  const opacity = isDragging ? 0.4 : 1
  return (
    <div ref={drag}
        style={{ ...style,
            opacity,
            width: "100%",
            height: "60px",
        }}
        data-testid={`flownode`}
    >
      <img
        src={data.image?.url}
        style= {{
          width: "100%",
          height: "100%",
          objectFit: "scale-down",
        }}
      
      />
    </div>
  )
}