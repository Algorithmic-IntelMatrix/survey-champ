import { IconTextCaption, IconNumbers, IconMail, IconCalendar, IconListDetails, IconCheckbox, IconStar, IconArrowMerge, IconForbid, IconPhoto, IconForms, IconListCheck, IconGitBranch } from '@tabler/icons-react';

export type NodeCategory = 'input' | 'choice' | 'logic' | 'media';

export interface NodeDefinition {
    type: string;
    label: string;
    description: string;
    icon: React.ElementType;
    category: NodeCategory;
    component?: React.ComponentType<any>; 
}

// Category Configuration
export const CATEGORY_CONFIG: Record<NodeCategory, { label: string, icon: React.ElementType }> = {
    input: { label: 'Input Fields', icon: IconForms },
    choice: { label: 'Choices', icon: IconListCheck },
    logic: { label: 'Logic', icon: IconGitBranch },
    media: { label: 'Media', icon: IconPhoto }
};

// Node Definitions Registry
// This is the single source of truth for all node types in the system
export const NODE_DEFINITIONS: NodeDefinition[] = [
    // Inputs
    { type: 'textInput', label: 'Text Answer', description: 'Capture short or long text responses', icon: IconTextCaption, category: 'input' },
    { type: 'numberInput', label: 'Number', description: 'Input for numerical values', icon: IconNumbers, category: 'input' },
    { type: 'emailInput', label: 'Email', description: 'Validate email addresses', icon: IconMail, category: 'input' },
    { type: 'dateInput', label: 'Date Picker', description: 'Select dates from a calendar', icon: IconCalendar, category: 'input' },

    // Choices
    { type: 'singleChoice', label: 'Single Choice', description: 'Select one option from a list', icon: IconListDetails, category: 'choice' },
    { type: 'multipleChoice', label: 'Multiple Choice', description: 'Select multiple options', icon: IconCheckbox, category: 'choice' },
    { type: 'rating', label: 'Rating', description: 'Star or number rating scale', icon: IconStar, category: 'choice' },

    // Logic
    { type: 'branch', label: 'Branch', description: 'Split flow based on conditions', icon: IconArrowMerge, category: 'logic' },
    { type: 'end', label: 'End Screen', description: 'Terminate the survey flow', icon: IconForbid, category: 'logic' },

    // Media
    { type: 'image', label: 'Image', description: 'Display an image or banner', icon: IconPhoto, category: 'media' },
];

export const getNodeDefinition = (type: string) => NODE_DEFINITIONS.find(n => n.type === type);
