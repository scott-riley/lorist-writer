<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { fly } from 'svelte/transition';

	import { Editor } from '@tiptap/core';
	import TurndownService from 'turndown';
	import 'highlight.js/styles/github-dark.css';

	import { browser } from '$app/environment';

	import { db, GLOBAL_FOLDER_ID, type Folder, type Post } from '$lib/db/database';
	import { incrementDailyCount } from '$lib/data/counts';
	import { editorExtensions } from '$lib/utils/editor';
	import { getTitleString } from '$lib/utils/post';
	import { toDateKey } from '$lib/utils/weeks';
	import { logError } from '$lib/utils/errors';
	import WordCount from '$lib/components/WordCount.svelte';

	type EditorFont = 'sans' | 'serif' | 'mono' | 'dys';

	const turndownService = new TurndownService({
		headingStyle: 'atx',
		codeBlockStyle: 'fenced'
	});

	let { postId }: { postId: string } = $props();

	let element = $state<HTMLDivElement>();
	let editorFont = $state<EditorFont>(
		(browser ? (localStorage.getItem('editorFont') as EditorFont | null) : null) ?? 'sans'
	);
	let focusMode = $state(false);

	let post = $state<Post | null>(null);
	let folder = $state<Folder | null>(null);
	let isDeleted = $state(false);
	let wordGoal = $state<number | null>(null);

	let editor = $state<Editor | null>(null);

	// needed to bump editor version on changing so other shit can react
	let editorVersion = $state(0);

	let wordCount = $derived.by(() => {
		void editorVersion;
		return editor?.storage.characterCount.words() ?? 0;
	});

	let saveTimer: ReturnType<typeof setTimeout> | undefined;

	let statusMessage = $state<string | null>(null);
	let statusTimeout: ReturnType<typeof setTimeout> | undefined;

	// debounce saving, every 2s
	function scheduleSave() {
		if (!editor) return;
		clearTimeout(saveTimer);
		saveTimer = setTimeout(() => {
			void saveEditorContent();
		}, 2000);
	}

	function prettifyHTML(html: string) {
		return html.replace(/></g, '>\n<');
	}

	function setStatusMessage(message: string) {
		statusMessage = message;
		clearTimeout(statusTimeout);
		statusTimeout = setTimeout(() => {
			statusMessage = null;
		}, 4000);
	}

	function setFont(font: EditorFont) {
		editorFont = font;
		localStorage.setItem('editorFont', font);
	}

	async function saveEditorContent() {
		if (!editor || !post) return;
		try {
			const now = new Date();
			const date = toDateKey(now);
			const content = JSON.stringify(editor.getJSON());
			const newWordCount = editor.storage.characterCount.words();
			const oldPost = await db.posts.get(post.id);
			const oldWordCount = oldPost?.wordCount ?? 0;
			const delta = Math.max(0, newWordCount - oldWordCount);

			await db.posts.update(post.id, {
				content,
				title: getTitleString(content),
				wordCount: newWordCount
			});
			// if we've got a positive word count
			if (delta > 0) {
				await Promise.all([
					incrementDailyCount(date, post.folderID, delta),
					incrementDailyCount(date, GLOBAL_FOLDER_ID, delta)
				]);
			}

			post = { ...post, content, wordCount: newWordCount };
		} catch (error) {
			logError('save post', error);
		}
	}

	async function copyAsHTML() {
		if (!editor) return;
		try {
			const html = prettifyHTML(editor.getHTML());
			await navigator.clipboard.writeText(html);
			setStatusMessage('Copied as HTML');
		} catch (error) {
			logError('copy as HTML', error);
		}
	}

	async function copyAsMarkdown() {
		if (!editor) return;
		try {
			const markdown = turndownService.turndown(editor.getHTML());
			await navigator.clipboard.writeText(markdown);
			setStatusMessage('Copied as Markdown');
		} catch (error) {
			logError('copy as Markdown', error);
		}
	}

	async function putBack() {
		if (!post) return;
		try {
			await db.posts.update(post.id, { deletedAt: null });
			isDeleted = false;
		} catch (error) {
			logError('restore post', error);
		}
	}

	onMount(() => {
		function handleKeydown(e: KeyboardEvent) {
			if (e.metaKey && e.key === '/') {
				e.preventDefault();
				focusMode = !focusMode;
			}
		}
		window.addEventListener('keydown', handleKeydown);

		(async () => {
			const loadedPost = await db.posts.where('id').equals(parseInt(postId)).first();
			if (!loadedPost) return;

			post = loadedPost;
			isDeleted = !!post.deletedAt;

			folder = (await db.folders.where('id').equals(post.folderID).first()) ?? null;
			wordGoal = folder?.hasWordGoal ? folder.wordGoal : null;

			editor = new Editor({
				element,
				extensions: editorExtensions,
				content: post.content ? JSON.parse(post.content) : null,
				onTransaction: () => {
					editorVersion += 1;
				},
				onUpdate: () => scheduleSave()
			});
		})();

		return () => {
			window.removeEventListener('keydown', handleKeydown);
		};
	});

	onDestroy(() => {
		editor?.destroy();
	});
