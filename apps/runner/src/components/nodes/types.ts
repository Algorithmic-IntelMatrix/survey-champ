"use client"

export interface NodeProps {
    msg: {
        id: string;
        role: 'assistant' | 'user';
        type: string;
        content: string;
        nodeId?: string;
        options?: { label: string, value: string }[];
    };
    currentNodeId: string | null;
    responses: Record<string, any>;
    setResponses: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    handleNext: (value?: any) => void;
    workflow: any;
}
