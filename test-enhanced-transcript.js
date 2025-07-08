#!/usr/bin/env node

/**
 * Test script for enhanced transcript feature
 * Run with: node test-enhanced-transcript.js
 */

// Load environment variables from .env file
require('dotenv').config();

// Mock the Obsidian requestUrl function
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

// Import the functions we need to test
const { enhanceTranscript, getTranscriptLines, getYouTubeMetadataAPI } = require('./main.js');

// Test configuration
const TEST_CONFIG = {
  // Test video: Fireship's 4:12 video about Gemini CLI
  videoUrl: 'https://www.youtube.com/watch?v=qqP1ucSiVkE',
  
  // API Keys (loaded from .env file)
  openaiApiKey: process.env.OPENAI_API_KEY,
  youtubeApiKey: process.env.YOUTUBE_API_KEY,
  
  // Model to test with
  model: 'gpt-4o-mini'
};

async function testEnhancedTranscript() {
  console.log('🚀 Testing Enhanced Transcript Feature');
  console.log('=====================================\n');
  
  try {
    // Step 1: Get transcript lines with timing data
    console.log('📥 Step 1: Fetching transcript lines...');
    const transcriptLines = await getTranscriptLines(TEST_CONFIG.videoUrl);
    
    if (!transcriptLines || transcriptLines.length === 0) {
      throw new Error('No transcript lines found');
    }
    
    console.log(`✅ Found ${transcriptLines.length} transcript lines`);
    console.log(`   First line: "${transcriptLines[0].text.substring(0, 50)}..."`);
    console.log(`   Last line: "${transcriptLines[transcriptLines.length - 1].text.substring(0, 50)}..."`);
    
    // Calculate duration
    const lastLine = transcriptLines[transcriptLines.length - 1];
    const durationSeconds = Math.ceil((lastLine.offset + lastLine.duration) / 1000);
    const durationDisplay = `${Math.floor(durationSeconds / 60)}:${(durationSeconds % 60).toString().padStart(2, '0')}`;
    console.log(`   Duration: ${durationDisplay} (${durationSeconds} seconds)\n`);
    
    // Step 2: Get video metadata
    console.log('📥 Step 2: Fetching video metadata...');
    const metadata = await getYouTubeMetadataAPI(TEST_CONFIG.videoUrl, TEST_CONFIG.youtubeApiKey);
    
    console.log(`✅ Metadata retrieved:`);
    console.log(`   Title: "${metadata.title}"`);
    console.log(`   Channel: "${metadata.channel}"`);
    console.log(`   Description: "${metadata.description.substring(0, 100)}..."`);
    console.log(`   API Duration: ${metadata.durationSeconds ? `${Math.floor(metadata.durationSeconds / 60)}:${(metadata.durationSeconds % 60).toString().padStart(2, '0')}` : 'N/A'}\n`);
    
    // Step 3: Test the enhancement
    console.log('🔄 Step 3: Testing transcript enhancement...');
    console.log('   This may take 30-60 seconds...');
    
    const startTime = Date.now();
    const enhancedTranscript = await enhanceTranscript(
      transcriptLines,
      metadata,
      TEST_CONFIG.openaiApiKey,
      TEST_CONFIG.model
    );
    const endTime = Date.now();
    
    console.log(`✅ Enhancement completed in ${Math.round((endTime - startTime) / 1000)}s\n`);
    
    // Step 4: Analyze results
    console.log('📊 Step 4: Analyzing results...');
    
    if (enhancedTranscript.startsWith('Error:')) {
      console.error('❌ Enhancement failed:', enhancedTranscript);
      return;
    }
    
    // Check for timestamps
    const timestampMatches = enhancedTranscript.match(/\[(\d{1,2}:\d{2}(?::\d{2})?)\]\(\)/g) || [];
    console.log(`   Timestamps found: ${timestampMatches.length}`);
    
    if (timestampMatches.length > 0) {
      console.log(`   First timestamp: ${timestampMatches[0]}`);
      console.log(`   Last timestamp: ${timestampMatches[timestampMatches.length - 1]}`);
      
      // Validate timestamp format and values
      const invalidTimestamps = timestampMatches.filter(ts => {
        const timeStr = ts.match(/\[(.+?)\]/)[1];
        const parts = timeStr.split(':').map(Number);
        if (parts.length === 2) {
          // MM:SS format
          return parts[0] * 60 + parts[1] > durationSeconds;
        } else if (parts.length === 3) {
          // HH:MM:SS format
          return parts[0] * 3600 + parts[1] * 60 + parts[2] > durationSeconds;
        }
        return false;
      });
      
      if (invalidTimestamps.length > 0) {
        console.log(`   ⚠️  Invalid timestamps (exceed video duration): ${invalidTimestamps.join(', ')}`);
      } else {
        console.log(`   ✅ All timestamps are within video duration`);
      }
    } else {
      console.log(`   ❌ No timestamps found in enhanced transcript`);
    }
    
    // Check for headings
    const headingMatches = enhancedTranscript.match(/^### .+$/gm) || [];
    console.log(`   Section headings: ${headingMatches.length}`);
    if (headingMatches.length > 0) {
      console.log(`   Headings: ${headingMatches.join(', ')}`);
    }
    
    // Check length
    const wordCount = enhancedTranscript.split(/\s+/).length;
    console.log(`   Word count: ${wordCount}`);
    console.log(`   Character count: ${enhancedTranscript.length}\n`);
    
    // Step 5: Display sample output
    console.log('📄 Step 5: Sample output (first 500 characters):');
    console.log('=' .repeat(60));
    console.log(enhancedTranscript.substring(0, 500) + '...');
    console.log('=' .repeat(60));
    
    // Step 6: Save full output for inspection
    const fs = require('fs');
    const outputFile = 'test-enhanced-output.md';
    fs.writeFileSync(outputFile, `# Enhanced Transcript Test Output\n\n**Video:** ${TEST_CONFIG.videoUrl}\n**Duration:** ${durationDisplay}\n**Model:** ${TEST_CONFIG.model}\n**Timestamp:** ${new Date().toISOString()}\n\n## Enhanced Transcript\n\n${enhancedTranscript}`);
    
    console.log(`\n💾 Full output saved to: ${outputFile}`);
    console.log('🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Check configuration
function checkConfig() {
  const issues = [];
  
  if (!TEST_CONFIG.openaiApiKey) {
    issues.push('OpenAI API key not set. Add OPENAI_API_KEY to your .env file.');
  }
  
  if (!TEST_CONFIG.youtubeApiKey) {
    issues.push('YouTube API key not set. Add YOUTUBE_API_KEY to your .env file.');
  }
  
  if (issues.length > 0) {
    console.error('❌ Configuration issues:');
    issues.forEach(issue => console.error(`   - ${issue}`));
    console.error('\nPlease fix these issues before running the test.');
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  console.log('Enhanced Transcript Test Script');
  console.log('================================\n');
  
  checkConfig();
  testEnhancedTranscript().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { testEnhancedTranscript, TEST_CONFIG };