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
 * Extract description from YouTube page HTML
 * @param htmlContent - YouTube page HTML content
 * @returns Video description text
 */
function extractYouTubeDescription(htmlContent: string): string {
	try {
		// Try to find description in ytInitialData
		const ytInitialDataMatch = htmlContent.match(/var ytInitialData = ({.*?});/);
		
		if (!ytInitialDataMatch) {
			return tryFallbackDescriptionExtraction(htmlContent);
		}

		const data = JSON.parse(ytInitialDataMatch[1]);
		
		// Method 1: Try videoSecondaryInfoRenderer.description path (most common current format)
		try {
			const videoSecondaryInfo = data?.contents?.twoColumnWatchNextResults?.results?.results?.contents
				?.find((content: any) => content?.videoSecondaryInfoRenderer);
			
			if (videoSecondaryInfo?.videoSecondaryInfoRenderer?.description?.runs) {
				const description = videoSecondaryInfo.videoSecondaryInfoRenderer.description.runs
					.map((run: any) => run.text).join('');
				return description;
			}
			
			// Alternative: Try attributedDescription (newer format)
			if (videoSecondaryInfo?.videoSecondaryInfoRenderer?.attributedDescription?.content) {
				return videoSecondaryInfo.videoSecondaryInfoRenderer.attributedDescription.content;
			}
		} catch (e) {
			// Continue to next method
		}

		// Method 2: Try microformat
		try {
			const microformat = data?.microformat?.playerMicroformatRenderer?.description?.simpleText;
			if (microformat) {
				return microformat;
			}
		} catch (e) {
			// Continue to next method
		}

		// Method 3: Search recursively for any description-like data
		const recursiveDescription = searchForDescriptionRecursively(data);
		if (recursiveDescription) {
			return recursiveDescription;
		}
		return tryFallbackDescriptionExtraction(htmlContent);

	} catch (error) {
		console.error('❌ Error extracting YouTube description:', error);
		return tryFallbackDescriptionExtraction(htmlContent);
	}
}


/**
 * Recursively search YouTube data structure for description content
 */
function searchForDescriptionRecursively(obj: any, path = '', maxDepth = 5): string | null {
	if (maxDepth <= 0 || !obj || typeof obj !== 'object') return null;

	for (const key in obj) {
		if (key.toLowerCase().includes('description')) {
			const value = obj[key];
			
			// If it's a runs array (common YouTube format)
			if (Array.isArray(value) && value.length > 0 && value[0]?.text) {
				const text = value.map((run: any) => run.text || '').join('');
				if (text.length > 50) { // Reasonable description length
					console.log(`🎯 Found description at path: ${path}.${key}`);
					return text;
				}
			}
			
			// If it's a simple text value
			if (typeof value === 'string' && value.length > 50) {
				console.log(`🎯 Found description at path: ${path}.${key}`);
				return value;
			}
		}
		
		// Recurse into objects and arrays
		if (typeof obj[key] === 'object' && obj[key] !== null) {
			const result = searchForDescriptionRecursively(obj[key], `${path}.${key}`, maxDepth - 1);
			if (result) return result;
		}
	}
	
	return null;
}

/**
 * Fallback description extraction methods
 */
function tryFallbackDescriptionExtraction(htmlContent: string): string {
	// Fallback 1: Meta description tag
	const metaDescMatch = htmlContent.match(/<meta\s+name="description"\s+content="([^"]*)">/);
	if (metaDescMatch && metaDescMatch[1].length > 10) {
		return metaDescMatch[1];
	}

	// Fallback 2: Property meta tag
	const propertyDescMatch = htmlContent.match(/<meta\s+property="og:description"\s+content="([^"]*)">/);
	if (propertyDescMatch && propertyDescMatch[1].length > 10) {
		return propertyDescMatch[1];
	}

	// Fallback 3: JSON-LD structured data
	const jsonLdMatch = htmlContent.match(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/);
	if (jsonLdMatch) {
		try {
			const jsonData = JSON.parse(jsonLdMatch[1]);
			if (jsonData.description && jsonData.description.length > 10) {
				return jsonData.description;
			}
		} catch (e) {
			// Continue to return empty
		}
	}

	return '';
}

/**
 * Get YouTube video metadata using YouTube Data API v3
 * @param url - YouTube URL
 * @param youtubeApiKey - YouTube Data API v3 key
 * @returns Promise<object> - Video metadata (title, channel, description, duration)
 */
