# Enhanced Transcript Test Script

This script allows you to test the enhanced transcript feature directly from the command line without going through Obsidian.

## Setup

1. **Set your API keys** (choose one method):

   **Option A: Environment variables (recommended)**
   ```bash
   export OPENAI_API_KEY="sk-your-openai-key-here"
   export YOUTUBE_API_KEY="your-youtube-data-api-key-here"
   ```

   **Option B: Edit the script directly**
   - Open `test-enhanced-transcript.js`
   - Replace the placeholder API keys in the `TEST_CONFIG` object

2. **Build the project** (if not already done):
   ```bash
   npm run build
   ```

## Usage

Run the test script:
```bash
node test-enhanced-transcript.js
```

## What it tests

1. **Transcript Fetching**: Gets transcript lines with timing data from YouTube
2. **Metadata Retrieval**: Fetches video metadata (title, channel, description, duration)
3. **Enhancement Process**: Runs the actual enhancement with your updated prompt
4. **Result Analysis**: 
   - Counts timestamps and validates their format
   - Checks that timestamps don't exceed video duration
   - Counts section headings
   - Measures word/character count
5. **Output**: Shows sample output and saves full result to `test-enhanced-output.md`

## Test Video

By default, it tests with Fireship's Gemini CLI video (4:12 duration):
https://www.youtube.com/watch?v=qqP1ucSiVkE

You can change the test video by editing the `videoUrl` in the `TEST_CONFIG` object.

## Expected Output

The script will show:
- ✅ Step-by-step progress
- 📊 Analysis of timestamps, headings, and content
- 📄 Sample of the enhanced transcript
- 💾 Full output saved to file

## Troubleshooting

- **API Key Issues**: Make sure your keys are valid and have proper permissions
- **Build Issues**: Run `npm run build` before testing
- **Network Issues**: Check your internet connection
- **Duration Mismatch**: If timestamps exceed video duration, there may be an issue with the enhancement prompt

## Benefits

- **Fast Testing**: No need to reload Obsidian plugin
- **Detailed Analysis**: Shows exactly what's working/not working
- **Saved Output**: Full results saved for inspection
- **Multiple Runs**: Easy to test different configurations quickly