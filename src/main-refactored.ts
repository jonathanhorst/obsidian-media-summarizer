import { Plugin, WorkspaceLeaf, MarkdownView } from 'obsidian';
import { MediaSummarizerView, MEDIA_SUMMARIZER_VIEW_TYPE } from './view';
import { MediaSummarizerSettingTab, MediaSummarizerSettings, DEFAULT_SETTINGS } from './settings';
import { createTimestampClickHandlerPlugin, convertTimestampToSeconds } from './timestamp-click-handler';
import { LLMSummarizer } from './llm-summarizer';
import { ProviderManagerSettings } from './providers/provider-manager';
import { 
    YouTubePlayerService, 
    ErrorHandlingService,
    AppError 
} from './services';
import { 
    SETTINGS_CONSTANTS, 
    UI_CONSTANTS, 
    ERROR_MESSAGES, 
    SUCCESS_MESSAGES 
} from './constants';

/**
 * Main plugin class for Media Summarizer
 * Handles plugin lifecycle, settings management, and view registration
 */
export default class MediaSummarizerPlugin extends Plugin {
    settings: MediaSummarizerSettings;
    private lastActiveFilePath: string | null = null;
    private llmSummarizer: LLMSummarizer;
    private youtubePlayerService: YouTubePlayerService;
    private errorHandler: ErrorHandlingService;

    /**
     * Handle timestamp clicks - jump to specific time in video
     */
    handleTimestampClick = (timestamp: string): boolean | undefined => {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) return;

