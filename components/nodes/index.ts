import { NodeTypes } from '@xyflow/react';
import TextInputNode from './TextInputNode';
import MediaNode from './MediaNode';
import ChoiceNode from './ChoiceNode';
import { StartNode, EndNode } from './StructuralNodes';
import RatingNode from './RatingNode';
import SliderNode from './SliderNode';
import BranchNode from './BranchNode';
import { NODE_DEFINITIONS } from './definitions';

// Map of Component Implementations
const componentMap: Record<string, React.ComponentType<any>> = {
    textInput: TextInputNode,
    numberInput: TextInputNode, 
    emailInput: TextInputNode,
    dateInput: TextInputNode,
    
    singleChoice: ChoiceNode,
    multipleChoice: ChoiceNode,
    rating: RatingNode,
    slider: SliderNode,
    
    image: MediaNode,
    video: MediaNode, 
    audio: MediaNode, 
    
    start: StartNode,
    end: EndNode,
    branch: BranchNode
};

export const nodeTypes: NodeTypes = componentMap;

// Export definitions for use in Sidebar
export * from './definitions';

