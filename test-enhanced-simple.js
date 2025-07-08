#!/usr/bin/env node

/**
 * Simple test script for enhanced transcript feature
 * Run with: node test-enhanced-simple.js
 */

// Load environment variables from .env file
require('dotenv').config();

// Simple test using direct API calls (mimicking the plugin behavior)
const TEST_CONFIG = {
  videoUrl: 'https://www.youtube.com/watch?v=qqP1ucSiVkE',
  openaiApiKey: process.env.OPENAI_API_KEY,
  youtubeApiKey: process.env.YOUTUBE_API_KEY, // Optional - will use fallback if not available
  webscrapingApiKey: process.env.WEBSCRAPING_AI_KEY,
  model: 'gpt-4o-mini'
};

async function testEnhancedTranscript() {
  console.log('🚀 Testing Enhanced Transcript Feature (Simple)');
  console.log('===============================================\n');
  
  // Check API keys
  if (!TEST_CONFIG.openaiApiKey) {
    console.error('❌ OpenAI API key not found in .env file');
    return;
  }
  
  console.log('✅ API keys loaded from .env file');
  if (TEST_CONFIG.youtubeApiKey) {
    console.log('   📺 YouTube Data API: Available');
  } else {
    console.log('   📺 YouTube Data API: Not available (will use oEmbed fallback)');
  }
  
  if (TEST_CONFIG.webscrapingApiKey) {
    console.log('   🕷️  WebScraping.AI: Available');
  }
  
  console.log('🎥 Test video:', TEST_CONFIG.videoUrl);
  console.log('🤖 Model:', TEST_CONFIG.model);
  console.log('');
  
  try {
    // Step 1: Get video metadata
    console.log('📥 Step 1: Getting video metadata...');
    const videoId = extractVideoId(TEST_CONFIG.videoUrl);
    const metadata = await getYouTubeMetadata(videoId, TEST_CONFIG.youtubeApiKey);
    
    console.log(`✅ Metadata retrieved:`);
    console.log(`   Title: "${metadata.title}"`);
    console.log(`   Channel: "${metadata.channel}"`);
    console.log(`   Duration: ${metadata.durationSeconds ? formatDuration(metadata.durationSeconds) : 'N/A'}`);
    console.log('');
    
    // Step 2: Test transcript fetching using the same method as the plugin
    console.log('📥 Step 2: Testing transcript fetching...');
    const transcriptLines = await getTranscriptLinesTest(TEST_CONFIG.videoUrl);
    console.log(`✅ Found ${transcriptLines.length} transcript segments`);
    
    if (!transcriptLines || transcriptLines.length === 0) {
      throw new Error('No transcript lines found for this video');
    }
    
    const lastLine = transcriptLines[transcriptLines.length - 1];
    const calculatedDuration = Math.ceil((lastLine.offset + lastLine.duration) / 1000);
    console.log(`   Calculated duration: ${formatDuration(calculatedDuration)}`);
    console.log('');
    
    // Step 3: Test OpenAI enhancement
    console.log('🔄 Step 3: Testing OpenAI enhancement...');
    console.log('   This may take 30-60 seconds...');
    
    const enhancedTranscript = await enhanceTranscriptDirect(
      transcriptLines,
      metadata,
      TEST_CONFIG.openaiApiKey,
      TEST_CONFIG.model
    );
    
    console.log('✅ Enhancement completed!');
    console.log('');
    
    // Step 4: Analyze results
    console.log('📊 Step 4: Analyzing results...');
    
    if (enhancedTranscript.startsWith('Error:')) {
      console.error('❌ Enhancement failed:', enhancedTranscript);
      return;
    }
    
    // Check timestamps
    const timestampMatches = enhancedTranscript.match(/\\[\\d{1,2}:\\d{2}(?::\\d{2})?\\]\\(\\)/g) || [];
    console.log(`   Timestamps found: ${timestampMatches.length}`);
    
    if (timestampMatches.length > 0) {
      console.log(`   First: ${timestampMatches[0]}`);
      console.log(`   Last: ${timestampMatches[timestampMatches.length - 1]}`);
    }
    
    // Check headings
    const headings = enhancedTranscript.match(/^### .+$/gm) || [];
    console.log(`   Headings found: ${headings.length}`);
    if (headings.length > 0) {
      console.log(`   Headings: ${headings.join(', ')}`);
    }
    
    console.log(`   Word count: ${enhancedTranscript.split(/\\s+/).length}`);
    console.log('');
    
    // Step 5: Save output
    const fs = require('fs');
    const outputFile = 'test-enhanced-output.md';
    const output = `# Enhanced Transcript Test Output

**Video:** ${TEST_CONFIG.videoUrl}
**Duration:** ${formatDuration(calculatedDuration)}
**Model:** ${TEST_CONFIG.model}
**Timestamp:** ${new Date().toISOString()}

## Enhanced Transcript

${enhancedTranscript}`;
    
    fs.writeFileSync(outputFile, output);
    console.log(`💾 Full output saved to: ${outputFile}`);
    
    // Show sample
    console.log('\\n📄 Sample output (first 500 characters):');
    console.log('=' .repeat(60));
    console.log(enhancedTranscript.substring(0, 500) + '...');
    console.log('=' .repeat(60));
    
    console.log('\\n🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Helper functions
function extractVideoId(url) {
  const urlObj = new URL(url);
  if (urlObj.hostname.includes('youtube.com')) {
    return urlObj.searchParams.get('v');
  } else if (urlObj.hostname.includes('youtu.be')) {
    return urlObj.pathname.slice(1);
  }
  throw new Error('Invalid YouTube URL');
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

async function getYouTubeMetadata(videoId, apiKey) {
  const fetch = (await import('node-fetch')).default;
  
  if (apiKey) {
    // Try YouTube Data API first
    try {
      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const video = data.items[0];
        const snippet = video.snippet;
        const contentDetails = video.contentDetails;
        
        // Parse duration
        let durationSeconds;
        if (contentDetails?.duration) {
          const match = contentDetails.duration.match(/PT(?:(\\d+)H)?(?:(\\d+)M)?(?:(\\d+)S)?/);
          if (match) {
            const hours = parseInt(match[1] || '0');
            const minutes = parseInt(match[2] || '0');
            const seconds = parseInt(match[3] || '0');
            durationSeconds = hours * 3600 + minutes * 60 + seconds;
          }
        }
        
        return {
          title: snippet.title,
          channel: snippet.channelTitle,
          description: snippet.description || '',
          durationSeconds
        };
      }
    } catch (error) {
      console.log('   ⚠️  YouTube API failed, using fallback...');
    }
  }
  
  // Fallback to oEmbed API
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oembedUrl);
    const data = await response.json();
    
    return {
      title: data.title || 'Unknown Title',
      channel: data.author_name || 'Unknown Channel',
      description: '', // oEmbed doesn't provide description
      durationSeconds: undefined
    };
  } catch (error) {
    return {
      title: 'Unknown Title',
      channel: 'Unknown Channel',
      description: '',
      durationSeconds: undefined
    };
  }
}

async function enhanceTranscriptDirect(transcriptLines, metadata, apiKey, model) {
  const fetch = (await import('node-fetch')).default;
  
  // Format transcript with timestamps (simplified version of the plugin logic)
  const formattedLines = transcriptLines.map(line => {
    const offsetSeconds = Math.floor(line.offset / 1000);
    const minutes = Math.floor(offsetSeconds / 60);
    const seconds = offsetSeconds % 60;
    const timestamp = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return `At ${timestamp} - ${line.text.trim()}`;
  });
  
  const timestampedTranscript = formattedLines.join('\\n');
  
  const lastLine = transcriptLines[transcriptLines.length - 1];
  const durationSeconds = Math.ceil((lastLine.offset + lastLine.duration) / 1000);
  const durationDisplay = formatDuration(durationSeconds);
  
  // The actual prompt from your enhanced script
  const prompt = `CONTEXT INFORMATION:
Video Title: "${metadata.title}"
Channel: "${metadata.channel}"
Video Duration: ${durationDisplay} (${durationSeconds} seconds)
Description: "${metadata.description}"

--- END OF CONTEXT ---

RAW TRANSCRIPT WITH TIMESTAMPS:
${timestampedTranscript}

--- END OF TRANSCRIPT ---

IMPORTANT: Your task is to clean up the raw transcript text while preserving the spoken words. Only add words to complete sentences. Add punctuation, proper capitalization, paragraph breaks, and organize into sections with timestamps.

STEP 1: First, analyze the transcript to determine how many speakers are present. Look for:
- Changes in voice/speaking style
- Conversational back-and-forth
- Interview format indicators
- Multiple distinct speaking patterns

STEP 2: Format the transcript based on your speaker analysis:

IF SINGLE SPEAKER (most common):
### Introduction

[00:00]()

Use the EXACT words from the transcript, just cleaned up. For example: "There's a new method to make Cursor and Windsurf 10 times smarter that no one's talking about. Claude Code just went public and now works directly inside your AI editors, making AI coding ridiculously powerful."

### Key Concepts Discussion  

[02:30]()

Continue with the exact spoken words from the transcript, organized by topic. Add punctuation and paragraph breaks but preserve what was actually said.

[03:45]()

Another paragraph with content.

### Technical Details

[05:45]()

Keep organizing the actual transcript content by topic, using the real words spoken, not summaries or paraphrases.

IF MULTIPLE SPEAKERS (only when clearly identifiable):
### Introduction

[00:00]()

**Host**
Use the exact words spoken by the host, cleaned up with punctuation: "Welcome to today's show. We're here with..."

**Guest**
Use the exact words spoken by the guest, cleaned up: "Thanks for having me. I'm excited to talk about..."

### Discussion

[02:30]()

**Host**
Continue with exact spoken words from the host, adding punctuation and organization but preserving the actual speech.

CRITICAL RULES:
- PRESERVE EXACT WORDS: Use the actual spoken words from the transcript
- CLEAN, DON'T REWRITE: Only add punctuation, capitalization, and organization - don't change the meaning
- Only list the speakers if more than one person is speaking
- Use ### topic-based headings
- format the timestamps as [HH:MM:SS]() on separate lines before copy
- Group copy into logical paragraphs
- consolidate timestamps. Place one timestamp before each paragraph. the timestamp should match the first line of copy.
- TIMESTAMP VALIDATION: Use ONLY timestamps from the provided transcript data
- All output timestamps must be ≤ ${durationDisplay}
- Fix spelling of names/technical terms by using the video title and description context
- Remove excessive filler words ("um," "uh," repetitive phrases) but keep the core spoken content

Format the output as clean markdown.`;

  const requestBody = {
    model: model,
    messages: [
      {
        role: 'system',
        content: 'You are an expert transcript editor. Your job is to clean up raw transcript text while preserving the EXACT spoken words. Only add punctuation, formatting, and organization to make the actual spoken content more readable.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.3,
    max_tokens: 4000
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  const data = await response.json();
  
  if (!data.choices || data.choices.length === 0) {
    throw new Error('No response from OpenAI');
  }

  return data.choices[0].message.content.trim();
}

// Transcript fetching function that mimics the plugin
async function getTranscriptLinesTest(url) {
  // This mimics the logic from src/summarizer.ts getTranscriptLines function
  try {
    // For now, let's use a simple approach with the youtube-transcript package
    // In the real plugin, it uses YoutubeAPITranscript which is more complex
    const { YoutubeTranscript } = require('youtube-transcript');
    const videoId = extractVideoId(url);
    
    const transcriptArray = await YoutubeTranscript.fetchTranscript(videoId);
    
    // Convert to the plugin's format
    return transcriptArray.map(item => ({
      text: item.text,
      offset: item.offset * 1000, // Convert to milliseconds
      duration: item.duration * 1000 // Convert to milliseconds
    }));
    
  } catch (error) {
    // If that fails, throw an error for now
    throw new Error(`Failed to fetch transcript: ${error.message}`);
  }
}

// Run the test
if (require.main === module) {
  testEnhancedTranscript().catch(console.error);
}