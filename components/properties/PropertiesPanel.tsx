import React from "react";
import { useReactFlow, Node } from "@xyflow/react";
import { getNodeDefinition, PropertyField } from "@/components/nodes/definitions";
import { IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { ConditionBuilder } from "./ConditionBuilder";

interface PropertiesPanelProps {
    node: Node | null;
    nodes: Node[]; // Full list of nodes needed for logic builder
    onChange: (fieldName: string, value: any) => void;
    onClose: () => void;
}

export default function PropertiesPanel({ node, nodes, onChange, onClose }: PropertiesPanelProps) {

    // Get the definition for this node type
    const definition = node ? getNodeDefinition(node.type || "") : null;

    if (!node || !definition) {
        return null;
    }


    return (
        <aside className="w-[320px] h-full bg-background border-l border-border flex flex-col shadow-xl z-20 transition-all duration-300">
            {/* Header */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-border bg-muted/10 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                        <definition.icon size={16} />
                    </div>
                    <span className="font-semibold text-sm tracking-tight">{definition.label}</span>
                </div>
                <button onClick={onClose} className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors">
                    <IconX size={16} />
                </button>
            </div>

            {/* Form Fields */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {definition.properties.map((field) => (
                    <div key={field.name} className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {field.label}
                        </label>

                        <FieldRenderer
                            field={field}
                            value={node.data[field.name] ?? field.defaultValue}
                            onChange={(val) => onChange(field.name, val)}
                            nodes={nodes}
                        />

                        {field.helperText && (
                            <p className="text-[10px] text-muted-foreground">{field.helperText}</p>
                        )}
                    </div>
                ))}

                {/* Debug Info for Developers */}
                <div className="mt-8 p-3 rounded-md bg-muted/50 border border-border text-[10px] font-mono text-muted-foreground break-all">
                    ID: {node.id} <br />
                    Type: {node.type}
                </div>
            </div>
        </aside>
    );
}


function FieldRenderer({ field, value, onChange, nodes }: { field: PropertyField, value: any, onChange: (val: any) => void, nodes: Node[] }) {
    switch (field.type) {
        case 'condition':
            return (
                <ConditionBuilder
                    value={value || { field: '', operator: 'equals', value: '' }}
                    onChange={onChange}
                    nodes={nodes}
                />
            );
        case 'text':
            return (
                <input
                    type="text"
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-hidden focus:ring-1 focus:ring-primary transition-all"
                />
            );
        case 'textarea':
            return (
                <textarea
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={field.placeholder}
                    rows={3}
                    className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-hidden focus:ring-1 focus:ring-primary transition-all resize-y"
                />
            );
        case 'number':
            return (
                <input
                    type="number"
                    value={value || ""}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-hidden focus:ring-1 focus:ring-primary transition-all"
                />
            );
        case 'switch':
            return (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onChange(!value)}
                        className={cn(
                            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-hidden focus:ring-2 focus:ring-primary focus:ring-offset-2",
                            value ? "bg-primary" : "bg-input"
                        )}
                    >
                        <span
                            className={cn(
                                "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                                value ? "translate-x-5" : "translate-x-1"
                            )}
                        />
                    </button>
                    <span className="text-sm text-foreground">{value ? "Enabled" : "Disabled"}</span>
                </div>
            );
        case 'options':
            return (
                <div className="space-y-2">
                    {(value || []).map((option: any, index: number) => (
                        <div key={index} className="flex gap-2">
                            <input
                                type="text"
                                value={option.label}
                                onChange={(e) => {
                                    const newOptions = [...value];
                                    newOptions[index] = { ...newOptions[index], label: e.target.value };
                                    onChange(newOptions);
                                }}
                                className="flex-1 px-3 py-2 text-sm bg-background border border-input rounded-md"
                                placeholder={`Option ${index + 1}`}
                            />
                            {/* Simple delete for options could go here */}
                        </div>
                    ))}
                    <button
                        onClick={() => onChange([...(value || []), { label: `Option ${(value?.length || 0) + 1}`, value: `opt${Date.now()}` }])}
                        className="text-xs text-primary hover:underline"
                    >
                        + Add Option
                    </button>
                </div>
            );
        default:
            return <div className="text-xs text-destructive">Unsupported field type: {field.type}</div>;
    }
}
