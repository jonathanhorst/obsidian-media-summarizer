import { Setting } from 'obsidian';
import { MediaSummarizerSettings } from '../main';
import { PROVIDER_CONSTANTS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../constants';
import { ErrorHandlingService } from './error-handling-service';

export interface ProviderConfig {
    apiKey: string;
    currentModel: string;
    customModel?: string;
    apiUrl?: string;
    temperature?: number;
}

export interface ModelOption {
    value: string;
    display: string;
    description?: string;
}

/**
 * Abstract base class for rendering provider settings
 * Eliminates code duplication between OpenAI, OpenRouter, and Ollama settings
 */
export abstract class ProviderSettingsRenderer {
    protected errorHandler: ErrorHandlingService;
    
    constructor(
        protected containerEl: HTMLElement,
        protected plugin: any,
        protected settings: MediaSummarizerSettings,
        protected saveCallback: () => Promise<void>
    ) {
        this.errorHandler = ErrorHandlingService.getInstance();
    }
    
    /**
     * Render the complete provider settings section
     */
    public renderSettings(): void {
        if (!this.hasApiKey()) {
            this.renderApiKeyInput();
            return;
        }
        
        this.renderApiKeyInput();
        this.renderModelSelector();
        this.renderAdvancedSettings();
    }
    
    /**
     * Render API key input field
     */
    protected renderApiKeyInput(): void {
        const setting = new Setting(this.containerEl)
            .setName(`${this.getProviderName()} API Key`)
            .setDesc(this.getApiKeyDescription())
            .addText(text => text
                .setPlaceholder(this.getApiKeyPlaceholder())
                .setValue(this.getApiKey())
                .onChange(async (value) => {
                    this.setApiKey(value);
                    await this.saveCallback();
                    
                    // Refresh the entire settings display to show/hide model selector
                    this.refreshDisplay();
                })
            );
        
        // Add validation indicator
        if (this.hasApiKey()) {
            this.addValidationIndicator(setting);
        }
    }
    
    /**
     * Render model selector dropdown
     */
    protected renderModelSelector(): void {
        const modelContainer = this.containerEl.createDiv();
        
        const setting = new Setting(modelContainer)
            .setName('Model')
            .setDesc('Select the AI model to use');
        
        const modelDropdown = setting.addDropdown(dropdown => {
            // Add loading state
            dropdown.addOption('loading', 'Loading models...');
            dropdown.setValue('loading');
            dropdown.onChange(async (value) => {
                if (value === 'loading') return;
                
                this.setCurrentModel(value);
                await this.saveCallback();
                
                // Show/hide custom model input
                this.toggleCustomModelInput(modelContainer, value === 'custom');
            });
            
            return dropdown;
        });
        
        // Add refresh button
        const refreshButton = setting.addButton(button => {
            button
                .setButtonText('Refresh')
                .setTooltip('Refresh available models')
                .onClick(async () => {
                    await this.refreshModels(modelDropdown.dropdownEl, modelContainer);
                });
        });
        
        // Initial model load
        this.refreshModels(modelDropdown.dropdownEl, modelContainer);
    }
    
    /**
     * Render advanced settings (temperature, etc.)
     */
    protected renderAdvancedSettings(): void {
        if (this.supportsTemperature()) {
            this.renderTemperatureSlider();
        }
        
        if (this.supportsCustomUrl()) {
            this.renderCustomUrlInput();
        }
    }
    
    /**
     * Refresh available models
     */
    protected async refreshModels(dropdown: HTMLSelectElement, container: HTMLElement): Promise<void> {
        try {
            // Clear existing options
            dropdown.innerHTML = '';
            dropdown.add(new Option('Loading...', 'loading'));
            
            const models = await this.fetchModels();
            
            // Clear and populate dropdown
            dropdown.innerHTML = '';
            
            // Add default models
            const defaultModels = this.getDefaultModels();
            defaultModels.forEach(model => {
                dropdown.add(new Option(model.display, model.value));
            });
            
            // Add fetched models
            models.forEach(model => {
                dropdown.add(new Option(model.display, model.value));
            });
            
            // Add custom option
            dropdown.add(new Option('Custom Model', 'custom'));
            
            // Set current value
            const currentModel = this.getCurrentModel();
            if (currentModel && this.isValidModel(currentModel, [...defaultModels, ...models])) {
                dropdown.value = currentModel;
            } else {
                dropdown.value = this.getDefaultModel();
                this.setCurrentModel(this.getDefaultModel());
                await this.saveCallback();
            }
            
            // Handle custom model input
            this.toggleCustomModelInput(container, dropdown.value === 'custom');
            
            this.errorHandler.showSuccess(SUCCESS_MESSAGES.MODELS_REFRESHED);
        } catch (error) {
            await this.errorHandler.handleApiError(error, {
                operation: 'refresh_models',
                provider: this.getProviderName().toLowerCase()
            });
        }
    }
    
    /**
     * Toggle custom model input visibility
     */
    protected toggleCustomModelInput(container: HTMLElement, show: boolean): void {
        // Remove existing custom input
        const existingInput = container.querySelector('.custom-model-input');
        if (existingInput) {
            existingInput.remove();
        }
        
        if (show) {
            const customSetting = new Setting(container)
                .setName('Custom Model')
                .setDesc('Enter the exact model name')
                .addText(text => text
                    .setPlaceholder(this.getCustomModelPlaceholder())
                    .setValue(this.getCustomModel() || '')
                    .onChange(async (value) => {
                        this.setCustomModel(value);
                        await this.saveCallback();
                    })
                );
            
            customSetting.settingEl.addClass('custom-model-input');
        }
    }
    
    /**
     * Render temperature slider
     */
    protected renderTemperatureSlider(): void {
        new Setting(this.containerEl)
            .setName('Temperature')
            .setDesc('Controls randomness in responses (0 = deterministic, 2 = very random)')
            .addSlider(slider => slider
                .setLimits(PROVIDER_CONSTANTS.TEMPERATURE_MIN, PROVIDER_CONSTANTS.TEMPERATURE_MAX, 0.1)
                .setValue(this.getTemperature())
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.setTemperature(value);
                    await this.saveCallback();
                })
            );
    }
    
    /**
     * Render custom URL input
     */
    protected renderCustomUrlInput(): void {
        new Setting(this.containerEl)
            .setName('Custom API URL')
            .setDesc('Override the default API endpoint')
            .addText(text => text
                .setPlaceholder(this.getDefaultApiUrl())
                .setValue(this.getCustomUrl() || '')
                .onChange(async (value) => {
                    this.setCustomUrl(value);
                    await this.saveCallback();
                })
            );
    }
    
    /**
     * Add validation indicator to API key setting
     */
    protected addValidationIndicator(setting: Setting): void {
        const indicator = setting.controlEl.createDiv();
        indicator.addClass('api-key-indicator');
        
        if (this.isApiKeyValid()) {
            indicator.addClass('valid');
            indicator.textContent = '✓';
            indicator.title = 'API key format is valid';
        } else {
            indicator.addClass('invalid');
            indicator.textContent = '✗';
            indicator.title = 'API key format is invalid';
        }
    }
    
    /**
     * Check if model is valid
     */
    protected isValidModel(model: string, availableModels: ModelOption[]): boolean {
        return availableModels.some(m => m.value === model);
    }
    
    /**
     * Refresh the entire settings display
     */
    protected refreshDisplay(): void {
        // Clear container and re-render
        this.containerEl.innerHTML = '';
        this.renderSettings();
    }
    
    // Abstract methods that must be implemented by subclasses
    public abstract getProviderName(): string;
    public abstract getApiKeyDescription(): string;
    public abstract getApiKeyPlaceholder(): string;
    public abstract getCustomModelPlaceholder(): string;
    public abstract getDefaultApiUrl(): string;
    public abstract getDefaultModel(): string;
    public abstract getDefaultModels(): ModelOption[];
    public abstract fetchModels(): Promise<ModelOption[]>;
    public abstract isApiKeyValid(): boolean;
    public abstract supportsTemperature(): boolean;
    public abstract supportsCustomUrl(): boolean;
    
    // Provider-specific getters and setters
    public abstract hasApiKey(): boolean;
    public abstract getApiKey(): string;
    public abstract setApiKey(value: string): void;
    public abstract getCurrentModel(): string;
    public abstract setCurrentModel(value: string): void;
    public abstract getCustomModel(): string | undefined;
    public abstract setCustomModel(value: string): void;
    public abstract getTemperature(): number;
    public abstract setTemperature(value: number): void;
    public abstract getCustomUrl(): string | undefined;
    public abstract setCustomUrl(value: string): void;
}