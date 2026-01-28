import React, { memo } from 'react';
import { NodeProps, Position } from '@xyflow/react';
import BaseNode from './BaseNode';
import { IconStar } from '@tabler/icons-react';

const RatingNode = (props: NodeProps<any>) => {
    const { label, description, required, maxRating } = props.data;
    const max = maxRating || 5;

    return (
        <BaseNode
            id={props.id}
            selected={props.selected}
            data={props.data}
            icon={IconStar}
            handles={{ source: Position.Bottom, target: Position.Top }}
        >
            <div className="space-y-3">
                <div className="space-y-1">
                    <label className="text-sm font-medium text-foreground flex items-center gap-1">
                        {label || "Rating Question"}
                        {required && <span className="text-destructive">*</span>}
                    </label>
                    {description && (
                        <p className="text-xs text-muted-foreground">{description}</p>
                    )}
                </div>

                <div className="flex gap-1 justify-center py-2">
                    {Array.from({ length: max }).map((_, i) => (
                        <IconStar key={i} size={24} className="text-muted-foreground/30 hover:text-yellow-400 cursor-pointer transition-colors" />
                    ))}
                </div>
            </div>
        </BaseNode>
    );
};

export default memo(RatingNode);
