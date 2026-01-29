# Cloudflare Workers runner-api Deployment

## ✅ Current Status

The runner-api is already configured for pnpm - workspace dependencies work automatically with Cloudflare Workers!

## 🚀 Deploy runner-api

### Step 1: Navigate to runner-api Directory

```bash
cd /home/raj-gupta/Documents/projects/surveyChamp/surveychamp/apps/runner-api
```

### Step 2: Deploy to Cloudflare

```bash
# Deploy to production
npx wrangler deploy

# Or deploy to specific environment
npx wrangler deploy --env production
```

### Step 3: Verify Deployment

```bash
# Check deployment status
npx wrangler deployments list

# View live logs
npx wrangler tail

# Test the API
curl https://runner-api.algorithmicintelmatrix.com/
curl https://runner-api.algorithmicintelmatrix.com/health
curl https://runner-api.algorithmicintelmatrix.com/api/
```

## 🔐 Set Secrets (if needed)

If this is the first deployment or secrets are missing:

```bash
# Set Redis secrets
npx wrangler secret put UPSTASH_REDIS_REST_URL
npx wrangler secret put UPSTASH_REDIS_REST_TOKEN

# Set AWS secrets (if using S3)
npx wrangler secret put AWS_REGION
npx wrangler secret put AWS_ACCESS_KEY_ID
npx wrangler secret put AWS_SECRET_ACCESS_KEY
npx wrangler secret put AWS_BUCKET_NAME
```

## 📋 Environment Variables

**Already configured in `wrangler.toml`:**
- APP_URL
- SURVEY_URL  
- BUILDER_API_URL

**Secrets (set separately):**
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN
- AWS credentials (optional)

## ✅ Expected Result

After deployment:
- runner-api accessible at: https://runner-api.algorithmicintelmatrix.com
- Workspace packages (@surveychamp/common, @surveychamp/db) working
- Running on Cloudflare Workers edge network
- No pnpm changes needed (already compatible!)

## 🔍 Check Deployment

```bash
# View recent deployments
npx wrangler deployments list

# Monitor live traffic
npx wrangler tail

# Test endpoints
curl https://runner-api.algorithmicintelmatrix.com/
curl https://runner-api.algorithmicintelmatrix.com/api/
```

🎉 **runner-api uses workspace packages - it just works with pnpm!**
