# Obsidian Media Summarizer

An Obsidian plugin that allows you to view YouTube videos in a custom pane while taking notes, with AI-powered transcript summarization using OpenAI.

## Features

- **Custom Video Player**: Dedicated view with embedded YouTube player
- **Real-time Timestamping**: Insert current video timestamps into your notes
- **AI Summarization**: Generate summaries of video transcripts using OpenAI GPT-3.5-turbo
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

1. **OpenAI API Key**: Go to Settings → Media Summarizer and enter your OpenAI API key
   - Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
   - The key is stored locally and only sent to OpenAI for summarization

## Usage

### Basic Workflow

1. **Add Video URL to Note**: Include a YouTube URL in your note's frontmatter:
   ```yaml
   ---
   media_url: https://www.youtube.com/watch?v=dQw4w9WgXcQ
   ---
   ```

2. **Open Media Summarizer**: Click the play button (▶️) in the ribbon or use the command palette

3. **Take Notes**: The video loads automatically, and you can take notes while watching

4. **Insert Timestamps**: Click "🕒 Timestamp" to insert the current video time (e.g., `[01:23:45]`)

5. **Generate Summary**: Click "📝 Summarize" to generate an AI summary of the video transcript

### Features in Detail

#### Timestamping
- Captures real-time video position using YouTube Player API
- Inserts timestamps in `[HH:MM:SS]` format at cursor position
- Non-intrusive - video continues playing during timestamp insertion

#### AI Summarization
- Automatically fetches video transcripts using `youtube-transcript` library
- Processes long transcripts in chunks for better accuracy
- Generates comprehensive summaries using OpenAI GPT-3.5-turbo
- Appends summary under "## Summary" heading in your note

#### Video Persistence
- Videos maintain playback state when switching focus
- Smart refresh logic prevents unnecessary video reloads
- Only reloads when `media_url` actually changes

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
- OpenAI API key for summarization features
- Internet connection for YouTube videos and OpenAI API

## Privacy & Security

- **OpenAI API Key**: Stored locally in Obsidian settings, only sent to OpenAI
- **YouTube Videos**: Loaded using privacy-enhanced `youtube-nocookie.com` domain
- **No Data Collection**: Plugin doesn't collect or transmit user data

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