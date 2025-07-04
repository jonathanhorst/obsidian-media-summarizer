import { requestUrl } from 'obsidian';
import { BaseLLMProvider, LLMRequest, LLMResponse, ProviderConfig, createRequestOptions } from './base';

/**
 * OpenAI provider implementation for Obsidian plugin
 * Supports GPT-3.5-turbo, GPT-4, GPT-4-turbo, and GPT-4o models
 */
export class OpenAIProvider extends BaseLLMProvider {
  constructor(apiKey: string, baseUrl: string = 'https://api.openai.com/v1') {
    const config: ProviderConfig = {
      name: 'OpenAI',
      baseUrl,
      apiKey,
      defaultModel: 'gpt-4o-mini',
      availableModels: [
        'gpt-4o-mini',
        'gpt-4o',
        'gpt-4-turbo',
        'gpt-4',
        'gpt-3.5-turbo'
      ],
      requiresAuth: true,
      isLocal: false,
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

    const { headers, baseUrl } = createRequestOptions(this.config.baseUrl, this.config.apiKey);

    const requestBody = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.3,
      max_tokens: request.max_tokens ?? 4000
    };

    try {
      const response = await requestUrl({
        url: `${baseUrl}/chat/completions`,
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (response.status !== 200) {
        throw new Error(`OpenAI API error: ${response.status} ${response.text}`);
      }

      const data = response.json;

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from OpenAI API');
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
      throw new Error(`OpenAI request failed: ${this.formatError(error)}`);
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
      console.error('OpenAI connection test failed:', error);
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const { headers, baseUrl } = createRequestOptions(this.config.baseUrl, this.config.apiKey);

      const response = await requestUrl({
        url: `${baseUrl}/models`,
        method: 'GET',
        headers
      });

      if (response.status !== 200) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data = response.json;
      
      // Filter for chat completion models only
      const chatModels = data.data
        .filter((model: any) => 
          model.id.includes('gpt') && 
          !model.id.includes('instruct') &&
          !model.id.includes('edit') &&
          !model.id.includes('search')
        )
        .map((model: any) => model.id)
        .sort();

      return chatModels.length > 0 ? chatModels : this.config.availableModels;
    } catch (error) {
      console.warn('Failed to fetch OpenAI models, using defaults:', error);
      return this.config.availableModels;
    }
  }

  /**
   * Enhanced transcript summarization with metadata context
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

    // Chunk transcript if too long
    const chunks = this.chunkTranscript(transcript);
    const summaries: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const isMultiChunk = chunks.length > 1;

      const systemPrompt = `You are an expert at creating concise, well-structured summaries of video transcripts. Create a summary that captures the key points, main arguments, and important details. ${isMultiChunk ? `This is part ${i + 1} of ${chunks.length} of a longer transcript.` : ''}`;

      let userPrompt = 'Please provide a comprehensive summary of this video transcript:\\n\\n';
      
      // Add metadata context if available
      if (metadata?.title) {
        userPrompt += `Video Title: "${metadata.title}"\\n`;
      }
      if (metadata?.channel) {
        userPrompt += `Channel: "${metadata.channel}"\\n`;
      }
      if (metadata?.description) {
        userPrompt += `Description: "${metadata.description}"\\n`;
      }
      
      userPrompt += `\\nTranscript:\\n${chunk}`;

      const request: LLMRequest = {
        model: this.config.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000
      };

      const response = await this.chatCompletion(request);
      summaries.push(isMultiChunk ? `**Part ${i + 1}:**\\n${response.content}` : response.content);
    }

    // Combine summaries if there were multiple chunks
    if (summaries.length > 1) {
      return `# Video Summary\\n\\n${summaries.join('\\n\\n---\\n\\n')}`;
    } else {
      return summaries[0];
    }
  }

  /**
   * Enhanced transcript formatting with speaker detection
   */
  async enhanceTranscript(
    transcript: string,
    metadata?: { title?: string; channel?: string; description?: string; durationSeconds?: number }
  ): Promise<string> {
    if (!transcript || transcript.trim().length === 0) {
      throw new Error('No transcript content to enhance');
    }

    const durationDisplay = metadata?.durationSeconds ? 
      `${Math.floor(metadata.durationSeconds / 60)}:${(metadata.durationSeconds % 60).toString().padStart(2, '0')}` : 
      'Unknown';

    const systemPrompt = 'You are an expert transcript editor. Your job is to clean up raw transcript text while preserving the EXACT spoken words. Only add punctuation, formatting, and organization to make the actual spoken content more readable.';

    const userPrompt = `CONTEXT INFORMATION:
${metadata?.title ? `Video Title: "${metadata.title}"` : ''}
${metadata?.channel ? `Channel: "${metadata.channel}"` : ''}
${metadata?.durationSeconds ? `Video Duration: ${durationDisplay}` : ''}
${metadata?.description ? `Description: "${metadata.description}"` : ''}

--- END OF CONTEXT ---

RAW TRANSCRIPT:
${transcript}

--- END OF TRANSCRIPT ---

IMPORTANT: Your task is to clean up the raw transcript text while preserving the spoken words. Only add words to complete sentences. Add punctuation, proper capitalization, paragraph breaks, and organize into sections with timestamps.

STEP 1: First, analyze the transcript to determine how many speakers are present.

STEP 2: Format the transcript based on your speaker analysis:

IF SINGLE SPEAKER (most common):
### Introduction

Use the EXACT words from the transcript, just cleaned up. Add punctuation and paragraph breaks but preserve what was actually said.

### Key Concepts Discussion

Continue with the exact spoken words from the transcript, organized by topic.

IF MULTIPLE SPEAKERS (only when clearly identifiable):
### Introduction

**Host**
Use the exact words spoken by the host, cleaned up with punctuation.

**Guest**
Use the exact words spoken by the guest, cleaned up.

CRITICAL RULES:
- PRESERVE EXACT WORDS: Use the actual spoken words from the transcript
- CLEAN, DON'T REWRITE: Only add punctuation, capitalization, and organization
- Use ### topic-based headings
- Fix spelling of names/technical terms using video context
- Remove excessive filler words but keep core content

Format the output as clean markdown.`;

    const request: LLMRequest = {
      model: this.config.defaultModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 4000
    };

    const response = await this.chatCompletion(request);
    return response.content;
  }

  /**
   * Chunk transcript into manageable pieces
   */
  private chunkTranscript(transcript: string, maxChunkSize: number = 8000): string[] {
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