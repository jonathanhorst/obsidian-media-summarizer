#!/usr/bin/env node

/**
 * Prompt Iteration Test for Enhanced Transcript
 * Allows quick testing of prompt changes without going through Obsidian
 */

require('dotenv').config();

// Mock Obsidian modules for Node.js compatibility
global.requestUrl = async ({ url, method, headers, body }) => {
  const fetch = (await import('node-fetch')).default;
  
  const response = await fetch(url, {
    method,
    headers,
    body
  });
  
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = null;
  }
  
  return {
    status: response.status,
    text,
    json
  };
};

// Mock additional Obsidian functions
global.request = global.requestUrl;

// Test video URL - same as used in the enhanced feature
const TEST_VIDEO_URL = 'https://www.youtube.com/watch?v=qqP1ucSiVkE';

// Helper functions to fetch real data
function extractVideoId(url) {
  const urlObj = new URL(url);
  if (urlObj.hostname.includes('youtube.com')) {
    return urlObj.searchParams.get('v');
  } else if (urlObj.hostname.includes('youtu.be')) {
    return urlObj.pathname.slice(1);
  }
  throw new Error('Invalid YouTube URL');
}

async function getYouTubeMetadata(videoId, apiKey) {
  const fetch = (await import('node-fetch')).default;
  
  if (apiKey) {
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
      description: '',
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

async function getTranscriptLines(url) {
  try {
    // For testing, let's use the working transcript data from your transcript-values.md
    // This gives us the exact same data your plugin processes
    const transcriptData = [
      { text: "last week Google finally put Gemini in the command line allowing you to hand total control of your machine over to artificial intelligence", offset: 0, duration: 8000 },
      { text: "it can write code create files execute commands automatically and do everything else programmers used to get paid for", offset: 8000, duration: 4000 },
      { text: "but once again Google has showed up late to this party because we already have tools like Claude Code OpenAI Codeex Warp and", offset: 12000, duration: 8000 },
      { text: "countless others dominating the space but the Gemini CLI is different for two key reasons one it's the only major solution out there that's entirely open- source and two it's free to use with", offset: 20000, duration: 12000 },
      { text: "very generous usage limits we're talking a thousand free model requests per day to one of the most powerful coding models out there by comparison you'd likely need to pay $200 a month for", offset: 32000, duration: 10000 },
      { text: "Claude Pro Max Ultra to generate a similar amount of slop in your standard output but as the old saying goes you get what you pay for and in today's video we'll find out if the Gemini CLI", offset: 42000, duration: 10000 },
      { text: "is any good it is June 30th 2025 and you're watching the code report as of today Claude Code dominates the vibe coding CLI space they were the first major model provider to create a tool", offset: 52000, duration: 10000 },
      { text: "like this and since then it's been copied by OpenAI and now Gemini and then you also have a bunch of third party tools that can wrap various models but Claude Code has two major problems not", offset: 62000, duration: 10000 },
      { text: "only is it closed source but it's also extremely expensive you'll find tales all over the internet of people dropping thousands of dollars to vibe code with it over a weekend and the sad reality is", offset: 72000, duration: 10000 },
      { text: "that 99% of those apps will never go on to recoup their token cost and actual revenue from customers that's sad but Anthropic also just released a new feature that allows you to share your", offset: 82000, duration: 10000 },
      { text: "failures with everybody else when you vibe code with Claude it stores the results as artifacts but now they have a new thing called artifact space where you can host and share your artifacts", offset: 92000, duration: 8000 },
      { text: "publicly this means you can fork other people's slop and modify it with your own slop which will lead to all sorts of opportunities to make the world a better place however if you're too poor to", offset: 100000, duration: 9000 },
      { text: "afford Claude a much better opportunity would be Gemini which offers a crazy generous thousand model requests per day to get started install it with npm and then run the Gemini command that should", offset: 109000, duration: 10000 },
      { text: "bring up a prompt field in your terminal where you can ask it to start building something on your machine my usual test for a new model is to have it build something with spell 5 and runes most", offset: 119000, duration: 9000 },
      { text: "models fail at this but I have seen Gemini succeed in the past so let's find out if it can do it again like other CLI tools it will start by building a plan and then it will ask you for permission", offset: 128000, duration: 10000 },
      { text: "to execute various things on your machine like it might want to run some commands to install dependencies or use make dur to create some new directories when vibe coding I always make sure to", offset: 138000, duration: 9000 },
      { text: "give it permission to do everything and always approve changes without reviewing them first when looking at the initial code I was happy to see that Gemini actually used the new spell rune syntax", offset: 147000, duration: 9000 },
      { text: "and at first glance this code actually looks pretty good i think overall you can get pretty good code quality out of Gemini even for spelvel but but it struggled to actually get the app", offset: 156000, duration: 8000 },
      { text: "running i let it run for about 30 minutes but eventually it just got stuck and could never figure out the solution it appears to have run into an issue configuring the build tool V and I don't", offset: 164000, duration: 8000 },
      { text: "blame it because that's always been the most painful part of being a web developer vit is awesome but build tools like Webpack stole my childhood from there I shut her down and then restarted", offset: 172000, duration: 9000 },
      { text: "it to see if it could debug its own code and eventually we got to a full working tic-tac-toe game that's pretty cool but overall I'd have to say the experience is much rougher around the edges", offset: 181000, duration: 9000 },
      { text: "compared to Claude Code and other tools it's a brand new tool and if Google follows its typical pattern it'll eventually become really good that tons of people will use it and then they'll", offset: 190000, duration: 8000 },
      { text: "kill it off a few years later but right now it's definitely a tool you should consider using for the price alone speaking of which another awesome tool you should know about is MX the sponsor", offset: 198000, duration: 9000 },
      { text: "of today's video if you've ever tried integrating video into an application you know it's deceptively easy to get started but difficult to get right and that's where MX comes in it gives you", offset: 207000, duration: 9000 },
      { text: "API first video infrastructure that handles hosting encoding adaptive bit rate streaming analytics and even live streaming all through a highly customizable API and the best part is", offset: 216000, duration: 10000 },
      { text: "that they now let you upload and store 10 videos and get 100,000 delivery minutes every month all for free so whether you're trying to vibe code a new project with awesome video features or", offset: 226000, duration: 10000 },
      { text: "you've already got millions of users like Typeform or Shopify MX can help you grow your needs without breaking your budget try it out for free at mx.com/fireship", offset: 236000, duration: 8000 },
      { text: "to get an additional $50 in credits this has been the Code Report [Music]", offset: 244000, duration: 6000 }
    ];
    
    console.log(`   ✅ Using real transcript data (${transcriptData.length} segments)`);
    return transcriptData;
    
  } catch (error) {
    throw new Error(`Failed to fetch transcript: ${error.message}`);
  }
}

// Format transcript with timestamps
function formatTranscriptWithTimestamps(transcriptLines) {
  const formattedLines = transcriptLines.map(line => {
    const offsetSeconds = Math.floor(line.offset / 1000);
    const minutes = Math.floor(offsetSeconds / 60);
    const seconds = offsetSeconds % 60;
    const timestamp = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return `At ${timestamp} - ${line.text.trim()}`;
  });
  
  // Calculate duration from the transcript data
  const lastLine = transcriptLines[transcriptLines.length - 1];
  const calculatedDuration = Math.ceil((lastLine.offset + lastLine.duration) / 1000);
  
  return {
    formattedText: formattedLines.join('\n'),
    durationSeconds: calculatedDuration
  };
}

// THE PROMPT - EDIT THIS TO TEST DIFFERENT VERSIONS
function createEnhancementPrompt(timestampedTranscript, metadata, durationDisplay, durationSeconds) {
  return `CONTEXT INFORMATION:
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
- Place clickable timestamps [HH:MM:SS]() on separate lines after headings
- TIMESTAMP VALIDATION: Use ONLY timestamps from the provided transcript data
- All output timestamps must be ≤ ${durationDisplay}
- Consolidate provided timestamps to meaningful 30-60 second segments
- Fix spelling of names/technical terms by using the video title and description context
- Remove excessive filler words ("um," "uh," repetitive phrases) but keep the core spoken content

Format the output as clean markdown.`;
}

// Test the enhancement
async function testEnhancement() {
  console.log('🧪 Prompt Iteration Test with Real Data');
  console.log('=======================================\n');
  
  console.log(`📥 Fetching real data from: ${TEST_VIDEO_URL}`);
  
  try {
    // Step 1: Get video metadata
    console.log('📝 Step 1: Getting video metadata...');
    const videoId = extractVideoId(TEST_VIDEO_URL);
    const metadata = await getYouTubeMetadata(videoId, process.env.YOUTUBE_API_KEY);
    
    console.log(`   ✅ Title: "${metadata.title}"`);
    console.log(`   ✅ Channel: "${metadata.channel}"`);
    console.log(`   ✅ Duration: ${metadata.durationSeconds ? `${Math.floor(metadata.durationSeconds / 60)}:${(metadata.durationSeconds % 60).toString().padStart(2, '0')}` : 'Unknown'}`);
    
    // Step 2: Get transcript lines
    console.log('\n📝 Step 2: Getting transcript lines...');
    const transcriptLines = await getTranscriptLines(TEST_VIDEO_URL);
    
    console.log(`   ✅ Found ${transcriptLines.length} transcript segments`);
    
    // Calculate duration from transcript
    const lastLine = transcriptLines[transcriptLines.length - 1];
    const calculatedDuration = Math.ceil((lastLine.offset + lastLine.duration) / 1000);
    const durationDisplay = `${Math.floor(calculatedDuration / 60)}:${(calculatedDuration % 60).toString().padStart(2, '0')}`;
    
    console.log(`   ✅ Calculated duration: ${durationDisplay}`);
    console.log(`   ✅ First segment: "${transcriptLines[0].text.substring(0, 50)}..."`);
    console.log(`   ✅ Last segment: "${transcriptLines[transcriptLines.length - 1].text.substring(0, 50)}..."`);
    
    // Step 3: Format transcript with timestamps  
    console.log('\n📝 Step 3: Formatting transcript...');
    const { formattedText: timestampedTranscript } = formatTranscriptWithTimestamps(transcriptLines);
    
    // Step 4: Create the prompt
    console.log('\n📝 Step 4: Creating enhancement prompt...');
    const prompt = createEnhancementPrompt(timestampedTranscript, metadata, durationDisplay, calculatedDuration);
    
    console.log('🚀 Sending to OpenAI...');
    const startTime = Date.now();
    
    // Call OpenAI
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
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
      })
    });

    const data = await response.json();
    const endTime = Date.now();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from OpenAI');
    }

    const enhancedTranscript = data.choices[0].message.content.trim();
    
    console.log(`✅ Enhancement completed in ${Math.round((endTime - startTime) / 1000)}s\n`);
    
    // Analyze results
    console.log('📊 Analysis:');
    const timestampMatches = enhancedTranscript.match(/\\[\\d{1,2}:\\d{2}(?::\\d{2})?\\]\\(\\)/g) || [];
    const headingMatches = enhancedTranscript.match(/^### .+$/gm) || [];
    const paragraphs = enhancedTranscript.split(/\\n\\s*\\n/).filter(p => p.trim() && !p.startsWith('#'));
    
    console.log(`   Timestamps found: ${timestampMatches.length}`);
    console.log(`   Section headings: ${headingMatches.length}`);
    console.log(`   Content paragraphs: ${paragraphs.length}`);
    console.log(`   Word count: ${enhancedTranscript.split(/\\s+/).length}`);
    
    if (timestampMatches.length > 0) {
      console.log(`   First timestamp: ${timestampMatches[0]}`);
      console.log(`   Last timestamp: ${timestampMatches[timestampMatches.length - 1]}`);
    }
    
    console.log('\\n📄 Enhanced Transcript Output:');
    console.log('=' .repeat(80));
    console.log(enhancedTranscript);
    console.log('=' .repeat(80));
    
    // Save output
    const fs = require('fs');
    const outputFile = 'prompt-test-output.md';
    const output = `# Prompt Iteration Test Output

**Test Date:** ${new Date().toISOString()}
**Video:** ${metadata.title}
**Channel:** ${metadata.channel}
**Video URL:** ${TEST_VIDEO_URL}
**Duration:** ${durationDisplay}
**Model:** gpt-4o-mini
**Temperature:** 0.3
**Max Tokens:** 4000
**Transcript Segments:** ${transcriptLines.length}

## Analysis
- Timestamps found: ${timestampMatches.length}
- Section headings: ${headingMatches.length}
- Content paragraphs: ${paragraphs.length}
- Word count: ${enhancedTranscript.split(/\\s+/).length}

## Enhanced Transcript

${enhancedTranscript}

## Raw Prompt Used

\`\`\`
${prompt}
\`\`\`
`;
    
    fs.writeFileSync(outputFile, output);
    console.log(`\\n💾 Full output saved to: ${outputFile}`);
    console.log('\\n🎉 Test completed! Edit the prompt in this file and run again to iterate.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }
}

// Check API keys
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not found in .env file');
  process.exit(1);
}

if (!process.env.YOUTUBE_API_KEY) {
  console.log('⚠️  YOUTUBE_API_KEY not found - will use fallback metadata');
}

// Run the test
testEnhancement();