import { ProviderSettingsRenderer, ModelOption } from './provider-settings-renderer';
import { PROVIDER_CONSTANTS } from '../constants';

export class OllamaSettingsRenderer extends ProviderSettingsRenderer {
    public getProviderName(): string {
        return 'Ollama';
    }
    
    public getApiKeyDescription(): string {
        return 'Ollama runs locally - no API key required';
    }
    
    public getApiKeyPlaceholder(): string {
        return 'Not required for Ollama';
    }
    
    public getCustomModelPlaceholder(): string {
        return 'e.g., llama3.1:8b-instruct-q4_0';
    }
    
    public getDefaultApiUrl(): string {
        return PROVIDER_CONSTANTS.OLLAMA_MODELS_ENDPOINT;
    }
    
    public getDefaultModel(): string {
        return 'llama3.1:8b';
    }
    
    public getDefaultModels(): ModelOption[] {
        return PROVIDER_CONSTANTS.DEFAULT_OLLAMA_MODELS.map(model => ({
            value: model,
            display: model
        }));
    }
    
    public async fetchModels(): Promise<ModelOption[]> {
        try {
            const response = await fetch(PROVIDER_CONSTANTS.OLLAMA_MODELS_ENDPOINT, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.models || !Array.isArray(data.models)) {
                return [];
            }
            
            return data.models
                .map((model: any) => ({
                    value: model.name,
                    display: model.name,
                    description: `Size: ${this.formatSize(model.size)} | Modified: ${this.formatDate(model.modified_at)}`
                }))
                .sort((a: ModelOption, b: ModelOption) => a.display.localeCompare(b.display));
        } catch (error) {
            console.error('Error fetching Ollama models:', error);
            return [];
        }
    }
    
    public isApiKeyValid(): boolean {
        return true; // Ollama doesn't require API keys
    }
    
    public supportsTemperature(): boolean {
        return true;
    }
    
    public supportsCustomUrl(): boolean {
        return true;
    }
    
    /**
     * Override to handle Ollama's no-API-key requirement
     */
    public renderSettings(): void {
        // Always show model selector for Ollama since no API key is required
        this.renderModelSelector();
        this.renderAdvancedSettings();
    }
    
    /**
     * Override to skip API key input for Ollama
     */
    protected renderApiKeyInput(): void {
        // Ollama doesn't require API keys, so we don't render this
    }
    
    // Ollama-specific getters and setters
    public hasApiKey(): boolean {
        return true; // Ollama doesn't require API keys
    }
    
    public getApiKey(): string {
        return ''; // Ollama doesn't use API keys
    }
    
    public setApiKey(value: string): void {
        // Ollama doesn't use API keys
    }
    
    public getCurrentModel(): string {
        return this.settings.providers?.ollama?.model || this.getDefaultModel();
    }
    
    public setCurrentModel(value: string): void {
        if (!this.settings.providers) {
            this.settings.providers = { openai: { apiKey: '', model: '' }, openrouter: { apiKey: '', model: '' }, ollama: { baseUrl: '', model: '' } };
        }
        this.settings.providers.ollama.model = value;
    }
    
    public getCustomModel(): string | undefined {
        return (this.settings as any).ollamaCustomModel;
    }
    
    public setCustomModel(value: string): void {
        (this.settings as any).ollamaCustomModel = value;
    }
    
    public getTemperature(): number {
        return (this.settings as any).ollamaTemperature || 0.7;
    }
    
    public setTemperature(value: number): void {
        (this.settings as any).ollamaTemperature = value;
    }
    
    public getCustomUrl(): string | undefined {
        return this.settings.providers?.ollama?.baseUrl || (this.settings as any).ollamaUrl;
    }
    
    public setCustomUrl(value: string): void {
        if (!this.settings.providers) {
            this.settings.providers = { openai: { apiKey: '', model: '' }, openrouter: { apiKey: '', model: '' }, ollama: { baseUrl: '', model: '' } };
        }
        this.settings.providers.ollama.baseUrl = value;
    }
    
    /**
     * Format file size for display
     */
    private formatSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
    
    /**
     * Format date for display
     */
    private formatDate(dateString: string): string {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString();
        } catch (error) {
            return 'Unknown';
        }
    }
}