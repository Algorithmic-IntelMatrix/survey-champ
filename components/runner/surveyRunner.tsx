"use client"
import { surveyWorkflowApi } from "@/api/surveyWorkflow"
import { useEffect, useState, useMemo, useRef } from "react"
import { DAGReader } from "../properties/DagReader"
import { IconArrowRight, IconRefresh, IconCheck, IconAlertCircle, IconTimeline, IconUser, IconRobot, IconSend, IconStar, IconCommand } from "@tabler/icons-react"
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
    displayValue?: string; // For formatted rendering (e.g., "5 Stars")
}

export const SurveyRunner = ({ id, mode }: { id: string, mode?: string }) => {
    const [workflow, setWorkflow] = useState<any>(null);
    const [status, setStatus] = useState<string>('DRAFT');
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

            // Zip Code Validation
            if (currentNode.type === 'zipCodeInput') {
                const zipPattern = /^\d{5,6}$/; // Basic 5-6 digit zip validation
                if (!zipPattern.test(String(userValue).trim())) {
                    setError("Please enter a valid 5 or 6 digit Zip Code.");
                    setIsTyping(false);
                    return;
                }
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
        <div className="flex flex-col h-screen w-screen bg-background overflow-hidden relative font-sans selection:bg-primary/10">

            {/* Navigation Header */}
            <header className="flex items-center justify-between px-8 py-6 bg-background/90 backdrop-blur-sm sticky top-0 z-50">
                <div className="flex items-center gap-2 text-foreground/80">
                    <IconCommand size={20} />
                    <span className="text-sm font-semibold tracking-wide">Survey Champ</span>
                </div>
                <button
                    onClick={handleReset}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest"
                >
                    Start Over
                </button>
            </header>

            {/* Main Conversation Flow */}
            <main
                ref={scrollRef}
                className="flex-1 overflow-y-auto w-full max-w-3xl mx-auto px-6 py-12 space-y-6 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
            >
                <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                "flex flex-col w-full",
                                msg.role === 'user' ? "items-end" : "items-start"
                            )}
                        >
                            <div className={cn(
                                "flex w-full items-center gap-3",
                                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                            )}>
                                {/* Avatar */}
                                <div className={cn(
                                    "shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm",
                                    msg.role === 'user'
                                        ? "bg-muted text-muted-foreground"
                                        : "bg-primary text-primary-foreground"
                                )}>
                                    {msg.role === 'user' ? <IconUser size={16} /> : <IconRobot size={16} />}
                                </div>

                                {/* Message Bubble */}
                                <div className={cn(
                                    "max-w-[85%] transition-all",
                                    msg.role === 'user'
                                        ? "bg-muted/80 text-foreground/90 rounded-2xl px-6 py-4 text-base font-medium shadow-sm backdrop-blur-sm"
                                        : "bg-card border border-border px-8 py-6 rounded-3xl rounded-tl-none shadow-sm text-xl md:text-2xl font-medium text-foreground tracking-tight leading-snug"
                                )}>
                                    {msg.content}
                                </div>
                            </div>

                            {/* Specialized UI for current question */}
                            {msg.role === 'assistant' && !isEnd && (
                                <div className="w-full pt-6 pl-12 animate-in fade-in slide-in-from-bottom-2 duration-700">
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
                        </motion.div>
                    ))}

                    {isTyping && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-2 pl-1"
                        >
                            <span className="w-1.5 h-1.5 bg-foreground/20 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-1.5 h-1.5 bg-foreground/20 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-1.5 h-1.5 bg-foreground/20 rounded-full animate-bounce" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Vertical padding to ensure content isn't hidden by floating input */}
                <div className="h-40" />
            </main>

            {/* Floating Action Input */}
            <AnimatePresence>
                {!isEnd && currentNode && (currentNode.type === 'textInput' || currentNode.type === 'zipCodeInput') && (
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="fixed bottom-0 left-0 w-full p-6 bg-linear-to-t from-background via-background/90 to-transparent z-50 flex justify-center"
                    >
                        <div className="w-full max-w-2xl relative group">
                            <input
                                autoFocus
                                type={currentNode.type === 'zipCodeInput' ? "tel" : "text"}
                                placeholder={currentNode.type === 'zipCodeInput' ? "Enter Zip Code..." : "Type your answer..."}
                                className="w-full bg-transparent border-b border-border py-4 text-xl md:text-2xl font-medium focus:border-foreground outline-none transition-all placeholder:text-muted-foreground/30 rounded-none"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && inputValue.trim() && handleNext(inputValue)}
                            />
                            <button
                                disabled={!inputValue.trim()}
                                onClick={() => handleNext(inputValue)}
                                className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-foreground hover:bg-muted rounded-full transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                                <IconArrowRight size={24} strokeWidth={1.5} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Out-of-flow notifications */}
            {isEnd && (
                <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.8, type: 'spring' }}
                        className="bg-white p-12 text-center max-w-xl pointer-events-auto"
                    >
                        <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
                            <IconCheck size={32} strokeWidth={2} />
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight mb-3">All Done.</h2>
                        <p className="text-lg text-muted-foreground font-medium mb-10 leading-relaxed">Thank you for sharing your thoughts with us.</p>
                        <button
                            className="text-sm font-bold uppercase tracking-widest border-b-2 border-transparent hover:border-black transition-all pb-1"
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
                    className="fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 bg-red-50 text-red-600 text-sm font-medium rounded-full flex items-center gap-2 shadow-sm border border-red-100 z-[60]"
                >
                    <IconAlertCircle size={16} strokeWidth={2} />
                    {error}
                </motion.div>
            )}
        </div>
    )
}