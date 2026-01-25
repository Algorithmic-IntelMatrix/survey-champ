import React, { useMemo } from 'react';
import { Node } from '@xyflow/react';
import { getNodeDefinition } from '@/components/nodes/definitions';
import { IconTrash, IconPlus, IconVariable, IconTypography } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface LogicRule {
    id: string; // Unique ID for keying
    field: string;
    operator: string;
    value: any;
    valueType: 'static' | 'variable'; // Compare against static value or another node
}

interface LogicGroup {
    logicType: 'AND' | 'OR'; // Match ALL or Match ANY
    rules: LogicRule[];
}

interface ConditionBuilderProps {
    value: LogicGroup;
    onChange: (val: LogicGroup) => void;
    nodes: Node[];
}

const OPERATORS = [
    { label: 'Equals', value: 'equals' },
    { label: 'Does not equal', value: 'not_equals' },
    { label: 'Contains', value: 'contains' },
    { label: 'Does not contain', value: 'not_contains' },
    { label: 'Greater than', value: 'gt' },
    { label: 'Less than', value: 'lt' },
    { label: 'Is Set (Answered)', value: 'is_set' },
    { label: 'Is Empty', value: 'is_empty' },
];

export const ConditionBuilder = ({ value, onChange, nodes }: ConditionBuilderProps) => {
    // Determine valid Input/Choice nodes
    const validQuestions = useMemo(() => {
        return nodes.filter(n => {
            const def = getNodeDefinition(n.type || '');
            return def && (def.category === 'input' || def.category === 'choice') && n.id !== 'current';
        });
    }, [nodes]);

    // Initialize if empty / old format
    const group: LogicGroup = (value && value.rules) ? value : {
        logicType: 'AND',
        rules: [{ id: 'r1', field: '', operator: 'equals', value: '', valueType: 'static' }]
    };

    const updateGroup = (newGroup: LogicGroup) => {
        onChange(newGroup);
    };

    const addRule = () => {
        const newRule: LogicRule = {
            id: `r${Date.now()}`,
            field: '',
            operator: 'equals',
            value: '',
            valueType: 'static'
        };
        updateGroup({ ...group, rules: [...group.rules, newRule] });
    };

    const removeRule = (ruleId: string) => {
        updateGroup({ ...group, rules: group.rules.filter(r => r.id !== ruleId) });
    };

    const updateRule = (ruleId: string, updates: Partial<LogicRule>) => {
        updateGroup({
            ...group,
            rules: group.rules.map(r => r.id === ruleId ? { ...r, ...updates } : r)
        });
    };

    return (
        <div className="space-y-3 p-3 bg-muted/30 rounded-md border border-border">
            {/* Logic Type Toggle */}
            <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Match</span>
                <div className="flex bg-background border border-input rounded-md overflow-hidden h-6">
                    <button
                        onClick={() => updateGroup({ ...group, logicType: 'AND' })}
                        className={cn("px-2 text-[10px] font-medium transition-colors", group.logicType === 'AND' ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                    >
                        ALL
                    </button>
                    <div className="w-[1px] bg-border" />
                    <button
                        onClick={() => updateGroup({ ...group, logicType: 'OR' })}
                        className={cn("px-2 text-[10px] font-medium transition-colors", group.logicType === 'OR' ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                    >
                        ANY
                    </button>
                </div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">of the following:</span>
            </div>

            {/* Rules List */}
            <div className="space-y-2">
                {group.rules.map((rule, index) => (
                    <RuleRow
                        key={rule.id}
                        rule={rule}
                        index={index}
                        onUpdate={(updates) => updateRule(rule.id, updates)}
                        onRemove={() => removeRule(rule.id)}
                        validQuestions={validQuestions}
                    />
                ))}
            </div>

            <button
                onClick={addRule}
                className="flex items-center gap-1 text-xs text-primary font-medium hover:underline mt-2"
            >
                <IconPlus size={12} /> Add Condition
            </button>
        </div>
    );
};

// Sub-component for individual rule row to keep things clean
const RuleRow = ({ rule, index, onUpdate, onRemove, validQuestions }: {
    rule: LogicRule, index: number, onUpdate: (u: Partial<LogicRule>) => void, onRemove: () => void, validQuestions: Node[]
}) => {

    // Find the currently selected question (Source)
    const selectedQuestion = validQuestions.find(n => n.id === rule.field);
    const questionOptions = selectedQuestion?.data?.options as any[];

    return (
        <div className="relative pl-3 border-l-2 border-border/50 group/row">
            {/* Delete Button (hover) */}
            <button
                onClick={onRemove}
                className="absolute right-0 top-0 p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover/row:opacity-100 transition-opacity"
            >
                <IconTrash size={12} />
            </button>

            <div className="space-y-2 pr-4">
                {/* Field & Operator Row */}
                <div className="grid grid-cols-2 gap-2">
                    <select
                        className="w-full text-[10px] p-1.5 rounded-md border border-input bg-background"
                        value={rule.field}
                        onChange={(e) => onUpdate({ field: e.target.value })}
                    >
                        <option value="">Select Question...</option>
                        {validQuestions.map(n => (
                            <option key={n.id} value={n.id}>{String(n.data.label || n.id)}</option>
                        ))}
                    </select>

                    <select
                        className="w-full text-[10px] p-1.5 rounded-md border border-input bg-background"
                        value={rule.operator}
                        onChange={(e) => onUpdate({ operator: e.target.value })}
                    >
                        {OPERATORS.map(op => (
                            <option key={op.value} value={op.value}>{op.label}</option>
                        ))}
                    </select>
                </div>

                {/* Value Row (if not unary operator) */}
                {!['is_set', 'is_empty'].includes(rule.operator) && (
                    <div className="flex gap-1 items-center">
                        {/* Toggle Value Type (Static vs Variable) */}
                        <button
                            className="shrink-0 p-1.5 rounded border border-input bg-background text-muted-foreground hover:text-primary transition-colors"
                            onClick={() => onUpdate({ valueType: rule.valueType === 'static' ? 'variable' : 'static', value: '' })}
                            title={rule.valueType === 'static' ? "Switch to Variable" : "Switch to Static Value"}
                        >
                            {rule.valueType === 'static' ? <IconTypography size={12} /> : <IconVariable size={12} />}
                        </button>

                        <div className="flex-1">
                            {/* Variable Mode */}
                            {rule.valueType === 'variable' ? (
                                <select
                                    className="w-full text-[10px] p-1.5 rounded-md border border-input bg-background"
                                    value={rule.value}
                                    onChange={(e) => onUpdate({ value: e.target.value })}
                                >
                                    <option value="">Compare with...</option>
                                    {validQuestions.filter(n => n.id !== rule.field).map(n => ( // Don't compare with self
                                        <option key={n.id} value={n.id}>{String(n.data.label || n.id)}</option>
                                    ))}
                                </select>
                            ) : (
                                /* Static Mode */
                                questionOptions && questionOptions.length > 0 ? (
                                    <select
                                        className="w-full text-[10px] p-1.5 rounded-md border border-input bg-background"
                                        value={rule.value}
                                        onChange={(e) => onUpdate({ value: e.target.value })}
                                    >
                                        <option value="">Select Option...</option>
                                        {questionOptions.map((opt: any, i: number) => (
                                            <option key={i} value={opt.label || opt.value}>
                                                {opt.label || opt.value}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        className="w-full text-[10px] p-1.5 rounded-md border border-input bg-background placeholder:text-muted-foreground/50"
                                        placeholder="Value..."
                                        value={rule.value}
                                        onChange={(e) => onUpdate({ value: e.target.value })}
                                    />
                                )
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
