# Cloudflare Pages Monorepo Setup Guide

This guide walks you through deploying the SurveyChamp monorepo to Cloudflare Pages with proper monorepo support using build watch paths.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Understanding the Setup](#understanding-the-setup)
- [Project 1: Builder App](#project-1-builder-app)
- [Project 2: Runner App](#project-2-runner-app)
- [Configuring Build Watch Paths](#configuring-build-watch-paths)
- [Testing and Verification](#testing-and-verification)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts & Services
- ✅ Cloudflare account ([sign up free](https://dash.cloudflare.com/sign-up))
- ✅ Domain added to Cloudflare DNS
- ✅ GitHub account with repository access
- ✅ Neon DB, Upstash Redis, AWS S3 (already configured)

### Required Knowledge
- Basic understanding of Git and GitHub
- Familiarity with deployment processes
- Understanding of environment variables

---

## Understanding the Setup

### What is a Monorepo?
A monorepo is a single Git repository containing multiple applications. SurveyChamp has 5 apps:
- **builder** - Frontend (Cloudflare Pages) ← We're deploying this
- **runner** - Frontend (Cloudflare Pages) ← We're deploying this
- **builder-api** - Backend (EC2)
- **runner-api** - Edge API (Cloudflare Worker)
- **worker** - Background jobs (EC2)

### Why Multiple Pages Projects?
We create **2 separate Cloudflare Pages projects** from the same repository:
1. `surveychamp-builder` - Deploys only the builder app
2. `surveychamp-runner` - Deploys only the runner app

This allows:
- Independent deployment configurations
- Different environment variables per app
- Optimized build triggers (via build watch paths)

### Build Watch Paths - Critical for Monorepos!
By default, **any file change triggers ALL projects to rebuild**. This wastes:
- Build minutes (Cloudflare has limits)
- Deployment time
- Resources

**Build watch paths** tell Cloudflare: "Only build this project when THESE files change"

Example:
```
apps/builder/**     ← Change here = builder builds (runner skips)
apps/runner/**      ← Change here = runner builds (builder skips)
packages/**         ← Change here = BOTH build (shared code)
```

---

## Project 1: Builder App

### Step 1: Navigate to Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select **Workers & Pages** from the left sidebar
3. Click **Create Application**
4. Select **Pages** tab
5. Click **Connect to Git**

### Step 2: Connect GitHub Repository

1. Click **Connect GitHub**
2. Authorize Cloudflare to access your GitHub account
3. Select your repository: `surveyChamp` (or whatever your repo is named)
4. Click **Begin Setup**

### Step 3: Configure Build Settings

Fill in the following configuration:

| Setting | Value |
|---------|-------|
| **Project name** | `surveychamp-builder` |
| **Production branch** | `main` (or `master`) |
| **Framework preset** | Next.js |
| **Build command** | `bun install && bun run --filter @surveychamp/builder build` |
| **Build output directory** | `apps/builder/out` |
| **Root directory (Leave blank for monorepo root)** | _(leave empty)_ |

> **Important**: Do NOT select a root directory. Leave it blank to use the monorepo root.

### Step 4: Environment Variables

Click **Add environment variable** and add these:

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://api.algorithmicintelmatrix.com/api` | Production |
| `NEXT_PUBLIC_APP_URL` | `https://builder.algorithmicintelmatrix.com` | Production |
| `NEXT_PUBLIC_SURVEY_URL` | `https://survey.algorithmicintelmatrix.com` | Production |
| `NODE_VERSION` | `20.18.2` | Production |

### Step 5: Deploy

1. Click **Save and Deploy**
2. Watch the build logs
3. Wait for deployment to complete (5-10 minutes)

### Step 6: Configure Custom Domain

1. In the project dashboard, click **Custom domains**
2. Click **Set up a custom domain**
3. Enter: `builder.algorithmicintelmatrix.com`
4. Cloudflare will automatically:
   - Create DNS records
   - Provision SSL certificate
   - Enable HTTPS

---

## Project 2: Runner App

Repeat the process, but with runner-specific settings:

### Build Configuration

| Setting | Value |
|---------|-------|
| **Project name** | `surveychamp-runner` |
| **Production branch** | `main` (or `master`) |
| **Framework preset** | Next.js |
| **Build command** | `bun install && bun run --filter @surveychamp/runner pages:build` |
| **Build output directory** | `apps/runner/.vercel/output/static` |
| **Root directory** | _(leave empty)_ |

### Environment Variables

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://runner-api.algorithmicintelmatrix.com/api` | Production |
| `NEXT_PUBLIC_APP_URL` | `https://builder.algorithmicintelmatrix.com` | Production |
| `NEXT_PUBLIC_SURVEY_URL` | `https://survey.algorithmicintelmatrix.com` | Production |
| `NODE_VERSION` | `20.18.2` | Production |

### Custom Domain

- Domain: `survey.algorithmicintelmatrix.com`

---

## Configuring Build Watch Paths

**This is the most important step for monorepo optimization!**

### For Builder App (`surveychamp-builder`)

1. Go to project dashboard → **Settings** → **Builds & deployments**
2. Scroll to **Build watch paths**
3. Click **Add path**
4. Add these paths (one at a time):

```
apps/builder/**
packages/**
package.json
bun.lock
tsconfig.json
```

5. Click **Save**

**What this does**: Builder only rebuilds when files in these paths change.

### For Runner App (`surveychamp-runner`)

1. Same process as above
2. Add these paths instead:

```
apps/runner/**
packages/**
package.json
bun.lock
tsconfig.json
```

### Testing Build Watch Paths

To verify they work:

1. Make a change to `apps/builder/README.md`
2. Commit and push to GitHub
3. Check Cloudflare dashboard:
   - ✅ `surveychamp-builder` should trigger a build
   - ✅ `surveychamp-runner` should **skip** the build

4. Make a change to `packages/types/index.ts`
5. Commit and push
6. Check Cloudflare dashboard:
   - ✅ Both projects should trigger builds (shared dependency)

---

## Testing and Verification

### Local Build Testing (Before Deploying)

Test builds locally to catch errors early:

```bash
cd /home/raj-gupta/Documents/projects/surveyChamp/surveychamp

# Test builder build
bun install
bun run --filter @surveychamp/builder build

# Verify output
ls -la apps/builder/out
# Should see: index.html, _next/, etc.

# Test runner build
bun run --filter @surveychamp/runner pages:build

# Verify output
ls -la apps/runner/.vercel/output/static
# Should see: _worker.js, index.html, etc.
```

### Deployment Verification Checklist

#### Builder App
- [ ] Build completes successfully
- [ ] Custom domain resolves: `https://builder.algorithmicintelmatrix.com`
- [ ] SSL certificate is active (HTTPS)
- [ ] Can access login page
- [ ] Can authenticate
- [ ] Can create/edit surveys

#### Runner App
- [ ] Build completes successfully
- [ ] Custom domain resolves: `https://survey.algorithmicintelmatrix.com`
- [ ] SSL certificate is active (HTTPS)
- [ ] Can load survey via URL
- [ ] Can submit survey responses

#### Build Watch Paths
- [ ] Changes to builder only trigger builder builds
- [ ] Changes to runner only trigger runner builds
- [ ] Changes to packages trigger both builds

#### GitHub Integration
- [ ] Push to main triggers production deployments
- [ ] Pull requests create preview deployments
- [ ] Deployment status shows on PRs
- [ ] Both projects show separate status checks

---

## Troubleshooting

### Build Fails: "Command not found: bun"

**Problem**: Cloudflare doesn't recognize the `bun` command.

**Solution**: Install Bun as part of the build command:

```bash
# Modified build command for builder
curl -fsSL https://bun.sh/install | bash && export PATH="$HOME/.bun/bin:$PATH" && bun install && bun run --filter @surveychamp/builder build

# Modified build command for runner
curl -fsSL https://bun.sh/install | bash && export PATH="$HOME/.bun/bin:$PATH" && bun install && bun run --filter @surveychamp/runner pages:build
```

Alternatively, use `npm` instead:

```bash
# Builder
npm install && npm run --workspace @surveychamp/builder build

# Runner  
npm install && npm run --workspace @surveychamp/runner pages:build
```

### Build Fails: "Workspace not found"

**Problem**: The build command can't find the workspace.

**Solution**: Ensure you're using the correct filter syntax:
- Bun: `bun run --filter @surveychamp/builder build`
- npm: `npm run --workspace @surveychamp/builder build`

### Build Output Directory Not Found

**Problem**: Cloudflare can't find the build output.

**Solution**: Verify the output directory matches what Next.js generates:
- For exported apps: `apps/builder/out`
- For `@cloudflare/next-on-pages`: `apps/runner/.vercel/output/static`

Check your `next.config.ts` for `output` setting.

### Build Watch Paths Not Working

**Problem**: Both projects build even with watch paths configured.

**Checklist**:
1. ✅ Build watch paths are added in **Settings → Builds & deployments**
2. ✅ Paths use glob syntax: `apps/builder/**` (with `**`)
3. ✅ Build system is V2 (should be default)
4. ✅ Wait 5 minutes after saving (changes may take time to propagate)

### Runner App: "_worker.js not found"

**Problem**: The `@cloudflare/next-on-pages` build didn't work.

**Solution**:
1. Check `apps/runner/package.json` has the dependency:
   ```json
   "@cloudflare/next-on-pages": "^1.13.16"
   ```

2. Verify build script in `package.json`:
   ```json
   "pages:build": "bunx @cloudflare/next-on-pages"
   ```

3. Check Next.js config doesn't have incompatible settings (e.g., `output: "standalone"`)

### Environment Variables Not Working

**Problem**: App can't access `NEXT_PUBLIC_*` variables.

**Solution**:
1. Environment variables must start with `NEXT_PUBLIC_` for client-side access
2. Redeploy after adding environment variables (they're baked into the build)
3. Clear cache and rebuild: **Deployments** → three dots → **Rebuild**

### Domain DNS Not Resolving

**Problem**: Custom domain doesn't point to Cloudflare Pages.

**Solution**:
1. Ensure domain is added to Cloudflare DNS
2. Check DNS records in **DNS** section:
   - `builder.algorithmicintelmatrix.com` → CNAME → (Cloudflare Pages)
   - `survey.algorithmicintelmatrix.com` → CNAME → (Cloudflare Pages)
3. Wait for DNS propagation (up to 24 hours, usually minutes)
4. Check with: `dig builder.algorithmicintelmatrix.com`

### Both Apps Build on Every Commit

**Problem**: Build watch paths aren't working as expected.

**Debug steps**:
1. Check the deployment logs to see what triggered the build
2. Verify paths are exactly as specified (case-sensitive)
3. Ensure no overlapping patterns
4. Test with a targeted change (single file in `apps/builder/`)

**Common mistakes**:
- ❌ `apps/builder/*` - Only matches direct children, not nested
- ✅ `apps/builder/**` - Matches all descendants
- ❌ Forgetting `packages/**` - Shared code won't trigger builds

---

## Advanced Configuration

### Preview Environments

For PR previews, add preview-specific environment variables:

1. Go to **Settings** → **Environment variables**
2. Click **Add variable**
3. Select **Preview** environment
4. Add variables with staging URLs

### Branch Deployments

Control which branches trigger deployments:

1. **Settings** → **Builds & deployments** → **Branch deployments**
2. Configure production branch: `main`
3. Configure preview branches: `All branches` or specific patterns

### Build Notifications

Get notified on build status:

1. **Settings** → **Notifications**
2. Add webhook URL or email
3. Select events: Deploy success, Deploy failed

---

## Next Steps

After successful deployment:

1. **Monitor Deployments**: Check the analytics dashboard for traffic and errors
2. **Set Up Monitoring**: Use Cloudflare Web Analytics or third-party tools
3. **Configure WAF**: Set up Web Application Firewall rules for security
4. **Optimize Performance**: Enable auto-minify, brotli compression
5. **Set Up Alerts**: Configure monitoring for uptime and errors

---

## Additional Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Monorepo Support](https://developers.cloudflare.com/pages/configuration/monorepos/)
- [Build Watch Paths](https://developers.cloudflare.com/pages/configuration/build-watch-paths/)
- [@cloudflare/next-on-pages](https://github.com/cloudflare/next-on-pages)
- [Next.js on Cloudflare Pages](https://developers.cloudflare.com/pages/framework-guides/nextjs/)

---

## Support

If you encounter issues:
1. Check [Cloudflare Community](https://community.cloudflare.com/)
2. Review [GitHub Discussions](https://github.com/cloudflare/next-on-pages/discussions)
3. Contact Cloudflare Support (for paid plans)
