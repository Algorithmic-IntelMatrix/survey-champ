"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { surveyApi, Survey } from "@/api/survey";
import { toast } from "sonner";
import { IconPlus, IconLogout, IconClipboardList, IconChevronRight } from "@tabler/icons-react";
import NewSurveyModal from "@/components/NewSurveyModal";
import { motion, AnimatePresence } from "motion/react";

export default function Dashboard() {
    const router = useRouter();
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

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
        <div className="min-h-screen bg-background text-foreground p-6 md:p-12 relative">
            <NewSurveyModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchSurveys}
            />

            {/* Header */}
            <header className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <h1 className="text-4xl font-bold">
                        Your Surveys
                    </h1>
                    <p className="mt-2 text-muted-foreground">
                        Manage and monitor your active survey campaigns
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-4"
                >
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-full hover:opacity-90 transition-all duration-300 shadow-sm hover:scale-105 active:scale-95"
                    >
                        <IconPlus size={20} />
                        Create Survey
                    </button>

                    <button
                        onClick={handleLogout}
                        className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-all"
                        title="Logout"
                    >
                        <IconLogout size={22} />
                    </button>
                </motion.div>
            </header>

            {/* Content */}
            <main className="max-w-7xl mx-auto">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                        >
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-48 bg-muted rounded-2xl animate-pulse border border-border" />
                            ))}
                        </motion.div>
                    ) : surveys.length > 0 ? (
                        <motion.div
                            key="grid"
                            initial="hidden"
                            animate="visible"
                            variants={{
                                visible: { transition: { staggerChildren: 0.1 } }
                            }}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                        >
                            {surveys.map((survey) => (
                                <motion.div
                                    key={survey.id}
                                    variants={{
                                        hidden: { opacity: 0, y: 20 },
                                        visible: { opacity: 1, y: 0 }
                                    }}
                                    className="group relative bg-card border border-border hover:border-primary/50 rounded-2xl p-6 transition-all duration-300 hover:shadow-md"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                            <IconClipboardList size={24} />
                                        </div>
                                        <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
                                            {new Date(survey.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>

                                    <h3 className="text-xl font-bold text-card-foreground mb-2 group-hover:text-primary transition-colors">
                                        {survey.name}
                                    </h3>

                                    <p className="text-muted-foreground text-sm line-clamp-2 mb-6">
                                        {survey.description || "No description provided"}
                                    </p>

                                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
                                        <span className="text-xs text-muted-foreground font-medium">
                                            Client: {survey.client}
                                        </span>
                                        <button
                                            onClick={() => router.push(`/dashboard/surveys/${survey.id}`)}
                                            className="flex items-center gap-1 text-sm font-semibold text-foreground/70 hover:text-foreground transition-colors"
                                        >
                                            Details <IconChevronRight size={16} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-20 bg-muted/20 border border-dashed border-border rounded-3xl"
                        >
                            <div className="inline-flex items-center justify-center p-4 bg-muted rounded-2xl text-muted-foreground mb-4">
                                <IconClipboardList size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-2">No surveys yet</h3>
                            <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                                Get started by creating your first survey campaign to gather valuable insights.
                            </p>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-secondary text-secondary-foreground font-semibold rounded-full hover:bg-secondary/80 transition-all"
                            >
                                <IconPlus size={20} />
                                Create First Survey
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}