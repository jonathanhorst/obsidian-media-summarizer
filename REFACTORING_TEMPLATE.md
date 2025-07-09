# Refactoring Template for Code Maintenance Projects

This template provides a reusable framework for systematic code refactoring projects. Customize the variables and phases for your specific project.

## Project Configuration

### Variables to Customize
```bash
# Project Details
PROJECT_NAME="Your Project Name"
PROJECT_DIR="/path/to/your/project"
MAIN_BRANCH="main"
DEVELOPMENT_BRANCH="refactoring"

# Quality Targets
TARGET_FILE_SIZE_REDUCTION=60  # Percentage
TARGET_TEST_COVERAGE=80        # Percentage
MAX_FILE_LINES=500            # Lines per file

# Key Files to Refactor (customize for your project)
LARGE_FILES=(
    "src/large-file-1.ts:2000"    # file:current_line_count
    "src/large-file-2.tsx:1500"
    "src/large-file-3.ts:1000"
)
```

## Phase Structure Template

### Phase 0: Testing Foundation (Always First)
**Duration**: 1 week  
**Objective**: Create comprehensive test suite before any refactoring

#### Tasks Checklist
- [ ] Install testing framework (Jest/Vitest/your choice)
- [ ] Create test configuration
- [ ] Build external API mocks
- [ ] Write characterization tests for existing behavior
- [ ] Establish integration tests
- [ ] Achieve target test coverage

#### Success Criteria
- [ ] All tests pass (100% pass rate)
- [ ] {TARGET_TEST_COVERAGE}%+ test coverage achieved
- [ ] External APIs properly mocked
- [ ] Characterization tests capture current behavior exactly
- [ ] No functional regressions detected

### Phase 1: [Primary Large File] Architecture
**Duration**: 2 weeks  
**Objective**: Break down the largest/most complex file

#### Tasks Checklist
- [ ] Analyze file structure and identify modules
- [ ] Create module directory structure
- [ ] Extract {module_type} logic to separate files
- [ ] Extract {another_module_type} logic 
- [ ] Create factory/manager pattern for coordination
- [ ] Update main file to use modules
- [ ] Verify all functionality preserved

#### Success Criteria
- [ ] Target file reduced from {current_lines} to <{MAX_FILE_LINES} lines
- [ ] All logic properly modularized
- [ ] Public API unchanged
- [ ] All tests still pass
- [ ] No performance regressions

### Phase 2: [Secondary Large File] Decomposition
**Duration**: 2 weeks  
**Objective**: Break down the second largest file

#### Tasks Checklist
- [ ] Create components/modules directory
- [ ] Extract major components/modules
- [ ] Implement proper interfaces/props
- [ ] Update main file to orchestrate components
- [ ] Ensure proper separation of concerns

#### Success Criteria
- [ ] Target file reduced appropriately
- [ ] Components/modules have single responsibility
- [ ] All existing functionality preserved
- [ ] Improved testability and maintainability

### Phase 3: [System Enhancement] (Optional)
**Duration**: 2 weeks  
**Objective**: Enhance specific system (providers, services, etc.)

#### Tasks Checklist
- [ ] Analyze current system architecture
- [ ] Identify common patterns and duplicated code
- [ ] Extract shared functionality
- [ ] Implement factory/manager patterns
- [ ] Add enhanced capabilities (validation, error handling, etc.)

#### Success Criteria
- [ ] System functionality consolidated and improved
- [ ] Duplicated code eliminated
- [ ] Enhanced error handling and validation
- [ ] Maintained backward compatibility

### Phase 4: Service Layer Enhancement (Optional)
**Duration**: 2 weeks  
**Objective**: Add comprehensive service layer

#### Tasks Checklist
- [ ] Create logging service for debugging
- [ ] Add caching service for performance
- [ ] Implement analytics/monitoring service
- [ ] Build migration/upgrade service
- [ ] Enhance error handling throughout

#### Success Criteria
- [ ] Comprehensive logging and debugging
- [ ] Performance improvements through caching
- [ ] Usage tracking and monitoring
- [ ] Smooth upgrade/migration processes

### Phase 5: Final Testing & Cleanup (Always Last)
**Duration**: 1 week  
**Objective**: Comprehensive validation and cleanup

#### Tasks Checklist
- [ ] Run full regression test suite
- [ ] Validate performance hasn't regressed
- [ ] Update all documentation
- [ ] Final code quality review
- [ ] Prepare for production deployment

