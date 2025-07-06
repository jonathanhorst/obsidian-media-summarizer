# Changelog

All notable changes to the Media Summarizer plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Enhanced Transcript Model Selector**: Complete model selection UI for Enhanced Transcript LLM Config section
- **Provider-Specific Model Dropdowns**: OpenAI, OpenRouter, and Ollama model selection with refresh buttons

### Fixed
- **Settings UX Issues**: Multiple critical settings interface fixes
  - Fixed hotkeys link to properly open Obsidian settings with navigation
  - Corrected playback speed dropdown order using individual addOption calls
  - Moved YouTube API key to experimental features section per wireframe specification
- **Enhanced Transcript Configuration**: Added missing model selector for enhanced transcript provider selection

### Changed
- **Project Cleanup**: Removed completed development files and standalone testing environment
- **Documentation Updates**: Updated all documentation to reflect current multi-provider architecture

## [0.1.0-beta] - 2025-01-04

### Added
- **Multi-Provider AI Support**: Choose between OpenAI, OpenRouter, or Ollama for transcript processing
- **Dynamic Model Detection**: Automatically fetch latest available models from OpenAI and OpenRouter APIs
- **Custom Model Input**: Support for experimental and new model releases with custom model name input
- **Ollama Integration**: Local AI processing with automatic model detection from installed Ollama models
- **External Transcript Detection**: Automatically search video descriptions for higher-quality transcript links
- **Enhanced Transcript Formatting**: AI-powered transcript improvement with better punctuation and speaker identification
- **Fallback Provider Support**: Automatically try backup AI provider if primary fails
- **Comprehensive Keyboard Shortcuts**: Full video control via customizable hotkeys
- **Progressive Settings UI**: "Value first" settings organization - immediate utility without API setup
- **Real-time Timestamp Controls**: Configurable timestamp and playback offset behavior
- **WebScraping.AI Integration**: Fetch external transcripts from discovered URLs
- **YouTube Data API Integration**: Enhanced video metadata and description access
- **Provider Status Indicators**: Visual feedback for API connection states
- **Conditional UI Elements**: Enhanced Transcript button only shows when feature is enabled

### Changed
- **Reorganized Settings**: New information architecture following UX best practices
  - 🎮 Playback & Interaction (immediate value, no APIs needed)
  - 📺 YouTube Integration (basic API requirement)
  - 📊 AI & Processing (optional enhancement)
  - 🔧 Advanced Settings (collapsible expert configuration)
- **Enhanced Button Controls**: Updated video player with conditional button visibility
- **Improved Error Handling**: Better fallback mechanisms and user feedback
- **Updated Documentation**: Comprehensive README with step-by-step usage guide

### Technical Improvements
- **Provider Architecture**: Abstract base class system for AI provider implementations
- **Settings Migration**: Automatic upgrade from legacy single-provider settings
- **API Abstractions**: OpenAI-compatible interface for maximum flexibility
- **React Integration**: Enhanced view components with conditional rendering
- **TypeScript Enhancements**: Improved type safety and interfaces

### Fixed
- **Conditional Button Display**: Enhanced Transcript button now properly hidden when feature is disabled
- **Settings Visibility**: Multi-provider options now correctly appear after configuration
- **Model Selection**: Dynamic model lists replace hardcoded options for future-proofing

## [0.1.0-alpha] - 2024-12-XX

### Initial Release
- Basic YouTube video player integration
- OpenAI transcript summarization
- Timestamp insertion functionality
- Frontmatter-based video loading
- Basic settings interface

---

**Legend:**
- 🎯 **Added**: New features and capabilities
- 🔄 **Changed**: Modifications to existing functionality  
- 🐛 **Fixed**: Bug fixes and corrections
- 🗑️ **Removed**: Deprecated or removed features
- 🛡️ **Security**: Security-related improvements