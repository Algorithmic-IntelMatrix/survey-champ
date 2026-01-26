"use client"
import { cn } from "@/lib/utils"
import { IconArrowRight, IconChevronRight } from "@tabler/icons-react"
import { NodeProps } from "./types"

export const CascadingNode = ({ msg, currentNodeId, responses, setResponses, handleNext, workflow }: NodeProps) => {
    const isActive = msg.nodeId === currentNodeId;
    const nodeData = workflow[msg.nodeId!]?.data || {};

    if (msg.type !== 'cascadingChoice') return null;

    const steps = nodeData.steps || [];
    const currentResponses = responses[msg.nodeId!] || [];
    const isComplete = currentResponses.length === steps.length && currentResponses.every((r: any) => !!r);

    return (
        <div className="w-full mt-4 space-y-8 animate-in fade-in duration-500">
            {steps.map((step: any, si: number) => {
                const showStep = si === 0 || !!currentResponses[si - 1];
                if (!showStep) return null;

                return (
                    <div key={si} className="space-y-3 animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                            <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] text-foreground">
                                {si + 1}
                            </span>
                            {step.title}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {step.options?.map((opt: any, oi: number) => {
                                const isSelected = currentResponses[si] === opt.value;
                                return (
                                    <button
                                        key={oi}
                                        disabled={!isActive}
                                        onClick={() => {
                                            const newResponses = [...currentResponses];
                                            newResponses[si] = opt.value;
                                            for (let i = si + 1; i < newResponses.length; i++) newResponses[i] = undefined;
                                            setResponses(prev => ({ ...prev, [msg.nodeId!]: newResponses }));
                                        }}
                                        className={cn(
                                            "px-4 py-2 bg-card border rounded-lg transition-all text-sm font-medium hover:border-muted-foreground hover:bg-muted",
                                            isSelected
                                                ? "border-primary bg-primary text-primary-foreground shadow-md hover:bg-primary hover:border-primary"
                                                : "border-border text-foreground",
                                            !isActive && !isSelected && "opacity-40"
                                        )}
                                    >
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
            {isActive && isComplete && (
                <div className="pt-4">
                    <button
                        onClick={() => handleNext(currentResponses)}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-sm font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all"
                    >
                        Confirm <IconArrowRight size={18} />
                    </button>
                </div>
            )}
        </div>
    )
}
