#!/bin/bash
# Trigger Railway Redeployment Script
# This script helps trigger a Railway redeployment of the latest code

set -e

echo "=================================================="
echo "🚀 Railway Redeployment Trigger"
echo "=================================================="
echo ""

# Check if we're on main branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️  Warning: You're on branch '$CURRENT_BRANCH', not 'main'"
    echo "   Railway typically deploys from 'main' branch"
    echo ""
    read -p "Do you want to continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Warning: You have uncommitted changes"
    git status --short
    echo ""
    read -p "Do you want to continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted. Please commit or stash your changes first."
        exit 1
    fi
fi

# Show current and latest commits
echo "📦 Current Deployment Version:"
echo "   2.7.0-railway_20250923-023107 (Sept 23, 2025)"
echo ""

echo "📦 Latest Code Version:"
LATEST_COMMIT=$(git log -1 --oneline)
echo "   $LATEST_COMMIT"
echo ""

echo "📋 Recent commits since deployed version:"
git log --since="2025-09-23" --oneline | head -7
echo ""

# Deployment options
echo "=================================================="
echo "Deployment Options:"
echo "=================================================="
echo ""
echo "1. Empty Commit + Push (Recommended)"
echo "   - Creates a no-op commit to trigger Railway auto-deploy"
echo "   - Safe and reversible"
echo ""
echo "2. Force Push Current Commit"
echo "   - Re-pushes the current HEAD to trigger deployment"
echo "   - Use if commit already exists"
echo ""
echo "3. Show Railway CLI Command"
echo "   - Display command for Railway CLI deployment"
echo "   - Requires Railway CLI installed"
echo ""
echo "4. Show Manual Instructions"
echo "   - Display manual deployment steps"
echo ""
echo "5. Exit"
echo ""

read -p "Select option (1-5): " -n 1 -r OPTION
echo
echo ""

case $OPTION in
    1)
        echo "Creating empty commit to trigger Railway deployment..."
        COMMIT_MSG="chore: trigger Railway redeployment (v2.7.0 with vector store optimizations)"
        git commit --allow-empty -m "$COMMIT_MSG"
        echo ""
        echo "✅ Empty commit created"
        echo ""
        read -p "Push to origin/main to trigger deployment? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "Pushing to origin/main..."
            git push origin main
            echo ""
            echo "✅ Pushed successfully!"
            echo ""
            echo "🚀 Railway should now start deploying..."
            echo "   Monitor deployment at: https://railway.app/"
            echo ""
            echo "Wait 2-3 minutes, then verify with:"
            echo "   pnpm run smoke:remote"
        else
            echo "Aborted push. You can push manually later with:"
            echo "   git push origin main"
        fi
        ;;
    2)
        echo "Force pushing current commit to trigger Railway deployment..."
        echo ""
        read -p "Are you sure? This will trigger a redeploy. (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "Pushing to origin/main..."
            git push origin main
            echo ""
            echo "✅ Pushed successfully!"
            echo ""
            echo "🚀 Railway should now start deploying..."
            echo "   Monitor deployment at: https://railway.app/"
            echo ""
            echo "Wait 2-3 minutes, then verify with:"
            echo "   pnpm run smoke:remote"
        else
            echo "Aborted."
        fi
        ;;
    3)
        echo "Railway CLI Deployment Command:"
        echo ""
        echo "If you have Railway CLI installed:"
        echo "   railway up"
        echo ""
        echo "Or link and deploy:"
        echo "   railway link"
        echo "   railway up"
        echo ""
        echo "To install Railway CLI:"
        echo "   npm i -g @railway/cli"
        echo "   # or"
        echo "   curl -fsSL https://railway.app/install.sh | sh"
        ;;
    4)
        echo "Manual Deployment Instructions:"
        echo ""
        echo "Via Railway Dashboard:"
        echo "1. Go to https://railway.app/"
        echo "2. Select your project (AOMA Mesh MCP Server)"
        echo "3. Go to the 'Deployments' tab"
        echo "4. Click 'Deploy' or 'Redeploy Latest'"
        echo ""
        echo "Via GitHub Actions:"
        echo "1. Go to https://github.com/[your-repo]/actions"
        echo "2. Select 'Remote Smoke Checks' workflow"
        echo "3. Click 'Run workflow'"
        echo "   (This will verify the deployment)"
        echo ""
        echo "Via Webhook (if configured):"
        echo "   curl -X POST [your-railway-webhook-url]"
        ;;
    5)
        echo "Exiting without changes."
        exit 0
        ;;
    *)
        echo "Invalid option. Exiting."
        exit 1
        ;;
esac

echo ""
echo "=================================================="
echo "Next Steps:"
echo "=================================================="
echo ""
echo "1. Monitor Railway deployment dashboard"
echo "2. Wait 2-3 minutes for deployment to complete"
echo "3. Run verification: pnpm run smoke:remote"
echo "4. Check health: curl https://luminous-dedication-production.up.railway.app/health"
echo ""
echo "Expected new version format:"
echo "   2.7.0-railway_[current-date]"
echo ""
