# Media Summarizer Settings Wireframe

> **Instructions**: Edit this file to propose changes to the settings organization. 
> Move sections around, add/remove items, suggest new groupings, etc.
> Then we can implement your changes quickly.

---

## Current Settings Structure

### 🎬 Video Playback
**Status**: ✅ No setup required  
**Enables**: Basic video controls, timestamps

#### Video Controls
- **Seek seconds**: [1-60] (How many seconds to skip forward/backward)
- **Default playback speed**: [0.5x to 2x] (Starting speed for new videos)

#### Timestamp Behavior  
- **Timestamp offset**: [0-10 seconds] (Subtract seconds to capture context)
- **Playback offset**: [0-10 seconds] (Auto-rewind when inserting timestamps)
- **Pause on insert**: [toggle] (Automatically pause video when inserting timestamps)

#### Formatting
- **Enhanced transcript formatting**: [toggle] (Use AI to improve transcript readability)

---

### 🤖 Smart Analysis
**Status**: ⚠️ Choose provider to enable  
**Enables**: Summarize, Enhanced transcripts

#### Choose Provider
- **AI Provider**: [dropdown] (OpenAI/OpenRouter/Ollama)

#### [Current Provider] Configuration
**For OpenAI**:
- **OpenAI API Key**: [text input]
- **OpenAI Model**: [dropdown with refresh button]

**For OpenRouter**:
- **OpenRouter API Key**: [text input] 
- **OpenRouter Model**: [dropdown with refresh button]

**For Ollama**:
- **Ollama Base URL**: [text input]
- **Ollama Model**: [dropdown with refresh button]

---

### 📄 Transcripts
**Status**: ⚠️ Needs YouTube API  
**Enables**: Raw transcripts from YouTube

#### Basic Transcript Access
- **YouTube Data API Key**: [text input] (Enter your YouTube Data API v3 key)

---

### 🧪 Experimental Features

#### External transcript detection
- **Toggle**: [on/off] (Search for higher-quality transcripts in video descriptions)

**When enabled, shows**:
- **YouTube API Status**: ✅ Configured in Basic Transcripts / ⚠️ Configure YouTube API above
- **WebScraping.AI API Key**: [text input]
- **Info box**: Explanation of how external transcript detection works

---

### ▶️ Advanced Options (Collapsible)

#### External Transcript Provider Override
- **Use different provider for external transcripts**: [toggle]  
- **External transcript provider**: [dropdown] (When override enabled)
- **External transcript model**: [dropdown] (When override enabled)

#### Development & Testing
- **Run integration tests**: [button]

---

## Notes / Issues to Address

1. **"Choose provider to enable" showing when Ollama is configured** - Status detection bug
2. **Multiple AI provider sections** - Could be consolidated
3. **Advanced Options** - May have too much complexity for average users
4. **Status indicators** - Some are confusing or incorrect

---

## Proposed Changes Section
*Edit below to suggest reorganization*

### Option A: Consolidate AI Sections?
- Merge Smart Analysis provider selection with Transcripts enhanced formatting?

### Option B: Simplify Status Messages?
- Remove confusing status indicators?
- Focus on clear error states only?

### Option C: Regroup by User Goals?
- "Getting Started" (no API keys needed)
- "AI Features" (requires setup)  
- "Power User" (experimental/advanced)

---

**Instructions**: Edit any section above to propose changes, then let me know!