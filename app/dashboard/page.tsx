"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { surveyApi, Survey } from "@/api/survey";
import { toast } from "sonner";
import { IconPlus, IconLogout, IconClipboardList, IconChevronRight } from "@tabler/icons-react";

export default function Dashboard() {
    const router = useRouter();
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSurveys();
    }, []);

    const fetchSurveys = async () => {
        try {
            const data = await surveyApi.getSurveys();
            setSurveys(data);
        } catch (error) {
            console.error("Failed to fetch surveys:", error);
            toast.error("Failed to load surveys");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/");
    };

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-12">
            {/* Header */}
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-neutral-500 bg-clip-text text-transparent">
                        Your Surveys
                    </h1>
                    <p className="mt-2 text-neutral-400">
                        Manage and monitor your active survey campaigns
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push("/dashboard/new")}
                        className="flex items-center gap-2 px-6 py-2.5 bg-white text-black font-semibold rounded-full hover:bg-neutral-200 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95"
                    >
                        <IconPlus size={20} />
                        Create Survey
                    </button>

                    <button
                        onClick={handleLogout}
                        className="p-2.5 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-full transition-all"
                        title="Logout"
                    >
                        <IconLogout size={22} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-48 bg-neutral-900/50 rounded-2xl animate-pulse border border-neutral-800" />
                        ))}
                    </div>
                ) : surveys.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {surveys.map((survey) => (
                            <div
                                key={survey.id}
                                className="group relative bg-neutral-900/40 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-6 transition-all duration-300 hover:bg-neutral-900/60"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                                        <IconClipboardList size={24} />
                                    </div>
                                    <span className="text-xs font-medium text-neutral-500 bg-neutral-800/50 px-2 py-1 rounded-md">
                                        {new Date(survey.createdAt).toLocaleDateString()}
                                    </span>
                                </div>

                                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">
                                    {survey.name}
                                </h3>

                                <p className="text-neutral-400 text-sm line-clamp-2 mb-6">
                                    {survey.description || "No description provided"}
                                </p>

                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-neutral-800/50">
                                    <span className="text-xs text-neutral-500 font-medium">
                                        Client: {survey.client}
                                    </span>
                                    <button
                                        onClick={() => router.push(`/dashboard/surveys/${survey.id}`)}
                                        className="flex items-center gap-1 text-sm font-semibold text-white/70 hover:text-white transition-colors"
                                    >
                                        Details <IconChevronRight size={16} />
                                    </button>
                                </div>

                                {/* Hover Gradient Effect */}
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-neutral-900/20 border border-dashed border-neutral-800 rounded-3xl">
                        <div className="inline-flex items-center justify-center p-4 bg-neutral-900 rounded-2xl text-neutral-500 mb-4">
                            <IconClipboardList size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No surveys yet</h3>
                        <p className="text-neutral-400 mb-8 max-w-sm mx-auto">
                            Get started by creating your first survey campaign to gather valuable insights.
                        </p>
                        <button
                            onClick={() => router.push("/dashboard/new")}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-neutral-800 text-white font-semibold rounded-full hover:bg-neutral-700 transition-all"
                        >
                            <IconPlus size={20} />
                            Create First Survey
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}