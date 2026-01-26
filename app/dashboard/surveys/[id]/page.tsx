"use client"
import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
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
    type OnConnect,
    ReactFlowProvider,
    useReactFlow,
    type ReactFlowInstance
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { nodeTypes, getNodeInitialData } from '@/components/nodes';
import SurveyNodeSidebar from '@/components/SurveyNodeSidebar';
import PropertiesPanel from '@/components/properties/PropertiesPanel';
import { IconCloudUpload, IconCheck, IconAlertCircle, IconLoader2 } from '@tabler/icons-react';
import { validateWorkflow } from '@/lib/validate-workflow';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { generateUniqueId } from "@/lib/utils";

// Helper to generate unique ID
const getId = () => generateUniqueId('node');

// ... (helper function remains same, not touching it if not needed, but replace_file_content needs start/end)
// Wait, I can't easily inject the import if I target line 237. I should do import separately or use a larger chunk.
// Let's do import first.

// Helper function to generate runtime JSON (Compiler)
const generateRuntimeJson = (nodes: ReactFlowNode[], edges: ReactFlowEdge[]) => {
    const runtimeJson: Record<string, any> = {};

    // Initialize nodes
    nodes.forEach(node => {
        runtimeJson[node.id] = {
            id: node.id,
            type: node.type,
            data: node.data,
            next: node.type === 'branch'
                ? { kind: 'branch', trueId: null, falseId: null }
                : { kind: 'linear', nextId: null }
        };
    });

    // Populate edges (connections)
    edges.forEach(edge => {
        const sourceNode = runtimeJson[edge.source];
        if (sourceNode) {
            if (sourceNode.next.kind === 'branch') {
                if (edge.sourceHandle === 'true') {
                    sourceNode.next.trueId = edge.target;
                } else if (edge.sourceHandle === 'false') {
                    sourceNode.next.falseId = edge.target;
                }
            } else {
                // Linear connection (take the first one found)
                sourceNode.next.nextId = edge.target;
            }
        }
    });

    return runtimeJson;
};

