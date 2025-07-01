import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";

/**
 * CodeMirror extension that detects clicks on timestamp links and handles them
 * Based on the approach from obsidian-media-notes plugin
 */
class TimestampClickHandlerPlugin {
	view: EditorView;
	handleTimestampClick: (ts: string) => boolean | undefined;

	constructor(view: EditorView) {
		this.view = view;
		this.view.dom.addEventListener("click", this.handleClick);
	}

	handleClick = (event: MouseEvent) => {
		const element = event.target as HTMLElement;
		
		// Check if the clicked element is a link or within a link
		if (element.matches("span.cm-link, span.cm-link *")) {
			const textContent = element.textContent;
			
			// Regex to match timestamp format: MM:SS or HH:MM:SS
			const timestampRegex = /^(\d+:)?[0-5]?\d:[0-5]\d$/;
			
			if (!textContent) return;
			
			// If the text content matches timestamp format, handle the click
			if (timestampRegex.test(textContent)) {
				const isHandled = this.handleTimestampClick(textContent);
				if (isHandled) {
					event.preventDefault();
					event.stopPropagation();
				}
			}
		}
	};

	update(update: ViewUpdate) {
		// Ensure click handler is attached when view updates
		update.view.dom.addEventListener("click", this.handleClick);
	}

	destroy() {
		// Clean up event listener when plugin is destroyed
		this.view.dom.removeEventListener("click", this.handleClick);
	}
}

/**
 * Factory function to create a timestamp click handler plugin
 * @param handleTimestampClick Function to handle timestamp clicks
 * @returns ViewPlugin for CodeMirror
 */
export function createTimestampClickHandlerPlugin(
	handleTimestampClick: (ts: string) => boolean | undefined
) {
	return ViewPlugin.fromClass(
		class extends TimestampClickHandlerPlugin {
			constructor(view: EditorView) {
				super(view);
				this.handleTimestampClick = handleTimestampClick;
			}
		}
	);
}

/**
 * Convert timestamp string to seconds
 * @param timestamp String in format "MM:SS" or "HH:MM:SS"
 * @returns Number of seconds
 */
export function convertTimestampToSeconds(timestamp: string): number {
	const timestampParts = timestamp.split(":").map(Number);
	let seconds = 0;
	
	if (timestampParts.length === 3) {
		// HH:MM:SS format
		seconds += timestampParts[0] * 3600;
		seconds += timestampParts[1] * 60;
		seconds += timestampParts[2];
	} else if (timestampParts.length === 2) {
		// MM:SS format
		seconds += timestampParts[0] * 60;
		seconds += timestampParts[1];
	} else {
		// Single number (just seconds)
		seconds += timestampParts[0];
	}
	
	return seconds;
}