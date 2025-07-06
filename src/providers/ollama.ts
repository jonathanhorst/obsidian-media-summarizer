import { requestUrl } from 'obsidian';
import { BaseLLMProvider, LLMRequest, LLMResponse, ProviderConfig, createRequestOptions } from './base';

/**
 * Ollama provider implementation for Obsidian plugin
 * Supports local Ollama installation with OpenAI-compatible API
 */
export class OllamaProvider extends BaseLLMProvider {
  constructor(baseUrl: string = 'http://localhost:11434') {
    const config: ProviderConfig = {
      name: 'Ollama',
      baseUrl,
      apiKey: 'ollama', // Required by OpenAI client but unused
      defaultModel: '',
      availableModels: [
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
      ],
      requiresAuth: false,
      isLocal: true,
      maxTokens: 8000,
      supportsStreaming: true
    };

    super(config);
  }

  async chatCompletion(request: LLMRequest): Promise<LLMResponse> {
    const validation = this.validateRequest(request);
    if (!validation.valid) {
      throw new Error(`Invalid request: ${validation.errors.join(', ')}`);
    }

    // Check if Ollama is running
    const isRunning = await this.isOllamaRunning();
    if (!isRunning) {
      throw new Error('Ollama is not running. Please start Ollama first.');
    }

    const { headers } = createRequestOptions(this.config.baseUrl);

    const requestBody = {
      model: request.model,
      messages: request.messages,
      options: {
        temperature: request.temperature ?? 0.3,
        num_predict: request.max_tokens ?? 4000
      },
      stream: false
    };

    try {
      const response = await requestUrl({
        url: `${this.config.baseUrl}/v1/chat/completions`,
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (response.status !== 200) {
        throw new Error(`Ollama API error: ${response.status} ${response.text}`);
      }

      const data = response.json;

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from Ollama API');
      }

      return {
        content: data.choices[0].message.content.trim(),
        model: data.model,
        usage: data.usage ? {
          prompt_tokens: data.usage.prompt_tokens || 0,
          completion_tokens: data.usage.completion_tokens || 0,
          total_tokens: data.usage.total_tokens || 0
        } : undefined,
        finish_reason: data.choices[0].finish_reason
      };

    } catch (error) {
      throw new Error(`Ollama request failed: ${this.formatError(error)}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // First check if Ollama is running
      const isRunning = await this.isOllamaRunning();
      if (!isRunning) {
        return false;
      }

      // Try a simple chat completion
      const testRequest: LLMRequest = {
        model: this.config.defaultModel,
        messages: [
          { role: 'user', content: 'Hello, this is a connection test. Please respond with "OK".' }
        ],
        max_tokens: 10
      };

      const response = await this.chatCompletion(testRequest);
      return response.content.toLowerCase().includes('ok');
    } catch (error) {
      console.error('Ollama connection test failed:', error);
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      // Check if Ollama is running first
      const isRunning = await this.isOllamaRunning();
      if (!isRunning) {
        console.warn('Ollama is not running, returning default models');
        return this.config.availableModels;
      }

      const response = await requestUrl({
        url: `${this.config.baseUrl}/api/tags`,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.status !== 200) {
        throw new Error(`Failed to fetch Ollama models: ${response.status}`);
      }

      const data = response.json;
      
      if (data.models && Array.isArray(data.models)) {
        const modelNames = data.models.map((model: any) => model.name).sort();
        return modelNames.length > 0 ? modelNames : this.config.availableModels;
      }

      return this.config.availableModels;
    } catch (error) {
      console.warn('Failed to fetch Ollama models, using defaults:', error);
      return this.config.availableModels;
    }
  }

  /**
   * Check if Ollama is running and accessible
   */
  async isOllamaRunning(): Promise<boolean> {
    try {
      const response = await requestUrl({
        url: `${this.config.baseUrl}/api/tags`,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Pull/download a model if not already available
   */
  async pullModel(modelName: string): Promise<boolean> {
    try {
      const response = await requestUrl({
        url: `${this.config.baseUrl}/api/pull`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName })
      });

      if (response.status !== 200) {
        throw new Error(`Failed to pull model: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error(`Failed to pull model ${modelName}:`, error);
      return false;
    }
  }

  /**
   * Enhanced transcript summarization optimized for local models
   */
  async summarizeTranscript(
    transcript: string,
    metadata?: { title?: string; channel?: string; description?: string }
  ): Promise<string> {
    if (!transcript || transcript.trim().length === 0) {
      throw new Error('No transcript content to summarize');
    }

    if (transcript.startsWith('Error:')) {
      return transcript;
    }

    // Use shorter, more direct prompts for local models
    const systemPrompt = 'You are a helpful assistant that creates concise video summaries. Focus on key points and main ideas.';

    let userPrompt = 'Summarize this video transcript. Include the main topics and key takeaways:\\n\\n';
    
    if (metadata?.title) {
      userPrompt += `Title: ${metadata.title}\\n`;
    }
    
    userPrompt += `Transcript: ${transcript}`;

    // Chunk for local models (smaller chunks for better performance)
    const chunks = this.chunkTranscript(transcript, 4000);
    const summaries: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const request: LLMRequest = {
        model: this.config.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt.replace(transcript, chunk) }
        ],
        temperature: 0.3,
        max_tokens: 800 // Smaller for local models
      };

      const response = await this.chatCompletion(request);
      summaries.push(chunks.length > 1 ? `**Part ${i + 1}:**\\n${response.content}` : response.content);
    }

    return summaries.length > 1 ? 
      `# Video Summary\\n\\n${summaries.join('\\n\\n---\\n\\n')}` : 
      summaries[0];
  }

  /**
   * Enhanced transcript formatting optimized for local models
   */
  async enhanceTranscript(
    transcript: string,
    metadata?: { title?: string; channel?: string; description?: string }
  ): Promise<string> {
    if (!transcript || transcript.trim().length === 0) {
      throw new Error('No transcript content to enhance');
    }

    // Simpler prompt for local models
    const systemPrompt = 'Clean up this transcript. Add punctuation, fix capitalization, and organize into paragraphs. Keep the original words.';

    const userPrompt = `Clean up this video transcript. Add proper punctuation and organization but keep all the original spoken words:

${metadata?.title ? `Title: ${metadata.title}` : ''}

Transcript:
${transcript}

Format as readable markdown with headings for different topics.`;

    const request: LLMRequest = {
      model: this.config.defaultModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: Math.min(transcript.length * 2, 4000) // Adaptive based on input length
    };

    const response = await this.chatCompletion(request);
    return response.content;
  }

  /**
   * Chunk transcript for local model processing
   */
  private chunkTranscript(transcript: string, maxChunkSize: number = 4000): string[] {
    if (transcript.length <= maxChunkSize) {
      return [transcript];
    }

    const chunks: string[] = [];
    let currentChunk = '';
    const sentences = transcript.split(/[.!?]+/);

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      if (currentChunk.length + trimmedSentence.length + 1 > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
      }

      currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [transcript];
  }
}