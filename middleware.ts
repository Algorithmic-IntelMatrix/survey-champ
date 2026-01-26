import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const url = request.nextUrl;
    const hostname = request.headers.get('host') || '';

    // Define your domains
    // In production, these should come from environment variables
    const APP_DOMAIN = 'localhost:3000'; 
    const SURVEY_DOMAIN = 'survey.localhost:3000';

    // 1. Handle Survey Domain requests
    // If the hostname matches our survey domain (or starts with survey.)
    if (hostname === SURVEY_DOMAIN || hostname.startsWith('survey.')) {
        
        // Block access to dashboard/admin routes on the survey domain
        if (url.pathname.startsWith('/dashboard') || url.pathname.startsWith('/api/auth')) {
            return NextResponse.redirect(new URL('/', request.url));
        }

        // If it's a root request or a simple ID path, rewrite to the runner
        // Example: survey.localhost:3000/abc-123 -> localhost:3000/s/abc-123
        // Example: survey.localhost:3000/surveyRunner/abc -> localhost:3000/s/abc
        if (url.pathname !== '/' && !url.pathname.includes('.') && !url.pathname.startsWith('/s/')) {
            const parts = url.pathname.split('/').filter(Boolean);
            
            // Handle /surveyRunner/[id]
            if (parts[0] === 'surveyRunner' && parts[1]) {
                return NextResponse.rewrite(new URL(`/s/${parts[1]}${url.search}`, request.url));
            }
            
            // Handle /[id]
            if (parts[0]) {
                return NextResponse.rewrite(new URL(`/s/${parts[0]}${url.search}`, request.url));
            }
        }
    }

    // 2. Handle main app domain
    // (Optional: prevent access to /s/ routes on the main app domain if desired, 
    // though keeping them accessible for testing is often useful)

    return NextResponse.next();
}

// Only run middleware on paths that aren't static files or next internals
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
