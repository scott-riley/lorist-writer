<script lang="ts">
	import { stateQuery } from 'dexie-svelte-query';

	import { resolve } from '$app/paths';

	import { db, type Post, type Folder } from '$lib/db/database';
	import { getFolderPosts } from '$lib/data/posts';
	import { logError } from '$lib/utils/errors';
	import TrashIllo from '$lib/components/icons/TrashIllo.svelte';

	const postsQuery = stateQuery(() => db.posts.filter((post) => !!post.deletedAt).toArray());
	const foldersQuery = stateQuery(() =>
		db.folders.filter((folder) => !!folder.deletedAt).toArray()
	);
	let posts = $derived(postsQuery.current);
	let folders = $derived(foldersQuery.current);

	const dateOptions = {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	} satisfies Intl.DateTimeFormatOptions;

	async function putBack(type: 'folder' | 'post', item: Post | Folder) {
		if (type === 'folder') {
			try {
				db.folders.update(item.id, { deletedAt: null });
			} catch (error) {
				logError('put back folder', error);
			}
		} else if (type === 'post') {
			try {
				db.posts.update(item.id, { deletedAt: null });
			} catch (error) {
				logError('put back post', error);
			}
		}
	}

	async function deleteForever(type: 'folder' | 'post', item: Post | Folder) {
		if (type === 'folder') {
			const folder = item as Folder;
			const postsToDelete = await getFolderPosts(folder.id);
			await db.posts.bulkDelete(postsToDelete.map((p) => p.id));
			try {
				await db.folders.delete(item.id);
			} catch (error) {
				logError('delete folder', error);
			}
		} else if (type === 'post') {
			try {
				await db.posts.delete(item.id);
			} catch (error) {
				logError('delete post', error);
			}
		}
	}

	async function emptyTrash() {
		const foldersToDelete = await db.folders.filter((folder) => !!folder.deletedAt).toArray();

		for (const folder of foldersToDelete) {
			await deleteForever('folder', folder);
		}

		const postsToDelete = await db.posts.filter((post) => !!post.deletedAt).toArray();
		await db.posts.bulkDelete(postsToDelete.map((p) => p.id));
	}
</script>

<svelte:head>
	<title>Trash | Lorist</title>
</svelte:head>

