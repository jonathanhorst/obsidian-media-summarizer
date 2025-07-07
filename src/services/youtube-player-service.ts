import { App } from 'obsidian';
import { MediaSummarizerView } from '../view';
import { UI_CONSTANTS, ERROR_MESSAGES } from '../constants';

export interface PlayerState {
    currentTime: number;
    duration: number;
    playbackRate: number;
    playerState: number;
    volume: number;
    muted: boolean;
}

export interface TimestampOptions {
    timestampOffset?: number;
    playbackOffset?: number;
    pauseOnInsert?: boolean;
}

/**
 * Service for handling YouTube player operations
 * Eliminates code duplication and provides consistent player access
 */
export class YouTubePlayerService {
    private static instance: YouTubePlayerService | null = null;
    
    private constructor(private app: App) {}
    
    public static getInstance(app: App): YouTubePlayerService {
        if (!YouTubePlayerService.instance) {
            YouTubePlayerService.instance = new YouTubePlayerService(app);
        }
        return YouTubePlayerService.instance;
    }
    
    /**
     * Get the active YouTube player instance
     */
    public getActivePlayer(): any | null {
        try {
            const leaves = this.app.workspace.getLeavesOfType(UI_CONSTANTS.MEDIA_SUMMARIZER_VIEW_TYPE);
            if (leaves.length === 0) {
                return null;
            }
            
            const mediaSummarizerView = leaves[0].view as MediaSummarizerView;
            if (!mediaSummarizerView) {
                return null;
            }
            
            const ytRef = mediaSummarizerView.getYouTubePlayerRef();
            if (!ytRef || !ytRef.current) {
                return null;
            }
            
            return ytRef.current;
        } catch (error) {
            console.error('Error getting active player:', error);
            return null;
        }
    }
    
    /**
     * Get the internal YouTube player instance
     */
    public async getInternalPlayer(): Promise<any | null> {
        const player = this.getActivePlayer();
        if (!player) {
            return null;
        }
        
        try {
            return await player.getInternalPlayer();
        } catch (error) {
            console.error('Error getting internal player:', error);
            return null;
        }
    }
    
    /**
     * Get current player state
     */
    public async getPlayerState(): Promise<PlayerState | null> {
        const player = this.getActivePlayer();
        if (!player) {
            return null;
        }
        
        try {
            const internalPlayer = await player.getInternalPlayer();
            if (!internalPlayer) {
                return null;
            }
            
            const [currentTime, duration, playbackRate, playerState, volume, muted] = await Promise.all([
                internalPlayer.getCurrentTime(),
                internalPlayer.getDuration(),
                internalPlayer.getPlaybackRate(),
                internalPlayer.getPlayerState(),
                internalPlayer.getVolume(),
                internalPlayer.isMuted()
            ]);
            
            return {
                currentTime,
                duration,
                playbackRate,
                playerState,
                volume,
                muted
            };
        } catch (error) {
            console.error('Error getting player state:', error);
            return null;
        }
    }
    
    /**
     * Get current timestamp with formatting
     */
    public async getCurrentTimestamp(timestampOffset: number = 0): Promise<string | null> {
        const player = this.getActivePlayer();
        if (!player) {
            return null;
        }
        
        try {
            const internalPlayer = await player.getInternalPlayer();
            if (!internalPlayer) {
                return null;
            }
            
            const currentTime = await internalPlayer.getCurrentTime();
            const adjustedTime = Math.max(0, currentTime - timestampOffset);
            
            return this.formatTimestamp(adjustedTime);
        } catch (error) {
            console.error('Error getting current timestamp:', error);
            return null;
        }
    }
    
    /**
     * Seek to specific time in video
     */
    public async seekTo(seconds: number, allowSeekAhead: boolean = true): Promise<boolean> {
        const player = this.getActivePlayer();
        if (!player) {
            return false;
        }
        
        try {
            const internalPlayer = await player.getInternalPlayer();
            if (!internalPlayer) {
                return false;
            }
            
            await internalPlayer.seekTo(seconds, allowSeekAhead);
            return true;
        } catch (error) {
            console.error('Error seeking video:', error);
            return false;
        }
    }
    