export async function getYouTubeMetadataAPI(url: string, youtubeApiKey: string): Promise<{title: string, channel: string, description: string, durationSeconds?: number}> {
	try {
		const videoId = extractVideoId(url);
		if (!videoId) {
			throw new Error('Invalid YouTube URL format');
		}

		console.log('🔍 Fetching metadata using YouTube Data API v3...');
		const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${youtubeApiKey}`;
		
		const response = await requestUrl({
			url: apiUrl,
			method: 'GET',
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; MediaSummarizer/1.0)'
			}
		});

		if (response.status !== 200) {
			throw new Error(`YouTube API failed: ${response.status} ${response.text}`);
		}

		const data = JSON.parse(response.text);
		
		if (!data.items || data.items.length === 0) {
			throw new Error('Video not found in YouTube API response');
		}

		const video = data.items[0];
		const snippet = video.snippet;
		const contentDetails = video.contentDetails;

		// Parse duration from ISO 8601 format (PT4M13S -> 253 seconds)
		let durationSeconds: number | undefined;
		if (contentDetails?.duration) {
			const match = contentDetails.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
			if (match) {
				const hours = parseInt(match[1] || '0');
				const minutes = parseInt(match[2] || '0'); 
				const seconds = parseInt(match[3] || '0');
				durationSeconds = hours * 3600 + minutes * 60 + seconds;
			}
		}

		console.log('✅ Successfully fetched metadata via YouTube Data API v3');
		console.log('📝 Description length:', snippet.description.length, 'characters');

		return {
			title: snippet.title || 'Unknown Title',
			channel: snippet.channelTitle || 'Unknown Channel',
			description: snippet.description || '',
			durationSeconds
		};

	} catch (error) {
		console.error('❌ YouTube Data API v3 failed:', error.message);
		// Fallback to HTML scraping if API fails
		console.log('🔄 Falling back to HTML scraping...');
		return getYouTubeMetadataHTML(url);
	}
}

/**
 * Get YouTube video metadata by parsing the video page (fallback method)
 * @param url - YouTube URL
 * @returns Promise<object> - Video metadata (title, channel, description, duration)
 */
export async function getYouTubeMetadataHTML(url: string): Promise<{title: string, channel: string, description: string, htmlContent?: string, durationSeconds?: number}> {
	try {
		// First try oEmbed for basic metadata
		const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
		
		let title = 'Unknown Title';
		let channel = 'Unknown Channel';
		
		try {
			const oembedResponse = await requestUrl({
				url: oembedUrl,
				method: 'GET',
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
				}
			});
			
			const oembedData: YouTubeOEmbedResponse = JSON.parse(oembedResponse.text);
			title = oembedData.title || title;
			channel = oembedData.author_name || channel;
		} catch (oembedError) {
			console.log('oEmbed failed, will extract from page HTML');
		}

		// Fetch the full page to get description
		const pageResponse = await requestUrl({
			url: url,
			method: 'GET',
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
			}
		});

		const description = extractYouTubeDescription(pageResponse.text);

		return {
			title,
			channel,
			description,
			htmlContent: pageResponse.text // Include HTML content for URL extraction
		};
		
	} catch (error) {
		console.error('Error fetching YouTube metadata:', error);
		return {
			title: 'Unknown Title',
			channel: 'Unknown Channel', 
			description: '',
			htmlContent: ''
		};
	}
}

/**
 * Extract and filter URLs from description that might contain transcripts
 * @param description - YouTube video description
 * @returns Array of potential transcript URLs
 */
/**
 * Extract full URLs from YouTube redirect links in page HTML
 * @param htmlContent - Full YouTube page HTML content
 * @returns Array of full URLs extracted from redirect links
 */
function extractFullUrlsFromRedirectLinks(htmlContent: string): string[] {
	const urls: string[] = [];
	
	// Find all YouTube redirect links
	const redirectRegex = /https:\/\/www\.youtube\.com\/redirect\?[^"']*/g;
	const redirectLinks = htmlContent.match(redirectRegex) || [];
	
	redirectLinks.forEach(redirectLink => {
		// Handle escaped unicode characters first (YouTube uses \u0026 instead of &)
		const unescapedLink = redirectLink.replace(/\\u0026/g, '&');
		
		// Extract the 'q' parameter which contains the actual URL
		const urlMatch = unescapedLink.match(/[&?]q=([^&]*)/);
		if (urlMatch) {
			try {
				const decodedUrl = decodeURIComponent(urlMatch[1]);
				urls.push(decodedUrl);
			} catch (error) {
				console.log('Error decoding URL:', urlMatch[1]);
			}
		}
	});
	
	return urls;
}

export function findPotentialTranscriptUrls(description: string): string[] {
	if (!description) {
		console.log('📭 No description provided for URL extraction');
		return [];
	}

	console.log('🔍 Extracting URLs from description...');
	console.log('📝 Description length:', description.length, 'characters');

	// Add detailed URL logging to file
	const logToFile = (message: string) => {
		console.log(message);
		try {
			const fs = require('fs');
			fs.appendFileSync('/Users/jonathanhorst/development/youtube-plugin/console-logs.txt', message + '\n');
		} catch (error) {
			console.log('Could not write to log file:', error);
		}
	};

	// Extract URLs from description text (now these should be full URLs from API v3!)
	const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
	const urls = description.match(urlRegex) || [];
	logToFile(`🔗 Found ${urls.length} URLs in description: ${JSON.stringify(urls)}`);

	console.log('🔗 Found', urls.length, 'total URLs:', urls);
	
	// Log each URL with full details
	urls.forEach((url, index) => {
		logToFile(`🔗 URL ${index + 1}: ${url}`);
		logToFile(`🔗 URL ${index + 1} Length: ${url.length} characters`);
	});

	if (urls.length === 0) {
		console.log('❌ No URLs found in description');
		return [];
	}

	// Filter URLs that are likely to contain transcripts
	const transcriptUrls = urls.filter((url, index) => {
		const lowerUrl = url.toLowerCase();
		
		// Get text around the URL for context
		const urlIndex = description.indexOf(url);
		const contextStart = Math.max(0, urlIndex - 100);
		const contextEnd = Math.min(description.length, urlIndex + url.length + 100);
		const context = description.slice(contextStart, contextEnd).toLowerCase();

		// Enhanced positive indicators
		const transcriptKeywords = [
			'transcript', 'show notes', 'shownotes', 'episode notes',
			'full transcript', 'detailed notes', 'episode transcript',
			'blog post', 'summary', 'notes', 'article', 'post',
			'read more', 'full details', 'complete', 'written',
			'text version', 'written version', 'blog', 'website'
		];

		const podcastDomains = [
			'transistor.fm', 'anchor.fm', 'buzzsprout.com', 'libsyn.com',
			'simplecast.com', 'fireside.fm', 'castos.com', 'captivate.fm',
			'spotify.com', 'medium.com', 'substack.com', 'notion.so',
			'github.io', 'netlify.app', 'vercel.app', 'herokuapp.com',
			'wordpress.com', 'blogspot.com', 'ghost.io'
		];

		// Enhanced negative indicators (exclude these)
		const excludeKeywords = [
			'twitter.com', 'facebook.com', 'instagram.com', 'linkedin.com',
			'youtube.com', 'youtu.be', 'tiktok.com', 'twitch.tv',
			'discord.gg', 'reddit.com',
			'amazon.com', 'amzn.to', 'bit.ly', 'tinyurl.com',
			'patreon.com', 'ko-fi.com', 'buymeacoffee.com'
		];

		// Check for exclusions first
		const hasExcludeKeywords = excludeKeywords.some(keyword => {
			const excluded = lowerUrl.includes(keyword);
			if (excluded) {
				console.log(`   ❌ Excluded due to keyword: ${keyword}`);
			}
			return excluded;
		});

		if (hasExcludeKeywords) {
			return false;
		}

		// Check for positive indicators
		const hasTranscriptKeywords = transcriptKeywords.some(keyword => {
			const inContext = context.includes(keyword);
			const inUrl = lowerUrl.includes(keyword.replace(' ', '')) || lowerUrl.includes(keyword.replace(' ', '-'));
			return inContext || inUrl;
		});

		// Check for podcast domains
		const isPodcastDomain = podcastDomains.some(domain => lowerUrl.includes(domain));

		// Be more permissive - include personal domains and common content sites
		const isContentDomain = /\.(com|org|net|io|co|me|blog)\//.test(lowerUrl) && 
							   !lowerUrl.includes('google.') && 
							   !lowerUrl.includes('apple.') &&
							   !lowerUrl.includes('microsoft.');

		const shouldInclude = hasTranscriptKeywords || isPodcastDomain || (isContentDomain && urls.length <= 3);
		
		return shouldInclude;
	});

	console.log('🎯 Filtered to', transcriptUrls.length, 'potential transcript URLs:', transcriptUrls);
	
	// Log filtered URLs with full details
	transcriptUrls.forEach((url, index) => {
		logToFile(`🎯 Filtered URL ${index + 1}: ${url}`);
		logToFile(`🎯 Filtered URL ${index + 1} Length: ${url.length} characters`);
	});

	// Remove duplicates and return
	const uniqueUrls = [...new Set(transcriptUrls)];
	console.log('📋 Final unique URLs:', uniqueUrls);
	
	// Log final URLs with full details
	uniqueUrls.forEach((url, index) => {
		logToFile(`📋 Final URL ${index + 1}: ${url}`);
		logToFile(`📋 Final URL ${index + 1} Length: ${url.length} characters`);
	});
	
	return uniqueUrls;
}

/**
 * Analyze webpage content using OpenAI to extract and format transcript
 * @param content - HTML content of the page
 * @param openaiApiKey - OpenAI API key for analysis
 * @param model - OpenAI model to use for analysis
 * @returns Object with transcript detection results and extracted text if found
 */
async function analyzeContentForTranscript(content: string, openaiApiKey: string, model: string): Promise<{isTranscript: boolean, text: string, confidence: number}> {
	try {
		console.log('🤖 Starting LLM-based webpage content analysis...');
		
		// Clean up HTML content for analysis
		let cleanedContent = content
			.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')  // Remove scripts
			.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')    // Remove styles
			.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')        // Remove navigation
			.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')  // Remove headers
			.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')  // Remove footers
			.replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')    // Remove sidebars
			.replace(/<[^>]*>/g, ' ')                          // Remove HTML tags
			.replace(/\s+/g, ' ')                              // Normalize whitespace
			.trim()                                            // Trim
			.substring(0, 20000);                              // Limit content size

		console.log(`📝 Cleaned content length: ${cleanedContent.length} characters`);

		const prompt = `Analyze this webpage content to find a podcast or video transcript. 

WHAT TO LOOK FOR:
- Sections with "transcript", "show notes", "episode transcript" 
- Dialogue format with speaker names (e.g., "Preston:", "Host:", "Guest:")
- Timestamp markers like [00:12:34] or timestamps
- Long conversational text that sounds like spoken dialogue
- Interview Q&A format
- Any content that appears to be verbatim spoken words

FORMATTING INSTRUCTIONS (if transcript found):
- Keep ALL original spoken words exactly as written
- Format speaker names consistently: "**Speaker Name:**" (bold)
- Keep timestamps in format [HH:MM:SS] or [MM:SS]
- Preserve paragraph breaks for readability
- Convert source formatting to Markdown:
  * Bold text: **text** (for emphasis, speaker names, key terms)
  * Italic text: *text* (for thoughts, emphasis, book titles)
  * Keep existing bold/italic formatting from the source
- Remove only HTML artifacts and navigation text
- Do NOT change, summarize, or paraphrase any dialogue
- Maintain original structure and formatting intent

RESPONSE FORMAT:
If transcript found: Start with "TRANSCRIPT_FOUND" then the complete formatted transcript in Markdown
If no transcript: Respond only with "NO_TRANSCRIPT"

CONTENT TO ANALYZE:
${cleanedContent}`;

		const openaiRequest: OpenAIRequest = {
			model: model,
			messages: [
				{
					role: 'user',
					content: prompt
				}
			],
			temperature: 0.1,
			max_tokens: 8000
		};

		console.log(`📡 Sending content to OpenAI for analysis using ${model}...`);

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
			console.error('❌ No response received from OpenAI for content analysis');
			return {isTranscript: false, text: '', confidence: 0};
		}

		const analysis = openaiResponse.choices[0].message.content.trim();
		console.log(`🔍 OpenAI analysis result: ${analysis.substring(0, 100)}...`);

		if (analysis.startsWith('TRANSCRIPT_FOUND')) {
			const transcriptText = analysis.replace('TRANSCRIPT_FOUND', '').trim();
			console.log(`✅ Transcript found! Length: ${transcriptText.length} characters`);
			return {
				isTranscript: true,
				text: transcriptText,
				confidence: 95 // High confidence when LLM confirms
			};
		} else {
			console.log('❌ No transcript found by LLM analysis');
			return {isTranscript: false, text: '', confidence: 5};
		}

	} catch (error) {
		console.error('❌ Error in LLM content analysis:', error);
		// Fallback to basic rule-based check
		return analyzeContentFallback(content);
	}
}

/**
 * Fallback analysis when LLM analysis fails
 */
function analyzeContentFallback(content: string): {isTranscript: boolean, text: string, confidence: number} {
	console.log('🔄 Using fallback rule-based analysis...');
	
	const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
	const transcriptIndicators = ['transcript', 'speaker:', 'host:', 'guest:', 'interview', 'dialogue'];
	
	let score = 0;
	transcriptIndicators.forEach(indicator => {
		if (textContent.toLowerCase().includes(indicator)) {
			score += 10;
		}
	});
	
	const isTranscript = score >= 20;
	return {
		isTranscript,
		text: isTranscript ? textContent.substring(0, 5000) : '',
		confidence: score
	};
}

/**
 * Extract and analyze content containers from webpage
 */
function analyzeContentContainers(htmlContent: string): {containers: Array<{type: string, textContent: string, headings: Array<{level: number, text: string}>, html: string}>} {
	const containers: Array<{type: string, textContent: string, headings: Array<{level: number, text: string}>, html: string}> = [];
	
	// Target container selectors in order of preference
	const containerSelectors = [
		{ selector: '[class*="transcript"]', type: 'transcript-specific' },
		{ selector: '[id*="transcript"]', type: 'transcript-specific' },
		{ selector: 'main', type: 'main-content' },
		{ selector: 'article', type: 'article' },
		{ selector: '[role="main"]', type: 'main-role' },
		{ selector: '.content', type: 'content-class' },
		{ selector: '.post-content', type: 'post-content' },
		{ selector: '.entry-content', type: 'entry-content' },
		{ selector: '#content', type: 'content-id' },
		{ selector: '.transcript', type: 'transcript-class' }
	];

	// Create a DOM-like parser (simple regex-based)
	containerSelectors.forEach(({selector, type}) => {
		const matches = extractElementsBySelector(htmlContent, selector);
		matches.forEach(match => {
			const textContent = extractTextFromHtml(match);
			const headings = extractHeadings(match);
			
			if (textContent.length > 200) { // Minimum content threshold
				containers.push({
					type,
					textContent,
					headings,
					html: match
				});
			}
		});
	});

	return {containers};
}

/**
 * Simple HTML element extraction by selector
 */
function extractElementsBySelector(html: string, selector: string): string[] {
	const elements = [];
	
	// Handle different selector types
	if (selector.startsWith('[class*=')) {
		const className = selector.match(/\[class\*="([^"]+)"\]/)?.[1];
		if (className) {
			const regex = new RegExp(`<[^>]+class="[^"]*${className}[^"]*"[^>]*>(.*?)<\/[^>]+>`, 'gis');
			const matches = html.matchAll(regex);
			for (const match of matches) {
				elements.push(match[0]);
			}
		}
	} else if (selector.startsWith('[id*=')) {
		const idName = selector.match(/\[id\*="([^"]+)"\]/)?.[1];
		if (idName) {
			const regex = new RegExp(`<[^>]+id="[^"]*${idName}[^"]*"[^>]*>(.*?)<\/[^>]+>`, 'gis');
			const matches = html.matchAll(regex);
			for (const match of matches) {
				elements.push(match[0]);
			}
		}
	} else if (selector.startsWith('.')) {
		const className = selector.slice(1);
		const regex = new RegExp(`<[^>]+class="[^"]*\\b${className}\\b[^"]*"[^>]*>(.*?)<\/[^>]+>`, 'gis');
		const matches = html.matchAll(regex);
		for (const match of matches) {
			elements.push(match[0]);
		}
	} else if (selector.startsWith('#')) {
		const idName = selector.slice(1);
		const regex = new RegExp(`<[^>]+id="${idName}"[^>]*>(.*?)<\/[^>]+>`, 'gis');
		const matches = html.matchAll(regex);
		for (const match of matches) {
			elements.push(match[0]);
		}
	} else {
		// Tag selector
		const regex = new RegExp(`<${selector}[^>]*>(.*?)<\/${selector}>`, 'gis');
		const matches = html.matchAll(regex);
		for (const match of matches) {
			elements.push(match[0]);
		}
	}
	
	return elements;
}

/**
 * Extract headings from HTML content
 */
function extractHeadings(html: string): Array<{level: number, text: string}> {
	const headings = [];
	
	for (let level = 1; level <= 6; level++) {
		const regex = new RegExp(`<h${level}[^>]*>(.*?)<\/h${level}>`, 'gi');
		const matches = html.matchAll(regex);
		
		for (const match of matches) {
			const text = extractTextFromHtml(match[1]).trim();
			if (text.length > 0) {
				headings.push({level, text});
			}
		}
	}
	
	return headings.sort((a, b) => a.level - b.level);
}

/**
 * Extract clean text from HTML
 */
function extractTextFromHtml(html: string): string {
	return html
		.replace(/<script[^>]*>.*?<\/script>/gi, '')
		.replace(/<style[^>]*>.*?<\/style>/gi, '')
		.replace(/<nav[^>]*>.*?<\/nav>/gi, '')
		.replace(/<aside[^>]*>.*?<\/aside>/gi, '')
		.replace(/<footer[^>]*>.*?<\/footer>/gi, '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Score a container for transcript likelihood
 */
function scoreContainerForTranscript(container: {type: string, textContent: string, headings: Array<{level: number, text: string}>}): {total: number, content: number, headings: number, structure: number} {
	let contentScore = 0;
	let headingScore = 0;
	let structureScore = 0;

	// Container type scoring
	if (container.type === 'transcript-specific') structureScore += 30;
	else if (container.type === 'main-content') structureScore += 15;
	else if (container.type === 'article') structureScore += 12;
	else structureScore += 5;

	// Content analysis
	const lowerContent = container.textContent.toLowerCase();
	
	// Transcript keywords in content
	const transcriptKeywords = [
		'transcript', 'speaker', 'host:', 'guest:', 'interviewer:', 'interviewee:',
		'episode transcript', 'full transcript', '**host**', '**guest**'
	];
	
	transcriptKeywords.forEach(keyword => {
		const matches = (lowerContent.match(new RegExp(keyword, 'g')) || []).length;
		contentScore += matches * 3;
	});

	// Dialogue patterns
	const dialoguePatterns = [
		/\b[A-Z][a-z]+:\s/g, // "Name: "
		/\*\*[^*]+\*\*:/g,    // "**Name**:"
		/\[[0-9:]+\]/g,       // "[00:00]"
		/[0-9]+:[0-9]+/g      // "0:00"
	];

	dialoguePatterns.forEach(pattern => {
		const matches = (container.textContent.match(pattern) || []).length;
		contentScore += matches * 2;
	});

	// Content length scoring
	if (container.textContent.length > 2000) contentScore += 5;
	if (container.textContent.length > 5000) contentScore += 10;
	if (container.textContent.length > 10000) contentScore += 15;

	// Heading analysis
	container.headings.forEach(heading => {
		const lowerHeading = heading.text.toLowerCase();
		
		// Direct transcript mentions in headings
		if (lowerHeading.includes('transcript')) {
			headingScore += heading.level <= 2 ? 20 : 15;
		}
		
		// Episode/show structure
		if (lowerHeading.match(/episode|show|interview/)) {
			headingScore += 8;
		}
		
		// Speaker patterns in headings
		if (lowerHeading.match(/host|guest|speaker|interviewer/)) {
			headingScore += 6;
		}
		
		// Time-based headings
		if (lowerHeading.match(/\d+:\d+|timestamp/)) {
			headingScore += 10;
		}
	});

	const total = contentScore + headingScore + structureScore;
	
	return {
		total,
		content: contentScore,
		headings: headingScore,
		structure: structureScore
	};
}

/**
 * Fallback analysis for raw content when no containers found
 */
function analyzeRawContent(content: string): {isTranscript: boolean, text: string, confidence: number} {
	const textContent = extractTextFromHtml(content);
	
	if (textContent.length < 500) {
		return {isTranscript: false, text: '', confidence: 0};
	}

	let confidence = 0;
	const lowerContent = textContent.toLowerCase();

	// Basic transcript indicators
	const transcriptIndicators = ['transcript', 'speaker', 'host:', 'guest:', 'interviewer:'];
	transcriptIndicators.forEach(indicator => {
		const matches = (lowerContent.match(new RegExp(indicator, 'g')) || []).length;
		confidence += matches * 3;
	});

	// Length scoring
	if (textContent.length > 2000) confidence += 5;
	if (textContent.length > 5000) confidence += 10;

	return {
		isTranscript: confidence > 15,
		text: confidence > 15 ? textContent : '',
		confidence
	};
}

/**
 * Fetch and analyze external URL for transcript content using WebScraping.AI
 * @param url - URL to check for transcript
 * @param openaiApiKey - OpenAI API key for content analysis
 * @param webscrapingApiKey - WebScraping.AI API key for content fetching
 * @param model - OpenAI model to use for analysis
 * @returns Promise resolving to transcript text or null
 */
export async function fetchExternalTranscript(url: string, openaiApiKey: string, webscrapingApiKey: string, model: string): Promise<string | null> {
	try {
		console.log('🌐 Scraping external URL for transcript:', url);

		// Use WebScraping.AI to fetch content
		const encodedUrl = encodeURIComponent(url);
		const scrapingUrl = `https://api.webscraping.ai/html?url=${encodedUrl}&api_key=${webscrapingApiKey}`;
		
		const response = await requestUrl({
			url: scrapingUrl,
			method: 'GET',
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; MediaSummarizer/1.0)'
			}
		});

		if (response.status !== 200) {
			console.error(`❌ WebScraping.AI failed: ${response.status} ${response.text}`);
			return null;
		}

		const scrapedContent = response.text;
		console.log(`✅ Successfully scraped ${scrapedContent.length} characters from ${url}`);
		
		const analysis = await analyzeContentForTranscript(scrapedContent, openaiApiKey, model);
		
		console.log(`📊 Transcript analysis for ${url}: confidence=${analysis.confidence}, isTranscript=${analysis.isTranscript}`);

		if (analysis.isTranscript) {
			return analysis.text;
		}

		return null;

	} catch (error) {
		console.error('❌ Error fetching external transcript from', url, ':', error);
		return null;
	}
}