        try {
            const seconds = convertTimestampToSeconds(timestamp);
            this.youtubePlayerService.seekTo(seconds);
            return true;
        } catch (error) {
            this.errorHandler.handleApiError(error, {
                operation: 'timestamp_click',
                details: { timestamp }
            });
            return false;
        }
    };

    /**
     * Plugin initialization
     */
    async onload(): Promise<void> {
        await this.initializeServices();
        await this.loadSettings();
        await this.setupPlugin();
    }

    /**
     * Plugin cleanup
     */
    onunload(): void {
        // Cleanup is handled automatically by Obsidian for registered views and events
    }

    /**
     * Initialize all services
     */
    private async initializeServices(): Promise<void> {
        this.youtubePlayerService = YouTubePlayerService.getInstance(this.app);
        this.errorHandler = ErrorHandlingService.getInstance();
    }

    /**
     * Setup plugin components
     */
    private async setupPlugin(): Promise<void> {
        this.registerEditorExtension([
            createTimestampClickHandlerPlugin(this.handleTimestampClick),
        ]);

        this.initializeLLMSummarizer();
        this.registerView();
        this.setupUI();
        this.registerCommands();
        this.registerEventHandlers();
    }

    /**
     * Register the custom view
     */
    private registerView(): void {
        this.registerView(
            MEDIA_SUMMARIZER_VIEW_TYPE,
            (leaf) => new MediaSummarizerView(leaf, this)
        );
    }

    /**
     * Setup UI elements
     */
    private setupUI(): void {
        this.addSettingTab(new MediaSummarizerSettingTab(this.app, this));

        this.addRibbonIcon('play', 'Open Media Summarizer', () => {
            this.activateView();
        });
    }

    /**
     * Register all plugin commands
     */
    private registerCommands(): void {
        this.registerBasicCommands();
        this.registerVideoControlCommands();
    }

    /**
     * Register basic plugin commands
     */
    private registerBasicCommands(): void {
        this.addCommand({
            id: 'open-media-summarizer',
            name: 'Open Media Summarizer',
            callback: () => this.activateView()
        });

        this.addCommand({
            id: 'refresh-media-summarizer',
            name: 'Refresh Media Summarizer',
            callback: () => this.refreshView()
        });

        this.addCommand({
            id: 'show-shortcuts-help',
            name: 'Show Keyboard Shortcuts',
            editorCallback: () => this.showShortcutsHelp()
        });
    }

    /**
     * Register video control commands for keyboard shortcuts
     */
    private registerVideoControlCommands(): void {
        const commands = [
            {
                id: 'insert-timestamp',
                name: 'Insert Timestamp',
                callback: this.insertTimestampCommand.bind(this)
            },
            {
                id: 'toggle-play-pause',
                name: 'Play/Pause',
                callback: this.togglePlayPauseCommand.bind(this)
            },
            {
                id: 'seek-forward',
                name: 'Fast Forward',
                callback: this.seekForwardCommand.bind(this)
            },
            {
                id: 'seek-backward',
                name: 'Rewind',
                callback: this.seekBackwardCommand.bind(this)
            },
            {
                id: 'speed-up',
                name: 'Speed Up',
                callback: this.speedUpCommand.bind(this)
            },
            {
                id: 'speed-down',
                name: 'Speed Down',
                callback: this.speedDownCommand.bind(this)
            },
            {
                id: 'toggle-mute',
                name: 'Mute/Unmute',
                callback: this.toggleMuteCommand.bind(this)
            }
        ];

        commands.forEach(cmd => {
            this.addCommand({
                id: cmd.id,
                name: cmd.name,
                editorCallback: async (editor, view) => {
                    await cmd.callback(editor, view);
                }
            });
        });
    }

    /**
     * Register event handlers
     */
    private registerEventHandlers(): void {
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', () => {
                setTimeout(() => {
                    this.handleActiveFileChange();
                }, SETTINGS_CONSTANTS.SETTINGS_OPEN_DELAY);
            })
        );

        this.registerEvent(
            this.app.vault.on('modify', (file) => {
                this.handleFileModification(file);
            })
        );
    }

    /**
     * Handle active file changes
     */
    private handleActiveFileChange(): void {
        const currentActiveFile = this.app.workspace.getActiveFile();
        if (currentActiveFile && this.lastActiveFilePath !== currentActiveFile.path) {
            this.lastActiveFilePath = currentActiveFile.path;
            this.refreshView();
        }
    }

    /**
     * Handle file modifications
     */
    private handleFileModification(file: any): void {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile && file.path === activeFile.path) {
            setTimeout(() => {
                this.refreshView();
            }, SETTINGS_CONSTANTS.SETTINGS_OPEN_DELAY);
        }
    }

    /**
     * Command implementations using the new services
     */
    private async insertTimestampCommand(editor: any, view: any): Promise<void> {
        try {
            const result = await this.youtubePlayerService.insertTimestamp({
                timestampOffset: this.settings.timestampOffsetSeconds,
                playbackOffset: this.settings.playbackOffsetSeconds,
                pauseOnInsert: this.settings.pauseOnTimestampInsert
            });

            if (result.success && result.timestamp) {
                editor.replaceSelection(`${result.timestamp} `);
                this.errorHandler.showSuccess(`Timestamp inserted: ${result.timestamp}`);
            } else {
                throw new Error(result.error || ERROR_MESSAGES.TIMESTAMP_INSERT_FAILED);
            }
        } catch (error) {
            await this.errorHandler.handleApiError(error, {
                operation: 'insert_timestamp'
            });
        }
    }

    private async togglePlayPauseCommand(): Promise<void> {
        try {
            const success = await this.youtubePlayerService.playPause();
            if (!success) {
                throw new Error(ERROR_MESSAGES.PLAYBACK_CONTROL_FAILED);
            }
            // Success feedback is handled by the service
        } catch (error) {
            await this.errorHandler.handleApiError(error, {
                operation: 'toggle_play_pause'
            });
        }
    }

    private async seekForwardCommand(): Promise<void> {
        try {
            const success = await this.youtubePlayerService.skip(this.settings.seekSeconds);
            if (success) {
                this.errorHandler.showSuccess(`Jumped forward ${this.settings.seekSeconds}s`);
            } else {
                throw new Error(ERROR_MESSAGES.PLAYBACK_CONTROL_FAILED);
            }
        } catch (error) {
            await this.errorHandler.handleApiError(error, {
                operation: 'seek_forward'
            });
        }
    }

    private async seekBackwardCommand(): Promise<void> {
        try {
            const success = await this.youtubePlayerService.skip(-this.settings.seekSeconds);
            if (success) {
                this.errorHandler.showSuccess(`Jumped backward ${this.settings.seekSeconds}s`);
            } else {
                throw new Error(ERROR_MESSAGES.PLAYBACK_CONTROL_FAILED);
            }
        } catch (error) {
            await this.errorHandler.handleApiError(error, {
                operation: 'seek_backward'
            });
        }
    }

    private async speedUpCommand(): Promise<void> {
        try {
            const playerState = await this.youtubePlayerService.getPlayerState();
            if (!playerState) {
                throw new Error(ERROR_MESSAGES.PLAYER_NOT_READY);
            }

            const speeds = SETTINGS_CONSTANTS.PLAYBACK_SPEED_OPTIONS;
            const currentIndex = speeds.indexOf(playerState.playbackRate);
            const nextIndex = Math.min(currentIndex + 1, speeds.length - 1);
            const nextSpeed = speeds[nextIndex];

            const success = await this.youtubePlayerService.setPlaybackSpeed(nextSpeed);
            if (success) {
                this.errorHandler.showSuccess(`Speed: ${nextSpeed}x`);
            } else {
                throw new Error(ERROR_MESSAGES.PLAYBACK_CONTROL_FAILED);
            }
        } catch (error) {
            await this.errorHandler.handleApiError(error, {
                operation: 'speed_up'
            });
        }
    }

    private async speedDownCommand(): Promise<void> {
        try {
            const playerState = await this.youtubePlayerService.getPlayerState();
            if (!playerState) {
                throw new Error(ERROR_MESSAGES.PLAYER_NOT_READY);
            }

            const speeds = SETTINGS_CONSTANTS.PLAYBACK_SPEED_OPTIONS;
            const currentIndex = speeds.indexOf(playerState.playbackRate);
            const nextIndex = Math.max(currentIndex - 1, 0);
            const nextSpeed = speeds[nextIndex];

            const success = await this.youtubePlayerService.setPlaybackSpeed(nextSpeed);
            if (success) {
                this.errorHandler.showSuccess(`Speed: ${nextSpeed}x`);
            } else {
                throw new Error(ERROR_MESSAGES.PLAYBACK_CONTROL_FAILED);
            }
        } catch (error) {
            await this.errorHandler.handleApiError(error, {
                operation: 'speed_down'
            });
        }
    }

    private async toggleMuteCommand(): Promise<void> {
        try {
            const success = await this.youtubePlayerService.toggleMute();
            if (!success) {
                throw new Error(ERROR_MESSAGES.PLAYBACK_CONTROL_FAILED);
            }
            // Success feedback is handled by the service
        } catch (error) {
            await this.errorHandler.handleApiError(error, {
                operation: 'toggle_mute'
            });
        }
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

        this.errorHandler.showInfo(helpText, SETTINGS_CONSTANTS.HELP_NOTICE_DURATION);
    }

    /**
     * Activate the Media Summarizer view
     */
    async activateView(): Promise<void> {
        try {
            const { workspace } = this.app;
            let leaf: WorkspaceLeaf | null = null;
            const leaves = workspace.getLeavesOfType(MEDIA_SUMMARIZER_VIEW_TYPE);

            if (leaves.length > 0) {
                leaf = leaves[0];
            } else {
                leaf = workspace.getRightLeaf(false);
                await leaf.setViewState({
                    type: MEDIA_SUMMARIZER_VIEW_TYPE,
                    active: true,
                });
            }

            workspace.revealLeaf(leaf);
            await this.validateActiveNote();
        } catch (error) {
            await this.errorHandler.handleApiError(error, {
                operation: 'activate_view'
            });
        }
    }

    /**
     * Validate active note has media_url
     */
    private async validateActiveNote(): Promise<void> {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            this.errorHandler.showInfo('Please open a note with a media_url in the frontmatter to load a video');
            return;
        }

        try {
            const content = await this.app.vault.read(activeFile);
            const frontmatterMatch = content.match(UI_CONSTANTS.FRONTMATTER_REGEX);

            if (frontmatterMatch) {
                const frontmatter = frontmatterMatch[1];
                const mediaUrlMatch = frontmatter.match(UI_CONSTANTS.MEDIA_URL_REGEX);
                
                if (mediaUrlMatch) {
                    this.errorHandler.showSuccess('Media Summarizer opened - loading video from frontmatter');
                } else {
                    this.errorHandler.showInfo('Add "media_url: [YouTube URL]" to your note\'s frontmatter to load a video');
                }
            } else {
                this.errorHandler.showInfo('Add frontmatter with "media_url: [YouTube URL]" to load a video');
            }
        } catch (error) {
            console.error('Error checking frontmatter:', error);
        }
    }

    /**
     * Refresh the Media Summarizer view
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
        this.initializeLLMSummarizer();
        this.refreshAllMediaSummarizerViews();
        this.errorHandler.showSuccess(SUCCESS_MESSAGES.SETTINGS_SAVED);
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
                    this.errorHandler.handleApiError(error, {
                        operation: 'refresh_view'
                    });
                });
            }
        });
    }

    /**
     * Initialize or update the LLM summarizer with current settings
     */
    private initializeLLMSummarizer(): void {
        this.migrateLegacySettings();
        
        const providerSettings: ProviderManagerSettings = {
            currentProvider: this.settings.currentProvider,
            openai: this.settings.providers.openai,
            openrouter: this.settings.providers.openrouter,
            ollama: this.settings.providers.ollama
        };

        if (this.llmSummarizer) {
            this.llmSummarizer.updateSettings(providerSettings);
        } else {
            this.llmSummarizer = new LLMSummarizer(providerSettings);
        }
    }

    /**
     * Migrate legacy settings to new provider-based structure
     */
    private migrateLegacySettings(): void {
        let needsSave = false;

        // Initialize providers object if needed
        if (!this.settings.providers) {
            this.settings.providers = {
                openai: { apiKey: '', model: SETTINGS_CONSTANTS.DEFAULT_OPENAI_MODEL },
                openrouter: { apiKey: '', model: SETTINGS_CONSTANTS.DEFAULT_OPENROUTER_MODEL },
                ollama: { baseUrl: PROVIDER_CONSTANTS.OLLAMA_MODELS_ENDPOINT, model: SETTINGS_CONSTANTS.DEFAULT_OLLAMA_MODEL }
            };
            needsSave = true;
        }

        // Migrate legacy OpenAI settings
        if (this.settings.openaiApiKey && !this.settings.providers.openai?.apiKey) {
            this.settings.providers.openai.apiKey = this.settings.openaiApiKey;
            this.settings.providers.openai.model = this.settings.aiModel || SETTINGS_CONSTANTS.DEFAULT_OPENAI_MODEL;
            needsSave = true;
        }
        
        // Set defaults for missing settings
        const defaults = {
            currentProvider: 'openai',
            externalTranscriptProvider: 'openai',
            externalTranscriptProviderModel: this.settings.externalTranscriptModel || SETTINGS_CONSTANTS.DEFAULT_OPENAI_MODEL,
            enableSummarization: false,
            enableEnhancedTranscript: false,
            enableExternalTranscriptDetection: false
        };

        Object.entries(defaults).forEach(([key, defaultValue]) => {
            if (this.settings[key] === undefined) {
                this.settings[key] = defaultValue;
                needsSave = true;
            }
        });

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
        return !!(
            (this.settings.providers?.openai?.apiKey && this.settings.providers.openai.apiKey.trim()) ||
            (this.settings.providers?.openrouter?.apiKey && this.settings.providers.openrouter.apiKey.trim()) ||
            (this.settings.currentProvider === 'ollama') ||
            (this.settings.openaiApiKey && this.settings.openaiApiKey.trim())
        );
    }

    /**
     * Get a user-friendly configuration status message
     */
    getConfigurationStatus(): string {
        const currentProvider = this.settings.currentProvider;
        
        const validators = {
            openai: (apiKey: string) => {
                if (!apiKey || !apiKey.trim()) return 'OpenAI API key not configured. Please set it in plugin settings.';
                if (!apiKey.startsWith('sk-')) return 'Invalid OpenAI API key format. Please check your API key.';
                return 'OpenAI provider configured successfully.';
            },
            openrouter: (apiKey: string) => {
                if (!apiKey || !apiKey.trim()) return 'OpenRouter API key not configured. Please set it in plugin settings.';
                if (!apiKey.startsWith('sk-or-')) return 'Invalid OpenRouter API key format. Please check your API key.';
                return 'OpenRouter provider configured successfully.';
            },
            ollama: () => 'Ollama provider selected. Make sure Ollama is running locally.'
        };

        if (currentProvider === 'openai') {
            const apiKey = this.settings.providers?.openai?.apiKey || this.settings.openaiApiKey;
            return validators.openai(apiKey);
        }
        
        if (currentProvider === 'openrouter') {
            const apiKey = this.settings.providers?.openrouter?.apiKey;
            return validators.openrouter(apiKey);
        }
        
        if (currentProvider === 'ollama') {
            return validators.ollama();
        }
        
        return 'No AI provider configured. Please select and configure a provider in plugin settings.';
    }
}