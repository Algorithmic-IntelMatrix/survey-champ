import { NodeTypes } from '@xyflow/react';
import TextInputNode from './TextInputNode';
import { NODE_DEFINITIONS } from './definitions';

// Map of Component Implementations
// If a type is in NODE_DEFINITIONS but not here, it will use a default fallback (if we set one up) or ReactFlow default
const componentMap: Record<string, React.ComponentType<any>> = {
    textInput: TextInputNode,
};

export const nodeTypes: NodeTypes = componentMap;

// Export definitions for use in Sidebar
export * from './definitions';

