import { ChunkingService, ErrorHandlingService } from './index';
import { TRANSCRIPT_CONSTANTS, ERROR_MESSAGES } from '../constants';

export interface TranscriptLine {
    text: string;
    start: number;
    duration: number;
}

export interface TranscriptMetadata {
    videoId: string;
    title?: string;
    description?: string;
    duration?: number;
    language?: string;
}

export interface TranscriptProcessingOptions {
    enhanceFormatting?: boolean;
    chunkForProcessing?: boolean;
    preserveTimestamps?: boolean;
    maxChunkSize?: number;
}

export interface TranscriptResult {
    success: boolean;
    transcript?: string;
    lines?: TranscriptLine[];
    metadata?: TranscriptMetadata;
    error?: string;
    chunked?: boolean;
    chunkCount?: number;
}

/**
 * Service for handling transcript operations
 * Consolidates transcript fetching, processing, and enhancement logic
 */
export class TranscriptService {
    private static instance: TranscriptService | null = null;
    private chunkingService: ChunkingService;
    private errorHandler: ErrorHandlingService;
    
    private constructor() {
        this.chunkingService = ChunkingService.getInstance();
        this.errorHandler = ErrorHandlingService.getInstance();
    }
    
    public static getInstance(): TranscriptService {
        if (!TranscriptService.instance) {
            TranscriptService.instance = new TranscriptService();
        }
        return TranscriptService.instance;
    }
    
    /**
     * Fetch transcript with multiple fallback strategies
     */
    public async fetchTranscript(
        videoId: string,
        options: TranscriptProcessingOptions = {}
    ): Promise<TranscriptResult> {
        try {
            // Try multiple transcript sources
            const strategies = [
                () => this.fetchYouTubeTranscript(videoId),
                () => this.fetchExternalTranscript(videoId),
                () => this.fetchYouTubeApiTranscript(videoId)
            ];
            
            let lastError: Error | null = null;
            
            for (const strategy of strategies) {
                try {
                    const result = await strategy();
                    if (result.success) {
                        return this.processTranscript(result, options);
                    }
                } catch (error) {
                    lastError = error as Error;
                    continue;
                }
            }
            
            throw lastError || new Error(ERROR_MESSAGES.TRANSCRIPT_FETCH_FAILED);
        } catch (error) {
            return await this.errorHandler.handleApiError(error, {
                operation: 'fetch_transcript',
                details: { videoId }
            });
        }
    }
    
    /**
     * Process transcript with optional enhancements
     */
    public async processTranscript(
        rawResult: TranscriptResult,
        options: TranscriptProcessingOptions = {}
    ): Promise<TranscriptResult> {
        const {
            enhanceFormatting = false,
            chunkForProcessing = false,
            preserveTimestamps = true,
            maxChunkSize = TRANSCRIPT_CONSTANTS.CHUNK_SIZE_LIMIT
        } = options;
        
        if (!rawResult.success || !rawResult.transcript) {
            return rawResult;
        }
        
        let processedTranscript = rawResult.transcript;
        let processedLines = rawResult.lines;
        
        // Check if chunking is needed
        const needsChunking = chunkForProcessing && 
                            this.chunkingService.needsChunking(processedTranscript);
        
        if (needsChunking) {
            const chunks = processedLines 
                ? this.chunkingService.chunkTranscriptLines(processedLines, { maxChunkSize })
                : this.chunkingService.chunkText(processedTranscript, { maxChunkSize });
            
            return {
                ...rawResult,
                chunked: true,
                chunkCount: chunks.length,
                transcript: this.chunkingService.mergeChunks(chunks)
            };
        }
        
        // Apply formatting enhancements
        if (enhanceFormatting) {
            processedTranscript = this.enhanceTranscriptFormatting(processedTranscript);
        }
        
        return {
            ...rawResult,
            transcript: processedTranscript,
            lines: processedLines
        };
    }
    
    /**
     * Extract video ID from various YouTube URL formats
     */
    public extractVideoId(url: string): string | null {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        return null;
    }
    
