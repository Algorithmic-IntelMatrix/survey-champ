"use client"
import { useState, useCallback } from 'react';
import {
    ReactFlow,
    applyNodeChanges,
    applyEdgeChanges,
    addEdge,
    Background,
    Controls,
    type Node as ReactFlowNode,
    type Edge as ReactFlowEdge,
    type OnNodesChange,
    type OnEdgesChange,
    type OnConnect
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const initialNodes: ReactFlowNode[] = [
    { id: 'n1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
    { id: 'n2', position: { x: 0, y: 100 }, data: { label: 'Node 2' } },
];
const initialEdges: ReactFlowEdge[] = [{ id: 'n1-n2', source: 'n1', target: 'n2' }];

import {
    ReactFlowProvider,
    useReactFlow,
    type ReactFlowInstance
} from '@xyflow/react';
import SurveyNodeSidebar from '@/components/SurveyNodeSidebar';

let id = 0;
const getId = () => `dndnode_${id++}`;

function SurveyFlow() {
    const [nodes, setNodes] = useState<ReactFlowNode[]>(initialNodes);
    const [edges, setEdges] = useState<ReactFlowEdge[]>(initialEdges);
    // Use undefined as initial state for the instance
    const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | undefined>(undefined);
    const { screenToFlowPosition } = useReactFlow();

    const onNodesChange: OnNodesChange = useCallback(
        (changes) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot) as ReactFlowNode[]),
        [],
    );
    const onEdgesChange: OnEdgesChange = useCallback(
        (changes) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot) as ReactFlowEdge[]),
        [],
    );
    const onConnect: OnConnect = useCallback(
        (params) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
        [],
    );

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow');
            const label = event.dataTransfer.getData('application/reactflow/label');

            if (typeof type === 'undefined' || !type) {
                return;
            }

            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const newNode: ReactFlowNode = {
                id: getId(),
                type, // 'textInput', 'multipleChoice', etc. (You will need custom node components for these eventually)
                position,
                data: { label: label || `${type} node` },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [screenToFlowPosition],
    );

    return (
        <div className="flex w-full h-full bg-background">
            <div className="flex-1 h-full relative" onDragOver={onDragOver} onDrop={onDrop}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onInit={setReactFlowInstance}
                    fitView
                    className="bg-muted/10"
                >
                    <Background />
                    <Controls />
                </ReactFlow>
            </div>
        </div>
    );
}

export default function App() {
    return (
        <div style={{ width: '100%', height: 'calc(100vh - 64px)' }}> {/* Adjust height for header/nav */}
            <ReactFlowProvider>
                <SurveyFlow />
            </ReactFlowProvider>
        </div>
    );
}