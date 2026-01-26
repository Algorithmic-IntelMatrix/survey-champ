"use client"
import { cn } from "@/lib/utils"
import { IconCheck } from "@tabler/icons-react"
import { NodeProps } from "./types"

export const SliderNode = ({ msg, currentNodeId, responses, setResponses, handleNext, workflow }: NodeProps) => {
    const isActive = msg.nodeId === currentNodeId;
    const nodeData = workflow[msg.nodeId!]?.data || {};

    if (msg.type !== 'slider') return null;

    const min = nodeData.min || 0;
    const max = nodeData.max || 100;
    const step = nodeData.step || 1;
    const currentVal = responses[msg.nodeId!] ?? min;

    return (
        <div className="w-full max-w-2xl bg-white p-10 rounded-[3rem] border shadow-md space-y-8">
            <div className="relative h-16 flex items-center">
                <input
                    type="range"
                    disabled={!isActive}
                    min={min}
                    max={max}
                    step={step}
                    className={cn(
                        "w-full h-4 bg-muted rounded-full appearance-none accent-primary cursor-pointer transition-all",
                        !isActive && "cursor-default opacity-40"
                    )}
                    value={currentVal}
                    onChange={(e) => setResponses(prev => ({ ...prev, [msg.nodeId!]: Number(e.target.value) }))}
                />
            </div>
            <div className="flex justify-between items-center">
                <div className="flex flex-col">
                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Current Value</span>
                    <span className="font-black text-primary text-5xl tabular-nums">{currentVal}</span>
                </div>
                {isActive && (
                    <button
                        onClick={() => handleNext(currentVal)}
                        className="w-20 h-20 bg-primary text-primary-foreground rounded-[2rem] flex items-center justify-center shadow-2xl shadow-primary/30 hover:scale-[1.05] active:scale-95 transition-all"
                    >
                        <IconCheck size={36} strokeWidth={3} />
                    </button>
                )}
            </div>
        </div>
    )
}
