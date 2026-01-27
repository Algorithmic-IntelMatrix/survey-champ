"use client"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { IconCheck, IconArrowRight, IconAlertCircle } from "@tabler/icons-react"
import { NodeProps } from "./types"

export const ChoiceNode = ({ msg, currentNodeId, responses, setResponses, handleNext, workflow }: NodeProps) => {
    const isActive = msg.nodeId === currentNodeId;

    const nodeData = workflow[msg.nodeId!]?.data || {};

    const [showSpecify, setShowSpecify] = useState(false);
    const [specifyValue, setSpecifyValue] = useState("");

    if (msg.type === 'singleChoice') {
        const options = msg.options || [];
        const allowOther = nodeData.allowOther;
        const otherLabel = nodeData.otherLabel || "Other";

        if (options.length === 0 && !allowOther && isActive) {
            return (
                <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm font-medium flex items-center gap-2">
                    <IconAlertCircle size={18} /> No options available.
                </div>
            )
        }

        if (showSpecify && isActive) {
            return (
                <div className="w-full max-w-md space-y-3 animate-in fade-in slide-in-from-bottom-2">
                    <div className="text-sm font-medium text-muted-foreground">{otherLabel}</div>
                    <input
                        autoFocus
                        type="text"
                        placeholder="Please specify..."
                        value={specifyValue}
                        onChange={(e) => setSpecifyValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && specifyValue.trim()) {
                                handleNext('other');
                            }
                        }}
                        className="w-full bg-transparent border-b-2 border-primary/30 py-3 text-xl font-medium focus:border-primary outline-none transition-all placeholder:text-muted-foreground/30"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleNext('other')}
                            disabled={!specifyValue.trim()}
                            className="bg-primary text-primary-foreground px-6 py-2 rounded-full text-sm font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-30"
                        >
                            Confirm
                        </button>
                        <button
                            onClick={() => setShowSpecify(false)}
                            className="text-muted-foreground hover:text-foreground text-sm font-medium px-4 py-2"
                        >
                            Go Back
                        </button>
                    </div>
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
                            "px-5 py-3 bg-card border border-border shadow-sm rounded-xl transition-all text-base font-medium hover:shadow-md hover:border-primary/50 active:scale-95 text-left",
                            !isActive && "opacity-60 cursor-default shadow-none bg-muted"
                        )}
                    >
                        {opt.label}
                    </button>
                ))}
                {allowOther && (
                    <button
                        disabled={!isActive}
                        onClick={() => {
                            setShowSpecify(true);
                        }}
                        className={cn(
                            "px-5 py-3 bg-card border border-border border-dashed shadow-sm rounded-xl transition-all text-base font-medium hover:shadow-md hover:border-primary/50 active:scale-95 text-left text-muted-foreground",
                            !isActive && "opacity-60 cursor-default shadow-none bg-muted"
                        )}
                    >
                        {otherLabel}
                    </button>
                )}
            </div>
        )
    }

    if (msg.type === 'multipleChoice') {
        const options = msg.options || [];
        const maxChoices = nodeData.maxChoices || 0;
        const allowOther = nodeData.allowOther;
        const otherLabel = nodeData.otherLabel || "Other";
        const currentValues = Array.isArray(responses[msg.nodeId!]) ? responses[msg.nodeId!] : [];

        const isLimitReached = maxChoices > 0 && currentValues.length >= maxChoices;
        const isOtherSelected = currentValues.includes('other');

        return (
            <div className="space-y-6 w-full">
                {maxChoices > 0 && (
                    <div className="text-sm text-muted-foreground font-medium">
                        Select up to {maxChoices} {maxChoices === 1 ? 'option' : 'options'}
                    </div>
                )}
                <div className="flex flex-wrap gap-3">
                    {options.map((opt: any, i: number) => {
                        const isSelected = currentValues.includes(opt.value);

                        return (
                            <button
                                key={i}
                                disabled={!isActive || (isLimitReached && !isSelected)}
                                onClick={() => {
                                    const newValues = isSelected
                                        ? currentValues.filter((v: string) => v !== opt.value)
                                        : [...currentValues, opt.value];
                                    setResponses(prev => ({ ...prev, [msg.nodeId!]: newValues }));
                                }}
                                className={cn(
                                    "px-5 py-3 bg-card border shadow-sm rounded-xl transition-all text-base font-medium flex items-center gap-3 text-left hover:shadow-md",
                                    isSelected
                                        ? "ring-2 ring-primary border-transparent shadow-md z-10"
                                        : "border-border hover:border-gray-300 text-foreground/80",
                                    (!isActive || (isLimitReached && !isSelected)) && "opacity-50 grayscale shadow-none cursor-not-allowed"
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

                    {allowOther && (
                        <button
                            disabled={!isActive || (isLimitReached && !isOtherSelected)}
                            onClick={() => {
                                const newValues = isOtherSelected
                                    ? currentValues.filter((v: string) => v !== 'other')
                                    : [...currentValues, 'other'];
                                setResponses(prev => ({ ...prev, [msg.nodeId!]: newValues }));
                            }}
                            className={cn(
                                "px-5 py-3 bg-card border border-dashed shadow-sm rounded-xl transition-all text-base font-medium flex items-center gap-3 text-left hover:shadow-md text-muted-foreground",
                                isOtherSelected
                                    ? "ring-2 ring-primary border-transparent shadow-md z-10"
                                    : "border-border hover:border-gray-300",
                                (!isActive || (isLimitReached && !isOtherSelected)) && "opacity-50 grayscale shadow-none cursor-not-allowed"
                            )}
                        >
                            <div className={cn(
                                "w-5 h-5 border rounded flex items-center justify-center transition-colors shrink-0",
                                isOtherSelected ? "bg-primary border-primary text-primary-foreground" : "bg-card border-muted-foreground/30"
                            )}>
                                {isOtherSelected && <IconCheck size={14} strokeWidth={3} />}
                            </div>
                            {otherLabel}
                        </button>
                    )}
                </div>

                {isOtherSelected && isActive && (
                    <div className="max-w-md space-y-2 animate-in fade-in slide-in-from-left-2 transition-all">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Please specify:</div>
                        <input
                            autoFocus
                            type="text"
                            placeholder="Type your answer here..."
                            value={specifyValue}
                            onChange={(e) => setSpecifyValue(e.target.value)}
                            className="w-full bg-transparent border-b border-primary/30 py-2 text-lg font-medium focus:border-primary outline-none transition-all placeholder:text-muted-foreground/20"
                        />
                    </div>
                )}

                {isActive && (
                    <button
                        disabled={currentValues.length === 0 || (isOtherSelected && !specifyValue.trim())}
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
