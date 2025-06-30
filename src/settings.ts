import { App, PluginSettingTab, Setting } from 'obsidian';
import MediaSummarizerPlugin from './main';

/**
 * Interface defining the plugin settings structure
 */
export interface MediaSummarizerSettings {
	openaiApiKey: string;
}

/**
 * Default settings for the plugin
 */
export const DEFAULT_SETTINGS: MediaSummarizerSettings = {
	openaiApiKey: ''
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

		// Usage instructions
		const usageEl = containerEl.createEl('div', { cls: 'media-summarizer-usage' });
		usageEl.createEl('h3', { text: 'How to use:' });
		
		const instructionsList = usageEl.createEl('ol');
		instructionsList.createEl('li', { text: 'Add a media_url to your note\'s frontmatter: media_url: https://youtube.com/watch?v=...' });
		instructionsList.createEl('li', { text: 'Click the Media Summarizer ribbon icon to open the player view' });
		instructionsList.createEl('li', { text: 'Use the Timestamp button while watching to insert timestamps into your notes' });
		instructionsList.createEl('li', { text: 'Click Summarize to generate an AI summary of the video transcript' });
	}
}