import { requestUrl } from 'obsidian';
import { BaseLLMProvider, LLMRequest, LLMResponse, ProviderConfig, createRequestOptions } from './base';

/**
 * OpenRouter provider implementation for Obsidian plugin
 * Provides access to multiple AI models through a unified OpenAI-compatible API
 */
export class OpenRouterProvider extends BaseLLMProvider {
  constructor(apiKey: string, baseUrl: string = 'https://openrouter.ai/api/v1') {
    const config: ProviderConfig = {
      name: 'OpenRouter',
      baseUrl,
      apiKey,
      defaultModel: 'anthropic/claude-3.5-sonnet',
      availableModels: [],
      requiresAuth: true,
      isLocal: false,
      maxTokens: 8000,
      supportsStreaming: true,
      headers: {
        'HTTP-Referer': 'https://github.com/jonathanhorst/obsidian-media-summarizer',
        'X-Title': 'Media Summarizer Plugin'
      }
    };

    super(config);
  }

  async chatCompletion(request: LLMRequest): Promise<LLMResponse> {
    const validation = this.validateRequest(request);
    if (!validation.valid) {
      throw new Error(`Invalid request: ${validation.errors.join(', ')}`);
    }

    const { headers, baseUrl } = createRequestOptions(
      this.config.baseUrl, 
      this.config.apiKey,
      this.config.headers
    );

    const requestBody = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.3,
      max_tokens: request.max_tokens ?? 4000,
      // OpenRouter-specific parameters
      route: 'fallback', // Enable fallback to alternative providers
      provider: {
        order: ['primary', 'fallback'],
        require_parameters: false
      }
    };

    try {
      const response = await requestUrl({
        url: `${baseUrl}/chat/completions`,
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (response.status !== 200) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.text}`);
      }

      const data = response.json;

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from OpenRouter API');
      }

      return {
        content: data.choices[0].message.content.trim(),
        model: data.model,
        usage: data.usage ? {
          prompt_tokens: data.usage.prompt_tokens,
          completion_tokens: data.usage.completion_tokens,
          total_tokens: data.usage.total_tokens
        } : undefined,
        finish_reason: data.choices[0].finish_reason
      };

    } catch (error) {
      throw new Error(`OpenRouter request failed: ${this.formatError(error)}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
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
      console.error('OpenRouter connection test failed:', error);
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const { headers, baseUrl } = createRequestOptions(
        this.config.baseUrl, 
        this.config.apiKey,
        this.config.headers
      );

      const response = await requestUrl({
        url: `${baseUrl}/models`,
        method: 'GET',
        headers
      });

      if (response.status !== 200) {
        throw new Error(`Failed to fetch OpenRouter models: ${response.status}`);
      }

      const data = response.json;
      
      if (data.data && Array.isArray(data.data)) {
        // Filter for models that support chat completions
        const chatModels = data.data
          .filter((model: any) => 
            model.id && 
            !model.id.includes('embedding') &&
            !model.id.includes('moderation') &&
            model.id.includes('/')  // OpenRouter models have provider/model format
          )
          .map((model: any) => model.id)
          .sort();

        return chatModels.length > 0 ? chatModels : [];
      }

      return [];
    } catch (error) {
      console.warn('Failed to fetch OpenRouter models:', error);
      return [];
    }
  }

  /**
   * Enhanced transcript summarization with model selection optimization
   */
  async summarizeTranscript(
    transcript: string,
    metadata?: { title?: string; channel?: string; description?: string },
    preferredModel?: string
  ): Promise<string> {
    if (!transcript || transcript.trim().length === 0) {
      throw new Error('No transcript content to summarize');
    }

    if (transcript.startsWith('Error:')) {
      return transcript;
    }

    // Choose optimal model based on transcript length and complexity
    const model = preferredModel || this.selectOptimalModel(transcript);

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

    // Chunk if necessary (OpenRouter can handle larger chunks than local models)
    const chunks = this.chunkTranscript(transcript, 12000);
    const summaries: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const isMultiChunk = chunks.length > 1;

      const request: LLMRequest = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt.replace(transcript, chunk) }
        ],
        temperature: 0.3,
        max_tokens: 1200
      };

      const response = await this.chatCompletion(request);
      summaries.push(isMultiChunk ? `**Part ${i + 1}:**\\n${response.content}` : response.content);
    }

    return summaries.length > 1 ? 
      `# Video Summary\\n\\n${summaries.join('\\n\\n---\\n\\n')}` : 
      summaries[0];
  }

  /**
   * Enhanced transcript formatting with advanced model capabilities
   */
  async enhanceTranscript(
    transcript: string,
    metadata?: { title?: string; channel?: string; description?: string; durationSeconds?: number },
    preferredModel?: string
  ): Promise<string> {
    if (!transcript || transcript.trim().length === 0) {
      throw new Error('No transcript content to enhance');
    }

    // Use Claude for complex transcript enhancement (better at following detailed instructions)
    const model = preferredModel || 'anthropic/claude-3.5-sonnet';

    const durationDisplay = metadata?.durationSeconds ? 
      `${Math.floor(metadata.durationSeconds / 60)}:${(metadata.durationSeconds % 60).toString().padStart(2, '0')}` : 
      'Unknown';

    const systemPrompt = 'You are an expert transcript editor specializing in video content. Your job is to transform raw, auto-generated transcripts into polished, readable content while preserving every spoken word.';

    const userPrompt = `Transform this raw video transcript into a well-formatted, readable document:

CONTEXT:
${metadata?.title ? `Title: "${metadata.title}"` : ''}
${metadata?.channel ? `Channel: "${metadata.channel}"` : ''}
${metadata?.durationSeconds ? `Duration: ${durationDisplay}` : ''}
${metadata?.description ? `Description: "${metadata.description}"` : ''}

RAW TRANSCRIPT:
${transcript}

INSTRUCTIONS:
1. Preserve ALL spoken words - do not summarize or paraphrase
2. Add proper punctuation, capitalization, and paragraph breaks
3. Organize content with ### topic headings
4. Identify speakers if multiple people are talking
5. Fix obvious transcription errors using context
6. Remove excessive filler words (um, uh, like) but keep natural speech patterns
7. Format as clean Markdown

OUTPUT FORMAT:
- Use ### for section headings based on topic changes
- Use **Speaker Name:** format if multiple speakers
- Create logical paragraph breaks
- Maintain chronological flow of content`;

    const request: LLMRequest = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: Math.min(transcript.length * 2, 6000)
    };

    const response = await this.chatCompletion(request);
    return response.content;
  }

  /**
   * Select optimal model based on task characteristics
   */
  private selectOptimalModel(transcript: string): string {
    const length = transcript.length;
    
    // For very large transcripts, use Claude (better context handling)
    if (length > 20000) {
      return 'anthropic/claude-3.5-sonnet';
    }
    
    // For medium transcripts, use GPT-4o-mini (good balance)
    if (length > 5000) {
      return 'openai/gpt-4o-mini';
    }
    
    // For smaller transcripts, use Claude Haiku (fast and efficient)
    return 'anthropic/claude-3-haiku';
  }

  /**
   * Chunk transcript for processing
   */
  private chunkTranscript(transcript: string, maxChunkSize: number = 12000): string[] {
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