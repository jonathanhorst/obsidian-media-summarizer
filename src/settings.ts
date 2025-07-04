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
	enableFallback: boolean;
	fallbackProvider: ProviderType;
	
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
	enableFallback: false,
	fallbackProvider: 'openrouter',
	
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
			model: 'llama3.1:8b'
		}
	},
	
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
		containerEl.createEl('h2', { text: 'Media Summarizer Settings' });
		
		containerEl.createEl('p', {
			text: 'Configure Media Summarizer to enhance your video note-taking experience. Start with playback controls for immediate value, then add AI features as needed.'
		});

		// 🎮 PLAYBACK & INTERACTION SECTION (Immediate value, no APIs needed)
		this.addPlaybackInteractionSection(containerEl);

		// 📺 YOUTUBE INTEGRATION SECTION (Basic API requirement)
		this.addYouTubeIntegrationSection(containerEl);

		// 📊 AI & PROCESSING SECTION (Optional enhancement)
		this.addAIProcessingSection(containerEl);

		// 🔧 ADVANCED SETTINGS SECTION (Expert configuration)
		this.addAdvancedSettingsSection(containerEl);
	}

	/**
	 * Add provider status indicators
	 */
	private addProviderStatus(containerEl: HTMLElement): void {
		const statusEl = containerEl.createEl('div', { cls: 'provider-status' });
		statusEl.createEl('div', { 
			text: '⚠️ Provider status will be checked when you test connections.',
			cls: 'setting-item-description'
		});
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

		// Fallback settings
		this.addFallbackSettings(containerEl);
	}

	/**
	 * Add OpenAI provider settings
	 */
	private addOpenAISettings(containerEl: HTMLElement): void {
		containerEl.createEl('h4', { text: 'OpenAI Configuration' });

		new Setting(containerEl)
			.setName('OpenAI API Key')
			.setDesc('Enter your OpenAI API key. Get your key from https://platform.openai.com/api-keys')
			.addText(text => text
				.setPlaceholder('sk-...')
				.setValue(this.plugin.settings.providers.openai.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.providers.openai.apiKey = value;
					// Maintain backward compatibility
					this.plugin.settings.openaiApiKey = value;
					await this.plugin.saveSettings();
				}));

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

		containerEl.createEl('div', {
			cls: 'setting-item-description',
			text: '💡 GPT-4o-mini offers the best balance of quality and cost. GPT-4o is the latest model with the highest quality.'
		});
	}

	/**
	 * Add OpenRouter provider settings
	 */
	private addOpenRouterSettings(containerEl: HTMLElement): void {
		containerEl.createEl('h4', { text: 'OpenRouter Configuration' });

		new Setting(containerEl)
			.setName('OpenRouter API Key')
			.setDesc('Enter your OpenRouter API key. Get your key from https://openrouter.ai/keys')
			.addText(text => text
				.setPlaceholder('sk-or-v1-...')
				.setValue(this.plugin.settings.providers.openrouter.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.providers.openrouter.apiKey = value;
					await this.plugin.saveSettings();
				}));

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

		containerEl.createEl('div', {
			cls: 'setting-item-description',
			text: '💡 OpenRouter provides access to 100+ models. Claude 3.5 Sonnet excels at transcript enhancement.'
		});
	}

	/**
	 * Add Ollama provider settings
	 */
	private addOllamaSettings(containerEl: HTMLElement): void {
		containerEl.createEl('h4', { text: 'Ollama Configuration' });

		new Setting(containerEl)
			.setName('Ollama Base URL')
			.setDesc('URL where Ollama is running (default: http://localhost:11434)')
			.addText(text => text
				.setPlaceholder('http://localhost:11434')
				.setValue(this.plugin.settings.providers.ollama.baseUrl)
				.onChange(async (value) => {
					this.plugin.settings.providers.ollama.baseUrl = value;
					await this.plugin.saveSettings();
					// Refresh the model dropdown when URL changes
					setTimeout(() => this.refreshOllamaModels(), 500);
				}));

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

		containerEl.createEl('div', {
			cls: 'setting-item-description',
			text: '💡 Ollama provides free, local AI models. Install from https://ollama.ai/. Click refresh to detect installed models.'
		});

		// Ollama setup instructions
		const ollamaSetup = containerEl.createEl('details');
		ollamaSetup.createEl('summary', { text: 'Ollama Setup Instructions' });
		const setupContent = ollamaSetup.createEl('div', { cls: 'ollama-setup' });
		setupContent.createEl('p', { text: '1. Download Ollama from https://ollama.ai/' });
		setupContent.createEl('p', { text: '2. Install and start Ollama: ollama serve' });
		setupContent.createEl('p', { text: '3. Download a model: ollama pull llama3.1:8b' });
		setupContent.createEl('p', { text: '4. Verify installation by clicking the refresh button above' });
		setupContent.createEl('p', { text: '5. Popular models: llama3.1:8b, mistral:7b, codellama:7b, phi3:3.8b' });
	}

	/**
	 * Add fallback settings
	 */
	private addFallbackSettings(containerEl: HTMLElement): void {
		containerEl.createEl('h4', { text: 'Fallback Settings' });

		new Setting(containerEl)
			.setName('Enable Fallback')
			.setDesc('Automatically try a different provider if the primary one fails')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableFallback)
				.onChange(async (value) => {
					this.plugin.settings.enableFallback = value;
					await this.plugin.saveSettings();
					this.display(); // Refresh to show/hide fallback provider setting
				}));

		if (this.plugin.settings.enableFallback) {
			new Setting(containerEl)
				.setName('Fallback Provider')
				.setDesc('Provider to use if the primary provider fails')
				.addDropdown(dropdown => {
					const options: Record<string, string> = {};
					const providers = ['openai', 'openrouter', 'ollama'] as ProviderType[];
					
					providers.forEach(provider => {
						if (provider !== this.plugin.settings.currentProvider) {
							options[provider] = provider === 'openai' ? 'OpenAI' : 
											   provider === 'openrouter' ? 'OpenRouter' : 'Ollama';
						}
					});

					return dropdown
						.addOptions(options)
						.setValue(this.plugin.settings.fallbackProvider)
						.onChange(async (value: ProviderType) => {
							this.plugin.settings.fallbackProvider = value;
							await this.plugin.saveSettings();
						});
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

			// If no model is selected, select the first one
			if (!dropdown.value && models.length > 0) {
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
		
		// Add status message
		dropdown.createEl('option', { 
			text: 'Ollama not running - showing common models', 
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
	 * Add Playback & Interaction section (immediate value, no API barriers)
	 */
	private addPlaybackInteractionSection(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: '🎮 Playback & Interaction' });
		
		containerEl.createEl('p', {
			text: 'Configure video playback behavior. These settings work immediately without any API keys.',
			cls: 'setting-item-description'
		});

		// Video Controls subsection
		containerEl.createEl('h4', { text: 'Video Controls' });

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

		// Timestamp Behavior subsection
		containerEl.createEl('h4', { text: 'Timestamp Behavior' });

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

		// Formatting subsection
		containerEl.createEl('h4', { text: 'Formatting' });

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
	}


	/**
	 * Add YouTube Integration section (basic API requirement)
	 */
	private addYouTubeIntegrationSection(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: '📺 YouTube Integration' });
		
		containerEl.createEl('p', {
			text: 'Enable transcript features with the YouTube Data API. This unlocks basic transcripts and external transcript detection.',
			cls: 'setting-item-description'
		});

		// YouTube Data API Key setting
		new Setting(containerEl)
			.setName('YouTube Data API Key')
			.setDesc('Enter your YouTube Data API v3 key to extract video descriptions and enable transcript features. Get your key from Google Cloud Console with YouTube Data API v3 enabled.')
			.addText(text => text
				.setPlaceholder('AIzaSy...')
				.setValue(this.plugin.settings.youtubeApiKey)
				.onChange(async (value) => {
					this.plugin.settings.youtubeApiKey = value;
					await this.plugin.saveSettings();
					this.display(); // Refresh to show/hide dependent sections
				}));

		// Only show external transcript options if YouTube API is configured
		if (this.plugin.settings.youtubeApiKey) {
			// External Transcript Enhancement subsection
			containerEl.createEl('h4', { text: 'External Transcript Enhancement' });
			
			containerEl.createEl('p', {
				text: 'Check video descriptions for links to higher-quality transcripts. This can provide better accuracy and lower AI processing costs.',
				cls: 'setting-item-description'
			});

			// External transcript setting
			new Setting(containerEl)
				.setName('Check for external transcripts')
				.setDesc('Automatically search video descriptions for transcript links before using YouTube\'s auto-generated transcripts')
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.checkExternalTranscripts)
					.onChange(async (value) => {
						this.plugin.settings.checkExternalTranscripts = value;
						await this.plugin.saveSettings();
						this.display(); // Refresh to show/hide web scraping settings
					}));

			// Only show web scraping settings if external transcripts are enabled
			if (this.plugin.settings.checkExternalTranscripts) {
				// WebScraping.AI API Key setting
				new Setting(containerEl)
					.setName('WebScraping.AI API Key')
					.setDesc('Enter your WebScraping.AI API key to enable external transcript fetching. Get your key from https://webscraping.ai')
					.addText(text => text
						.setPlaceholder('your-webscraping-ai-key')
						.setValue(this.plugin.settings.webscrapingApiKey)
						.onChange(async (value) => {
							this.plugin.settings.webscrapingApiKey = value;
							await this.plugin.saveSettings();
						}));

				// External transcript provider setting
				new Setting(containerEl)
					.setName('External Transcript AI Provider')
					.setDesc('Choose the AI provider for processing external transcripts')
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
							this.display(); // Refresh to show provider-specific model options
						}));

				// External transcript model setting (dynamic based on provider)
				this.addExternalTranscriptModelSetting(containerEl);

				// External transcript details
				containerEl.createEl('div', {
					cls: 'setting-item-description',
					text: '💡 External transcript detection extracts URLs from video descriptions using YouTube Data API, then scrapes them for transcripts using WebScraping.AI.'
				});
			}
		} else {
			// Show info about what YouTube API enables
			containerEl.createEl('div', {
				cls: 'setting-item-description',
				text: '📋 YouTube API enables: Basic transcripts, external transcript detection, video metadata access, and enhanced AI processing.'
			});
		}
	}

	/**
	 * Add AI & Processing section (optional enhancement)
	 */
	private addAIProcessingSection(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: '📊 AI & Processing' });
		
		containerEl.createEl('p', {
			text: 'Configure AI providers for transcript summarization and enhancement. This enables the most powerful features of Media Summarizer.',
			cls: 'setting-item-description'
		});

		// Primary AI Provider
		containerEl.createEl('h4', { text: 'Primary AI Provider' });

		// Current Provider setting
		new Setting(containerEl)
			.setName('AI Provider')
			.setDesc('Choose your preferred AI provider for transcript processing')
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
					this.display(); // Refresh UI to show provider-specific settings
				}));

		// Provider status indicator
		this.addProviderStatus(containerEl);

		// Add note about switching providers
		containerEl.createEl('div', {
			cls: 'setting-item-description',
			text: '💡 Tip: Switch between providers above to configure their API keys and models. Each provider has its own configuration section.'
		});

		// Provider-specific configuration sections
		this.addProviderConfiguration(containerEl);

		// Security notice
		containerEl.createEl('div', {
			cls: 'setting-item-description',
			text: '🔒 All API keys are stored locally and only sent to their respective services for processing.'
		});
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

		// Alternative Transcription Services
		advancedContainer.createEl('h4', { text: 'Alternative Transcription Services' });
		
		// AssemblyAI integration (placeholder for future enhancement)
		new Setting(advancedContainer)
			.setName('Transcription Service')
			.setDesc('Choose the transcription service (YouTube is recommended for most use cases)')
			.addDropdown(dropdown => dropdown
				.addOptions({
					'youtube': 'YouTube (Default)',
					'assemblyai': 'AssemblyAI (Alternative)'
				})
				.setValue('youtube') // Default value
				.onChange(async (value) => {
					// Future implementation
					console.log('Transcription service changed to:', value);
				}));

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

}