import { ProviderManager, ProviderManagerSettings } from './providers/provider-manager';
import { getTranscript, getTranscriptLines, formatRawTranscriptWithTimestamps, formatTranscriptWithTimestamps, enhanceTranscript as originalEnhanceTranscript, getYouTubeMetadataAPI, getYouTubeMetadataHTML } from './summarizer';
import { TranscriptLine } from './youtube-api-transcript';

/**
 * LLM-powered summarizer that works with multiple AI providers
 * Maintains compatibility with existing transcript functionality
 */
export class LLMSummarizer {
  private providerManager: ProviderManager;

  constructor(settings: ProviderManagerSettings) {
    this.providerManager = new ProviderManager(settings);
  }

  /**
   * Update provider settings
   */
  updateSettings(settings: ProviderManagerSettings): void {
    this.providerManager.updateSettings(settings);
  }

  /**
   * Get provider manager for direct access (testing, status checks, etc.)
   */
  getProviderManager(): ProviderManager {
    return this.providerManager;
  }

  /**
   * Summarize a transcript using the current LLM provider
   */
  async summarizeTranscript(
    transcript: string,
    metadata?: { title?: string; channel?: string; description?: string }
  ): Promise<string> {
    return this.providerManager.summarizeTranscript(transcript, metadata);
  }

  /**
   * Enhance a transcript using the current LLM provider
   */
  async enhanceTranscript(
    transcript: string,
    metadata?: { title?: string; channel?: string; description?: string; durationSeconds?: number }
  ): Promise<string> {
    return this.providerManager.enhanceTranscript(transcript, metadata);
  }

  /**
   * Enhanced transcript processing with full metadata context
   * Combines transcript fetching with AI enhancement
   */
  async processVideoTranscript(
    url: string,
    options: {
      enhance?: boolean;
      summarize?: boolean;
      useYouTubeAPI?: boolean;
      youtubeApiKey?: string;
    } = {}
  ): Promise<{
    transcript: string;
    enhanced?: string;
    summary?: string;
    metadata?: { title: string; channel: string; description: string; durationSeconds?: number };
  }> {
    try {
      // Get basic transcript
      const transcript = await getTranscript(url);
      
      if (transcript.startsWith('Error:')) {
        return { transcript };
      }

      // Get metadata for better AI processing
      let metadata: { title: string; channel: string; description: string; durationSeconds?: number } | undefined;
      
      if (options.useYouTubeAPI && options.youtubeApiKey) {
        try {
          metadata = await getYouTubeMetadataAPI(url, options.youtubeApiKey);
        } catch (error) {
          // Fallback to HTML metadata
          metadata = await getYouTubeMetadataHTML(url);
        }
      } else {
        metadata = await getYouTubeMetadataHTML(url);
      }

      const result: any = { transcript, metadata };

      // Enhance transcript if requested
      if (options.enhance) {
        try {
          result.enhanced = await this.enhanceTranscript(transcript, metadata);
        } catch (error) {
          result.enhanced = `Error enhancing transcript: ${error.message}`;
        }
      }

      // Generate summary if requested
      if (options.summarize) {
        try {
          result.summary = await this.summarizeTranscript(transcript, metadata);
        } catch (error) {
          result.summary = `Error generating summary: ${error.message}`;
        }
      }

      return result;

    } catch (error) {
      return {
        transcript: `Error processing video: ${error.message}`
      };
    }
  }

