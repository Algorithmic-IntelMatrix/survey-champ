"use client"
import { IconAlertCircle, IconArrowRight } from "@tabler/icons-react"
import { NodeProps } from "./types"

export const ZipCodeNode = ({ msg, currentNodeId, workflow }: NodeProps) => {
    const isActive = msg.nodeId === currentNodeId;
    const nodeData = workflow[msg.nodeId!]?.data || {};

    if (msg.type !== 'zipCodeInput' || !isActive) return null;

    return (
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground animate-in fade-in">
            <IconAlertCircle size={16} />
            <span className="font-medium">Please enter a valid Zip Code ({nodeData.allowedZips || "Any"}).</span>
        </div>
    )
}

export const StartNode = ({ msg, currentNodeId, handleNext }: NodeProps) => {
    const isActive = msg.nodeId === currentNodeId;

    if (msg.type !== 'start' || !isActive) return null;

    return (
        <button
            onClick={() => handleNext('started')}
            className="group mt-6 px-8 py-3 bg-primary text-primary-foreground rounded-full text-base font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-3"
        >
            <span>Start Survey</span>
            <IconArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
        </button>
    )
}
