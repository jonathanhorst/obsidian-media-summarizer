import { Notice } from 'obsidian';
import { ERROR_MESSAGES, SUCCESS_MESSAGES, PROVIDER_CONSTANTS } from '../constants';

export interface ErrorContext {
    operation: string;
    provider?: string;
    details?: any;
    timestamp?: Date;
}

export interface ErrorRecoveryOptions {
    showNotice?: boolean;
    noticeTimeout?: number;
    logError?: boolean;
    attemptRecovery?: boolean;
    fallbackAction?: () => Promise<any>;
}

export class AppError extends Error {
    public readonly code: string;
    public readonly context: ErrorContext;
    public readonly recoverable: boolean;
    
    constructor(
        message: string,
        code: string,
        context: ErrorContext,
        recoverable: boolean = true
    ) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.context = context;
        this.recoverable = recoverable;
        
        // Maintains proper stack trace for where our error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AppError);
        }
    }
}

/**
 * Service for handling errors consistently across the application
 * Provides error categorization, recovery strategies, and user feedback
 */
export class ErrorHandlingService {
    private static instance: ErrorHandlingService | null = null;
    private errorHistory: AppError[] = [];
    private readonly maxHistorySize = 100;
    
    private constructor() {}
    
    public static getInstance(): ErrorHandlingService {
        if (!ErrorHandlingService.instance) {
            ErrorHandlingService.instance = new ErrorHandlingService();
        }
        return ErrorHandlingService.instance;
    }
    
    /**
     * Handle API errors with automatic categorization and recovery
     */
    public async handleApiError(
        error: any,
        context: ErrorContext,
        options: ErrorRecoveryOptions = {}
    ): Promise<any> {
        const {
            showNotice = true,
            noticeTimeout = 4000,
            logError = true,
            attemptRecovery = true,
            fallbackAction
        } = options;
        
        const appError = this.categorizeError(error, context);
        
        if (logError) {
            this.logError(appError);
        }
        
        if (showNotice) {
            this.showErrorNotice(appError, noticeTimeout);
        }
        
        // Store error in history
        this.addToHistory(appError);
        
        // Attempt recovery if enabled
        if (attemptRecovery && appError.recoverable) {
            return this.attemptRecovery(appError, fallbackAction);
        }
        
        throw appError;
    }
    
    /**
     * Handle validation errors
     */
    public handleValidationError(
        field: string,
        value: any,
        requirements: string,
        context: ErrorContext
    ): AppError {
        const message = `Invalid ${field}: ${requirements}`;
        const error = new AppError(
            message,
            'VALIDATION_ERROR',
            { ...context, details: { field, value, requirements } },
            false
        );
        
        this.logError(error);
        this.showErrorNotice(error, 3000);
        
        return error;
    }
    
