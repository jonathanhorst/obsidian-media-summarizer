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
- **Development Source**: `/Users/jonathanhorst/development/youtube-plugin/` (Source code and compilation)
- **Development Obsidian**: `/Users/jonathanhorst/development/plugin-dev/.obsidian/plugins/media-summarizer/` (Testing environment)
- **Production Obsidian**: `/Users/jonathanhorst/Library/CloudStorage/Dropbox/documents/Research/.obsidian/plugins/media-summarizer/` (Live environment)
- **GitHub Repository**: `https://github.com/jonathanhorst/obsidian-media-summarizer.git`

⚠️ **IMPORTANT**: Always deploy to **Development Obsidian** for testing, NOT Production!

### Complete Development Cycle

#### 1. Make Code Changes
Work in the development directory (`/Users/jonathanhorst/development/youtube-plugin/`)

#### 2. Build Plugin
```bash
npm run build
```
This creates `main.js` in the development directory.

#### 3. Deploy to Obsidian (Development Testing)
⚠️ **DEPLOY TO DEVELOPMENT DIRECTORY ONLY** - Never deploy directly to production!

Copy essential files to the **DEVELOPMENT** Obsidian plugin directory:
```bash
# 🔧 DEVELOPMENT DEPLOYMENT (for testing)
DEV_PLUGIN_DIR="/Users/jonathanhorst/development/plugin-dev/.obsidian/plugins/media-summarizer"

# Ensure development plugin directory exists
mkdir -p "$DEV_PLUGIN_DIR"

# Copy compiled plugin
cp /Users/jonathanhorst/development/youtube-plugin/main.js "$DEV_PLUGIN_DIR/main.js"

# Copy metadata
cp /Users/jonathanhorst/development/youtube-plugin/manifest.json "$DEV_PLUGIN_DIR/manifest.json"

# Copy styles
cp /Users/jonathanhorst/development/youtube-plugin/styles.css "$DEV_PLUGIN_DIR/styles.css"

echo "✅ Plugin deployed to DEVELOPMENT environment!"
```

❌ **NEVER USE** - Production deployment (only for final releases):
```bash
# 🚫 PRODUCTION DEPLOYMENT (avoid during development)
# PROD_PLUGIN_DIR="/Users/jonathanhorst/Library/CloudStorage/Dropbox/documents/Research/.obsidian/plugins/media-summarizer"
# cp main.js "$PROD_PLUGIN_DIR/main.js"
# cp manifest.json "$PROD_PLUGIN_DIR/manifest.json"
# cp styles.css "$PROD_PLUGIN_DIR/styles.css"
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

#### Quick Deploy Scripts
Create these scripts to automate deployment and prevent errors:

**Development Deploy Script** (`deploy-dev.sh`):
```bash
#!/bin/bash
# deploy-dev.sh - Deploy to development environment
set -e

DEV_PLUGIN_DIR="/Users/jonathanhorst/development/plugin-dev/.obsidian/plugins/media-summarizer"

echo "🔧 Deploying to DEVELOPMENT environment..."
echo "Target: $DEV_PLUGIN_DIR"

# Ensure development plugin directory exists
mkdir -p "$DEV_PLUGIN_DIR"

# Copy files
cp main.js "$DEV_PLUGIN_DIR/main.js"
cp manifest.json "$DEV_PLUGIN_DIR/manifest.json"
cp styles.css "$DEV_PLUGIN_DIR/styles.css"

echo "✅ Plugin deployed to DEVELOPMENT environment!"
echo "🔄 Restart Obsidian or reload the plugin to test changes"
```

**Production Deploy Script** (`deploy-prod.sh`) - Use only for final releases:
```bash
#!/bin/bash
# deploy-prod.sh - Deploy to production environment (use carefully!)
set -e

PROD_PLUGIN_DIR="/Users/jonathanhorst/Library/CloudStorage/Dropbox/documents/Research/.obsidian/plugins/media-summarizer"

echo "🚨 WARNING: Deploying to PRODUCTION environment!"
echo "Target: $PROD_PLUGIN_DIR"
echo "Are you sure you want to deploy to production? (y/N)"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    # Copy files
    cp main.js "$PROD_PLUGIN_DIR/main.js"
    cp manifest.json "$PROD_PLUGIN_DIR/manifest.json"
    cp styles.css "$PROD_PLUGIN_DIR/styles.css"
    
    echo "✅ Plugin deployed to PRODUCTION environment!"
else
    echo "❌ Production deployment cancelled"
    exit 1
fi
```

**Usage**:
```bash
# For development (safe, use this most of the time)
./deploy-dev.sh

# For production (only when releasing)
./deploy-prod.sh
```

### Deployment Best Practices

#### Development vs Production Guidelines
1. **Always test in development first** - Never deploy untested code to production
2. **Use development environment for all coding work** - This prevents breaking your live workflow
3. **Only deploy to production for stable releases** - When features are fully tested and ready
4. **Backup production before deploying** - Copy current production files before overwriting

#### Common Deployment Mistakes to Avoid
❌ **Don't do this**:
- Deploying directly to production during development
- Forgetting to build before deploying (`npm run build`)
- Copying source files instead of compiled `main.js`
- Overwriting production without testing in development first

✅ **Do this instead**:
- Always deploy to development first
- Test thoroughly in development environment
- Only deploy to production when ready for release
- Use the provided deploy scripts to prevent errors

## Reference Materials

### Directory Structure
The `.references/` directory contains cloned repositories for reference and learning purposes. These are not part of the main project but provide valuable implementation examples.

### Usage Guidelines
When implementing new features:
1. Study relevant reference implementations
2. Adapt patterns to fit our plugin architecture
3. Maintain markdown interoperability 
4. Document any insights gained from reference materials