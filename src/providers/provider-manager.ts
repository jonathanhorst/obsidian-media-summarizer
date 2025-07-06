import { BaseLLMProvider, LLMRequest, LLMResponse } from './base';
import { OpenAIProvider } from './openai';
import { OpenRouterProvider } from './openrouter';
import { OllamaProvider } from './ollama';

export type ProviderType = 'openai' | 'openrouter' | 'ollama';

export interface ProviderManagerSettings {
  currentProvider: ProviderType;
  
  // Provider configurations
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
}

/**
 * Provider Manager - handles switching between different LLM providers
 */
export class ProviderManager {
  private providers: Map<ProviderType, BaseLLMProvider> = new Map();
  private settings: ProviderManagerSettings;
  
  constructor(settings: ProviderManagerSettings) {
    this.settings = settings;
    this.initializeProviders();
  }

  /**
   * Initialize all configured providers
   */
  private initializeProviders(): void {
    // Initialize OpenAI provider if API key is available
    if (this.settings.openai.apiKey) {
      const openaiProvider = new OpenAIProvider(this.settings.openai.apiKey);
      openaiProvider.updateConfig({ defaultModel: this.settings.openai.model });
      this.providers.set('openai', openaiProvider);
    }

    // Initialize OpenRouter provider if API key is available
    if (this.settings.openrouter.apiKey) {
      const openrouterProvider = new OpenRouterProvider(this.settings.openrouter.apiKey);
      openrouterProvider.updateConfig({ defaultModel: this.settings.openrouter.model });
      this.providers.set('openrouter', openrouterProvider);
    }

    // Initialize Ollama provider (always available, but may not be running)
    const ollamaProvider = new OllamaProvider(this.settings.ollama.baseUrl);
    ollamaProvider.updateConfig({ defaultModel: this.settings.ollama.model });
    this.providers.set('ollama', ollamaProvider);
  }

  /**
   * Update settings and reinitialize providers
   */
  updateSettings(settings: ProviderManagerSettings): void {
    this.settings = settings;
    this.providers.clear();
    this.initializeProviders();
  }

  /**
   * Get the current active provider
   */
  getCurrentProvider(): BaseLLMProvider | null {
    return this.providers.get(this.settings.currentProvider) || null;
  }

  /**
   * Get a specific provider by type
   */
  getProvider(type: ProviderType): BaseLLMProvider | null {
    return this.providers.get(type) || null;
  }

  /**
   * Check if a provider is available and configured
   */
  isProviderAvailable(type: ProviderType): boolean {
    const provider = this.providers.get(type);
    if (!provider) return false;
    
    const validation = provider.validateConfig();
    return validation.valid;
  }

  /**
   * Test connection to a specific provider
   */
  async testProvider(type: ProviderType): Promise<boolean> {
    const provider = this.providers.get(type);
    if (!provider) return false;
    
    try {
      return await provider.testConnection();
    } catch (error) {
      console.error(`Provider ${type} connection test failed:`, error);
      return false;
    }
  }

  /**
   * Get available models for a specific provider
   */
  async getAvailableModels(type: ProviderType): Promise<string[]> {
    const provider = this.providers.get(type);
    if (!provider) return [];
    
    try {
      return await provider.getAvailableModels();
    } catch (error) {
      console.error(`Failed to get models for ${type}:`, error);
      return [];
    }
  }

  /**
   * Make a chat completion request
   */
  async chatCompletion(request: LLMRequest, useCurrentProvider = true): Promise<LLMResponse> {
    const providerType = useCurrentProvider ? this.settings.currentProvider : this.determineBestProvider(request);
    
    const provider = this.providers.get(providerType);
    if (!provider) {
      throw new Error(`Provider ${providerType} is not available`);
    }

    // Use the provider's default model if not specified
    const actualRequest = {
      ...request,
      model: request.model || provider.getConfig().defaultModel
    };

    return await provider.chatCompletion(actualRequest);
  }