</script>

<svelte:head>
	<title>{post?.title ? post.title : 'New document'} | Lorist</title>
</svelte:head>

<div class="app">
	<div class="editor-ui">
		<div class="editor-controls">
			{#if statusMessage}
				<div class="status-message" transition:fly={{ x: 4, duration: 200 }}>
					<i class="hgi hgi-stroke hgi-rounded hgi-tick-02"></i>
					<span>{statusMessage}</span>
				</div>
			{/if}
			{#if wordGoal}
				<WordCount count={wordCount} goal={wordGoal} />
			{/if}
			<button class="ghost icon large font-change" popovertarget="post-font-popover">
				<span class="font-option font-option-sans">Aa</span>
				<div class="tooltip" style="position-anchor: --font-change">Editor font</div>
			</button>
			<button
				class="ghost icon large"
				class:active={focusMode}
				onclick={() => (focusMode = !focusMode)}
				style="anchor-name: --focus-mode-button"
			>
				<i class="hgi hgi-stroke hgi-rounded hgi-center-focus"></i>
				<div class="tooltip" style="position-anchor: --focus-mode-button">
					Focus mode
					<span class="shortcut">
						<i class="hgi hgi-stroke hgi-rounded hgi-command"></i>
						<span class="letter-key">/</span>
					</span>
				</div>
			</button>
			<button class="ghost icon large copy-button" popovertarget="post-copy-popover">
				<i class="hgi hgi-stroke hgi-rounded hgi-copy"></i>
				<div class="tooltip" style="position-anchor: --copy-button">Copy as…</div>
			</button>
			<!-- Font selector popover -->
			<div id="post-font-popover" class="popover-menu" popover="auto">
				<button
					class="ghost font-preview--sans"
					class:two-icon={editorFont === 'sans'}
					class:active={editorFont === 'sans'}
					onclick={() => setFont('sans')}
				>
					<div class="button-left">
						<i class="font-preview-icon">Aa</i>
						<span>Sans–serif</span>
					</div>
					{#if editorFont === 'sans'}
						<i class="hgi hgi-stroke hgi-rounded hgi-tick-02"></i>
					{/if}
				</button>
				<button
					class="ghost font-preview--serif"
					class:two-icon={editorFont === 'serif'}
					class:active={editorFont === 'serif'}
					onclick={() => setFont('serif')}
				>
					<div class="button-left">
						<i class="font-preview-icon">Aa</i>
						<span>Serif</span>
					</div>
					{#if editorFont === 'serif'}
						<i class="hgi hgi-stroke hgi-rounded hgi-tick-02"></i>
					{/if}
				</button>
				<button
					class="ghost font-preview--mono"
					class:two-icon={editorFont === 'mono'}
					class:active={editorFont === 'mono'}
					onclick={() => setFont('mono')}
				>
					<div class="button-left">
						<i class="font-preview-icon">Aa</i>
						<span>Monospaced</span>
					</div>
					{#if editorFont === 'mono'}
						<i class="hgi hgi-stroke hgi-rounded hgi-tick-02"></i>
					{/if}
				</button>
				<button
					class="ghost font-preview--dys"
					class:two-icon={editorFont === 'dys'}
					class:active={editorFont === 'dys'}
					onclick={() => setFont('dys')}
				>
					<div class="button-left">
						<i class="font-preview-icon">Aa</i>
						<span>OpenDyslexic</span>
					</div>
					{#if editorFont === 'dys'}
						<i class="hgi hgi-stroke hgi-rounded hgi-tick-02"></i>
					{/if}
				</button>
			</div>
			<!-- Copy menu popover -->
			<div id="post-copy-popover" class="popover-menu" popover="auto">
				<button
					class="ghost"
					onclick={copyAsMarkdown}
					popovertarget="post-copy-popover"
					popovertargetaction="hide"
				>
					<i class="hgi hgi-stroke hgi-rounded hgi-notepad-text"></i>
					<span>Copy as Markdown</span>
				</button>
				<button
					class="ghost"
					onclick={copyAsHTML}
					popovertarget="post-copy-popover"
					popovertargetaction="hide"
				>
					<i class="hgi hgi-stroke hgi-rounded hgi-code-xml"></i>
					<span>Copy as HTML</span>
				</button>
			</div>
		</div>
		{#if isDeleted}
			<div class="editor-alert">
				<div class="deleted-badge">
					<i class="hgi hgi-stroke hgi-rounded hgi-alert-diamond"></i>
					<div>
						<b>Trashed document</b> – this document has been placed in your trash.
						<button onclick={putBack}>Restore</button>
					</div>
				</div>
			</div>
		{/if}
		<div class={`editor editor-font--${editorFont}`} class:focusMode bind:this={element}></div>
	</div>
</div>

<style>
	.app {
		flex-grow: 1;
	}
	.status-message {
		padding: var(--space-3xs) var(--space-xs);
		background: var(--color-bg-dim);
		border-radius: 999px;
		display: flex;
		align-items: center;
		gap: var(--space-3xs);
	}
	.font-change {
		anchor-name: --font-change;
	}
	.copy-button {
		anchor-name: --copy-button;
	}
	#post-font-popover {
		position-anchor: --font-change;
		position-area: bottom left;
		transform: translateX(40px);
	}
	#post-copy-popover {
		position-anchor: --copy-button;
		position-area: bottom left;
		transform: translateX(40px);
	}
	.font-preview--mono {
		font-family: var(--font-family-mono);
		font-weight: 380;
		i {
			font-size: var(--step-0);
			font-weight: 330;
		}
	}
	.font-preview--serif {
		font-family: var(--font-family-serif);
	}
	.font-preview--dys {
		font-size: var(--step--1);
		font-family: 'OpenDyslexic';
	}
	/*.editor-ui {
		width: 100%;
	}
	.editor {
		width: 100%;
	}*/
	.editor-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-left: var(--space-m);
	}
	.font-option {
		font-weight: 380;
	}
	:global(.tiptap p.is-editor-empty:first-child::before) {
		color: #adb5bd;
		content: attr(data-placeholder);
		float: left;
		height: 0;
		pointer-events: none;
	}
	.editor-alert {
		width: 100%;
		display: flex;
		justify-content: center;
		margin-top: var(--space-s);
		margin-bottom: var(--space-m);
		transform: translateY(8px);
		margin-top: calc(var(--space-l) * -1);
		/*justify-content: center;*/
	}
	.deleted-badge {
		display: flex;
		gap: var(--space-2xs);
		padding: var(--space-3xs) var(--space-xs) var(--space-3xs) 4px;
		border: 1px solid var(--color-border-mid);
		box-shadow: var(--shadow-elevation-low);
		border-radius: 999px;
		align-items: center;
		font-weight: 484;
		color: inherit;
		text-decoration: none;
		i:first-child {
			background: var(--color-text);
			color: var(--color-bg);
			padding: var(--space-3xs);
			border-radius: 999px;
		}
		button {
			padding: var(--space-3xs);
			text-decoration: underline;
			text-decoration-color: var(--color-border-mid);
			text-decoration-thickness: 1.5px;
			&:hover {
				background: transparent;
				text-decoration-color: var(--color-text-standout);
			}
		}
	}
	.tooltip {
		transform: translateX(-6px);
	}
</style>
