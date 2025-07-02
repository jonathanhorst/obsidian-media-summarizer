import { YoutubeTranscript } from 'youtube-transcript';
import { requestUrl } from 'obsidian';
import { YoutubeAPITranscript, transcriptLinesToText, YoutubeTranscriptError as APITranscriptError, TranscriptLine } from './youtube-api-transcript';

/**
 * Interface for OpenAI chat completion request
 */
interface OpenAIRequest {
	model: string;
	messages: Array<{
		role: 'system' | 'user' | 'assistant';
		content: string;
	}>;
	temperature?: number;
	max_tokens?: number;
}

/**
 * Interface for OpenAI chat completion response
 */
interface OpenAIResponse {
	choices: Array<{
		message: {
			content: string;
		};
	}>;
}

/**
 * Interface for YouTube oEmbed API response
 */
interface YouTubeOEmbedResponse {
	title: string;
	author_name: string;
	html: string;
}

/**
 * Extract YouTube video ID from various URL formats
 * Supports: youtube.com/watch?v=ID, youtu.be/ID, youtube-nocookie.com, etc.
 */
function extractVideoId(url: string): string | null {
	try {
		const urlObj = new URL(url);
		
		// Handle different YouTube URL formats
		if (urlObj.hostname.includes('youtube.com')) {
			return urlObj.searchParams.get('v');
		} else if (urlObj.hostname.includes('youtu.be')) {
			return urlObj.pathname.slice(1);
		}
		
		return null;
	} catch (error) {
		console.error('Invalid URL format:', error);
		return null;
	}
}

/**
 * Fetch the transcript for a YouTube video
 * @param url - YouTube video URL
 * @returns Promise resolving to the full transcript text or error message
 */
export async function getTranscript(url: string): Promise<string> {
	try {
		console.log('Attempting to fetch transcript using YouTube API method for:', url);

		// Method 1: Try the new YouTube internal API approach first
		try {
			const apiResult = await YoutubeAPITranscript.getTranscript(url, {
				lang: 'en',
				country: 'US'
			});
			
			const transcript = transcriptLinesToText(apiResult.lines);
			
			if (transcript && transcript.trim().length > 0) {
				console.log('Successfully fetched transcript using YouTube API method, length:', transcript.length);
				return transcript;
			}
		} catch (apiError) {
			console.log('YouTube API method failed:', apiError.message);
			// Continue to fallback method
		}

		console.log('Falling back to youtube-transcript library');

		// Method 2: Fallback to the original youtube-transcript library
		const videoId = extractVideoId(url);
		if (!videoId) {
			return 'Error: Invalid YouTube URL format. Please provide a valid YouTube video URL.';
		}

		// Try different language codes for transcript fetching
		const languageCodes = ['en', 'en-US', 'en-GB', 'auto'];
		let transcriptArray = null;
		let lastError = null;

		for (const lang of languageCodes) {
			try {
				console.log(`Trying youtube-transcript library with language: ${lang}`);
				transcriptArray = await YoutubeTranscript.fetchTranscript(videoId, {
					lang: lang
				});
				if (transcriptArray && transcriptArray.length > 0) {
					console.log(`Successfully fetched transcript with language: ${lang}, entries: ${transcriptArray.length}`);
					break;
				}
			} catch (langError) {
				console.log(`Failed with language ${lang}:`, langError.message);
				lastError = langError;
				continue;
			}
		}

		// If no language worked, try without language specification
		if (!transcriptArray || transcriptArray.length === 0) {
			try {
				console.log('Trying to fetch transcript without language specification');
				transcriptArray = await YoutubeTranscript.fetchTranscript(videoId);
			} catch (generalError) {
				console.log('Failed without language specification:', generalError.message);
				lastError = generalError;
			}
		}
		
		if (!transcriptArray || transcriptArray.length === 0) {
			console.error('No transcript found after trying all methods');
			return `Error: Unable to automatically fetch transcript for this video (ID: ${videoId}).

This can happen because:
• YouTube may be blocking automated transcript access
• The video may have captions but they're not accessible via API
• The video may not have transcripts available

**Workaround:**
1. Manually copy the transcript from YouTube:
   - Click the "..." menu below the video
   - Select "Show transcript"
   - Copy the text and paste it into your note
2. Then manually summarize using ChatGPT or Claude
3. Or try a different video

We're working on improving transcript access in future updates.`;
		}

		// Join transcript segments into a single text
		const fullTranscript = transcriptArray
			.map(item => item.text)
			.join(' ')
			.replace(/\s+/g, ' ') // Clean up extra whitespace
			.trim();

		if (!fullTranscript) {
			return 'Error: Transcript appears to be empty for this video.';
		}

		console.log('Successfully processed transcript using fallback method, length:', fullTranscript.length);
		return fullTranscript;

	} catch (error) {
		console.error('Error fetching transcript:', error);
		
		// Provide user-friendly error messages based on common error types
		if (error.message?.includes('Could not retrieve a transcript')) {
			return 'Error: No transcript found for this video. The video may not have captions enabled, may be private, or may not exist.';
		} else if (error.message?.includes('network') || error.message?.includes('fetch')) {
			return 'Error: Network error while fetching transcript. Please check your internet connection and try again.';
		} else if (error.message?.includes('Video unavailable')) {
			return 'Error: Video unavailable. The video may be private, deleted, or restricted.';
		} else {
			return `Error: Failed to fetch transcript. ${error.message || 'Unknown error occurred.'} Please try a different video.`;
		}
	}
}

