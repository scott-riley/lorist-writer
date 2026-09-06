<script lang="ts">
	import { getContext } from 'svelte';
	import { flip } from 'svelte/animate';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	import { stateQuery } from 'dexie-svelte-query';
	import { dragHandle, dragHandleZone, TRIGGERS, type DndEvent } from 'svelte-dnd-action';

	import { db, type Folder, type Post } from '$lib/db/database';
	import { sortKeyAppend, sortKeyForIndex } from '$lib/utils/sort-order';
	import { getFolderPosts } from '$lib/data/posts';
	import { logError } from '$lib/utils/errors';
	import type { DragState } from '$lib/types/drag-state';
	import PostItem from '$lib/components/PostItem.svelte';

	const FOLDER_ICONS = [
		'sticker', 'pokemon', 'book-01', 'book-open-01', 'book-heart',
		'notebook-01', 'notebook-02', 'note-01', 'note-02', 'rubber-duck',
		'pen-01', 'pencil-edit-01', 'quill-write-01', 'newspaper', 'blogger',
		'bookmark-01', 'folder-01', 'folder-02', 'archive-01', 'file-01',
		'calendar-01', 'task-01', 'check-list', 'bulb', 'star', 'sparkles',
		'chef-hat', 'coffee-01', 'cake', 'apple-01', 'shopping-basket-01',
		'plant-01', 'camera-01', 'image-01', 'music-note-01', 'paint-brush-01',
		'alien-01', 'rocket-01', 'ghost', 'magic-wand-01', 'game-controller-01',
		'gift', 'cookie', 'ice-cream-02', 'cat', 'smile', 'laughing', 'sun-03',
		'skull', 'brain-01', 'mushroom', 'octopus', 'crab', 'snail', 'bone-01',
		'poop', 'alien-02', 'robot-01', 'eye', 'tongue', 'finger-print'
	] as const;

	let { folder }: { folder: Folder } = $props();

	const dragState = getContext<DragState>('drag-state');

	// UI state
	let expanded = $state(false);
	let isRenaming = $state(false);
	let folderName = $state(folder.name);
	let folderIcon = $state<string>(folder.icon ?? 'folder-01');

	// Word goal form state
	let hasWordGoal = $state(folder.hasWordGoal);
	let wordGoal = $state(folder.wordGoal);
	let hasWeeklyWordGoal = $state(folder.hasWeeklyWordGoal);
	let weeklyWordGoal = $state(folder.weeklyWordGoal);

	const postsQuery = stateQuery(() => getFolderPosts(folder.id));
	// eslint-disable-next-line svelte/prefer-writable-derived -- $derived makes svelte-dnd-action shit the bed
	let posts = $state<Post[]>([]);
	$effect(() => {
		posts = postsQuery.current ?? [];
	});
	let currentPostId = $derived(Number(page.params.slug));

	// Drag state local to this folder instance
	let draggedPostId = $state<number | null>(null);

	// Auto-expand when navigating directly to a post inside this folder
	$effect(() => {
		if (posts.some((post) => post.id === currentPostId)) {
			expanded = true;
		}
	});

	// Auto-expand when this folder becomes a cross-folder drop target
	$effect(() => {
		if (dragState.expandFolderId === folder.id) {
			expanded = true;
			dragState.expandFolderId = null;
		}
	});

	// Collapse an empty folder once a drag that emptied it has finished
	$effect(() => {
		if (!dragState.isDraggingPost && expanded && posts.length === 0) {
			expanded = false;
		}
	});
	// focus and select the rename input when added to dom
	function init(el: HTMLInputElement) {
		el.focus();
		el.select();
		el.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') cancelRename();
		});
	}

	function cancelRename() {
		folderName = folder.name;
		isRenaming = false;
	}

	async function commitRename() {
		try {
			await db.folders.update(folder.id, { name: folderName });
			isRenaming = false;
		} catch (error) {
			logError('rename folder', error);
		}
	}

	async function setGoals() {
		try {
			await db.folders.update(folder.id, { weeklyWordGoal, hasWeeklyWordGoal, wordGoal, hasWordGoal });
			isRenaming = false;
		} catch (error) {
			logError('set folder goals', error);
		}
	}

	async function setIcon(icon: string) {
		folderIcon = icon;
		try {
			await db.folders.update(folder.id, { icon });
		} catch (error) {
			logError('set folder icon', error);
		}
	}

	async function deleteFolder() {
		try {
			await db.folders.update(folder.id, { deletedAt: Date.now() });
		} catch (error) {
			logError('delete folder', error);
		}
	}

	async function addPostToFolder() {
		try {
			const sortKey = sortKeyAppend(posts);
			const id = await db.posts.add({
				folderID: folder.id,
				title: '',
				content: '',
				wordCount: 0,
				sortKey,
				deletedAt: null
			});
			expanded = true;
			goto(resolve('/p/[slug]', { slug: String(id) }));
		} catch (error) {
			logError('add post to folder', error);
		}
	}

	function handlePostDndConsider(e: CustomEvent<DndEvent<Post>>) {
		if (!dragState.isDraggingPost) {
			dragState.resetDragTracking();
		}
		posts = e.detail.items;
		draggedPostId = e.detail.info.id;
		dragState.isDraggingPost = true;
	}

	async function handlePostDndFinalize(e: CustomEvent<DndEvent<Post>>) {
		posts = e.detail.items;
		draggedPostId = null;

		const movedId = e.detail.info.id;
		const newIndex = posts.findIndex((p) => p.id === movedId);

		if (e.detail.info.trigger === TRIGGERS.DROPPED_OUTSIDE_OF_ANY) {
			await handleHeaderDrop(movedId);
			return;
		}

		if (newIndex === -1) {
			dragState.isDraggingPost = false;
			return;
		}

		dragState.dropTargetFolderId = folder.id;
		dragState.isDraggingPost = false;

		try {
			const newSortKey = sortKeyForIndex(posts, newIndex);
			await db.posts.update(movedId, { sortKey: newSortKey, folderID: folder.id });
		} catch (error) {
			logError('reorder post', error);
		}
	}

	async function handleHeaderDrop(movedId: number) {
		const targetFolderId = dragState.hoveredFolderId;

		if (targetFolderId && targetFolderId !== folder.id) {
			try {
				const targetPosts = await getFolderPosts(targetFolderId);
				const sortKey = sortKeyAppend(targetPosts);
				await db.posts.update(movedId, { sortKey, folderID: targetFolderId });
				dragState.dropTargetFolderId = targetFolderId;
				dragState.expandFolderId = targetFolderId;
			} catch (error) {
				logError('move post to folder', error);
			}
		}

		dragState.isDraggingPost = false;
	}
