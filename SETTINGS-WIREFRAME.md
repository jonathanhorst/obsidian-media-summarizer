# Media Summarizer Settings Wireframe

# Media Summarizer Settings

View the [documentation](USAGE.md) to answer your question.

**Keyboard shortcuts**
You can configure [keyboard shortcuts](link to hotkeys settings) for further playback control and other controls. Learn how to configure in the [documentation](USAGE.md).

## Playback

Essential features that work immediately without additional setup.

**Seek seconds**: [1-10]
How many seconds to skip forward/backward

**Default playback speed**: [0.5x 0.75x 1x 1.25x 1.5x 2x] (1x by default)

**Timestamp offset**: [toggle]
Enable to offsett timestamps when inserting them into your notes

**Timestamp offset amount**: [0-10 seconds] (2 by default)

**Playback offset**: [toggle]
Enable to auto-rewind after inserting timestamps

**Playback offset amount**: [0-10 seconds] (2 by default)

**Pause on insert**: [toggle]
Automatically pause video when inserting timestamps

---

## Power Features

Enhanced capabilities that require additional configuration.


**Summarization**: [toggle]
Get instant video summaries - Key points, main ideas, and takeaways.
Requires an LLM to be configured.  [Configure an LLM](anchor link to section)  (only show this fow if the API is key is not entered)

**Enhanced transcript**: [toggle]
Get clean, readable transcripts with proper punctuation, paragraphs, and speaker identification.
Requires an LLM to be configured.  [Configure an LLM](anchor link to section)  (only show this fow if the API is key is not entered)

## Primary LLM Config
(conditional)

Choose your preferred LLM provider and model based on your budget and privacy preferences.

**LLM Provider**: [dropdown]

**OpenAI API Key**: [text input] 
**OpenAI Model**: [dropdown] (conditional)

**OpenRouter API Key**: [text input] 
**OpenRouter Model**: [dropdown]  (conditional)

**Ollama Base URL**: [text input]
**Ollama Model**: [dropdown with refresh button]


## Enhanced Transcript LLM Config
(conditional)

Set a different LLM for [Enhanced Transcripts](Link to settings section) balancing price, quality, and privacy.

**Unique enhanced transcript LLM** [toggle]

**LLM Provider**: [dropdown] (conditional)


---

### 🧪 Experimental Features

**External transcript detection** [toggle]
Find higher-quality transcripts - Often more accurate than YouTube's auto-generated versions.

**WebScraping.AI API Key**: [text input]
Enter your webscraping.ai API key

**YouTube Data API Key**: [text input]
Enter your YouTube Data API v3 key