/**
 * Fetch transcript lines with timing data for a YouTube video
 * @param url - YouTube video URL
 * @returns Promise resolving to array of transcript lines with timestamps
 */
export async function getTranscriptLines(url: string): Promise<TranscriptLine[]> {
	try {
		console.log('Attempting to fetch transcript lines using YouTube API method for:', url);

		// Method 1: Try the new YouTube internal API approach first
		try {
			const apiResult = await YoutubeAPITranscript.getTranscript(url, {
				lang: 'en',
				country: 'US'
			});
			
			if (apiResult.lines && apiResult.lines.length > 0) {
				console.log('Successfully fetched transcript lines using YouTube API method, count:', apiResult.lines.length);
				return apiResult.lines;
			}
		} catch (apiError) {
			console.log('YouTube API method failed:', apiError.message);
			// Continue to fallback method
		}

		console.log('Falling back to youtube-transcript library for lines');

		// Method 2: Fallback to the original youtube-transcript library
		const videoId = extractVideoId(url);
		if (!videoId) {
			throw new Error('Invalid YouTube URL format. Please provide a valid YouTube video URL.');
		}

		// Try different language codes for transcript fetching
		const languageCodes = ['en', 'en-US', 'en-GB', 'auto'];
		let transcriptArray = null;
		let lastError = null;

		for (const lang of languageCodes) {
			try {
				console.log(`Trying youtube-transcript library with language: ${lang}`);
				transcriptArray = await YoutubeTranscript.fetchTranscript(videoId, {
					lang: lang
				});
				if (transcriptArray && transcriptArray.length > 0) {
					console.log(`Successfully fetched transcript with language: ${lang}, entries: ${transcriptArray.length}`);
					break;
				}
			} catch (langError) {
				console.log(`Failed with language ${lang}:`, langError.message);
				lastError = langError;
				continue;
			}
		}

		// If no language worked, try without language specification
		if (!transcriptArray || transcriptArray.length === 0) {
			try {
				console.log('Trying to fetch transcript without language specification');
				transcriptArray = await YoutubeTranscript.fetchTranscript(videoId);
			} catch (generalError) {
				console.log('Failed without language specification:', generalError.message);
				lastError = generalError;
			}
		}
		
		if (!transcriptArray || transcriptArray.length === 0) {
			throw new Error('No transcript found after trying all methods');
		}

		// Convert youtube-transcript format to our TranscriptLine format
		const transcriptLines: TranscriptLine[] = transcriptArray.map((item: any) => ({
			text: item.text || '',
			offset: (item.offset || 0) * 1000, // Convert to milliseconds
			duration: (item.duration || 0) * 1000 // Convert to milliseconds
		}));

		console.log('Successfully processed transcript lines using fallback method, count:', transcriptLines.length);
		return transcriptLines;

	} catch (error) {
		console.error('Error fetching transcript lines:', error);
		throw error;
	}
}

/**
 * Get YouTube video metadata using oEmbed API
 * @param url - YouTube URL
 * @returns Promise<object> - Video metadata (title, channel, description, duration)
 */
