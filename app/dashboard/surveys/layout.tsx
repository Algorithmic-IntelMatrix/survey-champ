import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import SurveyNodeSidebar from "@/components/SurveyNodeSidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <AuthGuard>
            <div className="flex h-screen w-full">
                <SurveyNodeSidebar />
                <div className="flex-1 relative">
                    {children}
                </div>
            </div>
        </AuthGuard>
    );
}