    /**
     * Validate transcript quality
     */
    public validateTranscriptQuality(transcript: string): {
        isValid: boolean;
        quality: 'high' | 'medium' | 'low';
        issues: string[];
    } {
        const issues: string[] = [];
        let quality: 'high' | 'medium' | 'low' = 'high';
        
        // Check length
        if (transcript.length < 100) {
            issues.push('Transcript is too short');
            quality = 'low';
        }
        
        // Check for repeated patterns (indicates auto-generated issues)
        const repeatedPatterns = /(.{10,})\1{3,}/g;
        if (repeatedPatterns.test(transcript)) {
            issues.push('Contains repeated patterns');
            quality = quality === 'high' ? 'medium' : 'low';
        }
        
        // Check for proper punctuation
        const punctuationRatio = (transcript.match(/[.!?]/g) || []).length / transcript.length;
        if (punctuationRatio < 0.01) {
            issues.push('Lacks proper punctuation');
            quality = quality === 'high' ? 'medium' : 'low';
        }
        
        // Check for capitalization
        const capitalizedWords = transcript.match(/[A-Z][a-z]+/g) || [];
        if (capitalizedWords.length < transcript.split(' ').length * 0.1) {
            issues.push('Lacks proper capitalization');
            quality = quality === 'high' ? 'medium' : 'low';
        }
        
        return {
            isValid: issues.length === 0 || quality !== 'low',
            quality,
            issues
        };
    }
    
    /**
     * Get transcript statistics
     */
    public getTranscriptStats(transcript: string): {
        wordCount: number;
        characterCount: number;
        estimatedTokens: number;
        estimatedReadingTime: number;
        language: string;
    } {
        const words = transcript.trim().split(/\s+/).filter(word => word.length > 0);
        const characters = transcript.length;
        const estimatedTokens = this.chunkingService.estimateTokens(transcript);
        const estimatedReadingTime = Math.ceil(words.length / 200); // 200 WPM average
        
        return {
            wordCount: words.length,
            characterCount: characters,
            estimatedTokens,
            estimatedReadingTime,
            language: this.detectLanguage(transcript)
        };
    }
    
    /**
     * Convert transcript lines to formatted text
     */
    public formatTranscriptLines(lines: TranscriptLine[], includeTimestamps: boolean = true): string {
        return lines.map(line => {
            const timestamp = includeTimestamps ? `[${this.formatTime(line.start)}] ` : '';
            return `${timestamp}${line.text}`;
        }).join('\n');
    }
    
    /**
     * Search transcript for specific terms
     */
    public searchTranscript(
        transcript: string,
        searchTerm: string,
        caseSensitive: boolean = false
    ): Array<{
        match: string;
        context: string;
        position: number;
    }> {
        const flags = caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(searchTerm, flags);
        const matches = [];
        let match;
        
        while ((match = regex.exec(transcript)) !== null) {
            const start = Math.max(0, match.index - 50);
            const end = Math.min(transcript.length, match.index + match[0].length + 50);
            const context = transcript.substring(start, end);
            
            matches.push({
                match: match[0],
                context,
                position: match.index
            });
        }
        
        return matches;
    }
    
    // Private helper methods
    private async fetchYouTubeTranscript(videoId: string): Promise<TranscriptResult> {
        // Implementation would use youtube-transcript library
        // This is a placeholder for the actual implementation
        throw new Error('YouTube transcript fetching not implemented');
    }
    
    private async fetchExternalTranscript(videoId: string): Promise<TranscriptResult> {
        // Implementation would use external transcript detection
        // This is a placeholder for the actual implementation
        throw new Error('External transcript fetching not implemented');
    }
    
    private async fetchYouTubeApiTranscript(videoId: string): Promise<TranscriptResult> {
        // Implementation would use YouTube Data API
        // This is a placeholder for the actual implementation
        throw new Error('YouTube API transcript fetching not implemented');
    }
    
    private enhanceTranscriptFormatting(transcript: string): string {
        // Basic formatting enhancements
        let enhanced = transcript
            // Fix common spacing issues
            .replace(/\s+/g, ' ')
            // Add proper sentence endings
            .replace(/([.!?])\s*([a-z])/g, '$1 $2')
            // Capitalize first letter of sentences
            .replace(/(^|\. )([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase())
            // Remove excessive punctuation
            .replace(/[.]{2,}/g, '.')
            .replace(/[!]{2,}/g, '!')
            .replace(/[?]{2,}/g, '?');
        
        return enhanced.trim();
    }
    
    private detectLanguage(transcript: string): string {
        // Simple language detection based on common words
        const englishWords = ['the', 'and', 'to', 'of', 'a', 'in', 'is', 'it', 'you', 'that'];
        const words = transcript.toLowerCase().split(/\s+/);
        const englishCount = words.filter(word => englishWords.includes(word)).length;
        
        if (englishCount > words.length * 0.1) {
            return 'en';
        }
        
        return 'unknown';
    }
    
    private formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}