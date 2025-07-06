import { Plugin, WorkspaceLeaf, Notice, MarkdownView } from 'obsidian';
import { MediaSummarizerView, MEDIA_SUMMARIZER_VIEW_TYPE } from './view';
import { MediaSummarizerSettingTab, MediaSummarizerSettings, DEFAULT_SETTINGS } from './settings';
import { createTimestampClickHandlerPlugin, convertTimestampToSeconds } from './timestamp-click-handler';
import { LLMSummarizer } from './llm-summarizer';
import { ProviderManagerSettings } from './providers/provider-manager';

/**
 * Main plugin class for Media Summarizer
 * Handles plugin lifecycle, settings management, and view registration
 */
export default class MediaSummarizerPlugin extends Plugin {
	settings: MediaSummarizerSettings;
	private lastActiveFilePath: string | null = null;
	private llmSummarizer: LLMSummarizer;

	/**
	 * Handle timestamp clicks - jump to specific time in video
	 */
	handleTimestampClick = (timestamp: string): boolean | undefined => {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) return;

		// Get the Media Summarizer view that contains the video player
		const leaves = this.app.workspace.getLeavesOfType(MEDIA_SUMMARIZER_VIEW_TYPE);
		if (leaves.length === 0) return;

		const mediaSummarizerView = leaves[0].view as MediaSummarizerView;
		if (!mediaSummarizerView) return;

		// Get the YouTube player reference from the view
		const ytRef = mediaSummarizerView.getYouTubePlayerRef();
		if (!ytRef || !ytRef.current) return;

		// Convert timestamp to seconds and seek to that position
		const seconds = convertTimestampToSeconds(timestamp);
		ytRef.current.getInternalPlayer()?.seekTo(seconds, true);

