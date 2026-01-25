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

import {
    ReactFlowProvider,
    useReactFlow,
    type ReactFlowInstance
} from '@xyflow/react';
import { nodeTypes, getNodeInitialData } from '@/components/nodes';
import SurveyNodeSidebar from '@/components/SurveyNodeSidebar';

let id = 0;
const getId = () => `dndnode_${id++}`;

import PropertiesPanel from '@/components/properties/PropertiesPanel';

function SurveyFlow() {
    // Initial nodes for testing
    const [nodes, setNodes] = useState<ReactFlowNode[]>([
        {
            id: 'start-1',
            type: 'start',
            position: { x: 250, y: 50 },
            data: getNodeInitialData('start')
        }
    ]);
    const [edges, setEdges] = useState<ReactFlowEdge[]>([]);

    // Selection State
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    // Use undefined as initial state for the instance
    const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | undefined>(undefined);
    const { screenToFlowPosition } = useReactFlow();

    const onNodesChange: OnNodesChange = useCallback(
        (changes) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot) as ReactFlowNode[]),
        [],
    );
    // Auto-deselect when clicking empty pane
    const onPaneClick = useCallback(() => setSelectedNodeId(null), []);

    // Select node on click
    const onNodeClick = useCallback((event: React.MouseEvent, node: ReactFlowNode) => {
        setSelectedNodeId(node.id);
    }, []);

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
            setSelectedNodeId(newNode.id); // Auto-select new node
        },
        [screenToFlowPosition],
    );

    return (
        <div className="flex w-full h-screen bg-background overflow-hidden">
            <SurveyNodeSidebar />

            <div className="flex-1 h-full relative border-r border-border" onDragOver={onDragOver} onDrop={onDrop}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onInit={setReactFlowInstance}
                    onNodeClick={onNodeClick}
                    onPaneClick={onPaneClick}
                    defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
                    className="bg-muted/10 px-10"
                >
                    <Background />
                    <Controls />
                </ReactFlow>
            </div>

            <div className="absolute top-4 right-4 z-50 flex gap-2">
                <button className="px-4 py-2 bg-white text-sm font-medium border border-border rounded-md shadow-sm hover:bg-muted transition-colors">
                    Save Draft
                </button>
                <button className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md shadow-md hover:bg-primary/90 transition-colors">
                    Publish
                </button>
            </div>
            {/* Right Sidebar: Properties Panel */}
            {selectedNodeId && nodes.find(n => n.id === selectedNodeId) && (
                <PropertiesPanel
                    node={nodes.find(n => n.id === selectedNodeId) || null}
                    nodes={nodes} // Pass full nodes list for logic building
                    onChange={(fieldName, value) => {
                        setNodes(nds => nds.map(n => {
                            if (n.id === selectedNodeId) {
                                return { ...n, data: { ...n.data, [fieldName]: value } };
                            }
                            return n;
                        }));
                    }}
                    onClose={() => setSelectedNodeId(null)}
                />
            )}
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