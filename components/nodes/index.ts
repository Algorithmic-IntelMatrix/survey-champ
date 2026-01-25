import { NodeTypes } from '@xyflow/react';
import TextInputNode from './TextInputNode';
import MediaNode from './MediaNode';
import ChoiceNode from './ChoiceNode';
import { StartNode, EndNode } from './StructuralNodes';
import { NODE_DEFINITIONS } from './definitions';

// Map of Component Implementations
const componentMap: Record<string, React.ComponentType<any>> = {
    textInput: TextInputNode,
    numberInput: TextInputNode, // Reuse Text for Number for now (or make separate)
    emailInput: TextInputNode,  // Reuse Text for Email
    dateInput: TextInputNode,   // Reuse Text for Date
    
    singleChoice: ChoiceNode,
    multipleChoice: ChoiceNode,
    
    image: MediaNode,
    
    start: StartNode,
    end: EndNode,
    // Branch node to be implemented
};

export const nodeTypes: NodeTypes = componentMap;

// Export definitions for use in Sidebar
export * from './definitions';

