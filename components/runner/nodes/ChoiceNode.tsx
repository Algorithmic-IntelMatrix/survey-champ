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
                <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-2xl text-destructive text-sm font-bold flex items-center gap-2">
                    <IconAlertCircle size={20} /> This question has no options configured. Flow may be blocked.
                </div>
            )
        }
        return (
            <div className="flex flex-wrap gap-6">
                {options.map((opt: any, i: number) => (
                    <button
                        key={i}
                        disabled={!isActive}
                        onClick={() => handleNext(opt.value)}
                        className={cn(
                            "px-14 py-7 rounded-[2rem] border-2 transition-all text-xl font-bold shadow-lg",
                            isActive
                                ? "bg-white hover:bg-primary/5 hover:border-primary hover:text-primary active:scale-95"
                                : "bg-muted/40 text-muted-foreground border-transparent opacity-60"
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
            <div className="space-y-8 w-full">
                <div className="flex flex-wrap gap-6">
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
                                    "px-14 py-7 rounded-[2rem] border-2 transition-all text-xl font-bold shadow-lg flex items-center gap-4",
                                    isSelected
                                        ? "bg-primary text-primary-foreground border-primary scale-[1.02]"
                                        : "bg-white border-border hover:border-primary",
                                    !isActive && !isSelected && "bg-muted/40 text-muted-foreground border-transparent opacity-60"
                                )}
                            >
                                <div className={cn(
                                    "w-6 h-6 border-2 rounded-md flex items-center justify-center transition-all",
                                    isSelected ? "bg-white border-white text-primary" : "bg-muted border-muted-foreground/20"
                                )}>
                                    {isSelected && <IconCheck size={18} strokeWidth={4} />}
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
                        className="flex items-center gap-4 bg-primary text-primary-foreground px-16 py-7 rounded-[2.5rem] text-xl font-black shadow-2xl shadow-primary/30 hover:scale-[1.05] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                    >
                        Continue Journey <IconArrowRight size={24} />
                    </button>
                )}
            </div>
        )
    }

    return null;
}
