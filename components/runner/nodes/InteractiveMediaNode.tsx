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
    const mediaUrl = nodeData.url;
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
                    <img
                        src={mediaUrl}
                        alt={nodeData.alt || "Survey Image"}
                        className="w-full h-auto max-h-[500px] object-contain mx-auto"
                    />
                )}

                {mediaType === 'video' && (
                    <video
                        src={mediaUrl}
                        controls
                        autoPlay={nodeData.autoplay}
                        className="w-full h-auto max-h-[500px] mx-auto"
                    />
                )}

                {mediaType === 'audio' && (
                    <div className="p-8 flex flex-col items-center justify-center gap-4 bg-muted/30">
                        <IconVolume size={48} className="text-muted-foreground" />
                        <audio controls src={mediaUrl} autoPlay={nodeData.autoplay} className="w-full max-w-md" />
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
                    {interactionType === 'slider' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-xs text-muted-foreground uppercase font-bold tracking-wider">
                                <span>Min</span>
                                <span className="text-xl text-primary">{sliderValue}</span>
                                <span>Max</span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={10} // Parse sliderConfig usually 
                                step={1}
                                value={sliderValue}
                                onChange={(e) => setSliderValue(Number(e.target.value))}
                                className="w-fullaccent-primary cursor-pointer"
                            />
                            <button
                                onClick={() => submit(sliderValue)}
                                className="w-full mt-4 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:opacity-90 transition-all"
                            >
                                Submit Rating
                            </button>
                        </div>
                    )}

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
