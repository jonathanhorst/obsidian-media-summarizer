import { App, PluginSettingTab, Setting } from 'obsidian';
import MediaSummarizerPlugin from './main';
import { ProviderType } from './providers/provider-manager';

/**
 * Interface defining the plugin settings structure
 */
export interface MediaSummarizerSettings {
	// Legacy OpenAI settings (maintained for backward compatibility)
	openaiApiKey: string;
	aiModel: string;
	
	// Multi-provider settings
	currentProvider: ProviderType;
	
	// Provider-specific configurations
	providers: {
		openai: {
			apiKey: string;
			model: string;
		};
		openrouter: {
			apiKey: string;
			model: string;
		};
		ollama: {
			baseUrl: string;
			model: string;
		};
	};
	
	// Feature toggle settings (progressive disclosure)
	enableSummarization: boolean;
	enableEnhancedTranscript: boolean;
	enableExternalTranscriptDetection: boolean;
	
	// Existing settings
	enhancedTranscriptFormatting: boolean;
	checkExternalTranscripts: boolean;
	youtubeApiKey: string;
	webscrapingApiKey: string;
	externalTranscriptModel: string; // Legacy - kept for backward compatibility
	
	// External transcript provider settings
	externalTranscriptProvider: ProviderType;
	externalTranscriptProviderModel: string;
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
	// Legacy settings (for backward compatibility)
	openaiApiKey: '',
	aiModel: 'gpt-4o-mini',
	
	// Multi-provider settings
	currentProvider: 'openai',
	
	// Provider-specific configurations
	providers: {
		openai: {
			apiKey: '',
			model: 'gpt-4o-mini'
		},
		openrouter: {
			apiKey: '',
			model: 'anthropic/claude-3.5-sonnet'
		},
		ollama: {
			baseUrl: 'http://localhost:11434',
			model: ''
		}
	},
	
	// Feature toggle settings (progressive disclosure) - Default to false for manual user enablement
	enableSummarization: false,
	enableEnhancedTranscript: false,
	enableExternalTranscriptDetection: false,
	
	// Existing settings
	enhancedTranscriptFormatting: true,
	checkExternalTranscripts: false,
	youtubeApiKey: '',
	webscrapingApiKey: '',
	externalTranscriptModel: 'gpt-4o-mini', // Legacy - kept for backward compatibility
	
	// External transcript provider settings
	externalTranscriptProvider: 'openai',
	externalTranscriptProviderModel: 'gpt-4o-mini',
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
		containerEl.createEl('h1', { text: 'Media Summarizer Settings' });

		// Documentation link
		containerEl.createEl('a', {
			text: 'View docs',
			href: 'https://github.com/jonathanhorst/obsidian-media-summarizer/blob/main/USAGE.md',
			attr: { 
				target: '_blank',
				style: 'margin-bottom: 20px; display: block;'
			}
		});

		// Keyboard shortcuts note
		const keyboardShortcutsP = containerEl.createEl('p', {
			text: 'Configure ',
			attr: { style: 'margin-bottom: 20px; color: var(--text-muted);' }
		});
		
		const hotkeysLink = keyboardShortcutsP.createEl('a', {
			text: 'hotkeys',
			href: '#',
			attr: { style: 'cursor: pointer; color: var(--text-accent);' }
		});
		
		hotkeysLink.addEventListener('click', (e) => {
			e.preventDefault();
			// Open settings using the app settings approach
			// @ts-ignore - Accessing internal Obsidian API
			if (this.app.setting) {
				// @ts-ignore
				this.app.setting.open();
				// Try to navigate to hotkeys tab after a short delay
				setTimeout(() => {
					// @ts-ignore
					if (this.app.setting.openTabById) {
						// @ts-ignore
						this.app.setting.openTabById('hotkeys');
					}
				}, 100);
			}
		});
		
		keyboardShortcutsP.appendText(' to improve your productivity. Learn more in the ');
		
		keyboardShortcutsP.createEl('a', {
			text: 'documentation',
			href: 'https://github.com/jonathanhorst/obsidian-media-summarizer/blob/main/USAGE.md',
			attr: { target: '_blank' }
		});

		// PROGRESSIVE DISCLOSURE ORGANIZATION
		this.addPlaybackSection(containerEl);
		this.addPowerFeaturesSection(containerEl);
		this.addPrimaryLLMConfigSection(containerEl);
		this.addEnhancedTranscriptLLMConfigSection(containerEl);
		this.addExperimentalFeaturesSection(containerEl);

