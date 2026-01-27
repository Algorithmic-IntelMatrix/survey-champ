"use client";
import { useEffect, useState } from "react";
import { surveyApi } from "@/api/survey";
import { SurveyQuota, SurveyWorkflow } from "@surveychamp/types";
import { surveyWorkflowApi } from "@/api/surveyWorkflow";
import { toast } from "sonner";
import { IconPlus, IconTrash, IconToggleLeft, IconToggleRight, IconAlertCircle, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface SurveyQuotaModalProps {
    isOpen: boolean;
    onClose: () => void;
    surveyId: string;
}

interface QuestionNode {
    id: string;
    label: string;
    type: string;
    options?: any[];
}

export function SurveyQuotaModal({ isOpen, onClose, surveyId }: SurveyQuotaModalProps) {
    const [quotas, setQuotas] = useState<SurveyQuota[]>([]);
    const [loading, setLoading] = useState(false);
    const [nodes, setNodes] = useState<QuestionNode[]>([]);

    // Internal Add Form State
    const [isAdding, setIsAdding] = useState(false);
    const [newQuota, setNewQuota] = useState({
        nodeId: "",
        operator: "equals",
        value: "",
        limit: ""
    });

    useEffect(() => {
        console.log("Survey Quota Modal useEffect called", isOpen, surveyId);
        if (isOpen && surveyId) {
            fetchData();
        }
    }, [isOpen, surveyId]);

    const fetchData = async () => {
        console.log("Fetching data");
        setLoading(true);
        try {
            const [quotasData, workflowData] = await Promise.all([
                surveyApi.getQuotas(surveyId),
                surveyWorkflowApi.getLatestWorkflowBySurveyId(surveyId)
            ]);
            setQuotas(quotasData);

            if (workflowData?.runtimeJson) {
                const nodeList: QuestionNode[] = [];
                Object.values(workflowData.runtimeJson).forEach((node: any) => {
                    if (node.type !== 'start' && node.type !== 'end' && node.type !== 'branch' && node.data?.label) {
                        nodeList.push({
                            id: node.id,
                            label: node.data.label,
                            type: node.type,
                            options: node.data.options
                        });
                    }
                });
                setNodes(nodeList);
            }
        } catch (error) {
            toast.error("Failed to load quotas");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        console.log("Handle Create is being called")
        if (!newQuota.nodeId || !newQuota.value || !newQuota.limit) {
            toast.error("Please fill all fields");
            return;
        }

        try {
            const created = await surveyApi.createQuota(surveyId, {
                rule: {
                    nodeId: newQuota.nodeId,
                    operator: newQuota.operator,
                    value: newQuota.value
                },
                limit: parseInt(newQuota.limit),
                enabled: true
            });
            setQuotas([created, ...quotas]);
            setIsAdding(false);
            setNewQuota({ nodeId: "", operator: "equals", value: "", limit: "" });
            toast.success("Quota created");
        } catch (error) {
            console.error(error);
            toast.error("Failed to create quota");
        }
    };

    const handleDelete = async (quotaId: string) => {
        if (!confirm("Are you sure you want to delete this quota?")) return;
        try {
            await surveyApi.deleteQuota(quotaId);
            setQuotas(quotas.filter(q => q.id !== quotaId));
            toast.success("Quota deleted");
        } catch (error) {
            toast.error("Failed to delete quota");
        }
    };

    const handleToggle = async (quotaId: string, currentStatus: boolean) => {
        try {
            const updated = await surveyApi.toggleQuota(quotaId, !currentStatus);
            setQuotas(quotas.map(q => q.id === quotaId ? updated : q));
        } catch (error) {
            toast.error("Failed to update quota");
        }
    };

    const getNodeLabel = (nodeId: string) => nodes.find(n => n.id === nodeId)?.label || nodeId;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="bg-background border border-border shadow-2xl rounded-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
                            <div>
                                <h3 className="text-xl font-bold">Quota Management</h3>
                                <p className="text-xs text-muted-foreground">Define demographic limits (e.g. Max 50 responses for Age=18).</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {!isAdding && (
                                    <button
                                        onClick={() => setIsAdding(true)}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-all"
                                    >
                                        <IconPlus size={16} /> Add Rule
                                    </button>
                                )}
                                <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                                    <IconX size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {loading ? (
                                <div className="py-12 flex justify-center">
                                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : (
                                <>
                                    {/* Add Form */}
                                    {isAdding && (
                                        <div className="bg-muted/30 border border-primary/20 rounded-xl p-4 mb-4 animate-in slide-in-from-top-2">
                                            <h4 className="text-sm font-bold mb-3 text-primary">New Quota Rule</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                <div className="md:col-span-1">
                                                    <label className="text-xs font-semibold block mb-1">Question</label>
                                                    <select
                                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                                        value={newQuota.nodeId}
                                                        onChange={(e) => setNewQuota({ ...newQuota, nodeId: e.target.value })}
                                                    >
                                                        <option value="">Select...</option>
                                                        {nodes.map(n => (
                                                            <option key={n.id} value={n.id}>{n.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold block mb-1">Operator</label>
                                                    <select
                                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                                        value={newQuota.operator}
                                                        onChange={(e) => setNewQuota({ ...newQuota, operator: e.target.value })}
                                                    >
                                                        <option value="equals">Equals (=)</option>
                                                        <option value="not_equals">Not Equals (!=)</option>
                                                        <option value="contains">Contains</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold block mb-1">Value</label>
                                                    <input
                                                        placeholder="Answer value"
                                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                                        value={newQuota.value}
                                                        onChange={(e) => setNewQuota({ ...newQuota, value: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold block mb-1">Limit</label>
                                                    <input
                                                        type="number"
                                                        placeholder="Max"
                                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                                        value={newQuota.limit}
                                                        onChange={(e) => setNewQuota({ ...newQuota, limit: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-2 mt-4">
                                                <button onClick={() => setIsAdding(false)} className="px-3 py-1.5 text-xs font-medium hover:bg-muted rounded-lg">Cancel</button>
                                                <button onClick={handleCreate} className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90">Save Rule</button>
                                            </div>
                                        </div>
                                    )}

                                    {/* List */}
                                    {quotas.length === 0 && !isAdding ? (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <IconAlertCircle className="mx-auto mb-2 opacity-50" size={32} />
                                            <p>No quotas defined yet.</p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-3">
                                            {quotas.map(quota => (
                                                <div key={quota.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:shadow-sm transition-all">
                                                    <div className="flex-1 grid grid-cols-3 gap-4">
                                                        <div>
                                                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Question</p>
                                                            <p className="text-sm font-medium line-clamp-1" title={getNodeLabel(quota.rule.nodeId)}>{getNodeLabel(quota.rule.nodeId)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Rule</p>
                                                            <p className="text-sm font-mono bg-muted/50 inline-block px-1.5 rounded">{quota.rule.operator} "{quota.rule.value}"</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Limit</p>
                                                            <p className="text-sm font-bold text-primary">{quota.limit.toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 pl-4 border-l border-border">
                                                        <button onClick={() => handleToggle(quota.id, quota.enabled)} className="text-primary hover:opacity-80 transition-opacity" title="Toggle Status">
                                                            {quota.enabled ? <IconToggleRight size={28} className="text-emerald-500" /> : <IconToggleLeft size={28} className="text-muted-foreground" />}
                                                        </button>
                                                        <button onClick={() => handleDelete(quota.id)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors" title="Delete Rule">
                                                            <IconTrash size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
