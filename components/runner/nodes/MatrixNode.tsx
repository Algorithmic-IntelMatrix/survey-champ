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
        <div className="w-full mt-6 bg-white rounded-[2.5rem] border shadow-md overflow-hidden animate-in fade-in duration-700">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-muted/30">
                            <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-muted-foreground border-b">Question</th>
                            {cols.map((col: any, i: number) => (
                                <th key={i} className="px-4 py-4 text-center text-xs font-black uppercase tracking-widest text-muted-foreground border-b">
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row: any, ri: number) => (
                            <tr key={ri} className="border-b last:border-0 hover:bg-muted/5 transition-colors">
                                <td className="px-6 py-4 text-base font-bold text-foreground/80">{row.label}</td>
                                {cols.map((col: any, ci: number) => {
                                    const isSelected = currentResponse[row.value] === col.value;
                                    return (
                                        <td key={ci} className="px-4 py-4 text-center">
                                            <button
                                                disabled={!isActive}
                                                onClick={() => {
                                                    const newResponse = { ...currentResponse, [row.value]: col.value };
                                                    setResponses(prev => ({ ...prev, [msg.nodeId!]: newResponse }));
                                                }}
                                                className={cn(
                                                    "w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center mx-auto",
                                                    isSelected ? "bg-primary border-primary text-primary-foreground shadow-lg scale-110" : "bg-white border-muted-foreground/20 hover:border-primary/50",
                                                    !isActive && !isSelected && "opacity-30"
                                                )}
                                            >
                                                {isSelected && <IconCheck size={20} strokeWidth={3} />}
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
                <div className="p-6 bg-muted/10 border-t flex justify-end">
                    <button
                        disabled={!allAnswered}
                        onClick={() => handleNext(currentResponse)}
                        className="px-12 py-4 bg-primary text-primary-foreground rounded-2xl text-lg font-black shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                    >
                        Save Ratings <IconArrowRight className="inline ml-2" />
                    </button>
                </div>
            )}
        </div>
    )
}