    /**
     * Handle network errors with retry capability
     */
    public async handleNetworkError(
        error: any,
        context: ErrorContext,
        retryOptions?: {
            maxRetries?: number;
            backoffMs?: number;
            retryCondition?: (error: any) => boolean;
        }
    ): Promise<any> {
        const maxRetries = retryOptions?.maxRetries || 3;
        const backoffMs = retryOptions?.backoffMs || 1000;
        const retryCondition = retryOptions?.retryCondition || (() => true);
        
        const appError = this.categorizeError(error, context);
        
        if (appError.recoverable && retryCondition(error)) {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    await this.delay(backoffMs * attempt);
                    // Return success indicator to allow caller to retry
                    return { shouldRetry: true, attempt };
                } catch (retryError) {
                    if (attempt === maxRetries) {
                        throw appError;
                    }
                }
            }
        }
        
        throw appError;
    }
    
    /**
     * Show success message to user
     */
    public showSuccess(message: string, timeout: number = 3000): void {
        new Notice(message, timeout);
    }
    
    /**
     * Show info message to user
     */
    public showInfo(message: string, timeout: number = 4000): void {
        new Notice(message, timeout);
    }
    
    /**
     * Get error statistics
     */
    public getErrorStats(): {
        totalErrors: number;
        errorsByType: Record<string, number>;
        errorsByProvider: Record<string, number>;
        recentErrors: AppError[];
    } {
        const errorsByType: Record<string, number> = {};
        const errorsByProvider: Record<string, number> = {};
        
        this.errorHistory.forEach(error => {
            errorsByType[error.code] = (errorsByType[error.code] || 0) + 1;
            if (error.context.provider) {
                errorsByProvider[error.context.provider] = (errorsByProvider[error.context.provider] || 0) + 1;
            }
        });
        
        return {
            totalErrors: this.errorHistory.length,
            errorsByType,
            errorsByProvider,
            recentErrors: this.errorHistory.slice(-10)
        };
    }
    
    /**
     * Clear error history
     */
    public clearHistory(): void {
        this.errorHistory = [];
    }
    
    private categorizeError(error: any, context: ErrorContext): AppError {
        const timestamp = new Date();
        const enhancedContext = { ...context, timestamp };
        
        // API errors
        if (error.response || error.status) {
            const status = error.response?.status || error.status;
            
            switch (status) {
                case PROVIDER_CONSTANTS.HTTP_STATUS_CODES.UNAUTHORIZED:
                    return new AppError(
                        ERROR_MESSAGES.API_KEY_INVALID,
                        'API_UNAUTHORIZED',
                        enhancedContext,
                        false
                    );
                    
                case PROVIDER_CONSTANTS.HTTP_STATUS_CODES.FORBIDDEN:
                    return new AppError(
                        ERROR_MESSAGES.API_KEY_INVALID,
                        'API_FORBIDDEN',
                        enhancedContext,
                        false
                    );
                    
                case PROVIDER_CONSTANTS.HTTP_STATUS_CODES.RATE_LIMITED:
                    return new AppError(
                        ERROR_MESSAGES.API_RATE_LIMITED,
                        'API_RATE_LIMITED',
                        enhancedContext,
                        true
                    );
                    
                case PROVIDER_CONSTANTS.HTTP_STATUS_CODES.SERVER_ERROR:
                case PROVIDER_CONSTANTS.HTTP_STATUS_CODES.SERVICE_UNAVAILABLE:
                    return new AppError(
                        ERROR_MESSAGES.NETWORK_ERROR,
                        'API_SERVER_ERROR',
                        enhancedContext,
                        true
                    );
                    
                default:
                    return new AppError(
                        error.message || ERROR_MESSAGES.GENERIC_ERROR,
                        'API_ERROR',
                        enhancedContext,
                        true
                    );
            }
        }
        
        // Network errors
        if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
            return new AppError(
                ERROR_MESSAGES.NETWORK_ERROR,
                'NETWORK_ERROR',
                enhancedContext,
                true
            );
        }
        
        // Timeout errors
        if (error.code === 'TIMEOUT' || error.message?.includes('timeout')) {
            return new AppError(
                ERROR_MESSAGES.TIMEOUT_ERROR,
                'TIMEOUT_ERROR',
                enhancedContext,
                true
            );
        }
        
        // Default error
        return new AppError(
            error.message || ERROR_MESSAGES.GENERIC_ERROR,
            'UNKNOWN_ERROR',
            enhancedContext,
            true
        );
    }
    
    private showErrorNotice(error: AppError, timeout: number): void {
        const message = error.context.provider 
            ? `${error.context.provider}: ${error.message}`
            : error.message;
            
        new Notice(message, timeout);
    }
    
    private logError(error: AppError): void {
        console.error(`[${error.code}] ${error.message}`, {
            context: error.context,
            stack: error.stack
        });
    }
    
    private addToHistory(error: AppError): void {
        this.errorHistory.push(error);
        
        // Keep history size manageable
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
        }
    }
    
    private async attemptRecovery(error: AppError, fallbackAction?: () => Promise<any>): Promise<any> {
        if (fallbackAction) {
            try {
                return await fallbackAction();
            } catch (fallbackError) {
                console.error('Fallback action failed:', fallbackError);
                throw error;
            }
        }
        
        // Default recovery strategies based on error type
        switch (error.code) {
            case 'API_RATE_LIMITED':
                // Wait and suggest retry
                await this.delay(2000);
                this.showInfo('Rate limit exceeded. Please try again in a moment.');
                break;
                
            case 'NETWORK_ERROR':
                this.showInfo('Network error. Please check your connection and try again.');
                break;
                
            case 'TIMEOUT_ERROR':
                this.showInfo('Request timed out. Please try again.');
                break;
                
            default:
                // No specific recovery strategy
                break;
        }
        
        throw error;
    }
    
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}