/**
 * Check for external transcripts in YouTube video description using YouTube Data API v3
 * @param url - YouTube video URL
 * @param youtubeApiKey - YouTube Data API v3 key
 * @param openaiApiKey - OpenAI API key
 * @param webscrapingApiKey - WebScraping.AI API key
 * @param model - OpenAI model to use
 * @returns Promise resolving to external transcript text and source URL, or null
 */
export async function checkForExternalTranscript(url: string, youtubeApiKey: string, openaiApiKey: string, webscrapingApiKey: string, model: string): Promise<{text: string, sourceUrl: string, urls: string[]} | null> {
	try {
		// Get video metadata using YouTube Data API v3
		const metadata = await getYouTubeMetadataAPI(url, youtubeApiKey);
		
		if (!metadata.description) {
			console.log('No description found for video');
			return null;
		}

		// Find potential transcript URLs (full URLs from API v3)
		const potentialUrls = findPotentialTranscriptUrls(metadata.description);
		
		if (potentialUrls.length === 0) {
			console.log('No potential transcript URLs found in description');
			return null;
		}

		console.log(`🎯 Found ${potentialUrls.length} potential transcript URLs`);

		// Return URLs for user selection - don't auto-scrape
		return {
			text: '', // Will be filled when user selects URL
			sourceUrl: '',
			urls: potentialUrls
		};

	} catch (error) {
		console.error('Error checking for external transcript:', error);
		return null;
	}
}

/**
 * Scrape a specific URL selected by the user
 * @param url - Selected URL to scrape
 * @param openaiApiKey - OpenAI API key
 * @param webscrapingApiKey - WebScraping.AI API key  
 * @param model - OpenAI model to use
 * @returns Promise resolving to transcript data or null
 */
export async function scrapeSelectedUrl(url: string, openaiApiKey: string, webscrapingApiKey: string, model: string): Promise<{text: string, sourceUrl: string} | null> {
	try {
		const transcript = await fetchExternalTranscript(url, openaiApiKey, webscrapingApiKey, model);
		
		if (transcript) {
			console.log('Found external transcript at:', url);
			return {
				text: transcript,
				sourceUrl: url
			};
		}

		return null;

	} catch (error) {
		console.error('Error scraping selected URL:', error);
		return null;
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