  /**
   * Enhanced transcript processing with timing data
   */
  async processVideoTranscriptWithTimestamps(
    url: string,
    options: {
      rawFormat?: boolean;
      enhance?: boolean;
      useYouTubeAPI?: boolean;
      youtubeApiKey?: string;
    } = {}
  ): Promise<{
    transcript: string;
    enhanced?: string;
    transcriptLines?: TranscriptLine[];
    metadata?: { title: string; channel: string; description: string; durationSeconds?: number };
  }> {
    try {
      // Get transcript lines with timing data
      const transcriptLines = await getTranscriptLines(url);
      
      if (!transcriptLines || transcriptLines.length === 0) {
        return { transcript: 'Error: No transcript lines found for this video.' };
      }

      // Format transcript
      let transcript: string;
      if (options.rawFormat) {
        transcript = formatRawTranscriptWithTimestamps(transcriptLines);
      } else {
        const { formattedText } = formatTranscriptWithTimestamps(transcriptLines);
        transcript = formattedText;
      }

      // Get metadata
      let metadata: { title: string; channel: string; description: string; durationSeconds?: number } | undefined;
      
      if (options.useYouTubeAPI && options.youtubeApiKey) {
        try {
          metadata = await getYouTubeMetadataAPI(url, options.youtubeApiKey);
        } catch (error) {
          metadata = await getYouTubeMetadataHTML(url);
        }
      } else {
        metadata = await getYouTubeMetadataHTML(url);
      }

      const result: any = { transcript, transcriptLines, metadata };

      // Enhance transcript if requested
      if (options.enhance) {
        try {
          // For enhancement, use the original transcript text without timestamps
          const plainTranscript = transcriptLines.map(line => line.text).join(' ');
          result.enhanced = await this.enhanceTranscript(plainTranscript, metadata);
        } catch (error) {
          result.enhanced = `Error enhancing transcript: ${error.message}`;
        }
      }

      return result;

    } catch (error) {
      return {
        transcript: `Error processing video with timestamps: ${error.message}`
      };
    }
  }

  /**
   * Test current provider connection
   */
  async testConnection(): Promise<boolean> {
    const provider = this.providerManager.getCurrentProvider();
    if (!provider) {
      return false;
    }

    try {
      return await provider.testConnection();
    } catch (error) {
      console.error('Provider connection test failed:', error);
      return false;
    }
  }

  /**
   * Get provider status for all configured providers
   */
  async getProviderStatus() {
    return this.providerManager.getProviderStatus();
  }

  /**
   * Get available models for current provider
   */
  async getAvailableModels(): Promise<string[]> {
    const provider = this.providerManager.getCurrentProvider();
    if (!provider) {
      return [];
    }

    try {
      return await provider.getAvailableModels();
    } catch (error) {
      console.error('Failed to get available models:', error);
      return provider.getConfig().availableModels;
    }
  }

  /**
   * Migrate from legacy settings to new provider-based settings
   */
  static migrateFromLegacySettings(legacySettings: {
    openaiApiKey: string;
    aiModel: string;
  }): ProviderManagerSettings {
    return {
      currentProvider: 'openai',
      openai: {
        apiKey: legacySettings.openaiApiKey,
        model: legacySettings.aiModel
      },
      openrouter: {
        apiKey: '',
        model: 'anthropic/claude-3.5-sonnet'
      },
      ollama: {
        baseUrl: 'http://localhost:11434',
        model: ''
      }
    };
  }

  /**
   * Backward compatibility wrapper for the original summarize function
   */
  async summarize(transcript: string, apiKey: string, aiModel: string = 'gpt-4o-mini'): Promise<string> {
    // Create a temporary provider manager with legacy settings
    const tempSettings: ProviderManagerSettings = {
      currentProvider: 'openai',
      openai: {
        apiKey: apiKey,
        model: aiModel
      },
      openrouter: {
        apiKey: '',
        model: 'anthropic/claude-3.5-sonnet'
      },
      ollama: {
        baseUrl: 'http://localhost:11434',
        model: ''
      }
    };

    const tempManager = new ProviderManager(tempSettings);
    return tempManager.summarizeTranscript(transcript);
  }

  /**
   * Check if a specific provider is properly configured
   */
  isProviderConfigured(provider: string): boolean {
    return this.providerManager.isProviderAvailable(provider as any);
  }
}

/**
 * Backward compatibility export - maintains existing function interface
 * @deprecated Use LLMSummarizer class instead
 */
export async function summarize(transcript: string, apiKey: string, aiModel: string = 'gpt-4o-mini'): Promise<string> {
  const summarizer = new LLMSummarizer({
    currentProvider: 'openai',
    openai: {
      apiKey: apiKey,
      model: aiModel
    },
    openrouter: {
      apiKey: '',
      model: 'anthropic/claude-3.5-sonnet'
    },
    ollama: {
      baseUrl: 'http://localhost:11434',
      model: 'llama3.1:8b'
    }
  });

  return summarizer.summarizeTranscript(transcript);
}

// Re-export existing functions for compatibility
export {
  getTranscript,
  getTranscriptLines,
  formatRawTranscriptWithTimestamps,
  formatTranscriptWithTimestamps,
  getYouTubeMetadataAPI,
  getYouTubeMetadataHTML
} from './summarizer';