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
        <div className="w-full max-w-xl space-y-8 py-4">
            <div className="relative h-12 flex items-center">
                <input
                    type="range"
                    disabled={!isActive}
                    min={min}
                    max={max}
                    step={step}
                    className={cn(
                        "w-full h-2 bg-secondary rounded-full appearance-none cursor-pointer transition-all focus:outline-none focus:ring-4 focus:ring-primary/10",
                        !isActive && "cursor-default opacity-40",
                        "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
                    )}
                    value={currentVal}
                    onChange={(e) => setResponses(prev => ({ ...prev, [msg.nodeId!]: Number(e.target.value) }))}
                />
            </div>
            <div className="flex justify-between items-end border-b pb-4 border-border">
                <div className="flex flex-col">
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Value</span>
                    <span className="text-5xl font-light tracking-tighter tabular-nums text-foreground">{currentVal}</span>
                </div>
                {isActive && (
                    <button
                        onClick={() => handleNext(currentVal)}
                        className="w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 active:scale-95 transition-all"
                    >
                        <IconCheck size={24} strokeWidth={2} />
                    </button>
                )}
            </div>
        </div>
    )
}
