import { Node, Edge } from '@xyflow/react';

interface ValidationError {
    type: 'error' | 'warning';
    message: string;
    nodeId?: string;
}

export const validateWorkflow = (nodes: Node[], edges: Edge[]): { isValid: boolean, errors: ValidationError[] } => {
    const errors: ValidationError[] = [];

    // 1. Check for End Code
    const endNodes = nodes.filter(n => n.type === 'end');
    if (endNodes.length === 0) {
        errors.push({ type: 'error', message: 'The flow must have at least one End node.' });
    }

    // 2. Validate Specific Node Properties
    nodes.forEach(node => {
        if (node.type === 'end') {
            if (!node.data.redirectUrl) {
                errors.push({ type: 'error', message: 'End node must have a Redirect URL.', nodeId: node.id });
            }
        }
        if (node.type === 'branch') {
             // Basic check: assumes condition is an object with logicType or rules
             const condition = node.data.condition as any;
             if (!condition || (condition.rules && condition.rules.length === 0)) {
                  errors.push({ type: 'error', message: 'Branch node must have at least one condition rule.', nodeId: node.id });
             }
        }
    });

    // 3. Cycle Detection (DFS)
    const adj: Record<string, string[]> = {};
    nodes.forEach(n => adj[n.id] = []);
    edges.forEach(e => {
        if (adj[e.source]) {
            adj[e.source].push(e.target);
        }
    });

    const visited = new Set<string>();
    const recStack = new Set<string>();
    let hasCycle = false;

    const isCyclic = (nodeId: string): boolean => {
        if (recStack.has(nodeId)) return true;
        if (visited.has(nodeId)) return false;

        visited.add(nodeId);
        recStack.add(nodeId);

        const children = adj[nodeId] || [];
        for (const child of children) {
            if (isCyclic(child)) return true;
        }

        recStack.delete(nodeId);
        return false;
    };

    // Run DFS from every node to cover disconnected components
    for (const node of nodes) {
        if (isCyclic(node.id)) {
            hasCycle = true;
            break; 
        }
    }

    if (hasCycle) {
        errors.push({ type: 'error', message: 'The flow contains a cycle (loop). remove loops to publish.' });
    }

    // 4. Check if End is reachable (Optional but recommended "DAG should end with the end node")
    // This is complex for a multi-branch flow.
    // A simpler check: Do "sink" nodes (nodes with no outgoing edges) have type 'end'?
    // If a node has no outgoing edges and is NOT an end node, the flow "stops" there improperly.
    nodes.forEach(node => {
        const outEdges = edges.filter(e => e.source === node.id);
        if (outEdges.length === 0 && node.type !== 'end') {
             errors.push({ type: 'error', message: `One path ends at a '${node.type}' node instead of an End node.`, nodeId: node.id });
        }
    });

    return {
        isValid: errors.length === 0,
        errors
    };
};
