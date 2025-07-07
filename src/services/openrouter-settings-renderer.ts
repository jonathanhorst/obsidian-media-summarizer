import { ProviderSettingsRenderer, ModelOption } from './provider-settings-renderer';
import { PROVIDER_CONSTANTS } from '../constants';

export class OpenRouterSettingsRenderer extends ProviderSettingsRenderer {
    public getProviderName(): string {
        return 'OpenRouter';
    }
    
    public getApiKeyDescription(): string {
        return 'Get your API key from OpenRouter';
    }
    
    public getApiKeyPlaceholder(): string {
        return 'sk-or-v1-...';
    }
    
    public getCustomModelPlaceholder(): string {
        return 'e.g., anthropic/claude-3.5-sonnet';
    }
    
    public getDefaultApiUrl(): string {
        return PROVIDER_CONSTANTS.OPENROUTER_MODELS_ENDPOINT;
    }
    
    public getDefaultModel(): string {
        return 'openai/gpt-4o-mini';
    }
    
    public getDefaultModels(): ModelOption[] {
        return [
            { value: 'openai/gpt-4o-mini', display: 'GPT-4o Mini' },
            { value: 'openai/gpt-4o', display: 'GPT-4o' },
            { value: 'anthropic/claude-3.5-sonnet', display: 'Claude 3.5 Sonnet' },
            { value: 'anthropic/claude-3-haiku', display: 'Claude 3 Haiku' },
            { value: 'meta-llama/llama-3.1-70b-instruct', display: 'Llama 3.1 70B' },
            { value: 'meta-llama/llama-3.1-8b-instruct', display: 'Llama 3.1 8B' },
            { value: 'google/gemini-pro', display: 'Gemini Pro' },
            { value: 'mistralai/mistral-7b-instruct', display: 'Mistral 7B' }
        ];
    }
    
    public async fetchModels(): Promise<ModelOption[]> {
        try {
            const response = await fetch(PROVIDER_CONSTANTS.OPENROUTER_MODELS_ENDPOINT, {
                headers: {
                    'Authorization': `Bearer ${this.getApiKey()}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://github.com/jonathanhorst/obsidian-media-summarizer',
                    'X-Title': 'Obsidian Media Summarizer'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            return data.data
                .filter((model: any) => !model.id.includes('free') && model.context_length >= 4000)
                .map((model: any) => ({
                    value: model.id,
                    display: model.name || model.id,
                    description: model.description || ''
                }))
                .sort((a: ModelOption, b: ModelOption) => a.display.localeCompare(b.display))
                .slice(0, PROVIDER_CONSTANTS.MAX_MODELS_DISPLAY || 50);
        } catch (error) {
            console.error('Error fetching OpenRouter models:', error);
            return [];
        }
    }
    
    public isApiKeyValid(): boolean {
        const apiKey = this.getApiKey();
        return apiKey.startsWith('sk-or-v1-') && apiKey.length > 20;
    }
    
    public supportsTemperature(): boolean {
        return true;
    }
    
    public supportsCustomUrl(): boolean {
        return false;
    }
    
    // OpenRouter-specific getters and setters
    public hasApiKey(): boolean {
        return !!this.settings.openrouterApiKey;
    }
    
    public getApiKey(): string {
        return this.settings.openrouterApiKey || '';
    }
    
    public setApiKey(value: string): void {
        this.settings.openrouterApiKey = value;
    }
    
    public getCurrentModel(): string {
        return this.settings.openrouterModel || this.getDefaultModel();
    }
    
    public setCurrentModel(value: string): void {
        this.settings.openrouterModel = value;
    }
    
    public getCustomModel(): string | undefined {
        return this.settings.openrouterCustomModel;
    }
    
    public setCustomModel(value: string): void {
        this.settings.openrouterCustomModel = value;
    }
    
    public getTemperature(): number {
        return this.settings.openrouterTemperature || 0.7;
    }
    
    public setTemperature(value: number): void {
        this.settings.openrouterTemperature = value;
    }
    
    public getCustomUrl(): string | undefined {
        return undefined; // OpenRouter doesn't support custom URLs
    }
    
    public setCustomUrl(value: string): void {
        // OpenRouter doesn't support custom URLs
    }
}