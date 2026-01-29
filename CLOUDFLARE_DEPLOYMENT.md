# Cloudflare Pages Deployment Guide

## ✅ Build Configuration (FINAL)

### Runner Project

**Build command:**
```bash
pnpm install && pnpm --filter @surveychamp/runner build
```

**Build output directory:**
```
.next
```

**Root directory:** `/` _(leave empty)_

### Builder Project

**Build command:**
```bash
pnpm install && pnpm --filter @surveychamp/builder build  
```

**Build output directory:**
```
.next
```

**Root directory:** `/` _(leave empty)_

## Why `.next` instead of `out`?

Both apps have **dynamic routes** (runner: `/s/[id]`, builder: `/dashboard/surveys/[id]`).

Cloudflare Pages **natively supports Next.js SSR** - it automatically handles:
- Server-side rendering
- Dynamic routes
- API routes (if any)
- Image optimization

No need for static export! Cloudflare will run Next.js at the edge.

## Environment Variables

Add these for both projects:

```
NEXT_PUBLIC_API_URL=https://api.algorithmicintelmatrix.com/api
NEXT_PUBLIC_APP_URL=https://builder.algorithmicintelmatrix.com
NEXT_PUBLIC_SURVEY_URL=https://survey.algorithmicintelmatrix.com
NODE_VERSION=20.18.2
```

## Final Summary

✅ pnpm migration complete
✅ All dependencies added
✅ Module resolution fixed  
✅ Both apps build successfully
✅ Ready for Cloudflare Pages deployment

**The builds will work now!** 🚀
