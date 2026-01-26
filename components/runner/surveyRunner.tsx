"use client"
import { surveyWorkflowApi } from "@/api/surveyWorkflow"
import { useEffect, useState, useMemo, useRef } from "react"
import { DAGReader } from "../properties/DagReader"
import { IconArrowRight, IconRefresh, IconCheck, IconAlertCircle, IconTimeline, IconUser, IconRobot, IconSend, IconStar } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { ChoiceNode } from "./nodes/ChoiceNode"
import { RatingNode } from "./nodes/RatingNode"
import { SliderNode } from "./nodes/SliderNode"
import { MatrixNode } from "./nodes/MatrixNode"
import { CascadingNode } from "./nodes/CascadingNode"
import { StartNode, ZipCodeNode } from "./nodes/UtilityNodes"

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
            let displayValue = String(userValue);

            // Resolve labels for choice-based nodes
            if (currentNode.type === 'singleChoice' || currentNode.type === 'multipleChoice') {
                const options = currentNode.data?.options || [];
                if (Array.isArray(userValue)) {
                    // Multiple Choice
                    const labels = userValue.map(val => options.find((o: any) => o.value === val)?.label || val);
                    displayValue = labels.join(", ");
                } else {
                    // Single Choice
                    const option = options.find((o: any) => o.value === userValue);
                    displayValue = option ? option.label : String(userValue);
                }
            } else if (currentNode.type === 'matrixChoice' && typeof userValue === 'object') {
                // Format: "Row1: ColA, Row2: ColB"
                const rows = currentNode.data?.rows || [];
                const cols = currentNode.data?.columns || [];
                displayValue = rows.map((r: any) => {
                    const colVal = userValue[r.value];
                    const colLabel = cols.find((c: any) => c.value === colVal)?.label || colVal;
                    return `${r.label}: ${colLabel}`;
                }).join(" | ");
            } else if (currentNode.type === 'cascadingChoice' && Array.isArray(userValue)) {
                // Resolve step labels
                const steps = currentNode.data?.steps || [];
                displayValue = userValue.map((val, i) => {
                    const opt = steps[i]?.options?.find((o: any) => o.value === val);
                    return opt ? opt.label : val;
                }).join(" → ");
            } else if (currentNode.type === 'rating') {
                displayValue = `${userValue} Stars`;
            }

            addMessage('user', 'text', displayValue, currentNodeId);
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
                                "w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center shadow-md transform transition-all group-hover:scale-110",
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
                                        <ChoiceNode
                                            msg={msg}
                                            currentNodeId={currentNodeId}
                                            responses={responses}
                                            setResponses={setResponses}
                                            handleNext={handleNext}
                                            workflow={workflow}
                                        />
                                        <RatingNode
                                            msg={msg}
                                            currentNodeId={currentNodeId}
                                            responses={responses}
                                            setResponses={setResponses}
                                            handleNext={handleNext}
                                            workflow={workflow}
                                        />
                                        <SliderNode
                                            msg={msg}
                                            currentNodeId={currentNodeId}
                                            responses={responses}
                                            setResponses={setResponses}
                                            handleNext={handleNext}
                                            workflow={workflow}
                                        />
                                        <MatrixNode
                                            msg={msg}
                                            currentNodeId={currentNodeId}
                                            responses={responses}
                                            setResponses={setResponses}
                                            handleNext={handleNext}
                                            workflow={workflow}
                                        />
                                        <CascadingNode
                                            msg={msg}
                                            currentNodeId={currentNodeId}
                                            responses={responses}
                                            setResponses={setResponses}
                                            handleNext={handleNext}
                                            workflow={workflow}
                                        />
                                        <ZipCodeNode
                                            msg={msg}
                                            currentNodeId={currentNodeId}
                                            responses={responses}
                                            setResponses={setResponses}
                                            handleNext={handleNext}
                                            workflow={workflow}
                                        />
                                        <StartNode
                                            msg={msg}
                                            currentNodeId={currentNodeId}
                                            responses={responses}
                                            setResponses={setResponses}
                                            handleNext={handleNext}
                                            workflow={workflow}
                                        />
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
                {!isEnd && currentNode && (currentNode.type === 'textInput' || currentNode.type === 'zipCodeInput') && (
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
                                placeholder={currentNode.type === 'zipCodeInput' ? "Enter Zip Code..." : "Type your answer here..."}
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