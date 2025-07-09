# Session Management Guide for YouTube Plugin Refactoring

This document provides templates and strategies for maintaining continuity across multiple coding sessions while following the refactoring plan.

## Quick Reference

**Main Plan Document**: `/Users/jonathanhorst/development/youtube-plugin/CODE_QUALITY_REFACTORING_PLAN.md`

**6 Phases**: Testing Foundation → Settings Architecture → React Components → Provider System → Service Layer → Final Testing

**Context Documents**:
- `PHASE_0_CONTEXT.md` - Testing Foundation context
- `PHASE_1_CONTEXT.md` - Settings Architecture context
- `PHASE_2_CONTEXT.md` - React Components context
- `PHASE_3_CONTEXT.md` - Provider System context
- `PHASE_4_CONTEXT.md` - Service Layer context
- `PHASE_5_CONTEXT.md` - Final Testing context
- `REFACTORING_DECISIONS.md` - Architecture decisions log

## Session Start Template (Enhanced Context Loading)

```
I'm working on a systematic refactoring of my YouTube plugin codebase. Please read these context documents:

1. **Main Plan**: /Users/jonathanhorst/development/youtube-plugin/CODE_QUALITY_REFACTORING_PLAN.md
2. **Phase Context**: /Users/jonathanhorst/development/youtube-plugin/PHASE_[X]_CONTEXT.md
3. **Decisions Log**: /Users/jonathanhorst/development/youtube-plugin/REFACTORING_DECISIONS.md

Critical context questions:
- What phase are we in and what's the current objective?
- What files have been created/modified since last session?
- Are there any architectural decisions I need to be aware of?
- What were the key insights from the previous session?
- Are all tests still passing?

Please confirm you understand the current state and context before we proceed.
```

## Phase-Specific Prompts

### Phase 0: Testing Foundation (Week 1)
```
We're in Phase 0 of the refactoring plan (Testing Foundation).

Please read context documents:
1. PHASE_0_CONTEXT.md - Current status and next tasks
2. REFACTORING_DECISIONS.md - Architecture decisions

From the context documents, please confirm:
- Current completion status of testing infrastructure
- Files created vs. pending from phase context
- Next session tasks from context document
- Any architecture decisions made about testing approach

Key constraint: Must capture exact current behavior in tests to prevent regressions during refactoring.

Based on the context, what should we work on next?
```

### Phase 1: Settings Architecture Refactor (Week 2-3)
```
We're in Phase 1 of the refactoring plan (Settings Architecture Refactor).

Please read context documents:
1. PHASE_1_CONTEXT.md - Current status and architecture insights
2. REFACTORING_DECISIONS.md - Settings architecture decisions

From the context documents, please confirm:
- Current completion status of settings modules
- Architecture insights about settings.ts complexity
- Code complexity areas identified (lines 1247-1350, etc.)
- Key decisions made about module structure
- Next session tasks from context document

Key constraint: Must maintain existing MediaSummarizerSettings interface and all current functionality.

Based on the context, what should we work on next?
```

### Phase 2: React Component Decomposition (Week 4-5)
```
We're in Phase 2 of the refactoring plan (React Component Decomposition).

Please read context documents:
1. PHASE_2_CONTEXT.md - Current status and React considerations
2. REFACTORING_DECISIONS.md - Component architecture decisions

From the context documents, please confirm:
- Current completion status of React components
- React-specific considerations (refs, state management)
- Code complexity areas in view.tsx
- Key decisions made about component structure
- Next session tasks from context document

Key constraint: Must preserve all existing React refs, props, and component lifecycle.

Based on the context, what should we work on next?
```

### Phase 3: Provider System Enhancement (Week 6-7)
```
We're in Phase 3 of the refactoring plan (Provider System Enhancement).

Please read context documents:
1. PHASE_3_CONTEXT.md - Current status and provider considerations
2. REFACTORING_DECISIONS.md - Provider system decisions

From the context documents, please confirm:
- Current completion status of provider enhancements
- Provider-specific considerations (OpenAI, OpenRouter, Ollama)
- Code complexity areas in provider implementations
- Key decisions made about provider architecture
- Next session tasks from context document

Key constraint: Must maintain existing provider interfaces and use adapter pattern for legacy compatibility.

Based on the context, what should we work on next?
```

