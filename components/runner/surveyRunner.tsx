"use client"

import { surveyWorkflowApi } from "@/api/surveyWorkflow"
import { useEffect, useState } from "react"

export const SurveyRunner = ({ id }: { id: string }) => {
    const [workflow, setWorkflow] = useState<any>(null);

    useEffect(() => {
        if (!id) return;

        (async () => {
            const response = await surveyWorkflowApi.getLatestWorkflowBySurveyId(id);
            const runtimeJson = response.runtimeJson;
            setWorkflow(runtimeJson);
        })()
    }, [id])

    if (!workflow) return <div>Loading...</div>

    return (
        <div className="p-10">
            <h1 className="text-xl font-bold mb-4">Survey Runtime JSON:</h1>
            <pre className="p-4 bg-muted rounded-lg overflow-auto max-h-[80vh] text-xs">
                {JSON.stringify(workflow, null, 2)}
            </pre>
        </div>
    )
}