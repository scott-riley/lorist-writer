<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import { fly } from 'svelte/transition';
	import { stateQuery } from 'dexie-svelte-query';

	import { Editor } from '@tiptap/core';
	import BubbleMenu from '@tiptap/extension-bubble-menu';
	import TurndownService from 'turndown';
	import 'highlight.js/styles/github-dark.css';
	import JSConfetti from 'js-confetti';

	import { browser } from '$app/environment';

	import { db, GLOBAL_FOLDER_ID, type Post } from '$lib/db/database';
	import { incrementDailyCount } from '$lib/data/counts';
	import { editorExtensions } from '$lib/utils/editor';
	import { getTitleString } from '$lib/utils/post';
	import { toDateKey } from '$lib/utils/weeks';
	import { logError } from '$lib/utils/errors';
	import WordCount from '$lib/components/WordCount.svelte';
	import NoPostIllo from '$lib/components/icons/NoPostIllo.svelte';

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
	let isDeleted = $state(false);
	let hasPost = $state<boolean | null>(null);
	let bubble = $state<HTMLDivElement | null>(null);
	let linkUrl = $state('');
	let linkInput = $state<HTMLInputElement | null>(null);
	let linkPopover = $state<HTMLDivElement | null>(null);
	let jsConfetti: JSConfetti;
	let goalHit = $state(false);

	const folderQuery = $derived(stateQuery(() => db.folders.get(post?.folderID ?? -1)));
	const folder = $derived(folderQuery.current ?? null);
	const wordGoal = $derived(folder?.hasWordGoal ? folder.wordGoal : null);

	const isActiveMark = (name: string, attrs = {}) => {
		void editorVersion; // create reactive dependency
		return editor?.isActive(name, attrs) ?? false;
	};

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

	function handleLinkPopoverToggle(e: Event) {
		// only act when it's opening, not closing
		if ((e as ToggleEvent).newState !== 'open') return;
		linkUrl = editor?.getAttributes('link').href ?? '';
		tick().then(() => linkInput?.focus());
	}

	function applyLink() {
		if (!editor) return;
		const url = linkUrl.trim();
		if (url === '') {
			editor.chain().focus().unsetLink().run();
		} else {
			editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
		}
		linkPopover?.hidePopover();
	}

	function removeLink() {
		editor?.chain().focus().unsetLink().run();
		linkPopover?.hidePopover();
	}

	function handleLinkKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			applyLink();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			linkPopover?.hidePopover();
		}
	}

	// debounce saving, every 400ms
	function scheduleSave() {
		if (!editor) return;
		clearTimeout(saveTimer);
		saveTimer = setTimeout(() => {
			void saveEditorContent();
		}, 400);
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
			hasPost = true;
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
		jsConfetti = new JSConfetti();

		function handleKeydown(e: KeyboardEvent) {
			if (e.metaKey && e.key === '/') {
				e.preventDefault();
				focusMode = !focusMode;
			}
		}
		window.addEventListener('keydown', handleKeydown);

		(async () => {
			const loadedPost = await db.posts.where('id').equals(parseInt(postId)).first();
			if (!loadedPost) {
				hasPost = false;
				return;
			}

			post = loadedPost;
			await tick();
			hasPost = true;
			isDeleted = !!post.deletedAt;
			await tick(); // liberally throwing tick() around like i know what i am doing (i do not ((but it worked)))

			const fullExtensions = [...editorExtensions, BubbleMenu.configure({ element: bubble })];
			editor = new Editor({
				element,
				extensions: fullExtensions,
				content: post.content ? JSON.parse(post.content) : null,
				editorProps: {
					handleClick(view, pos, event) {
						const target = event.target as HTMLElement;
						const link = target.closest('a');
						if (link && !(event.metaKey || event.ctrlKey)) {
							event.preventDefault();
							return true; // tell ProseMirror this click was handled
						}
						return false;
					}
				},
				onTransaction: () => {
					editorVersion += 1;
				},
				onUpdate: () => {
					scheduleSave();

					if (wordGoal) {
						const currentWordCount = editor?.storage.characterCount?.words() ?? 0;
						if (currentWordCount >= wordGoal && !goalHit) {
							goalHit = true;
							jsConfetti.addConfetti({
								emojis: ['🦄', '🌈', '❤️', '🏳️‍⚧️'],
								emojiSize: 40,
								confettiNumber: 300
							});
						} else if (currentWordCount < wordGoal) {
							goalHit = false;
						}
					}
				}
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

{#if hasPost === null}
	<div class="empty loading">
		<i class="hgi hgi-stroke hgi-rounded hgi-loader-pinwheel"></i>
	</div>
{:else if hasPost === false}
	<div class="empty">
		<div class="empty-icon">
			<NoPostIllo />
		</div>
		<h2>Can’t find post</h2>
		<p>
			Looks like this post doesn’t exist anymore, or maybe it never did. Check your browser’s URL or
			try searching for the post you were expecting.
		</p>
	</div>
{:else}
	<div class="app">
		<div class="editor-ui">
			<div id="bubble-menu" class="bubble-menu" bind:this={bubble}>
				<button
					onclick={() => editor?.chain().focus().toggleBold().run()}
					class:active={isActiveMark('bold')}
					aria-label="bold"
				>
					<i class="hgi hgi-stroke hgi-rounded hgi-bold"></i>
				</button>
				<button
					onclick={() => editor?.chain().focus().toggleItalic().run()}
					class:active={isActiveMark('italic')}
					aria-label="italic"
				>
					<i class="hgi hgi-stroke hgi-rounded hgi-italic"></i>
				</button>
				<button
					onclick={() => editor?.chain().focus().toggleUnderline().run()}
					class:active={isActiveMark('underline')}
					aria-label="underline"
				>
					<i class="hgi hgi-stroke hgi-rounded hgi-underline"></i>
				</button>
				<button
					onclick={() => editor?.chain().focus().toggleStrike().run()}
					class:active={isActiveMark('strike')}
					aria-label="strikethrough"
				>
					<i class="hgi hgi-stroke hgi-rounded hgi-strikethrough"></i>
				</button>
				<button
					onclick={() => editor?.chain().focus().toggleCode().run()}
					class:active={isActiveMark('code')}
					aria-label="inline code"
				>
					<i class="hgi hgi-stroke hgi-rounded hgi-code"></i>
				</button>
				<button
					class="ghost"
					class:active={isActiveMark('link')}
					popovertarget="link-popover"
					style="anchor-name: --link-button"
					aria-label="link"
				>
					<i class="hgi hgi-stroke hgi-rounded hgi-link-04"></i>
				</button>

				<div
					id="link-popover"
					class="popover-menu link-editor"
					popover
					bind:this={linkPopover}
					ontoggle={handleLinkPopoverToggle}
				>
					<input
						bind:this={linkInput}
						bind:value={linkUrl}
						type="url"
						placeholder="https://example.com"
						onkeydown={handleLinkKeydown}
					/>
					<div class="link-actions">
						<button onclick={applyLink} popovertarget="link-popover" popovertargetaction="hide">
							Save link
						</button>
						{#if isActiveMark('link')}
							<button onclick={removeLink} popovertarget="link-popover" popovertargetaction="hide">
								Remove link
							</button>
						{/if}
					</div>
				</div>
			</div>
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
{/if}

<style>
	.app {
		flex-grow: 1;
	}
	.editor-ui {
		height: 100vh;
		display: flex;
		flex-direction: column;
		gap: 0;
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
	.loading i {
		font-size: var(--step-4);
		animation: spinner 1.5s linear infinite;
	}
	.bubble-menu {
		background-color: var(--white);
		border: 1px solid var(--gray-1);
		border-radius: var(--radius-s);
		box-shadow: var(--shadow-elevation-medium);
		display: flex;
		padding: var(--space-3xs);
		gap: var(--space-3xs);
		position: fixed;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		z-index: 999;
		visibility: hidden;
		button {
			background-color: unset;
			padding: var(--space-3xs);
			border-radius: var(--radius-s);
			&:hover {
				background-color: var(--color-bg-dim);
			}

			&.active {
				background-color: var(--color-text);
				color: var(--color-bg);
			}
		}
	}
	.link-button {
		anchor-name: --link-button;
	}
	#link-popover {
		position-anchor: --link-button;
		position-area: bottom left;
		transform: translateX(40px);
	}
	.link-editor {
		gap: var(--space-3xs);
		padding: 0;
		&:popover-open {
			display: flex;
		}
		input {
			min-width: 200px;
			width: 100%;
			border: none;
			border-bottom: 1px solid var(--color-border);
			padding: var(--space-2xs);
			margin: 0;
			font-size: var(--step--1);
			font-family: var(--font-family-mono);
			&:focus {
				outline: none;
			}
		}
		.link-actions {
			display: flex;
			flex-direction: column;
			flex: 1;
			padding: var(--space-3xs) var(--space-2xs);
			padding-top: 0;
			button {
				flex: 1;
				width: 100%;
			}
		}
	}
	@keyframes spinner {
		to {
			transform: rotate(360deg);
		}
	}
</style>
