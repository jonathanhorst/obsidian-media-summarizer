import { request, requestUrl } from 'obsidian';

/**
 * Error class for YouTube transcript operations
 */
export class YoutubeTranscriptError extends Error {
	constructor(err: unknown) {
		if (!(err instanceof Error)) {
			super("");
			return;
		}

		if (err.message.includes("ERR_INVALID_URL")) {
			super("Invalid YouTube URL");
		} else {
			super(err.message);
		}
	}
}

/**
 * Configuration for transcript fetching
 */
export interface TranscriptConfig {
	lang?: string;
	country?: string;
}

/**
 * Individual transcript line/segment
 */
export interface TranscriptLine {
	text: string;
	duration: number;
	offset: number;
}

/**
 * Complete transcript response
 */
export interface TranscriptResponse {
	title: string;
	lines: TranscriptLine[];
}

/**
 * Internal transcript request structure
 */
interface TranscriptRequest {
	url: string;
	headers?: Record<string, string>;
	body?: string;
}

/**
 * Internal video data structure
 */
interface VideoData {
	title: string;
	transcriptRequest: TranscriptRequest;
}

// Regular expressions for parsing video page
const YOUTUBE_TITLE_REGEX = new RegExp(
	/<meta\s+name="title"\s+content="([^"]*)\">/,
);
const YOUTUBE_VIDEOID_REGEX = new RegExp(
	/<link\s+rel="canonical"\s+href="([^"]*)\">/,
);

/**
 * Parse transcript response from YouTube's internal API
 */
function parseTranscript(responseContent: string): TranscriptLine[] {
	try {
		
		const response = JSON.parse(responseContent);
		
		// Explore the response structure more deeply
		if (response.actions) {
			response.actions.forEach((action: any, index: number) => {
			});
		}
		
		// Try multiple possible paths for transcript data
		let transcriptEvents = null;
		
		// Original path
		transcriptEvents = response?.actions?.[0]?.updateEngagementPanelAction?.content
			?.transcriptRenderer?.content?.transcriptSearchPanelRenderer
			?.body?.transcriptSegmentListRenderer?.initialSegments;
			
		if (!transcriptEvents) {
			// Try alternative paths that might exist in new format
			transcriptEvents = response?.contents?.twoColumnWatchNextResults?.results?.results?.contents
				?.find((item: any) => item.videoPrimaryInfoRenderer)?.transcriptRenderer?.content?.transcriptSearchPanelRenderer
				?.body?.transcriptSegmentListRenderer?.initialSegments;
		}
		
		if (!transcriptEvents) {
			// Search recursively for any transcript-related data
			const searchForTranscript = (obj: any, path = ''): any => {
				if (!obj || typeof obj !== 'object') return null;
				
				for (const key in obj) {
					if (key.toLowerCase().includes('transcript')) {
						if (obj[key] && typeof obj[key] === 'object') {
						}
					}
					
					if (typeof obj[key] === 'object' && obj[key] !== null) {
						const result = searchForTranscript(obj[key], `${path}.${key}`);
						if (result) return result;
					}
				}
				return null;
			};
			
			searchForTranscript(response);
		}


		if (!transcriptEvents || !Array.isArray(transcriptEvents)) {
			return [];
		}

		return transcriptEvents
			.filter((segment: any) => {
				// Skip header segments, only process actual transcript segments
				return segment.transcriptSegmentRenderer && !segment.transcriptSectionHeaderRenderer;
			})
			.map((segment: any, index: number) => {
			const cue = segment.transcriptSegmentRenderer;
			
			// Extract text from snippet
			let text = '';
			if (cue.snippet && cue.snippet.runs) {
				text = cue.snippet.runs.map((run: any) => run.text).join('');
			} else if (cue.snippet && cue.snippet.simpleText) {
				text = cue.snippet.simpleText;
			} else if (cue.text) {
				text = cue.text;
			}
			
			
			// Extract timing information
			const startTimeMs = cue.startMs || cue.startTimeMs || "0";
			const endTimeMs = cue.endMs || cue.endTimeMs || startTimeMs;
			
			// Parse as numbers with validation
			const startTime = parseInt(startTimeMs.toString(), 10);
			const endTime = parseInt(endTimeMs.toString(), 10);
			
			// Validate parsed numbers
			const validStartTime = isNaN(startTime) ? 0 : startTime;
			const validEndTime = isNaN(endTime) ? validStartTime + 1000 : endTime; // Default 1 second duration
			
			
			return {
				text: text,
				duration: validEndTime - validStartTime,
				offset: validStartTime,
			};
		});
	} catch (error) {
		throw new YoutubeTranscriptError(
			`Failed to parse API response: ${error}`,
		);
	}
}

