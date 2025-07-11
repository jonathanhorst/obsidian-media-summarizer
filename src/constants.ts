// Constants file to eliminate magic numbers and strings throughout the codebase

export const SETTINGS_CONSTANTS = {
    // Playback settings
    DEFAULT_PLAYBACK_SPEED: 1,
    DEFAULT_SEEK_SECONDS: 10,
    DEFAULT_TIMESTAMP_OFFSET: 2,
    DEFAULT_PLAYBACK_OFFSET: 2,
    
    // UI timing
    SETTINGS_OPEN_DELAY: 100,
    HOTKEYS_NAVIGATION_DELAY: 100,
    FEEDBACK_NOTICE_DURATION: 2000,
    HELP_NOTICE_DURATION: 8000,
    
    // Model and API limits
    MAX_MODELS_DISPLAY: 50,
    MODEL_REFRESH_TIMEOUT: 100,
    
    // Slider limits
    OFFSET_SLIDER_MIN: 0,
    OFFSET_SLIDER_MAX: 10,
    OFFSET_SLIDER_STEP: 1,
    
    // Seek seconds options
    SEEK_SECONDS_OPTIONS: [10, 20, 30, 40, 50, 60],
    
    // Playback speed options (in correct order)
    PLAYBACK_SPEED_OPTIONS: [0.5, 0.75, 1, 1.25, 1.5, 2],
} as const;

export const TRANSCRIPT_CONSTANTS = {
    // Language codes
    SUPPORTED_LANGUAGES: ['en', 'en-US', 'en-GB', 'auto'],
    
    // Processing limits
    TOKEN_ESTIMATION_THRESHOLD: 6000,
    CONTENT_SIZE_LIMIT: 20000,
    CHUNK_SIZE_LIMIT: 6000,
    
    // Default durations
    DEFAULT_FALLBACK_DURATION: 1000,
    
    // YouTube client configuration
    YOUTUBE_CLIENT_VERSION: "2.20250610.04.00",
    YOUTUBE_CLIENT_NAME: "WEB",
    YOUTUBE_CLIENT_VERSION_NUMBER: "2.20250610.04.00",
} as const;

export const PROVIDER_CONSTANTS = {
    // Temperature validation
    TEMPERATURE_MIN: 0,
    TEMPERATURE_MAX: 2,
    
    // Default models
    DEFAULT_OPENAI_MODELS: [
        'gpt-4o-mini',
        'gpt-4o',
        'gpt-4-turbo',
        'gpt-3.5-turbo',
        'Custom Model'
    ],
    
    DEFAULT_OLLAMA_MODELS: [
        'llama3.1:8b',
        'llama3.1:70b',
        'llama3:8b',
        'llama3:70b',
        'mistral:7b',
        'codellama:7b',
        'gemma:7b'
    ],
    
    // API endpoints
    OPENAI_MODELS_ENDPOINT: 'https://api.openai.com/v1/models',
    OPENROUTER_MODELS_ENDPOINT: 'https://openrouter.ai/api/v1/models',
    OLLAMA_MODELS_ENDPOINT: 'http://localhost:11434/api/tags',
    
    // Display limits
    MAX_MODELS_DISPLAY: 50,
    
    // Default model selections
    DEFAULT_OPENAI_MODEL: 'gpt-4o-mini',
    DEFAULT_OPENROUTER_MODEL: 'anthropic/claude-3.5-sonnet',
    DEFAULT_OLLAMA_MODEL: 'llama3.1:8b',
    
    // Error status mappings
    HTTP_STATUS_CODES: {
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        RATE_LIMITED: 429,
        SERVER_ERROR: 500,
        SERVICE_UNAVAILABLE: 503,
    },
} as const;

export const UI_CONSTANTS = {
    // View type
    MEDIA_SUMMARIZER_VIEW_TYPE: 'media-summarizer-view',
    
    // CSS classes
    SCROLL_CONTAINER_CLASS: 'setting-item-control',
    DROPDOWN_CLASS: 'dropdown',
    BUTTON_CLASS: 'mod-cta',
    
    // YouTube player states
    YOUTUBE_PLAYER_STATES: {
        UNSTARTED: -1,
        ENDED: 0,
        PLAYING: 1,
        PAUSED: 2,
        BUFFERING: 3,
        CUED: 5,
    },
    
    // Regex patterns
    TIMESTAMP_REGEX: /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/,
    FRONTMATTER_REGEX: /^---\n([\s\S]*?)\n---/,
    URL_REGEX: /url:\s*(.+)/,
    YOUTUBE_URL_REGEX: /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    YOUTUBE_URL_VALIDATION_REGEX: /^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
} as const;

export const ERROR_MESSAGES = {
    // General errors
    GENERIC_ERROR: 'An error occurred',
    NETWORK_ERROR: 'Network error occurred',
    TIMEOUT_ERROR: 'Request timed out',
    
    // API errors
    API_KEY_INVALID: 'Invalid API key',
    API_KEY_MISSING: 'API key is required',
    API_QUOTA_EXCEEDED: 'API quota exceeded',
    API_RATE_LIMITED: 'Rate limit exceeded',
    
    // Transcript errors
    TRANSCRIPT_NOT_FOUND: 'No transcript available for this video',
    TRANSCRIPT_FETCH_FAILED: 'Failed to fetch transcript',
    TRANSCRIPT_ENHANCEMENT_FAILED: 'Failed to enhance transcript',
    
    // Video errors
    VIDEO_NOT_FOUND: 'Video not found',
    VIDEO_PRIVATE: 'Video is private or restricted',
    VIDEO_UNAVAILABLE: 'Video is unavailable',
    
    // Settings errors
    SETTINGS_SAVE_FAILED: 'Failed to save settings',
    SETTINGS_LOAD_FAILED: 'Failed to load settings',
    INVALID_CONFIGURATION: 'Invalid configuration',
    
    // Player errors
    PLAYER_NOT_READY: 'Video player is not ready',
    TIMESTAMP_INSERT_FAILED: 'Failed to insert timestamp',
    PLAYBACK_CONTROL_FAILED: 'Failed to control playback',
} as const;

export const SUCCESS_MESSAGES = {
    SETTINGS_SAVED: 'Settings saved successfully',
    TRANSCRIPT_ENHANCED: 'Transcript enhanced successfully',
    TIMESTAMP_INSERTED: 'Timestamp inserted',
    API_KEY_VALIDATED: 'API key validated successfully',
    MODELS_REFRESHED: 'Models refreshed successfully',
} as const;

// Type exports for better type safety
export type ProviderType = 'openai' | 'openrouter' | 'ollama';
export type YouTubePlayerState = typeof UI_CONSTANTS.YOUTUBE_PLAYER_STATES[keyof typeof UI_CONSTANTS.YOUTUBE_PLAYER_STATES];
export type HTTPStatusCode = typeof PROVIDER_CONSTANTS.HTTP_STATUS_CODES[keyof typeof PROVIDER_CONSTANTS.HTTP_STATUS_CODES];