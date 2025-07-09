#!/bin/bash

# Phase Validation Script
# Validates that current phase is complete before proceeding

set -e

echo "🔍 Phase Validation Script"
echo "=========================="

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "PROGRESS.md" ]; then
    echo "❌ Error: Run this script from the project root directory"
    exit 1
fi

# Function to validate Phase 0
validate_phase_0() {
    echo "🧪 Validating Phase 0: Testing Foundation"
    echo "----------------------------------------"
    
    local passed=0
    local total=6
    
    # Check testing framework
    if [ -f "tests/setup.ts" ]; then
        echo "✅ Testing configuration exists"
        ((passed++))
    else
        echo "❌ tests/setup.ts missing"
    fi
    
    # Check mocks
    if [ -d "tests/mocks" ] && [ -f "tests/mocks/youtube-api.ts" ]; then
        echo "✅ API mocks implemented"
        ((passed++))
    else
        echo "❌ API mocks missing"
    fi
    
    # Check characterization tests
    if [ -d "tests/characterization" ] && [ -f "tests/characterization/main.test.ts" ]; then
        echo "✅ Characterization tests exist"
        ((passed++))
    else
        echo "❌ Characterization tests missing"
    fi
    
    # Check integration tests
    if [ -d "tests/integration" ] && [ -f "tests/integration/transcript-flow.test.ts" ]; then
        echo "✅ Integration tests exist"
        ((passed++))
    else
        echo "❌ Integration tests missing"
    fi
    
    # Check test coverage
    if npm run test:coverage >/dev/null 2>&1; then
        echo "✅ Test coverage achievable"
        ((passed++))
    else
        echo "❌ Test coverage check failed"
    fi
    
    # Check all tests pass
    if npm test >/dev/null 2>&1; then
        echo "✅ All tests passing"
        ((passed++))
    else
        echo "❌ Tests failing"
    fi
    
    echo ""
    echo "Phase 0 Progress: $passed/$total tasks complete"
    
    if [ $passed -eq $total ]; then
        echo "🎉 Phase 0 COMPLETE - Ready for Phase 1"
        return 0
    else
        echo "⚠️  Phase 0 INCOMPLETE - Complete before proceeding"
        return 1
    fi
}

# Function to validate Phase 1
validate_phase_1() {
    echo "⚙️  Validating Phase 1: Settings Architecture"
    echo "--------------------------------------------"
    
    local passed=0
    local total=5
    
    # Check settings directory
    if [ -d "src/settings" ]; then
        echo "✅ Settings directory created"
        ((passed++))
    else
        echo "❌ src/settings/ directory missing"
    fi
    
    # Check validation module
    if [ -f "src/settings/validation.ts" ]; then
        echo "✅ Validation module exists"
        ((passed++))
    else
        echo "❌ src/settings/validation.ts missing"
    fi
    
    # Check provider module
    if [ -f "src/settings/providers.ts" ]; then
        echo "✅ Provider module exists"
        ((passed++))
    else
        echo "❌ src/settings/providers.ts missing"
    fi
    
    # Check settings.ts size reduction
    if [ -f "src/settings.ts" ]; then
        SETTINGS_LINES=$(wc -l < src/settings.ts)
        if [ $SETTINGS_LINES -lt 500 ]; then
            echo "✅ settings.ts refactored ($SETTINGS_LINES lines)"
            ((passed++))
        else
            echo "❌ settings.ts still too large ($SETTINGS_LINES lines)"
        fi
    else
        echo "❌ src/settings.ts not found"
    fi
    
    # Check all tests still pass
    if npm test >/dev/null 2>&1; then
        echo "✅ All tests passing"
        ((passed++))
    else
        echo "❌ Tests failing"
    fi
    
    echo ""
    echo "Phase 1 Progress: $passed/$total tasks complete"
    
    if [ $passed -eq $total ]; then
        echo "🎉 Phase 1 COMPLETE - Ready for Phase 2"
        return 0
    else
        echo "⚠️  Phase 1 INCOMPLETE - Complete before proceeding"
        return 1
    fi
}

# Function to validate Phase 2
validate_phase_2() {
    echo "⚛️  Validating Phase 2: React Components"
    echo "---------------------------------------"
    
    local passed=0
    local total=5
    
    # Check components directory
    if [ -d "src/components" ]; then
        echo "✅ Components directory created"
        ((passed++))
    else
        echo "❌ src/components/ directory missing"
    fi
    
    # Check key components
    if [ -f "src/components/VideoPlayer.tsx" ] && [ -f "src/components/TranscriptDisplay.tsx" ]; then
        echo "✅ Key components exist"
        ((passed++))
    else
        echo "❌ Key components missing"
    fi
    
    # Check view.tsx size reduction
    if [ -f "src/view.tsx" ]; then
        VIEW_LINES=$(wc -l < src/view.tsx)
        if [ $VIEW_LINES -lt 300 ]; then
            echo "✅ view.tsx refactored ($VIEW_LINES lines)"
            ((passed++))
        else
            echo "❌ view.tsx still too large ($VIEW_LINES lines)"
        fi
    else
        echo "❌ src/view.tsx not found"
    fi
    
    # Check build works
    if npm run build >/dev/null 2>&1; then
        echo "✅ Build successful"
        ((passed++))
    else
        echo "❌ Build failing"
    fi
    
    # Check all tests still pass
    if npm test >/dev/null 2>&1; then
        echo "✅ All tests passing"
        ((passed++))
    else
        echo "❌ Tests failing"
    fi
    
    echo ""
    echo "Phase 2 Progress: $passed/$total tasks complete"
    
    if [ $passed -eq $total ]; then
        echo "🎉 Phase 2 COMPLETE - Ready for Phase 3"
        return 0
    else
        echo "⚠️  Phase 2 INCOMPLETE - Complete before proceeding"
        return 1
    fi
}

# Determine current phase and validate
echo ""
echo "🎯 Determining Current Phase..."
echo "------------------------------"

if [ ! -f "tests/setup.ts" ]; then
    echo "Current Phase: 0 (Testing Foundation)"
    validate_phase_0
elif [ ! -d "src/settings" ]; then
    echo "Current Phase: 0 (Testing Foundation) - Validating completion"
    validate_phase_0
elif [ ! -d "src/components" ]; then
    echo "Current Phase: 1 (Settings Architecture) - Validating completion"
    validate_phase_1
elif [ ! -f "src/providers/provider-factory.ts" ]; then
    echo "Current Phase: 2 (React Components) - Validating completion"
    validate_phase_2
else
    echo "Advanced phases - manual validation required"
    echo "Check PROGRESS.md for current phase status"
fi

echo ""
echo "🚀 Next Steps:"
echo "- Review PROGRESS.md for current phase tasks"
echo "- Fix any validation failures before proceeding"
echo "- Run tests frequently during development"
echo "- Update PROGRESS.md when tasks complete"

echo ""
echo "Validation complete! 🎉"