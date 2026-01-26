import { SurveyRunner } from "@/components/runner/surveyRunner";


export default async function SurveyRunnerPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <SurveyRunner id={id} />
}