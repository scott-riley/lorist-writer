<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import { flip } from 'svelte/animate';

	import { stateQuery } from 'dexie-svelte-query';
	import { dragHandleZone, type DndEvent } from 'svelte-dnd-action';

	import { db, type Folder } from '$lib/db/database';
	import { sortKeyAppend, sortKeyForIndex } from '$lib/utils/sort-order';
	import { logError } from '$lib/utils/errors';
	import type { DragState } from '$lib/types/drag-state';
	import FolderItem from '$lib/components/FolderItem.svelte';
	import ModKey from './ModKey.svelte';

	// ui state
	let isAdding = $state(false);
	let newFolderName = $state<string | null>(null);

	// drag state
	let isDraggingPost = $state(false);
	let hoveredFolderId = $state<number | null>(null);
	let dropTargetFolderId = $state<number | null>(null);
	let expandFolderId = $state<number | null>(null);

	setContext<DragState>('drag-state', {
		get isDraggingPost() {
			return isDraggingPost;
		},
		set isDraggingPost(v: boolean) {
			isDraggingPost = v;
		},
		get hoveredFolderId() {
			return hoveredFolderId;
		},
		set hoveredFolderId(v: number | null) {
			hoveredFolderId = v;
		},
		get dropTargetFolderId() {
			return dropTargetFolderId;
		},
		set dropTargetFolderId(v: number | null) {
			dropTargetFolderId = v;
		},
		get expandFolderId() {
			return expandFolderId;
		},
		set expandFolderId(v: number | null) {
			expandFolderId = v;
		},
		resetDragTracking() {
			dropTargetFolderId = null;
		}
	});

	onMount(() => {
		function handleGlobalMouseMove(e: MouseEvent) {
			if (!isDraggingPost) return;
			const elements = document.elementsFromPoint(e.clientX, e.clientY);
			const header = elements
				.map((el) => el.closest<HTMLElement>('[data-folder-id]'))
				.find(Boolean);
			hoveredFolderId = header ? Number(header.dataset.folderId) : null;
		}

		document.addEventListener('mousemove', handleGlobalMouseMove, { capture: true });
		return () => {
			document.removeEventListener('mousemove', handleGlobalMouseMove, { capture: true });
		};
	});

	const foldersQuery = stateQuery(() =>
		db.folders.filter((folder) => folder.deletedAt === null).sortBy('sortKey')
	);

	// eslint-disable-next-line svelte/prefer-writable-derived -- $derived makes svelte-dnd-action shit the bed
	let folders = $state<Folder[]>([]);
	$effect(() => {
		folders = foldersQuery.current ?? [];
	});

	async function addFolder() {
		try {
			const sortKey = sortKeyAppend(folders);
			await db.folders.add({
				parentID: null,
				name: newFolderName ?? '',
				icon: 'folder-01',
				sortKey,
				deletedAt: null,
				hasWordGoal: false,
				hasWeeklyWordGoal: false,
				wordGoal: null,
				weeklyWordGoal: null,
				isPinned: false
			});
			isAdding = false;
		} catch (error) {
			logError('add folder', error);
		}
	}

	function handleDndConsider(e: CustomEvent<DndEvent<Folder>>) {
		folders = e.detail.items;
	}

	async function handleDndFinalize(e: CustomEvent<DndEvent<Folder>>) {
		folders = e.detail.items;
		const movedId = Number(e.detail.info.id);
		const newIndex = folders.findIndex((f) => f.id === movedId);

		try {
			const newSortKey = sortKeyForIndex(folders, newIndex);
			await db.folders.update(movedId, { sortKey: newSortKey });
		} catch (error) {
			logError('reorder folder', error);
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
				</div>
			</button>
			<button
				class="ghost icon large"
				popovertarget="command-palette"
				style="anchor-name: --search-button"
			>
				<i class="hgi hgi-stroke hgi-rounded hgi-ai-search-01"></i>
				<div class="tooltip" style="position-anchor: --search-button; position-area: center right;">
					Go to…
					<span class="shortcut">
						<ModKey key="meta" />
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
				/>
			</div>
			<div class="menu-item-actions">
				<button
					type="submit"
					class="ghost icon large"
					onclick={addFolder}
					aria-label="confirm adding folder"
				>
					<i class="hgi hgi-stroke hgi-rounded hgi-tick-02"></i>
				</button>
				<button onclick={() => (isAdding = false)} aria-label="cancel adding folder">
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
		{#each folders as folder (folder.id)}
			<div animate:flip={{ duration: 150 }}>
				<FolderItem {folder} />
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
