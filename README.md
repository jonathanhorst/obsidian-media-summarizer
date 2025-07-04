# Obsidian Media Summarizer

An Obsidian plugin that allows you to view YouTube videos in a custom pane while taking notes, with AI-powered transcript summarization using multiple AI providers (OpenAI, OpenRouter, Ollama).

## Features

- **Custom Video Player**: Dedicated view with embedded YouTube player
- **Real-time Timestamping**: Insert current video timestamps into your notes
- **Multi-Provider AI Support**: Choose from OpenAI, OpenRouter, or Ollama for transcript processing
- **Enhanced Transcripts**: AI-powered transcript formatting with better punctuation and speaker identification
- **External Transcript Detection**: Automatically find higher-quality transcripts from video descriptions
- **Keyboard Shortcuts**: Full keyboard control for seamless note-taking workflow
- **Frontmatter Integration**: Load videos from note frontmatter `media_url` field
- **Video Persistence**: Video continues playing while switching between notes
- **Smart Focus Management**: Seamless interaction between video and note editing

## Installation

### From GitHub Releases (Recommended)
1. Download the latest release from the [Releases page](https://github.com/jonathanhorst/obsidian-media-summarizer/releases)
2. Extract the files to your Obsidian plugins folder: `.obsidian/plugins/media-summarizer/`
3. Enable the plugin in Obsidian Settings → Community Plugins

### Manual Installation
1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run build` to build the plugin
4. Copy `main.js`, `manifest.json`, and `styles.css` to your plugins folder

## Configuration

The plugin uses a "value first" settings approach - you can start using playback controls immediately, then add AI features as needed.

### Quick Start (No API Keys Required)
1. **Playback Controls**: Configure video playback, timestamps, and keyboard shortcuts
2. **Keyboard Shortcuts**: Go to Settings → Hotkeys, search "Media Summarizer", assign shortcuts

### AI Features (Requires API Keys)
Choose your preferred AI provider:

#### OpenAI
1. Go to Settings → Media Summarizer → AI & Processing
2. Select "OpenAI" as your provider
3. Enter your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
4. Choose your preferred model (GPT-4o-mini recommended for best balance)

#### OpenRouter
1. Select "OpenRouter" as your provider  
2. Enter your API key from [OpenRouter](https://openrouter.ai/keys)
3. Choose from 100+ available models (Claude 3.5 Sonnet recommended)

#### Ollama (Local AI)
1. Install [Ollama](https://ollama.ai/) and run: `ollama pull llama3.1:8b`
2. Select "Ollama" as your provider
3. Plugin will auto-detect your installed models

### YouTube Integration (Optional)
- **YouTube API Key**: Enable transcript features and external transcript detection
- **WebScraping.AI Key**: Enable higher-quality external transcript fetching

## Usage

### Step-by-Step Guide

#### 1. Add Video to Your Note
Include a YouTube URL in your note's frontmatter:
```yaml
---
media_url: https://www.youtube.com/watch?v=dQw4w9WgXcQ
---
```

#### 2. Open Media Summarizer
- Click the play button (▶️) in the ribbon, or
- Use Command Palette: "Media Summarizer: Open view"

#### 3. Control Video Playback
**Using Buttons:**
- 🕒 **Timestamp**: Insert current video time
- 📝 **Summarize**: Generate AI summary
- 📄 **Enhanced Transcript**: AI-formatted transcript (if enabled)
- 📄 **Raw Transcript**: Original YouTube transcript
- 🔍 **External Search**: Find higher-quality transcripts

**Using Keyboard Shortcuts** (configure in Settings → Hotkeys):
- **Insert Timestamp**: ⌃I (suggested)
- **Play/Pause**: ⌃K (suggested)
- **Rewind**: ⌃J (suggested)
- **Fast Forward**: ⌃L (suggested)
- **Speed Up/Down**: Shift+>/< (suggested)
- **Mute**: M (suggested)

#### 4. AI-Powered Features

**Summarization:**
- Click "📝 Summarize" to generate comprehensive video summaries
- Uses your configured AI provider (OpenAI/OpenRouter/Ollama)
- Automatically chunks long transcripts for better accuracy

**Enhanced Transcripts:**
- Toggle in Settings → Playback & Interaction → Formatting
- Improves punctuation, speaker identification, and organization
- Uses video title/description for better name spelling

**External Transcript Detection:**
- Enable in Settings → YouTube Integration
- Automatically searches video descriptions for transcript links
- Often provides higher accuracy than YouTube's auto-generated transcripts
- Saves on AI processing costs

### Advanced Features

#### Timestamp Behavior
- **Timestamp Offset**: Subtract seconds to capture context before current moment
- **Playback Offset**: Auto-rewind when inserting timestamps for context review
- **Pause on Insert**: Automatically pause video when inserting timestamps

#### Multi-Provider AI
- **Fallback Support**: Automatically try backup provider if primary fails
- **Dynamic Model Detection**: Fetches latest available models from APIs
- **Custom Models**: Enter any model name for experimental/new releases

#### Video Persistence
- Videos maintain playback state when switching between notes
- Smart refresh only when `media_url` actually changes
- Continues playing while inserting timestamps or summaries

### Troubleshooting

**Video not loading?**
- Check that `media_url` is correctly formatted in frontmatter
- Ensure YouTube URL is accessible (not private/restricted)

**AI features not working?**
- Verify API keys in Settings → AI & Processing
- Check your AI provider account has sufficient credits
- Try the fallback provider if enabled

**No transcripts available?**
- Some videos don't have auto-generated transcripts
- Try enabling external transcript detection
- Check if video has closed captions enabled

## Development

### Building the Plugin

```bash
# Install dependencies
npm install

# Development build (watches for changes)
npm run dev

# Production build
npm run build
```

### Project Structure

```
src/
├── main.ts          # Main plugin class
├── view.ts          # Custom ItemView with YouTube player
├── settings.ts      # Settings management
└── summarizer.ts    # Transcript fetching and AI integration
```

## Requirements

- Obsidian v0.15.0 or higher
- Internet connection for YouTube videos
- **For AI features** (optional): API key for your chosen provider
  - OpenAI: [Platform API Keys](https://platform.openai.com/api-keys)
  - OpenRouter: [OpenRouter Keys](https://openrouter.ai/keys)  
  - Ollama: [Local installation](https://ollama.ai/)
- **For external transcripts** (optional): 
  - YouTube Data API v3 key
  - WebScraping.AI API key

## Privacy & Security

- **API Keys**: All keys stored locally in Obsidian, only sent to respective services
- **YouTube Videos**: Loaded using privacy-enhanced `youtube-nocookie.com` domain  
- **No Data Collection**: Plugin doesn't collect, store, or transmit user data
- **Local AI Option**: Use Ollama for completely offline AI processing
- **Open Source**: Full source code available for security audit

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

- **Issues**: Report bugs or request features on [GitHub Issues](https://github.com/jonathanhorst/obsidian-media-summarizer/issues)
- **Discussions**: Join the conversation in [GitHub Discussions](https://github.com/jonathanhorst/obsidian-media-summarizer/discussions)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

🎬 **Enhance your note-taking with video content and AI-powered insights!**