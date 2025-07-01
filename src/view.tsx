import { ItemView, WorkspaceLeaf, Notice, MarkdownView } from 'obsidian';
import { createRoot, Root } from 'react-dom/client';
import * as React from 'react';
import YouTube from 'react-youtube';
import MediaSummarizerPlugin from './main';
import { getTranscript, summarize } from './summarizer';

/**
 * Unique identifier for the Media Summarizer view type
 */
export const MEDIA_SUMMARIZER_VIEW_TYPE = 'media-summarizer-view';

/**
 * Format seconds into HH:MM:SS format
 */
export const formatTimestamp = (timestamp: number | undefined) => {
	if (timestamp === undefined) return "";
	const hours = Math.floor(timestamp / 3600);
	const minutes = Math.floor((timestamp - hours * 3600) / 60);
	const seconds = Math.floor(timestamp - hours * 3600 - minutes * 60);
	const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;
	const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
	return `${
		hours > 0 ? hours + ":" : ""
	}${formattedMinutes}:${formattedSeconds}`;
};

/**
 * Extract YouTube video ID from various URL formats
 */
export const getVideoId = (url: string): string | null => {
	try {
		const urlObj = new URL(url);
		
		if (urlObj.hostname.includes('youtube.com')) {
			return urlObj.searchParams.get('v');
		} else if (urlObj.hostname.includes('youtu.be')) {
			return urlObj.pathname.slice(1);
		}
		
		return null;
	} catch {
		return null;
	}
};

/**
 * Media player component using React YouTube
 */
interface MediaPlayerProps {
	mediaLink: string;
	plugin: MediaSummarizerPlugin;
	onReady: () => void;
}

const MediaPlayer: React.FC<MediaPlayerProps> = ({ mediaLink, plugin, onReady }) => {
	const ytRef = React.createRef<YouTube>();
	const [isReady, setIsReady] = React.useState(false);

	const videoId = getVideoId(mediaLink);

	const handleReady = () => {
		setIsReady(true);
		onReady();
	};

	const insertTimestamp = async () => {
		try {
			const activeFile = plugin.app.workspace.getActiveFile();
			if (!activeFile) {
				new Notice('No active note found. Please open a note first.');
				return;
			}

			let activeView: MarkdownView | null = null;
			
			const currentActiveView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
			if (currentActiveView && currentActiveView.file?.path === activeFile.path) {
				activeView = currentActiveView;
			} else {
				const leaves = plugin.app.workspace.getLeavesOfType('markdown');
				for (const leaf of leaves) {
					const view = leaf.view as MarkdownView;
					if (view.file?.path === activeFile.path) {
						activeView = view;
						plugin.app.workspace.setActiveLeaf(leaf, { focus: true });
						break;
					}
				}
			}

			if (!activeView) {
				new Notice('Cannot find editor for the active note.');
				return;
			}

			// Get current time using react-youtube ref
			const timestamp = await ytRef.current?.internalPlayer?.getCurrentTime();
			if (!timestamp) {
				new Notice('Could not get current video time');
				return;
			}

			const formattedTimestamp = formatTimestamp(timestamp);
			
			const editor = activeView.editor;
			const cursor = editor.getCursor();
			editor.replaceRange(`[${formattedTimestamp}] `, cursor);

			new Notice(`Timestamp inserted: ${formattedTimestamp}`);

		} catch (error) {
			console.error('Error inserting timestamp:', error);
			new Notice('Error inserting timestamp');
		}
	};

	const generateSummary = async () => {
		if (!plugin.settings.openaiApiKey) {
			new Notice('OpenAI API key not configured. Please set it in plugin settings.');
			return;
		}

		const activeFile = plugin.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice('No active note found. Please open a note first.');
			return;
		}

		let activeView: MarkdownView | null = null;
		
		const currentActiveView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
		if (currentActiveView && currentActiveView.file?.path === activeFile.path) {
			activeView = currentActiveView;
		} else {
			const leaves = plugin.app.workspace.getLeavesOfType('markdown');
			for (const leaf of leaves) {
				const view = leaf.view as MarkdownView;
				if (view.file?.path === activeFile.path) {
					activeView = view;
					plugin.app.workspace.setActiveLeaf(leaf, { focus: true });
					break;
				}
			}
		}

		if (!activeView) {
			new Notice('Cannot find editor for the active note.');
			return;
		}

		try {
			const loadingNotice = new Notice('Fetching transcript and generating summary...', 0);

			const transcript = await getTranscript(mediaLink);
			
			if (transcript.startsWith('Error:')) {
				loadingNotice.hide();
				new Notice(transcript);
				return;
			}

			const summary = await summarize(transcript, plugin.settings.openaiApiKey);
			
			loadingNotice.hide();

			if (summary.startsWith('Error:')) {
				new Notice(summary);
				return;
			}

			const editor = activeView.editor;
			
			const lastLine = editor.lastLine();
			const lastLineLength = editor.getLine(lastLine).length;
			editor.setCursor(lastLine, lastLineLength);

			const summaryText = `\n\n## Summary\n\n${summary}\n`;
			editor.replaceRange(summaryText, editor.getCursor());

			new Notice('Summary generated and inserted!');

			const newLastLine = editor.lastLine();
			editor.scrollIntoView({ from: { line: newLastLine - 5, ch: 0 }, to: { line: newLastLine, ch: 0 } });

		} catch (error) {
			console.error('Error generating summary:', error);
			new Notice('Error generating summary. Please try again.');
		}
	};

	if (!videoId) {
		return (
			<div className="media-summarizer-placeholder">
				<div className="media-summarizer-placeholder-icon">📺</div>
				<p className="media-summarizer-placeholder-text">Invalid YouTube URL format</p>
			</div>
		);
	}

	return (
		<div className="media-summarizer-player-container">
			<YouTube
				ref={ytRef}
				videoId={videoId}
				opts={{
					height: '315',
					width: '100%',
					playerVars: {
						playsinline: 1,
						controls: 1,
						modestbranding: 1,
						rel: 0
					}
				}}
				onReady={handleReady}
			/>
			
			{isReady && (
				<div className="media-summarizer-controls">
					<button 
						className="media-summarizer-btn media-summarizer-timestamp-btn"
						onClick={insertTimestamp}
					>
						🕒 Timestamp
					</button>
					<button 
						className="media-summarizer-btn media-summarizer-summarize-btn"
						onClick={generateSummary}
					>
						📝 Summarize
					</button>
				</div>
			)}
		</div>
	);
};