### Phase 4: Service Layer Enhancement (Week 8-9)
```
We're in Phase 4 of the refactoring plan (Service Layer Enhancement).

Please read context documents:
1. PHASE_4_CONTEXT.md - Current status and service considerations
2. REFACTORING_DECISIONS.md - Service layer decisions

From the context documents, please confirm:
- Current completion status of service enhancements
- Service-specific considerations (logging, caching, analytics)
- Code complexity areas in existing services
- Key decisions made about service architecture
- Next session tasks from context document

Key constraint: Must maintain existing service interfaces and use decorator pattern for enhancements.

Based on the context, what should we work on next?
```

### Phase 5: Final Testing & Cleanup (Week 10)
```
We're in Phase 5 of the refactoring plan (Final Testing & Cleanup).

Please read context documents:
1. PHASE_5_CONTEXT.md - Current status and final tasks
2. REFACTORING_DECISIONS.md - All architecture decisions

From the context documents, please confirm:
- Current completion status of final testing
- Performance validation results
- Documentation update status
- Quality assurance checklist progress
- Next session tasks from context document

Key constraint: Must ensure 100% functionality preservation and improved test coverage.

Based on the context, what should we work on next?
```

## Session Handoff Protocol

### Context Loading at Session Start
```
Session Start Protocol:
1. Read main plan document for overall context
2. Read current phase context document for specific status
3. Read decisions log for architectural choices
4. Verify current codebase state matches context documents
5. Identify any discrepancies and update context if needed
6. Confirm understanding before proceeding
```

### Context Update at Session End
```
Session End Protocol:
1. Update phase context with completion status
2. Record any architectural decisions made
3. Document code insights discovered
4. Update test status and coverage
5. Set next session priorities
6. Create handoff summary
```

### Context Document Maintenance
```
Context Maintenance:
- Update "Current State" section with file completion status
- Add "Key Decisions Made" with rationale
- Record "Architecture Insights" discovered during analysis
- Update "Next Session Tasks" with specific priorities
- Note "Potential Issues to Watch" for future sessions
```

## Progress Tracking Commands

### To Check Current Status
```
Please check the current state of our refactoring:
1. Read the current phase context document
2. Compare codebase state with context document
3. Identify any discrepancies or outdated information
4. Update context documents if needed
5. Confirm next logical step based on updated context
```

### To Resume Work
```
I'm resuming work on the refactoring plan. Please:
1. Load context from main plan + phase context + decisions log
2. Verify context documents match current codebase state
3. Review what's been completed from context documents
4. Identify current phase/step from context
5. Suggest next action based on "Next Session Tasks"
6. Remind me of key constraints and potential issues
```

### To Verify Progress
```
Please verify our progress against the refactoring plan:
- Load current phase context document
- Compare objectives with completion status
- Check that all constraints are being maintained
- Estimate percentage complete based on file status
- Review potential issues and blockers
- Update context document with current assessment
```

## Key Reminders to Include

### Safety Constraints
```
Important: This refactoring must maintain:
- All existing functionality unchanged
- Backward compatibility with current settings
- No breaking changes to public APIs
- Comprehensive testing before each phase completion
```

### Testing Requirements
```
Before proceeding, ensure:
- All tests pass (100% pass rate required)
- Code coverage maintained at 80%+ 
- No functional regressions detected
- Performance characteristics preserved
- All external APIs properly mocked
```

### Quality Gates
```
Before moving to the next phase, verify:
- All tests pass (100% pass rate)
- Code coverage at 80%+ (no decrease)
- No functional regressions detected
- Performance benchmarks met
- All phase objectives completed
- Documentation updated appropriately
```

## Session End Template (Enhanced Context Handoff)

