import { App, PluginSettingTab, Setting } from 'obsidian';
import MediaSummarizerPlugin from './main';

/**
 * Interface defining the plugin settings structure
 */
export interface MediaSummarizerSettings {
	openaiApiKey: string;
	aiModel: string;
	enhancedTranscriptFormatting: boolean;
	seekSeconds: number;
	timestampOffsetSeconds: number;
	playbackOffsetSeconds: number;
	pauseOnTimestampInsert: boolean;
	defaultPlaybackSpeed: number;
}

/**
 * Default settings for the plugin
 */
export const DEFAULT_SETTINGS: MediaSummarizerSettings = {
	openaiApiKey: '',
	aiModel: 'gpt-4o-mini',
	enhancedTranscriptFormatting: true,
	seekSeconds: 10,
	timestampOffsetSeconds: 2,
	playbackOffsetSeconds: 2,
	pauseOnTimestampInsert: false,
	defaultPlaybackSpeed: 1
};

/**
 * Settings tab for the Media Summarizer plugin
 * Provides a UI for users to configure their OpenAI API key
 */
export class MediaSummarizerSettingTab extends PluginSettingTab {
	plugin: MediaSummarizerPlugin;

	constructor(app: App, plugin: MediaSummarizerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/**
	 * Display the settings UI
	 */
	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		// Plugin title and description
		containerEl.createEl('h2', { text: 'Media Summarizer Settings' });
		
		containerEl.createEl('p', {
			text: 'Configure your OpenAI API key to enable AI-powered video transcript summarization.'
		});

		// OpenAI API Key setting
		new Setting(containerEl)
			.setName('OpenAI API Key')
			.setDesc('Enter your OpenAI API key for GPT-3.5-turbo summarization. Get your key from https://platform.openai.com/api-keys')
			.addText(text => text
				.setPlaceholder('sk-...')
				.setValue(this.plugin.settings.openaiApiKey)
				.onChange(async (value) => {
					this.plugin.settings.openaiApiKey = value;
					await this.plugin.saveSettings();
				}));

		// Security notice
		containerEl.createEl('div', {
			cls: 'setting-item-description',
			text: '⚠️ Your API key is stored locally and only sent to OpenAI for summarization requests.'
		});

		// AI Model Section
		containerEl.createEl('h3', { text: 'AI Model Selection' });

		// AI Model setting
		new Setting(containerEl)
			.setName('AI Model')
			.setDesc('Choose the OpenAI model for transcript enhancement and summarization')
			.addDropdown(dropdown => dropdown
				.addOptions({
					'gpt-4o-mini': 'GPT-4o-mini (Recommended - Best balance)',
					'gpt-4o': 'GPT-4o (Latest - Highest quality)',
					'gpt-4-turbo': 'GPT-4-turbo (High quality)'
				})
				.setValue(this.plugin.settings.aiModel)
				.onChange(async (value) => {
					this.plugin.settings.aiModel = value;
					await this.plugin.saveSettings();
				}));

		// Model comparison info
		containerEl.createEl('div', {
			cls: 'setting-item-description',
			text: '💡 GPT-4o-mini offers the best balance of quality and cost. GPT-4o is the latest model with the highest quality and capabilities. GPT-4-turbo provides excellent quality at moderate cost.'
		});

		// Transcript Enhancement Section
		containerEl.createEl('h3', { text: 'Transcript Enhancement' });

		// Enhanced transcript formatting setting
		new Setting(containerEl)
			.setName('Enhanced transcript formatting')
			.setDesc('Use AI to improve YouTube transcript readability with better punctuation, speaker identification, and organized sections')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enhancedTranscriptFormatting)
				.onChange(async (value) => {
					this.plugin.settings.enhancedTranscriptFormatting = value;
					await this.plugin.saveSettings();
				}));

		// Enhancement details
		containerEl.createEl('div', {
			cls: 'setting-item-description',
			text: '💡 Enhancement uses video title and description to improve name spelling and speaker identification.'
		});

		// Video Controls Section
		containerEl.createEl('h3', { text: 'Video Controls' });

		// Seek seconds setting
		new Setting(containerEl)
			.setName('Seek seconds')
			.setDesc('Number of seconds to skip forward/backward when using seek controls')
			.addSlider(slider => slider
				.setLimits(1, 60, 1)
				.setDynamicTooltip()
				.setValue(this.plugin.settings.seekSeconds)
				.onChange(async (value) => {
					this.plugin.settings.seekSeconds = value;
					await this.plugin.saveSettings();
				}));

		// Default playback speed setting
		new Setting(containerEl)
			.setName('Default playback speed')
			.setDesc('Default video playback speed when loading videos')
			.addDropdown(dropdown => dropdown
				.addOptions({
					'0.5': '0.5x',
					'0.75': '0.75x',
					'1': '1x (Normal)',
					'1.25': '1.25x',
					'1.5': '1.5x',
					'2': '2x'
				})
				.setValue(this.plugin.settings.defaultPlaybackSpeed.toString())
				.onChange(async (value) => {
					this.plugin.settings.defaultPlaybackSpeed = parseFloat(value);
					await this.plugin.saveSettings();
				}));

		// Timestamp Section
		containerEl.createEl('h3', { text: 'Timestamp Settings' });

		// Timestamp offset setting
		new Setting(containerEl)
			.setName('Timestamp offset')
			.setDesc('Seconds to subtract from current time when inserting timestamps (captures context before the current moment)')
			.addSlider(slider => slider
				.setLimits(0, 10, 1)
				.setDynamicTooltip()
				.setValue(this.plugin.settings.timestampOffsetSeconds)
				.onChange(async (value) => {
					this.plugin.settings.timestampOffsetSeconds = value;
					await this.plugin.saveSettings();
				}));

		// Playback offset setting
		new Setting(containerEl)
			.setName('Playback offset')
			.setDesc('Seconds to rewind video playback when inserting timestamps (automatically review context)')
			.addSlider(slider => slider
				.setLimits(0, 10, 1)
				.setDynamicTooltip()
				.setValue(this.plugin.settings.playbackOffsetSeconds)
				.onChange(async (value) => {
					this.plugin.settings.playbackOffsetSeconds = value;
					await this.plugin.saveSettings();
				}));

		// Pause on timestamp insert setting
		new Setting(containerEl)
			.setName('Pause on timestamp insert')
			.setDesc('Automatically pause the video when inserting a timestamp')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.pauseOnTimestampInsert)
				.onChange(async (value) => {
					this.plugin.settings.pauseOnTimestampInsert = value;
					await this.plugin.saveSettings();
				}));

		// Quick Setup Section
		containerEl.createEl('h3', { text: '⚡ Quick Setup' });
		
		containerEl.createEl('p', {
			text: 'Set up keyboard shortcuts for the best experience:'
		});

		// Open Hotkey Settings button
		new Setting(containerEl)
			.setName('Configure Keyboard Shortcuts')
			.setDesc('Open Obsidian\'s Hotkey settings to assign shortcuts for Media Summarizer commands')
			.addButton(button => button
				.setButtonText('Open Hotkey Settings')
				.setCta()
				.onClick(() => {
					// Open Obsidian's settings with hotkeys tab
					// @ts-ignore - accessing Obsidian's internal app methods
					const settingTab = this.app.setting;
					if (settingTab && settingTab.open) {
						settingTab.open();
						settingTab.openTabById('hotkeys');
						// Small delay to ensure the tab is loaded, then search for our plugin
						setTimeout(() => {
							const searchInput = document.querySelector('.setting-search-input') as HTMLInputElement;
							if (searchInput) {
								searchInput.value = 'Media Summarizer';
								searchInput.dispatchEvent(new Event('input'));
							}
						}, 300);
					} else {
						// Fallback: show instructions
						alert('To set up keyboard shortcuts:\n\n1. Go to Settings > Hotkeys\n2. Search for "Media Summarizer"\n3. Assign your preferred shortcuts');
					}
				}));

		// Keyboard Shortcuts Section
		containerEl.createEl('h3', { text: 'Suggested Keyboard Shortcuts' });
		
		containerEl.createEl('p', {
			text: 'Use the button above to open Hotkey settings and assign these suggested shortcuts:'
		});

		// Create a container for shortcuts display
		const shortcutsContainer = containerEl.createEl('div', { cls: 'shortcuts-container' });
		
		const shortcuts = [
			{ command: 'Insert Timestamp', key: '⌃I', desc: 'Insert timestamp at current video time' },
			{ command: 'Play/Pause', key: '⌃K', desc: 'Toggle video playback' },
			{ command: 'Rewind', key: '⌃J', desc: 'Jump backward in video' },
			{ command: 'Fast Forward', key: '⌃L', desc: 'Jump forward in video' },
			{ command: 'Speed Up', key: 'Shift+>', desc: 'Increase playback speed' },
			{ command: 'Speed Down', key: 'Shift+<', desc: 'Decrease playback speed' },
			{ command: 'Mute/Unmute', key: 'M', desc: 'Toggle audio mute' }
		];

		shortcuts.forEach(shortcut => {
			const shortcutItem = shortcutsContainer.createEl('div', { cls: 'shortcut-item' });
			
			shortcutItem.createEl('strong', { text: shortcut.command });
			shortcutItem.createEl('span', { 
				text: ` - ${shortcut.key}`,
				cls: 'shortcut-key'
			});
			shortcutItem.createEl('div', { 
				text: shortcut.desc, 
				cls: 'shortcut-desc' 
			});
		});

		// Usage instructions
		const usageEl = containerEl.createEl('div', { cls: 'media-summarizer-usage' });
		usageEl.createEl('h3', { text: 'How to use:' });
		
		const instructionsList = usageEl.createEl('ol');
		instructionsList.createEl('li', { text: 'Add a media_url to your note\'s frontmatter: media_url: https://youtube.com/watch?v=...' });
		instructionsList.createEl('li', { text: 'Click the Media Summarizer ribbon icon to open the player view' });
		instructionsList.createEl('li', { text: 'Use keyboard shortcuts or buttons to control playback and insert timestamps' });
		instructionsList.createEl('li', { text: 'Click timestamps in your notes to jump to that time in the video' });
		instructionsList.createEl('li', { text: 'Click Summarize to generate an AI summary of the video transcript' });
	}
}