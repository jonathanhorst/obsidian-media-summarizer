import { ItemView, WorkspaceLeaf, Notice, MarkdownView } from 'obsidian';
import { createRoot, Root } from 'react-dom/client';
import * as React from 'react';
import YouTube from 'react-youtube';
import MediaSummarizerPlugin from './main';
import { getTranscript, getTranscriptLines, getYouTubeMetadataAPI, formatRawTranscriptWithTimestamps, checkForExternalTranscript, scrapeSelectedUrl, checkForExternalTranscriptWithProvider, scrapeSelectedUrlWithProvider } from './summarizer';
import { YoutubeAPITranscript } from './youtube-api-transcript';

/**
 * Unique identifier for the Media Summarizer view type
 */
export const MEDIA_SUMMARIZER_VIEW_TYPE = 'media-summarizer-view';

/**
 * Format seconds into HH:MM:SS format
 */
export const formatTimestamp = (timestamp: number | undefined) => {
	// Handle undefined, null, NaN, or negative values
	if (timestamp === undefined || timestamp === null || isNaN(timestamp) || timestamp < 0) {
		return "00:00";
	}
	
	// Ensure we have a valid number
	const validTimestamp = Math.max(0, Math.floor(timestamp));
	
	const hours = Math.floor(validTimestamp / 3600);
	const minutes = Math.floor((validTimestamp - hours * 3600) / 60);
	const seconds = Math.floor(validTimestamp - hours * 3600 - minutes * 60);
	
	// Ensure we don't get NaN in our calculations
	const safeSeconds = isNaN(seconds) ? 0 : seconds;
	const safeMinutes = isNaN(minutes) ? 0 : minutes;
	const safeHours = isNaN(hours) ? 0 : hours;
	
	const formattedSeconds = safeSeconds < 10 ? `0${safeSeconds}` : safeSeconds;
	const formattedMinutes = safeMinutes < 10 ? `0${safeMinutes}` : safeMinutes;
	
	return `${
		safeHours > 0 ? safeHours + ":" : ""
	}${formattedMinutes}:${formattedSeconds}`;
};

/**
 * Extract YouTube video ID from various URL formats
 */
export const getVideoId = (url: string): string | null => {
	try {
		const urlObj = new URL(url);
		
		if (urlObj.hostname.includes('youtube.com')) {
			return urlObj.searchParams.get('v');
		} else if (urlObj.hostname.includes('youtu.be')) {
			return urlObj.pathname.slice(1);
		}
		
		return null;
	} catch {
		return null;
	}
};

/**
 * Media player component using React YouTube
 */
interface MediaPlayerProps {
	mediaLink: string;
	plugin: MediaSummarizerPlugin;
	onReady: () => void;
	ytRef: React.RefObject<YouTube>;
}

