"use client"
import { use } from "react"
import { SurveyRunner } from "@/components/surveyRunner"

export default function SurveyPage({ params, searchParams }: {
    params: Promise<{ id: string }>,
    searchParams: Promise<{ mode?: string }>
}) {
    const { id } = use(params)
    const { mode } = use(searchParams)

    return (
        <main className="min-h-screen bg-background">
            <SurveyRunner id={id} mode={mode || "LIVE"} />
        </main>
    )
}