</script>

<div
	class="menu-item replace-icon"
	class:expanded
	data-folder-id={folder.id}
	class:drag-hover={dragState.isDraggingPost && dragState.hoveredFolderId === folder.id}
>
	<div class="menu-item-name">
		<button
			class="ghost icon large menu-item-icon"
			disabled={!posts?.length}
			onclick={() => (expanded = !expanded)}
			aria-label={expanded ? 'Collapse folder' : 'Expand folder'}
		>
			<i class={`hgi hgi-stroke hgi-rounded hgi-${folderIcon} initial-icon`}></i>
			<i class="hgi hgi-stroke hgi-rounded hgi-arrow-right-01 replacement-icon"></i>
		</button>
		<span use:dragHandle class="ghost icon drag-handle" aria-label="Reorder {folder.name}">
			<i class="hgi hgi-stroke hgi-rounded hgi-drag-drop-vertical"></i>
		</span>
		{#if isRenaming}
			<form class="mimic-button ghost name-text" onsubmit={commitRename}>
				<input type="text" class="mimic-button ghost name-text" bind:value={folderName} use:init />
			</form>
		{:else}
			<div class="mimic-button ghost name-text">{folder.name}</div>
		{/if}
	</div>
	{#if !isRenaming}
		<div class="menu-item-actions">
			<button class="ghost icon" onclick={addPostToFolder} aria-label="Add post to folder">
				<i class="hgi hgi-stroke hgi-rounded hgi-add-01"></i>
			</button>
			<button
				class="ghost icon more-icon"
				popovertarget={`folder-item-popover--${folder.id}`}
				style={`anchor-name: --anchor-${folder.id}`}
				aria-label="More options"
			>
				<i class="hgi hgi-stroke hgi-rounded hgi-more-vertical"></i>
			</button>
			<div
				id={`folder-item-popover--${folder.id}`}
				class="popover-menu"
				popover="auto"
				style={`position-anchor: --anchor-${folder.id}`}
			>
				<button class="ghost" onclick={() => (isRenaming = true)}>
					<i class="hgi hgi-stroke hgi-rounded hgi-input-short-text"></i>
					<span>Rename</span>
				</button>
				<button
					class="ghost two-icon"
					popovertarget={`folder-icon-popover--${folder.id}`}
					style={`anchor-name: --anchor-icon-${folder.id}`}
				>
					<i class="hgi hgi-stroke hgi-rounded hgi-image-01"></i>
					<span>Change icon</span>
					<i class="hgi hgi-stroke hgi-rounded hgi-arrow-right-01"></i>
				</button>
				<button class="ghost" popovertarget={`folder-settings-popover--${folder.id}`}>
					<i class="hgi hgi-stroke hgi-rounded hgi-target-02"></i>
					<span>Set goals</span>
				</button>
				<button class="ghost" onclick={deleteFolder}>
					<i class="hgi hgi-stroke hgi-rounded hgi-delete-03"></i>
					<span>Delete</span>
				</button>
				<div
					id={`folder-icon-popover--${folder.id}`}
					class="popover-menu icon-grid"
					popover="auto"
					style={`position-anchor: --anchor-icon-${folder.id}`}
				>
					{#each FOLDER_ICONS as icon (icon)}
						<button
							class="ghost icon large"
							class:active={folder.icon === icon}
							onclick={() => setIcon(icon)}
							aria-label={icon}
						>
							<i class={`hgi hgi-stroke hgi-${icon}`}></i>
						</button>
					{/each}
				</div>
			</div>
		</div>
	{:else}
		<div class="menu-item-actions">
			<button class="ghost icon" onclick={cancelRename} aria-label="Cancel renaming">
				<i class="hgi hgi-stroke hgi-rounded hgi-cancel-01"></i>
			</button>
		</div>
	{/if}
</div>

<div id={`folder-settings-popover--${folder.id}`} class="folder-settings modal side-panel" popover>
	<div class="modal-header">
		<div class="modal-item-name">
			<i class={`hgi hgi-stroke hgi-rounded hgi-${folderIcon} initial-icon`}></i>
			<span>{folderName}</span>
		</div>
		<div class="sep">/</div>
		<div class="modal-item-location">
			<span>Set goals</span>
		</div>
	</div>
	<div class="modal-content">
		<div class="modal-settings-section">
			<h2>Per-document word goal</h2>
			<p>Set and track a word-count target for each document.</p>
			<div class="modal-settings-setting-group">
				<label for={`word-goal-toggle--${folder.id}`}>
					Enable document word goals for {folderName}
					<input
						type="checkbox"
						role="switch"
						bind:checked={hasWordGoal}
						name={`word-goal-toggle--${folder.id}`}
						id={`word-goal-toggle--${folder.id}`}
					/>
				</label>
				{#if hasWordGoal}
					<div class="modal-settings-sub-section">
						<label for={`word-goal--${folder.id}`}>Per–document goal</label>
						<input
							type="number"
							bind:value={wordGoal}
							name={`word-goal--${folder.id}`}
							id={`word-goal--${folder.id}`}
						/>
					</div>
				{/if}
			</div>
		</div>
		<div class="modal-settings-section">
			<h2>Weekly word goal</h2>
			<p>Track words written across this folder each week.</p>
			<div class="modal-settings-setting-group">
				<label for={`weekly-word-goal-toggle--${folder.id}`}>
					Enable weekly word goals for {folderName}
					<input
						type="checkbox"
						role="switch"
						bind:checked={hasWeeklyWordGoal}
						name={`weekly-word-goal-toggle--${folder.id}`}
						id={`weekly-word-goal-toggle--${folder.id}`}
					/>
				</label>
				{#if hasWeeklyWordGoal}
					<div class="modal-settings-sub-section">
						<label for={`weekly-word-goal--${folder.id}`}>Weekly word goal</label>
						<input
							type="number"
							bind:value={weeklyWordGoal}
							name={`weekly-word-goal--${folder.id}`}
							id={`weekly-word-goal--${folder.id}`}
						/>
					</div>
				{/if}
			</div>
		</div>
	</div>
	<div class="modal-footer">
		<div class="modal-actions">
			<button
				class="secondary"
				popovertargetaction="hide"
				popovertarget={`folder-settings-popover--${folder.id}`}>Cancel</button
			>
			<button
				class="primary"
				onclick={setGoals}
				popovertargetaction="hide"
				popovertarget={`folder-settings-popover--${folder.id}`}>Save</button
			>
		</div>
	</div>
</div>

<div
	class="posts"
	class:expanded
	data-folder-id={folder.id}
	use:dragHandleZone={{ items: posts, flipDurationMs: 150 }}
	onconsider={handlePostDndConsider}
	onfinalize={handlePostDndFinalize}
>
	{#if !posts?.length}
		<div class="posts-empty">Drop a document here</div>
	{/if}
	{#each posts as post (post.id)}
		<div animate:flip={{ duration: 150 }} class:dragging={post.id === draggedPostId}>
			<PostItem showPin={false} {post} />
		</div>
	{/each}
</div>

<style>
	.menu-item.drag-hover {
		background-color: var(--color-bg-muted, rgba(0, 0, 0, 0.05));
		outline: 1px dashed var(--color-border-mid);
	}

	.posts {
		height: auto;
		display: flex;
		flex-direction: column;
		transition: height 10s ease;
		overflow: hidden;
		overflow: clip;
	}
	.posts:not(.expanded) {
		height: 0;
		display: none;
	}
	.replacement-icon {
		transition: all 0.2s ease;
		.expanded & {
			transform: rotate(90deg);
		}
	}

	.icon-grid {
		/*display: grid;*/
		grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr 1fr;
		min-width: 340px;
		position-area: span-bottom right;
		&:popover-open {
			display: grid;
		}
		button {
			align-items: center;
			justify-content: center;
		}
	}
	input[role='switch'] {
		appearance: none;
		-webkit-appearance: none;
		position: relative;
		display: inline-block;
		width: 2.4em;
		height: 1.4em;
		margin: -0.2em 0;
		box-sizing: content-box;
		padding: 0;
		border: none;
		border-radius: 0.7em;
		background: rgba(160, 160, 160, 0.7);
		transition:
			background-color 250ms ease,
			box-shadow 250ms ease;
		font-size: 100%;
		text-size-adjust: 100%;
		-webkit-text-size-adjust: 100%;
		user-select: none;
		outline: none;
	}
	input[role='switch']::before {
		content: '';
		display: flex;
		align-content: center;
		justify-content: center;
		position: absolute;
		width: 1em;
		height: 1em;
		left: 0;
		top: 0;
		background: var(--color-bg);
		border-radius: 50%;
		transform: translate(20%, 20%);
		transition: transform 250ms ease;
		color: rgba(0, 0, 0, 0.3);
		line-height: 1;
	}
	input[role='switch']:focus::before {
		background: var(--color-bg);
	}
	input[role='switch']:checked {
		background-color: var(--color-text);
	}
	input[role='switch']:checked::before {
		transform: translate(120%, 20%);
	}
	input[role='switch']:indeterminate::before {
		transform: translate(70%, 20%);
		content: '-';
	}
	input[role='switch']:disabled:before {
		opacity: 0.4;
	}
</style>
