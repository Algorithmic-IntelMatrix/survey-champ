"use client"
import { cn } from "@/lib/utils"
import { IconArrowRight } from "@tabler/icons-react"
import { NodeProps } from "./types"

export const CascadingNode = ({ msg, currentNodeId, responses, setResponses, handleNext, workflow }: NodeProps) => {
    const isActive = msg.nodeId === currentNodeId;
    const nodeData = workflow[msg.nodeId!]?.data || {};

    if (msg.type !== 'cascadingChoice') return null;

    const steps = nodeData.steps || [];
    const currentResponses = responses[msg.nodeId!] || [];
    const isComplete = currentResponses.length === steps.length && currentResponses.every((r: any) => !!r);

    return (
        <div className="w-full mt-6 bg-white p-8 rounded-[3rem] border shadow-md space-y-8 animate-in zoom-in-95 duration-500">
            {steps.map((step: any, si: number) => {
                const showStep = si === 0 || !!currentResponses[si - 1];
                if (!showStep) return null;

                return (
                    <div key={si} className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-500">
                        <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black">
                                {si + 1}
                            </span>
                            <h4 className="text-xl font-black tracking-tight">{step.title}</h4>
                        </div>
                        <div className="flex flex-wrap gap-3">
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
                                            "px-8 py-4 rounded-2xl border-2 transition-all text-base font-bold shadow-sm",
                                            isSelected ? "bg-primary text-primary-foreground border-primary scale-105" : "bg-white border-muted-foreground/10 hover:border-primary/30",
                                            !isActive && !isSelected && "opacity-30"
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
                <div className="pt-4 border-t">
                    <button
                        onClick={() => handleNext(currentResponses)}
                        className="w-full py-6 bg-primary text-primary-foreground rounded-[2rem] text-xl font-black shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        Finalize Selections <IconArrowRight className="inline ml-2" />
                    </button>
                </div>
            )}
        </div>
    )
}
