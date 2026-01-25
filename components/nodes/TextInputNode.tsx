import React, { memo } from 'react';
import { NodeProps, Position } from '@xyflow/react';
import BaseNode, { BaseNodeData } from './BaseNode';
import { IconTextCaption } from '@tabler/icons-react';

interface TextInputData extends BaseNodeData {
    placeholder?: string;
    value?: string;
}

const TextInputNode = (props: NodeProps<any>) => {
    return (
        <BaseNode
            id={props.id}
            selected={props.selected}
            data={props.data}
            icon={IconTextCaption}
            handles={{ source: Position.Right, target: Position.Left }}
        >
            <div className="space-y-3">
                <label className="text-xs font-medium text-muted-foreground block">
                    Question Title
                </label>
                <input
                    type="text"
                    className="w-full bg-transparent border-b border-border py-1 text-sm font-medium focus:outline-hidden focus:border-primary transition-colors placeholder:font-normal"
                    defaultValue={props.data.question || "What is your name?"}
                    placeholder="Enter your question here..."
                />

                <div className="pt-2">
                    <div className="w-full p-2 rounded-md bg-muted/50 border border-border text-xs text-muted-foreground italic">
                        User's answer will appear here...
                    </div>
                </div>
            </div>
        </BaseNode>
    );
};

export default memo(TextInputNode);
