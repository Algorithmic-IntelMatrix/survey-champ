import React, { memo } from 'react';
import { NodeProps, Position } from '@xyflow/react';
import BaseNode from './BaseNode';
import { IconPhoto } from '@tabler/icons-react';

const MediaNode = (props: NodeProps<any>) => {
    const { url, alt } = props.data;

    return (
        <BaseNode
            id={props.id}
            selected={props.selected}
            data={props.data}
            icon={IconPhoto}
            color="bg-indigo-500"
            handles={{ source: Position.Bottom, target: Position.Top }}
        >
            <div className="aspect-video w-full bg-muted rounded-md overflow-hidden flex items-center justify-center border border-border">
                {url ? (
                    <img src={url} alt={alt} className="w-full h-full object-cover" />
                ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <IconPhoto size={24} className="opacity-50" />
                        <span className="text-[10px]">No image URL provided</span>
                    </div>
                )}
            </div>
        </BaseNode>
    );
};

export default memo(MediaNode);
