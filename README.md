# Obsidian Media Summarizer

An Obsidian plugin that allows you to view YouTube videos in a custom pane while taking notes, with AI-powered transcript summarization using multiple AI providers (OpenAI, OpenRouter, Ollama).

## Features

- **Custom Video Player**: Dedicated view with embedded YouTube player
- **Real-time Timestamping**: Insert current video timestamps into your notes
- **Multi-Provider AI Support**: Choose from OpenAI, OpenRouter, or Ollama for transcript processing
- **Enhanced Transcripts**: AI-powered transcript formatting with better punctuation and speaker identification
- **External Transcript Detection**: Automatically find higher-quality transcripts from video descriptions
- **Keyboard Shortcuts**: Full keyboard control for seamless note-taking workflow
- **Frontmatter Integration**: Load videos from note frontmatter `url` field
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

## Quick Start

1. **Add video to your note** - Include YouTube URL in frontmatter:
   ```yaml
   ---
   url: https://www.youtube.com/watch?v=VIDEO_ID
   ---
   ```

2. **Open Media Summarizer** - Click play button (▶️) in ribbon or use Command Palette

3. **Start note-taking** - Use timestamp button to insert current video time into notes

4. **Configure AI (optional)** - Add API key in Settings → AI Summarization for transcript summaries

## 📖 Complete Usage Guide

For detailed setup instructions, configuration options, keyboard shortcuts, troubleshooting, and advanced features, see the **[Complete Usage Guide](USAGE.md)**.

The usage guide covers:
- **Detailed Configuration**: Step-by-step setup for OpenAI, OpenRouter, and Ollama
- **All Features**: Video controls, AI summarization, enhanced transcripts, external transcript detection
- **Keyboard Shortcuts**: Complete list with recommended key assignments
- **Advanced Features**: Multi-provider setup, fallback configuration, timestamp behavior
- **Troubleshooting**: Solutions for common issues and performance optimization

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
├── main.ts                      # Main plugin class
├── view.tsx                     # Custom ItemView with YouTube player (React)
├── settings.ts                  # Progressive disclosure settings UI
├── summarizer.ts                # YouTube transcript extraction
├── llm-summarizer.ts           # Multi-provider AI integration
├── youtube-api-transcript.ts   # YouTube Data API integration  
├── timestamp-click-handler.ts  # Timestamp interaction handling
└── providers/                  # AI provider implementations
    ├── base.ts                 # Abstract base provider class
    ├── provider-manager.ts     # Provider management and selection
    ├── openai.ts              # OpenAI API integration
    ├── openrouter.ts          # OpenRouter API integration
    └── ollama.ts              # Ollama local AI integration
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