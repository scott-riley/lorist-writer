<script>
	import { stateQuery } from 'dexie-svelte-query';
	import { page } from '$app/state';
	import { db } from '$lib/db/database.ts';
	import { goto } from '$app/navigation';
	import { dragHandle } from 'svelte-dnd-action';

	let { post, showPin } = $props();

	async function togglePinned() {
		try {
			db.posts.update(post.id, {
				isPinned: !post.isPinned
			});
		} catch (error) {
			console.error(`Failed to pin: ${error}`);
		}
	}

	async function deletePost() {
		try {
			db.posts.update(post.id, {
				deletedAt: Date.now()
			});
		} catch (error) {
			console.error(`Failed to delete post: ${error}`);
		}
	}
</script>

<div class="menu-item" class:active={page.url.pathname === `/p/${post?.id}`}>
	<div class="menu-item-name">
		{#if showPin}
			<div class="mimic-button ghost icon menu-item-icon">
				<i class="hgi hgi-stroke hgi-rounded hgi-pin"></i>
			</div>
		{:else}
			<span use:dragHandle class="ghost icon drag-handle" aria-label="Reorder">
				<i class="hgi hgi-stroke hgi-rounded hgi-drag-drop-vertical"></i>
			</span>
		{/if}
		<a class="button ghost name-text" href={`/p/${post.id}`}
			>{post.title ? post.title : 'New document'}</a
		>
	</div>
	<div class="menu-item-actions">
		<button
			class="ghost icon more-icon"
			popovertarget={`post-item-popover--${post.id}-${showPin ? 'pin' : 'nopin'}`}
			style={`anchor-name: --anchor-${post.id}-${showPin ? 'pin' : 'nopin'}`}
		>
			<i class="hgi hgi-stroke hgi-rounded hgi-more-vertical"></i>
		</button>
		<div
			id={`post-item-popover--${post.id}-${showPin ? 'pin' : 'nopin'}`}
			class="popover-menu"
			popover="auto"
			style={`position-anchor: --anchor-${post.id}-${showPin ? 'pin' : 'nopin'}`}
		>
			<button class="ghost two-icon" onclick={togglePinned}>
				<div>
					<i class="hgi hgi-stroke hgi-rounded hgi-pin"></i>
					<span>Pin to top</span>
				</div>
				{#if post.isPinned}
					<div>
						<i class="hgi hgi-stroke hgi-rounded hgi-tick-02"></i>
					</div>
				{/if}
			</button>
			<button class="ghost" onclick={deletePost}>
				<i class="hgi hgi-stroke hgi-rounded hgi-delete-03"></i>
				<span>Delete</span>
			</button>
		</div>
	</div>
</div>

<style>
	.menu-item-actions {
		position: absolute;
	}
</style>
