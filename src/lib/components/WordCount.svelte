<script>
	import { scale, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let { count, goal } = $props();

	const size = 20;
	const strokeWidth = 3;
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;

	let percent = $derived(Math.min(100, (100 * count) / goal));
	let dashOffset = $derived(circumference - (percent / 100) * circumference);
</script>

<div class="word-count">
	{#if count < goal}
		<svg
			class="progress-bar"
			width={size}
			height={size}
			viewBox={`0 0 ${size} ${size}`}
			role="progressbar"
			aria-valuenow={count}
			aria-valuemin="0"
			aria-valuemax={goal}
			transition:fade={{ duration: 150 }}
		>
			<circle
				class="track"
				cx={size / 2}
				cy={size / 2}
				r={radius}
				stroke-width={strokeWidth}
				fill="none"
			/>
			<circle
				class="fill"
				cx={size / 2}
				cy={size / 2}
				r={radius}
				stroke-width={strokeWidth}
				fill="none"
				stroke-dasharray={circumference}
				stroke-dashoffset={dashOffset}
			/>
		</svg>
		<div class="tooltip tooltip-wip">
			{count.toLocaleString()} / {goal.toLocaleString()} words
		</div>
	{:else}
		<div class="completed-icon">
			<i class="hgi hgi-stroke hgi-rounded hgi-tick-02"></i>
		</div>
		<div
			class="tooltip tooltip-completed"
			in:scale={{ duration: 250, start: 0.6, easing: cubicOut }}
			out:fade={{ duration: 120 }}
		>
			{count.toLocaleString()} / {goal.toLocaleString()} words
		</div>
	{/if}
</div>

<style>
	.word-count {
		position: relative;
		width: 20px;
		height: 20px;
	}
	.progress-bar {
		display: block;
		transform: rotate(-90deg); /* start progress at 12 o'clock */
		anchor-name: --progress-bar;
	}
	.track {
		stroke: var(--color-border-mid);
	}
	.fill {
		stroke: var(--color-text);
		stroke-linecap: round;
		transition: stroke-dashoffset 0.2s ease;
	}
	.completed-icon {
		background: var(--color-text);
		color: var(--color-bg);
		width: 20px;
		height: 20px;
		display: flex;
		place-content: center;
		place-items: center;
		border-radius: 50%;
		anchor-name: --completed-icon;
	}
	.progress-bar,
	.completed-icon {
		position: absolute;
		top: 0;
		left: 0;
	}
	.tooltip-wip {
		position-anchor: --progress-bar;
	}
	.tooltip-completed {
		position-anchor: --completed-icon;
	}
</style>