```
Before we end this session, please update the context documents:

1. **Update PHASE_[X]_CONTEXT.md** with:
   - Current completion status (files created/modified)
   - Key decisions made this session
   - Architecture insights discovered
   - Next session priorities
   - Any issues to watch for

2. **Update REFACTORING_DECISIONS.md** with:
   - Any architectural decisions made
   - Rationale for decisions
   - Files affected by decisions

3. **Test status summary**:
   - Current pass/fail rate
   - Coverage percentage
   - Any new test failures
   - Performance benchmarks

4. **Create session handoff summary**:
   - What we accomplished
   - Current position in plan
   - Next session priorities
   - Important context to remember

Please ensure all context is captured for the next session.
```

## Plan Adherence Checks

### Weekly Reviews
```
Please review our progress against the refactoring plan:
- Are we on schedule for the current phase?
- Have we maintained all constraints?
- Are there any deviations from the plan?
- Do we need to adjust timelines or approach?
```

### Quality Checkpoints
```
Quality checkpoint - please verify:
- All phase deliverables are complete
- No breaking changes introduced
- Test coverage maintained or improved
- Performance characteristics preserved
- Documentation updated appropriately
```

## Example Full Session Start Prompts

### Beginning a New Phase
```
I'm starting a new phase in my YouTube plugin refactoring. Please read these context documents:

1. **Main Plan**: /Users/jonathanhorst/development/youtube-plugin/CODE_QUALITY_REFACTORING_PLAN.md
2. **Phase Context**: /Users/jonathanhorst/development/youtube-plugin/PHASE_1_CONTEXT.md
3. **Decisions Log**: /Users/jonathanhorst/development/youtube-plugin/REFACTORING_DECISIONS.md

Critical context for Phase 1:
- Current completion status from context document
- Architecture insights about settings.ts complexity
- Key decisions made in previous phases
- Test status and coverage requirements

Please confirm you understand the phase objectives and current context before we begin.
```

### Continuing Within a Phase
```
I'm continuing work within a phase of my YouTube plugin refactoring. Please read these context documents:

1. **Main Plan**: /Users/jonathanhorst/development/youtube-plugin/CODE_QUALITY_REFACTORING_PLAN.md
2. **Phase Context**: /Users/jonathanhorst/development/youtube-plugin/PHASE_[X]_CONTEXT.md
3. **Decisions Log**: /Users/jonathanhorst/development/youtube-plugin/REFACTORING_DECISIONS.md

Critical context needed:
- Current completion status from phase context
- Files completed vs. in progress vs. pending
- Architecture insights and code complexity areas
- Decisions made in previous sessions
- Next session tasks from context document

Based on the context documents, what should we work on next?
```

### Emergency Recovery
```
I need to recover context for my YouTube plugin refactoring. Please read these documents:

1. **Main Plan**: /Users/jonathanhorst/development/youtube-plugin/CODE_QUALITY_REFACTORING_PLAN.md
2. **All Phase Contexts**: /Users/jonathanhorst/development/youtube-plugin/PHASE_*_CONTEXT.md
3. **Decisions Log**: /Users/jonathanhorst/development/youtube-plugin/REFACTORING_DECISIONS.md

Then analyze the current codebase and determine:
1. Which files from the plan have been created/modified?
2. Which phase we're currently in based on completed work?
3. What work appears to be in progress?
4. What the next logical step should be?
5. Any potential issues or regressions to check?
6. Whether context documents need updating?

Help me rebuild context and get back on track with the refactoring plan.
```

## Common Pitfalls to Avoid

### Scope Creep
```
Reminder: Stay focused on the current phase objectives. Do not:
- Add new features during refactoring
- Optimize performance unless specifically planned
- Change existing functionality or behavior
- Skip testing or validation steps
```

### Breaking Changes
```
Critical: Before any changes, verify:
- All existing public interfaces remain unchanged
- No new dependencies introduced without approval
- Backward compatibility maintained
- Migration path exists for any necessary changes
```

