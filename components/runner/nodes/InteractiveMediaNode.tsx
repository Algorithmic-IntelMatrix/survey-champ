"use client"
import { useState, useRef } from "react"
import { cn } from "@/lib/utils"
import { IconPhoto, IconPlayerPlay, IconVolume, IconArrowRight, IconSend } from "@tabler/icons-react"
import { motion, AnimatePresence } from "framer-motion"
import { NodeProps } from "./types"

export const InteractiveMediaNode = ({ msg, currentNodeId, responses, setResponses, handleNext, workflow }: NodeProps) => {
    const isActive = msg.nodeId === currentNodeId;
    const nodeData = workflow[msg.nodeId!]?.data || {};

    // Properties from definition
    const mediaUrls = nodeData.urls || (nodeData.url ? [nodeData.url] : []);
    const mediaType = msg.type; // image, video, audio
    const interactionType = nodeData.interactionType || 'none'; // text, slider, choice, none
    const questionLabel = nodeData.questionLabel || "What do you think?";

    // Interaction Configs
    const sliderConfig = nodeData.sliderConfig || "0-10";
    const choices = nodeData.choices || [];

    // State
    const [answer, setAnswer] = useState<any>(null);
    const [sliderValue, setSliderValue] = useState<number>(0);
    const [textValue, setTextValue] = useState("");

    if (!['image', 'video', 'audio'].includes(mediaType)) return null;

    // Helper to submit
    const submit = (val: any) => {
        if (!isActive) return;
        handleNext(val);
    };

    return (
        <div className="w-full max-w-2xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Media Display */}
            <div className="rounded-xl overflow-hidden border border-border bg-black/5 shadow-inner">
                {mediaType === 'image' && (
                    <div className={cn(
                        "grid gap-2 p-2",
                        mediaUrls.length > 1 ? "grid-cols-2" : "grid-cols-1"
                    )}>
                        {mediaUrls.map((img: string, i: number) => (
                            <img
                                key={i}
                                src={img}
                                alt={nodeData.alt || `Survey Image ${i + 1}`}
                                className={cn(
                                    "w-full h-auto max-h-[500px] object-cover rounded-lg shadow-sm border border-border/50 transition-transform hover:scale-[1.02]",
                                    mediaUrls.length === 1 && "max-h-[600px] object-contain"
                                )}
                            />
                        ))}
                    </div>
                )}

                {mediaType === 'video' && (
                    <video
                        src={nodeData.url}
                        controls
                        autoPlay={nodeData.autoplay}
                        className="w-full h-auto max-h-[500px] mx-auto"
                    />
                )}

                {mediaType === 'audio' && (
                    <div className="p-8 flex flex-col items-center justify-center gap-4 bg-muted/30">
                        <IconVolume size={48} className="text-muted-foreground" />
                        <audio controls src={nodeData.url} autoPlay={nodeData.autoplay} className="w-full max-w-md" />
                    </div>
                )}
            </div>

            {/* Interaction Section */}
            {isActive && (
                <div className="bg-card border border-border p-6 rounded-xl shadow-sm space-y-6">
                    {interactionType !== 'none' && (
                        <h3 className="text-lg font-medium text-foreground">{questionLabel}</h3>
                    )}

                    {/* TEXT INPUT */}
                    {interactionType === 'text' && (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                placeholder="Type your answer..."
                                className="flex-1 bg-transparent border-b border-border py-3 px-2 text-lg outline-none focus:border-primary transition-colors"
                                value={textValue}
                                onChange={(e) => setTextValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && textValue.trim() && submit(textValue)}
                            />
                            <button
                                onClick={() => submit(textValue)}
                                disabled={!textValue.trim()}
                                className="p-3 bg-primary text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-50 transition-all"
                            >
                                <IconSend size={20} />
                            </button>
                        </div>
                    )}

                    {/* SLIDER */}
                    {interactionType === 'slider' && (() => {
                        const config = (nodeData.sliderConfig || "0-10").split('-').map(Number);
                        const min = isNaN(config[0]) ? 0 : config[0];
                        const max = isNaN(config[1]) ? 10 : config[1];

                        // We use a local state for the slider, initialized to min if not set
                        const currentVal = sliderValue === 0 && min !== 0 ? min : sliderValue;

                        return (
                            <div className="space-y-6 py-2">
                                <div className="flex items-center justify-between px-1">
                                    <div className="flex flex-col items-start translate-y-2">
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Min</span>
                                        <span className="text-sm font-semibold">{min}</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-4xl font-bold text-primary tabular-nums tracking-tighter">{currentVal}</span>
                                    </div>
                                    <div className="flex flex-col items-end translate-y-2">
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Max</span>
                                        <span className="text-sm font-semibold">{max}</span>
                                    </div>
                                </div>
                                <div className="relative h-12 flex items-center">
                                    <input
                                        type="range"
                                        min={min}
                                        max={max}
                                        step={1}
                                        value={currentVal}
                                        onChange={(e) => setSliderValue(Number(e.target.value))}
                                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
                                    />
                                </div>
                                <button
                                    onClick={() => submit(currentVal)}
                                    className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-4 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
                                >
                                    Submit Rating
                                </button>
                            </div>
                        );
                    })()}

                    {/* CHOICE */}
                    {interactionType === 'choice' && (
                        <div className="flex flex-wrap gap-3">
                            {choices.map((opt: any, i: number) => (
                                <button
                                    key={i}
                                    onClick={() => submit(opt.value)}
                                    className="px-5 py-3 bg-muted border border-transparent hover:border-primary/50 hover:bg-background hover:shadow-md rounded-xl transition-all font-medium"
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* NONE / PASSIVE */}
                    {interactionType === 'none' && (
                        <button
                            onClick={() => submit(true)}
                            className="w-full flex items-center justify-center gap-2 bg-foreground text-background py-3 rounded-lg font-medium hover:opacity-90 transition-all"
                        >
                            Continue <IconArrowRight size={18} />
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