  /**
   * Summarize transcript using the current provider
   */
  async summarizeTranscript(
    transcript: string,
    metadata?: { title?: string; channel?: string; description?: string }
  ): Promise<string> {
    if (!transcript || transcript.trim().length === 0) {
      throw new Error('No transcript content to summarize');
    }

    if (transcript.startsWith('Error:')) {
      return transcript; // Pass through existing errors
    }

    const provider = this.getCurrentProvider();
    if (!provider) {
      throw new Error('No LLM provider is configured. Please set up an API key in plugin settings.');
    }

    try {
      // Check if provider has custom summarization method
      if ('summarizeTranscript' in provider && typeof provider.summarizeTranscript === 'function') {
        return await (provider as any).summarizeTranscript(transcript, metadata);
      }

      // Fallback to generic chat completion
      const systemPrompt = 'You are an expert at creating concise, well-structured summaries of video transcripts. Create a summary that captures the key points, main arguments, and important details.';
      
      let userPrompt = 'Please provide a comprehensive summary of this video transcript:\\n\\n';
      
      if (metadata?.title) {
        userPrompt += `Video Title: "${metadata.title}"\\n`;
      }
      if (metadata?.channel) {
        userPrompt += `Channel: "${metadata.channel}"\\n`;
      }
      if (metadata?.description) {
        userPrompt += `Description: "${metadata.description}"\\n`;
      }
      
      userPrompt += `\\nTranscript:\\n${transcript}`;

      const request: LLMRequest = {
        model: provider.getConfig().defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000
      };

      const response = await this.chatCompletion(request);
      return response.content;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Handle specific API errors
      if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
        return 'Error: Invalid API key. Please check your API key in plugin settings.';
      } else if (errorMessage.includes('429')) {
        return 'Error: API rate limit exceeded. Please wait a moment and try again.';
      } else if (errorMessage.includes('402')) {
        return 'Error: API quota exceeded. Please check your account billing.';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        return 'Error: Network error while contacting API. Please check your internet connection and try again.';
      } else {
        return `Error: Failed to generate summary. ${errorMessage}`;
      }
    }
  }

  /**
   * Enhance transcript using the current provider
   */
  async enhanceTranscript(
    transcript: string,
    metadata?: { title?: string; channel?: string; description?: string; durationSeconds?: number }
  ): Promise<string> {
    if (!transcript || transcript.trim().length === 0) {
      throw new Error('No transcript content to enhance');
    }

    const provider = this.getCurrentProvider();
    if (!provider) {
      throw new Error('No LLM provider is configured. Please set up an API key in plugin settings.');
    }

    try {
      // Check if provider has custom enhancement method
      if ('enhanceTranscript' in provider && typeof provider.enhanceTranscript === 'function') {
        return await (provider as any).enhanceTranscript(transcript, metadata);
      }

      // Fallback to generic enhancement
      const systemPrompt = 'You are an expert transcript editor. Clean up this transcript by adding proper punctuation, capitalization, and paragraph breaks while preserving all the original spoken words.';
      
      const userPrompt = `Please clean up this video transcript by adding proper punctuation and formatting:

${metadata?.title ? `Video: ${metadata.title}` : ''}

Transcript:
${transcript}

Format as readable markdown with clear paragraphs.`;

      const request: LLMRequest = {
        model: provider.getConfig().defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: Math.min(transcript.length * 2, 4000)
      };

      const response = await this.chatCompletion(request);
      return response.content;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return `Error: Failed to enhance transcript. ${errorMessage}`;
    }
  }

  /**
   * Determine the best provider for a given request
   */
  private determineBestProvider(request: LLMRequest): ProviderType {
    // For now, just return the current provider
    // In the future, this could be more intelligent based on:
    // - Request complexity
    // - Provider capabilities
    // - Cost considerations
    // - Performance requirements
    
    return this.settings.currentProvider;
  }

  /**
   * Get provider status information
   */
  async getProviderStatus(): Promise<Record<ProviderType, { available: boolean; connected?: boolean; error?: string }>> {
    const status: Record<string, { available: boolean; connected?: boolean; error?: string }> = {};
    
    const providerTypes: ProviderType[] = ['openai', 'openrouter', 'ollama'];
    
    for (const type of providerTypes) {
      const available = this.isProviderAvailable(type);
      status[type] = { available };
      
      if (available) {
        try {
          status[type].connected = await this.testProvider(type);
        } catch (error) {
          status[type].connected = false;
          status[type].error = error instanceof Error ? error.message : String(error);
        }
      }
    }
    
    return status as Record<ProviderType, { available: boolean; connected?: boolean; error?: string }>;
  }

  /**
   * Get configuration validation for all providers
   */
  getProviderValidation(): Record<ProviderType, { valid: boolean; errors: string[] }> {
    const validation: Record<string, { valid: boolean; errors: string[] }> = {};
    
    const providerTypes: ProviderType[] = ['openai', 'openrouter', 'ollama'];
    
    for (const type of providerTypes) {
      const provider = this.providers.get(type);
      if (provider) {
        validation[type] = provider.validateConfig();
      } else {
        validation[type] = { valid: false, errors: ['Provider not initialized'] };
      }
    }
    
    return validation as Record<ProviderType, { valid: boolean; errors: string[] }>;
  }
}