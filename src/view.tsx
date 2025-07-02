import { ItemView, WorkspaceLeaf, Notice, MarkdownView } from 'obsidian';
import { createRoot, Root } from 'react-dom/client';
import * as React from 'react';
import YouTube from 'react-youtube';
import MediaSummarizerPlugin from './main';
import { getTranscript, getTranscriptLines, getYouTubeMetadata, enhanceTranscript, summarize, formatRawTranscriptWithTimestamps } from './summarizer';
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

	const videoId = getVideoId(mediaLink);

	const handleReady = () => {
		setIsReady(true);
		onReady();
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

			const summary = await summarize(transcript, plugin.settings.openaiApiKey, plugin.settings.aiModel);
			
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

			if (plugin.settings.enhancedTranscriptFormatting) {
				// Enhanced formatting enabled - get transcript lines and metadata
				loadingNotice.hide();
				loadingNotice = new Notice('Getting transcript with timestamps...', 0);

				try {
					// Get raw transcript lines with timing data
					const transcriptLines = await getTranscriptLines(mediaLink);
					
					loadingNotice.hide();
					loadingNotice = new Notice('Getting video metadata...', 0);

					// Get video metadata
					const metadata = await getYouTubeMetadata(mediaLink);
					
					loadingNotice.hide();
					loadingNotice = new Notice('Enhancing transcript with AI...', 0);

					// Enhance transcript with AI using timestamp data
					const enhancedTranscript = await enhanceTranscript(transcriptLines, metadata, plugin.settings.openaiApiKey, plugin.settings.aiModel);
					
					if (enhancedTranscript.startsWith('Error:')) {
						loadingNotice.hide();
						new Notice(`${enhancedTranscript} Falling back to raw transcript.`);
						// Fall back to raw transcript
						finalTranscript = rawTranscript;
					} else {
						finalTranscript = enhancedTranscript;
					}
				} catch (error) {
					loadingNotice.hide();
					new Notice(`Error getting transcript with timestamps. Falling back to raw transcript.`);
					console.error('Error getting transcript lines:', error);
					// Fall back to raw transcript
					finalTranscript = rawTranscript;
				}
			} else {
				// Enhanced formatting disabled - use raw transcript
				finalTranscript = rawTranscript;
			}

			loadingNotice.hide();

			// Insert transcript under ## Transcript heading
			const transcriptText = `\n\n## Enhanced Transcript\n\n${finalTranscript}\n`;
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
					
					// Insert formatted transcript under ## Raw Transcript heading
					const transcriptText = `\n\n## Raw Transcript\n\n${formattedTranscript}\n`;
					editor.replaceRange(transcriptText, editor.getCursor());

					new Notice('Raw transcript with timestamps inserted!');

					// Scroll to show the transcript
					const newLastLine = editor.lastLine();
					editor.scrollIntoView({ from: { line: newLastLine - 10, ch: 0 }, to: { line: newLastLine, ch: 0 } });
					
					return;
				}
			} catch (linesError) {
				console.log('Failed to get transcript lines, falling back to plain text:', linesError.message);
			}

			// Fallback to plain text transcript if timing data fails
			const rawTranscript = await getTranscript(mediaLink);
			
			loadingNotice.hide();

			if (rawTranscript.startsWith('Error:')) {
				new Notice(rawTranscript);
				return;
			}

			// Insert plain text transcript under ## Raw Transcript heading
			const transcriptText = `\n\n## Raw Transcript\n\n${rawTranscript}\n`;
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
			
			{isReady && (
				<div className="media-summarizer-controls">
					<button 
						className="media-summarizer-btn media-summarizer-timestamp-btn"
						onClick={insertTimestamp}
					>
						🕒 Timestamp
					</button>
					<button 
						className="media-summarizer-btn media-summarizer-summarize-btn"
						onClick={generateSummary}
					>
						📝 Summarize
					</button>
					<button 
						className="media-summarizer-btn media-summarizer-transcript-btn"
						onClick={insertEnhancedTranscript}
					>
						📄 Enhanced Transcript
					</button>
					<button 
						className="media-summarizer-btn media-summarizer-raw-transcript-btn"
						onClick={insertRawTranscript}
					>
						📄 Raw Transcript
					</button>
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

	private async loadVideo(url: string): Promise<void> {
		if (!this.root) return;

		this.root.render(
			<MediaPlayer 
				mediaLink={url} 
				plugin={this.plugin}
				onReady={() => console.log('Video player ready')}
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