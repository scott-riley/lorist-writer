<script lang="ts">
	import { onMount } from 'svelte';

	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import { stateQuery } from 'dexie-svelte-query';

	import { db, type Post } from '$lib/db/database';
	import { getTitleString } from '$lib/utils/post';

	let { open = $bindable(false) }: { open: boolean } = $props();
	let query = $state('');
	let selectedIndex = $state(0);
	let inputEl = $state<HTMLInputElement>();
	let modalEl = $state<HTMLDivElement>();

	const postsQuery = stateQuery(() => db.posts.filter((post) => post.deletedAt === null).toArray());

	let posts = $derived(postsQuery.current ?? []);

	let filteredPosts = $derived(
		query.trim() === ''
			? posts
			: posts.filter((post) =>
					getTitleString(post.content).toLowerCase().includes(query.toLowerCase())
				)
	);

	function openPalette() {
		open = true;
		query = '';
		selectedIndex = 0;
		if (modalEl) {
			modalEl.togglePopover();
		}
	}

	function closePalette() {
		open = false;
		if (modalEl) {
			modalEl.togglePopover();
		}
	}

	function goToPost(post: Post) {
		closePalette();
		goto(resolve(`/p/[slug]`, { slug: String(post.id) }));
	}

	function handleInputKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = Math.min(selectedIndex + 1, filteredPosts.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, 0);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const post = filteredPosts[selectedIndex];
			if (post) goToPost(post);
		} else if (e.key === 'Escape') {
			e.preventDefault();
			closePalette();
		}
	}

	onMount(() => {
		function handleGlobalKeydown(e: KeyboardEvent) {
			if (e.metaKey && e.key === 'k') {
				e.preventDefault();
				if (open) {
					closePalette();
				} else {
					openPalette();
				}
			}
		}
		if (modalEl) {
			modalEl.addEventListener('toggle', () => {
				if (modalEl?.matches(':popover-open') && inputEl) {
					inputEl.focus();
				}
			});
		}
		window.addEventListener('keydown', handleGlobalKeydown);
		return () => window.removeEventListener('keydown', handleGlobalKeydown);
	});

	$effect(() => {
		if (open && inputEl) {
			inputEl.focus();
		}
	});
</script>

<div class="modal command-palette" id="command-palette" popover bind:this={modalEl}>
	<div class="command-palette-header">
		<i class="hgi hgi-stroke hgi-rounded hgi-search-01"></i>
		<input
			bind:this={inputEl}
			type="text"
			placeholder="Jump to a document…"
			bind:value={query}
			onkeydown={handleInputKeydown}
		/>
	</div>
	<ul class="command-list">
		{#each filteredPosts as post, i (post.id)}
			<li>
				<button
					class="command-item"
					class:selected={i === selectedIndex}
					onmouseenter={() => (selectedIndex = i)}
					onclick={() => goToPost(post)}
				>
					<div class="command-item-name">
						{post.title}
					</div>
					<div class="command-item-go">
						<span>Open</span>
						<i class="hgi hgi-stroke hgi-rounded hgi-arrow-turn-backward"></i>
					</div>
				</button>
			</li>
		{:else}
			<li class="command-empty">No matching documents</li>
		{/each}
	</ul>
</div>

<style>
	.command-palette {
		width: clamp(480px, 90vw, 620px);
		background: var(--color-bg);
		border: 1px solid var(--color-border-mid);
		border-radius: var(--radius-m);
		box-shadow: var(--shadow-elevation-large);
		overflow: hidden;
	}
	.command-palette-header {
		width: 100%;
		border-bottom: 1px solid var(--color-border);
		padding-right: var(--space-m);
		display: flex;
		align-items: center;
		flex-direction: row-reverse;
	}
	input {
		width: 100%;
		box-sizing: border-box;
		padding: var(--space-s);
		border: none;
		font-size: var(--step-0);
		background: transparent;
		outline: none;
		color: var(--color-text);
	}
	.command-list {
		list-style: none;
		margin: 0;
		padding: var(--space-2xs);
		max-height: 320px;
		overflow-y: auto;
	}
	.command-item {
		width: 100%;
		text-align: left;
		padding: var(--space-2xs) var(--space-xs);
		border: none;
		background: transparent;
		border-radius: var(--radius-s);
		cursor: pointer;
		font-size: var(--step-0);
		display: flex;
		justify-content: space-around;
		width: 100%;
	}
	.command-item-name {
		width: 100%;
	}
	.command-item-go {
		display: none;
		gap: var(--space-2xs);
		align-items: center;
		opacity: 0.4;
	}
	.command-item.selected {
		background: var(--color-bg-dim);
		.command-item-go {
			display: flex;
		}
	}
	.command-empty {
		padding: var(--space-xs);
		color: var(--color-text-muted);
		font-size: var(--step--1);
		text-align: center;
	}
</style>