/**
 * Parse YouTube video page to extract transcript request information
 */
function parseVideoPage(
	htmlContent: string,
	config?: TranscriptConfig,
): VideoData {
	// Extract title
	const titleMatch = htmlContent.match(YOUTUBE_TITLE_REGEX);
	let title = "";
	if (titleMatch) title = titleMatch[1];

	// Extract video ID
	const videoIdMatch = htmlContent.match(YOUTUBE_VIDEOID_REGEX);
	let videoId = "";
	if (videoIdMatch) videoId = videoIdMatch[1].split("?v=")[1];

	// Find the script containing ytInitialData
	const ytInitialDataMatch = htmlContent.match(/var ytInitialData = ({.*?});/);
	
	if (!ytInitialDataMatch) {
		throw new YoutubeTranscriptError(
			"Could not find ytInitialData in video page",
		);
	}

	let data;
	try {
		data = JSON.parse(ytInitialDataMatch[1]);
	} catch (err) {
		throw new YoutubeTranscriptError(
			"Failed to parse ytInitialData JSON",
		);
	}

	// Find the transcript engagement panel
	const transcriptPanel = data?.engagementPanels?.find(
		(panel: any) =>
			panel?.engagementPanelSectionListRenderer?.content
				?.continuationItemRenderer?.continuationEndpoint
				?.getTranscriptEndpoint,
	);

	if (!transcriptPanel) {
		throw new YoutubeTranscriptError(
			"No transcript available for this video",
		);
	}

	const params =
		transcriptPanel?.engagementPanelSectionListRenderer?.content
			?.continuationItemRenderer?.continuationEndpoint
			?.getTranscriptEndpoint?.params;

	if (!params) {
		throw new YoutubeTranscriptError(
			"Could not extract transcript parameters",
		);
	}

	// Create the API request body
	const requestBody = {
		context: {
			client: {
				clientName: "WEB",
				clientVersion: "2.20250610.04.00",
				hl: config?.lang || "en",
				gl: config?.country || "US",
			},
		},
		externalVideoId: videoId,
		params: params,
	};

	return {
		title,
		transcriptRequest: {
			url: "https://www.youtube.com/youtubei/v1/get_transcript?prettyPrint=false",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
		},
	};
}

/**
 * Main class for fetching YouTube transcripts using YouTube's internal API
 * Based on the approach from obsidian-yt-transcript plugin
 */
export class YoutubeAPITranscript {
	/**
	 * Get transcript for a YouTube video using internal API
	 * @param url YouTube video URL
	 * @param config Optional configuration for language and country
	 * @returns Promise resolving to transcript response
	 */
	public static async getTranscript(
		url: string,
		config?: TranscriptConfig,
	): Promise<TranscriptResponse> {
		try {
			
			// First, fetch the video page using requestUrl for better CORS handling
			const videoPageResponse = await requestUrl({
				url: url,
				method: 'GET',
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
				}
			});
			const videoPageBody = videoPageResponse.text;
			
			// Parse the page to extract transcript request info
			const videoData = parseVideoPage(videoPageBody, config);
			
			
			// Make the transcript API request with proper headers
			const headers = {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
				'Accept': '*/*',
				'Accept-Language': 'en-US,en;q=0.9',
				'Origin': 'https://www.youtube.com',
				'Referer': url,
				...videoData.transcriptRequest.headers
			};
			
			const response = await requestUrl({
				url: videoData.transcriptRequest.url,
				method: "POST",
				headers: headers,
				body: videoData.transcriptRequest.body,
			});

			// Parse the transcript response
			const lines = parseTranscript(response.text);

			return {
				title: videoData.title,
				lines,
			};
		} catch (err: any) {
			console.error('YouTube API transcript error:', err);
			throw new YoutubeTranscriptError(err);
		}
	}
}

/**
 * Convert transcript lines to a simple text string
 * @param lines Array of transcript lines
 * @returns Joined transcript text
 */
export function transcriptLinesToText(lines: TranscriptLine[]): string {
	return lines
		.map(line => line.text)
		.join(' ')
		.replace(/\s+/g, ' ')
		.trim();
}