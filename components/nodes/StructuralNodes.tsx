import React, { memo } from 'react';
import { NodeProps, Position } from '@xyflow/react';
import BaseNode from './BaseNode';
import { IconForbid, IconPlayerPlay } from '@tabler/icons-react';

export const StartNode = memo((props: NodeProps<any>) => {
    return (
        <BaseNode
            id={props.id}
            selected={props.selected}
            data={{ ...props.data, label: 'Start' }}
            icon={IconPlayerPlay}
            color="bg-green-500"
            handles={{ source: Position.Right }}
        >
            <div className="text-xs text-muted-foreground text-center py-2">
                Survey starts here
            </div>
        </BaseNode>
    );
});

export const EndNode = memo((props: NodeProps<any>) => {
    const { message } = props.data;
    return (
        <BaseNode
            id={props.id}
            selected={props.selected}
            data={{ ...props.data, label: 'End Screen' }}
            icon={IconForbid}
            color="bg-destructive"
            handles={{ target: Position.Left }}
        >
            <div className="p-3 bg-muted/30 rounded-md border border-border/50 text-xs italic text-center">
                "{message || 'Thank you for completing the survey!'}"
            </div>
        </BaseNode>
    );
});
