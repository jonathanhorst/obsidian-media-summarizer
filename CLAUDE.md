# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Obsidian plugin called "Media Summarizer" that allows users to view YouTube videos in a custom pane while taking notes, with AI-powered transcript summarization using OpenAI's API.

## Development Commands

- **Development mode**: `npm run dev` - Starts esbuild in watch mode with inline sourcemaps
- **Build**: `npm run build` - Runs TypeScript type checking and builds for production
- **Version bump**: `npm run version` - Updates manifest.json and versions.json, then stages them for git

## Architecture

The plugin follows Obsidian's plugin architecture with these key components:

### Core Files
- `src/main.ts` - Main plugin class extending Obsidian's Plugin, handles lifecycle, commands, and view management
- `src/view.ts` - Custom ItemView for the YouTube video display and controls
- `src/settings.ts` - Settings management and UI tab
- `src/summarizer.ts` - YouTube transcript extraction and OpenAI summarization logic

### Plugin Flow
1. Plugin reads `media_url` from active note's frontmatter
2. Extracts YouTube video ID and embeds video in custom view
3. Fetches transcript using `youtube-transcript` library
4. Uses OpenAI API to summarize transcript content
5. View automatically refreshes when switching between notes or updating frontmatter

### Key Integration Points
- **Frontmatter Integration**: Plugin expects `media_url: [YouTube URL]` in note frontmatter
- **Custom View**: Registers `MEDIA_SUMMARIZER_VIEW_TYPE` view in right sidebar by default
- **Event Handling**: Listens for `active-leaf-change` and `vault.modify` events to refresh view
- **API Integration**: Uses OpenAI GPT-3.5-turbo for transcript summarization

### Build System
- Uses esbuild for bundling with production/development modes
- TypeScript compilation with `tsc -noEmit -skipLibCheck`
- Bundles to `main.js` with external Obsidian dependencies
- Supports inline sourcemaps in development mode

### Configuration Requirements
- OpenAI API key must be configured in plugin settings
- Plugin validates API key format (must start with 'sk-')
- Uses `isConfigured()` method to check setup status