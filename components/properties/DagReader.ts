import { LogicGroup, LogicRule } from "@/components/nodes/definitions";

export class DAGReader {
    private graph: Record<string, any>;

    constructor(graph: Record<string, any>) {
        this.graph = graph;
        this.validateGraphIdentity();
    }

    /**
     * Ensures all nodes in the graph have their own ID as a property and matches the key.
     */
    private validateGraphIdentity() {
        for (const [key, node] of Object.entries(this.graph)) {
            if (node.id !== key) {
                console.warn(`Node identity mismatch: key ${key} vs node.id ${node.id}`);
            }
        }
    }

    /**
     * Finds the starting node of the survey.
     */
    getStartNode() {
        const startNodes = Object.values(this.graph).filter(node => node.type === 'start');
        if (startNodes.length === 0) throw new Error("Start node missing in workflow.");
        if (startNodes.length > 1) throw new Error("Multiple start nodes found. Workflow invalid.");
        return startNodes[0];
    }

    /**
     * Returns the node object for a given ID.
     */
    getNode(id: string) {
        return this.graph[id] || null;
    }

    /**
     * Determines the next node in the flow based on current node and user responses.
     */
    getNextNode(currentNodeId: string, responses: Record<string, any>) {
        const node = this.graph[currentNodeId];
        if (!node) return null;

        const next = node.next;
        if (!next) return null;

        if (next.kind === 'branch') {
            const condition = node.data?.condition as LogicGroup;
            if (!condition || !condition.children || condition.children.length === 0) {
                throw new Error(`Branch node ${currentNodeId} has no condition defined.`);
            }
            const isTrue = this.evaluateCondition(condition, responses);
            const nextId = isTrue ? next.trueId : next.falseId;
            return nextId ? this.graph[nextId] : null;
        } else {
            // Linear connection
            const nextId = next.nextId;
            return nextId ? this.graph[nextId] : null;
        }
    }

    /**
     * Evaluates a complex logic group (AND/OR) against stored responses.
     */
    private evaluateCondition(group: LogicGroup | null | undefined, responses: Record<string, any>): boolean {
        if (!group || !group.children || group.children.length === 0) {
            throw new Error("Cannot evaluate an empty condition group.");
        }

        const results = group.children.map(child => {
            if (child.type === 'group') {
                return this.evaluateCondition(child as LogicGroup, responses);
            } else {
                return this.evaluateRule(child as LogicRule, responses);
            }
        });

        if (group.logicType === 'OR') {
            return results.some(r => r === true);
        } else {
            return results.every(r => r === true);
        }
    }

    /**
     * Evaluates a single logic rule against user responses.
     */
    private evaluateRule(rule: LogicRule, responses: Record<string, any>): boolean {
        if (!(rule.field in responses)) {
            throw new Error(`Referenced field '${rule.field}' is missing from responses.`);
        }

        let value = responses[rule.field];

        // Handle subfield (e.g. for Matrix nodes)
        if (rule.subField && typeof value === 'object' && value !== null) {
            value = value[rule.subField];
        }

        let targetValue = rule.value;
        if (rule.valueType === 'variable') {
            if (!(rule.value in responses)) {
                throw new Error(`Referenced variable '${rule.value}' is missing from responses.`);
            }
            targetValue = responses[rule.value];
        }

        const normStr = (v: any) => (v === undefined || v === null) ? '' : String(v).toLowerCase();

        switch (rule.operator) {
            case 'equals':
                return normStr(value) === normStr(targetValue);
            case 'not_equals':
                return normStr(value) !== normStr(targetValue);
            case 'contains':
                if (Array.isArray(value)) return value.some(v => normStr(v) === normStr(targetValue));
                return normStr(value).includes(normStr(targetValue));
            case 'not_contains':
                if (Array.isArray(value)) return !value.some(v => normStr(v) === normStr(targetValue));
                return !normStr(value).includes(normStr(targetValue));
            case 'gt':
                return Number(value) > Number(targetValue);
            case 'lt':
                return Number(value) < Number(targetValue);
            case 'is_set':
                return value !== undefined && value !== null && value !== '';
            case 'is_empty':
                return value === undefined || value === null || value === '';
            case 'is_between':
                if (typeof targetValue === 'object' && targetValue !== null) {
                    const num = Number(value);
                    const min = Number(targetValue.min);
                    const max = Number(targetValue.max);
                    return !isNaN(num) && num >= min && num <= max;
                }
                return false;
            case 'in_range':
                if (typeof targetValue === 'string') {
                    const ranges = targetValue.split(',').map(s => s.trim());
                    return ranges.some(range => {
                        if (range.includes('-')) {
                            const [start, end] = range.split('-').map(Number);
                            const num = Number(value);
                            return !isNaN(num) && num >= start && num <= end;
                        }
                        return normStr(value) === normStr(range);
                    });
                }
                return false;
            default:
                return false;
        }
    }

    /**
     * Trace the path taken for a set of responses, with cycle protection.
     */
    getTakenPath(responses: Record<string, any>) {
        const path = [];
        const visited = new Set<string>();
        let current = this.getStartNode();

        while (current) {
            if (visited.has(current.id)) {
                throw new Error(`Cycle detected at node ${current.id} during runtime traversal.`);
            }
            visited.add(current.id);
            path.push(current);

            if (current.type === 'end') break;
            
            // In runtime JSON, the node has 'id'. getNextNode handles the lookup.
            const nextNode = this.getNextNode(current.id, responses);
            current = nextNode;
        }

        return path;
    }
}
