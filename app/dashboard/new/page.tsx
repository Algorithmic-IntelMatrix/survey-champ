"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { surveyApi } from "@/api/survey";
import { toast } from "sonner";
import { IconArrowLeft, IconCheck } from "@tabler/icons-react";

export default function NewSurvey() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        client: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await surveyApi.createSurvey(formData);
            toast.success("Survey created successfully!");
            router.push("/dashboard");
        } catch (error) {
            console.error("Failed to create survey:", error);
            toast.error("Failed to create survey. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-12">
            <div className="max-w-2xl mx-auto">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-neutral-400 hover:text-white mb-8 transition-colors group"
                >
                    <IconArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Dashboard
                </button>

                <div className="bg-neutral-900/40 border border-neutral-800 rounded-3xl p-8 md:p-12">
                    <h1 className="text-3xl font-bold mb-2">Create New Survey</h1>
                    <p className="text-neutral-400 mb-10">Fill in the details below to launch your new survey campaign.</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-medium text-neutral-300 ml-1">
                                Survey Name
                            </label>
                            <input
                                id="name"
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Q1 Product Feedback"
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="client" className="text-sm font-medium text-neutral-300 ml-1">
                                Client Name
                            </label>
                            <input
                                id="client"
                                type="text"
                                required
                                value={formData.client}
                                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                                placeholder="e.g. Acme Corp"
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="description" className="text-sm font-medium text-neutral-300 ml-1">
                                Description (Optional)
                            </label>
                            <textarea
                                id="description"
                                rows={4}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Describe the purpose of this survey..."
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none"
                            />
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold py-4 rounded-xl hover:bg-neutral-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                            >
                                {loading ? (
                                    <div className="h-5 w-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <IconCheck size={20} />
                                        Launch Survey
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
