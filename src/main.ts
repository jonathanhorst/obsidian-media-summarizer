import { Plugin, WorkspaceLeaf, Notice, MarkdownView } from 'obsidian';
import { MediaSummarizerView, MEDIA_SUMMARIZER_VIEW_TYPE } from './view';
import { MediaSummarizerSettingTab, MediaSummarizerSettings, DEFAULT_SETTINGS } from './settings';
import { createTimestampClickHandlerPlugin, convertTimestampToSeconds } from './timestamp-click-handler';

/**
 * Main plugin class for Media Summarizer
 * Handles plugin lifecycle, settings management, and view registration
 */
export default class MediaSummarizerPlugin extends Plugin {
	settings: MediaSummarizerSettings;
	private lastActiveFilePath: string | null = null;

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

		console.log(`Jumped to timestamp: ${timestamp} (${seconds} seconds)`);
		return true;
	};

	/**
	 * Plugin initialization
	 */
	async onload(): Promise<void> {
		console.log('Loading Media Summarizer plugin');

		// Register CodeMirror extension for timestamp clicks
		this.registerEditorExtension([
			createTimestampClickHandlerPlugin(this.handleTimestampClick),
		]);

		// Load settings
		await this.loadSettings();

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
		console.log('Unloading Media Summarizer plugin');
		// Cleanup is handled automatically by Obsidian for registered views and events
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
	}

	/**
	 * Check if the plugin is properly configured
	 */
	isConfigured(): boolean {
		return !!(this.settings.openaiApiKey && this.settings.openaiApiKey.trim());
	}

	/**
	 * Get a user-friendly configuration status message
	 */
	getConfigurationStatus(): string {
		if (!this.settings.openaiApiKey || !this.settings.openaiApiKey.trim()) {
			return 'OpenAI API key not configured. Please set it in plugin settings to enable summarization.';
		}

		if (!this.settings.openaiApiKey.startsWith('sk-')) {
			return 'Invalid OpenAI API key format. Please check your API key in plugin settings.';
		}

		return 'Plugin is properly configured.';
	}
}