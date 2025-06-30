import { YoutubeTranscript } from 'youtube-transcript';
import { request } from 'obsidian';

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
		// Extract video ID from URL
		const videoId = extractVideoId(url);
		if (!videoId) {
			return 'Error: Invalid YouTube URL format. Please provide a valid YouTube video URL.';
		}

		// Fetch transcript using youtube-transcript library
		const transcriptArray = await YoutubeTranscript.fetchTranscript(videoId);
		
		if (!transcriptArray || transcriptArray.length === 0) {
			return 'Error: No transcript available for this video. The video may not have captions or subtitles enabled.';
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

		return fullTranscript;

	} catch (error) {
		console.error('Error fetching transcript:', error);
		
		// Provide user-friendly error messages based on common error types
		if (error.message?.includes('Could not retrieve a transcript')) {
			return 'Error: No transcript found for this video. The video may not have captions enabled, may be private, or may not exist.';
		} else if (error.message?.includes('network')) {
			return 'Error: Network error while fetching transcript. Please check your internet connection and try again.';
		} else {
			return `Error: Failed to fetch transcript. ${error.message || 'Unknown error occurred.'}`;
		}
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
 * Summarize a transcript using OpenAI's GPT-3.5-turbo
 * @param transcript - The transcript text to summarize
 * @param apiKey - OpenAI API key
 * @returns Promise resolving to the summary text or error message
 */
export async function summarize(transcript: string, apiKey: string): Promise<string> {
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
				model: 'gpt-3.5-turbo',
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
			const response = await request({
				url: 'https://api.openai.com/v1/chat/completions',
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${apiKey}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestPayload)
			});

			// Parse the response
			const parsed: OpenAIResponse = JSON.parse(response);
			
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