function SurveyFlow() {
    const params = useParams();
    const router = useRouter();
    const surveyId = params?.id as string;

    // Initial nodes for testing (default, will be overwritten if data exists)
    const [nodes, setNodes] = useState<ReactFlowNode[]>([
        {
            id: 'start-1',
            type: 'start',
            position: { x: 250, y: 50 },
            data: getNodeInitialData('start')
        }
    ]);
    const [edges, setEdges] = useState<ReactFlowEdge[]>([]);

    // Autosave State
    const [workflowId, setWorkflowId] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [publishStatus, setPublishStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');
    const isRemoteUpdate = useRef(false); // Flag to prevent autosave when loading data
    const hasLoaded = useRef(false); // Flag to indicate initial data load is complete

    // Selection State
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    // Use undefined as initial state for the instance
    const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | undefined>(undefined);
    const { screenToFlowPosition } = useReactFlow();

    // 1. Fetch Latest Data on Mount
    useEffect(() => {
        async function loadLatest() {
            if (!surveyId) return;
            setSaveStatus('idle'); // Set status to idle while loading
            try {
                const { data } = await apiClient.get(`/workflows/${surveyId}/latest`);
                const workflow = data.data; // Helper: backend returns { data: workflow }

                if (workflow) {
                    if (workflow.designJson) {
                        const { nodes: loadedNodes, edges: loadedEdges, viewport } = workflow.designJson;

                        isRemoteUpdate.current = true; // Prevent autosave from triggering immediately after load

                        setNodes(loadedNodes || []);
                        setEdges(loadedEdges || []);

                        if (viewport && reactFlowInstance) {
                            reactFlowInstance.setViewport(viewport);
                        }
                    }
                    if (workflow.id) {
                        setWorkflowId(workflow.id);
                        setPublishStatus(workflow.status || 'DRAFT');
                    }
                }
                setSaveStatus('saved'); // Data loaded successfully
            } catch (err) {
                console.error("Failed to load workflow", err);
                setSaveStatus('error'); // Indicate error in loading
            } finally {
                hasLoaded.current = true;
            }
        }

        loadLatest();
    }, [surveyId, reactFlowInstance]); // reactFlowInstance dependency to ensure we can set viewport if needed

    // 2. Autosave Effect
    useEffect(() => {
        // Skip if not loaded yet or if surveyId is not available
        if (!hasLoaded.current || !surveyId) return;

        // Skip if this change was caused by loading from remote
        if (isRemoteUpdate.current) {
            isRemoteUpdate.current = false;
            return;
        }

        const autosave = async () => {
            setSaveStatus('saving');

            // 1. Generate Design JSON
            const designJson = reactFlowInstance?.toObject();
            if (!designJson) {
                console.warn("ReactFlow instance not ready for designJson generation.");
                setSaveStatus('error');
                return;
            }

            // 2. Generate Runtime JSON (DAG)
            const runtimeJson = generateRuntimeJson(nodes, edges);

            const payload = {
                surveyId,
                designJson,
                runtimeJson
            };

            try {
                if (workflowId) {
                    // Update existing
                    await apiClient.patch(`/workflows/${workflowId}`, payload);
                    setSaveStatus('saved');
                } else {
                    // Create new
                    const res = await apiClient.post('/workflows', payload);
                    if (res.data?.data?.id) {
                        setWorkflowId(res.data.data.id);
                    }
                    setSaveStatus('saved');
                }
            } catch (error) {
                console.error("Autosave failed", error);
                setSaveStatus('error');
                toast.error("Autosave failed.");
            }
        };

        const timer = setTimeout(autosave, 2000); // 2s debounce
        return () => clearTimeout(timer);

    }, [nodes, edges, surveyId, workflowId, reactFlowInstance]);

    const togglePublish = async () => {
        if (!workflowId) {
            toast.error("Please wait for draft to save first.");
            return;
        }

        // UNPUBLISH LOGIC
        if (publishStatus === 'PUBLISHED') {
            try {
                const promise = apiClient.patch(`/workflows/${workflowId}`, { status: 'DRAFT' });
                toast.promise(promise, {
                    loading: 'Unpublishing Survey...',
                    success: () => {
                        setPublishStatus('DRAFT');
                        return 'Survey Unpublished. Now in Draft mode.';
                    },
                    error: 'Failed to unpublish survey'
                });
                await promise;
            } catch (error) {
                console.error(error);
            }
            return;
        }

        // 1. Validation
        const { isValid, errors } = validateWorkflow(nodes, edges);

        if (!isValid) {
            toast.error("Cannot Publish", {
                description: (
                    <ul className="list-disc pl-4 mt-2 text-xs">
                        {errors.slice(0, 5).map((e, i) => (
                            <li key={i}>{e.message}</li>
                        ))}
                        {errors.length > 5 && <li>...and {errors.length - 5} more</li>}
                    </ul>
                ),
                duration: 5000
            });
            return;
        }

        try {
            const promise = apiClient.patch(`/workflows/${workflowId}`, { status: 'PUBLISHED' });

            toast.promise(promise, {
                loading: 'Publishing Survey...',
                success: () => {
                    setPublishStatus('PUBLISHED');
                    return 'Survey Published Successfully!';
                },
                error: 'Failed to publish survey'
            });

            await promise;

        } catch (error) {
            console.error(error);
        }
    };


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

            // Handle ID collision if loading from server - simple check or use UUIDs
            // For now using simple increment but checking existence might be better or using big random
            const newNode: ReactFlowNode = {
                id: getId(),
                type,
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

            {/* Top Right Controls & Status */}
            <div className="absolute top-4 right-4 z-50 flex items-center gap-3">

                {/* Live Status Badge */}
                {publishStatus === 'PUBLISHED' && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 backdrop-blur-sm rounded-full shadow-sm">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-green-600 font-bold text-xs tracking-wide">LIVE</span>
                    </div>
                )}

                {/* Save Status Indicator - Only showed during activity or error */}
                {(saveStatus === 'saving' || saveStatus === 'saved' || saveStatus === 'error') && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-background/80 backdrop-blur-sm border border-border rounded-full shadow-sm text-xs font-medium transition-all">
                        {saveStatus === 'saving' && (
                            <>
                                <IconLoader2 className="animate-spin text-primary" size={14} />
                                <span className="text-muted-foreground">Saving...</span>
                            </>
                        )}
                        {saveStatus === 'saved' && (
                            <>
                                <IconCheck className="text-green-500" size={14} />
                                <span className="text-foreground">Saved</span>
                            </>
                        )}
                        {saveStatus === 'error' && (
                            <>
                                <IconAlertCircle className="text-destructive" size={14} />
                                <span className="text-destructive">Save Failed</span>
                            </>
                        )}
                    </div>
                )}

                <button
                    onClick={() => {
                        toast.success("Design autosaved successfully.");
                    }}
                    className="px-4 py-2 bg-white text-sm font-medium border border-border rounded-md shadow-sm hover:bg-muted transition-colors opacity-70 hover:opacity-100"
                >
                    Save Draft
                </button>
                <button
                    onClick={togglePublish}
                    className={cn(
                        "px-4 py-2 text-sm font-medium rounded-md shadow-md transition-colors",
                        publishStatus === 'PUBLISHED'
                            ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                >
                    {publishStatus === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                </button>
            </div>

            <button
                onClick={() => {
                    window.open(`/surveyRunner/${surveyId}`, '_blank');
                }}
                className="px-4 py-2 bg-muted text-sm font-medium border border-border rounded-md shadow-sm hover:bg-muted/80 transition-colors ml-2"
            >
                Test Link
            </button>

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