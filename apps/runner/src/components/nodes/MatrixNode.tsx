"use client"
import { cn } from "@/lib/utils"
import { IconCheck, IconArrowRight } from "@tabler/icons-react"
import { NodeProps } from "./types"

export const MatrixNode = ({ msg, currentNodeId, responses, setResponses, handleNext, workflow }: NodeProps) => {
    const isActive = msg.nodeId === currentNodeId;
    const nodeData = workflow[msg.nodeId!]?.data || {};

    if (msg.type !== 'matrixChoice') return null;

    const rows = nodeData.rows || [];
    const cols = nodeData.columns || [];
    const currentResponse = responses[msg.nodeId!] || {};
    const allAnswered = rows.every((row: any) => currentResponse[row.value]);

    return (
        <div className="w-full mt-4 space-y-6 animate-in fade-in duration-700">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                    <thead>
                        <tr>
                            <th className="py-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground w-1/3">Question</th>
                            {cols.map((col: any, i: number) => (
                                <th key={i} className="px-2 py-4 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row: any, ri: number) => (
                            <tr key={ri} className="group border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                                <td className="py-3 pr-4 text-base font-medium text-foreground">{row.label}</td>
                                {cols.map((col: any, ci: number) => {
                                    const isSelected = currentResponse[row.value] === col.value;
                                    return (
                                        <td key={ci} className="px-2 py-4 text-center">
                                            <button
                                                disabled={!isActive}
                                                onClick={() => {
                                                    const newResponse = { ...currentResponse, [row.value]: col.value };
                                                    setResponses(prev => ({ ...prev, [msg.nodeId!]: newResponse }));
                                                }}
                                                className={cn(
                                                    "w-6 h-6 rounded-full border transition-all inline-flex items-center justify-center",
                                                    isSelected
                                                        ? "bg-primary border-primary text-primary-foreground scale-110"
                                                        : "bg-card border-border hover:border-muted-foreground group-hover:bg-card",
                                                    !isActive && !isSelected && "opacity-30"
                                                )}
                                            >
                                                {isSelected && <div className="w-2 h-2 rounded-full bg-background" />}
                                            </button>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isActive && (
                <div className="flex justify-end pt-4">
                    <button
                        disabled={!allAnswered}
                        onClick={() => handleNext(currentResponse)}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-sm font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-30 disabled:hover:translate-y-0"
                    >
                        Save <IconArrowRight size={18} />
                    </button>
                </div>
            )}
        </div>
    )
}
