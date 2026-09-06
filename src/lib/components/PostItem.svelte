<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	import { dragHandle } from 'svelte-dnd-action';

	import { db, type Post } from '$lib/db/database';
	import { logError } from '$lib/utils/errors';

	let { post, showPin = false }: { post: Post; showPin?: boolean } = $props();

	let isActive = $derived(page.url.pathname === `/p/${post.id}`);
	let popoverId = $derived(`post-item-popover--${post.id}-${showPin ? 'pin' : 'nopin'}`);
	let anchorName = $derived(`--anchor-${post.id}-${showPin ? 'pin' : 'nopin'}`);
	let postHref = $derived(resolve('/p/[slug]', { slug: String(post.id) }));

	async function togglePinned() {
		try {
			await db.posts.update(post.id, { isPinned: !post.isPinned });
		} catch (error) {
			logError('toggle pin', error);
		}
	}

	async function deletePost() {
		try {
			await db.posts.update(post.id, { deletedAt: Date.now() });
		} catch (error) {
			logError('delete post', error);
		}
	}
</script>

<div class="menu-item" class:active={isActive}>
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
		<a class="button ghost name-text" href={postHref}>
		    {post.title ? post.title : 'New document'}
		</a>
	</div>
	<div class="menu-item-actions">
		<button
			class="ghost icon more-icon"
			popovertarget={popoverId}
			style={`anchor-name: ${anchorName}`}
			aria-label="More options"
		>
			<i class="hgi hgi-stroke hgi-rounded hgi-more-vertical"></i>
		</button>
		<div
			id={popoverId}
			class="popover-menu"
			popover="auto"
			style={`position-anchor: ${anchorName}`}
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
