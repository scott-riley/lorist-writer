<script lang="ts">
	import { stateQuery } from 'dexie-svelte-query';
	import { db, type Folder } from '$lib/db/database';
	import { page } from '$app/state';
	import { getWeeklyWordCount } from '$lib/utils/week-count';
	import Creative from '$lib/components/icons/Creative.svelte';
	let slug = $derived(page.params.slug ?? '');
	const foldersQuery = stateQuery(() => db.folders.get(Number(slug)));
	const folder = $derived<Folder | null>(foldersQuery.current ?? null);
	let currentWeeklyCount = $state(0);
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
	const isMonday = today.getDay() === 1;
</script>

<div class="wrapper">
	{#if folder?.id}
		<h2>{folder.name}</h2>
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
						{#if isMonday || true}
							<h3>A new week begins…</h3>
						{/if}
						<p>Your weekly goal in {folder.name} is {folder.weeklyWordGoal} words.</p>
						<div class="progress-readout">
							{#if completedPercent < 100}
								<div class="completed" style={`width: ${completedPercent}%;`}>
									<span
										style={completedPercent > 20 ? 'transform: translate3d(20px, -50%, 0)' : null}
										>{currentWeeklyCount} words so far</span
									>
								</div>
								<span class="to-go"
									>{folder.weeklyWordGoal
										? folder.weeklyWordGoal - currentWeeklyCount
										: 'A few more'} to go</span
								>
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
					<Creative />
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
	}
	.weekly-goal {
		border: 1px solid var(--color-border-mid);
		box-shadow: var(--shadow-elevation-medium);
		width: min(70vw, 980px);
		margin: auto;
		border-radius: var(--radius-m);
		display: flex;
		display: grid;
		grid-template-columns: 4fr 2fr;
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
</style>