const MediaPlayer: React.FC<MediaPlayerProps> = ({ mediaLink, plugin, onReady, ytRef }) => {
	const [isReady, setIsReady] = React.useState(false);
	const [externalTranscriptData, setExternalTranscriptData] = React.useState<{text: string, sourceUrl: string} | null>(null);
	const [foundUrls, setFoundUrls] = React.useState<string[]>([]);
	const [showUrlModal, setShowUrlModal] = React.useState(false);
	const [urlsSearched, setUrlsSearched] = React.useState(false);

	// ESC key handler for modal
	React.useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && showUrlModal) {
				setShowUrlModal(false);
			}
		};

		if (showUrlModal) {
			document.addEventListener('keydown', handleKeyDown);
		}

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [showUrlModal]);

	const videoId = getVideoId(mediaLink);

	const handleReady = () => {
		setIsReady(true);
		onReady();
	};

	// Search for external transcript URLs when button is clicked
	const searchForExternalUrls = async () => {
		if (!plugin.settings.youtubeApiKey || !plugin.settings.webscrapingApiKey) {
			new Notice('Please configure YouTube Data API and WebScraping.AI API keys in settings');
			return;
		}

		// Check if external transcript provider is configured
		const externalProvider = plugin.settings.externalTranscriptProvider || 'openai';
		const externalModel = plugin.settings.externalTranscriptProviderModel || 'gpt-4o-mini';

		// Validate provider configuration
		const isProviderConfigured = plugin.getLLMSummarizer().isProviderConfigured(externalProvider);
		if (!isProviderConfigured) {
			new Notice(`Please configure ${externalProvider} API key in settings for external transcript processing`);
			return;
		}

		const loadingNotice = new Notice('Searching for external transcript URLs...', 0);
		
		try {
			// Use the new provider-aware function
			const providerManager = plugin.getLLMSummarizer().getProviderManager();
			const result = await checkForExternalTranscriptWithProvider(
				mediaLink, 
				plugin.settings.youtubeApiKey, 
				plugin.settings.webscrapingApiKey,
				providerManager,
				externalProvider,
				externalModel
			);
			
			loadingNotice.hide();
			
			if (result && result.urls && result.urls.length > 0) {
				setFoundUrls(result.urls);
				setUrlsSearched(true);
				setShowUrlModal(true);
			} else {
				setUrlsSearched(true);
				new Notice('No potential transcript URLs found in video description');
			}
		} catch (error) {
			loadingNotice.hide();
			console.error('Error checking for external transcript:', error);
			new Notice('Error searching for external transcripts');
		}
	};

	const insertTimestamp = async () => {
		try {
			const activeFile = plugin.app.workspace.getActiveFile();
			if (!activeFile) {
				new Notice('No active note found. Please open a note first.');
				return;
			}

			let activeView: MarkdownView | null = null;
			
			const currentActiveView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
			if (currentActiveView && currentActiveView.file?.path === activeFile.path) {
				activeView = currentActiveView;
			} else {
				const leaves = plugin.app.workspace.getLeavesOfType('markdown');
				for (const leaf of leaves) {
					const view = leaf.view as MarkdownView;
					if (view.file?.path === activeFile.path) {
						activeView = view;
						plugin.app.workspace.setActiveLeaf(leaf, { focus: true });
						break;
					}
				}
			}

			if (!activeView) {
				new Notice('Cannot find editor for the active note.');
				return;
			}

			// Get current time using react-youtube ref
			const timestamp = await ytRef.current?.internalPlayer?.getCurrentTime();
			if (!timestamp) {
				new Notice('Could not get current video time');
				return;
			}

			const formattedTimestamp = formatTimestamp(timestamp);
			
			const editor = activeView.editor;
			editor.replaceSelection(`[${formattedTimestamp}]() `);

			new Notice(`Timestamp inserted: ${formattedTimestamp}`);

		} catch (error) {
			console.error('Error inserting timestamp:', error);
			new Notice('Error inserting timestamp');
		}
	};

	const generateSummary = async () => {
		if (!plugin.settings.openaiApiKey) {
			new Notice('OpenAI API key not configured. Please set it in plugin settings.');
			return;
		}

		const activeFile = plugin.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice('No active note found. Please open a note first.');
			return;
		}

		let activeView: MarkdownView | null = null;
		
		const currentActiveView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
		if (currentActiveView && currentActiveView.file?.path === activeFile.path) {
			activeView = currentActiveView;
		} else {
			const leaves = plugin.app.workspace.getLeavesOfType('markdown');
			for (const leaf of leaves) {
				const view = leaf.view as MarkdownView;
				if (view.file?.path === activeFile.path) {
					activeView = view;
					plugin.app.workspace.setActiveLeaf(leaf, { focus: true });
					break;
				}
			}
		}

		if (!activeView) {
			new Notice('Cannot find editor for the active note.');
			return;
		}

		try {
			const loadingNotice = new Notice('Fetching transcript and generating summary...', 0);

			const transcript = await getTranscript(mediaLink);
			
			if (transcript.startsWith('Error:')) {
				loadingNotice.hide();
				new Notice(transcript);
				return;
			}

			// Get metadata for better AI processing
			let metadata: { title?: string; channel?: string; description?: string } | undefined;
			try {
				if (plugin.settings.youtubeApiKey) {
					metadata = await getYouTubeMetadataAPI(mediaLink, plugin.settings.youtubeApiKey);
				}
			} catch (error) {
				// Metadata is optional for summary
			}

			const summary = await plugin.getLLMSummarizer().summarizeTranscript(transcript, metadata);
			
			loadingNotice.hide();

			if (summary.startsWith('Error:')) {
				new Notice(summary);
				return;
			}

			const editor = activeView.editor;
			
			const lastLine = editor.lastLine();
			const lastLineLength = editor.getLine(lastLine).length;
			editor.setCursor(lastLine, lastLineLength);

			const summaryText = `\n\n## Summary\n\n${summary}\n`;
			editor.replaceRange(summaryText, editor.getCursor());

			new Notice('Summary generated and inserted!');

			const newLastLine = editor.lastLine();
			editor.scrollIntoView({ from: { line: newLastLine - 5, ch: 0 }, to: { line: newLastLine, ch: 0 } });

		} catch (error) {
			console.error('Error generating summary:', error);
			new Notice('Error generating summary. Please try again.');
		}
	};

	const insertEnhancedTranscript = async () => {
		const activeFile = plugin.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice('No active note found. Please open a note first.');
			return;
		}

		let activeView: MarkdownView | null = null;
		
		const currentActiveView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
		if (currentActiveView && currentActiveView.file?.path === activeFile.path) {
			activeView = currentActiveView;
		} else {
			const leaves = plugin.app.workspace.getLeavesOfType('markdown');
			for (const leaf of leaves) {
				const view = leaf.view as MarkdownView;
				if (view.file?.path === activeFile.path) {
					activeView = view;
					plugin.app.workspace.setActiveLeaf(leaf, { focus: true });
					break;
				}
			}
		}

		if (!activeView) {
			new Notice('Cannot find editor for the active note.');
			return;
		}

		try {
			const editor = activeView.editor;
			
			// Position cursor at the end of the note
			const lastLine = editor.lastLine();
			const lastLineLength = editor.getLine(lastLine).length;
			editor.setCursor(lastLine, lastLineLength);

			let loadingNotice = new Notice('Fetching transcript...', 0);

			// Get raw transcript
			const rawTranscript = await getTranscript(mediaLink);
			
			if (rawTranscript.startsWith('Error:')) {
				loadingNotice.hide();
				new Notice(rawTranscript);
				return;
			}

			let finalTranscript: string;
			let sourceLabel: string;

			if (plugin.settings.enhancedTranscriptFormatting) {
				// Enhanced formatting enabled - get transcript lines and metadata
				loadingNotice.hide();
				loadingNotice = new Notice('Getting transcript with timestamps...', 0);

				try {
					// Get raw transcript lines with timing data
					const transcriptLines = await getTranscriptLines(mediaLink);
					
					loadingNotice.hide();
					loadingNotice = new Notice('Getting video metadata...', 0);

					// Get video metadata using YouTube Data API v3
					const metadata = await getYouTubeMetadataAPI(mediaLink, plugin.settings.youtubeApiKey);
					
					loadingNotice.hide();
					loadingNotice = new Notice('Enhancing transcript with AI...', 0);

					// Enhance transcript with AI using timestamp data
					const plainTranscript = transcriptLines.map(line => line.text).join(' ');
					const enhancedTranscript = await plugin.getLLMSummarizer().enhanceTranscript(plainTranscript, metadata);
					
					if (enhancedTranscript.startsWith('Error:')) {
						loadingNotice.hide();
						new Notice(`${enhancedTranscript} Falling back to raw transcript.`);
						// Fall back to raw transcript
						finalTranscript = rawTranscript;
						sourceLabel = '*YouTube auto-generated (AI enhancement failed)*';
					} else {
						finalTranscript = enhancedTranscript;
						// Get current provider info for label
						const currentProvider = plugin.settings.currentProvider;
						const providerConfig = plugin.settings.providers[currentProvider];
						let modelName = '';
						if (currentProvider === 'ollama') {
							modelName = (providerConfig as any).model || 'local model';
						} else {
							modelName = (providerConfig as any).model || 'default model';
						}
						sourceLabel = `*Enhanced with ${currentProvider} ${modelName}*`;
					}
				} catch (error) {
					loadingNotice.hide();
					new Notice(`Error getting transcript with timestamps. Falling back to raw transcript.`);
					console.error('Error getting transcript lines:', error);
					// Fall back to raw transcript
					finalTranscript = rawTranscript;
					sourceLabel = '*YouTube auto-generated (AI enhancement failed)*';
				}
			} else {
				// Enhanced formatting disabled - use raw transcript
				finalTranscript = rawTranscript;
				sourceLabel = '*YouTube auto-generated*';
			}

			loadingNotice.hide();

			// Insert transcript under ## Transcript heading
			const transcriptText = `\n\n## Transcript\n\n${sourceLabel}\n\n${finalTranscript}\n`;
			editor.replaceRange(transcriptText, editor.getCursor());

			const enhancementStatus = plugin.settings.enhancedTranscriptFormatting ? 'Enhanced transcript' : 'Raw transcript';
			new Notice(`${enhancementStatus} inserted!`);

			// Scroll to show the transcript
			const newLastLine = editor.lastLine();
			editor.scrollIntoView({ from: { line: newLastLine - 10, ch: 0 }, to: { line: newLastLine, ch: 0 } });

		} catch (error) {
			console.error('Error inserting transcript:', error);
			new Notice('Error fetching transcript. Please try again.');
		}
	};

	const insertRawTranscript = async () => {
		const activeFile = plugin.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice('No active note found. Please open a note first.');
			return;
		}

		let activeView: MarkdownView | null = null;
		
		const currentActiveView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
		if (currentActiveView && currentActiveView.file?.path === activeFile.path) {
			activeView = currentActiveView;
		} else {
			const leaves = plugin.app.workspace.getLeavesOfType('markdown');
			for (const leaf of leaves) {
				const view = leaf.view as MarkdownView;
				if (view.file?.path === activeFile.path) {
					activeView = view;
					plugin.app.workspace.setActiveLeaf(leaf, { focus: true });
					break;
				}
			}
		}

		if (!activeView) {
			new Notice('Cannot find editor for the active note.');
			return;
		}

		try {
			const editor = activeView.editor;
			
			// Position cursor at the end of the note
			const lastLine = editor.lastLine();
			const lastLineLength = editor.getLine(lastLine).length;
			editor.setCursor(lastLine, lastLineLength);

			const loadingNotice = new Notice('Fetching raw transcript with timestamps...', 0);

			try {
				// Try to get transcript lines with timing data first
				const transcriptLines = await getTranscriptLines(mediaLink);
				
				if (transcriptLines && transcriptLines.length > 0) {
					loadingNotice.hide();
					
					// Format with timestamps every 5 segments
					const formattedTranscript = formatRawTranscriptWithTimestamps(transcriptLines);
					
					// Insert formatted transcript under ## Transcript heading
					const transcriptText = `\n\n## Transcript\n\n*YouTube auto-generated with timestamps*\n\n${formattedTranscript}\n`;
					editor.replaceRange(transcriptText, editor.getCursor());

					new Notice('Raw transcript with timestamps inserted!');

					// Scroll to show the transcript
					const newLastLine = editor.lastLine();
					editor.scrollIntoView({ from: { line: newLastLine - 10, ch: 0 }, to: { line: newLastLine, ch: 0 } });
					
					return;
				}
			} catch (linesError) {
			}

			// Fallback to plain text transcript if timing data fails
			const rawTranscript = await getTranscript(mediaLink);
			
			loadingNotice.hide();

			if (rawTranscript.startsWith('Error:')) {
				new Notice(rawTranscript);
				return;
			}

			// Insert plain text transcript under ## Transcript heading
			const transcriptText = `\n\n## Transcript\n\n*YouTube auto-generated*\n\n${rawTranscript}\n`;
			editor.replaceRange(transcriptText, editor.getCursor());

			new Notice('Raw transcript inserted!');

			// Scroll to show the transcript
			const newLastLine = editor.lastLine();
			editor.scrollIntoView({ from: { line: newLastLine - 10, ch: 0 }, to: { line: newLastLine, ch: 0 } });

		} catch (error) {
			console.error('Error inserting raw transcript:', error);
			new Notice('Error fetching raw transcript. Please try again.');
		}
	};

	// Helper function to insert external transcript with provided data
	const insertExternalTranscriptWithData = async (data: {text: string, sourceUrl: string}) => {
		const activeFile = plugin.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice('No active note found. Please open a note first.');
			return;
		}

		let activeView: MarkdownView | null = null;
		
		const currentActiveView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
		if (currentActiveView && currentActiveView.file?.path === activeFile.path) {
			activeView = currentActiveView;
		} else {
			const leaves = plugin.app.workspace.getLeavesOfType('markdown');
			for (const leaf of leaves) {
				const view = leaf.view as MarkdownView;
				if (view.file?.path === activeFile.path) {
					activeView = view;
					plugin.app.workspace.setActiveLeaf(leaf, { focus: true });
					break;
				}
			}
		}

		if (!activeView) {
			new Notice('Cannot find editor for the active note.');
			return;
		}

		try {
			const editor = activeView.editor;
			
			// Position cursor at the end of the note
			const lastLine = editor.lastLine();
			const lastLineLength = editor.getLine(lastLine).length;
			editor.setCursor(lastLine, lastLineLength);

			// Insert external transcript with source attribution showing domain
			const domain = new URL(data.sourceUrl).hostname;
			const transcriptText = `\n\n## Transcript\n\n*From ${domain} - [view source](${data.sourceUrl})*\n\n${data.text}\n`;
			editor.replaceRange(transcriptText, editor.getCursor());

			// Scroll to show the transcript
			const newLastLine = editor.lastLine();
			editor.scrollIntoView({ from: { line: newLastLine - 10, ch: 0 }, to: { line: newLastLine, ch: 0 } });

		} catch (error) {
			console.error('Error inserting external transcript:', error);
			new Notice('Error inserting external transcript. Please try again.');
			throw error;
		}
	};

	const insertExternalTranscript = async () => {
		if (!externalTranscriptData) {
			new Notice('No external transcript available.');
			return;
		}

		try {
			await insertExternalTranscriptWithData(externalTranscriptData);
			const domain = new URL(externalTranscriptData.sourceUrl).hostname;
			new Notice(`External transcript from ${domain} inserted!`);
		} catch (error) {
			// Error already logged in helper function
		}
	};

	// Handle URL selection for external transcript scraping
	const handleUrlSelection = async (selectedUrl: string) => {
		setShowUrlModal(false);
		
		// Validate API keys
		if (!plugin.settings.webscrapingApiKey) {
			new Notice('Please configure WebScraping.AI API key in settings');
			return;
		}

		// Get external transcript provider settings
		const externalProvider = plugin.settings.externalTranscriptProvider || 'openai';
		const externalModel = plugin.settings.externalTranscriptProviderModel || 'gpt-4o-mini';

		// Validate provider configuration
		const isProviderConfigured = plugin.getLLMSummarizer().isProviderConfigured(externalProvider);
		if (!isProviderConfigured) {
			new Notice(`Please configure ${externalProvider} API key in settings for external transcript processing`);
			return;
		}

		const loadingNotice = new Notice('Scraping external transcript...', 0);

		try {
			// Use the new provider-aware function
			const providerManager = plugin.getLLMSummarizer().getProviderManager();
			const result = await scrapeSelectedUrlWithProvider(
				selectedUrl,
				plugin.settings.webscrapingApiKey,
				providerManager,
				externalProvider,
				externalModel
			);

			loadingNotice.hide();

			if (result) {
				setExternalTranscriptData(result);
				
				// Auto-inject the transcript immediately
				await insertExternalTranscriptWithData(result);
				
				new Notice('External transcript automatically inserted into note!');
			} else {
				new Notice('No transcript found on the selected webpage');
			}

		} catch (error) {
			loadingNotice.hide();
			console.error('Error scraping external transcript:', error);
			new Notice('Error scraping external transcript. Please try again.');
		}
	};

	if (!videoId) {
		return (
			<div className="media-summarizer-placeholder">
				<div className="media-summarizer-placeholder-icon">📺</div>
				<p className="media-summarizer-placeholder-text">Invalid YouTube URL format</p>
			</div>
		);
	}

	return (
		<div className="media-summarizer-player-container">
			<YouTube
				ref={ytRef}
				videoId={videoId}
				opts={{
					height: '315',
					width: '100%',
					playerVars: {
						playsinline: 1,
						controls: 1,
						modestbranding: 1,
						rel: 0
					}
				}}
				onReady={handleReady}
			/>
			
			{isReady && (() => {
				// Check AI provider configuration
				const currentProvider = plugin.settings.currentProvider;
				let hasAIProvider = false;
				
				if (currentProvider) {
					const providerConfig = plugin.settings.providers[currentProvider];
					if (currentProvider === 'ollama') {
						hasAIProvider = !!(providerConfig as any).baseUrl && !!(providerConfig as any).model;
					} else {
						hasAIProvider = !!(providerConfig as any).apiKey;
					}
				}

				// Check external transcript capabilities
				const hasExternalCapability = plugin.settings.youtubeApiKey && plugin.settings.webscrapingApiKey;

				return (
					<div className="media-summarizer-controls">
						{/* Primary Actions */}
						<div className="control-group">
							<div className="control-group-header">Quick Actions</div>
							<div className="control-group-buttons">
								<button 
									className="control-btn control-btn-primary"
									onClick={insertTimestamp}
									title="Insert current video timestamp at cursor position"
									aria-label="Insert timestamp"
								>
									<span className="control-btn-icon">⏱️</span>
									<span className="control-btn-text">Insert Timestamp</span>
								</button>
							</div>
						</div>

						{/* Smart Analysis */}
						{plugin.settings.enableSummarization && (
							<div className="control-group">
								<div className="control-group-header">Smart Analysis</div>
								<div className="control-group-buttons">
									<button 
										className={`control-btn ${hasAIProvider ? 'control-btn-ai' : 'control-btn-disabled'}`}
										onClick={hasAIProvider ? generateSummary : undefined}
										disabled={!hasAIProvider}
										title={hasAIProvider ? 
											`Generate summary using ${currentProvider}` : 
											'Configure an AI provider in settings to enable summarization'
										}
										aria-label="Generate AI summary"
									>
										<span className="control-btn-icon">🤖</span>
										<span className="control-btn-text">Summarize</span>
									</button>
								</div>
							</div>
						)}

						{/* Transcripts */}
						<div className="control-group">
							<div className="control-group-header">Transcripts</div>
							<div className="control-group-buttons">
								{plugin.settings.enableEnhancedTranscript && (
									<button 
										className={`control-btn ${hasAIProvider ? 'control-btn-secondary' : 'control-btn-disabled'}`}
										onClick={hasAIProvider ? insertEnhancedTranscript : undefined}
										disabled={!hasAIProvider}
										title={hasAIProvider ? 
											`Get AI-enhanced transcript using ${currentProvider}` : 
											'Configure an AI provider in settings to enable enhanced transcripts'
										}
										aria-label="Insert enhanced transcript"
									>
										<span className="control-btn-icon">✨</span>
										<span className="control-btn-text">Enhanced</span>
									</button>
								)}
								<button 
									className="control-btn control-btn-secondary"
									onClick={insertRawTranscript}
									title="Insert YouTube's auto-generated transcript"
									aria-label="Insert raw transcript"
								>
									<span className="control-btn-icon">📄</span>
									<span className="control-btn-text">Raw</span>
								</button>
								
								{plugin.settings.enableExternalTranscriptDetection && (
									<button 
										className={`control-btn ${hasExternalCapability ? 'control-btn-secondary' : 'control-btn-disabled'}`}
										onClick={hasExternalCapability ? searchForExternalUrls : undefined}
										disabled={!hasExternalCapability}
										title={hasExternalCapability ? 
											'Search video description for external transcript links' : 
											'Configure YouTube API and WebScraping API keys in settings'
										}
										aria-label="Find external transcript"
									>
										<span className="control-btn-icon">🔍</span>
										<span className="control-btn-text">Find External</span>
									</button>
								)}

								{externalTranscriptData && (
									<button 
										className="control-btn control-btn-external"
										onClick={insertExternalTranscript}
										title={`Insert transcript from ${new URL(externalTranscriptData.sourceUrl).hostname}`}
										aria-label="Insert external transcript"
									>
										<span className="control-btn-icon">🌐</span>
										<span className="control-btn-text">External</span>
									</button>
								)}
							</div>
						</div>

						{/* Configuration Hint */}
						{!hasAIProvider && (
							<div className="control-hint">
								<span className="control-hint-icon">💡</span>
								<span className="control-hint-text">
									<a href="#" onClick={(e) => { e.preventDefault(); (plugin.app as any).setting?.open?.(); (plugin.app as any).setting?.openTabById?.('media-summarizer'); }}>
										Configure AI provider
									</a> for enhanced features
								</span>
							</div>
						)}
					</div>
				);
			})()}

			{/* URL Selection Modal */}
			{showUrlModal && foundUrls.length > 0 && (
				<div className="media-summarizer-modal-overlay">
					<div className="media-summarizer-modal">
						<h3>Select URL to Scrape for Transcript</h3>
						<p>Found {foundUrls.length} potential transcript URLs in the video description:</p>
						<div className="media-summarizer-url-list">
							{foundUrls.map((url, index) => (
								<div key={index} className="media-summarizer-url-item">
									<button
										className="media-summarizer-url-btn"
										onClick={() => handleUrlSelection(url)}
										title={url}
									>
										<span className="url-index">{index + 1}.</span>
										<span className="url-domain">{new URL(url).hostname}</span>
										<span className="url-path">{new URL(url).pathname.substring(0, 50)}...</span>
									</button>
								</div>
							))}
						</div>
						<div className="media-summarizer-modal-buttons">
							<button
								className="media-summarizer-btn"
								onClick={() => setShowUrlModal(false)}
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

/**
 * Custom ItemView for displaying YouTube videos with summarization controls
 */
export class MediaSummarizerView extends ItemView {
	plugin: MediaSummarizerPlugin;
	private root: Root | null = null;
	private currentVideoUrl: string = '';
	private ytRef: React.RefObject<YouTube> = React.createRef<YouTube>();

	constructor(leaf: WorkspaceLeaf, plugin: MediaSummarizerPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return MEDIA_SUMMARIZER_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Media Summarizer';
	}

	getIcon(): string {
		return 'play';
	}

	/**
	 * Get the YouTube player reference for timestamp click handling
	 */
	getYouTubePlayerRef(): React.RefObject<YouTube> {
		return this.ytRef;
	}

	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass('media-summarizer-view');

		const mainContainer = container.createEl('div', { cls: 'media-summarizer-container' });

		const header = mainContainer.createEl('div', { cls: 'media-summarizer-header' });
		header.createEl('h3', { text: 'Media Summarizer', cls: 'media-summarizer-title' });
		
		const instructions = header.createEl('div', { cls: 'media-summarizer-instructions' });
		instructions.createEl('p', { 
			text: 'Add a "media_url" field to your note\'s frontmatter with a YouTube URL to load the video here.' 
		});

		const reactContainer = mainContainer.createEl('div', { cls: 'media-summarizer-react-container' });
		this.root = createRoot(reactContainer);

		await this.loadVideoFromActiveNote();
	}

	async onClose(): Promise<void> {
		if (this.root) {
			this.root.unmount();
			this.root = null;
		}
	}

	async loadVideoFromActiveNote(): Promise<void> {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			this.showPlaceholder('No active note. Please open a note with a media_url in the frontmatter.');
			return;
		}

		try {
			const content = await this.app.vault.read(activeFile);
			const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
			const match = content.match(frontmatterRegex);

			if (!match) {
				this.showPlaceholder('No frontmatter found. Add "media_url: [YouTube URL]" to your note\'s frontmatter.');
				return;
			}

			const frontmatter = match[1];
			const mediaUrlMatch = frontmatter.match(/media_url:\s*(.+)/);

			if (!mediaUrlMatch) {
				this.showPlaceholder('No media_url found in frontmatter. Add "media_url: [YouTube URL]" to load a video.');
				return;
			}

			const mediaUrl = mediaUrlMatch[1].trim().replace(/['"]/g, '');
			
			// Only reload if URL changed
			if (mediaUrl !== this.currentVideoUrl) {
				this.currentVideoUrl = mediaUrl;
				await this.loadVideo(mediaUrl);
			}

		} catch (error) {
			console.error('Error loading video from frontmatter:', error);
			this.showPlaceholder('Error reading note frontmatter. Please check your note format.');
		}
	}

	private async loadVideo(url: string, savedState?: {
		currentTime: number;
		playbackRate: number;
		playerState: number;
	} | null): Promise<void> {
		if (!this.root) return;

		this.root.render(
			<MediaPlayer 
				mediaLink={url} 
				plugin={this.plugin}
				onReady={() => {
					// Restore playback state after video is ready
					if (savedState && this.ytRef.current) {
						setTimeout(() => {
							try {
								const player = this.ytRef.current?.getInternalPlayer();
								if (player && typeof player.seekTo === 'function') {
									// Restore playback position
									player.seekTo(savedState.currentTime, true);
									
									// Restore playback rate
									if (typeof player.setPlaybackRate === 'function') {
										player.setPlaybackRate(savedState.playbackRate);
									}
									
									// Restore play/pause state
									// PlayerState: 1 = playing, 2 = paused
									if (savedState.playerState === 1 && typeof player.playVideo === 'function') {
										player.playVideo();
									} else if (savedState.playerState === 2 && typeof player.pauseVideo === 'function') {
										player.pauseVideo();
									}
								}
							} catch (error) {
								console.log('Could not restore playback state:', error);
							}
						}, 500); // Small delay to ensure video is fully loaded
					}
				}}
				ytRef={this.ytRef}
			/>
		);
	}

	private showPlaceholder(message: string): void {
		if (!this.root) return;

		this.currentVideoUrl = '';
		
		this.root.render(
			<div className="media-summarizer-placeholder">
				<div className="media-summarizer-placeholder-icon">📺</div>
				<p className="media-summarizer-placeholder-text">{message}</p>
				<div className="media-summarizer-example">
					<strong>Example frontmatter:</strong>
					<pre><code>---
media_url: https://www.youtube.com/watch?v=dQw4w9WgXcQ
---</code></pre>
				</div>
			</div>
		);
	}

	async refresh(): Promise<void> {
		await this.smartLoadVideoFromActiveNote();
	}

	/**
	 * Refresh the view to reflect settings changes while preserving video playback state
	 */
	async refreshView(): Promise<void> {
		if (!this.root || !this.currentVideoUrl) {
			return;
		}

		// Save current playback state if video is loaded
		let savedState: {
			currentTime: number;
			playbackRate: number;
			playerState: number;
		} | null = null;

		try {
			if (this.ytRef.current) {
				const player = this.ytRef.current.getInternalPlayer();
				if (player && typeof player.getCurrentTime === 'function') {
					savedState = {
						currentTime: player.getCurrentTime(),
						playbackRate: player.getPlaybackRate(),
						playerState: player.getPlayerState()
					};
				}
			}
		} catch (error) {
			console.log('Could not save playback state:', error);
		}

		// Re-render the React component with updated settings
		await this.loadVideo(this.currentVideoUrl, savedState);
	}

	private async smartLoadVideoFromActiveNote(): Promise<void> {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			if (this.currentVideoUrl) {
				this.showPlaceholder('No active note. Please open a note with a media_url in the frontmatter.');
			}
			return;
		}

		try {
			const content = await this.app.vault.read(activeFile);
			const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
			const match = content.match(frontmatterRegex);

			if (!match) {
				if (this.currentVideoUrl) {
					this.showPlaceholder('No frontmatter found. Add "media_url: [YouTube URL]" to your note\'s frontmatter.');
				}
				return;
			}

			const frontmatter = match[1];
			const mediaUrlMatch = frontmatter.match(/media_url:\s*(.+)/);

			if (!mediaUrlMatch) {
				if (this.currentVideoUrl) {
					this.showPlaceholder('No media_url found in frontmatter. Add "media_url: [YouTube URL]" to load a video.');
				}
				return;
			}

			const mediaUrl = mediaUrlMatch[1].trim().replace(/['"]/g, '');
			
			if (mediaUrl !== this.currentVideoUrl) {
				this.currentVideoUrl = mediaUrl;
				await this.loadVideo(mediaUrl);
			}

		} catch (error) {
			console.error('Error loading video from frontmatter:', error);
			if (this.currentVideoUrl) {
				this.showPlaceholder('Error reading note frontmatter. Please check your note format.');
			}
		}
	}

}