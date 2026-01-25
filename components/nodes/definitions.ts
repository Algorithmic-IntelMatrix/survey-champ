import { IconTextCaption, IconNumbers, IconMail, IconCalendar, IconListDetails, IconCheckbox, IconStar, IconArrowMerge, IconForbid, IconPhoto, IconForms, IconListCheck, IconGitBranch } from '@tabler/icons-react';

export type NodeCategory = 'input' | 'choice' | 'logic' | 'media';
export type PropertyType = 'text' | 'textarea' | 'number' | 'switch' | 'select' | 'color' | 'options';

export interface PropertyField {
    name: string;
    label: string;
    type: PropertyType;
    placeholder?: string;
    helperText?: string;
    defaultValue?: any;
    options?: { label: string, value: string }[]; // For select type
}

export interface NodeDefinition {
    type: string;
    label: string;
    description: string;
    icon: React.ElementType;
    category: NodeCategory;
    component?: React.ComponentType<any>; 
    properties: PropertyField[];
}

// Category Configuration
export const CATEGORY_CONFIG: Record<NodeCategory, { label: string, icon: React.ElementType }> = {
    input: { label: 'Input Fields', icon: IconForms },
    choice: { label: 'Choices', icon: IconListCheck },
    logic: { label: 'Logic', icon: IconGitBranch },
    media: { label: 'Media', icon: IconPhoto }
};

// Common properties used across multiple nodes
const commonProperties: PropertyField[] = [
    { name: 'label', label: 'Field Label', type: 'text', placeholder: 'e.g., What is your name?', defaultValue: 'New Question' },
    { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Helper text for the user', defaultValue: '' },
    { name: 'required', label: 'Required', type: 'switch', defaultValue: false },
];

export const NODE_DEFINITIONS: NodeDefinition[] = [
    // Inputs
    { 
        type: 'textInput', 
        label: 'Text Answer', 
        description: 'Capture short or long text responses', 
        icon: IconTextCaption, 
        category: 'input',
        properties: [
            ...commonProperties,
            { name: 'placeholder', label: 'Placeholder', type: 'text', placeholder: 'e.g., Type here...', defaultValue: '' }
        ]
    },
    { 
        type: 'numberInput', 
        label: 'Number', 
        description: 'Input for numerical values', 
        icon: IconNumbers, 
        category: 'input',
        properties: [
            ...commonProperties,
            { name: 'min', label: 'Minimum Value', type: 'number' },
            { name: 'max', label: 'Maximum Value', type: 'number' }
        ]
    },
    { 
        type: 'emailInput', 
        label: 'Email', 
        description: 'Validate email addresses', 
        icon: IconMail, 
        category: 'input',
        properties: [...commonProperties]
    },
    { 
        type: 'dateInput', 
        label: 'Date Picker', 
        description: 'Select dates from a calendar', 
        icon: IconCalendar, 
        category: 'input',
        properties: [...commonProperties]
    },

    // Choices
    { 
        type: 'singleChoice', 
        label: 'Single Choice', 
        description: 'Select one option from a list', 
        icon: IconListDetails, 
        category: 'choice',
        properties: [
            ...commonProperties,
            { name: 'options', label: 'Options', type: 'options', defaultValue: [{ label: 'Option 1', value: 'option1' }, { label: 'Option 2', value: 'option2' }] }
        ]
    },
    { 
        type: 'multipleChoice', 
        label: 'Multiple Choice', 
        description: 'Select multiple options', 
        icon: IconCheckbox, 
        category: 'choice',
        properties: [
            ...commonProperties,
            { name: 'options', label: 'Options', type: 'options', defaultValue: [{ label: 'Option 1', value: 'option1' }, { label: 'Option 2', value: 'option2' }] }
        ]
    },
    { 
        type: 'rating', 
        label: 'Rating', 
        description: 'Star or number rating scale', 
        icon: IconStar, 
        category: 'choice',
        properties: [
            ...commonProperties,
            { name: 'maxRating', label: 'Max Rating', type: 'number', defaultValue: 5 }
        ]
    },

    // Logic
    { 
        type: 'branch', 
        label: 'Branch', 
        description: 'Split flow based on conditions', 
        icon: IconArrowMerge, 
        category: 'logic',
        properties: [
            { name: 'condition', label: 'Condition', type: 'text', placeholder: 'e.g. age > 18' }
        ]
    },
    { 
        type: 'end', 
        label: 'End Screen', 
        description: 'Terminate the survey flow', 
        icon: IconForbid, 
        category: 'logic',
        properties: [
            { name: 'message', label: 'Thank You Message', type: 'textarea', defaultValue: 'Thank you for completing the survey!' }
        ]
    },

    // Media
    { 
        type: 'image', 
        label: 'Image', 
        description: 'Display an image or banner', 
        icon: IconPhoto, 
        category: 'media',
        properties: [
            { name: 'url', label: 'Image URL', type: 'text', placeholder: 'https://...' },
            { name: 'alt', label: 'Alt Text', type: 'text' }
        ]
    },
];

// Helper to get initial data with defaults
export const getNodeInitialData = (type: string) => {
    const def = NODE_DEFINITIONS.find(n => n.type === type);
    if (!def) return { label: 'New Node' };

    const defaults: Record<string, any> = {};
    def.properties.forEach(prop => {
        if (prop.defaultValue !== undefined) {
            defaults[prop.name] = prop.defaultValue;
        }
    });

    return {
        label: def.label,
        ...defaults
    };
};

export const getNodeDefinition = (type: string) => NODE_DEFINITIONS.find(n => n.type === type);