<div class="wrapper">
	{#if posts?.length || folders?.length}
		<div class="page-header">
			<div class="trash-actions">
				<button class="secondary small" popovertarget="empty-trash-modal">
					<i class="hgi hgi-stroke hgi-rounded hgi-delete-04"></i>
					<span>Empty Trash</span>
				</button>
				<div class="modal alert-modal" id="empty-trash-modal" popover>
					<div class="modal-content">
						<h2>Empty trash?</h2>
						<p>There’s no going back, everything currently in trash will be banished.</p>
					</div>
					<div class="modal-footer">
						<div class="modal-actions">
							<button
								class="secondary large"
								popovertargetaction="hide"
								popovertarget="empty-trash-modal">Don’t Empty</button
							>
							<button
								class="danger large"
								popovertargetaction="hide"
								popovertarget="empty-trash-modal"
								onclick={emptyTrash}>Empty Trash</button
							>
						</div>
					</div>
				</div>
			</div>
		</div>
		<div class="items">
			<h1>Trash</h1>
			<p>
				Deleted items will go to your trash so you can restore them later. You can banish any
				deleted items by emptying your trash.
			</p>

			<h2>Deleted Folders</h2>
			<div class="item-rows">
				{#if folders?.length}
					{#each folders as folder (folder.id)}
						<div class="item-row">
							<div class="item-row-name">{folder.name}</div>
							<div class="item-row-deleted">
								<i class="hgi hgi-stroke hgi-rounded hgi-delete-03"></i>
								<span>
									{folder.deletedAt != null
										? new Date(folder.deletedAt).toLocaleString('en-GB', dateOptions)
										: ''}
								</span>
							</div>
							<div class="item-row-actions">
								<button
									class="ghost icon more-icon"
									popovertarget={`folder-item-popover--${folder.id}-trash`}
									style={`anchor-name: --anchor-${folder.id}-trash`}
									aria-label="more options"
								>
									<i class="hgi hgi-stroke hgi-rounded hgi-more-vertical"></i>
								</button>
								<div
									id={`folder-item-popover--${folder.id}-trash`}
									class="popover-menu"
									popover="auto"
									style={`position-anchor: --anchor-${folder.id}-trash`}
								>
									<button class="ghost" onclick={() => putBack('folder', folder)}>
										<i class="hgi hgi-stroke hgi-rounded hgi-square-arrow-move-right-up"></i>
										<span>Put back</span>
									</button>
									<button class="ghost delete" onclick={() => deleteForever('folder', folder)}>
										<i class="hgi hgi-stroke hgi-rounded hgi-delete-04"></i>
										<span>Delete forever</span>
									</button>
								</div>
							</div>
						</div>
					{/each}
				{:else}
					<p>No deleted folders</p>
				{/if}
			</div>
			<h2>Deleted Posts</h2>
			{#if posts?.length}
				<div class="item-rows">
					{#each posts as post (post.id)}
						<div class="item-row">
							<a href={resolve(`/p/${post.id}`)} class="item-row-name"
								>{post.title ? post.title : 'New document'}</a
							>
							<div class="item-row-deleted">
								<i class="hgi hgi-stroke hgi-rounded hgi-delete-03"></i>
								<span>
									{post.deletedAt != null
										? new Date(post.deletedAt).toLocaleString('en-GB', dateOptions)
										: ''}
								</span>
							</div>
							<div class="item-row-actions">
								<button
									class="ghost icon more-icon"
									popovertarget={`folder-item-popover--${post.id}-trash`}
									style={`anchor-name: --anchor-${post.id}-trash`}
									aria-label="more options"
								>
									<i class="hgi hgi-stroke hgi-rounded hgi-more-vertical"></i>
								</button>
								<div
									id={`folder-item-popover--${post.id}-trash`}
									class="popover-menu"
									popover="auto"
									style={`position-anchor: --anchor-${post.id}-trash`}
								>
									<button class="ghost" onclick={() => putBack('post', post)}>
										<i class="hgi hgi-stroke hgi-rounded hgi-square-arrow-move-right-up"></i>
										<span>Put back</span>
									</button>
									<button class="ghost delete" onclick={() => deleteForever('post', post)}>
										<i class="hgi hgi-stroke hgi-rounded hgi-delete-04"></i>
										<span>Delete forever</span>
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p>No deleted posts</p>
			{/if}
		</div>
	{:else}
		<div class="empty">
			<div class="empty-icon">
				<TrashIllo />
			</div>
			<h2>Trash is empty</h2>
			<p>
				Deleted items will go to your trash so you can restore them later. You can banish any
				deleted items by emptying trash.
			</p>
		</div>
	{/if}
</div>

<style>
	.wrapper {
		flex: 1;
		height: 100vh;
		overflow: auto;
		padding-bottom: var(--space-l);
		flex-grow: 1;
	}
	.page-header {
		border-bottom: 1px solid var(--color-border);
		padding: var(--space-2xs) var(--space-s);
		display: flex;
		justify-content: end;
		width: 100%;
	}
	.popover-menu {
		position-area: bottom center;
	}
	.delete {
		color: var(--color-text-danger);
	}
	.items {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: start;
		justify-content: start;
		max-width: 900px;
		margin: auto;
	}
	.items > h2,
	.items > h1 {
		padding-left: var(--space-m);
		margin-left: var(--space-m);
		margin-top: var(--space-m);
		margin-bottom: var(--space-3xs);
	}
	.items > p {
		font-size: var(--step-1);
		max-width: 720px;
		color: var(--color-text-muted);
		padding-left: var(--space-m);
		margin: 0;
		margin-left: var(--space-m);
	}
	.item-rows {
		width: 100%;
		padding: 0 var(--space-m);
		& > p {
			font-size: var(--step-1);
			max-width: 720px;
			color: var(--color-text-muted);
			margin: 0;
			margin-left: var(--space-m);
		}
	}
	.item-row {
		display: grid;
		width: 100%;
		grid-template-columns: 5fr 3fr auto;
		justify-content: space-between;
		font-size: var(--step-0);
		gap: var(--space-m);
		align-items: center;
		padding: var(--space-2xs) var(--space-m);
		border-radius: var(--radius-m);
		&:nth-child(2n) {
			background: var(--color-bg-muted);
		}
	}
	.item-row-name {
		font-weight: 477;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		color: var(--color-text);
		text-decoration: none;
	}
	.item-row-deleted {
		font-size: var(--step-0);
		display: flex;
		align-items: center;
		gap: var(--space-3xs);
		color: var(--color-text-muted);
	}
	button span {
		font-size: var(--step-0);
	}
</style>
