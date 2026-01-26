"use client"
import { IconAlertCircle, IconArrowRight } from "@tabler/icons-react"
import { NodeProps } from "./types"

export const ZipCodeNode = ({ msg, currentNodeId, workflow }: NodeProps) => {
    const isActive = msg.nodeId === currentNodeId;
    const nodeData = workflow[msg.nodeId!]?.data || {};

    if (msg.type !== 'zipCodeInput' || !isActive) return null;

    return (
        <div className="mt-4 flex flex-col gap-2 animate-in slide-in-from-top-2">
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest pl-1">
                Enter a valid Zip Code from: {nodeData.allowedZips || "Anywhere"}
            </p>
            <div className="flex items-center gap-2 bg-white/50 px-4 py-2 rounded-xl border border-dashed text-xs text-muted-foreground font-medium">
                <IconAlertCircle size={14} /> Use the input bar below to provide your zip code.
            </div>
        </div>
    )
}

export const StartNode = ({ msg, currentNodeId, handleNext }: NodeProps) => {
    const isActive = msg.nodeId === currentNodeId;

    if (msg.type !== 'start' || !isActive) return null;

    return (
        <button
            onClick={() => handleNext('started')}
            className="group relative px-16 py-8 bg-primary text-primary-foreground rounded-[2.5rem] text-2xl font-black shadow-[0_20px_50px_rgba(var(--primary),0.3)] transition-all hover:scale-[1.05] active:scale-95 overflow-hidden"
        >
            <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
            <span className="relative flex items-center gap-4">
                Let's Get Started <IconArrowRight size={28} strokeWidth={3} />
            </span>
        </button>
    )
}
