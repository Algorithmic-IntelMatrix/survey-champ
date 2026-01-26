"use client"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { IconStar } from "@tabler/icons-react"
import { NodeProps } from "./types"

export const RatingNode = ({ msg, currentNodeId, responses, handleNext, workflow }: NodeProps) => {
    const isActive = msg.nodeId === currentNodeId;
    const nodeData = workflow[msg.nodeId!]?.data || {};
    const maxRating = nodeData.maxRating || 5;

    const [hovered, setHovered] = useState(0);
    const currentRating = responses[msg.nodeId!] || 0;

    if (msg.type !== 'rating') return null;

    return (
        <div className="flex flex-col gap-3 items-start animate-in fade-in duration-500">
            <div className="flex gap-2 group/stars">
                {Array.from({ length: maxRating }).map((_, i) => (
                    <button
                        key={i}
                        disabled={!isActive}
                        onMouseEnter={() => isActive && setHovered(i + 1)}
                        onMouseLeave={() => isActive && setHovered(0)}
                        onClick={() => handleNext(i + 1)}
                        className={cn(
                            "transition-all duration-300 p-1 rounded-full hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/50",
                            isActive ? "cursor-pointer" : "cursor-default opacity-50"
                        )}
                    >
                        <IconStar
                            size={42}
                            strokeWidth={1}
                            className={cn(
                                "transition-all duration-300",
                                (hovered || currentRating) > i
                                    ? "text-primary fill-primary scale-110"
                                    : "text-muted-foreground/30 hover:text-muted-foreground/50"
                            )}
                        />
                    </button>
                ))}
            </div>
            {isActive && (
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest pl-2">
                    Click to rate
                </p>
            )}
        </div>
    )
}
