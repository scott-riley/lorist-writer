<script lang="ts">
	import { stateQuery } from 'dexie-svelte-query';

	import { db, type Post } from '$lib/db/database';
	import PostItem from '$lib/components/PostItem.svelte';

	const postsQuery = stateQuery(() =>
		db.posts.filter((post) => post.isPinned && post.deletedAt === null).toArray()
	);
	let posts = $derived<Post[]>(postsQuery.current ?? []);
</script>

<div class="menu-items pinned-items">
	{#each posts as post (post.id)}
		<PostItem {post} showPin />
	{/each}
</div>
