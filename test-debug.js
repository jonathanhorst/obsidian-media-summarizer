#!/usr/bin/env node

// Quick debug test
require('dotenv').config();

console.log('Debug Test');
console.log('==========');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Found' : 'Missing');
console.log('YOUTUBE_API_KEY:', process.env.YOUTUBE_API_KEY ? 'Found' : 'Missing');
console.log('WEBSCRAPING_AI_KEY:', process.env.WEBSCRAPING_AI_KEY ? 'Found' : 'Missing');

// Test youtube-transcript import
try {
  const { YoutubeTranscript } = require('youtube-transcript');
  console.log('YoutubeTranscript import: Success');
} catch (error) {
  console.log('YoutubeTranscript import: Failed -', error.message);
}

// Test basic fetch
async function testBasicFetch() {
  try {
    const videoId = 'qqP1ucSiVkE';
    console.log('Testing transcript fetch for video ID:', videoId);
    
    const { YoutubeTranscript } = require('youtube-transcript');
    const transcriptArray = await YoutubeTranscript.fetchTranscript(videoId);
    
    console.log('Transcript fetch: Success');
    console.log('Segments found:', transcriptArray.length);
    console.log('First segment:', transcriptArray[0]);
    
  } catch (error) {
    console.log('Transcript fetch: Failed -', error.message);
  }
}

testBasicFetch();