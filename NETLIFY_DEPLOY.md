# Netlify Deployment for Runner App

Due to Netlify's automatic npm install phase conflicting with Bun workspaces, configure these settings **in Netlify UI**:

## Settings → Build & Deploy → Build Settings

**Base directory:** (leave empty - use repo root)

**Build command:**
```bash
curl -fsSL https://bun.sh/install | bash && export PATH="$HOME/.bun/bin:$PATH" && bun install && cd apps/runner && bun run build
```

**Publish directory:**
```
apps/runner/.next
```

**Install command:** (leave empty to skip auto-install)

## Environment Variables

Add these in Settings → Environment variables:
```
NODE_VERSION=22
NEXT_PUBLIC_RUNNER_API_URL=https://runner-api.algorithmicintelmatrix.com
```

## Alternative: netlify.toml in repo root

If the UI settings don't work, the netlify.toml file should handle it automatically.

## Troubleshooting

If you still see npm workspace errors:
1. Delete the site in Netlify
2. Create a new site
3. Don't let it auto-detect - manually enter the commands above
4. Make sure "Install command" is completely empty

This forces Netlify to skip its automatic dependency detection and use only your custom build command with Bun.
