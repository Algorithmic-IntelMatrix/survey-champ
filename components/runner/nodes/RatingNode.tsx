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
        <div className="flex flex-col gap-6 items-start bg-white p-10 rounded-[3rem] border shadow-md">
            <div className="flex gap-4">
                {Array.from({ length: maxRating }).map((_, i) => (
                    <button
                        key={i}
                        disabled={!isActive}
                        onMouseEnter={() => isActive && setHovered(i + 1)}
                        onMouseLeave={() => isActive && setHovered(0)}
                        onClick={() => handleNext(i + 1)}
                        className={cn(
                            "transition-all duration-300",
                            isActive ? "hover:scale-150 group/star" : "cursor-default"
                        )}
                    >
                        <IconStar
                            size={56}
                            strokeWidth={1.5}
                            className={cn(
                                "transition-all duration-300",
                                (hovered || currentRating) > i
                                    ? "text-yellow-400 fill-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]"
                                    : "text-muted-foreground/20"
                            )}
                        />
                    </button>
                ))}
            </div>
            {isActive && (
                <p className="text-sm text-muted-foreground font-black uppercase tracking-[0.2em] pl-2">
                    Select your rating
                </p>
            )}
        </div>
    )
}
