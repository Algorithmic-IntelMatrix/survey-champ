import { expect, test, describe } from "bun:test";
import { validateWorkflow } from "../lib/validate-workflow";
import { Node, Edge } from "@xyflow/react";

describe("validateWorkflow", () => {
    test("should fail if no start node", () => {
        const nodes: Node[] = [{ id: "end", type: "end", data: { redirectUrl: "..." }, position: { x: 0, y: 0 } }];
        const { isValid, errors } = validateWorkflow(nodes, []);
        expect(isValid).toBe(false);
        expect(errors.some(e => e.message.includes("exactly one Start node"))).toBe(true);
    });

    test("should detect cycles", () => {
        const nodes: Node[] = [
            { id: "start", type: "start", data: {}, position: { x: 0, y: 0 } },
            { id: "q1", type: "textInput", data: { label: "Q1" }, position: { x: 0, y: 0 } }
        ];
        const edges: Edge[] = [
            { id: "e1", source: "start", target: "q1" },
            { id: "e2", source: "q1", target: "q1" }
        ];
        const { isValid, errors } = validateWorkflow(nodes, edges);
        expect(isValid).toBe(false);
        expect(errors.some(e => e.message.includes("cycle"))).toBe(true);
    });

    test("should detect unreachable nodes", () => {
        const nodes: Node[] = [
            { id: "start", type: "start", data: {}, position: { x: 0, y: 0 } },
            { id: "end", type: "end", data: { redirectUrl: "..." }, position: { x: 0, y: 0 } },
            { id: "ghost", type: "textInput", data: { label: "Ghost" }, position: { x: 0, y: 0 } }
        ];
        const edges: Edge[] = [{ id: "e1", source: "start", target: "end" }];
        const { isValid, errors } = validateWorkflow(nodes, edges);
        expect(isValid).toBe(false);
        expect(errors.some(e => e.message.includes("not reachable from the Start"))).toBe(true);
    });

    test("should detect causal ordering violation", () => {
        const nodes: Node[] = [
            { id: "start", type: "start", data: {}, position: { x: 0, y: 0 } },
            { id: "branch", type: "branch", data: { 
                condition: { 
                    id: "root", type: "group", children: [{ type: "rule", field: "later_q", operator: "is_set" }] 
                } 
            }, position: { x: 0, y: 0 } },
            { id: "later_q", type: "textInput", data: { label: "Later" }, position: { x: 0, y: 0 } },
            { id: "end", type: "end", data: { redirectUrl: "..." }, position: { x: 0, y: 0 } }
        ];
        const edges: Edge[] = [
            { id: "e1", source: "start", target: "branch" },
            { id: "e2", source: "branch", target: "later_q", sourceHandle: "true" },
            { id: "e3", source: "branch", target: "end", sourceHandle: "false" },
            { id: "e4", source: "later_q", target: "end" }
        ];
        const { isValid, errors } = validateWorkflow(nodes, edges);
        expect(isValid).toBe(false);
        expect(errors.some(e => e.message.includes("not guaranteed to be answered before this branch"))).toBe(true);
    });
});