    /**
     * Play or pause the video
     */
    public async playPause(): Promise<boolean> {
        const player = this.getActivePlayer();
        if (!player) {
            return false;
        }
        
        try {
            const internalPlayer = await player.getInternalPlayer();
            if (!internalPlayer) {
                return false;
            }
            
            const playerState = await internalPlayer.getPlayerState();
            
            if (playerState === UI_CONSTANTS.YOUTUBE_PLAYER_STATES.PLAYING) {
                await internalPlayer.pauseVideo();
            } else {
                await internalPlayer.playVideo();
            }
            
            return true;
        } catch (error) {
            console.error('Error controlling playback:', error);
            return false;
        }
    }
    
    /**
     * Set playback speed
     */
    public async setPlaybackSpeed(speed: number): Promise<boolean> {
        const player = this.getActivePlayer();
        if (!player) {
            return false;
        }
        
        try {
            const internalPlayer = await player.getInternalPlayer();
            if (!internalPlayer) {
                return false;
            }
            
            await internalPlayer.setPlaybackRate(speed);
            return true;
        } catch (error) {
            console.error('Error setting playback speed:', error);
            return false;
        }
    }
    
    /**
     * Skip forward or backward
     */
    public async skip(seconds: number): Promise<boolean> {
        const player = this.getActivePlayer();
        if (!player) {
            return false;
        }
        
        try {
            const internalPlayer = await player.getInternalPlayer();
            if (!internalPlayer) {
                return false;
            }
            
            const currentTime = await internalPlayer.getCurrentTime();
            const duration = await internalPlayer.getDuration();
            const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
            
            await internalPlayer.seekTo(newTime, true);
            return true;
        } catch (error) {
            console.error('Error skipping:', error);
            return false;
        }
    }
    
    /**
     * Toggle mute state
     */
    public async toggleMute(): Promise<boolean> {
        const player = this.getActivePlayer();
        if (!player) {
            return false;
        }
        
        try {
            const internalPlayer = await player.getInternalPlayer();
            if (!internalPlayer) {
                return false;
            }
            
            const isMuted = await internalPlayer.isMuted();
            
            if (isMuted) {
                await internalPlayer.unMute();
            } else {
                await internalPlayer.mute();
            }
            
            return true;
        } catch (error) {
            console.error('Error toggling mute:', error);
            return false;
        }
    }
    
    /**
     * Insert timestamp with options
     */
    public async insertTimestamp(options: TimestampOptions = {}): Promise<{
        success: boolean;
        timestamp?: string;
        error?: string;
    }> {
        const {
            timestampOffset = 0,
            playbackOffset = 0,
            pauseOnInsert = false
        } = options;
        
        const player = this.getActivePlayer();
        if (!player) {
            return { success: false, error: ERROR_MESSAGES.PLAYER_NOT_READY };
        }
        
        try {
            const internalPlayer = await player.getInternalPlayer();
            if (!internalPlayer) {
                return { success: false, error: ERROR_MESSAGES.PLAYER_NOT_READY };
            }
            
            // Get current time and create timestamp
            const currentTime = await internalPlayer.getCurrentTime();
            const adjustedTime = Math.max(0, currentTime - timestampOffset);
            const timestamp = this.formatTimestamp(adjustedTime);
            
            // Handle playback offset
            if (playbackOffset > 0) {
                const newPlaybackTime = Math.max(0, currentTime - playbackOffset);
                await internalPlayer.seekTo(newPlaybackTime, true);
            }
            
            // Handle pause
            if (pauseOnInsert) {
                await internalPlayer.pauseVideo();
            }
            
            return { success: true, timestamp };
        } catch (error) {
            console.error('Error inserting timestamp:', error);
            return { success: false, error: ERROR_MESSAGES.TIMESTAMP_INSERT_FAILED };
        }
    }
    
    /**
     * Check if player is ready
     */
    public async isPlayerReady(): Promise<boolean> {
        const player = this.getActivePlayer();
        if (!player) {
            return false;
        }
        
        try {
            const internalPlayer = await player.getInternalPlayer();
            return !!internalPlayer;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Format seconds into timestamp string
     */
    private formatTimestamp(seconds: number): string {
        const totalSeconds = Math.floor(seconds);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        
        if (hours > 0) {
            return `[${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}]`;
        } else {
            return `[${minutes}:${secs.toString().padStart(2, '0')}]`;
        }
    }
}