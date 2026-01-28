#!/bin/bash

# Docker Cleanup Script for 8GB Disk Volumes
# This script safely removes unused Docker resources to free up space

echo "🧹 Docker Cleanup Script"
echo "========================"
echo ""

# Show current disk usage
echo "📊 Current Docker Disk Usage:"
docker system df
echo ""

# Remove dangling images (untagged images from previous builds)
echo "🗑️  Removing dangling images..."
docker image prune -f

# Remove stopped containers
echo "🗑️  Removing stopped containers..."
docker container prune -f

# Remove unused volumes
echo "🗑️  Removing unused volumes..."
docker volume prune -f

# Optional: Remove ALL unused images (not just dangling)
read -p "Remove ALL unused images? This will remove old build images. (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    docker image prune -a -f
fi

# Remove build cache
echo "🗑️  Removing build cache..."
docker builder prune -f

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 New Docker Disk Usage:"
docker system df
