import { describe, it, expect } from "bun:test";
import { DAGReader } from "../src/DagReader";

// Mock Data Builders
const createNode = (id: string, type: string, next: any, data: any = {}) => ({
    id,
    type,
    next,
    data
});

describe("DAGReader Logic Engine", () => {

    describe("Basic Traversal", () => {
        const graph = {
            "start": createNode("start", "start", { kind: "linear", nextId: "n1" }, { label: "Welcome" }),
            "n1": createNode("n1", "textInput", { kind: "linear", nextId: "end" }, { label: "Question 1" }),
            "end": createNode("end", "end", null, {})
        };
        const reader = new DAGReader(graph);

        it("finds the start node", () => {
            const start = reader.getStartNode();
            expect(start.id).toBe("start");
        });

        it("traverses linearly", () => {
            const n1 = reader.getNextNode("start", {});
            expect(n1.id).toBe("n1");
            const end = reader.getNextNode("n1", {});
            expect(end.id).toBe("end");
        });

        it("stops at end", () => {
            const next = reader.getNextNode("end", {});
            expect(next).toBeNull();
        });
    });

    describe("Branching Logic", () => {
        const graph = {
            "start": createNode("start", "start", { kind: "linear", nextId: "q1" }),
            "q1": createNode("q1", "singleChoice", { kind: "linear", nextId: "branch1" }, { 
                options: [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }] 
            }),
            "branch1": createNode("branch1", "branch", { 
                kind: "branch", 
                trueId: "n_true", 
                falseId: "n_false" 
            }, {
                condition: {
                    id: "root",
                    type: "group",
                    logicType: "AND",
                    children: [{
                        type: "rule",
                        field: "q1",
                        operator: "equals",
                        value: "yes",
                        valueType: "static"
                    }]
                }
            }),
            "n_true": createNode("n_true", "textInput", { kind: "linear", nextId: "end" }),
            "n_false": createNode("n_false", "textInput", { kind: "linear", nextId: "end" }),
            "end": createNode("end", "end", null)
        };
        const reader = new DAGReader(graph);

        it("follows True path when condition met", () => {
            // q1 answer is 'yes'
            const responses = { "q1": "yes" };
            
            // We ask getNextNode for "branch1" (Assuming we arrived there)
            // Wait, getNextNode takes (currentNodeId, responses). 
            // If current is q1, next is branch1. 
            // Does getNextNode resolve the branch immediately? 
            // In the source code: Yes, "Auto-traverse branch nodes" is in surveyRunner, 
            // BUT DAGReader.getNextNode returns the raw next node.
            // Wait, looking at getNextNode implementation:
            // if (node.next.kind === 'branch') -> it evaluates and returns trueId/falseId.
            // So calling getNextNode("branch1") is WRONG because branch1 is a node itself?
            // No, branch1 IS the node. So getNextNode("branch1") essentially asks "Where do I go FROM branch1".
            
            // Let's test the jump from q1 through branch1 if they were connected directly?
            // current code logic: 
            // node = get(currentNodeId). 
            // if node.next.kind == branch => evaluate.
            // BUT usually "BranchNode" is a visual node. 
            // If checking 'q1' -> next is 'branch1'. 
            // q1.next is { kind: linear, nextId: branch1 }. 
            // So getNextNode('q1') returns 'branch1'. 
            // THEN getNextNode('branch1') should return true/false target.
            
            const branch = reader.getNextNode("q1", responses);
            expect(branch.id).toBe("branch1");
            
            const destination = reader.getNextNode("branch1", responses);
            expect(destination.id).toBe("n_true");
        });

        it("follows False path when condition not met", () => {
            const responses = { "q1": "no" };
            const destination = reader.getNextNode("branch1", responses);
            expect(destination.id).toBe("n_false");
        });
    });

    describe("Skip Logic (Node Condition)", () => {
        const graph = {
            "start": createNode("start", "start", { kind: "linear", nextId: "q1" }),
            "q1": createNode("q1", "singleChoice", { kind: "linear", nextId: "q2" }, { options: [{label:"A",value:"a"}] }),
            "q2": createNode("q2", "textInput", { kind: "linear", nextId: "end" }, {
                // Skip this node if q1 != 'a' (Show strictly if q1 == 'a')
                // Actually 'condition' on a node usually means "Show if...". 
                // Source code in getNextNode: 
                // if (potentialNextNode.data?.condition) { 
                //   if (!evaluate(condition)) return getNextNode(potentialNextId) // SKIP IT
                // }
                condition: {
                    id: "root",
                    type: "group",
                    logicType: "AND",
                    children: [{
                        type: "rule",
                        field: "q1",
                        operator: "equals",
                        value: "a",
                        valueType: "static"
                    }]
                }
            }),
            "end": createNode("end", "end", null)
        };
        const reader = new DAGReader(graph);

        it("shows q2 if condition is met", () => {
            const responses = { "q1": "a" };
            // From q1, we should go to q2 because condition is met
            const next = reader.getNextNode("q1", responses);
            expect(next.id).toBe("q2");
        });

        it("skips q2 if condition is NOT met", () => {
            const responses = { "q1": "b" };
            // From q1, it tries to go to q2. 
            // q2 condition checks q1==a. It is false.
            // So it recurses and goes to q2's next -> end.
            const next = reader.getNextNode("q1", responses);
            expect(next.id).toBe("end");
        });
    });

    describe("Operators & Types", () => {
        const graph = {
            "start": createNode("start", "start", { kind: "linear", nextId: "logic_test" }),
            "logic_test": createNode("logic_test", "branch", { kind: "branch", trueId: "true", falseId: "false" }, {
                condition: null // Will be rejected if accessed, but we mock the evaluate method usually or just use a helper
            }),
            "true": createNode("true", "end", null),
            "false": createNode("false", "end", null)
        };
        
        // We can access private method by casting to any, or just test via getNextNode behavior
        // To strictly test operators, let's make a helper that creates a graph for a specific rule
        
        const checkRule = (rule: any, responses: any) => {
            const g: any = {
                "start": createNode("start", "start", { kind: "linear", nextId: "branch" }),
                "branch": createNode("branch", "branch", { kind: "branch", trueId: "true", falseId: "false" }, {
                    condition: {
                        id: "root", type: "group", logicType: "AND",
                        children: [rule]
                    }
                }),
                "true": createNode("true", "end", null),
                "false": createNode("false", "end", null)
            };
            return new DAGReader(g).getNextNode("branch", responses).id === "true";
        };

        it("handles 'contains'", () => {
            const rule = { type: "rule", field: "q", operator: "contains", value: "apple", valueType: "static" };
            expect(checkRule(rule, { q: "I like apple pie" })).toBe(true);
            expect(checkRule(rule, { q: "I like banana" })).toBe(false);
        });

        it("handles 'gt' and 'lt'", () => {
            const gt = { type: "rule", field: "age", operator: "gt", value: 18, valueType: "static" };
            expect(checkRule(gt, { age: 21 })).toBe(true);
            expect(checkRule(gt, { age: 10 })).toBe(false);

            const lt = { type: "rule", field: "price", operator: "lt", value: 100, valueType: "static" };
            expect(checkRule(lt, { price: 99 })).toBe(true);
            expect(checkRule(lt, { price: 101 })).toBe(false);
        });

        it("handles 'is_set' and 'is_empty'", () => {
            const isSet = { type: "rule", field: "email", operator: "is_set", value: "", valueType: "static" };
            expect(checkRule(isSet, { email: "a@b.com" })).toBe(true);
            expect(checkRule(isSet, {})).toBe(false);

            const isEmpty = { type: "rule", field: "comment", operator: "is_empty", value: "", valueType: "static" };
            expect(checkRule(isEmpty, { comment: "" })).toBe(true);
            expect(checkRule(isEmpty, { comment: "hello" })).toBe(false);
        });
        
        it("handles 'in_range' for numbers", () => {
            const rule = { type: "rule", field: "score", operator: "in_range", value: "1-10", valueType: "static" };
            expect(checkRule(rule, { score: 5 })).toBe(true);
            expect(checkRule(rule, { score: 11 })).toBe(false);
        });
    });

    describe("Dropdown & Label Resolution Logic", () => {
        // Dropdown Logic should be identical to Single Choice, but let's verify label matching
        const graph = {
            "start": createNode("start", "start", { kind: "linear", nextId: "dd" }),
            "dd": createNode("dd", "dropdown", { kind: "linear", nextId: "branch" }, {
                options: [
                    { label: "United States", value: "US" },
                    { label: "Canada", value: "CA" }
                ],
                otherLabel: "Other Country",
                allowOther: true
            }),
            "branch": createNode("branch", "branch", { kind: "branch", trueId: "US_Route", falseId: "Intl_Route" }, {
                condition: {
                    id: "root", type: "group", logicType: "AND",
                    children: [{
                        type: "rule", field: "dd", operator: "equals", value: "US", valueType: "static"
                    }]
                }
            }),
            "US_Route": createNode("US_Route", "end", null),
            "Intl_Route": createNode("Intl_Route", "end", null)
        };
        const reader = new DAGReader(graph);

        it("matches by value (US)", () => {
            expect(reader.getNextNode("branch", { dd: "US" }).id).toBe("US_Route");
        });

        it("matches by label (United States) [Resilience]", () => {
             // DAGReader has logic to normalize labels to values
             expect(reader.getNextNode("branch", { dd: "United States" }).id).toBe("US_Route");
        });

        it("fails on mismatch", () => {
             expect(reader.getNextNode("branch", { dd: "CA" }).id).toBe("Intl_Route");
        });
    });

    describe("Complex Node Logic", () => {
        const graph = {
            "start": createNode("start", "start", { kind: "linear", nextId: "matrix" }),
            "matrix": createNode("matrix", "matrixChoice", { kind: "linear", nextId: "branch_m" }, { 
                rows: [{ label: "Quality", value: "qual" }, { label: "Price", value: "price" }],
                columns: [{ label: "Low", value: "1" }, { label: "High", value: "5" }]
            }),
            "branch_m": createNode("branch_m", "branch", { kind: "branch", trueId: "High_Qual", falseId: "Low_Qual" }, {
                condition: {
                    id: "root", type: "group", logicType: "AND",
                    children: [{
                        type: "rule", field: "matrix", subField: "qual", operator: "equals", value: "5", valueType: "static"
                    }]
                }
            }),
            "High_Qual": createNode("High_Qual", "end", null),
            "Low_Qual": createNode("Low_Qual", "end", null),

            // Cascade Test
            "cascade": createNode("cascade", "cascadingChoice", { kind: "linear", nextId: "branch_c" }, {
                steps: [] // simplified
            }),
            "branch_c": createNode("branch_c", "branch", { kind: "branch", trueId: "Selected_BMW", falseId: "Other_Car" }, {
                condition: {
                     id: "root2", type: "group", logicType: "AND",
                     children: [{
                         type: "rule", field: "cascade", operator: "equals", value: "BMW", valueType: "static"
                     }]
                }
            }),
            "Selected_BMW": createNode("Selected_BMW", "end", null),
            "Other_Car": createNode("Other_Car", "end", null)
        };
        const reader = new DAGReader(graph);

        it("handles Matrix subfield logic", () => {
            // User rated Quality(qual) as 5, Price as 1
            const responses = { "matrix": { "qual": "5", "price": "1" } };
            const next = reader.getNextNode("branch_m", responses);
            expect(next.id).toBe("High_Qual");

            // User rated Quality(qual) as 1
            const responses2 = { "matrix": { "qual": "1" } };
            const next2 = reader.getNextNode("branch_m", responses2);
            expect(next2.id).toBe("Low_Qual");
        });

        it("handles Cascading array logic (match on any level)", () => {
            // User selected Cars -> BMW -> X5
            const responses = { "cascade": ["Cars", "BMW", "X5"] };
            const next = reader.getNextNode("branch_c", responses);
            expect(next.id).toBe("Selected_BMW");
            
            // User selected Cars -> Audi -> Q7
            const responses2 = { "cascade": ["Cars", "Audi", "Q7"] };
            const next2 = reader.getNextNode("branch_c", responses2);
            expect(next2.id).toBe("Other_Car");
        });
    });
});

