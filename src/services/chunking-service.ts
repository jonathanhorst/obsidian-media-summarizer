import { TRANSCRIPT_CONSTANTS } from '../constants';

export interface ChunkingOptions {
    maxChunkSize?: number;
    overlapSize?: number;
    preserveContext?: boolean;
}

export interface TextChunk {
    text: string;
    index: number;
    startTime?: number;
    endTime?: number;
}

export interface TranscriptLine {
    text: string;
    start: number;
    duration: number;
}

/**
 * Service for handling text chunking operations across all providers
 * Eliminates code duplication and provides consistent chunking behavior
 */
export class ChunkingService {
    private static instance: ChunkingService | null = null;
    
    private constructor() {}
    
    public static getInstance(): ChunkingService {
        if (!ChunkingService.instance) {
            ChunkingService.instance = new ChunkingService();
        }
        return ChunkingService.instance;
    }
    
    /**
     * Split text into chunks based on token estimation
     */
    public chunkText(text: string, options: ChunkingOptions = {}): TextChunk[] {
        const {
            maxChunkSize = TRANSCRIPT_CONSTANTS.CHUNK_SIZE_LIMIT,
            overlapSize = 200,
            preserveContext = true
        } = options;
        
        if (this.estimateTokens(text) <= maxChunkSize) {
            return [{ text, index: 0 }];
        }
        
        const chunks: TextChunk[] = [];
        const sentences = this.splitIntoSentences(text);
        
        let currentChunk = '';
        let chunkIndex = 0;
        
        for (const sentence of sentences) {
            const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;
            
            if (this.estimateTokens(potentialChunk) > maxChunkSize && currentChunk) {
                // Add current chunk
                chunks.push({
                    text: currentChunk.trim(),
                    index: chunkIndex++
                });
                
                // Start new chunk with overlap if preserveContext is enabled
                if (preserveContext && overlapSize > 0) {
                    const lastSentences = this.getLastSentences(currentChunk, overlapSize);
                    currentChunk = lastSentences + ' ' + sentence;
                } else {
                    currentChunk = sentence;
                }
            } else {
                currentChunk = potentialChunk;
            }
        }
        
        // Add final chunk
        if (currentChunk.trim()) {
            chunks.push({
                text: currentChunk.trim(),
                index: chunkIndex
            });
        }
        
        return chunks;
    }
    
    /**
     * Split transcript lines into chunks while preserving timing information
     */
    public chunkTranscriptLines(lines: TranscriptLine[], options: ChunkingOptions = {}): TextChunk[] {
        const {
            maxChunkSize = TRANSCRIPT_CONSTANTS.CHUNK_SIZE_LIMIT,
            overlapSize = 200
        } = options;
        
        const chunks: TextChunk[] = [];
        let currentLines: TranscriptLine[] = [];
        let chunkIndex = 0;
        
        for (const line of lines) {
            const potentialText = [...currentLines, line]
                .map(l => l.text)
                .join(' ');
            
            if (this.estimateTokens(potentialText) > maxChunkSize && currentLines.length > 0) {
                // Create chunk from current lines
                const chunkText = currentLines.map(l => l.text).join(' ');
                const startTime = currentLines[0].start;
                const endTime = currentLines[currentLines.length - 1].start + 
                               currentLines[currentLines.length - 1].duration;
                
                chunks.push({
                    text: chunkText,
                    index: chunkIndex++,
                    startTime,
                    endTime
                });
                
                // Start new chunk with overlap
                const overlapLines = this.getOverlapLines(currentLines, overlapSize);
                currentLines = [...overlapLines, line];
            } else {
                currentLines.push(line);
            }
        }
        
        // Add final chunk
        if (currentLines.length > 0) {
            const chunkText = currentLines.map(l => l.text).join(' ');
            const startTime = currentLines[0].start;
            const endTime = currentLines[currentLines.length - 1].start + 
                           currentLines[currentLines.length - 1].duration;
            
            chunks.push({
                text: chunkText,
                index: chunkIndex,
                startTime,
                endTime
            });
        }
        
        return chunks;
    }
    
    /**
     * Estimate token count for text (rough approximation)
     */
    public estimateTokens(text: string): number {
        // Rough estimation: 1 token ≈ 4 characters for English text
        return Math.ceil(text.length / 4);
    }
    
    /**
     * Check if text needs chunking
     */
    public needsChunking(text: string, maxTokens: number = TRANSCRIPT_CONSTANTS.TOKEN_ESTIMATION_THRESHOLD): boolean {
        return this.estimateTokens(text) > maxTokens;
    }
    
    /**
     * Merge chunks back into a single text
     */
    public mergeChunks(chunks: TextChunk[]): string {
        return chunks
            .sort((a, b) => a.index - b.index)
            .map(chunk => chunk.text)
            .join('\n\n');
    }
    
    /**
     * Get chunk statistics
     */
    public getChunkStats(chunks: TextChunk[]): {
        totalChunks: number;
        averageTokens: number;
        maxTokens: number;
        minTokens: number;
    } {
        const tokenCounts = chunks.map(chunk => this.estimateTokens(chunk.text));
        
        return {
            totalChunks: chunks.length,
            averageTokens: Math.round(tokenCounts.reduce((a, b) => a + b, 0) / tokenCounts.length),
            maxTokens: Math.max(...tokenCounts),
            minTokens: Math.min(...tokenCounts)
        };
    }
    
    private splitIntoSentences(text: string): string[] {
        // Split on sentence boundaries while preserving sentence structure
        return text
            .split(/(?<=[.!?])\s+/)
            .filter(sentence => sentence.trim().length > 0);
    }
    
    private getLastSentences(text: string, maxChars: number): string {
        const sentences = this.splitIntoSentences(text);
        let result = '';
        
        for (let i = sentences.length - 1; i >= 0; i--) {
            const candidate = sentences[i] + (result ? ' ' : '') + result;
            if (candidate.length <= maxChars) {
                result = candidate;
            } else {
                break;
            }
        }
        
        return result;
    }
    
    private getOverlapLines(lines: TranscriptLine[], maxChars: number): TranscriptLine[] {
        const overlapLines: TranscriptLine[] = [];
        let totalChars = 0;
        
        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i];
            if (totalChars + line.text.length <= maxChars) {
                overlapLines.unshift(line);
                totalChars += line.text.length;
            } else {
                break;
            }
        }
        
        return overlapLines;
    }
}