<script lang="ts">
	import { stateQuery } from 'dexie-svelte-query';

	import { resolve } from '$app/paths';

	import { db, type Folder, type Post } from '$lib/db/database';
	import { getWeeklyWordCount } from '$lib/utils/week-count';
	import { getFolderPosts } from '$lib/data/posts';

	import GoalAchieved from '$lib/components/icons/GoalAchieved.svelte';
	import NoPostIllo from '$lib/components/icons/NoPostIllo.svelte';
	import Creative from '$lib/components/icons/Creative.svelte';

	let { slug }: { slug: string } = $props();

	const foldersQuery = stateQuery(() => db.folders.get(Number(slug)));
	const folder = $derived<Folder | null>(foldersQuery.current ?? null);

	const postsQuery = stateQuery(() => getFolderPosts(Number(slug)));
	const posts = $derived<Post[]>(postsQuery.current ?? []);

	let currentWeeklyCount = $state(0);
	let remainingWords = $derived<string>(
		folder?.weeklyWordGoal
			? (folder.weeklyWordGoal - currentWeeklyCount).toLocaleString()
			: 'A few more'
	);

	async function countWeekly(folder: Folder) {
		currentWeeklyCount = await getWeeklyWordCount(folder.id);
	}
	$effect(() => {
		if (folder) {
			countWeekly(folder);
		}
	});

	let completedPercent = $derived(
		folder?.weeklyWordGoal ? Math.min(100, (currentWeeklyCount / folder.weeklyWordGoal) * 100) : 0
	);

	const today = new Date();
	const isEarlyInWeek = today.getDay() === 1 || today.getDay() === 2;
	const isWednesday = today.getDay() === 3;
	const isMidWeek = today.getDay() > 3 && today.getDay() < 6;
</script>

<svelte:head>
	<title>{folder?.name} | Lorist</title>
</svelte:head>

