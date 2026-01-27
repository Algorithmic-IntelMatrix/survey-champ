"use client"
import { use } from "react"
import { SurveyRunner } from "@/components/surveyRunner"

export default function SurveyPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)

    return (
        <main className="min-h-screen bg-background">
            <SurveyRunner id={id} mode="LIVE" />
        </main>
    )
}
