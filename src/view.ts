import { ItemView, WorkspaceLeaf, Notice, MarkdownView } from 'obsidian';
import MediaSummarizerPlugin from './main';
import { getTranscript, summarize } from './summarizer';

/**
 * Unique identifier for the Media Summarizer view type
 */
export const MEDIA_SUMMARIZER_VIEW_TYPE = 'media-summarizer-view';

/**
 * Custom ItemView for displaying YouTube videos with summarization controls
 */
export class MediaSummarizerView extends ItemView {
	plugin: MediaSummarizerPlugin;
	private videoContainer: HTMLElement;
	private iframe: HTMLIFrameElement;
	private controlsContainer: HTMLElement;
	private currentVideoUrl: string = '';
	private currentVideoId: string = '';
	private iframeId: string;
	private youTubePlayer: any = null; // YouTube Player instance
	private isYouTubeAPIReady: boolean = false;

	constructor(leaf: WorkspaceLeaf, plugin: MediaSummarizerPlugin) {
		super(leaf);
		this.plugin = plugin;
		// Generate unique iframe ID for this view instance
		this.iframeId = `media-summarizer-iframe-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
	}

	/**
	 * Get the view type identifier
	 */
	getViewType(): string {
		return MEDIA_SUMMARIZER_VIEW_TYPE;
	}

	/**
	 * Get the display text for the view
	 */
	getDisplayText(): string {
		return 'Media Summarizer';
	}

	/**
	 * Get the icon for the view tab
	 */
	getIcon(): string {
		return 'play';
	}

	/**
	 * Initialize the view when it opens
	 */
	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass('media-summarizer-view');

		// Create the main container
		const mainContainer = container.createEl('div', { cls: 'media-summarizer-container' });

		// Create header with title and instructions
		const header = mainContainer.createEl('div', { cls: 'media-summarizer-header' });
		header.createEl('h3', { text: 'Media Summarizer', cls: 'media-summarizer-title' });
		
		const instructions = header.createEl('div', { cls: 'media-summarizer-instructions' });
		instructions.createEl('p', { 
			text: 'Add a "media_url" field to your note\'s frontmatter with a YouTube URL to load the video here.' 
		});

		// Create video container
		this.videoContainer = mainContainer.createEl('div', { cls: 'media-summarizer-video-container' });
		
		// Create controls container
		this.controlsContainer = mainContainer.createEl('div', { cls: 'media-summarizer-controls' });

		// Initialize the view
		await this.loadVideoFromActiveNote();
	}

	/**
	 * Clean up when the view closes
	 */
	async onClose(): Promise<void> {
		// Destroy YouTube player to prevent memory leaks
		if (this.youTubePlayer && typeof this.youTubePlayer.destroy === 'function') {
			try {
				this.youTubePlayer.destroy();
			} catch (error) {
				console.warn('Error destroying YouTube player:', error);
			}
		}
		this.youTubePlayer = null;
	}

	/**
	 * Load video from the active note's frontmatter
	 */
	async loadVideoFromActiveNote(): Promise<void> {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			this.showPlaceholder('No active note. Please open a note with a media_url in the frontmatter.');
			return;
		}

		try {
			// Read the file content to parse frontmatter
			const content = await this.app.vault.read(activeFile);
			const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
			const match = content.match(frontmatterRegex);

			if (!match) {
				this.showPlaceholder('No frontmatter found. Add "media_url: [YouTube URL]" to your note\'s frontmatter.');
				return;
			}

			// Parse YAML frontmatter (simple parsing for media_url)
			const frontmatter = match[1];
			const mediaUrlMatch = frontmatter.match(/media_url:\s*(.+)/);

			if (!mediaUrlMatch) {
				this.showPlaceholder('No media_url found in frontmatter. Add "media_url: [YouTube URL]" to load a video.');
				return;
			}

			const mediaUrl = mediaUrlMatch[1].trim().replace(/['"]/g, ''); // Remove quotes if present
			await this.loadVideo(mediaUrl);

		} catch (error) {
			console.error('Error loading video from frontmatter:', error);
			this.showPlaceholder('Error reading note frontmatter. Please check your note format.');
		}
	}

	/**
	 * Load a YouTube video in the player
	 */
	async loadVideo(url: string): Promise<void> {
		try {
			// Extract video ID from URL
			const videoId = this.extractVideoId(url);
			if (!videoId) {
				this.showPlaceholder('Invalid YouTube URL format. Please provide a valid YouTube video URL.');
				return;
			}

			this.currentVideoUrl = url;
			this.currentVideoId = videoId;

			// Clear the video container
			this.videoContainer.empty();

			// Load YouTube API and create player
			await this.loadYouTubeAPI();
			await this.createYouTubePlayer(videoId);

			// Create control buttons
			this.createControls();

		} catch (error) {
			console.error('Error loading video:', error);
			this.showPlaceholder('Error loading video. Please check the URL and try again.');
		}
	}

	/**
	 * Extract YouTube video ID from various URL formats
	 */
	private extractVideoId(url: string): string | null {
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
	}

	/**
	 * Load YouTube IFrame Player API
	 */
	private async loadYouTubeAPI(): Promise<void> {
		return new Promise((resolve) => {
			// Check if API is already loaded
			if ((window as any).YT && (window as any).YT.Player) {
				this.isYouTubeAPIReady = true;
				resolve();
				return;
			}

			// Check if script is already loading
			if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
				// Wait for API to be ready
				const checkAPI = () => {
					if ((window as any).YT && (window as any).YT.Player) {
						this.isYouTubeAPIReady = true;
						resolve();
					} else {
						setTimeout(checkAPI, 100);
					}
				};
				checkAPI();
				return;
			}

			// Load the API script
			const script = document.createElement('script');
			script.src = 'https://www.youtube.com/iframe_api';
			script.async = true;
			
			// Set up global callback for when API is ready
			(window as any).onYouTubeIframeAPIReady = () => {
				this.isYouTubeAPIReady = true;
				resolve();
			};

			document.head.appendChild(script);
		});
	}

	/**
	 * Create YouTube Player instance
	 */
	private async createYouTubePlayer(videoId: string): Promise<void> {
		// Create player container div
		this.videoContainer.createEl('div', {
			attr: { id: this.iframeId },
			cls: 'media-summarizer-iframe'
		});

		// Wait for API to be ready
		if (!this.isYouTubeAPIReady) {
			await this.loadYouTubeAPI();
		}

		// Create the YouTube player
		this.youTubePlayer = new (window as any).YT.Player(this.iframeId, {
			height: '315',
			width: '100%',
			videoId: videoId,
			playerVars: {
				'playsinline': 1,
				'controls': 1,
				'modestbranding': 1,
				'rel': 0
			},
			events: {
				'onReady': () => {
					console.log('YouTube player ready');
				},
				'onStateChange': () => {
					// Handle state changes if needed
				}
			}
		});
	}

	/**
	 * Get current time from the YouTube player
	 */
	private async getCurrentTime(): Promise<number> {
		try {
			// Use direct YouTube Player API if available
			if (this.youTubePlayer && typeof this.youTubePlayer.getCurrentTime === 'function') {
				const currentTime = this.youTubePlayer.getCurrentTime();
				return typeof currentTime === 'number' ? currentTime : 0;
			}

			// Fallback: if no player instance, return 0
			console.warn('YouTube player not available for getCurrentTime');
			return 0;

		} catch (error) {
			console.error('Error getting current time from YouTube player:', error);
			return 0;
		}
	}


	/**
	 * Create control buttons for the video player
	 */
	private createControls(): void {
		this.controlsContainer.empty();

		// Timestamp button
		const timestampBtn = this.controlsContainer.createEl('button', {
			text: '🕒 Timestamp',
			cls: 'media-summarizer-btn media-summarizer-timestamp-btn'
		});
		timestampBtn.onclick = () => this.insertTimestamp();

		// Summarize button
		const summarizeBtn = this.controlsContainer.createEl('button', {
			text: '📝 Summarize',
			cls: 'media-summarizer-btn media-summarizer-summarize-btn'
		});
		summarizeBtn.onclick = () => this.generateSummary();

		// Refresh button to reload video from frontmatter
		const refreshBtn = this.controlsContainer.createEl('button', {
			text: '🔄 Refresh',
			cls: 'media-summarizer-btn media-summarizer-refresh-btn'
		});
		refreshBtn.onclick = () => this.loadVideoFromActiveNote();
	}

	/**
	 * Insert a timestamp into the active editor
	 */
	private async insertTimestamp(): Promise<void> {
		try {
			// Get the active file and find its editor more robustly
			const activeFile = this.app.workspace.getActiveFile();
			if (!activeFile) {
				new Notice('No active note found. Please open a note first.');
				return;
			}

			// Find the markdown view for the active file
			let activeView: MarkdownView | null = null;
			
			// First try to get the currently active view if it's a MarkdownView
			const currentActiveView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (currentActiveView && currentActiveView.file?.path === activeFile.path) {
				activeView = currentActiveView;
			} else {
				// If the active view isn't the right markdown view, find it among all leaves
				const leaves = this.app.workspace.getLeavesOfType('markdown');
				for (const leaf of leaves) {
					const view = leaf.view as MarkdownView;
					if (view.file?.path === activeFile.path) {
						activeView = view;
						// Activate this leaf to make it the active view
						this.app.workspace.setActiveLeaf(leaf, { focus: true });
						break;
					}
				}
			}

			if (!activeView) {
				new Notice('Cannot find editor for the active note. Please ensure you have a note open.');
				return;
			}

			// Get the current time from the YouTube player
			let currentTime = 0;
			try {
				currentTime = await this.getCurrentTime();
			} catch (error) {
				console.warn('Could not get current video time, using 00:00:', error);
				// Fall back to 0 if we can't get the time
			}

			const timestamp = this.formatTimestamp(currentTime);
			
			// Insert the timestamp at the cursor position
			const editor = activeView.editor;
			const cursor = editor.getCursor();
			editor.replaceRange(`[${timestamp}] `, cursor);

			new Notice(`Timestamp inserted: ${timestamp}`);

		} catch (error) {
			console.error('Error inserting timestamp:', error);
			new Notice('Error inserting timestamp');
		}
	}

	/**
	 * Format seconds into HH:MM:SS format
	 */
	private formatTimestamp(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = Math.floor(seconds % 60);

		if (hours > 0) {
			return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
		} else {
			return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
		}
	}

	/**
	 * Generate and insert a summary of the video
	 */
	private async generateSummary(): Promise<void> {
		if (!this.currentVideoUrl) {
			new Notice('No video loaded');
			return;
		}

		// Check if API key is configured
		if (!this.plugin.settings.openaiApiKey) {
			new Notice('OpenAI API key not configured. Please set it in plugin settings.');
			return;
		}

		// Get the active file and find its editor more robustly
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice('No active note found. Please open a note first.');
			return;
		}

		// Find the markdown view for the active file
		let activeView: MarkdownView | null = null;
		
		// First try to get the currently active view if it's a MarkdownView
		const currentActiveView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (currentActiveView && currentActiveView.file?.path === activeFile.path) {
			activeView = currentActiveView;
		} else {
			// If the active view isn't the right markdown view, find it among all leaves
			const leaves = this.app.workspace.getLeavesOfType('markdown');
			for (const leaf of leaves) {
				const view = leaf.view as MarkdownView;
				if (view.file?.path === activeFile.path) {
					activeView = view;
					// Activate this leaf to make it the active view
					this.app.workspace.setActiveLeaf(leaf, { focus: true });
					break;
				}
			}
		}

		if (!activeView) {
			new Notice('Cannot find editor for the active note. Please ensure you have a note open.');
			return;
		}

		try {
			// Show loading notice
			const loadingNotice = new Notice('Fetching transcript and generating summary...', 0);

			// Fetch transcript
			const transcript = await getTranscript(this.currentVideoUrl);
			
			// Check if transcript fetch failed
			if (transcript.startsWith('Error:')) {
				loadingNotice.hide();
				new Notice(transcript);
				return;
			}

			// Generate summary
			const summary = await summarize(transcript, this.plugin.settings.openaiApiKey);
			
			// Hide loading notice
			loadingNotice.hide();

			// Check if summarization failed
			if (summary.startsWith('Error:')) {
				new Notice(summary);
				return;
			}

			// Insert summary into the note
			const editor = activeView.editor;
			
			// Go to the end of the document
			const lastLine = editor.lastLine();
			const lastLineLength = editor.getLine(lastLine).length;
			editor.setCursor(lastLine, lastLineLength);

			// Add some spacing and the summary
			const summaryText = `\n\n## Summary\n\n${summary}\n`;
			editor.replaceRange(summaryText, editor.getCursor());

			// Show success notice
			new Notice('Summary generated and inserted!');

			// Optionally scroll to the inserted summary
			const newLastLine = editor.lastLine();
			editor.scrollIntoView({ from: { line: newLastLine - 5, ch: 0 }, to: { line: newLastLine, ch: 0 } });

		} catch (error) {
			console.error('Error generating summary:', error);
			new Notice('Error generating summary. Please try again.');
		}
	}

	/**
	 * Show placeholder content when no video is loaded
	 */
	private showPlaceholder(message: string): void {
		this.videoContainer.empty();
		this.controlsContainer.empty();

		const placeholder = this.videoContainer.createEl('div', { cls: 'media-summarizer-placeholder' });
		placeholder.createEl('div', { cls: 'media-summarizer-placeholder-icon', text: '📺' });
		placeholder.createEl('p', { cls: 'media-summarizer-placeholder-text', text: message });

		// Add example frontmatter
		const example = placeholder.createEl('div', { cls: 'media-summarizer-example' });
		example.createEl('strong', { text: 'Example frontmatter:' });
		const codeBlock = example.createEl('pre');
		codeBlock.createEl('code', { text: '---\nmedia_url: https://www.youtube.com/watch?v=dQw4w9WgXcQ\n---' });
	}

	/**
	 * Refresh the view when the active file changes
	 * Only reloads video if the URL has actually changed
	 */
	async refresh(): Promise<void> {
		await this.smartLoadVideoFromActiveNote();
	}

	/**
	 * Load video from active note, but only if the URL has changed
	 */
	private async smartLoadVideoFromActiveNote(): Promise<void> {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			// Only clear video if we currently have one loaded
			if (this.currentVideoUrl) {
				this.showPlaceholder('No active note. Please open a note with a media_url in the frontmatter.');
				this.currentVideoUrl = '';
			}
			return;
		}

		try {
			// Read the file content to parse frontmatter
			const content = await this.app.vault.read(activeFile);
			const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
			const match = content.match(frontmatterRegex);

			if (!match) {
				// Only show placeholder if we currently have a video loaded
				if (this.currentVideoUrl) {
					this.showPlaceholder('No frontmatter found. Add "media_url: [YouTube URL]" to your note\'s frontmatter.');
					this.currentVideoUrl = '';
				}
				return;
			}

			// Parse YAML frontmatter (simple parsing for media_url)
			const frontmatter = match[1];
			const mediaUrlMatch = frontmatter.match(/media_url:\s*(.+)/);

			if (!mediaUrlMatch) {
				// Only show placeholder if we currently have a video loaded
				if (this.currentVideoUrl) {
					this.showPlaceholder('No media_url found in frontmatter. Add "media_url: [YouTube URL]" to load a video.');
					this.currentVideoUrl = '';
				}
				return;
			}

			const mediaUrl = mediaUrlMatch[1].trim().replace(/['"]/g, ''); // Remove quotes if present
			
			// Only reload video if the URL has actually changed
			if (mediaUrl !== this.currentVideoUrl) {
				await this.loadVideo(mediaUrl);
			}

		} catch (error) {
			console.error('Error loading video from frontmatter:', error);
			// Only show error if we currently have a video loaded
			if (this.currentVideoUrl) {
				this.showPlaceholder('Error reading note frontmatter. Please check your note format.');
				this.currentVideoUrl = '';
			}
		}
	}
}