#!/bin/bash

# Progress Check Script
# Validates current refactoring state and suggests next steps

set -e

echo "🔍 YouTube Plugin Refactoring Progress Check"
echo "=============================================="

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "PROGRESS.md" ]; then
    echo "❌ Error: Run this script from the project root directory"
    exit 1
fi

echo ""
echo "📊 Current State Analysis:"
echo "--------------------------"

# Check git status
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Warning: Uncommitted changes detected"
    git status --short
else
    echo "✅ Git status clean"
fi

# Check build status
echo ""
echo "🏗️  Build Status:"
if npm run build >/dev/null 2>&1; then
    echo "✅ Build successful"
else
    echo "❌ Build failed - fix before proceeding"
    exit 1
fi

# Check test status
echo ""
echo "🧪 Test Status:"
if npm test >/dev/null 2>&1; then
    echo "✅ All tests passing"
else
    echo "❌ Tests failing - fix before proceeding"
    exit 1
fi

# Analyze file completion status
echo ""
echo "📁 File Analysis:"
echo "-----------------"

# Phase 0 files
echo "Phase 0 (Testing Foundation):"
[ -f "tests/setup.ts" ] && echo "  ✅ tests/setup.ts" || echo "  ❌ tests/setup.ts"
[ -d "tests/mocks" ] && echo "  ✅ tests/mocks/" || echo "  ❌ tests/mocks/"
[ -d "tests/characterization" ] && echo "  ✅ tests/characterization/" || echo "  ❌ tests/characterization/"
[ -d "tests/integration" ] && echo "  ✅ tests/integration/" || echo "  ❌ tests/integration/"

# Phase 1 files
echo ""
echo "Phase 1 (Settings Architecture):"
[ -d "src/settings" ] && echo "  ✅ src/settings/" || echo "  ❌ src/settings/"
[ -f "src/settings/validation.ts" ] && echo "  ✅ src/settings/validation.ts" || echo "  ❌ src/settings/validation.ts"
[ -f "src/settings/providers.ts" ] && echo "  ✅ src/settings/providers.ts" || echo "  ❌ src/settings/providers.ts"

# Phase 2 files  
echo ""
echo "Phase 2 (React Components):"
[ -d "src/components" ] && echo "  ✅ src/components/" || echo "  ❌ src/components/"
[ -f "src/components/VideoPlayer.tsx" ] && echo "  ✅ src/components/VideoPlayer.tsx" || echo "  ❌ src/components/VideoPlayer.tsx"
[ -f "src/components/TranscriptDisplay.tsx" ] && echo "  ✅ src/components/TranscriptDisplay.tsx" || echo "  ❌ src/components/TranscriptDisplay.tsx"

# Determine current phase
echo ""
echo "🎯 Current Phase Detection:"
echo "---------------------------"

if [ ! -f "tests/setup.ts" ]; then
    echo "📍 Phase 0: Testing Foundation (Not Started)"
    echo "Next: Set up testing infrastructure"
elif [ ! -d "src/settings" ]; then
    echo "📍 Phase 0: Testing Foundation (In Progress)"
    echo "Next: Complete testing setup and coverage"
elif [ ! -d "src/components" ]; then
    echo "📍 Phase 1: Settings Architecture (Ready/In Progress)"
    echo "Next: Break down settings.ts into modules"
elif [ ! -f "src/providers/provider-factory.ts" ]; then
    echo "📍 Phase 2: React Components (Ready/In Progress)"
    echo "Next: Decompose view.tsx into components"
elif [ ! -f "src/services/logging-service.ts" ]; then
    echo "📍 Phase 3: Provider System (Ready/In Progress)"
    echo "Next: Enhance provider management"
elif [ ! -f "tests/performance/" ]; then
    echo "📍 Phase 4: Service Layer (Ready/In Progress)"
    echo "Next: Add comprehensive service layer"
else
    echo "📍 Phase 5: Final Testing (Ready/In Progress)"
    echo "Next: Comprehensive validation and cleanup"
fi

# Check test coverage if available
echo ""
echo "📈 Test Coverage:"
if [ -f "coverage/lcov-report/index.html" ]; then
    echo "✅ Coverage report available"
    # Try to extract coverage percentage (basic approach)
    if command -v grep >/dev/null 2>&1; then
        COVERAGE=$(grep -o '[0-9.]*%' coverage/lcov-report/index.html | head -1 || echo "Unknown")
        echo "📊 Overall coverage: $COVERAGE"
    fi
else
    echo "❌ No coverage report found"
    echo "Run: npm run test:coverage"
fi

# File size analysis
echo ""
echo "📏 File Size Analysis:"
echo "----------------------"
if [ -f "src/settings.ts" ]; then
    SETTINGS_LINES=$(wc -l < src/settings.ts)
    echo "settings.ts: $SETTINGS_LINES lines"
    [ $SETTINGS_LINES -gt 1000 ] && echo "  ⚠️  Still needs refactoring" || echo "  ✅ Refactored"
fi

if [ -f "src/view.tsx" ]; then
    VIEW_LINES=$(wc -l < src/view.tsx)
    echo "view.tsx: $VIEW_LINES lines"
    [ $VIEW_LINES -gt 500 ] && echo "  ⚠️  Still needs refactoring" || echo "  ✅ Refactored"
fi

echo ""
echo "🚀 Next Steps:"
echo "--------------"
echo "1. Check PROGRESS.md for current phase details"
echo "2. Review SESSION_START.md for quick context"
echo "3. Run specific phase commands from documentation"
echo "4. Update progress after completing tasks"

echo ""
echo "🔧 Quick Commands:"
echo "- npm test                    # Run all tests"
echo "- npm run build              # Build project"
echo "- npm run test:coverage      # Generate coverage report"
echo "- ./scripts/validate-phase.sh # Validate current phase"

echo ""
echo "Progress check complete! 🎉"