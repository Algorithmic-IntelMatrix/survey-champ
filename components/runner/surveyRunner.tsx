"use client"
import { surveyWorkflowApi } from "@/api/surveyWorkflow"
import { useEffect, useState, useMemo } from "react"
import { DAGReader } from "../properties/DagReader"
import { IconArrowRight, IconRefresh, IconCheck, IconAlertCircle, IconTimeline } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

export const SurveyRunner = ({ id }: { id: string }) => {
    const [workflow, setWorkflow] = useState<any>(null);
    const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
    const [responses, setResponses] = useState<Record<string, any>>({});
    const [error, setError] = useState<string | null>(null);

    const reader = useMemo(() => workflow ? new DAGReader(workflow) : null, [workflow]);

    useEffect(() => {
        if (!id) return;

        (async () => {
            try {
                const response = await surveyWorkflowApi.getLatestWorkflowBySurveyId(id);
                const runtimeJson = response.runtimeJson; // Based on backend response structure { data: workflow }
                setWorkflow(runtimeJson);

                // Set initial node
                if (runtimeJson) {
                    const r = new DAGReader(runtimeJson);
                    const startNode = r.getStartNode();
                    let firstNode = startNode;

                    // Note: Usually we show the start node as a splash screen, 
                    // but we ensure any following branches are considered when we click "Begin"
                    setCurrentNodeId(firstNode?.id || null);
                }
            } catch (err) {
                console.error(err);
                setError("Failed to load workflow");
            }
        })()
    }, [id])

    const handleNext = () => {
        if (!reader || !currentNodeId) return;
        try {
            setError(null);
            let nextNode = reader.getNextNode(currentNodeId, responses);

            // Auto-traverse transition nodes (like branch) that don't have a UI
            while (nextNode && nextNode.type === 'branch') {
                nextNode = reader.getNextNode(nextNode.id, responses);
            }

            if (nextNode) {
                setCurrentNodeId(nextNode.id);
            } else {
                // If no next node but not 'end' type, it's an unexpected termination or branch error
                const current = reader.getNode(currentNodeId);
                if (current?.type !== 'end') {
                    setError("Flow stopped unexpectedly. Check your branching logic.");
                }
            }
        } catch (err: any) {
            setError(err.message || "An error occurred during traversal");
        }
    };

    const handleReset = () => {
        if (reader) {
            const startNode = reader.getStartNode();
            setCurrentNodeId(startNode?.id || null);
            setResponses({});
            setError(null);
        }
    };

    if (error && !workflow) return <div className="p-10 text-destructive">{error}</div>
    if (!workflow) return <div className="p-10">Loading...</div>

    const currentNode = currentNodeId ? reader?.getNode(currentNodeId) : null;
    const isEnd = currentNode?.type === 'end';
    const takenPath = reader?.getTakenPath(responses) || [];

    return (
        <div className="max-w-4xl mx-auto p-10 grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* Left Col: Current Interaction */}
            <div className="md:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold tracking-tight">Survey Runner <span className="text-muted-foreground font-normal text-sm">/ Mock Mode</span></h1>
                    <button onClick={handleReset} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                        <IconRefresh size={14} /> Reset Session
                    </button>
                </div>

                {currentNode ? (
                    <div className={cn(
                        "p-8 rounded-2xl border-2 shadow-sm transition-all bg-card animate-in fade-in slide-in-from-bottom-2",
                        isEnd ? "border-green-500/30 bg-green-500/5" : "border-border"
                    )}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className={cn(
                                "p-2 rounded-lg",
                                isEnd ? "bg-green-500 text-white" : "bg-primary/10 text-primary"
                            )}>
                                {isEnd ? <IconCheck size={20} /> : <IconTimeline size={20} />}
                            </div>
                            <div>
                                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                                    {isEnd ? "Conclusion" : `Current Node: ${currentNode.type}`}
                                </h2>
                                <p className="text-foreground font-semibold">{currentNode.id}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xl font-medium">{currentNode.data?.label || "Untitled Screen"}</h3>
                            {currentNode.data?.description && (
                                <p className="text-muted-foreground text-sm">{currentNode.data.description}</p>
                            )}

                            {/* Response Simulation Input */}
                            {!isEnd && currentNode.type !== 'start' && (
                                <div className="mt-8 p-4 bg-muted/30 rounded-xl border border-border/50">
                                    <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Simulate Response</label>
                                    <input
                                        type="text"
                                        className="w-full bg-background border border-input rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-hidden transition-all"
                                        placeholder="Type answer here..."
                                        value={responses[currentNode.id] || ""}
                                        onChange={(e) => setResponses(prev => ({ ...prev, [currentNode.id]: e.target.value }))}
                                        onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                                    />
                                    <p className="text-[10px] text-muted-foreground mt-2">
                                        Logic: This value will be stored as <code className="bg-muted px-1 rounded">{currentNode.id}</code> in the session.
                                    </p>
                                </div>
                            )}

                            {isEnd && (
                                <div className="mt-6 p-4 bg-background border border-border rounded-xl">
                                    <p className="text-sm text-center italic text-muted-foreground">"{currentNode.data?.message || "End of survey reached."}"</p>
                                    {currentNode.data?.redirectUrl && (
                                        <p className="text-[10px] text-primary text-center mt-2 underline">Redirect: {currentNode.data.redirectUrl}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="mt-6 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg flex items-center gap-2">
                                <IconAlertCircle size={14} />
                                {error}
                            </div>
                        )}

                        <div className="mt-10 flex justify-end">
                            {!isEnd && (
                                <button
                                    onClick={handleNext}
                                    className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                >
                                    {currentNode.type === 'start' ? 'Begin Survey' : 'Next Step'}
                                    <IconArrowRight size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="p-20 text-center text-muted-foreground border-2 border-dashed border-border rounded-2xl">
                        Node not found in graph.
                    </div>
                )}
            </div>

            {/* Right Col: Live Session State */}
            <div className="space-y-6">
                <div className="p-5 bg-muted/20 border border-border rounded-2xl space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Session Variables</h3>
                    <div className="space-y-2">
                        {Object.keys(responses).length > 0 ? (
                            Object.entries(responses).map(([key, val]) => (
                                <div key={key} className="flex justify-between items-center text-xs p-2 bg-background border border-border/50 rounded-lg">
                                    <span className="font-mono text-muted-foreground">{key}</span>
                                    <span className="font-bold">{String(val)}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-[10px] italic text-muted-foreground">No data captured yet.</p>
                        )}
                    </div>
                </div>

                <div className="p-5 bg-muted/20 border border-border rounded-2xl space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Path History</h3>
                    <div className="relative pl-4 space-y-4 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-border/50">
                        {takenPath.map((node: any, i: number) => (
                            <div key={i} className="relative flex items-center gap-3">
                                <div className={cn(
                                    "z-10 w-2 h-2 rounded-full",
                                    node.id === currentNodeId ? "bg-primary ring-4 ring-primary/20 scale-125" : "bg-muted-foreground/30"
                                )} />
                                <div className="flex flex-col">
                                    <span className={cn("text-[10px] font-bold", node.id === currentNodeId ? "text-primary" : "text-muted-foreground")}>{node.type}</span>
                                    <span className="text-[9px] font-mono opacity-60">{node.id}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div>
    )
}