export async function getYouTubeMetadata(url: string): Promise<{title: string, channel: string, description: string, durationSeconds?: number}> {
	try {
		// Use YouTube oEmbed API - no API key required
		const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
		
		const response = await requestUrl({
			url: oembedUrl,
			method: 'GET',
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
			}
		});

		const oembedData: YouTubeOEmbedResponse = JSON.parse(response.text);
		
		// oEmbed only provides title and channel, description would need YouTube Data API
		// For now, we'll use what we can get reliably
		return {
			title: oembedData.title || 'Unknown Title',
			channel: oembedData.author_name || 'Unknown Channel',
			description: '' // Would need YouTube Data API key for description
			// Duration will be calculated from transcript data when available
		};
		
	} catch (error) {
		console.error('Error fetching YouTube metadata:', error);
		return {
			title: 'Unknown Title',
			channel: 'Unknown Channel', 
			description: ''
		};
	}
}

/**
 * Format raw transcript with timestamps every 5 segments
 * @param lines - Array of transcript lines with timing data
 * @returns Formatted string with periodic timestamps
 */
export function formatRawTranscriptWithTimestamps(lines: TranscriptLine[]): string {
	if (!lines || lines.length === 0) {
		return '';
	}

	const groups: string[] = [];
	
	// Group every 5 segments together
	for (let i = 0; i < lines.length; i += 5) {
		const group = lines.slice(i, i + 5);
		
		// Get timestamp from first segment in group
		const firstSegment = group[0];
		const offsetSeconds = Math.floor(firstSegment.offset / 1000);
		const hours = Math.floor(offsetSeconds / 3600);
		const minutes = Math.floor((offsetSeconds % 3600) / 60);
		const seconds = offsetSeconds % 60;
		
		// Format timestamp based on duration
		let timestamp;
		if (hours > 0) {
			timestamp = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
		} else {
			timestamp = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
		}
		
		// Combine text from all segments in this group
		const groupText = group
			.map(line => line.text.trim())
			.filter(text => text.length > 0)
			.join(' ');
		
		if (groupText) {
			groups.push(`[${timestamp}]\n${groupText}`);
		}
	}
	
	return groups.join('\n\n');
}

/**
 * Format transcript lines with timestamps for AI processing
 * @param lines - Array of transcript lines with timing data
 * @returns Formatted string with timestamps and duration info
 */
export function formatTranscriptWithTimestamps(lines: TranscriptLine[]): {formattedText: string, durationSeconds: number} {
	if (!lines || lines.length === 0) {
		return { formattedText: '', durationSeconds: 0 };
	}

	// Calculate duration from the last timestamp + its duration
	const lastLine = lines[lines.length - 1];
	const durationSeconds = Math.ceil((lastLine.offset + lastLine.duration) / 1000);

	// Format each line with timestamp
	const formattedLines = lines.map(line => {
		const offsetSeconds = Math.floor(line.offset / 1000);
		const hours = Math.floor(offsetSeconds / 3600);
		const minutes = Math.floor((offsetSeconds % 3600) / 60);
		const seconds = offsetSeconds % 60;
		
		// Format timestamp based on duration
		let timestamp;
		if (hours > 0) {
			timestamp = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
		} else {
			timestamp = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
		}
		
		return `At ${timestamp} - ${line.text.trim()}`;
	});

	return {
		formattedText: formattedLines.join('\n'),
		durationSeconds
	};
}

/**
 * Chunk transcript lines into manageable pieces for API processing
 * @param transcriptLines - Array of transcript lines
 * @param maxChunkTokens - Maximum estimated tokens per chunk
 * @returns Array of transcript line chunks
 */
function chunkTranscriptLines(transcriptLines: TranscriptLine[], maxChunkTokens: number = 8000): TranscriptLine[][] {
	if (transcriptLines.length === 0) {
		return [];
	}

	const chunks: TranscriptLine[][] = [];
	let currentChunk: TranscriptLine[] = [];
	let currentTokenEstimate = 0;

	for (const line of transcriptLines) {
		// Rough token estimation: ~4 characters per token
		const lineTokenEstimate = Math.ceil(line.text.length / 4);
		
		// If adding this line would exceed the chunk size, start a new chunk
		if (currentTokenEstimate + lineTokenEstimate > maxChunkTokens && currentChunk.length > 0) {
			chunks.push([...currentChunk]);
			currentChunk = [];
			currentTokenEstimate = 0;
		}

		currentChunk.push(line);
		currentTokenEstimate += lineTokenEstimate;
	}

	// Add the last chunk if it has content
	if (currentChunk.length > 0) {
		chunks.push(currentChunk);
	}

	return chunks.length > 0 ? chunks : [transcriptLines];
}