/**
 * Custom ItemView for displaying YouTube videos with summarization controls
 */
export class MediaSummarizerView extends ItemView {
	plugin: MediaSummarizerPlugin;
	private root: Root | null = null;
	private currentVideoUrl: string = '';

	constructor(leaf: WorkspaceLeaf, plugin: MediaSummarizerPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return MEDIA_SUMMARIZER_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Media Summarizer';
	}

	getIcon(): string {
		return 'play';
	}

	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass('media-summarizer-view');

		const mainContainer = container.createEl('div', { cls: 'media-summarizer-container' });

		const header = mainContainer.createEl('div', { cls: 'media-summarizer-header' });
		header.createEl('h3', { text: 'Media Summarizer', cls: 'media-summarizer-title' });
		
		const instructions = header.createEl('div', { cls: 'media-summarizer-instructions' });
		instructions.createEl('p', { 
			text: 'Add a "media_url" field to your note\'s frontmatter with a YouTube URL to load the video here.' 
		});

		const reactContainer = mainContainer.createEl('div', { cls: 'media-summarizer-react-container' });
		this.root = createRoot(reactContainer);

		await this.loadVideoFromActiveNote();
	}

	async onClose(): Promise<void> {
		if (this.root) {
			this.root.unmount();
			this.root = null;
		}
	}

	async loadVideoFromActiveNote(): Promise<void> {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			this.showPlaceholder('No active note. Please open a note with a media_url in the frontmatter.');
			return;
		}

		try {
			const content = await this.app.vault.read(activeFile);
			const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
			const match = content.match(frontmatterRegex);

			if (!match) {
				this.showPlaceholder('No frontmatter found. Add "media_url: [YouTube URL]" to your note\'s frontmatter.');
				return;
			}

			const frontmatter = match[1];
			const mediaUrlMatch = frontmatter.match(/media_url:\s*(.+)/);

			if (!mediaUrlMatch) {
				this.showPlaceholder('No media_url found in frontmatter. Add "media_url: [YouTube URL]" to load a video.');
				return;
			}

			const mediaUrl = mediaUrlMatch[1].trim().replace(/['"]/g, '');
			
			// Only reload if URL changed
			if (mediaUrl !== this.currentVideoUrl) {
				this.currentVideoUrl = mediaUrl;
				await this.loadVideo(mediaUrl);
			}

		} catch (error) {
			console.error('Error loading video from frontmatter:', error);
			this.showPlaceholder('Error reading note frontmatter. Please check your note format.');
		}
	}

	private async loadVideo(url: string): Promise<void> {
		if (!this.root) return;

		this.root.render(
			<MediaPlayer 
				mediaLink={url} 
				plugin={this.plugin}
				onReady={() => console.log('Video player ready')}
			/>
		);
	}

	private showPlaceholder(message: string): void {
		if (!this.root) return;

		this.currentVideoUrl = '';
		
		this.root.render(
			<div className="media-summarizer-placeholder">
				<div className="media-summarizer-placeholder-icon">📺</div>
				<p className="media-summarizer-placeholder-text">{message}</p>
				<div className="media-summarizer-example">
					<strong>Example frontmatter:</strong>
					<pre><code>---
media_url: https://www.youtube.com/watch?v=dQw4w9WgXcQ
---</code></pre>
				</div>
			</div>
		);
	}

	async refresh(): Promise<void> {
		await this.smartLoadVideoFromActiveNote();
	}

	private async smartLoadVideoFromActiveNote(): Promise<void> {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			if (this.currentVideoUrl) {
				this.showPlaceholder('No active note. Please open a note with a media_url in the frontmatter.');
			}
			return;
		}

		try {
			const content = await this.app.vault.read(activeFile);
			const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
			const match = content.match(frontmatterRegex);

			if (!match) {
				if (this.currentVideoUrl) {
					this.showPlaceholder('No frontmatter found. Add "media_url: [YouTube URL]" to your note\'s frontmatter.');
				}
				return;
			}

			const frontmatter = match[1];
			const mediaUrlMatch = frontmatter.match(/media_url:\s*(.+)/);

			if (!mediaUrlMatch) {
				if (this.currentVideoUrl) {
					this.showPlaceholder('No media_url found in frontmatter. Add "media_url: [YouTube URL]" to load a video.');
				}
				return;
			}

			const mediaUrl = mediaUrlMatch[1].trim().replace(/['"]/g, '');
			
			if (mediaUrl !== this.currentVideoUrl) {
				this.currentVideoUrl = mediaUrl;
				await this.loadVideo(mediaUrl);
			}

		} catch (error) {
			console.error('Error loading video from frontmatter:', error);
			if (this.currentVideoUrl) {
				this.showPlaceholder('Error reading note frontmatter. Please check your note format.');
			}
		}
	}
}