#### Success Criteria
- [ ] All tests passing (100% pass rate)
- [ ] Performance maintained or improved
- [ ] {TARGET_FILE_SIZE_REDUCTION}% file size reduction achieved
- [ ] Documentation fully updated
- [ ] Ready for production deployment

## File Structure Template

```
project-root/
├── SESSION_START.md              # Quick start guide
├── PROGRESS.md                   # Single progress tracker
├── REFACTORING_DECISIONS.md      # Architecture decisions log
├── EMERGENCY_RECOVERY.md         # Recovery procedures
├── scripts/
│   ├── progress-check.sh         # Automated progress analysis
│   ├── validate-phase.sh         # Phase completion validation
│   └── setup-refactoring.sh      # Initial setup script
└── [your existing project files]
```

## Scripts Template

### setup-refactoring.sh
```bash
#!/bin/bash
# Initial setup for refactoring project

PROJECT_NAME="{{PROJECT_NAME}}"
echo "Setting up refactoring for $PROJECT_NAME"

# Create necessary directories
mkdir -p scripts tests/mocks tests/characterization tests/integration

# Make scripts executable
chmod +x scripts/*.sh

# Create git branch for refactoring
git checkout -b refactoring
git add .
git commit -m "Initial refactoring setup"

echo "Refactoring setup complete!"
```

### progress-check.sh Template
```bash
#!/bin/bash
# Customize this script for your project structure

# Check project-specific files
echo "Checking project files:"
[ -f "{{PRIMARY_LARGE_FILE}}" ] && echo "  Primary file exists" || echo "  Primary file missing"
[ -f "{{SECONDARY_LARGE_FILE}}" ] && echo "  Secondary file exists" || echo "  Secondary file missing"

# Add your project-specific checks here
```

## Documentation Templates

### SESSION_START.md Template
```markdown
# Quick Session Start Guide

## Current Status
**Project**: {{PROJECT_NAME}}
**Phase**: 0 (Testing Foundation)
**Next Task**: Set up testing infrastructure

## Essential Context
- **Main Plan**: [CODE_QUALITY_REFACTORING_PLAN.md](CODE_QUALITY_REFACTORING_PLAN.md)
- **Progress**: [PROGRESS.md](PROGRESS.md)
- **Architecture Decisions**: [REFACTORING_DECISIONS.md](REFACTORING_DECISIONS.md)

## Project-Specific Commands
```bash
# Your project's test command
{{TEST_COMMAND}}

# Your project's build command  
{{BUILD_COMMAND}}

# Your project's dev command
{{DEV_COMMAND}}
```

## Success Metrics Template

### Overall Project Goals
- **File Size Reduction**: {{TARGET_FILE_SIZE_REDUCTION}}% average reduction
- **Test Coverage**: {{TARGET_TEST_COVERAGE}}%+ maintained throughout
- **Performance**: No regressions allowed
- **Functionality**: 100% preservation required

### Phase Success Criteria
Each phase must meet these criteria before proceeding:
- [ ] All tests pass (100% pass rate)
- [ ] No functional regressions detected
- [ ] Phase-specific objectives completed
- [ ] Documentation updated
- [ ] Clean git history with descriptive commits

## Customization Guide

### 1. Project Setup
1. Copy this template to your project
2. Replace all `{{VARIABLE}}` placeholders
3. Customize phases for your specific needs
4. Update file paths and commands

### 2. Phase Customization
- **Add phases** for project-specific needs
- **Remove phases** that don't apply
- **Adjust timelines** based on project complexity
- **Modify success criteria** for your quality standards

### 3. Script Customization
- **Update file paths** in progress-check.sh
- **Add project-specific checks** in validate-phase.sh
- **Customize test commands** for your testing framework
- **Adjust build processes** for your project

### 4. Documentation Customization
- **Update commands** for your project's scripts
- **Add project-specific context** to SESSION_START.md
- **Modify emergency procedures** for your git workflow
- **Customize decision templates** for your architecture

## Usage Instructions

### Initial Setup
1. Copy template files to your project
2. Run customization script to replace variables
3. Review and adjust phases for your needs
4. Create initial git commit with refactoring setup

### During Refactoring
1. Always start sessions with SESSION_START.md
2. Use scripts/progress-check.sh for status
3. Follow PROGRESS.md for current phase tasks
4. Update documentation after each session

### Emergency Procedures
1. Use EMERGENCY_RECOVERY.md if problems occur
2. Always maintain git history for rollback
3. Validate phase completion before proceeding
4. Keep documentation updated for continuity

This template provides a systematic approach to code refactoring that can be adapted for different projects while maintaining safety and quality standards.