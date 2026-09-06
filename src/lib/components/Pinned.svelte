<script>
	import { stateQuery } from 'dexie-svelte-query';
	import { goto } from '$app/navigation';
	import { db } from '$lib/db/database.ts';
	import PostItem from '$lib/components/PostItem.svelte';

	const postsQuery = stateQuery(() =>
		db.posts.filter((post) => post.isPinned && !post.deletedAt).toArray()
	);
	let posts = $derived(postsQuery.current);
</script>

<div class="menu-items pinned-items">
	{#each posts as post (post.id)}
		<PostItem {post} showPin />
	{/each}
	<!-- <div class="menu-item replace-icon">
		<div class="menu-item-name">
			<button class="ghost icon large menu-item-icon">
				<i class="hgi hgi-stroke hgi-rounded hgi-pin initial-icon"></i>
				<i class="hgi hgi-stroke hgi-rounded hgi-arrow-right-01 replacement-icon"></i>
			</button>
			<button class="ghost name-text">Welcome to Lorist</button>
		</div>
		<div class="menu-item-actions">
			<button class="ghost icon large">
				<i class="hgi hgi-stroke hgi-rounded hgi-more-vertical"></i>
			</button>
		</div>
	</div> -->
</div>
