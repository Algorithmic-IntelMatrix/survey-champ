#!/bin/bash
# EC2 Deployment Script using Pre-built Images
# This script deploys SurveyChamp on EC2 by pulling images from Docker Hub

echo "🚀 SurveyChamp EC2 Deployment"
echo "============================="
echo ""

# Step 1: Clean up old Docker resources
echo "🧹 Cleaning up old Docker resources..."
sudo docker-compose down 2>/dev/null || true
sudo docker system prune -f

# Step 2: Pull latest images from Docker Hub
echo ""
echo "📥 Pulling latest images from Docker Hub..."
sudo docker pull rajgupta2001/surveychamp-builder:latest
sudo docker pull rajgupta2001/surveychamp-worker:latest

# Step 3: Start services
echo ""
echo "🔄 Starting services..."
sudo docker-compose -f docker-compose.prod.yml up -d

# Step 4: Check status
echo ""
echo "📊 Service Status:"
sudo docker-compose -f docker-compose.prod.yml ps

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "   - View logs: sudo docker-compose -f docker-compose.prod.yml logs -f"
echo "   - Stop services: sudo docker-compose -f docker-compose.prod.yml down"
echo "   - Check API: curl http://localhost:4000"
