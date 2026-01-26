"use client"
import { cn } from "@/lib/utils"
import { IconCheck, IconArrowRight, IconAlertCircle } from "@tabler/icons-react"
import { NodeProps } from "./types"

export const ChoiceNode = ({ msg, currentNodeId, responses, setResponses, handleNext }: NodeProps) => {
    const isActive = msg.nodeId === currentNodeId;

    if (msg.type === 'singleChoice') {
        const options = msg.options || [];
        if (options.length === 0 && isActive) {
            return (
                <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm font-medium flex items-center gap-2">
                    <IconAlertCircle size={18} /> No options available.
                </div>
            )
        }
        return (
            <div className="flex flex-wrap gap-3">
                {options.map((opt: any, i: number) => (
                    <button
                        key={i}
                        disabled={!isActive}
                        onClick={() => handleNext(opt.value)}
                        className={cn(
                            "px-8 py-4 bg-card border border-border shadow-sm rounded-xl transition-all text-lg font-medium hover:shadow-md hover:border-primary/50 active:scale-95 text-left",
                            !isActive && "opacity-60 cursor-default shadow-none bg-muted"
                        )}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        )
    }

    if (msg.type === 'multipleChoice') {
        const options = msg.options || [];
        const currentValues = Array.isArray(responses[msg.nodeId!]) ? responses[msg.nodeId!] : [];

        return (
            <div className="space-y-6 w-full">
                <div className="flex flex-wrap gap-3">
                    {options.map((opt: any, i: number) => {
                        const isSelected = currentValues.includes(opt.value);
                        return (
                            <button
                                key={i}
                                disabled={!isActive}
                                onClick={() => {
                                    const newValues = isSelected
                                        ? currentValues.filter((v: string) => v !== opt.value)
                                        : [...currentValues, opt.value];
                                    setResponses(prev => ({ ...prev, [msg.nodeId!]: newValues }));
                                }}
                                className={cn(
                                    "px-6 py-4 bg-card border shadow-sm rounded-xl transition-all text-lg font-medium flex items-center gap-3 text-left hover:shadow-md",
                                    isSelected
                                        ? "ring-2 ring-primary border-transparent shadow-md z-10"
                                        : "border-border hover:border-gray-300 text-foreground/80",
                                    !isActive && !isSelected && "opacity-50 grayscale shadow-none"
                                )}
                            >
                                <div className={cn(
                                    "w-5 h-5 border rounded flex items-center justify-center transition-colors shrink-0",
                                    isSelected ? "bg-primary border-primary text-primary-foreground" : "bg-card border-muted-foreground/30"
                                )}>
                                    {isSelected && <IconCheck size={14} strokeWidth={3} />}
                                </div>
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
                {isActive && (
                    <button
                        disabled={currentValues.length === 0}
                        onClick={() => handleNext(currentValues)}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-full text-base font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-30 disabled:hover:translate-y-0"
                    >
                        Continue <IconArrowRight size={18} />
                    </button>
                )}
            </div>
        )
    }

    return null;
}