/**
 * Enhance transcript using OpenAI with video metadata context
 * @param transcriptLines - Raw YouTube transcript lines with timing data
 * @param metadata - Video title, channel, description
 * @param openaiApiKey - OpenAI API key
 * @param aiModel - OpenAI model to use (default: gpt-4o-mini)
 * @returns Promise<string> - Enhanced, formatted transcript
 */
export async function enhanceTranscript(
	transcriptLines: TranscriptLine[], 
	metadata: {title: string, channel: string, description: string}, 
	openaiApiKey: string,
	aiModel: string = 'gpt-4o-mini'
): Promise<string> {
	try {
		if (!openaiApiKey || !openaiApiKey.trim()) {
			return 'Error: OpenAI API key is required for transcript enhancement.';
		}

		// Estimate total tokens (rough calculation: ~4 chars per token)
		const totalText = transcriptLines.map(line => line.text).join(' ');
		const estimatedTokens = Math.ceil(totalText.length / 4);
		
		console.log(`Processing transcript with ${transcriptLines.length} segments, estimated ${estimatedTokens} tokens`);

		// If transcript is too large, use chunking
		if (estimatedTokens > 6000 || transcriptLines.length > 500) {
			console.log('Large transcript detected, using chunking approach');
			return await enhanceTranscriptWithChunking(transcriptLines, metadata, openaiApiKey, aiModel);
		}

		// Process smaller transcripts normally
		return await enhanceTranscriptSingle(transcriptLines, metadata, openaiApiKey, aiModel);

	} catch (error) {
		console.error('Error enhancing transcript:', error);
		
		// Provide user-friendly error messages
		if (error.message?.includes('401') || error.message?.includes('unauthorized')) {
			return 'Error: Invalid OpenAI API key. Please check your API key in plugin settings.';
		} else if (error.message?.includes('429')) {
			return 'Error: OpenAI API rate limit or quota exceeded. Please wait a moment and try again, or check your OpenAI account.';
		} else if (error.message?.includes('network') || error.message?.includes('fetch')) {
			return 'Error: Network error while communicating with OpenAI. Please check your internet connection.';
		} else {
			return `Error: Failed to enhance transcript. ${error.message || 'Unknown error occurred.'} The raw transcript may still be usable.`;
		}
	}
}

/**
 * Process small transcripts in a single request
 */
