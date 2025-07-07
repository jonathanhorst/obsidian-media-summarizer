import { ProviderSettingsRenderer, ModelOption } from './provider-settings-renderer';
import { PROVIDER_CONSTANTS } from '../constants';

export class OpenAISettingsRenderer extends ProviderSettingsRenderer {
    public getProviderName(): string {
        return 'OpenAI';
    }
    
    public getApiKeyDescription(): string {
        return 'Get your API key from OpenAI Platform';
    }
    
    public getApiKeyPlaceholder(): string {
        return 'sk-...';
    }
    
    public getCustomModelPlaceholder(): string {
        return 'e.g., gpt-4o-2024-11-20';
    }
    
    public getDefaultApiUrl(): string {
        return PROVIDER_CONSTANTS.OPENAI_MODELS_ENDPOINT;
    }
    
    public getDefaultModel(): string {
        return 'gpt-4o-mini';
    }
    
    public getDefaultModels(): ModelOption[] {
        return PROVIDER_CONSTANTS.DEFAULT_OPENAI_MODELS.map(model => ({
            value: model.toLowerCase().replace(/\s+/g, '-'),
            display: model
        }));
    }
    
    public async fetchModels(): Promise<ModelOption[]> {
        try {
            const response = await fetch(PROVIDER_CONSTANTS.OPENAI_MODELS_ENDPOINT, {
                headers: {
                    'Authorization': `Bearer ${this.getApiKey()}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            return data.data
                .filter((model: any) => model.id.includes('gpt'))
                .map((model: any) => ({
                    value: model.id,
                    display: model.id,
                    description: model.description || ''
                }))
                .sort((a: ModelOption, b: ModelOption) => a.display.localeCompare(b.display));
        } catch (error) {
            console.error('Error fetching OpenAI models:', error);
            return [];
        }
    }
    
    public isApiKeyValid(): boolean {
        const apiKey = this.getApiKey();
        return apiKey.startsWith('sk-') && apiKey.length > 20;
    }
    
    public supportsTemperature(): boolean {
        return true;
    }
    
    public supportsCustomUrl(): boolean {
        return false;
    }
    
    // OpenAI-specific getters and setters
    public hasApiKey(): boolean {
        return !!this.settings.openaiApiKey;
    }
    
    public getApiKey(): string {
        return this.settings.openaiApiKey || '';
    }
    
    public setApiKey(value: string): void {
        this.settings.openaiApiKey = value;
    }
    
    public getCurrentModel(): string {
        return this.settings.openaiModel || this.getDefaultModel();
    }
    
    public setCurrentModel(value: string): void {
        this.settings.openaiModel = value;
    }
    
    public getCustomModel(): string | undefined {
        return this.settings.openaiCustomModel;
    }
    
    public setCustomModel(value: string): void {
        this.settings.openaiCustomModel = value;
    }
    
    public getTemperature(): number {
        return this.settings.openaiTemperature || 0.7;
    }
    
    public setTemperature(value: number): void {
        this.settings.openaiTemperature = value;
    }
    
    public getCustomUrl(): string | undefined {
        return undefined; // OpenAI doesn't support custom URLs
    }
    
    public setCustomUrl(value: string): void {
        // OpenAI doesn't support custom URLs
    }
}