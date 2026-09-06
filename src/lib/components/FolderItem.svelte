<script lang="ts">
	import { stateQuery } from 'dexie-svelte-query';
	import { getContext } from 'svelte';
	import { flip } from 'svelte/animate';
	import { generateKeyBetween } from 'fractional-indexing';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import PostItem from '$lib/components/PostItem.svelte';
	import { dragHandleZone, dragHandle, TRIGGERS } from 'svelte-dnd-action';
	import type { Folder, Post, db } from '$lib/db/database';

	let {
		folder,
		isFirst = false,
		isLast = false,
		onMoveUp,
		onMoveDown
	}: {
		folder: Folder;
		isFirst?: boolean;
		isLast?: boolean;
		onMoveUp: () => void;
		onMoveDown: () => void;
	} = $props();

	let currentPostId = $derived(Number(page.params.slug));

	$effect(() => {
		if (posts.some((post) => post.id === currentPostId)) {
			expanded = true;
		}
	});

	let expanded = $state(false);
	let folderName = $state(folder.name);
	let isRenaming = $state(false);
	let hasWordGoal = $state(folder.hasWordGoal);
	let wordGoal = $state(folder.wordGoal);
	let weeklyWordGoal = $state(folder.weeklyWordGoal);
	let hasWeeklyWordGoal = $state(folder.hasWeeklyWordGoal);
	const dragState = getContext('drag-state');
	let wasAutoExpanded = $state(false);

	$effect(() => {
		if (!dragState.isDraggingPost && expanded && posts.length === 0) {
			expanded = false;
		}
	});

	let renameEl = null;
	let folderIcon = $state('folder-01');
	if (folder.icon) {
		folderIcon = folder.icon;
	}

	const icons = [
		'sticker',
		'pokemon',
		'book-01',
		'book-open-01',
		'book-heart',
		'notebook-01',
		'notebook-02',
		'note-01',
		'note-02',
		'rubber-duck',
		'pen-01',
		'pencil-edit-01',
		'quill-write-01',
		'newspaper',
		'blogger',
		'bookmark-01',
		'folder-01',
		'folder-02',
		'archive-01',
		'file-01',
		'calendar-01',
		'task-01',
		'check-list',
		'bulb',
		'star',
		'sparkles',
		'chef-hat',
		'coffee-01',
		'cake',
		'apple-01',
		'shopping-basket-01',
		'plant-01',
		'camera-01',
		'image-01',
		'music-note-01',
		'paint-brush-01',
		'alien-01',
		'rocket-01',
		'ghost',
		'magic-wand-01',
		'game-controller-01',
		'gift',
		'cookie',
		'ice-cream-02',
		'cat',
		'smile',
		'laughing',
		'sun-03',
		'skull',
		'brain-01',
		'mushroom',
		'octopus',
		'crab',
		'snail',
		'bone-01',
		'poop',
		'alien-02',
		'robot-01',
		'eye',
		'tongue',
		'finger-print'
	];

	async function deleteFolder() {
		try {
			db.folders.update(folder.id, {
				deletedAt: Date.now()
			});
		} catch (error) {
			console.error(`Failed to delete folder: ${error}`);
		}
	}

	const postsQuery = stateQuery(() =>
		db.posts
			.where('folderID')
			.equals(folder.id)
			.filter((folder) => folder.deletedAt === null)
			.sortBy('sortKey')
	);

	let posts = $state([]);

	$effect(() => {
		posts = postsQuery.current ?? [];
	});

	$effect(() => {
		if (dragState.expandFolderId === folder.id) {
			expanded = true;
			dragState.expandFolderId = null;
		}
	});

	let draggedPostId = $state(null);

	async function addPostToFolder() {
		try {
			const lastPost = posts[posts.length - 1];
			const sortKey = generateKeyBetween(lastPost?.sortKey ?? null, null);
			const id = await db.posts.add({
				folderID: folder.id,
				content: ``,
				sortKey,
				deletedAt: null
			});
			expanded = true;
			goto(`/p/${id}`);
		} catch (error) {
			console.error(`Failed to add post to folder: ${error}`);
		}
	}

	function handlePostDndConsider(e) {
		if (!dragState.isDraggingPost) {
			dragState.resetDragTracking();
		}
		posts = e.detail.items;
		draggedPostId = e.detail.info.id;
		dragState.isDraggingPost = true;
	}

	async function handlePostDndFinalize(e) {
		posts = e.detail.items;
		draggedPostId = null;
		const movedId = e.detail.info.id;
		const newIndex = posts.findIndex((p) => p.id === movedId);
		if (e.detail.info.trigger === TRIGGERS.DROPPED_OUTSIDE_OF_ANY) {
			const targetFolderId = dragState.hoveredFolderId;
			if (targetFolderId && targetFolderId !== folder.id) {
				const targetPosts = await db.posts
					.where('folderID')
					.equals(targetFolderId)
					.filter((p) => p.deletedAt === null)
					.sortBy('sortKey');
				const lastPost = targetPosts[targetPosts.length - 1];
				const newSortKey = generateKeyBetween(lastPost?.sortKey ?? null, null);
				try {
					await db.posts.update(movedId, { sortKey: newSortKey, folderID: targetFolderId });
					dragState.dropTargetFolderId = targetFolderId;
					dragState.expandFolderId = targetFolderId;
				} catch (error) {
					console.error(`Failed to move post: ${error}`);
				}
			}
			dragState.isDraggingPost = false;
			return;
		}

		if (newIndex === -1) {
			dragState.isDraggingPost = false;
			return;
		}

		dragState.dropTargetFolderId = folder.id;
		dragState.isDraggingPost = false;
		const above = posts[newIndex - 1] ?? null;
		const below = posts[newIndex + 1] ?? null;
		const newSortKey = generateKeyBetween(above?.sortKey ?? null, below?.sortKey ?? null);
		try {
			await db.posts.update(movedId, { sortKey: newSortKey, folderID: folder.id });
		} catch (error) {
			console.error(`Failed to reorder post: ${error}`);
		}
	}

	function handleHeaderMouseEnter() {
		console.log('mouseenter fired', dragState.isDraggingPost);
		if (dragState.isDraggingPost && !expanded) {
			expanded = true;
		}
	}

	function init(el) {
		el.focus();
		el.select();
		el.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') {
				cancelRename();
			}
		});
	}

	async function commitRename() {
		try {
			db.folders.update(folder.id, {
				name: folderName
			});
			isRenaming = false;
		} catch (error) {
			console.error(`Failed to add folder: ${error}`);
		}
	}

	async function setGoals() {
		try {
			db.folders.update(folder.id, {
				weeklyWordGoal,
				hasWeeklyWordGoal,
				wordGoal,
				hasWordGoal
			});
			isRenaming = false;
		} catch (error) {
			console.error(`Failed to set goals: ${error}`);
		}
	}

	async function setIcon(icon) {
		folderIcon = icon;
		try {
			db.folders.update(folder.id, {
				icon: icon
			});
		} catch (error) {
			console.error(`Failed to add folder: ${error}`);
		}
	}

	function cancelRename() {
		folderName = folder.name;
		isRenaming = false;
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
			<button class="ghost icon" onclick={addPostToFolder}>
				<i class="hgi hgi-stroke hgi-rounded hgi-add-01"></i>
			</button>
			<button
				class="ghost icon more-icon"
				popovertarget={`folder-item-popover--${folder.id}`}
				style={`anchor-name: --anchor-${folder.id}`}
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
					{#each icons as icon (icon)}
						<button
							class="ghost icon large"
							class:active={folder.icon === icon}
							onclick={() => setIcon(icon)}
						>
							<i class={`hgi hgi-stroke hgi-${icon}`}></i>
						</button>
					{/each}
				</div>
			</div>
		</div>
	{:else}
		<div class="menu-item-actions">
			<button class="ghost icon" onclick={cancelRename}>
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
		<div animate:flip={{ duration: 150 }}>
			<PostItem {post} />
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
	input[role='switch']:focus-visible {
		/*box-shadow:
			0 0.15em 0.25em rgba(0, 0, 0, 0.5) inset,
			0 -0.5px 0 rgba(255, 255, 255, 0.2) inset,
			0 0 0 2px rgba(255, 255, 255, 0.8),
			0 0 0 4px var(--bg-checked, var(--bg, rgb(60, 130, 250)));*/
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
