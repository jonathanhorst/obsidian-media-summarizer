# Media Summarizer Usage Guide

Complete guide to using the Media Summarizer plugin for Obsidian.

## Table of Contents

- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Basic Usage](#basic-usage)
- [AI Features](#ai-features)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Advanced Features](#advanced-features)
- [Troubleshooting](#troubleshooting)

## Quick Start

Get started immediately without any API keys:

### 1. Add Video to Your Note
Include a YouTube URL in your note's frontmatter:
```yaml
---
media_url: https://www.youtube.com/watch?v=dQw4w9WgXcQ
---
```

### 2. Open Media Summarizer
- Click the play button (▶️) in the ribbon, or
- Use Command Palette: "Media Summarizer: Open view"

### 3. Start Taking Notes
- Use the timestamp button to insert current video time into your notes
- Control playback with buttons or keyboard shortcuts
- Switch between notes while keeping video playing

## Configuration

The plugin uses a "value first" settings approach - start with basic features, then add AI capabilities as needed.

### Playback & Interaction (No API Keys Required)

**Video Controls:**
- **Seek seconds**: How many seconds to skip forward/backward (1-60 seconds)
- **Default playback speed**: Starting speed when loading videos (0.5x to 2x)

**Timestamp Behavior:**
- **Timestamp offset**: Subtract seconds to capture context before current moment (0-10 seconds)
- **Playback offset**: Auto-rewind when inserting timestamps for context review (0-10 seconds)  
- **Pause on insert**: Automatically pause video when inserting timestamps

**Formatting:**
- **Enhanced transcript formatting**: Use AI to improve YouTube transcript readability

### AI Providers (Choose One)

#### OpenAI
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys) to get your API key
2. In plugin settings: AI Summarization → OpenAI Configuration
3. Enter your API key (starts with `sk-`)
4. Choose model:
   - **GPT-4o-mini**: Recommended - best balance of quality and cost
   - **GPT-4o**: Latest model with highest quality
   - **Custom**: Enter any model name for experimental releases

#### OpenRouter  
1. Go to [OpenRouter](https://openrouter.ai/keys) to get your API key
2. In plugin settings: AI Summarization → OpenRouter Configuration
3. Enter your API key (starts with `sk-or-v1-`)
4. Choose from 100+ models:
   - **Claude 3.5 Sonnet**: Recommended for transcript enhancement
   - **GPT-4o-mini**: Economical OpenAI option
   - **Llama models**: Open source options

#### Ollama (Local AI)
1. Install [Ollama](https://ollama.ai/) on your computer
2. Download a model: `ollama pull llama3.1:8b`
3. Start Ollama: `ollama serve`
4. In plugin settings: AI Summarization → Ollama Configuration
5. Plugin will auto-detect your installed models
6. Popular models: `llama3.1:8b`, `mistral:7b`, `codellama:7b`

### Optional Enhancements

#### YouTube Integration
**YouTube Data API Key:**
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Enable YouTube Data API v3
- Create an API key
- Enter in plugin settings: Transcript Quality → YouTube Data API Key
- **Enables**: Basic transcripts, external transcript detection, video metadata

#### External Transcript Detection
**WebScraping.AI API Key:**
- Get your key from [WebScraping.AI](https://webscraping.ai/)
- Enter in plugin settings: Transcript Quality → WebScraping.AI API Key
- **Benefits**: Higher-quality transcripts, lower AI processing costs
- **How it works**: Searches video descriptions for transcript links

## Basic Usage

### Video Playback Controls

**Using Buttons:**
- 🕒 **Timestamp**: Insert current video time into your notes
- 📝 **Summarize**: Generate AI summary (requires AI provider)
- 📄 **Enhanced Transcript**: AI-formatted transcript (if enabled)
- 📄 **Raw Transcript**: Original YouTube transcript
- 🔍 **External Search**: Find higher-quality transcripts (requires YouTube API)

**Using Keyboard Shortcuts** (configure in Settings → Hotkeys):
Search for "Media Summarizer" and assign your preferred shortcuts:

| Action | Suggested Shortcut | Description |
|--------|-------------------|-------------|
| Insert Timestamp | `Ctrl+I` | Insert current video time |
| Play/Pause | `Ctrl+K` | Toggle video playback |
| Rewind | `Ctrl+J` | Skip backward (uses seek seconds setting) |
| Fast Forward | `Ctrl+L` | Skip forward (uses seek seconds setting) |
| Speed Up | `Shift+>` | Increase playback speed |
| Speed Down | `Shift+<` | Decrease playback speed |
| Mute | `M` | Toggle audio mute |

### Timestamp Insertion

When you click the timestamp button or use the keyboard shortcut:

1. **Current time** is captured from the video
2. **Timestamp offset** is subtracted (if set) to capture context before current moment  
3. **Timestamp** is inserted at cursor position in your note
4. **Video rewinds** by playback offset amount (if set) for context review
5. **Video pauses** (if "Pause on insert" is enabled)

**Example timestamp formats:**
```
[1:23] - Simple format
[1:23:45] - Hours included for long videos
```

### Video Persistence

- **Seamless note switching**: Video continues playing when you switch between notes
- **Smart refresh**: Video only reloads when `media_url` actually changes
- **State preservation**: Playback position and speed maintained during note switches

## AI Features

### Transcript Summarization

**How to use:**
1. Configure an AI provider (see Configuration section)
2. Open a video in Media Summarizer
3. Click "📝 Summarize" button

**Features:**
- **Smart chunking**: Long transcripts automatically split for better accuracy
- **Context-aware**: Uses video title and description for better understanding
- **Customizable**: Works with any configured AI provider (OpenAI/OpenRouter/Ollama)

### Enhanced Transcript Formatting

**Enable in settings:** Playback & Interaction → Enhanced transcript formatting

**Improvements:**
- Better punctuation and capitalization
- Speaker identification where possible
- Organized into coherent paragraphs
- Corrected name spelling using video title/description
- Improved readability

**How it works:**
1. Fetches original YouTube transcript
2. Uses your configured AI provider to enhance formatting
3. Inserts formatted transcript into your note

### External Transcript Detection

**Requirements:** YouTube Data API key + WebScraping.AI API key

**How it works:**
1. Plugin analyzes video description for transcript links
2. Automatically scrapes higher-quality transcripts when found
3. Uses external transcripts instead of YouTube's auto-generated ones
4. Processes with your AI provider for summarization/enhancement

**Benefits:**
- Often more accurate than YouTube auto-generated transcripts
- Saves on AI processing costs (external transcripts are usually cleaner)
- Automatically finds premium transcript sources

## Advanced Features

### Multi-Provider AI Setup

**Provider Override for External Transcripts:**
- Advanced Settings → External Transcript Provider Override
- Use different AI provider for external transcript processing
- Useful for cost optimization or quality preferences

### Custom AI Models

**OpenAI Custom Models:**
1. Select "Custom Model" in model dropdown
2. Enter exact model name (e.g., `gpt-4o-2024-11-20`)
3. Useful for accessing new experimental releases

**OpenRouter Custom Models:**
1. Select "Custom Model" in model dropdown  
2. Enter model ID (e.g., `anthropic/claude-3.5-sonnet`)
3. Access to 100+ models not in preset list

### Playback Customization

**Timestamp Behavior Fine-tuning:**
- **Timestamp offset**: Capture context before current moment
  - Set to 2-3 seconds to include important lead-up information
- **Playback offset**: Review context after inserting timestamp
  - Set to 2-5 seconds to automatically review what you just noted
- **Pause on insert**: Stop video to focus on note-taking
  - Enable for detailed note-taking, disable for continuous flow

**Default Playback Speed:**
- Set your preferred starting speed for all videos
- Useful for content consumption optimization
- Speed can be adjusted per-video using controls

## Troubleshooting

### Video Issues

**Video not loading?**
- ✅ Check `media_url` format in frontmatter: `media_url: https://www.youtube.com/watch?v=VIDEO_ID`
- ✅ Ensure YouTube URL is accessible (not private/restricted/age-restricted)
- ✅ Try refreshing the Media Summarizer view
- ✅ Check if video requires sign-in or has regional restrictions

**Video player not responding?**
- ✅ Reload Obsidian (Ctrl+R / Cmd+R)
- ✅ Check browser's YouTube access in your system
- ✅ Disable other YouTube-related browser extensions temporarily

### AI Features Not Working

**Summarize button does nothing?**
- ✅ Verify API key is correctly entered in settings
- ✅ Check your AI provider account has sufficient credits/usage limits
- ✅ Test with shorter videos first (API timeouts on very long content)
- ✅ Check Obsidian's Developer Console (Ctrl+Shift+I) for error messages

**Enhanced transcripts not generating?**
- ✅ Ensure "Enhanced transcript formatting" is enabled in settings
- ✅ Verify AI provider is configured with valid API key
- ✅ Check that video has available transcripts (some videos don't)
- ✅ Try with different video to isolate the issue

**Wrong or poor AI responses?**
- ✅ Try different AI model (GPT-4o for highest quality)
- ✅ Ensure video has good quality transcripts
- ✅ Use external transcript detection for better source material
- ✅ Check if video is in supported language for your AI provider

### Transcript Issues

**No transcripts available?**
- ✅ Some videos don't have auto-generated transcripts
- ✅ Enable external transcript detection in settings
- ✅ Check if video has closed captions manually enabled on YouTube
- ✅ Try videos from channels that typically provide transcripts

**External transcript detection not working?**
- ✅ Verify YouTube Data API key is valid and has quota remaining
- ✅ Check WebScraping.AI API key and account status
- ✅ Ensure "Check for external transcripts" is enabled
- ✅ Not all videos have external transcript links in descriptions

### Performance Issues

**Plugin feels slow?**
- ✅ Use GPT-4o-mini instead of GPT-4o for faster processing
- ✅ Enable external transcript detection to reduce AI processing load
- ✅ Consider using Ollama for local processing (no API limits)
- ✅ Check your internet connection for video loading

**High API costs?**
- ✅ Use GPT-4o-mini or OpenRouter for more economical options
- ✅ Enable external transcript detection (often cleaner, needs less AI processing)
- ✅ Use Ollama for completely free local processing
- ✅ Enable enhanced formatting only when needed

### Settings and Configuration

**Settings changes not taking effect?**
- ✅ Settings save automatically, but try reloading Obsidian if issues persist
- ✅ Check that you're in the correct settings section
- ✅ Some settings require re-opening the Media Summarizer view

**Keyboard shortcuts not working?**
- ✅ Assign shortcuts in Settings → Hotkeys → search "Media Summarizer"
- ✅ Check for conflicts with other plugins or system shortcuts
- ✅ Focus must be on Obsidian for shortcuts to work

**Plugin not appearing?**
- ✅ Enable plugin in Settings → Community Plugins
- ✅ Check that plugin files are in correct Obsidian plugins directory
- ✅ Reload Obsidian (Ctrl+R / Cmd+R)

## Getting Help

If you're still experiencing issues:

1. **Check the [GitHub Issues](https://github.com/jonathanhorst/obsidian-media-summarizer/issues)** for known problems
2. **Search [GitHub Discussions](https://github.com/jonathanhorst/obsidian-media-summarizer/discussions)** for community solutions
3. **Create a new issue** with:
   - Obsidian version
   - Plugin version  
   - Steps to reproduce the problem
   - Any error messages from Developer Console

## Tips for Best Experience

### Workflow Optimization
- **Set up keyboard shortcuts** for frequently used actions (timestamp, play/pause)
- **Use timestamp offsets** to capture context before key moments
- **Enable enhanced formatting** for better transcript readability

### Cost Management
- **Start with GPT-4o-mini** for good balance of quality and cost
- **Enable external transcript detection** to reduce AI processing needs
- **Use Ollama** for completely free local AI processing
- **Consider OpenRouter** for access to more economical models

### Note-Taking Strategy
- **Use timestamps liberally** to create easy navigation points
- **Combine summarization with manual notes** for comprehensive coverage
- **Take advantage of video persistence** to switch between related notes
- **Use enhanced transcripts** as searchable reference material