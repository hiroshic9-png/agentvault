#!/bin/bash
# ======================================
# 🏴‍☠️ AgentVault — npm Publish Script
# 3パッケージを一括公開
# ======================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo ""
echo "🏴‍☠️ AgentVault npm Publisher"
echo "═══════════════════════════"
echo ""

# Check npm auth
echo "📋 Checking npm authentication..."
NPM_USER=$(npm whoami 2>/dev/null || echo "")
if [ -z "$NPM_USER" ]; then
    echo "❌ Not logged in to npm. Run: npm login --auth-type=legacy"
    exit 1
fi
echo "✅ Logged in as: $NPM_USER"
echo ""

# Packages to publish
PACKAGES=(
    "gateway:agentvault-gateway"
    "agentscore:agentvault-score"
    "guard:agentvault-guard"
)

for pkg in "${PACKAGES[@]}"; do
    DIR="${pkg%%:*}"
    NAME="${pkg##*:}"
    PKG_DIR="$SCRIPT_DIR/$DIR"
    
    echo "━━━ Publishing $NAME ━━━"
    
    if [ ! -d "$PKG_DIR" ]; then
        echo "⚠️  Directory not found: $PKG_DIR — skipping"
        continue
    fi
    
    cd "$PKG_DIR"
    
    # Check if already published
    PUBLISHED=$(npm view "$NAME" version 2>/dev/null || echo "")
    LOCAL=$(node -e "console.log(require('./package.json').version)")
    
    if [ "$PUBLISHED" = "$LOCAL" ]; then
        echo "ℹ️  $NAME@$LOCAL already published — skipping"
    else
        echo "📦 Publishing $NAME@$LOCAL..."
        npm publish --access public
        echo "✅ $NAME@$LOCAL published!"
    fi
    echo ""
done

echo "═══════════════════════════"
echo "🏴‍☠️ All packages published!"
echo ""
echo "Users can now install with:"
echo "  npx agentvault-gateway"
echo "  npx agentvault-score scan \"npx -y @modelcontextprotocol/server-memory\""
echo "  npm install agentvault-guard"
echo ""
