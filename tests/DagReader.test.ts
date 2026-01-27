import { expect, test, describe } from "bun:test";
import { DAGReader } from "../lib/engine/DagReader";

describe("DAGReader", () => {
    const mockGraph = {
        "start_1": {
            id: "start_1",
            type: "start",
            data: { label: "Start" },
            next: { kind: "linear", nextId: "q_1" }
        },
        "q_1": {
            id: "q_1",
            type: "textInput",
            data: { label: "Age" },
            next: { kind: "linear", nextId: "b_1" }
        },
        "b_1": {
            id: "b_1",
            type: "branch",
            data: {
                condition: {
                    id: "root",
                    type: "group",
                    logicType: "AND",
                    children: [
                        {
                            id: "r_1",
                            type: "rule",
                            field: "q_1",
                            operator: "gt",
                            value: "18",
                            valueType: "static"
                        }
                    ]
                }
            },
            next: { kind: "branch", trueId: "end_success", falseId: "end_fail" }
        },
        "end_success": {
            id: "end_success",
            type: "end",
            data: { label: "Success" },
            next: { kind: "linear", nextId: null }
        },
        "end_fail": {
            id: "end_fail",
            type: "end",
            data: { label: "Fail" },
            next: { kind: "linear", nextId: null }
        }
    };

    test("should traverse linear flow", () => {
        const reader = new DAGReader(mockGraph);
        const start = reader.getStartNode();
        expect(start.id).toBe("start_1");

        const next = reader.getNextNode("start_1", {});
        expect(next.id).toBe("q_1");
    });

    test("should follow TRUE branch when condition met", () => {
        const reader = new DAGReader(mockGraph);
        const responses = { "q_1": "25" };
        const next = reader.getNextNode("b_1", responses);
        expect(next.id).toBe("end_success");
    });

    test("should follow FALSE branch when condition not met", () => {
        const reader = new DAGReader(mockGraph);
        const responses = { "q_1": "15" };
        const next = reader.getNextNode("b_1", responses);
        expect(next.id).toBe("end_fail");
    });

    test("should handle numerical strings correctly in gt operator", () => {
        const reader = new DAGReader(mockGraph);
        // Numerical comparison: 2 > 1.5 is true, but string "2" > "1.5" is also true.
        // What about 10 > 2? String "10" < "2" alphabetically, but we want numeric.
        const responses = { "q_1": "10" };
        const next = reader.getNextNode("b_1", responses);
        expect(next.id).toBe("end_fail"); // Because 10 is not gt 18.
        
        // Let's change rule to check 10 vs 2
        const graph2 = JSON.parse(JSON.stringify(mockGraph));
        graph2.b_1.data.condition.children[0].value = "2";
        const reader2 = new DAGReader(graph2);
        const next2 = reader2.getNextNode("b_1", { "q_1": "10" });
        expect(next2.id).toBe("end_success"); // 10 > 2
    });

    test("should throw error on missing start node", () => {
        expect(() => new DAGReader({}).getStartNode()).toThrow("Start node missing");
    });

    test("should detect cycles during traversal", () => {
        const cycleGraph = {
            "start_1": {
                id: "start_1",
                type: "start",
                next: { kind: "linear", nextId: "q_1" }
            },
            "q_1": {
                id: "q_1",
                type: "textInput",
                next: { kind: "linear", nextId: "q_1" } // Self loop
            }
        };
        const reader = new DAGReader(cycleGraph);
        expect(() => reader.getTakenPath({})).toThrow("Cycle detected");
    });

    test("should return false (end_fail) on missing variable in condition", () => {
        const reader = new DAGReader(mockGraph);
        const next = reader.getNextNode("b_1", {});
        expect(next.id).toBe("end_fail");
    });
});
