import { SurveyRunner } from "@/components/runner/surveyRunner";


export default async function SurveyRunnerPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ mode?: string }> }) {
    const { id } = await params;
    const { mode } = await searchParams;
    return <SurveyRunner id={id} mode={mode} />
}