"use client"
import { surveyWorkflowApi } from "@/api/surveyWorkflow"
import { useEffect, useState, useMemo, useRef } from "react"
import { DAGReader } from "../properties/DagReader"
import { IconArrowRight, IconRefresh, IconCheck, IconAlertCircle, IconTimeline, IconUser, IconRobot, IconSend, IconStar } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface Message {
    id: string;
    role: 'assistant' | 'user';
    type: string;
    content: string;
    nodeId?: string;
    options?: { label: string, value: string }[];
}

export const SurveyRunner = ({ id }: { id: string }) => {
    const [workflow, setWorkflow] = useState<any>(null);
    const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
    const [responses, setResponses] = useState<Record<string, any>>({});
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isTyping, setIsTyping] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const reader = useMemo(() => workflow ? new DAGReader(workflow) : null, [workflow]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    useEffect(() => {
        if (!id) return;

        (async () => {
            try {
                const response = await surveyWorkflowApi.getLatestWorkflowBySurveyId(id);
                const runtimeJson = response.runtimeJson;
                setWorkflow(runtimeJson);

                if (runtimeJson) {
                    const r = new DAGReader(runtimeJson);
                    const startNode = r.getStartNode();
                    if (startNode) {
                        setCurrentNodeId(startNode.id);
                        addMessage('assistant', 'start', startNode.data?.label || "Welcome to the survey!", startNode.id);
                    }
                }
            } catch (err) {
                console.error(err);
                setError("Failed to load workflow");
            }
        })()
    }, [id])

    const addMessage = (role: 'assistant' | 'user', type: string, content: string, nodeId?: string, options?: any[]) => {
        setMessages(prev => [...prev, {
            id: Math.random().toString(36).substr(2, 9),
            role,
            type,
            content,
            nodeId,
            options
        }]);
    };

    const handleNext = async (userValue?: any) => {
        if (!reader || !currentNodeId) return;

        const currentNode = reader.getNode(currentNodeId);
        if (!currentNode) return;

        // 1. Add User Message if applicable
        if (currentNode.type !== 'start' && userValue !== undefined) {
            addMessage('user', 'text', String(userValue), currentNodeId);
        }

        // 2. Calculate Next Node
        try {
            setIsTyping(true);
            setError(null);

            // Artificial delay for "thinking" feel
            await new Promise(r => setTimeout(r, 800));

            let nextNode = reader.getNextNode(currentNodeId, { ...responses, [currentNodeId]: userValue });

            // Auto-traverse branch nodes
            while (nextNode && nextNode.type === 'branch') {
                nextNode = reader.getNextNode(nextNode.id, { ...responses, [currentNodeId]: userValue });
            }

            if (nextNode) {
                setCurrentNodeId(nextNode.id);
                if (userValue !== undefined) {
                    setResponses(prev => ({ ...prev, [currentNodeId]: userValue }));
                }

                // Add Assistant Message for next node
                if (nextNode.type === 'end') {
                    addMessage('assistant', 'end', nextNode.data?.message || "Thank you for completing the survey!", nextNode.id);
                } else {
                    addMessage(
                        'assistant',
                        nextNode.type,
                        nextNode.data?.label || "Next question...",
                        nextNode.id,
                        nextNode.data?.options
                    );
                }
            } else if (currentNode.type !== 'end') {
                setError("Flow stopped unexpectedly. Check your branching logic.");
            }
        } catch (err: any) {
            setError(err.message || "An error occurred during traversal");
        } finally {
            setIsTyping(false);
            setInputValue("");
        }
    };

    const handleReset = () => {
        if (reader) {
            const startNode = reader.getStartNode();
            setCurrentNodeId(startNode?.id || null);
            setResponses({});
            setMessages([]);
            setError(null);
            if (startNode) {
                addMessage('assistant', 'start', startNode.data?.label || "Welcome to the survey!", startNode.id);
            }
        }
    };

    if (error && !workflow) return <div className="p-10 text-destructive font-medium flex items-center gap-2"><IconAlertCircle size={20} />{error}</div>
    if (!workflow) return <div className="h-screen w-screen flex flex-col items-center justify-center gap-4 bg-[#f9fafb] text-muted-foreground">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="font-bold text-lg tracking-tight">Preparing Survey Experience...</p>
    </div>

    const currentNode = currentNodeId ? reader?.getNode(currentNodeId) : null;
    const isEnd = currentNode?.type === 'end';

    return (
        <div className="flex flex-col h-screen w-screen bg-[#f9fafb] overflow-hidden relative font-sans selection:bg-primary/20">

            {/* Navigation Header */}
            <header className="flex items-center justify-between px-10 py-6 bg-white/70 backdrop-blur-xl border-b sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary shadow-lg shadow-primary/20 flex items-center justify-center text-primary-foreground transform rotate-3">
                        <IconRobot size={28} />
                    </div>
                    <div>
                        <h1 className="text-lg font-black tracking-tight text-foreground/90">Survey Champ</h1>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-bold uppercase tracking-wider">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" /> Real-time Assistant
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleReset}
                        className="px-5 py-2.5 bg-card hover:bg-muted border rounded-2xl flex items-center gap-2 text-sm font-bold transition-all shadow-sm active:scale-95"
                    >
                        <IconRefresh size={18} /> Reset
                    </button>
                </div>
            </header>

            {/* Main Conversation Flow */}
            <main
                ref={scrollRef}
                className="flex-1 overflow-y-auto w-full px-12 py-12 space-y-12 scroll-smooth"
            >
                <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 30, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className={cn(
                                "flex gap-8 w-full group",
                                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                            )}
                        >
                            <div className={cn(
                                "w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-md transform transition-all group-hover:scale-110",
                                msg.role === 'user'
                                    ? "bg-primary text-primary-foreground -rotate-3"
                                    : "bg-white border text-muted-foreground rotate-3"
                            )}>
                                {msg.role === 'user' ? <IconUser size={28} /> : <IconRobot size={28} />}
                            </div>

                            <div className={cn(
                                "flex flex-col gap-4 w-full",
                                msg.role === 'user' ? "items-end" : "items-start"
                            )}>
                                <div className={cn(
                                    "px-10 py-6 rounded-[2.5rem] text-xl font-medium shadow-sm transition-all max-w-[90%]",
                                    msg.role === 'user'
                                        ? "bg-primary text-primary-foreground rounded-tr-none"
                                        : "bg-white border rounded-tl-none text-foreground/90 leading-relaxed shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]"
                                )}>
                                    {msg.content}
                                </div>

                                {/* Specialized UI for current question */}
                                {msg.role === 'assistant' && !isEnd && (
                                    <div className="w-full pt-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                        {msg.type === 'singleChoice' && msg.options && (
                                            <div className="flex flex-wrap gap-6">
                                                {msg.options.map((opt, i) => (
                                                    <button
                                                        key={i}
                                                        disabled={msg.nodeId !== currentNodeId}
                                                        onClick={() => handleNext(opt.value)}
                                                        className={cn(
                                                            "px-14 py-7 rounded-[2rem] border-2 transition-all text-xl font-bold shadow-lg",
                                                            msg.nodeId === currentNodeId
                                                                ? "bg-white hover:bg-primary/5 hover:border-primary hover:text-primary active:scale-95"
                                                                : "bg-muted/40 text-muted-foreground border-transparent opacity-60"
                                                        )}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {msg.type === 'multipleChoice' && msg.options && (
                                            <div className="space-y-8 w-full">
                                                <div className="flex flex-wrap gap-6">
                                                    {msg.options.map((opt, i) => {
                                                        const currentValues = Array.isArray(responses[msg.nodeId!]) ? responses[msg.nodeId!] : [];
                                                        const isSelected = currentValues.includes(opt.value);
                                                        const isActive = msg.nodeId === currentNodeId;
                                                        return (
                                                            <button
                                                                key={i}
                                                                disabled={!isActive}
                                                                onClick={() => {
                                                                    const newValues = isSelected
                                                                        ? currentValues.filter((v: string) => v !== opt.value)
                                                                        : [...currentValues, opt.value];
                                                                    setResponses(prev => ({ ...prev, [msg.nodeId!]: newValues }));
                                                                }}
                                                                className={cn(
                                                                    "px-14 py-7 rounded-[2rem] border-2 transition-all text-xl font-bold shadow-lg flex items-center gap-4",
                                                                    isSelected
                                                                        ? "bg-primary text-primary-foreground border-primary scale-[1.02]"
                                                                        : "bg-white border-border hover:border-primary",
                                                                    !isActive && !isSelected && "bg-muted/40 text-muted-foreground border-transparent opacity-60"
                                                                )}
                                                            >
                                                                <div className={cn(
                                                                    "w-6 h-6 border-2 rounded-md flex items-center justify-center transition-all",
                                                                    isSelected ? "bg-white border-white text-primary" : "bg-muted border-muted-foreground/20"
                                                                )}>
                                                                    {isSelected && <IconCheck size={18} strokeWidth={4} />}
                                                                </div>
                                                                {opt.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {msg.nodeId === currentNodeId && (
                                                    <button
                                                        disabled={!responses[currentNodeId!] || responses[currentNodeId!].length === 0}
                                                        onClick={() => handleNext(responses[currentNodeId!])}
                                                        className="flex items-center gap-4 bg-primary text-primary-foreground px-16 py-7 rounded-[2.5rem] text-xl font-black shadow-2xl shadow-primary/30 hover:scale-[1.05] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                                                    >
                                                        Continue Journey <IconArrowRight size={24} />
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {msg.type === 'rating' && (
                                            <div className="flex flex-col gap-6 items-start bg-white p-10 rounded-[3rem] border shadow-md">
                                                <div className="flex gap-4">
                                                    {Array.from({ length: workflow[msg.nodeId!]?.data?.maxRating || 5 }).map((_, i) => (
                                                        <button
                                                            key={i}
                                                            disabled={msg.nodeId !== currentNodeId}
                                                            onMouseEnter={() => msg.nodeId === currentNodeId && setInputValue(String(i + 1))}
                                                            onMouseLeave={() => msg.nodeId === currentNodeId && setInputValue("")}
                                                            onClick={() => handleNext(i + 1)}
                                                            className={cn(
                                                                "transition-all duration-300",
                                                                msg.nodeId === currentNodeId ? "hover:scale-150 group/star" : "cursor-default"
                                                            )}
                                                        >
                                                            <IconStar
                                                                size={56}
                                                                strokeWidth={1.5}
                                                                className={cn(
                                                                    "transition-all duration-300",
                                                                    (responses[msg.nodeId!] || (msg.nodeId === currentNodeId ? Number(inputValue) : 0)) > i
                                                                        ? "text-yellow-400 fill-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]"
                                                                        : "text-muted-foreground/20"
                                                                )}
                                                            />
                                                        </button>
                                                    ))}
                                                </div>
                                                {msg.nodeId === currentNodeId && (
                                                    <p className="text-sm text-muted-foreground font-black uppercase tracking-[0.2em] pl-2">
                                                        Select your rating
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {msg.type === 'slider' && (
                                            <div className="w-full max-w-2xl bg-white p-10 rounded-[3rem] border shadow-md space-y-8">
                                                <div className="relative h-16 flex items-center">
                                                    <input
                                                        type="range"
                                                        disabled={msg.nodeId !== currentNodeId}
                                                        min={workflow[msg.nodeId!]?.data?.min || 0}
                                                        max={workflow[msg.nodeId!]?.data?.max || 100}
                                                        step={workflow[msg.nodeId!]?.data?.step || 1}
                                                        className={cn(
                                                            "w-full h-4 bg-muted rounded-full appearance-none accent-primary cursor-pointer transition-all",
                                                            msg.nodeId !== currentNodeId && "cursor-default opacity-40"
                                                        )}
                                                        value={responses[msg.nodeId!] || (workflow[msg.nodeId!]?.data?.min || 0)}
                                                        onChange={(e) => setResponses(prev => ({ ...prev, [msg.nodeId!]: Number(e.target.value) }))}
                                                    />
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Current Value</span>
                                                        <span className="font-black text-primary text-5xl tabular-nums">
                                                            {responses[msg.nodeId!] || (workflow[msg.nodeId!]?.data?.min || 0)}
                                                        </span>
                                                    </div>
                                                    {msg.nodeId === currentNodeId && (
                                                        <button
                                                            onClick={() => handleNext(responses[currentNodeId!] || (workflow[msg.nodeId!]?.data?.min || 0))}
                                                            className="w-20 h-20 bg-primary text-primary-foreground rounded-[2rem] flex items-center justify-center shadow-2xl shadow-primary/30 hover:scale-[1.05] active:scale-95 transition-all"
                                                        >
                                                            <IconCheck size={36} strokeWidth={3} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {msg.type === 'start' && msg.nodeId === currentNodeId && (
                                            <button
                                                onClick={() => handleNext('started')}
                                                className="group relative px-16 py-8 bg-primary text-primary-foreground rounded-[2.5rem] text-2xl font-black shadow-[0_20px_50px_rgba(var(--primary),0.3)] transition-all hover:scale-[1.05] active:scale-95 overflow-hidden"
                                            >
                                                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[0%] transition-transform duration-500" />
                                                <span className="relative flex items-center gap-4">
                                                    Let's Get Started <IconArrowRight size={28} strokeWidth={3} />
                                                </span>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}

                    {isTyping && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex gap-8 mr-auto items-center"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-white border flex items-center justify-center text-muted-foreground rotate-3 shadow-md">
                                <IconRobot size={28} />
                            </div>
                            <div className="bg-white/50 backdrop-blur-md px-8 py-5 rounded-[2.5rem] rounded-tl-none flex gap-3 items-center shadow-sm">
                                <span className="w-3 h-3 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <span className="w-3 h-3 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <span className="w-3 h-3 bg-primary/40 rounded-full animate-bounce" />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Vertical padding to ensure content isn't hidden by floating input */}
                <div className="h-60" />
            </main>

            {/* Floating Action Input */}
            <AnimatePresence>
                {!isEnd && currentNode && currentNode.type !== 'start' && currentNode.type !== 'singleChoice' && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-12 left-1/2 -translate-x-1/2 w-[90%] max-w-6xl px-6 z-50"
                    >
                        <div className="relative group filter drop-shadow-[0_30px_60px_rgba(0,0,0,0.15)]">
                            <input
                                autoFocus
                                type="text"
                                placeholder="Type your answer here..."
                                className="w-full bg-white/80 backdrop-blur-3xl border-2 border-white/50 rounded-[3rem] pl-10 pr-24 py-8 text-2xl font-medium focus:ring-8 focus:ring-primary/5 focus:border-primary outline-none transition-all shadow-2xl placeholder:text-muted-foreground/40"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && inputValue.trim() && handleNext(inputValue)}
                            />
                            <button
                                disabled={!inputValue.trim()}
                                onClick={() => handleNext(inputValue)}
                                className="absolute right-4 top-4 w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all group-hover:shadow-primary/40"
                            >
                                <IconSend size={32} strokeWidth={3} />
                            </button>
                        </div>
                        <p className="text-center mt-6 text-xs font-black uppercase tracking-[0.4em] text-muted-foreground/40">
                            Press Enter to Send
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Out-of-flow notifications */}
            {isEnd && (
                <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.8, type: 'spring' }}
                        className="bg-white/80 backdrop-blur-3xl p-12 rounded-[3.5rem] shadow-2xl shadow-green-500/20 text-center border-4 border-green-500/20"
                    >
                        <div className="w-24 h-24 bg-green-500 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/30">
                            <IconCheck size={48} strokeWidth={3} />
                        </div>
                        <h2 className="text-4xl font-black tracking-tighter mb-2">Survey Completed!</h2>
                        <p className="text-lg text-muted-foreground font-medium mb-8">Thank you for your valuable feedback.</p>
                        <button
                            className="bg-foreground text-background px-10 py-5 rounded-[2rem] text-base font-black pointer-events-auto hover:scale-105 active:scale-95 transition-all"
                            onClick={() => window.location.href = '/dashboard'}
                        >
                            Return to Dashboard
                        </button>
                    </motion.div>
                </div>
            )}

            {error && (
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="fixed bottom-32 left-1/2 -translate-x-1/2 px-8 py-4 bg-destructive text-destructive-foreground text-sm font-black rounded-2xl flex items-center gap-3 shadow-2xl z-[60]"
                >
                    <IconAlertCircle size={20} strokeWidth={3} />
                    {error}
                </motion.div>
            )}
        </div>
    )
}