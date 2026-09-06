<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { stateQuery } from 'dexie-svelte-query';
	import { db } from '$lib/db/database.ts';
	import { getTitleString } from '$lib/utils/post.ts';

	let { open = $bindable(false) } = $props();
	let query = $state('');
	let selectedIndex = $state(0);
	let inputEl;

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
	}

	function closePalette() {
		open = false;
	}

	function goToPost(post) {
		closePalette();
		goto(`/p/${post.id}`);
	}

	function handleInputKeydown(e) {
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
		function handleGlobalKeydown(e) {
			if (e.metaKey && e.key === 'k') {
				e.preventDefault();
				open ? closePalette() : openPalette();
			}
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

{#if open}
	<div class="command-palette-backdrop" onclick={closePalette}>
		<div class="command-palette" onclick={(e) => e.stopPropagation()}>
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
	</div>
{/if}

<style>
	.command-palette-backdrop {
		position: fixed;
		inset: 0;
		background: var(--color-modal-backdrop);
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding-top: 15vh;
		z-index: 1000;
	}
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