async function enhanceTranscriptSingle(
	transcriptLines: TranscriptLine[],
	metadata: {title: string, channel: string, description: string},
	openaiApiKey: string,
	aiModel: string
): Promise<string> {
	try {
		// Format transcript lines with timestamps and get duration
		const {formattedText: timestampedTranscript, durationSeconds} = formatTranscriptWithTimestamps(transcriptLines);
		
		const durationMinutes = Math.floor(durationSeconds / 60);
		const durationSecondsRemainder = durationSeconds % 60;
		const durationDisplay = `${durationMinutes}:${durationSecondsRemainder.toString().padStart(2, '0')}`;

		// Create the delimited prompt with speaker analysis and conditional formatting
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
- Place clickable timestamps [HH:MM:SS]() on separate lines after headings
- TIMESTAMP VALIDATION: Use ONLY timestamps from the provided transcript data
- All output timestamps must be ≤ ${durationDisplay}
- Consolidate provided timestamps to meaningful 30-60 second segments
- Fix spelling of names/technical terms by using the video title and description context
- Remove excessive filler words ("um," "uh," repetitive phrases) but keep the core spoken content

Format the output as clean markdown.`;

		const openaiRequest: OpenAIRequest = {
			model: aiModel,
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

		console.log('Enhancing transcript with OpenAI...');

		const response = await requestUrl({
			url: 'https://api.openai.com/v1/chat/completions',
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${openaiApiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(openaiRequest)
		});

		const openaiResponse: OpenAIResponse = JSON.parse(response.text);

		if (!openaiResponse.choices || openaiResponse.choices.length === 0) {
			return 'Error: No response received from OpenAI for transcript enhancement.';
		}

		const enhancedTranscript = openaiResponse.choices[0].message.content.trim();
		
		if (!enhancedTranscript) {
			return 'Error: Empty response received from OpenAI for transcript enhancement.';
		}

		console.log('Successfully enhanced transcript with OpenAI');
		return enhancedTranscript;

	} catch (error) {
		console.error('Error enhancing single transcript:', error);
		throw error; // Re-throw to be handled by main function
	}
}

/**
 * Process large transcripts using chunking approach
 */
async function enhanceTranscriptWithChunking(
	transcriptLines: TranscriptLine[],
	metadata: {title: string, channel: string, description: string},
	openaiApiKey: string,
	aiModel: string
): Promise<string> {
	try {
		const chunks = chunkTranscriptLines(transcriptLines, 6000); // Smaller chunks for safety
		const enhancedChunks: string[] = [];
		
		console.log(`Processing ${chunks.length} chunks for large transcript`);

		// Get overall duration info
		const {durationSeconds} = formatTranscriptWithTimestamps(transcriptLines);
		const durationMinutes = Math.floor(durationSeconds / 60);
		const durationSecondsRemainder = durationSeconds % 60;
		const durationDisplay = `${durationMinutes}:${durationSecondsRemainder.toString().padStart(2, '0')}`;

		// Process each chunk
		for (let i = 0; i < chunks.length; i++) {
			const chunk = chunks[i];
			const isMultiChunk = chunks.length > 1;
			
			console.log(`Processing chunk ${i + 1} of ${chunks.length} (${chunk.length} segments)`);
			
			// Format this chunk with timestamps
			const {formattedText: chunkTranscript} = formatTranscriptWithTimestamps(chunk);
			
			// Create prompt for this chunk
			const chunkPrompt = `CONTEXT INFORMATION:
Video Title: "${metadata.title}"
Channel: "${metadata.channel}"
Video Duration: ${durationDisplay} (${durationSeconds} seconds)
Description: "${metadata.description}"
${isMultiChunk ? `\nPROCESSING NOTE: This is chunk ${i + 1} of ${chunks.length} from a longer transcript. Maintain consistency with previous sections.` : ''}

--- END OF CONTEXT ---

RAW TRANSCRIPT WITH TIMESTAMPS:
${chunkTranscript}

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

			const openaiRequest: OpenAIRequest = {
				model: aiModel,
				messages: [
					{
						role: 'system',
						content: 'You are an expert transcript editor. Your job is to clean up raw transcript text while preserving the EXACT spoken words. Only add punctuation, formatting, and organization to make the actual spoken content more readable.'
					},
					{
						role: 'user',
						content: chunkPrompt
					}
				],
				temperature: 0.3,
				max_tokens: 3000 // Smaller for chunks
			};

			const response = await requestUrl({
				url: 'https://api.openai.com/v1/chat/completions',
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${openaiApiKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(openaiRequest)
			});

			const openaiResponse: OpenAIResponse = JSON.parse(response.text);

			if (!openaiResponse.choices || openaiResponse.choices.length === 0) {
				throw new Error(`No response received from OpenAI for chunk ${i + 1}`);
			}

			const enhancedChunk = openaiResponse.choices[0].message.content.trim();
			
			if (!enhancedChunk) {
				throw new Error(`Empty response received from OpenAI for chunk ${i + 1}`);
			}

			enhancedChunks.push(enhancedChunk);
			
			// Add delay between requests to avoid rate limiting
			if (i < chunks.length - 1) {
				console.log('Waiting 1 second before processing next chunk...');
				await new Promise(resolve => setTimeout(resolve, 1000));
			}
		}

		// Combine enhanced chunks
		console.log('Combining enhanced chunks...');
		const combinedTranscript = enhancedChunks.join('\n\n');
		
		console.log('Successfully enhanced large transcript with chunking');
		return combinedTranscript;

	} catch (error) {
		console.error('Error enhancing transcript with chunking:', error);
		throw error; // Re-throw to be handled by main function
	}
}

/**
 * Chunk transcript into smaller pieces to handle OpenAI token limits
 * @param transcript - Full transcript text
 * @param maxChunkSize - Maximum characters per chunk (default: 8000 to stay well under token limits)
 * @returns Array of transcript chunks
 */