### Phase Jumping
```
Important: Complete phases in order:
0. Testing Foundation (MUST be complete before any refactoring)
1. Settings Architecture (must be complete before React work)
2. React Components (must be complete before Provider work)
3. Provider System (must be complete before Service work)
4. Service Layer (must be complete before final testing)
5. Final Testing & Cleanup (comprehensive validation)
```

## Success Indicators

### Per Session
- [ ] Specific objectives met
- [ ] No functionality broken
- [ ] Code quality improved
- [ ] Progress documented
- [ ] Next steps clear

### Per Phase
- [ ] All deliverables complete
- [ ] Quality gates passed
- [ ] Tests passing
- [ ] Documentation updated
- [ ] Ready for next phase

### Overall Project
- [ ] 60% reduction in average file size
- [ ] 80%+ test coverage
- [ ] No functional regressions
- [ ] Improved maintainability
- [ ] Enhanced developer experience

## Troubleshooting

### If Lost in the Plan
1. Read the main plan document
2. Check current codebase state
3. Compare against phase objectives
4. Identify gaps or inconsistencies
5. Realign with plan requirements

### If Encountering Issues
1. Stop and assess impact
2. Check if issue is in scope
3. Refer to safety constraints
4. Consider rollback options
5. Document for future sessions

### If Behind Schedule
1. Reassess phase complexity
2. Identify blockers
3. Consider scope adjustments
4. Maintain quality standards
5. Update timeline expectations

## Context Document Maintenance

### Updating Phase Context Documents
```
After each significant change, update the phase context document:

**Current State Section**:
- Files completed: List files fully implemented and tested
- Files in progress: List files being worked on with % completion
- Files pending: List files not yet started
- Tests status: Current pass/fail rate and coverage

**Key Decisions Made Section**:
- Add any architectural decisions with rationale
- Include date and context for each decision
- Link to REFACTORING_DECISIONS.md for details

**Architecture Insights Section**:
- Note complex code areas discovered
- Document coupling issues found
- Record patterns that emerged

**Next Session Tasks Section**:
- List specific tasks for next session
- Prioritize tasks by importance
- Note any dependencies between tasks

**Potential Issues to Watch Section**:
- Document any concerns identified
- Note areas that need careful attention
- Record performance or compatibility issues
```

### Maintaining Decisions Log
```
For each architectural decision:
1. Add entry to REFACTORING_DECISIONS.md
2. Include date, context, decision, and rationale
3. List affected files
4. Update status as decisions are implemented
5. Reference from phase context documents
```

### Context Validation
```
Periodically validate context documents:
- Ensure current state matches actual codebase
- Verify all decisions are properly documented
- Check that next session tasks are realistic
- Update any outdated information
```

## File Organization During Refactoring

### Backup Strategy
- Keep original files as `.backup` until phase complete
- Use version control tags at phase boundaries
- Document any temporary workarounds
- Maintain rollback procedures

### Work-in-Progress Tracking
- Use `.wip` suffix for incomplete files
- Comment incomplete sections clearly
- Track dependencies between changes
- Test incrementally during development

## Context Document Quick Reference

### File Locations
- `PHASE_0_CONTEXT.md` - Testing Foundation context
- `PHASE_1_CONTEXT.md` - Settings Architecture context
- `PHASE_2_CONTEXT.md` - React Components context
- `PHASE_3_CONTEXT.md` - Provider System context
- `PHASE_4_CONTEXT.md` - Service Layer context
- `PHASE_5_CONTEXT.md` - Final Testing context
- `REFACTORING_DECISIONS.md` - Architecture decisions log

### Context Loading Checklist
- [ ] Read main plan document
- [ ] Read current phase context document
- [ ] Read architecture decisions log
- [ ] Verify context matches codebase state
- [ ] Identify next session tasks
- [ ] Understand key constraints and decisions

### Context Update Checklist
- [ ] Update completion status
- [ ] Record decisions made
- [ ] Document insights discovered
- [ ] Update next session tasks
- [ ] Note issues to watch
- [ ] Create session handoff summary

This enhanced guide ensures continuity and quality throughout the refactoring process by providing comprehensive context management, clear templates, and safety measures for each session.