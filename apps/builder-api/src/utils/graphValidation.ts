
interface Node {
    id: string;
    [key: string]: any;
}

interface Edge {
    source: string;
    target: string;
    [key: string]: any;
}

/**
 * Validates if the given graph (nodes + edges) is a valid survey workflow.
 * Checks for: Cycles, single start node, at least one end node, and reachability.
 */
export const validateWorkflow = (nodes: Node[], edges: Edge[]): { isValid: boolean; error?: string } => {
    const startNodes = nodes.filter(n => n.type === 'start');
    const endNodes = nodes.filter(n => n.type === 'end');

    if (startNodes.length === 0) return { isValid: false, error: "The flow must have exactly one Start node." };
    if (startNodes.length > 1) return { isValid: false, error: "The flow has multiple Start nodes." };
    if (endNodes.length === 0) return { isValid: false, error: "The flow must have at least one End node." };

    // Build adjacency list
    const adj: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};
    nodes.forEach(n => {
        adj[n.id] = [];
        inDegree[n.id] = 0;
    });
    
    edges.forEach(e => {
        const src = adj[e.source];
        const dest = adj[e.target];
        if (src && dest) { 
             src.push(e.target);
             inDegree[e.target] = (inDegree[e.target] ?? 0) + 1;
        }
    });

    // Kahn's algorithm for Cycle Detection & Topological Sort
    const queue: string[] = [];
    Object.keys(inDegree).forEach(id => {
        if (inDegree[id] === 0) queue.push(id);
    });

    const topoOrder: string[] = [];
    while (queue.length > 0) {
        const u = queue.shift();
        if (!u) break;
        topoOrder.push(u);
        const neighbors = adj[u] || [];
        for (const v of neighbors) {
            inDegree[v] = (inDegree[v] || 0) - 1;
            if (inDegree[v] === 0) queue.push(v);
        }
    }

    if (topoOrder.length < nodes.length) {
        return { isValid: false, error: "The flow contains a cycle (loop). Infinite loops are not allowed." };
    }

    // Reachability from Start Node
    const startNodeId = startNodes[0]?.id;
    if (!startNodeId) return { isValid: false, error: "Start node ID is missing." };
    
    const visited = new Set<string>();
    const stack = [startNodeId];
    while (stack.length > 0) {
        const u = stack.pop();
        if (!u) continue;
        if (!visited.has(u)) {
            visited.add(u);
            (adj[u] || []).forEach(v => stack.push(v));
        }
    }

    // Every node should be reachable from start in a valid published survey
    for (const node of nodes) {
        if (!visited.has(node.id)) {
            return { isValid: false, error: `Node '${node.id}' is not reachable from the Start node.` };
        }
    }

    return { isValid: true };
};
