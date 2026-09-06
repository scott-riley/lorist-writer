<script lang="ts">
	import { stateQuery } from 'dexie-svelte-query';
	import { onMount } from 'svelte';
	import { db } from '$lib/db/database';
	import { generateKeyBetween } from 'fractional-indexing';
	import { dragHandleZone, dragHandle } from 'svelte-dnd-action';
	import type { DragState } from '$lib/types/drag-state';
	import { flip } from 'svelte/animate';
	import { setContext } from 'svelte';
	import FolderItem from '$lib/components/FolderItem.svelte';

	let status = $state(null);
	let isAdding = $state(null);
	let newFolderName = $state(null);
	let draggingPostId = $state(null);
	let isDraggingPost = $state(false);
	let hoveredFolderId = $state(null);
	let dropTargetFolderId = $state(null);
	let expandFolderId = $state(null);

	let { onSearchClick } = $props();

	setContext<DragState>('drag-state', {
		get isDraggingPost() {
			return isDraggingPost;
		},
		set isDraggingPost(v) {
			isDraggingPost = v;
		},
		get hoveredFolderId() {
			return hoveredFolderId;
		},
		set hoveredFolderId(v) {
			hoveredFolderId = v;
		},
		get dropTargetFolderId() {
			return dropTargetFolderId;
		},
		set dropTargetFolderId(v) {
			dropTargetFolderId = v;
		},
		get expandFolderId() {
			return expandFolderId;
		},
		set expandFolderId(v) {
			expandFolderId = v;
		},
		resetDragTracking() {
			dropTargetFolderId = null;
		}
	});

	onMount(() => {
		function handleGlobalMouseMove(e) {
			if (!isDraggingPost) return;
			const elements = document.elementsFromPoint(e.clientX, e.clientY);
			const header = elements.map((el) => el.closest('[data-folder-id]')).find(Boolean);
			hoveredFolderId = header ? Number(header.dataset.folderId) : null;
			console.log('hovered folder', hoveredFolderId);
		}
		document.addEventListener('mousemove', handleGlobalMouseMove, { capture: true });
		return () => {
			document.removeEventListener('mousemove', handleGlobalMouseMove, { capture: true });
		};
	});

	const foldersQuery = stateQuery(() =>
		db.folders
			.filter((folder) => folder.deletedAt === null || folder.deletedAt === '' || !folder.deletedAt)
			.sortBy('sortKey')
	);

	let folders = $state([]);
	$effect(() => {
		folders = foldersQuery.current ?? [];
	});

	async function addFolder() {
		try {
			const lastFolder = folders[folders.length - 1];
			const sortKey = generateKeyBetween(lastFolder?.sortKey ?? null, null);
			const id = await db.folders.add({
				parentID: null,
				name: newFolderName,
				icon: 'folder-01',
				sortKey,
				deletedAt: null
			});
			isAdding = false;
		} catch (error) {
			console.error(`Failed to add folder: ${error}`);
		}
	}

	async function moveFolder(folder, direction) {
		const index = folders.findIndex((f) => f.id === folder.id);
		const targetIndex = direction === 'up' ? index - 1 : index + 1;
		if (targetIndex < 0 || targetIndex >= folders.length) return;
		let above, below;
		if (direction === 'up') {
			above = folders[targetIndex - 1] ?? null;
			below = folders[targetIndex];
		} else {
			above = folders[targetIndex];
			below = folders[targetIndex + 1] ?? null;
		}
		const newSortKey = generateKeyBetween(above?.sortKey ?? null, below?.sortKey ?? null);
		try {
			await db.folders.update(folder.id, { sortKey: newSortKey });
		} catch (error) {
			console.error(`Failed to reorder folder: ${error}`);
		}
	}

	function handleDndConsider(e) {
		folders = e.detail.items;
	}

	async function handleDndFinalize(e) {
		folders = e.detail.items;
		const movedId = e.detail.info.id;
		const newIndex = folders.findIndex((f) => f.id === movedId);
		const above = folders[newIndex - 1] ?? null;
		const below = folders[newIndex + 1] ?? null;
		const newSortKey = generateKeyBetween(above?.sortKey ?? null, below?.sortKey ?? null);
		try {
			await db.folders.update(movedId, { sortKey: newSortKey });
		} catch (error) {
			console.error(`Failed to reorder folder: ${error}`);
		}
	}
</script>

<div class="folders">
	<header class="section-header">
		<h3>Library</h3>
		<div class="actions">
			<button
				class="ghost icon"
				onclick={() => (isAdding = true)}
				style="anchor-name: --new-folder-button"
			>
				<i class="hgi hgi-stroke hgi-rounded hgi-add-01"></i>
				<div
					class="tooltip"
					style="position-anchor: --new-folder-button; position-area: center right;"
				>
					New folder
					<!-- <span class="shortcut">
						<i class="hgi hgi-stroke hgi-rounded hgi-option"></i>
						<i class="hgi hgi-stroke hgi-rounded hgi-command"></i>
						<span class="letter-key">N</span>
					</span> -->
				</div>
			</button>
			<button
				class="ghost icon"
				onclick={() => onSearchClick()}
				style="anchor-name: --search-button"
			>
				<i class="hgi hgi-stroke hgi-rounded hgi-search-01"></i>
				<div class="tooltip" style="position-anchor: --search-button; position-area: center right;">
					Search posts
					<span class="shortcut">
						<i class="hgi hgi-stroke hgi-rounded hgi-command"></i>
						<span class="letter-key">K</span>
					</span>
				</div>
			</button>
		</div>
	</header>
	{#if isAdding}
		<form class="new-folder menu-item">
			<div class="menu-item-name">
				<div class="menu-item-icon">
					<i class="hgi hgi-stroke hgi-rounded hgi-folder-01"></i>
				</div>
				<input
					type="text"
					class="mimic-button name-text new-folder-name"
					bind:value={newFolderName}
					placeholder="New Folder"
					autofocus
				/>
			</div>
			<div class="menu-item-actions">
				<button type="submit" class="ghost icon large" onclick={addFolder}>
					<i class="hgi hgi-stroke hgi-rounded hgi-tick-02"></i>
				</button>
				<button onclick={() => (isAdding = false)}>
					<i class="hgi hgi-stroke hgi-rounded hgi-cancel-01"></i>
				</button>
			</div>
		</form>
	{/if}
	<div
		class="menu-items"
		use:dragHandleZone={{ items: folders, flipDurationMs: 150, dropFromOthersDisabled: true }}
		onconsider={handleDndConsider}
		onfinalize={handleDndFinalize}
	>
		{#each folders as folder, i (folder.id)}
			<div animate:flip={{ duration: 150 }}>
				<FolderItem
					{folder}
					isFirst={i === 0}
					isLast={i === folders.length - 1}
					onMoveUp={() => moveFolder(folder, 'up')}
					onMoveDown={() => moveFolder(folder, 'down')}
				/>
			</div>
		{/each}
	</div>
</div>

<style>
	:global(.dnd-action-dragged-el),
	:global([style*='outline']) {
		outline-color: transparent !important;
	}
	.tooltip {
		transform: translateX(6px);
	}
</style>