<div class="wrapper">
	{#if folder?.id}
		{#if folder.hasWeeklyWordGoal}
			<div class="weekly-goal">
				<div class="goal-content">
					<div class="folder-content-name">
						<div class="mimic-button ghost large">
							<i class={`hgi hgi-stroke hgi-${folder?.icon ? folder.icon : 'folder-01'}`}></i>
							<span class="item-name">{folder.name}</span>
						</div>
					</div>
					<div>
						{#if completedPercent === 100}
							<h3>Goal achieved!</h3>
						{:else if isEarlyInWeek}
							<h3>A new week begins…</h3>
						{:else if isWednesday}
							<h3>It’s Wednesday my dudes…</h3>
						{:else if isMidWeek}
							<h3>It’s nearly the weekend…</h3>
						{:else}
							<h3>Weekend warriors unite…</h3>
						{/if}
						<p>
							Your weekly goal in {folder.name}
							{completedPercent === 100 ? 'was' : 'is'}
							{folder.weeklyWordGoal?.toLocaleString()} words.
						</p>
						<div class="progress-readout">
							{#if completedPercent < 100}
								<div class="completed" style={`width: ${completedPercent}%;`}>
									<span
										style={completedPercent > 20 ? 'transform: translate3d(20px, -50%, 0)' : null}
										class:left={completedPercent < 15}
										>{currentWeeklyCount.toLocaleString()} words so far</span
									>
								</div>
								<span class="to-go"> {remainingWords} to go</span>
							{:else}
								<div class="completed" style={`width: ${completedPercent}%;`}>
									<span class="yay" style="transform: translate3d(20px, -50%, 0)">
										<i class="hgi hgi-stroke hgi-rounded hgi-target-02"></i>
										Nailed it!
									</span>
								</div>
							{/if}
						</div>
					</div>
				</div>
				<div class="goal-image">
					{#if completedPercent < 100}
						<Creative />
					{:else}
						<GoalAchieved />
					{/if}
				</div>
			</div>
		{/if}
		{#if posts?.length}
			<div class="folder-posts">
				{#each posts as post (post.id)}
					<a href={resolve('/p/[slug]', { slug: String(post.id) })} class="post-card">
						<h4>{post.title ? post.title : 'New document'}</h4>
						{post.wordCount.toLocaleString() ?? '0'} words
					</a>
				{/each}
			</div>
		{:else}
			<div class="empty stacked-empty">
				<div class="empty-icon">
					<NoPostIllo />
				</div>
				<div class="empty-content">
					<h2>No posts… yet!</h2>
					<p>Create or move posts into this folder to make it a little more homely.</p>
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	.wrapper {
		width: min(80vw, 980px);
		min-height: 0;
		margin-left: auto;
		margin-right: auto;
		height: auto;
		overflow: auto;
		flex: 1;
		padding-top: var(--space-l);
	}
	.weekly-goal {
		border: 1px solid var(--color-border-mid);
		box-shadow: var(--shadow-elevation-medium);
		width: min(70vw, 980px);
		margin: auto;
		border-radius: var(--radius-m);
		display: grid;
		grid-template-columns: 2fr 1fr;
		margin-bottom: var(--space-l);
		.mimic-button {
			padding-left: 0;
			font-weight: 450;
			&:hover {
				background: transparent;
			}
		}
		.goal-content {
			padding: var(--space-s) var(--space-l) var(--space-l) var(--space-l);
			display: flex;
			flex-direction: column;
			align-items: start;
			justify-content: space-between;
			width: 100%;
			& > div {
				flex: 1;
				width: 100%;
			}
			h3 {
				font-weight: 640;
				font-size: var(--step-4);
				margin: 0;
			}
			p {
				margin: 0;
				font-size: var(--step-2);
			}
		}
		.goal-image {
			height: auto;
			display: flex;
			flex-direction: row;
			align-items: end;
			:global(svg) {
				height: auto;
				aspect-ratio: 1/1;
				min-width: 100%;
			}
			:global([data-theme='dark']) & {
				background: var(--color-text-standout);
				opacity: 0.8;
				border-radius: 42% 58% 65% 35% / 45% 40% 60% 55%;
				overflow: hidden;
				animation: blob-morph 12s ease-in-out infinite;
				margin: var(--space-m);
			}
		}
		.progress-readout {
			background: var(--color-bg-dim);
			width: 90%;
			height: 12px;
			overflow: visible;
			margin-left: calc(var(--space-l) * -1);
			margin-right: calc(var(--space-xl) * -1);
			margin-top: var(--space-xl);
			position: relative;
			span {
				font-size: var(--step-0);
				color: var(--color-bg);
				position: absolute;
				right: 0;
				top: 50%;
				padding: var(--space-3xs) var(--space-2xs);
				background: var(--color-text);
				transform: translate3d(100%, -50%, 0);
				display: flex;
				align-items: center;
				justify-content: center;
				z-index: 4;
				border-radius: 999px;
				white-space: nowrap;
				gap: var(--space-3xs);
				box-shadow: var(--shadow-eleveation-low);
				&.left {
					border-bottom-left-radius: 0;
					border-top-left-radius: 0;
				}
				&.to-go {
					right: 0;
					font-size: var(--step-1);
					background: var(--color-bg-dim);
					color: var(--color-text);
				}
				&.yay {
					font-size: var(--step-1);
					padding-right: Var(--space-xs);
				}
			}
			.completed {
				background: var(--color-text);
				height: 12px;
				overflow: visible;
				position: relative;
			}
		}
	}
	.folder-posts {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: var(--space-l);
		width: min(70vw, 980px);
		margin: auto;
		.post-card {
			padding: var(--space-s);
			border: 1px solid var(--color-border);
			border-radius: var(--radius-m);
			box-shadow: var(--shadow-elevation-medium);
			color: inherit;
			text-decoration: none;
			&:hover {
				background: var(--color-bg-muted);
			}
			&:active {
				box-shadow: none;
			}
			h4 {
				margin: 0;
				font-size: var(--step-1);
				font-weight: 640;
			}
		}
	}
</style>
