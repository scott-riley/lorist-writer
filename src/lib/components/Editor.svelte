<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fly } from 'svelte/transition';
	import TurndownService from 'turndown';
	import { Editor } from '@tiptap/core';
	import { browser } from '$app/environment';
	import { stateQuery } from 'dexie-svelte-query';
	import { editorExtensions } from '$lib/utils/editor';
	import { db, GLOBAL_FOLDER_ID } from '$lib/db/database';
	import { incrementDailyCount } from '$lib/data/counts';
	import { toDateKey } from '$lib/utils/weeks';
	import { getTitleString } from '$lib/utils/post.ts';
	import WordCount from '$lib/components/WordCount.svelte';

	const turndownService = new TurndownService({
		headingStyle: 'atx',
		codeBlockStyle: 'fenced'
	});

	import 'highlight.js/styles/github-dark.css';

	let bubbleMenu = $state();
	let element = $state();
	let focusMode = $state(false);
	let editorState = $state({ editor: null });
	let editorFont = $state('sans');
	if (browser) {
		editorFont = localStorage.getItem('editorFont') ? localStorage.getItem('editorFont') : 'sans';
	}
	let saveTimer: ReturnType<typeof setTimeout> | undefined;

	let isSaving = $state(false);
	let saveError = $state<string | null>(null);
	let isDeleted = $state(false);
	let wordGoal = $state(null);
	let statusMessage = $state(null);
	let statusTimeout;

	let { postId } = $props();
	let post = $state(null);
	let currentPost = $state(null);
	let folder = $state(null);

	function scheduleSave() {
		if (!editorState) {
			return;
		}
		clearTimeout(saveTimer);
		saveTimer = setTimeout(async () => {
			await saveEditorContent();
		}, 2000);
	}

	function prettifyHTML(html) {
		return html.replace(/></g, '>\n<');
	}

	function setStatusMessage(message) {
		statusMessage = message;
		clearTimeout(statusTimeout);
		statusTimeout = setTimeout(() => {
			statusMessage = null;
		}, 4000);
	}

	async function saveEditorContent() {
		if (!editorState) {
			return;
		}
		isSaving = true;
		saveError = null;
		try {
			const now = new Date();
			const date = toDateKey(now);
			const content = JSON.stringify(editorState.editor.getJSON());
			const newWordCount = editorState.editor.storage.characterCount.words();
			const oldPost = await db.posts.get(post.id);
			const oldWordCount = oldPost?.wordCount ?? 0;
			const delta = Math.max(0, newWordCount - oldWordCount);
			await db.posts.update(post.id, {
				content,
				title: getTitleString(content),
				wordCount: newWordCount
			});
			if (delta > 0) {
				await Promise.all([
					incrementDailyCount(date, post.folderID, delta),
					incrementDailyCount(date, GLOBAL_FOLDER_ID, delta)
				]);
			}
			post = {
				...post,
				content,
				wordCount: newWordCount,
				updatedAt: now.getTime()
			};
		} catch (error) {
			console.error(`Failed to save post: ${error}`);
		} finally {
			isSaving = false;
		}
	}

	async function copyAsHTML() {
		try {
			const html = prettifyHTML(editorState.editor.getHTML());
			await navigator.clipboard.writeText(html);
			setStatusMessage('Copied as HTML');
		} catch (error) {
			console.error('Error copying HTML', error);
		}
	}

	async function copyAsMarkdown() {
		try {
			const html = editorState.editor.getHTML();
			const markdown = turndownService.turndown(html);
			await navigator.clipboard.writeText(markdown);
			setStatusMessage('Copied as Markdown');
		} catch (error) {
			console.error('Error copying markdown', error);
		}
	}

	onMount(async () => {
		post = await db.posts.where('id').equals(parseInt(postId)).first();
		folder = await db.folders.where('id').equals(post.folderID).first();
		function handleKeydown(e) {
			if (e.metaKey && e.key === '/') {
				e.preventDefault();
				focusMode = !focusMode;
			}
		}
		window.addEventListener('keydown', handleKeydown);
		wordGoal = folder?.hasWordGoal ? folder.wordGoal : null;
		if (post?.deletedAt) {
			isDeleted = true;
		}
		editorState.editor = new Editor({
			element: element,
			extensions: editorExtensions,
			content: post?.content ? JSON.parse(post.content) : null,
			onTransaction: ({ editor }) => {
				editorState = { editor };
			},
			onUpdate: ({ editor }) => {
				scheduleSave();
			}
		});
	});

	onDestroy(() => {
		editorState.editor?.destroy();
	});

	async function putBack() {
		try {
			db.posts.update(post.id, { deletedAt: null });
			isDeleted = false;
		} catch (error) {
			console.error(`Failed to delete folder: ${error}`);
		}
	}

	function setFont(font) {
		editorFont = font;
		localStorage.setItem('editorFont', font);
	}
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
				<WordCount count={editorState.editor.storage.characterCount.words()} goal={wordGoal} />
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
			<div id={`post-font-popover`} class="popover-menu" popover="auto">
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
			<div id={`post-copy-popover`} class="popover-menu" popover="auto">
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
