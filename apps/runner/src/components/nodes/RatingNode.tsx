"use client"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { IconStar } from "@tabler/icons-react"
import { NodeProps } from "./types"

export const RatingNode = ({ msg, currentNodeId, responses, handleNext, workflow }: NodeProps) => {
    const isActive = msg.nodeId === currentNodeId;
    const nodeData = workflow[msg.nodeId!]?.data || {};
    const maxRating = nodeData.maxRating || 5;
    const ratingItems = nodeData.items || (nodeData.label ? [{ label: nodeData.label, value: 'q1' }] : []);

    const [localRatings, setLocalRatings] = useState<Record<string, number>>({});
    const [hovered, setHovered] = useState<Record<string, number>>({});

    if (msg.type !== 'rating') return null;

    const handleRatingClick = (itemValue: string, rating: number) => {
        if (!isActive) return;

        const newRatings = { ...localRatings, [itemValue]: rating };
        setLocalRatings(newRatings);

        // If it's a single item question, auto-advance
        if (ratingItems.length === 1) {
            handleNext(rating);
        }
    };

    const isComplete = ratingItems.every((item: any) => localRatings[item.value]);

    return (
        <div className="flex flex-col gap-6 items-start w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col gap-5 w-full">
                {ratingItems.map((item: any) => (
                    <div key={item.value} className="flex flex-col gap-2">
                        {ratingItems.length > 1 && (
                            <p className="text-sm font-medium text-foreground/80">{item.label}</p>
                        )}
                        <div className="flex gap-1.5 group/stars">
                            {Array.from({ length: maxRating }).map((_, i) => (
                                <button
                                    key={i}
                                    disabled={!isActive}
                                    onMouseEnter={() => isActive && setHovered(prev => ({ ...prev, [item.value]: i + 1 }))}
                                    onMouseLeave={() => isActive && setHovered(prev => ({ ...prev, [item.value]: 0 }))}
                                    onClick={() => handleRatingClick(item.value, i + 1)}
                                    className={cn(
                                        "transition-all duration-200 p-1.5 rounded-full hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/40",
                                        isActive ? "cursor-pointer" : "cursor-default opacity-50"
                                    )}
                                >
                                    <IconStar
                                        size={28}
                                        strokeWidth={1.5}
                                        className={cn(
                                            "transition-all duration-200",
                                            (hovered[item.value] || localRatings[item.value]) > i
                                                ? "text-primary fill-primary scale-110"
                                                : "text-muted-foreground/25 hover:text-muted-foreground/40"
                                        )}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {isActive && ratingItems.length > 1 && (
                <button
                    onClick={() => handleNext(localRatings)}
                    disabled={!isComplete}
                    className={cn(
                        "mt-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 shadow-md flex items-center gap-2",
                        isComplete
                            ? "bg-primary text-primary-foreground hover:shadow-lg hover:-translate-y-0.5"
                            : "bg-muted text-muted-foreground cursor-not-allowed grayscale"
                    )}
                >
                    <span>Continue</span>
                    <IconStar size={16} />
                </button>
            )}

            {isActive && ratingItems.length === 1 && (
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest pl-1 mt-1">
                    Select a rating to continue
                </p>
            )}
        </div>
    )
}