function chunkTranscript(transcript: string, maxChunkSize: number = 8000): string[] {
	if (transcript.length <= maxChunkSize) {
		return [transcript];
	}

	const chunks: string[] = [];
	let currentChunk = '';
	const sentences = transcript.split(/[.!?]+/);

	for (const sentence of sentences) {
		const trimmedSentence = sentence.trim();
		if (!trimmedSentence) continue;

		// If adding this sentence would exceed the chunk size, start a new chunk
		if (currentChunk.length + trimmedSentence.length + 1 > maxChunkSize) {
			if (currentChunk) {
				chunks.push(currentChunk.trim());
				currentChunk = '';
			}
		}

		currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
	}

	// Add the last chunk if it has content
	if (currentChunk.trim()) {
		chunks.push(currentChunk.trim());
	}

	return chunks.length > 0 ? chunks : [transcript]; // Fallback to original if chunking fails
}

/**
 * Summarize a transcript using OpenAI
 * @param transcript - The transcript text to summarize
 * @param apiKey - OpenAI API key
 * @param aiModel - OpenAI model to use (default: gpt-4o-mini)
 * @returns Promise resolving to the summary text or error message
 */
export async function summarize(transcript: string, apiKey: string, aiModel: string = 'gpt-4o-mini'): Promise<string> {
	try {
		// Validate API key
		if (!apiKey || !apiKey.trim()) {
			return 'Error: OpenAI API key is required. Please configure your API key in the plugin settings.';
		}

		if (!apiKey.startsWith('sk-')) {
			return 'Error: Invalid OpenAI API key format. API keys should start with "sk-".';
		}

		// Validate transcript
		if (!transcript || transcript.trim().length === 0) {
			return 'Error: No transcript content to summarize.';
		}

		// Check if transcript starts with "Error:" (indicating a previous error)
		if (transcript.startsWith('Error:')) {
			return transcript; // Pass through the original error message
		}

		// Chunk the transcript if it's too long
		const chunks = chunkTranscript(transcript);
		const summaries: string[] = [];

		// Process each chunk
		for (let i = 0; i < chunks.length; i++) {
			const chunk = chunks[i];
			const isMultiChunk = chunks.length > 1;
			
			// Prepare the request payload
			const requestPayload: OpenAIRequest = {
				model: aiModel,
				messages: [
					{
						role: 'system',
						content: `You are an expert at creating concise, well-structured summaries of video transcripts. Create a summary that captures the key points, main arguments, and important details. ${isMultiChunk ? `This is part ${i + 1} of ${chunks.length} of a longer transcript.` : ''}`
					},
					{
						role: 'user',
						content: `Please provide a comprehensive summary of this video transcript:\n\n${chunk}`
					}
				],
				temperature: 0.3,
				max_tokens: 1000
			};

			// Make the API request
			const response = await requestUrl({
				url: 'https://api.openai.com/v1/chat/completions',
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${apiKey}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestPayload)
			});

			// Parse the response
			const parsed: OpenAIResponse = JSON.parse(response.text);
			
			if (!parsed.choices || parsed.choices.length === 0) {
				return 'Error: Invalid response from OpenAI API. Please try again.';
			}

			const summary = parsed.choices[0].message.content.trim();
			summaries.push(isMultiChunk ? `**Part ${i + 1}:**\n${summary}` : summary);
		}

		// Combine summaries if there were multiple chunks
		if (summaries.length > 1) {
			return `# Video Summary\n\n${summaries.join('\n\n---\n\n')}`;
		} else {
			return summaries[0];
		}

	} catch (error) {
		console.error('Error in summarization:', error);

		// Handle specific API errors
		if (error.message?.includes('401')) {
			return 'Error: Invalid OpenAI API key. Please check your API key in the plugin settings.';
		} else if (error.message?.includes('429')) {
			return 'Error: OpenAI API rate limit exceeded. Please wait a moment and try again.';
		} else if (error.message?.includes('402')) {
			return 'Error: OpenAI API quota exceeded. Please check your OpenAI account billing.';
		} else if (error.message?.includes('network') || error.message?.includes('fetch')) {
			return 'Error: Network error while contacting OpenAI API. Please check your internet connection and try again.';
		} else {
			return `Error: Failed to generate summary. ${error.message || 'Unknown error occurred.'}`;
		}
	}
}