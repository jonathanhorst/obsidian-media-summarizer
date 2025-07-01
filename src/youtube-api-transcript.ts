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

		// Extract transcript from YouTube API response
		const transcriptEvents =
			response?.actions?.[0]?.updateEngagementPanelAction?.content
				?.transcriptRenderer?.content?.transcriptSearchPanelRenderer
				?.body?.transcriptSegmentListRenderer?.initialSegments;

		if (!transcriptEvents || !Array.isArray(transcriptEvents)) {
			return [];
		}

		return transcriptEvents.map((segment: any) => {
			const cue = segment.transcriptSegmentRenderer;
			return {
				text: cue.snippet?.runs?.[0]?.text || "",
				duration: parseInt(cue.endMs) - parseInt(cue.startTimeMs),
				offset: parseInt(cue.startTimeMs),
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
			console.log('Fetching video page:', url);
			
			// First, fetch the video page
			const videoPageBody = await request(url);
			
			// Parse the page to extract transcript request info
			const videoData = parseVideoPage(videoPageBody, config);
			
			console.log('Making transcript API request');
			
			// Make the transcript API request
			const response = await requestUrl({
				url: videoData.transcriptRequest.url,
				method: "POST",
				headers: videoData.transcriptRequest.headers || {},
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