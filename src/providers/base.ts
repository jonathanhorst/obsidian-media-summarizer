/**
 * Base types and interfaces for LLM providers in Obsidian plugin
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  finish_reason?: string;
}

export interface ProviderConfig {
  name: string;
  baseUrl: string;
  apiKey?: string;
  defaultModel: string;
  availableModels: string[];
  requiresAuth: boolean;
  isLocal: boolean;
  maxTokens?: number;
  supportsStreaming?: boolean;
  headers?: Record<string, string>;
}

export interface TestResult {
  provider: string;
  model: string;
  success: boolean;
  responseTime: number;
  error?: string;
  content?: string;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

/**
 * Abstract base class for all LLM providers
 * Implements the OpenAI-compatible interface standard
 */
export abstract class BaseLLMProvider {
  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  /**
   * Make a chat completion request
   */
  abstract chatCompletion(request: LLMRequest): Promise<LLMResponse>;

  /**
   * Test connection to the provider
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Get available models from the provider
   */
  abstract getAvailableModels(): Promise<string[]>;

  /**
   * Validate provider configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.name) {
      errors.push('Provider name is required');
    }

    if (!this.config.baseUrl) {
      errors.push('Base URL is required');
    }

    if (this.config.requiresAuth && !this.config.apiKey) {
      errors.push('API key is required for authenticated providers');
    }

    if (!this.config.defaultModel) {
      errors.push('Default model is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get provider configuration
   */
  getConfig(): ProviderConfig {
    return { ...this.config };
  }

  /**
   * Update provider configuration
   */
  updateConfig(updates: Partial<ProviderConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Format error messages in a user-friendly way
   */
  protected formatError(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error?.message) {
      return error.message;
    }

    if (error?.response?.data?.error?.message) {
      return error.response.data.error.message;
    }

    if (error?.status) {
      switch (error.status) {
        case 401:
          return 'Authentication failed - check your API key';
        case 403:
          return 'Access forbidden - check your permissions';
        case 429:
          return 'Rate limit exceeded - please wait and try again';
        case 500:
          return 'Server error - please try again later';
        default:
          return `HTTP ${error.status} error`;
      }
    }

    return 'Unknown error occurred';
  }

  /**
   * Validate and sanitize LLM request
   */
  protected validateRequest(request: LLMRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.model) {
      errors.push('Model is required');
    }

    if (!request.messages || !Array.isArray(request.messages)) {
      errors.push('Messages array is required');
    } else {
      request.messages.forEach((msg, index) => {
        if (!msg.role || !['system', 'user', 'assistant'].includes(msg.role)) {
          errors.push(`Invalid role at message ${index}`);
        }
        if (!msg.content) {
          errors.push(`Content is required at message ${index}`);
        }
      });
    }

    if (request.temperature !== undefined && (request.temperature < 0 || request.temperature > 2)) {
      errors.push('Temperature must be between 0 and 2');
    }

    if (request.max_tokens !== undefined && request.max_tokens < 1) {
      errors.push('Max tokens must be greater than 0');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * Utility function to create HTTP request options for Obsidian's requestUrl
 */
export function createRequestOptions(
  baseUrl: string,
  apiKey?: string,
  additionalHeaders?: Record<string, string>
): {
  headers: Record<string, string>;
  baseUrl: string;
} {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'MediaSummarizer/1.0',
    ...additionalHeaders
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  return {
    headers,
    baseUrl
  };
}

/**
 * Utility function to measure execution time
 */
export async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; time: number }> {
  const start = Date.now();
  const result = await fn();
  const time = Date.now() - start;
  return { result, time };
}