		return true;
	};

	/**
	 * Plugin initialization
	 */
	async onload(): Promise<void> {

		// Register CodeMirror extension for timestamp clicks
		this.registerEditorExtension([
			createTimestampClickHandlerPlugin(this.handleTimestampClick),
		]);

		// Load settings
		await this.loadSettings();

		// Initialize LLM summarizer with current settings
		this.initializeLLMSummarizer();

		// Register the custom view
		this.registerView(
			MEDIA_SUMMARIZER_VIEW_TYPE,
			(leaf) => new MediaSummarizerView(leaf, this)
		);

		// Add settings tab
		this.addSettingTab(new MediaSummarizerSettingTab(this.app, this));

		// Add ribbon icon to activate the view
		this.addRibbonIcon('play', 'Open Media Summarizer', () => {
			this.activateView();
		});

		// Add command to open the view
		this.addCommand({
			id: 'open-media-summarizer',
			name: 'Open Media Summarizer',
			callback: () => {
				this.activateView();
			}
		});

		// Add command to refresh the view (useful when switching between notes)
		this.addCommand({
			id: 'refresh-media-summarizer',
			name: 'Refresh Media Summarizer',
			callback: () => {
				this.refreshView();
			}
		});

		// Keyboard Shortcut Commands for Video Control
		this.addVideoControlCommands();

		// Listen for active file changes to refresh the view
		// Only refresh when switching to a different file, not just changing focus
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => {
				// Small delay to ensure the new file is fully loaded
				setTimeout(() => {
					// Only refresh if the active file has actually changed
					const currentActiveFile = this.app.workspace.getActiveFile();
					if (currentActiveFile && this.lastActiveFilePath !== currentActiveFile.path) {
						this.lastActiveFilePath = currentActiveFile.path;
						this.refreshView();
					}
				}, 100);
			})
		);

		// Listen for file changes to refresh the view when frontmatter is updated
		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				// Only refresh if the modified file is the currently active file
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile && file.path === activeFile.path) {
					setTimeout(() => {
						this.refreshView();
					}, 100);
				}
			})
		);
	}

	/**
	 * Plugin cleanup
	 */
	onunload(): void {
		// Cleanup is handled automatically by Obsidian for registered views and events
	}

	/**
	 * Add all video control commands for keyboard shortcuts
	 */
	private addVideoControlCommands(): void {
		// 1. Insert Timestamp (⌃I)
		this.addCommand({
			id: 'insert-timestamp',
			name: 'Insert Timestamp',
			editorCallback: async (editor, view) => {
				await this.insertTimestampCommand(editor, view);
			}
		});

		// 2. Play/Pause (⌃K)
		this.addCommand({
			id: 'toggle-play-pause',
			name: 'Play/Pause',
			editorCallback: async (editor, view) => {
				await this.togglePlayPauseCommand();
			}
		});

		// 3. Fast Forward (⌃L)
		this.addCommand({
			id: 'seek-forward',
			name: 'Fast Forward',
			editorCallback: async (editor, view) => {
				await this.seekForwardCommand();
			}
		});

		// 4. Rewind (⌃J)
		this.addCommand({
			id: 'seek-backward',
			name: 'Rewind',
			editorCallback: async (editor, view) => {
				await this.seekBackwardCommand();
			}
		});

		// 5. Speed Up (Shift + >)
		this.addCommand({
			id: 'speed-up',
			name: 'Speed Up',
			editorCallback: async (editor, view) => {
				await this.speedUpCommand();
			}
		});

		// 6. Speed Down (Shift + <)
		this.addCommand({
			id: 'speed-down',
			name: 'Speed Down',
			editorCallback: async (editor, view) => {
				await this.speedDownCommand();
			}
		});

		// 7. Mute/Unmute (M)
		this.addCommand({
			id: 'toggle-mute',
			name: 'Mute/Unmute',
			editorCallback: async (editor, view) => {
				await this.toggleMuteCommand();
			}
		});

		// 8. Show Help (?)
		this.addCommand({
			id: 'show-shortcuts-help',
			name: 'Show Keyboard Shortcuts',
			editorCallback: async (editor, view) => {
				this.showShortcutsHelp();
			}
		});
	}

	/**
	 * Get the active YouTube player from MediaSummarizerView
	 */
	private getActiveYouTubePlayer() {
		const leaves = this.app.workspace.getLeavesOfType(MEDIA_SUMMARIZER_VIEW_TYPE);
		if (leaves.length === 0) return null;

		const mediaSummarizerView = leaves[0].view as MediaSummarizerView;
		if (!mediaSummarizerView) return null;

		const ytRef = mediaSummarizerView.getYouTubePlayerRef();
		if (!ytRef || !ytRef.current) return null;

		return ytRef.current;
	}

	/**
	 * Show visual feedback notification
	 */
	private showFeedback(message: string): void {
		new Notice(message, 2000);
	}

	/**
	 * Show keyboard shortcuts help overlay
	 */
	private showShortcutsHelp(): void {
		const helpText = `Media Summarizer Keyboard Shortcuts:

⌃I - Insert Timestamp
⌃K - Play/Pause
⌃J - Rewind
⌃L - Fast Forward
Shift + > - Speed Up
Shift + < - Speed Down
M - Mute/Unmute

Settings: Configure seek distance and timestamp behavior in plugin settings.
Note: Set these shortcuts in Obsidian's Hotkey settings.`;

		new Notice(helpText, 8000);
	}

	/**
	 * Command implementations
	 */
	private async insertTimestampCommand(editor: any, view: any): Promise<void> {
		const player = this.getActiveYouTubePlayer();
		if (!player) {
			this.showFeedback('No video player found. Open a media note first.');
			return;
		}

		try {
			const timestamp = await player.internalPlayer?.getCurrentTime();
			if (!timestamp) {
				this.showFeedback('Could not get current video time');
				return;
			}

			const offsetTimestamp = Math.max(0, timestamp - this.settings.timestampOffsetSeconds);
			const formattedTimestamp = this.formatTimestamp(offsetTimestamp);
			
			editor.replaceSelection(`[${formattedTimestamp}]() `);
			
			// Rewind video playback by playbackOffsetSeconds
			if (this.settings.playbackOffsetSeconds > 0) {
				const newPlaybackTime = Math.max(0, timestamp - this.settings.playbackOffsetSeconds);
				await player.getInternalPlayer()?.seekTo(newPlaybackTime, true);
			}
			
			if (this.settings.pauseOnTimestampInsert) {
				await player.getInternalPlayer()?.pauseVideo();
			}

			this.showFeedback(`Timestamp inserted: ${formattedTimestamp}`);
		} catch (error) {
			console.error('Error inserting timestamp:', error);
			this.showFeedback('Error inserting timestamp');
		}
	}

	private async togglePlayPauseCommand(): Promise<void> {
		const player = this.getActiveYouTubePlayer();
		if (!player) {
			this.showFeedback('No video player found');
			return;
		}

		try {
			const playerState = await player.internalPlayer?.getPlayerState();
			if (playerState === 1) { // Playing
				await player.getInternalPlayer()?.pauseVideo();
				this.showFeedback('Video paused');
			} else {
				await player.getInternalPlayer()?.playVideo();
				this.showFeedback('Video playing');
			}
		} catch (error) {
			console.error('Error toggling play/pause:', error);
			this.showFeedback('Error controlling playback');
		}
	}

	private async seekForwardCommand(): Promise<void> {
		const player = this.getActiveYouTubePlayer();
		if (!player) {
			this.showFeedback('No video player found');
			return;
		}

		try {
			const currentTime = await player.internalPlayer?.getCurrentTime();
			if (currentTime !== undefined) {
				const newTime = currentTime + this.settings.seekSeconds;
				await player.getInternalPlayer()?.seekTo(newTime, true);
				this.showFeedback(`Jumped forward ${this.settings.seekSeconds}s`);
			}
		} catch (error) {
			console.error('Error seeking forward:', error);
			this.showFeedback('Error seeking forward');
		}
	}

	private async seekBackwardCommand(): Promise<void> {
		const player = this.getActiveYouTubePlayer();
		if (!player) {
			this.showFeedback('No video player found');
			return;
		}

		try {
			const currentTime = await player.internalPlayer?.getCurrentTime();
			if (currentTime !== undefined) {
				const newTime = Math.max(0, currentTime - this.settings.seekSeconds);
				await player.getInternalPlayer()?.seekTo(newTime, true);
				this.showFeedback(`Jumped backward ${this.settings.seekSeconds}s`);
			}
		} catch (error) {
			console.error('Error seeking backward:', error);
			this.showFeedback('Error seeking backward');
		}
	}

	private async speedUpCommand(): Promise<void> {
		const player = this.getActiveYouTubePlayer();
		if (!player) {
			this.showFeedback('No video player found');
			return;
		}

		try {
			const internalPlayer = player.getInternalPlayer();
			if (!internalPlayer) return;

			const playbackRates = await internalPlayer.getAvailablePlaybackRates();
			const currentRate = await internalPlayer.getPlaybackRate();
			const currentIndex = playbackRates.indexOf(currentRate);
			const nextIndex = Math.min(currentIndex + 1, playbackRates.length - 1);
			const nextRate = playbackRates[nextIndex];

			await internalPlayer.setPlaybackRate(nextRate);
			this.showFeedback(`Speed: ${nextRate}x`);
		} catch (error) {
			console.error('Error changing speed:', error);
			this.showFeedback('Error changing speed');
		}
	}

	private async speedDownCommand(): Promise<void> {
		const player = this.getActiveYouTubePlayer();
		if (!player) {
			this.showFeedback('No video player found');
			return;
		}

		try {
			const internalPlayer = player.getInternalPlayer();
			if (!internalPlayer) return;

			const playbackRates = await internalPlayer.getAvailablePlaybackRates();
			const currentRate = await internalPlayer.getPlaybackRate();
			const currentIndex = playbackRates.indexOf(currentRate);
			const nextIndex = Math.max(currentIndex - 1, 0);
			const nextRate = playbackRates[nextIndex];

			await internalPlayer.setPlaybackRate(nextRate);
			this.showFeedback(`Speed: ${nextRate}x`);
		} catch (error) {
			console.error('Error changing speed:', error);
			this.showFeedback('Error changing speed');
		}
	}

	private async toggleMuteCommand(): Promise<void> {
		const player = this.getActiveYouTubePlayer();
		if (!player) {
			this.showFeedback('No video player found');
			return;
		}

		try {
			const internalPlayer = player.getInternalPlayer();
			if (!internalPlayer) return;

			const isMuted = await internalPlayer.isMuted();
			if (isMuted) {
				await internalPlayer.unMute();
				this.showFeedback('Audio unmuted');
			} else {
				await internalPlayer.mute();
				this.showFeedback('Audio muted');
			}
		} catch (error) {
			console.error('Error toggling mute:', error);
			this.showFeedback('Error toggling mute');
		}
	}

	/**
	 * Format timestamp with smart formatting
	 */
	private formatTimestamp(timestamp: number): string {
		if (timestamp === undefined || timestamp === null || isNaN(timestamp) || timestamp < 0) {
			return "00:00";
		}
		
		const validTimestamp = Math.max(0, Math.floor(timestamp));
		
		const hours = Math.floor(validTimestamp / 3600);
		const minutes = Math.floor((validTimestamp - hours * 3600) / 60);
		const seconds = Math.floor(validTimestamp - hours * 3600 - minutes * 60);
		
		const safeSeconds = isNaN(seconds) ? 0 : seconds;
		const safeMinutes = isNaN(minutes) ? 0 : minutes;
		const safeHours = isNaN(hours) ? 0 : hours;
		
		const formattedSeconds = safeSeconds < 10 ? `0${safeSeconds}` : safeSeconds;
		const formattedMinutes = safeMinutes < 10 ? `0${safeMinutes}` : safeMinutes;
		
		// Smart formatting: only show hours if video is longer than 1 hour
		if (safeHours > 0) {
			return `${safeHours}:${formattedMinutes}:${formattedSeconds}`;
		} else {
			return `${formattedMinutes}:${formattedSeconds}`;
		}
	}

	/**
	 * Activate the Media Summarizer view
	 * Opens the view in the right sidebar if it's not already open
	 */
	async activateView(): Promise<void> {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(MEDIA_SUMMARIZER_VIEW_TYPE);

		if (leaves.length > 0) {
			// If view is already open, just activate it
			leaf = leaves[0];
		} else {
			// Create new view in the right sidebar
			leaf = workspace.getRightLeaf(false);
			await leaf.setViewState({
				type: MEDIA_SUMMARIZER_VIEW_TYPE,
				active: true,
			});
		}

		// Reveal and activate the leaf
		workspace.revealLeaf(leaf);

		// Check if there's an active note with media_url
		const activeFile = workspace.getActiveFile();
		if (!activeFile) {
			new Notice('Please open a note with a media_url in the frontmatter to load a video');
			return;
		}

		// Check if the active note has a media_url in frontmatter
		try {
			const content = await this.app.vault.read(activeFile);
			const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
			const match = content.match(frontmatterRegex);

			if (match) {
				const frontmatter = match[1];
				const mediaUrlMatch = frontmatter.match(/media_url:\s*(.+)/);
				
				if (mediaUrlMatch) {
					// Media URL found, view will load it automatically
					new Notice('Media Summarizer opened - loading video from frontmatter');
				} else {
					new Notice('Add "media_url: [YouTube URL]" to your note\'s frontmatter to load a video');
				}
			} else {
				new Notice('Add frontmatter with "media_url: [YouTube URL]" to load a video');
			}
		} catch (error) {
			console.error('Error checking frontmatter:', error);
		}
	}

	/**
	 * Refresh the Media Summarizer view
	 * Useful when switching between notes or updating frontmatter
	 */
	async refreshView(): Promise<void> {
		const leaves = this.app.workspace.getLeavesOfType(MEDIA_SUMMARIZER_VIEW_TYPE);
		
		for (const leaf of leaves) {
			const view = leaf.view as MediaSummarizerView;
			if (view && typeof view.refresh === 'function') {
				await view.refresh();
			}
		}
	}

	/**
	 * Load plugin settings from storage
	 */
	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	/**
	 * Save plugin settings to storage
	 */
	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		
		// Update LLM summarizer with new settings
		this.initializeLLMSummarizer();
		
		// Refresh all Media Summarizer views to reflect settings changes
		this.refreshAllMediaSummarizerViews();
	}

	/**
	 * Refresh all Media Summarizer views to reflect settings changes
	 */
	private refreshAllMediaSummarizerViews(): void {
		const leaves = this.app.workspace.getLeavesOfType(MEDIA_SUMMARIZER_VIEW_TYPE);
		leaves.forEach(leaf => {
			const view = leaf.view as MediaSummarizerView;
			if (view && typeof view.refreshView === 'function') {
				view.refreshView().catch(error => {
					console.error('Error refreshing Media Summarizer view:', error);
				});
			}
		});
	}

	/**
	 * Initialize or update the LLM summarizer with current settings
	 */
	private initializeLLMSummarizer(): void {
		// Migrate legacy settings to new provider-based settings if needed
		this.migrateLegacySettings();
		
		// Create provider manager settings from plugin settings
		const providerSettings: ProviderManagerSettings = {
			currentProvider: this.settings.currentProvider,
			openai: this.settings.providers.openai,
			openrouter: this.settings.providers.openrouter,
			ollama: this.settings.providers.ollama
		};

		if (this.llmSummarizer) {
			// Update existing summarizer
			this.llmSummarizer.updateSettings(providerSettings);
		} else {
			// Create new summarizer
			this.llmSummarizer = new LLMSummarizer(providerSettings);
		}
	}

	/**
	 * Migrate legacy settings to new provider-based structure
	 */
	private migrateLegacySettings(): void {
		let needsSave = false;

		// Always ensure providers object exists
		if (!this.settings.providers) {
			this.settings.providers = {
				openai: { apiKey: '', model: 'gpt-4o-mini' },
				openrouter: { apiKey: '', model: 'anthropic/claude-3.5-sonnet' },
				ollama: { baseUrl: 'http://localhost:11434', model: 'llama3.1:8b' }
			};
			needsSave = true;
		}

		// Migrate legacy OpenAI settings if they exist and haven't been migrated
		if (this.settings.openaiApiKey && !this.settings.providers.openai?.apiKey) {
			this.settings.providers.openai.apiKey = this.settings.openaiApiKey;
			this.settings.providers.openai.model = this.settings.aiModel || 'gpt-4o-mini';
			needsSave = true;
		}
		
		// Set default provider selection if not set
		if (!this.settings.currentProvider) {
			this.settings.currentProvider = 'openai';
			needsSave = true;
		}

		// Set default external transcript provider settings if not set
		if (!this.settings.externalTranscriptProvider) {
			this.settings.externalTranscriptProvider = 'openai';
			needsSave = true;
		}

		if (!this.settings.externalTranscriptProviderModel) {
			// Migrate from legacy setting if available
			this.settings.externalTranscriptProviderModel = this.settings.externalTranscriptModel || 'gpt-4o-mini';
			needsSave = true;
		}

		// Save migrated settings if any changes were made
		if (needsSave) {
			console.log('Media Summarizer: Migrating settings to new provider structure');
			this.saveSettings();
		}
	}

	/**
	 * Get the LLM summarizer instance
	 */
	getLLMSummarizer(): LLMSummarizer {
		if (!this.llmSummarizer) {
			this.initializeLLMSummarizer();
		}
		return this.llmSummarizer;
	}

	/**
	 * Check if the plugin is properly configured
	 */
	isConfigured(): boolean {
		// Check if any provider is configured
		return !!(
			(this.settings.providers?.openai?.apiKey && this.settings.providers.openai.apiKey.trim()) ||
			(this.settings.providers?.openrouter?.apiKey && this.settings.providers.openrouter.apiKey.trim()) ||
			(this.settings.currentProvider === 'ollama') || // Ollama doesn't require API key
			(this.settings.openaiApiKey && this.settings.openaiApiKey.trim()) // Legacy support
		);
	}

	/**
	 * Get a user-friendly configuration status message
	 */
	getConfigurationStatus(): string {
		const currentProvider = this.settings.currentProvider;
		
		if (currentProvider === 'openai') {
			const apiKey = this.settings.providers?.openai?.apiKey || this.settings.openaiApiKey;
			if (!apiKey || !apiKey.trim()) {
				return 'OpenAI API key not configured. Please set it in plugin settings.';
			}
			if (!apiKey.startsWith('sk-')) {
				return 'Invalid OpenAI API key format. Please check your API key.';
			}
			return 'OpenAI provider configured successfully.';
		}
		
		if (currentProvider === 'openrouter') {
			const apiKey = this.settings.providers?.openrouter?.apiKey;
			if (!apiKey || !apiKey.trim()) {
				return 'OpenRouter API key not configured. Please set it in plugin settings.';
			}
			if (!apiKey.startsWith('sk-or-')) {
				return 'Invalid OpenRouter API key format. Please check your API key.';
			}
			return 'OpenRouter provider configured successfully.';
		}
		
		if (currentProvider === 'ollama') {
			return 'Ollama provider selected. Make sure Ollama is running locally.';
		}
		
		return 'No AI provider configured. Please select and configure a provider in plugin settings.';
	}
}