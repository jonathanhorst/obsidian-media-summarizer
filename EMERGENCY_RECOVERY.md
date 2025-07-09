# Emergency Recovery Procedures

## When to Use This Guide
- Lost context or unsure of current phase
- Tests failing after changes
- Build broken
- Performance issues detected  
- Git repository in unexpected state

## Step 1: Immediate Assessment
```bash
# Run comprehensive check
./scripts/progress-check.sh

# Check basic functionality
npm test
npm run build
git status
```

## Step 2: Identify Current State

### If Tests Are Failing
```bash
# See which tests are failing
npm test -- --verbose

# Check if it's a recent change
git diff HEAD~1

# Quick rollback if needed
git stash
npm test  # Should pass now
```

### If Build Is Broken
```bash
# Check TypeScript errors
npm run build 2>&1 | grep error

# Check for missing dependencies
npm install

# Reset to last working state
git checkout HEAD~1
npm run build  # Should work now
```

### If Lost in Refactoring Process
```bash
# Check which phase we're in
./scripts/validate-phase.sh

# Review current objectives
cat PROGRESS.md | grep -A 10 "Current Phase"

# Check recent commits
git log --oneline -10
```

## Step 3: Recovery Strategies

### Strategy A: Incremental Rollback
```bash
# Rollback recent changes incrementally
git log --oneline -5
git checkout HEAD~1  # Try previous commit
npm test && npm run build

# If that works, identify what broke
git diff HEAD~1 HEAD
```

### Strategy B: Clean Slate Recovery
```bash
# Reset to known good state
git stash  # Save current work
git checkout main  # Or last stable branch
npm install
npm test
npm run build

# Now restore your work carefully
git stash pop
```

### Strategy C: Emergency Backup Restore
```bash
# If backup files exist (.backup extensions)
find . -name "*.backup" -type f

# Restore from backup
cp src/settings.ts.backup src/settings.ts
cp src/view.tsx.backup src/view.tsx
```

## Step 4: Context Reconstruction

### Determine Current Phase
Run these checks in order:

1. **Phase 0 Check**: `[ -f "tests/setup.ts" ]`
2. **Phase 1 Check**: `[ -d "src/settings" ]`
3. **Phase 2 Check**: `[ -d "src/components" ]`
4. **Phase 3 Check**: `[ -f "src/providers/provider-factory.ts" ]`
5. **Phase 4 Check**: `[ -f "src/services/logging-service.ts" ]`

### Update Progress Documentation
```bash
# Update PROGRESS.md with current state
# Mark completed files as done
# Mark broken files as needs attention
# Set next session tasks based on current state
```

## Step 5: Safe Restart Procedures

### Option 1: Continue Current Phase
```bash
# Ensure phase prerequisites are met
./scripts/validate-phase.sh

# Review phase objectives
grep -A 20 "Phase [0-9].*$(current_phase)" PROGRESS.md

# Start with next uncompleted task
```

### Option 2: Restart Current Phase
```bash
# Backup current work
git stash

# Reset to phase beginning
git checkout phase-start-tag  # If exists

# Restart phase systematically
# Follow PROGRESS.md tasks in order
```

### Option 3: Emergency Fresh Start
```bash
# Only if completely lost
git checkout main
git pull origin main
npm install
npm test
npm run build

# Start from Phase 0
# Use SESSION_START.md to begin
```

## Step 6: Prevention Measures

### Before Making Changes
```bash
# Always check current state
./scripts/progress-check.sh

# Ensure tests pass
npm test

# Create checkpoint
git add .
git commit -m "Checkpoint before [task name]"
```

### During Development
```bash
# Run tests frequently
npm test

# Check build regularly
npm run build

# Commit small changes
git add -A
git commit -m "Small progress on [task]"
```

### After Completing Tasks
```bash
# Validate completion
./scripts/validate-phase.sh

# Update progress
# Edit PROGRESS.md
# Mark tasks as complete

# Create stable checkpoint
git add .
git commit -m "Complete [task name] - tests passing"
```

## Common Issues & Solutions

### "Cannot find module" errors
```bash
# Usually missing dependencies
npm install

# Check for TypeScript path issues
npm run build 2>&1 | grep "Cannot find module"
```

### "Tests timing out"
```bash
# Check for infinite loops in tests
npm test -- --detectOpenHandles

# Increase timeout if needed
npm test -- --testTimeout=30000
```

### "Memory issues"
```bash
# Clear npm cache
npm cache clean --force

# Restart with more memory
node --max-old-space-size=4096 node_modules/.bin/npm test
```

### "Git conflicts"
```bash
# Simple resolution
git status
git add .
git commit -m "Resolve merge conflicts"

# Complex resolution
git reset --hard HEAD~1
# Start over from last good commit
```

## Recovery Validation

### After Recovery, Always Check:
- [ ] All tests pass (`npm test`)
- [ ] Build works (`npm run build`)
- [ ] Git status is clean (`git status`)
- [ ] Current phase is clear (`./scripts/validate-phase.sh`)
- [ ] Next steps are documented in PROGRESS.md

### Documentation Updates
- [ ] Update PROGRESS.md with current state
- [ ] Note any issues discovered in recovery
- [ ] Update REFACTORING_DECISIONS.md if architecture changed
- [ ] Clear next session tasks

## Quick Reference Commands

```bash
# Emergency status check
./scripts/progress-check.sh

# Phase validation
./scripts/validate-phase.sh

# Quick test
npm test

# Quick build
npm run build

# Git safety
git stash && git status

# Last resort reset
git reset --hard HEAD~1
```

## Contact & Support

If recovery procedures don't work:
1. Check git log for recent changes
2. Review PROGRESS.md for context
3. Start from Phase 0 if necessary
4. Update documentation with lessons learned

Remember: **Safety first** - it's better to restart a phase than to push forward with broken code.