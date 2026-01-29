# EC2 Deployment Instructions

## ✅ Files Updated

- `apps/builder-api/Dockerfile` - Now uses pnpm + Node.js 20 + tsx
- `apps/worker/Dockerfile` - Now uses pnpm + Node.js 20 + tsx
- Both committed and pushed to main branch

## 🚀 Deploy to EC2

### Step 1: SSH Into Your EC2 Instance

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### Step 2: Navigate to Project Directory

```bash
cd /path/to/surveychamp
# Usually something like: cd /home/ubuntu/survey-champ
```

### Step 3: Pull Latest Changes

```bash
git pull origin main
```

### Step 4: Rebuild and Restart Containers

```bash
# Stop existing containers
docker-compose down

# Rebuild with new Dockerfiles
docker-compose build --no-cache

# Start containers
docker-compose up -d

# Check status
docker ps
```

### Step 5: Verify Everything is Running

```bash
# View logs
docker-compose logs -f

# Check builder-api
curl http://localhost:4000/health

# Check if services are up
docker-compose ps
```

## 🔍 Troubleshooting

### If containers fail to start:

```bash
# Check logs
docker-compose logs builder-api
docker-compose logs worker

# Rebuild without cache
docker-compose build --no-cache --pull

# Start again
docker-compose up -d
```

### If you need to set environment variables:

```bash
# Edit .env file
nano .env

# Restart containers
docker-compose restart
```

## ✅ Expected Result

After deployment:
- builder-api running on port 4000
- worker processing background jobs
- Both using pnpm + Node.js (via tsx)
- All workspace dependencies resolved
