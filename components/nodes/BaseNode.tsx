import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { useReactFlow } from '@xyflow/react';
import { IconTrash, IconCopy, IconGripVertical } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

export interface BaseNodeData extends Record<string, unknown> {
    label: string;
    description?: string;
    required?: boolean;
    onDelete?: () => void;
    onDuplicate?: () => void;
}

interface BaseNodeProps {
    id: string;
    selected?: boolean;
    data: BaseNodeData;
    children?: React.ReactNode;
    icon?: React.ElementType;
    color?: string;
    handles?: {
        source?: Position;
        target?: Position;
    };
}

const BaseNode = ({ id, selected, data, children, icon: Icon, color = "bg-primary", handles }: BaseNodeProps) => {
    const { deleteElements } = useReactFlow();

    // Default actions if not provided in data
    const handleDelete = () => {
        if (data.onDelete) data.onDelete();
        else deleteElements({ nodes: [{ id }] });
    };

    return (
        <div className={cn(
            "group relative w-[280px] rounded-xl border-2 bg-card shadow-sm transition-all duration-200",
            selected ? "border-primary ring-4 ring-primary/10 shadow-xl" : "border-border hover:border-sidebar-primary/50"
        )}>
            {/* Target Handle (Input) */}
            {handles?.target && (
                <Handle
                    type="target"
                    position={handles.target}
                    className="w-3 h-3 bg-muted-foreground border-2 border-background"
                />
            )}

            {/* Header / Drag Handle */}
            <div className="drag-handle flex items-center justify-between p-3 border-b border-border/50 bg-muted/30 rounded-t-[10px] cursor-grab active:cursor-grabbing">
                <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-md text-primary-foreground", color)}>
                        {Icon && <Icon size={14} />}
                    </div>
                    <span className="font-semibold text-sm text-foreground tracking-tight">{data.label}</span>
                </div>

                {/* Actions (Visible on hover/selected) */}
                <div className={cn("flex items-center gap-1 transition-opacity", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                    {/* Duplicate implementation would go here */}
                    <button onClick={handleDelete} className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded transition-colors" title="Delete">
                        <IconTrash size={14} />
                    </button>
                    <IconGripVertical size={14} className="text-muted-foreground/50 ml-1" />
                </div>
            </div>

            {/* Content Body */}
            <div className="p-4">
                {children}
            </div>

            {/* Source Handle (Output) */}
            {handles?.source && (
                <Handle
                    type="source"
                    position={handles.source}
                    className="w-3 h-3 bg-primary border-2 border-background"
                />
            )}
        </div>
    );
};

export default memo(BaseNode);
