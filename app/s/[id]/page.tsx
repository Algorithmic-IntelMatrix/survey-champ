import { SurveyRunner } from "@/components/runner/surveyRunner";
import { Suspense } from "react";

export default async function PublicSurveyPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ mode?: string }> }) {
    const { id } = await params;
    const { mode } = await searchParams;

    return (
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-white"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
            <SurveyRunner id={id} mode={mode || 'LIVE'} />
        </Suspense>
    );
}
