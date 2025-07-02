# CLAUDE.md

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

## Development Workflow

### Directory Structure
- **Development**: `/Users/jonathanhorst/development/youtube-plugin/`
- **Production (Obsidian)**: `/Users/jonathanhorst/Library/CloudStorage/Dropbox/documents/Research/.obsidian/plugins/media-summarizer/`
- **GitHub Repository**: `https://github.com/jonathanhorst/obsidian-media-summarizer.git`

### Complete Development Cycle

#### 1. Make Code Changes
Work in the development directory (`/Users/jonathanhorst/development/youtube-plugin/`)

#### 2. Build Plugin
```bash
npm run build
```
This creates `main.js` in the development directory.

#### 3. Deploy to Obsidian (Local Testing)
Copy essential files to the Obsidian plugin directory:
```bash
# Copy compiled plugin
cp /Users/jonathanhorst/development/youtube-plugin/main.js /Users/jonathanhorst/Library/CloudStorage/Dropbox/documents/Research/.obsidian/plugins/media-summarizer/main.js

# Copy metadata
cp /Users/jonathanhorst/development/youtube-plugin/manifest.json /Users/jonathanhorst/Library/CloudStorage/Dropbox/documents/Research/.obsidian/plugins/media-summarizer/manifest.json

# Copy styles
cp /Users/jonathanhorst/development/youtube-plugin/styles.css /Users/jonathanhorst/Library/CloudStorage/Dropbox/documents/Research/.obsidian/plugins/media-summarizer/styles.css
```

#### 4. Test in Obsidian
- Restart Obsidian or reload the plugin
- Test new functionality
- Verify everything works as expected

#### 5. Commit to Git (Source Control)
```bash
# Stage source files (NOT main.js - it's gitignored)
git add src/ package.json manifest.json styles.css CLAUDE.md

# Commit with descriptive message
git commit -m "Add transcript insertion feature

- New Insert Transcript button in media player
- Fetches full YouTube transcript with timestamps
- Inserts at end of note with ## Transcript heading

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to GitHub
git push origin main
```

### Important Notes

#### Files in Git Repository (Development Best Practices)
**✅ Include in Git:**
- Source code (`src/` directory)
- Configuration (`package.json`, `tsconfig.json`, `esbuild.config.mjs`)
- Plugin metadata (`manifest.json`)
- Styles (`styles.css`)
- Documentation (`README.md`, `CLAUDE.md`)

**❌ Do NOT include in Git:**
- Compiled output (`main.js`) - Users build their own
- Dependencies (`node_modules/`) - Users run `npm install`
- User settings (`data.json`) - Personal configuration

#### Two-Track System
- **GitHub**: Source code for development and collaboration
- **Local Obsidian**: Compiled files for actual plugin usage

#### Quick Deploy Script
Consider creating a deploy script to automate step 3:
```bash
#!/bin/bash
# deploy.sh
PLUGIN_DIR="/Users/jonathanhorst/development/plugin-dev/.obsidian/plugins/media-summarizer"
cp main.js "$PLUGIN_DIR/main.js"
cp manifest.json "$PLUGIN_DIR/manifest.json"
cp styles.css "$PLUGIN_DIR/styles.css"
echo "Plugin deployed to Obsidian!"
```

## Reference Materials

### Directory Structure
The `.references/` directory contains cloned repositories for reference and learning purposes. These are not part of the main project but provide valuable implementation examples.

### Usage Guidelines
When implementing new features:
1. Study relevant reference implementations
2. Adapt patterns to fit our plugin architecture
3. Maintain markdown interoperability 
4. Document any insights gained from reference materials