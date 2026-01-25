import React, { memo } from 'react';
import { NodeProps, Position } from '@xyflow/react';
import BaseNode from './BaseNode';
import { IconListDetails, IconCheckbox } from '@tabler/icons-react';

const ChoiceNode = (props: NodeProps<any>) => {
    const { label, description, required, options } = props.data;
    const isMultiple = props.type === 'multipleChoice';

    return (
        <BaseNode
            id={props.id}
            selected={props.selected}
            data={props.data}
            icon={isMultiple ? IconCheckbox : IconListDetails}
            color="bg-orange-500"
            handles={{ source: Position.Right, target: Position.Left }}
        >
            <div className="space-y-3">
                <div className="space-y-1">
                    <label className="text-sm font-medium text-foreground flex items-center gap-1">
                        {label || "Choice Question"}
                        {required && <span className="text-destructive">*</span>}
                    </label>
                    {description && (
                        <p className="text-xs text-muted-foreground">{description}</p>
                    )}
                </div>

                <div className="space-y-1.5">
                    {(options as any[] || []).map((opt: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded-md border border-border bg-background/50 text-xs">
                            <div className={`w-3 h-3 border border-muted-foreground ${isMultiple ? 'rounded-sm' : 'rounded-full'}`} />
                            <span>{opt.label || `Option ${i + 1}`}</span>
                        </div>
                    ))}
                    {(!options || options.length === 0) && (
                        <div className="text-xs text-muted-foreground italic">No options added</div>
                    )}
                </div>
            </div>
        </BaseNode>
    );
};

export default memo(ChoiceNode);
