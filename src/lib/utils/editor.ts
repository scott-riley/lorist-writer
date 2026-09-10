import { StarterKit } from '@tiptap/starter-kit';
import { Extension } from '@tiptap/core';
import { TableKit } from '@tiptap/extension-table';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import Image from '@tiptap/extension-image';
import FileHandler from '@tiptap/extension-file-handler';
import { Focus, Placeholder, CharacterCount } from '@tiptap/extensions';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { Markdown } from '@tiptap/markdown';
import { Plugin } from '@tiptap/pm/state';
import Link from '@tiptap/extension-link';
import { createLowlight, common } from 'lowlight';

const lowlight = createLowlight(common);

type FrontmatterHandler = (frontmatter: string) => void | Promise<void>;

type PasteMarkdownOptions = {
	onFrontmatter: FrontmatterHandler | null;
};

function removeConflictingMarks(node: TiptapNode): TiptapNode {
	const next = { ...node };

	if (next.marks) {
		const hasLink = next.marks.some((mark) => mark.type === 'link');

		if (hasLink) {
			next.marks = next.marks.filter((mark) => mark.type !== 'code');
		}
	}

	if (next.content) {
		next.content = next.content.map(removeConflictingMarks);
	}

	return next;
}

// https://tiptap.dev/docs/editor/markdown/examples
export const PasteMarkdown = Extension.create<PasteMarkdownOptions>({
	name: 'pasteMarkdown',
	addOptions() {
		return {
			onFrontmatter: null
		};
	},
	addProseMirrorPlugins() {
		const { editor, options } = this;
		return [
			new Plugin({
				props: {
					handlePaste(_view, event) {
						const text = event.clipboardData?.getData('text/plain');

						if (!text) {
							return false;
						}

						// Check if text looks like Markdown
						if (editor.markdown && looksLikeMarkdown(text)) {
							event.preventDefault();
							const stripped = stripFrontMatter(text);
							if (stripped.fm !== null) {
								void options.onFrontmatter?.(stripped.fm);
							}
							// Parse the Markdown text to Tiptap JSON using the Markdown manager
							const parsed = editor.markdown.parse(stripped.text);
							const json = removeConflictingMarks(parsed);
							// Insert the parsed JSON content at cursor position
							console.log('fm:', JSON.stringify(stripped.fm));
							console.log('text going to parser:', JSON.stringify(stripped.text));
							editor.commands.insertContent(json);
							return true;
						}

						return false;
					}
				}
			})
		];
	}
});

const DELIMITER = '---';

// https://huam.ing/how-to-remove-markdown-frontmatter-programmatically/
function stripFrontMatter(text: string): { text: string; fm: string | null } {
	// does the text start with a frontmatter delimiter?
	if (!text.startsWith(DELIMITER)) {
		return { text, fm: null };
	}

	// look for the closing delimiter, starting the search just after the opening one
	// so we don't get tripped up by later '---' instances in the body
	// e.g. markdown hr's, code comments, ascii art of anime twinks
	const searchFrom = DELIMITER.length;
	const closingIndex = text.indexOf(DELIMITER, searchFrom);

	if (closingIndex === -1) {
		// frontmatter never closes, or it's just not frontmatter
		return { text, fm: null };
	}

	const fm = text.slice(searchFrom, closingIndex).trim();
	const body = text.slice(closingIndex + DELIMITER.length);

	return {
		fm,
		text: body.trimStart()
	};
}

function looksLikeMarkdown(text: string): boolean {
	// Simple heuristic: check for Markdown syntax
	return (
		/^#{1,6}\s/.test(text) || // Headings
		/\*\*[^*]+\*\*/.test(text) || // Bold
		/\[.+\]\(.+\)/.test(text) || // Links
		/^[-*+]\s/.test(text) || // Lists
		text.startsWith('---\n') ||
		text.startsWith('---\r\n') // Frontmatter
	);
}

export const editorExtensions = [
	StarterKit.configure({
		codeBlock: false,
		link: false
	}),
	Markdown,
	TableKit,
	Image,
	TaskList,
	CharacterCount,
	CodeBlockLowlight.configure({
		lowlight
	}),
	TaskItem.configure({
		nested: true
	}),
	Focus.configure({
		className: 'has-focus',
		mode: 'all'
	}),
	Placeholder.configure({
		placeholder: 'Write something …'
	}),
	Link.configure({
		openOnClick: false,
		autolink: true,
		markdownLinks: true,
		defaultProtocol: 'https',
		protocols: ['http', 'https'],
		isAllowedUri: (url, ctx) => {
			try {
				// construct URL
				const parsedUrl = url.includes(':')
					? new URL(url)
					: new URL(`${ctx.defaultProtocol}://${url}`);

				// use default validation
				if (!ctx.defaultValidate(parsedUrl.href)) {
					return false;
				}

				// disallowed protocols
				const disallowedProtocols = ['ftp', 'file', 'mailto'];
				const protocol = parsedUrl.protocol.replace(':', '');

				if (disallowedProtocols.includes(protocol)) {
					return false;
				}

				// only allow protocols specified in ctx.protocols
				const allowedProtocols = ctx.protocols.map((p) => (typeof p === 'string' ? p : p.scheme));

				if (!allowedProtocols.includes(protocol)) {
					return false;
				}

				// disallowed domains
				const disallowedDomains = ['example-phishing.com', 'malicious-site.net'];
				const domain = parsedUrl.hostname;

				if (disallowedDomains.includes(domain)) {
					return false;
				}

				// all checks have passed
				return true;
			} catch {
				return false;
			}
		},
		shouldAutoLink: (url) => {
			try {
				// construct URL
				const parsedUrl = url.includes(':') ? new URL(url) : new URL(`https://${url}`);

				// only auto-link if the domain is not in the disallowed list
				const disallowedDomains = ['example-no-autolink.com', 'another-no-autolink.com'];
				const domain = parsedUrl.hostname;

				return !disallowedDomains.includes(domain);
			} catch {
				return false;
			}
		}
	}),
	FileHandler.configure({
		allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
		onDrop: (currentEditor, files, pos) => {
			files.forEach((file) => {
				const fileReader = new FileReader();
				fileReader.readAsDataURL(file);
				fileReader.onload = () => {
					currentEditor
						.chain()
						.insertContentAt(pos, {
							type: 'image',
							attrs: {
								src: fileReader.result
							}
						})
						.focus()
						.run();
				};
			});
		},
		onPaste: (currentEditor, files) => {
			files.forEach((file) => {
				const fileReader = new FileReader();
				fileReader.readAsDataURL(file);
				fileReader.onload = () => {
					currentEditor
						.chain()
						.insertContentAt(currentEditor.state.selection.anchor, {
							type: 'image',
							attrs: {
								src: fileReader.result
							}
						})
						.focus()
						.run();
				};
			});
		}
	})
];