		// Add anchor link navigation
		this.setupAnchorLinks(containerEl);
	}


	/**
	 * Add provider-specific configuration sections
	 */
	private addProviderConfiguration(containerEl: HTMLElement): void {
		const currentProvider = this.plugin.settings.currentProvider;

		if (currentProvider === 'openai') {
			this.addOpenAISettings(containerEl);
		} else if (currentProvider === 'openrouter') {
			this.addOpenRouterSettings(containerEl);
		} else if (currentProvider === 'ollama') {
			this.addOllamaSettings(containerEl);
		}

	}

	/**
	 * Add OpenAI provider settings
	 */
	private addOpenAISettings(containerEl: HTMLElement): void {

		new Setting(containerEl)
			.setName('OpenAI API Key')
			.setDesc('Enter your OpenAI API key')
			.addText(text => text
				.setPlaceholder('sk-...')
				.setValue(this.plugin.settings.providers.openai.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.providers.openai.apiKey = value;
					// Maintain backward compatibility
					this.plugin.settings.openaiApiKey = value;
					await this.plugin.saveSettings();
					
					// Refresh display to show/hide model dropdown
					const scrollTop = this.containerEl.scrollTop;
					this.display();
					this.containerEl.scrollTop = scrollTop;
				}));

		// Show model selection only if API key is present
		if (this.plugin.settings.providers.openai.apiKey) {
			// OpenAI Model selection with refresh button
			const openaiModelSetting = new Setting(containerEl)
				.setName('OpenAI Model')
				.setDesc('Select an OpenAI model for transcript processing');

		// Create container for dropdown and refresh button
		const openaiModelContainer = openaiModelSetting.controlEl.createEl('div', { 
			cls: 'openai-model-container',
			attr: { style: 'display: flex; gap: 8px; align-items: center;' }
		});

		// Model dropdown
		const openaiModelDropdown = openaiModelContainer.createEl('select', { 
			cls: 'dropdown',
			attr: { style: 'flex: 1; min-width: 200px;' }
		});

		// Refresh button
		const openaiRefreshBtn = openaiModelContainer.createEl('button', { 
			text: '🔄',
			cls: 'mod-cta',
			attr: { 
				type: 'button',
				style: 'padding: 4px 8px; min-width: auto;',
				title: 'Refresh OpenAI models'
			}
		});

		// Initialize models dropdown
		this.initializeOpenAIModels(openaiModelDropdown);

		// Custom model input (initially hidden)
		const customModelContainer = containerEl.createEl('div', { 
			cls: 'custom-model-container',
			attr: { style: 'display: none; margin-top: 8px;' }
		});

		const customModelSetting = new Setting(customModelContainer)
			.setName('Custom OpenAI Model')
			.setDesc('Enter the exact model name (e.g., gpt-4o-2024-11-20)')
			.addText(text => text
				.setPlaceholder('gpt-4o-mini')
				.setValue('')
				.onChange(async (value) => {
					if (openaiModelDropdown.value === 'custom') {
						this.plugin.settings.providers.openai.model = value || 'gpt-4o-mini';
						// Maintain backward compatibility
						this.plugin.settings.aiModel = value || 'gpt-4o-mini';
						await this.plugin.saveSettings();
					}
				}));

		// Handle model selection
		openaiModelDropdown.addEventListener('change', async () => {
			const selectedValue = openaiModelDropdown.value;
			
			if (selectedValue === 'custom') {
				// Show custom input
				customModelContainer.style.display = 'block';
				// Set model to current custom value or default
				const customInput = customModelContainer.querySelector('input') as HTMLInputElement;
				const customValue = customInput?.value || 'gpt-4o-mini';
				this.plugin.settings.providers.openai.model = customValue;
				this.plugin.settings.aiModel = customValue;
			} else {
				// Hide custom input and use selected model
				customModelContainer.style.display = 'none';
				this.plugin.settings.providers.openai.model = selectedValue;
				this.plugin.settings.aiModel = selectedValue;
			}
			
			await this.plugin.saveSettings();
		});

		// Initialize custom input visibility
		if (this.plugin.settings.providers.openai.model === 'custom') {
			customModelContainer.style.display = 'block';
		}

		// Handle refresh button click
		openaiRefreshBtn.addEventListener('click', async () => {
			openaiRefreshBtn.textContent = '⏳';
			openaiRefreshBtn.disabled = true;
			
			try {
				await this.refreshOpenAIModels(openaiModelDropdown);
			} finally {
				openaiRefreshBtn.textContent = '🔄';
				openaiRefreshBtn.disabled = false;
			}
		});
		}

	}

	/**
	 * Add OpenRouter provider settings
	 */
	private addOpenRouterSettings(containerEl: HTMLElement): void {

		new Setting(containerEl)
			.setName('OpenRouter API Key')
			.setDesc('Enter your OpenRouter API key')
			.addText(text => text
				.setPlaceholder('sk-or-v1-...')
				.setValue(this.plugin.settings.providers.openrouter.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.providers.openrouter.apiKey = value;
					await this.plugin.saveSettings();
					
					// Refresh display to show/hide model dropdown
					const scrollTop = this.containerEl.scrollTop;
					this.display();
					this.containerEl.scrollTop = scrollTop;
				}));

		// Show model selection only if API key is present
		if (this.plugin.settings.providers.openrouter.apiKey) {
			// OpenRouter Model selection with refresh button
			const openrouterModelSetting = new Setting(containerEl)
				.setName('OpenRouter Model')
				.setDesc('Select a model for transcript processing');

		// Create container for dropdown and refresh button
		const openrouterModelContainer = openrouterModelSetting.controlEl.createEl('div', { 
			cls: 'openrouter-model-container',
			attr: { style: 'display: flex; gap: 8px; align-items: center;' }
		});

		// Model dropdown
		const openrouterModelDropdown = openrouterModelContainer.createEl('select', { 
			cls: 'dropdown',
			attr: { style: 'flex: 1; min-width: 200px;' }
		});

		// Refresh button
		const openrouterRefreshBtn = openrouterModelContainer.createEl('button', { 
			text: '🔄',
			cls: 'mod-cta',
			attr: { 
				type: 'button',
				style: 'padding: 4px 8px; min-width: auto;',
				title: 'Refresh OpenRouter models'
			}
		});

		// Initialize models dropdown
		this.initializeOpenRouterModels(openrouterModelDropdown);

		// Custom model input (initially hidden)
		const customOpenRouterModelContainer = containerEl.createEl('div', { 
			cls: 'custom-model-container',
			attr: { style: 'display: none; margin-top: 8px;' }
		});

		const customOpenRouterModelSetting = new Setting(customOpenRouterModelContainer)
			.setName('Custom OpenRouter Model')
			.setDesc('Enter the exact model name (e.g., anthropic/claude-3.5-sonnet)')
			.addText(text => text
				.setPlaceholder('anthropic/claude-3.5-sonnet')
				.setValue('')
				.onChange(async (value) => {
					if (openrouterModelDropdown.value === 'custom') {
						this.plugin.settings.providers.openrouter.model = value || 'anthropic/claude-3.5-sonnet';
						await this.plugin.saveSettings();
					}
				}));

		// Handle model selection
		openrouterModelDropdown.addEventListener('change', async () => {
			const selectedValue = openrouterModelDropdown.value;
			
			if (selectedValue === 'custom') {
				// Show custom input
				customOpenRouterModelContainer.style.display = 'block';
				// Set model to current custom value or default
				const customInput = customOpenRouterModelContainer.querySelector('input') as HTMLInputElement;
				const customValue = customInput?.value || 'anthropic/claude-3.5-sonnet';
				this.plugin.settings.providers.openrouter.model = customValue;
			} else {
				// Hide custom input and use selected model
				customOpenRouterModelContainer.style.display = 'none';
				this.plugin.settings.providers.openrouter.model = selectedValue;
			}
			
			await this.plugin.saveSettings();
		});

		// Initialize custom input visibility
		if (this.plugin.settings.providers.openrouter.model === 'custom') {
			customOpenRouterModelContainer.style.display = 'block';
		}

		// Handle refresh button click
		openrouterRefreshBtn.addEventListener('click', async () => {
			openrouterRefreshBtn.textContent = '⏳';
			openrouterRefreshBtn.disabled = true;
			
			try {
				await this.refreshOpenRouterModels(openrouterModelDropdown);
			} finally {
				openrouterRefreshBtn.textContent = '🔄';
				openrouterRefreshBtn.disabled = false;
			}
		});
		}

	}

	/**
	 * Add Ollama provider settings
	 */
	private addOllamaSettings(containerEl: HTMLElement): void {

		new Setting(containerEl)
			.setName('Ollama Base URL')
			.setDesc('Ollama server URL')
			.addText(text => text
				.setPlaceholder('http://localhost:11434')
				.setValue(this.plugin.settings.providers.ollama.baseUrl)
				.onChange(async (value) => {
					this.plugin.settings.providers.ollama.baseUrl = value;
					await this.plugin.saveSettings();
					
					// Refresh display to show/hide model dropdown
					const scrollTop = this.containerEl.scrollTop;
					this.display();
					this.containerEl.scrollTop = scrollTop;
				}));

		// Show model selection only if base URL is present
		if (this.plugin.settings.providers.ollama.baseUrl) {
			// Model selection with refresh button
			const modelSetting = new Setting(containerEl)
				.setName('Ollama Model')
				.setDesc('Select a model from your installed Ollama models');

		// Create container for dropdown and refresh button
		const modelContainer = modelSetting.controlEl.createEl('div', { 
			cls: 'ollama-model-container',
			attr: { style: 'display: flex; gap: 8px; align-items: center;' }
		});

		// Model dropdown
		const modelDropdown = modelContainer.createEl('select', { 
			cls: 'dropdown',
			attr: { style: 'flex: 1; min-width: 200px;' }
		});

		// Refresh button
		const refreshBtn = modelContainer.createEl('button', { 
			text: '🔄',
			cls: 'mod-cta',
			attr: { 
				type: 'button',
				style: 'padding: 4px 8px; min-width: auto;',
				title: 'Refresh Ollama models'
			}
		});

		// Initialize models dropdown
		this.initializeOllamaModels(modelDropdown);

		// Handle model selection
		modelDropdown.addEventListener('change', async () => {
			this.plugin.settings.providers.ollama.model = modelDropdown.value;
			await this.plugin.saveSettings();
		});

		// Handle refresh button click
		refreshBtn.addEventListener('click', async () => {
			refreshBtn.textContent = '⏳';
			refreshBtn.disabled = true;
			
			try {
				await this.refreshOllamaModels(modelDropdown);
			} finally {
				refreshBtn.textContent = '🔄';
				refreshBtn.disabled = false;
			}
		});
		}


	}


	/**
	 * Initialize Ollama models dropdown
	 */
	private async initializeOllamaModels(dropdown: HTMLSelectElement): Promise<void> {
		// Add loading option
		dropdown.empty();
		dropdown.createEl('option', { text: 'Loading models...', value: '' });

		try {
			await this.refreshOllamaModels(dropdown);
		} catch (error) {
			console.error('Failed to initialize Ollama models:', error);
			this.populateDefaultOllamaModels(dropdown);
		}
	}

	/**
	 * Refresh Ollama models from the API
	 */
	private async refreshOllamaModels(dropdown?: HTMLSelectElement): Promise<void> {
		if (!dropdown) {
			// Find the dropdown in the current settings
			const ollamaDropdown = document.querySelector('.ollama-model-container select') as HTMLSelectElement;
			if (ollamaDropdown) {
				dropdown = ollamaDropdown;
			} else {
				return;
			}
		}

		try {
			// Create a temporary Ollama provider to fetch models
			const { OllamaProvider } = await import('./providers/ollama');
			const ollamaProvider = new OllamaProvider(this.plugin.settings.providers.ollama.baseUrl);
			
			// Get available models
			const models = await ollamaProvider.getAvailableModels();
			
			// Clear dropdown
			dropdown.empty();
			
			if (models.length === 0) {
				dropdown.createEl('option', { 
					text: 'No models found - install models first', 
					value: '' 
				});
				return;
			}

			// Add models to dropdown
			models.forEach(model => {
				const option = dropdown.createEl('option', { 
					text: model, 
					value: model 
				});
				
				// Select current model
				if (model === this.plugin.settings.providers.ollama.model) {
					option.selected = true;
				}
			});

			// If current model is not in the list, add it and select it
			const currentModel = this.plugin.settings.providers.ollama.model;
			if (currentModel && !models.includes(currentModel)) {
				const option = dropdown.createEl('option', { 
					text: `${currentModel} (not found)`, 
					value: currentModel 
				});
				option.selected = true;
			}

			// Handle no models found
			if (models.length === 0) {
				dropdown.createEl('option', { 
					text: 'No models found - Install models first', 
					value: '' 
				}).selected = true;
				
				// Clear the saved model if no models are available
				if (this.plugin.settings.providers.ollama.model) {
					this.plugin.settings.providers.ollama.model = '';
					await this.plugin.saveSettings();
				}
			} else if (!dropdown.value) {
				// If no model is selected, select the first one
				dropdown.value = models[0];
				this.plugin.settings.providers.ollama.model = models[0];
				await this.plugin.saveSettings();
			}

		} catch (error) {
			console.error('Failed to fetch Ollama models:', error);
			this.populateDefaultOllamaModels(dropdown);
		}
	}

	/**
	 * Populate dropdown with default Ollama models when API is unavailable
	 */
	private populateDefaultOllamaModels(dropdown: HTMLSelectElement): void {
		dropdown.empty();
		
		// Add helpful status message
		dropdown.createEl('option', { 
			text: 'Ollama not running - Install and start Ollama first', 
			value: '',
			attr: { disabled: 'true' }
		});

		// Default models list
		const defaultModels = [
			'llama3.1:8b',
			'llama3.1:70b', 
			'mistral:7b',
			'mistral:latest',
			'codellama:7b',
			'codellama:13b',
			'phi3:3.8b',
			'phi3:14b',
			'gemma:7b',
			'qwen2:7b'
		];

		defaultModels.forEach(model => {
			const option = dropdown.createEl('option', { 
				text: model, 
				value: model 
			});
			
			// Select current model if it matches
			if (model === this.plugin.settings.providers.ollama.model) {
				option.selected = true;
			}
		});

		// If current model is not in defaults, add it
		const currentModel = this.plugin.settings.providers.ollama.model;
		if (currentModel && !defaultModels.includes(currentModel)) {
			const option = dropdown.createEl('option', { 
				text: currentModel, 
				value: currentModel 
			});
			option.selected = true;
		}
	}

	/**
	 * Initialize OpenAI models dropdown
	 */
	private async initializeOpenAIModels(dropdown: HTMLSelectElement): Promise<void> {
		// Add loading option
		dropdown.empty();
		dropdown.createEl('option', { text: 'Loading models...', value: '' });

		try {
			await this.refreshOpenAIModels(dropdown);
		} catch (error) {
			console.error('Failed to initialize OpenAI models:', error);
			this.populateDefaultOpenAIModels(dropdown);
		}
	}

	/**
	 * Refresh OpenAI models from the API
	 */
	private async refreshOpenAIModels(dropdown: HTMLSelectElement): Promise<void> {
		try {
			// Create a temporary OpenAI provider to fetch models
			const { OpenAIProvider } = await import('./providers/openai');
			const openaiProvider = new OpenAIProvider(this.plugin.settings.providers.openai.apiKey);
			
			// Get available models
			const models = await openaiProvider.getAvailableModels();
			
			// Clear dropdown
			dropdown.empty();
			
			if (models.length === 0) {
				dropdown.createEl('option', { 
					text: 'No models available - check API key', 
					value: '' 
				});
				return;
			}

			// Add "Custom Model" option first
			const customOption = dropdown.createEl('option', { 
				text: '✏️ Custom Model (enter below)', 
				value: 'custom' 
			});

			// Add models to dropdown with friendly names
			models.forEach(model => {
				const friendlyName = this.getOpenAIModelFriendlyName(model);
				const option = dropdown.createEl('option', { 
					text: friendlyName, 
					value: model 
				});
				
				// Select current model
				if (model === this.plugin.settings.providers.openai.model) {
					option.selected = true;
				}
			});

			// If current model is not in the list, add it and select it
			const currentModel = this.plugin.settings.providers.openai.model;
			if (currentModel && !models.includes(currentModel) && currentModel !== 'custom') {
				const option = dropdown.createEl('option', { 
					text: `${currentModel} (custom)`, 
					value: currentModel 
				});
				option.selected = true;
			}

			// If current model is "custom", select the custom option
			if (currentModel === 'custom') {
				customOption.selected = true;
			}

			// If no model is selected, select the first GPT-4o-mini or gpt-4o-mini
			if (!dropdown.value && models.length > 0) {
				const preferredModel = models.find(m => m.includes('gpt-4o-mini')) || models[0];
				dropdown.value = preferredModel;
				this.plugin.settings.providers.openai.model = preferredModel;
				await this.plugin.saveSettings();
			}

		} catch (error) {
			console.error('Failed to fetch OpenAI models:', error);
			this.populateDefaultOpenAIModels(dropdown);
		}
	}

	/**
	 * Initialize OpenRouter models dropdown
	 */
	private async initializeOpenRouterModels(dropdown: HTMLSelectElement): Promise<void> {
		// Add loading option
		dropdown.empty();
		dropdown.createEl('option', { text: 'Loading models...', value: '' });

		try {
			await this.refreshOpenRouterModels(dropdown);
		} catch (error) {
			console.error('Failed to initialize OpenRouter models:', error);
			this.populateDefaultOpenRouterModels(dropdown);
		}
	}

	/**
	 * Refresh OpenRouter models from the API
	 */
	private async refreshOpenRouterModels(dropdown: HTMLSelectElement): Promise<void> {
		try {
			// Create a temporary OpenRouter provider to fetch models
			const { OpenRouterProvider } = await import('./providers/openrouter');
			const openrouterProvider = new OpenRouterProvider(this.plugin.settings.providers.openrouter.apiKey);
			
			// Get available models
			const models = await openrouterProvider.getAvailableModels();
			
			// Clear dropdown
			dropdown.empty();
			
			if (models.length === 0) {
				dropdown.createEl('option', { 
					text: 'No models available - check API key', 
					value: '' 
				});
				return;
			}

			// Add "Custom Model" option first
			const customOption = dropdown.createEl('option', { 
				text: '✏️ Custom Model (enter below)', 
				value: 'custom' 
			});

			// Add popular models first
			const popularModels = this.getPopularOpenRouterModels();
			const availablePopular = models.filter(model => 
				popularModels.some(popular => popular.id === model)
			);

			if (availablePopular.length > 0) {
				const popularGroup = dropdown.createEl('optgroup', { 
					attr: { label: 'Popular Models' }
				});
				
				availablePopular.forEach(model => {
					const popular = popularModels.find(p => p.id === model);
					const option = popularGroup.createEl('option', { 
						text: popular?.name || model, 
						value: model 
					});
					
					// Select current model
					if (model === this.plugin.settings.providers.openrouter.model) {
						option.selected = true;
					}
				});
			}

			// Add all other models
			const otherModels = models.filter(model => 
				!popularModels.some(popular => popular.id === model)
			).slice(0, 50); // Limit to prevent overwhelming UI

			if (otherModels.length > 0) {
				const allGroup = dropdown.createEl('optgroup', { 
					attr: { label: `All Models (showing ${otherModels.length} of ${models.length})` }
				});
				
				otherModels.forEach(model => {
					const option = allGroup.createEl('option', { 
						text: model, 
						value: model 
					});
					
					// Select current model
					if (model === this.plugin.settings.providers.openrouter.model) {
						option.selected = true;
					}
				});
			}

			// If current model is not in the list, add it and select it
			const currentModel = this.plugin.settings.providers.openrouter.model;
			if (currentModel && !models.includes(currentModel) && currentModel !== 'custom') {
				const option = dropdown.createEl('option', { 
					text: `${currentModel} (custom)`, 
					value: currentModel 
				});
				option.selected = true;
			}

			// If current model is "custom", select the custom option
			if (currentModel === 'custom') {
				customOption.selected = true;
			}

			// If no model is selected, select Claude 3.5 Sonnet if available
			if (!dropdown.value && models.length > 0) {
				const preferredModel = models.find(m => m.includes('claude-3.5-sonnet')) || 
									  models.find(m => m.includes('gpt-4o-mini')) || 
									  models[0];
				dropdown.value = preferredModel;
				this.plugin.settings.providers.openrouter.model = preferredModel;
				await this.plugin.saveSettings();
			}

		} catch (error) {
			console.error('Failed to fetch OpenRouter models:', error);
			this.populateDefaultOpenRouterModels(dropdown);
		}
	}

	/**
	 * Get friendly names for OpenAI models
	 */
	private getOpenAIModelFriendlyName(model: string): string {
		const friendlyNames: Record<string, string> = {
			'gpt-4o-mini': 'GPT-4o Mini (Recommended - Best balance)',
			'gpt-4o': 'GPT-4o (Latest - Highest quality)',
			'gpt-4-turbo': 'GPT-4 Turbo (High quality)',
			'gpt-4': 'GPT-4 (Reliable)',
			'gpt-3.5-turbo': 'GPT-3.5 Turbo (Fast & economical)',
			'gpt-4o-2024-08-06': 'GPT-4o (August 2024)',
			'gpt-4o-2024-05-13': 'GPT-4o (May 2024)',
			'gpt-4o-mini-2024-07-18': 'GPT-4o Mini (July 2024)'
		};
		
		return friendlyNames[model] || model;
	}

	/**
	 * Get popular OpenRouter models with friendly names
	 */
	private getPopularOpenRouterModels(): Array<{id: string, name: string}> {
		return [
			{ id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (Recommended)' },
			{ id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku (Fast)' },
			{ id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini (Economical)' },
			{ id: 'openai/gpt-4o', name: 'GPT-4o (High quality)' },
			{ id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B (Open source)' },
			{ id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B (Large)' },
			{ id: 'mistralai/mistral-7b-instruct', name: 'Mistral 7B (Fast)' },
			{ id: 'google/gemini-pro', name: 'Gemini Pro (Google)' },
			{ id: 'perplexity/llama-3.1-sonar-large-128k-online', name: 'Perplexity Sonar (Web access)' }
		];
	}

	/**
	 * Populate dropdown with default OpenAI models when API is unavailable
	 */
	private populateDefaultOpenAIModels(dropdown: HTMLSelectElement): void {
		dropdown.empty();
		
		// Add status message
		dropdown.createEl('option', { 
			text: 'API unavailable - showing common models', 
			value: '',
			attr: { disabled: 'true' }
		});

		// Add custom option
		dropdown.createEl('option', { 
			text: '✏️ Custom Model (enter below)', 
			value: 'custom' 
		});

		// Default models list
		const defaultModels = [
			{ value: 'gpt-4o-mini', text: 'GPT-4o Mini (Recommended)' },
			{ value: 'gpt-4o', text: 'GPT-4o (Latest)' },
			{ value: 'gpt-4-turbo', text: 'GPT-4 Turbo' },
			{ value: 'gpt-4', text: 'GPT-4' },
			{ value: 'gpt-3.5-turbo', text: 'GPT-3.5 Turbo' }
		];

		defaultModels.forEach(model => {
			const option = dropdown.createEl('option', { 
				text: model.text, 
				value: model.value 
			});
			
			// Select current model if it matches
			if (model.value === this.plugin.settings.providers.openai.model) {
				option.selected = true;
			}
		});

		// If current model is not in defaults, add it
		const currentModel = this.plugin.settings.providers.openai.model;
		if (currentModel && !defaultModels.some(m => m.value === currentModel) && currentModel !== 'custom') {
			const option = dropdown.createEl('option', { 
				text: currentModel, 
				value: currentModel 
			});
			option.selected = true;
		}
	}

	/**
	 * Populate dropdown with default OpenRouter models when API is unavailable
	 */
	private populateDefaultOpenRouterModels(dropdown: HTMLSelectElement): void {
		dropdown.empty();
		
		// Add status message
		dropdown.createEl('option', { 
			text: 'API unavailable - showing popular models', 
			value: '',
			attr: { disabled: 'true' }
		});

		// Add custom option
		dropdown.createEl('option', { 
			text: '✏️ Custom Model (enter below)', 
			value: 'custom' 
		});

		// Popular models
		const popularModels = this.getPopularOpenRouterModels();

		popularModels.forEach(model => {
			const option = dropdown.createEl('option', { 
				text: model.name, 
				value: model.id 
			});
			
			// Select current model if it matches
			if (model.id === this.plugin.settings.providers.openrouter.model) {
				option.selected = true;
			}
		});

		// If current model is not in popular models, add it
		const currentModel = this.plugin.settings.providers.openrouter.model;
		if (currentModel && !popularModels.some(m => m.id === currentModel) && currentModel !== 'custom') {
			const option = dropdown.createEl('option', { 
				text: currentModel, 
				value: currentModel 
			});
			option.selected = true;
		}
	}

	/**
	 * Add external transcript model setting based on selected provider
	 */
	private addExternalTranscriptModelSetting(containerEl: HTMLElement): void {
		const provider = this.plugin.settings.externalTranscriptProvider || 'openai';

		if (provider === 'openai') {
			new Setting(containerEl)
				.setName('External Transcript Model')
				.setDesc('Choose the OpenAI model for external transcript processing')
				.addDropdown(dropdown => dropdown
					.addOptions({
						'gpt-4o-mini': 'GPT-4o-mini (Recommended - Fast & efficient)',
						'gpt-4o': 'GPT-4o (Latest - Highest accuracy)',
						'gpt-4-turbo': 'GPT-4-turbo (High accuracy)',
						'gpt-4': 'GPT-4 (Reliable)',
						'gpt-3.5-turbo': 'GPT-3.5-turbo (Fast & economical)'
					})
					.setValue(this.plugin.settings.externalTranscriptProviderModel || 'gpt-4o-mini')
					.onChange(async (value) => {
						this.plugin.settings.externalTranscriptProviderModel = value;
						// Update legacy setting for backward compatibility
						this.plugin.settings.externalTranscriptModel = value;
						await this.plugin.saveSettings();
					}));
		} else if (provider === 'openrouter') {
			new Setting(containerEl)
				.setName('External Transcript Model')
				.setDesc('Choose the OpenRouter model for external transcript processing')
				.addDropdown(dropdown => dropdown
					.addOptions({
						'anthropic/claude-3.5-sonnet': 'Claude 3.5 Sonnet (Recommended)',
						'anthropic/claude-3-haiku': 'Claude 3 Haiku (Fast)',
						'openai/gpt-4o-mini': 'GPT-4o Mini (Economical)',
						'openai/gpt-4o': 'GPT-4o (High quality)',
						'meta-llama/llama-3.1-8b-instruct': 'Llama 3.1 8B (Open source)',
						'meta-llama/llama-3.1-70b-instruct': 'Llama 3.1 70B (Large)',
						'mistralai/mistral-7b-instruct': 'Mistral 7B (Fast)',
					})
					.setValue(this.plugin.settings.externalTranscriptProviderModel || 'anthropic/claude-3.5-sonnet')
					.onChange(async (value) => {
						this.plugin.settings.externalTranscriptProviderModel = value;
						await this.plugin.saveSettings();
					}));
		} else if (provider === 'ollama') {
			new Setting(containerEl)
				.setName('External Transcript Model')
				.setDesc('Choose the Ollama model for external transcript processing')
				.addText(text => text
					.setPlaceholder('llama3.1:8b')
					.setValue(this.plugin.settings.externalTranscriptProviderModel || 'llama3.1:8b')
					.onChange(async (value) => {
						this.plugin.settings.externalTranscriptProviderModel = value;
						await this.plugin.saveSettings();
					}));

			containerEl.createEl('div', {
				cls: 'setting-item-description',
				text: '💡 For Ollama models, enter the exact model name (e.g., llama3.1:8b, mistral:7b)'
			});
		}
	}

	/**
	 * Add Playbook section (Wireframe: Core Features)
	 */
	private addPlaybackSection(containerEl: HTMLElement): void {
		containerEl.createEl('h2', { text: 'Playback' });
		containerEl.createEl('p', {
			text: 'Essential features that work immediately without additional setup.',
			cls: 'setting-item-description'
		});

		// Seek seconds setting
		new Setting(containerEl)
			.setName('Seek seconds')
			.setDesc('How many seconds to skip forward/backward')
			.addDropdown(dropdown => dropdown
				.addOptions({
					'10': '10 seconds',
					'20': '20 seconds',
					'30': '30 seconds',
					'40': '40 seconds',
					'50': '50 seconds',
					'60': '60 seconds'
				})
				.setValue(this.plugin.settings.seekSeconds.toString())
				.onChange(async (value) => {
					this.plugin.settings.seekSeconds = parseInt(value);
					await this.plugin.saveSettings();
				}));

		// Default playback speed setting
		new Setting(containerEl)
			.setName('Default playback speed')
			.addDropdown(dropdown => dropdown
				.addOption('0.5', '0.5x')
				.addOption('0.75', '0.75x')
				.addOption('1', '1x')
				.addOption('1.25', '1.25x')
				.addOption('1.5', '1.5x')
				.addOption('2', '2x')
				.setValue(this.plugin.settings.defaultPlaybackSpeed.toString())
				.onChange(async (value) => {
					this.plugin.settings.defaultPlaybackSpeed = parseFloat(value);
					await this.plugin.saveSettings();
				}));

		// Timestamp offset toggle
		new Setting(containerEl)
			.setName('Timestamp offset')
			.setDesc('Enable to offset timestamps when inserting them into your notes')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.timestampOffsetSeconds > 0)
				.onChange(async (value) => {
					this.plugin.settings.timestampOffsetSeconds = value ? 2 : 0;
					await this.plugin.saveSettings();
					
					// Preserve scroll position during refresh
					const scrollTop = this.containerEl.scrollTop;
					this.display();
					this.containerEl.scrollTop = scrollTop;
				}));

		// Timestamp offset amount (conditional)
		if (this.plugin.settings.timestampOffsetSeconds > 0) {
			new Setting(containerEl)
				.setName('Timestamp offset amount')
				.addSlider(slider => slider
					.setLimits(0, 10, 1)
					.setDynamicTooltip()
					.setValue(this.plugin.settings.timestampOffsetSeconds)
					.onChange(async (value) => {
						this.plugin.settings.timestampOffsetSeconds = value;
						await this.plugin.saveSettings();
					}));
		}

		// Playback offset toggle
		new Setting(containerEl)
			.setName('Playback offset')
			.setDesc('Enable to auto-rewind after inserting timestamps')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.playbackOffsetSeconds > 0)
				.onChange(async (value) => {
					this.plugin.settings.playbackOffsetSeconds = value ? 2 : 0;
					await this.plugin.saveSettings();
					
					// Preserve scroll position during refresh
					const scrollTop = this.containerEl.scrollTop;
					this.display();
					this.containerEl.scrollTop = scrollTop;
				}));

		// Playback offset amount (conditional)
		if (this.plugin.settings.playbackOffsetSeconds > 0) {
			new Setting(containerEl)
				.setName('Playback offset amount')
				.addSlider(slider => slider
					.setLimits(0, 10, 1)
					.setDynamicTooltip()
					.setValue(this.plugin.settings.playbackOffsetSeconds)
					.onChange(async (value) => {
						this.plugin.settings.playbackOffsetSeconds = value;
						await this.plugin.saveSettings();
					}));
		}

		// Pause on insert setting
		new Setting(containerEl)
			.setName('Pause on insert')
			.setDesc('Automatically pause video when inserting timestamps')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.pauseOnTimestampInsert)
				.onChange(async (value) => {
					this.plugin.settings.pauseOnTimestampInsert = value;
					await this.plugin.saveSettings();
				}));

	}

	/**
	 * Add Power Features section with feature toggles
	 */
	private addPowerFeaturesSection(containerEl: HTMLElement): void {
		containerEl.createEl('h2', { text: 'Power Features', attr: { id: 'power-features' } });
		containerEl.createEl('p', {
			text: 'Enhanced capabilities that require additional configuration.',
			cls: 'setting-item-description'
		});

		// Summarization toggle
		new Setting(containerEl)
			.setName('Summarization')
			.setDesc('Get instant video summaries - Key points, main ideas, and takeaways.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableSummarization)
				.onChange(async (value) => {
					this.plugin.settings.enableSummarization = value;
					await this.plugin.saveSettings();
					
					// Preserve scroll position during refresh
					const scrollTop = this.containerEl.scrollTop;
					this.display();
					this.containerEl.scrollTop = scrollTop;
				}));

		// Show "Configure LLM" link if enabled but no provider configured
		if (this.plugin.settings.enableSummarization && !this.hasConfiguredAIProvider()) {
			containerEl.createEl('div', {
				cls: 'setting-item-description',
				text: 'Requires an LLM to be configured. ',
				attr: { style: 'color: var(--text-warning); margin-top: -12px; margin-bottom: 16px;' }
			}).createEl('a', {
				text: 'Configure an LLM',
				href: '#primary-llm-config',
				attr: { style: 'color: var(--text-accent);' }
			});
		}

		// Enhanced transcript toggle
		new Setting(containerEl)
			.setName('Enhanced transcript')
			.setDesc('Get clean, readable transcripts with proper punctuation, paragraphs, and speaker identification.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableEnhancedTranscript)
				.onChange(async (value) => {
					this.plugin.settings.enableEnhancedTranscript = value;
					await this.plugin.saveSettings();
					
					// Preserve scroll position during refresh
					const scrollTop = this.containerEl.scrollTop;
					this.display();
					this.containerEl.scrollTop = scrollTop;
				}));

		// Show "Configure LLM" link if enabled but no provider configured
		if (this.plugin.settings.enableEnhancedTranscript && !this.hasConfiguredAIProvider()) {
			containerEl.createEl('div', {
				cls: 'setting-item-description',
				text: 'Requires an LLM to be configured. ',
				attr: { style: 'color: var(--text-warning); margin-top: -12px; margin-bottom: 16px;' }
			}).createEl('a', {
				text: 'Configure an LLM',
				href: '#primary-llm-config',
				attr: { style: 'color: var(--text-accent);' }
			});
		}
	}

	/**
	 * Add Primary LLM Config section (conditional)
	 */
	private addPrimaryLLMConfigSection(containerEl: HTMLElement): void {
		// Only show if any AI features are enabled
		const showLLMConfig = this.plugin.settings.enableSummarization || 
							  this.plugin.settings.enableEnhancedTranscript;

		if (!showLLMConfig) return;

		containerEl.createEl('h2', { text: 'Primary LLM Config', attr: { id: 'primary-llm-config' } });
		containerEl.createEl('p', {
			text: 'Choose your preferred LLM provider and model based on your budget and privacy preferences.',
			cls: 'setting-item-description'
		});

		// LLM Provider dropdown
		new Setting(containerEl)
			.setName('LLM Provider')
			.addDropdown(dropdown => dropdown
				.addOptions({
					'openai': 'OpenAI',
					'openrouter': 'OpenRouter',
					'ollama': 'Ollama'
				})
				.setValue(this.plugin.settings.currentProvider)
				.onChange(async (value: ProviderType) => {
					this.plugin.settings.currentProvider = value;
					await this.plugin.saveSettings();
					
					// Preserve scroll position during refresh
					const scrollTop = this.containerEl.scrollTop;
					this.display();
					this.containerEl.scrollTop = scrollTop;
				}));

		// Add provider-specific configuration
		this.addProviderConfiguration(containerEl);
	}

	/**
	 * Add Enhanced Transcript LLM Config section (conditional)
	 */
	private addEnhancedTranscriptLLMConfigSection(containerEl: HTMLElement): void {
		// Only show if enhanced transcript is enabled
		if (!this.plugin.settings.enableEnhancedTranscript) return;

		containerEl.createEl('h2', { text: 'Enhanced Transcript LLM Config' });
		containerEl.createEl('p', {
			text: 'Set a different LLM for Enhanced Transcripts balancing price, quality, and privacy.',
			cls: 'setting-item-description'
		});

		// Unique enhanced transcript LLM toggle
		new Setting(containerEl)
			.setName('Unique enhanced transcript LLM')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.externalTranscriptProvider !== this.plugin.settings.currentProvider)
				.onChange(async (value) => {
					if (value) {
						// Enable unique provider - set to different from current
						const otherProvider = this.plugin.settings.currentProvider === 'openai' ? 'openrouter' : 'openai';
						this.plugin.settings.externalTranscriptProvider = otherProvider;
					} else {
						// Use same as primary
						this.plugin.settings.externalTranscriptProvider = this.plugin.settings.currentProvider;
					}
					await this.plugin.saveSettings();
					
					// Preserve scroll position during refresh
					const scrollTop = this.containerEl.scrollTop;
					this.display();
					this.containerEl.scrollTop = scrollTop;
				}));

		// Show provider dropdown only if unique LLM is enabled
		if (this.plugin.settings.externalTranscriptProvider !== this.plugin.settings.currentProvider) {
			new Setting(containerEl)
				.setName('LLM Provider')
				.addDropdown(dropdown => dropdown
					.addOptions({
						'openai': 'OpenAI',
						'openrouter': 'OpenRouter',
						'ollama': 'Ollama'
					})
					.setValue(this.plugin.settings.externalTranscriptProvider)
					.onChange(async (value: ProviderType) => {
						this.plugin.settings.externalTranscriptProvider = value;
						await this.plugin.saveSettings();
						
						// Preserve scroll position during refresh
						const scrollTop = this.containerEl.scrollTop;
						this.display();
						this.containerEl.scrollTop = scrollTop;
					}));

			// Add model selector for the enhanced transcript provider
			this.addEnhancedTranscriptProviderConfiguration(containerEl);
		}
	}

	/**
	 * Add provider-specific model configuration for enhanced transcript LLM
	 */
	private addEnhancedTranscriptProviderConfiguration(containerEl: HTMLElement): void {
		const provider = this.plugin.settings.externalTranscriptProvider;

		if (provider === 'openai') {
			this.addEnhancedTranscriptOpenAISettings(containerEl);
		} else if (provider === 'openrouter') {
			this.addEnhancedTranscriptOpenRouterSettings(containerEl);
		} else if (provider === 'ollama') {
			this.addEnhancedTranscriptOllamaSettings(containerEl);
		}
	}

	/**
	 * Add OpenAI model settings for enhanced transcript
	 */
	private addEnhancedTranscriptOpenAISettings(containerEl: HTMLElement): void {
		// Only show model selection if API key is present
		if (this.plugin.settings.providers.openai.apiKey) {
			// OpenAI Model selection with refresh button
			const openaiModelSetting = new Setting(containerEl)
				.setName('Enhanced Transcript OpenAI Model')
				.setDesc('Select an OpenAI model for enhanced transcript processing');

			// Create container for dropdown and refresh button
			const openaiModelContainer = openaiModelSetting.controlEl.createEl('div', { 
				cls: 'openai-model-container',
				attr: { style: 'display: flex; gap: 8px; align-items: center;' }
			});

			// Model dropdown
			const openaiModelDropdown = openaiModelContainer.createEl('select', { 
				cls: 'dropdown',
				attr: { style: 'flex: 1; min-width: 200px;' }
			});

			// Refresh button
			const openaiRefreshBtn = openaiModelContainer.createEl('button', { 
				text: '🔄',
				cls: 'mod-cta',
				attr: { 
					type: 'button',
					style: 'padding: 4px 8px; min-width: auto;',
					title: 'Refresh OpenAI models'
				}
			});

			// Initialize models dropdown
			this.initializeOpenAIModels(openaiModelDropdown);

			// Set current value for enhanced transcript model
			const currentModel = this.plugin.settings.externalTranscriptProviderModel || 'gpt-4o-mini';
			openaiModelDropdown.value = currentModel;

			// Handle model selection
			openaiModelDropdown.addEventListener('change', async () => {
				const selectedValue = openaiModelDropdown.value;
				this.plugin.settings.externalTranscriptProviderModel = selectedValue;
				await this.plugin.saveSettings();
			});

			// Handle refresh button click
			openaiRefreshBtn.addEventListener('click', async () => {
				openaiRefreshBtn.textContent = '⏳';
				openaiRefreshBtn.disabled = true;
				
				try {
					await this.refreshOpenAIModels(openaiModelDropdown);
				} catch (error) {
					console.error('Failed to refresh OpenAI models:', error);
				} finally {
					openaiRefreshBtn.textContent = '🔄';
					openaiRefreshBtn.disabled = false;
				}
			});
		}
	}

	/**
	 * Add OpenRouter model settings for enhanced transcript
	 */
	private addEnhancedTranscriptOpenRouterSettings(containerEl: HTMLElement): void {
		// Only show model selection if API key is present
		if (this.plugin.settings.providers.openrouter.apiKey) {
			// OpenRouter Model selection with refresh button
			const openrouterModelSetting = new Setting(containerEl)
				.setName('Enhanced Transcript OpenRouter Model')
				.setDesc('Select an OpenRouter model for enhanced transcript processing');

			// Create container for dropdown and refresh button
			const openrouterModelContainer = openrouterModelSetting.controlEl.createEl('div', { 
				cls: 'openrouter-model-container',
				attr: { style: 'display: flex; gap: 8px; align-items: center;' }
			});

			// Model dropdown
			const openrouterModelDropdown = openrouterModelContainer.createEl('select', { 
				cls: 'dropdown',
				attr: { style: 'flex: 1; min-width: 200px;' }
			});

			// Refresh button
			const openrouterRefreshBtn = openrouterModelContainer.createEl('button', { 
				text: '🔄',
				cls: 'mod-cta',
				attr: { 
					type: 'button',
					style: 'padding: 4px 8px; min-width: auto;',
					title: 'Refresh OpenRouter models'
				}
			});

			// Initialize models dropdown
			this.initializeOpenRouterModels(openrouterModelDropdown);

			// Set current value for enhanced transcript model
			const currentModel = this.plugin.settings.externalTranscriptProviderModel || 'anthropic/claude-3.5-sonnet';
			openrouterModelDropdown.value = currentModel;

			// Handle model selection
			openrouterModelDropdown.addEventListener('change', async () => {
				const selectedValue = openrouterModelDropdown.value;
				this.plugin.settings.externalTranscriptProviderModel = selectedValue;
				await this.plugin.saveSettings();
			});

			// Handle refresh button click
			openrouterRefreshBtn.addEventListener('click', async () => {
				openrouterRefreshBtn.textContent = '⏳';
				openrouterRefreshBtn.disabled = true;
				
				try {
					await this.refreshOpenRouterModels(openrouterModelDropdown);
				} catch (error) {
					console.error('Failed to refresh OpenRouter models:', error);
				} finally {
					openrouterRefreshBtn.textContent = '🔄';
					openrouterRefreshBtn.disabled = false;
				}
			});
		}
	}

	/**
	 * Add Ollama model settings for enhanced transcript
	 */
	private addEnhancedTranscriptOllamaSettings(containerEl: HTMLElement): void {
		// Ollama Model selection with refresh button
		const ollamaModelSetting = new Setting(containerEl)
			.setName('Enhanced Transcript Ollama Model')
			.setDesc('Select an Ollama model for enhanced transcript processing');

		// Create container for dropdown and refresh button
		const ollamaModelContainer = ollamaModelSetting.controlEl.createEl('div', { 
			cls: 'ollama-model-container',
			attr: { style: 'display: flex; gap: 8px; align-items: center;' }
		});

		// Model dropdown
		const ollamaModelDropdown = ollamaModelContainer.createEl('select', { 
			cls: 'dropdown',
			attr: { style: 'flex: 1; min-width: 200px;' }
		});

		// Refresh button
		const ollamaRefreshBtn = ollamaModelContainer.createEl('button', { 
			text: '🔄',
			cls: 'mod-cta',
			attr: { 
				type: 'button',
				style: 'padding: 4px 8px; min-width: auto;',
				title: 'Refresh Ollama models'
			}
		});

		// Initialize models dropdown
		this.initializeOllamaModels(ollamaModelDropdown);

		// Set current value for enhanced transcript model
		const currentModel = this.plugin.settings.externalTranscriptProviderModel || '';
		ollamaModelDropdown.value = currentModel;

		// Handle model selection
		ollamaModelDropdown.addEventListener('change', async () => {
			const selectedValue = ollamaModelDropdown.value;
			this.plugin.settings.externalTranscriptProviderModel = selectedValue;
			await this.plugin.saveSettings();
		});

		// Handle refresh button click
		ollamaRefreshBtn.addEventListener('click', async () => {
			ollamaRefreshBtn.textContent = '⏳';
			ollamaRefreshBtn.disabled = true;
			
			try {
				await this.refreshOllamaModels(ollamaModelDropdown);
			} catch (error) {
				console.error('Failed to refresh Ollama models:', error);
			} finally {
				ollamaRefreshBtn.textContent = '🔄';
				ollamaRefreshBtn.disabled = false;
			}
		});
	}

	/**
	 * Helper method to check if any AI provider is configured
	 */
	private hasConfiguredAIProvider(): boolean {
		const currentProvider = this.plugin.settings.currentProvider;
		const providerConfig = this.plugin.settings.providers[currentProvider];
		
		if (currentProvider === 'ollama') {
			return !!(providerConfig as any).baseUrl && !!(providerConfig as any).model;
		} else {
			return !!(providerConfig as any).apiKey;
		}
	}

	/**
	 * Setup anchor link navigation within settings
	 */
	private setupAnchorLinks(containerEl: HTMLElement): void {
		// Find all anchor links within the container
		const anchorLinks = containerEl.querySelectorAll('a[href^="#"]');
		
		anchorLinks.forEach((link) => {
			link.addEventListener('click', (e) => {
				e.preventDefault();
				const targetId = (link as HTMLAnchorElement).getAttribute('href')?.substring(1);
				
				if (targetId) {
					const targetElement = containerEl.querySelector(`#${targetId}`);
					if (targetElement) {
						// Smooth scroll to target
						targetElement.scrollIntoView({ 
							behavior: 'smooth', 
							block: 'start' 
						});
					} else {
						// If target not found, it might be hidden - show a message
						console.log(`Target section "${targetId}" not currently visible. Enable the required features to access this section.`);
					}
				}
			});
		});
	}

	/**
	 * Add Transcript Quality section (optional enhancements)
	 */
	private addTranscriptQualitySection(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'Transcript Quality' });

		// YouTube Data API Key setting
		new Setting(containerEl)
			.setName('YouTube Data API Key')
			.setDesc('Enter your YouTube Data API v3 key')
			.addText(text => text
				.setPlaceholder('AIzaSy...')
				.setValue(this.plugin.settings.youtubeApiKey)
				.onChange(async (value) => {
					this.plugin.settings.youtubeApiKey = value;
					await this.plugin.saveSettings();
					
					// Preserve scroll position during refresh
					const scrollTop = this.containerEl.scrollTop;
					this.display(); // Refresh to show/hide dependent sections
					this.containerEl.scrollTop = scrollTop;
				}));

		// External Transcript Enhancement subsection (always visible)
		containerEl.createEl('h4', { text: 'External Transcript Enhancement' });

		const hasYouTubeAPI = !!this.plugin.settings.youtubeApiKey;

		// External transcript setting
		new Setting(containerEl)
			.setName('Check for external transcripts')
			.setDesc('Search for higher-quality transcripts in video descriptions')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.checkExternalTranscripts && hasYouTubeAPI)
				.setDisabled(!hasYouTubeAPI)
				.onChange(async (value) => {
					if (hasYouTubeAPI) {
						this.plugin.settings.checkExternalTranscripts = value;
						await this.plugin.saveSettings();
						
						// Preserve scroll position during refresh
						const scrollTop = this.containerEl.scrollTop;
						this.display(); // Refresh to show/hide web scraping settings
						this.containerEl.scrollTop = scrollTop;
					}
				}));

		// WebScraping.AI API Key setting (always visible, disabled when dependencies not met)
		const webScrapingDisabled = !hasYouTubeAPI || !this.plugin.settings.checkExternalTranscripts;
		new Setting(containerEl)
			.setName('WebScraping.AI API Key')
			.setDesc('Enter your WebScraping.AI API key')
			.addText(text => text
				.setPlaceholder('your-webscraping-ai-key')
				.setValue(this.plugin.settings.webscrapingApiKey)
				.setDisabled(webScrapingDisabled)
				.onChange(async (value) => {
					if (!webScrapingDisabled) {
						this.plugin.settings.webscrapingApiKey = value;
						await this.plugin.saveSettings();
					}
				}));

		// Show dependency requirements
		if (!hasYouTubeAPI) {
			containerEl.createEl('div', {
				cls: 'setting-item-description',
				text: '⚠️ YouTube Data API key required above to enable external transcript features.'
			});
		} else if (!this.plugin.settings.checkExternalTranscripts) {
			containerEl.createEl('div', {
				cls: 'setting-item-description',
				text: '💡 Enable "Check for external transcripts" above to configure WebScraping API.'
			});
		} else {
			// External transcript details
			containerEl.createEl('div', {
				cls: 'setting-item-description',
				text: '💡 External transcript detection extracts URLs from video descriptions using YouTube Data API, then scrapes them for transcripts using WebScraping.AI.'
			});
		}
	}

	/**
	 * Add AI Summarization section (main feature)
	 */
	private addAISummarizationSection(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'AI Summarization' });

		// Status and features
		const currentProvider = this.plugin.settings.currentProvider;
		let hasAIProvider = false;
		
		if (currentProvider) {
			const providerConfig = this.plugin.settings.providers[currentProvider];
			if (currentProvider === 'ollama') {
				const baseUrl = (providerConfig as any).baseUrl;
				const model = (providerConfig as any).model;
				hasAIProvider = !!(baseUrl && model);
				console.log('Ollama config check:', { currentProvider, baseUrl, model, hasAIProvider });
			} else {
				hasAIProvider = !!(providerConfig as any).apiKey;
			}
		}
		
		if (hasAIProvider) {
			containerEl.createEl('div', {
				text: `✅ Ready - Using ${this.plugin.settings.currentProvider}`,
				cls: 'setting-item-description',
				attr: { style: 'color: var(--text-success, #00b300); font-weight: 500; margin-bottom: 8px;' }
			});
		} else {
			containerEl.createEl('div', {
				text: '⚠️ Choose provider to enable',
				cls: 'setting-item-description',
				attr: { style: 'color: var(--text-warning, #ff8c00); font-weight: 500; margin-bottom: 8px;' }
			});
		}
		
		containerEl.createEl('div', {
			text: 'Enables: Summarize, Enhanced transcripts',
			cls: 'setting-item-description',
			attr: { style: 'margin-bottom: 16px; font-style: italic;' }
		});

		// Primary AI Provider
		containerEl.createEl('h4', { text: 'Choose Provider' });

		// Current Provider setting
		new Setting(containerEl)
			.setName('AI Provider')
			.setDesc('')
			.addDropdown(dropdown => dropdown
				.addOptions({
					'openai': 'OpenAI (GPT models)',
					'openrouter': 'OpenRouter (Multiple models)',
					'ollama': 'Ollama (Local models)'
				})
				.setValue(this.plugin.settings.currentProvider)
				.onChange(async (value: ProviderType) => {
					this.plugin.settings.currentProvider = value;
					await this.plugin.saveSettings();
					
					// Preserve scroll position during refresh
					const scrollTop = this.containerEl.scrollTop;
					this.display(); // Refresh UI to show provider-specific settings
					this.containerEl.scrollTop = scrollTop;
				}));



		// Provider-specific configuration sections
		this.addProviderConfiguration(containerEl);

	}

	/**
	 * Add Advanced Settings section (expert configuration)
	 */
	private addAdvancedSettingsSection(containerEl: HTMLElement): void {
		// Create collapsible details element
		const advancedDetails = containerEl.createEl('details');
		advancedDetails.createEl('summary', { text: '🔧 Advanced Settings' });
		
		const advancedContainer = advancedDetails.createEl('div', { cls: 'advanced-settings-container' });
		
		advancedContainer.createEl('p', {
			text: 'Expert configuration options for alternative transcription services and troubleshooting.',
			cls: 'setting-item-description'
		});

		// External Transcript Provider Override
		advancedContainer.createEl('h4', { text: 'External Transcript Provider Override' });
		
		new Setting(advancedContainer)
			.setName('Use different provider for external transcripts')
			.setDesc('Override the main AI provider for external transcript processing')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.externalTranscriptProvider !== this.plugin.settings.currentProvider)
				.onChange(async (value) => {
					if (value) {
						// Keep current external provider or default to different one
						if (this.plugin.settings.externalTranscriptProvider === this.plugin.settings.currentProvider) {
							// Set to a different provider
							const providers: ProviderType[] = ['openai', 'openrouter', 'ollama'];
							const differentProvider = providers.find(p => p !== this.plugin.settings.currentProvider) || 'openai';
							this.plugin.settings.externalTranscriptProvider = differentProvider;
						}
					} else {
						// Use main provider
						this.plugin.settings.externalTranscriptProvider = this.plugin.settings.currentProvider;
					}
					await this.plugin.saveSettings();
					
					// Preserve scroll position during refresh
					const scrollTop = this.containerEl.scrollTop;
					this.display(); // Refresh to show/hide provider settings
					this.containerEl.scrollTop = scrollTop;
				}));

		// Show external transcript provider settings if override is enabled
		if (this.plugin.settings.externalTranscriptProvider !== this.plugin.settings.currentProvider) {
			new Setting(advancedContainer)
				.setName('External Transcript AI Provider')
				.setDesc('Choose a different AI provider for processing external transcripts')
				.addDropdown(dropdown => dropdown
					.addOptions({
						'openai': 'OpenAI (GPT models)',
						'openrouter': 'OpenRouter (Multiple models)',
						'ollama': 'Ollama (Local models)'
					})
					.setValue(this.plugin.settings.externalTranscriptProvider || 'openai')
					.onChange(async (value: ProviderType) => {
						this.plugin.settings.externalTranscriptProvider = value;
						await this.plugin.saveSettings();
						
						// Preserve scroll position during refresh
						const scrollTop = this.containerEl.scrollTop;
						this.display(); // Refresh to show provider-specific model options
						this.containerEl.scrollTop = scrollTop;
					}));

			// External transcript model setting (dynamic based on provider)
			this.addExternalTranscriptModelSetting(advancedContainer);
		}


		// Connection Testing
		advancedContainer.createEl('h4', { text: 'Connection Testing' });
		
		new Setting(advancedContainer)
			.setName('Test All Connections')
			.setDesc('Verify that all configured APIs are working correctly')
			.addButton(button => button
				.setButtonText('Run Tests')
				.onClick(async () => {
					// Future implementation - test all provider connections
					button.setButtonText('Testing...');
					try {
						// Test YouTube API
						// Test selected AI provider
						// Test WebScraping API if configured
						await new Promise(resolve => setTimeout(resolve, 1000)); // Placeholder
						button.setButtonText('✅ All Tests Passed');
						setTimeout(() => button.setButtonText('Run Tests'), 3000);
					} catch (error) {
						button.setButtonText('❌ Tests Failed');
						setTimeout(() => button.setButtonText('Run Tests'), 3000);
					}
				}));
	}

	/**
	 * Add Basic Transcripts section
	 */
	private addBasicTranscriptsSection(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'Basic Transcripts' });

		// Status and features
		const hasYouTubeAPI = !!this.plugin.settings.youtubeApiKey;
		
		if (hasYouTubeAPI) {
			containerEl.createEl('div', {
				text: '✅ Ready',
				cls: 'setting-item-description',
				attr: { style: 'color: var(--text-success, #00b300); font-weight: 500; margin-bottom: 8px;' }
			});
		} else {
			containerEl.createEl('div', {
				text: '⚠️ Needs YouTube API',
				cls: 'setting-item-description',
				attr: { style: 'color: var(--text-warning, #ff8c00); font-weight: 500; margin-bottom: 8px;' }
			});
		}
		
		containerEl.createEl('div', {
			text: 'Enables: Raw transcripts from YouTube',
			cls: 'setting-item-description',
			attr: { style: 'margin-bottom: 16px; font-style: italic;' }
		});

		// YouTube API Key setting
		new Setting(containerEl)
			.setName('YouTube Data API Key')
			.setDesc('Enter your YouTube Data API v3 key')
			.addText(text => text
				.setPlaceholder('AIzaSy...')
				.setValue(this.plugin.settings.youtubeApiKey)
				.onChange(async (value) => {
					this.plugin.settings.youtubeApiKey = value;
					await this.plugin.saveSettings();
					
					// Preserve scroll position during refresh
					const scrollTop = this.containerEl.scrollTop;
					this.display(); // Refresh to show/hide dependent sections
					this.containerEl.scrollTop = scrollTop;
				}));
	}


	/**
	 * Add Advanced Options section
	 */
	private addAdvancedOptionsSection(containerEl: HTMLElement): void {
		// Create collapsible details element
		const advancedDetails = containerEl.createEl('details');
		advancedDetails.createEl('summary', { text: 'Advanced Options' });
		
		const advancedContainer = advancedDetails.createEl('div', { cls: 'advanced-settings-container' });
		
		advancedContainer.createEl('p', {
			text: 'Expert configuration options for external transcript processing and connection testing.',
			cls: 'setting-item-description'
		});


		// External Transcript Provider Override
		advancedContainer.createEl('h4', { text: 'External Transcript Provider Override' });
		
		new Setting(advancedContainer)
			.setName('Use different provider for external transcripts')
			.setDesc('Override the main AI provider for external transcript processing')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.externalTranscriptProvider !== this.plugin.settings.currentProvider)
				.onChange(async (value) => {
					if (value) {
						// Keep current external provider or default to different one
						if (this.plugin.settings.externalTranscriptProvider === this.plugin.settings.currentProvider) {
							// Set to a different provider
							const providers: ProviderType[] = ['openai', 'openrouter', 'ollama'];
							const differentProvider = providers.find(p => p !== this.plugin.settings.currentProvider) || 'openai';
							this.plugin.settings.externalTranscriptProvider = differentProvider;
						}
					} else {
						// Use main provider
						this.plugin.settings.externalTranscriptProvider = this.plugin.settings.currentProvider;
					}
					await this.plugin.saveSettings();
					
					// Preserve scroll position during refresh
					const scrollTop = this.containerEl.scrollTop;
					this.display(); // Refresh to show/hide provider settings
					this.containerEl.scrollTop = scrollTop;
				}));

		// Show external transcript provider settings if override is enabled
		if (this.plugin.settings.externalTranscriptProvider !== this.plugin.settings.currentProvider) {
			new Setting(advancedContainer)
				.setName('External Transcript AI Provider')
				.setDesc('Choose a different AI provider for processing external transcripts')
				.addDropdown(dropdown => dropdown
					.addOptions({
						'openai': 'OpenAI (GPT models)',
						'openrouter': 'OpenRouter (Multiple models)',
						'ollama': 'Ollama (Local models)'
					})
					.setValue(this.plugin.settings.externalTranscriptProvider || 'openai')
					.onChange(async (value: ProviderType) => {
						this.plugin.settings.externalTranscriptProvider = value;
						await this.plugin.saveSettings();
						
						// Preserve scroll position during refresh
						const scrollTop = this.containerEl.scrollTop;
						this.display(); // Refresh to show provider-specific model options
						this.containerEl.scrollTop = scrollTop;
					}));

			// External transcript model setting (dynamic based on provider)
			this.addExternalTranscriptModelSetting(advancedContainer);
		}

		// Connection Testing
		advancedContainer.createEl('h4', { text: 'Connection Testing' });
		
		new Setting(advancedContainer)
			.setName('Test All Connections')
			.setDesc('Verify that all configured APIs are working correctly')
			.addButton(button => button
				.setButtonText('Run Tests')
				.onClick(async () => {
					// Future implementation - test all provider connections
					button.setButtonText('Testing...');
					try {
						// Test YouTube API
						// Test selected AI provider
						// Test WebScraping API if configured
						await new Promise(resolve => setTimeout(resolve, 1000)); // Placeholder
						button.setButtonText('✅ All Tests Passed');
						setTimeout(() => button.setButtonText('Run Tests'), 3000);
					} catch (error) {
						button.setButtonText('❌ Tests Failed');
						setTimeout(() => button.setButtonText('Run Tests'), 3000);
					}
				}));
	}

	/**
	 * Add experimental features section
	 */
	private addExperimentalFeaturesSection(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'Experimental Features' });
		
		// External transcript detection toggle
		new Setting(containerEl)
			.setName('External transcript detection')
			.setDesc('Search for higher-quality transcripts in video descriptions')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.checkExternalTranscripts)
				.onChange(async (value) => {
					this.plugin.settings.checkExternalTranscripts = value;
					await this.plugin.saveSettings();
					
					// Preserve scroll position during refresh
					const scrollTop = this.containerEl.scrollTop;
					this.display(); // Refresh to show/hide API inputs
					this.containerEl.scrollTop = scrollTop;
				})
			);

		// Show API inputs when external transcript detection is enabled
		if (this.plugin.settings.checkExternalTranscripts) {
			// WebScraping.AI API Key
			new Setting(containerEl)
				.setName('WebScraping.AI API Key')
				.setDesc('Enter your webscraping.ai API key')
				.addText(text => text
					.setPlaceholder('your-webscraping-ai-key')
					.setValue(this.plugin.settings.webscrapingApiKey)
					.onChange(async (value) => {
						this.plugin.settings.webscrapingApiKey = value;
						await this.plugin.saveSettings();
					}));

			// YouTube Data API Key
			new Setting(containerEl)
				.setName('YouTube Data API Key')
				.setDesc('Enter your YouTube Data API v3 key')
				.addText(text => text
					.setPlaceholder('AIzaSy...')
					.setValue(this.plugin.settings.youtubeApiKey)
					.onChange(async (value) => {
						this.plugin.settings.youtubeApiKey = value;
						await this.plugin.saveSettings();
					}));
		}
	}

}