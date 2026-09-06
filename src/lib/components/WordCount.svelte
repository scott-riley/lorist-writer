<script>
	let { count, goal } = $props();
</script>

<div class="word-count">
	<div
		class="progress-bar"
		role="progressbar"
		aria-valuenow={count}
		aria-valuemin="0"
		aria-valuemax={goal}
		style={`background:
		radial-gradient(closest-side, var(--color-bg) 66%, transparent 80% 100%),
		conic-gradient(var(--color-text) ${(100 * count) / goal}%, var(--color-border-mid) 0);`}
	></div>
	<div class="tooltip">
		{count.toLocaleString()} / {goal.toLocaleString()} words
	</div>
</div>

<style>
	.word-count {
		position: relative;
	}
	.progress-bar {
		width: 20px; /* Set the width */
		height: 20px; /* Set the height */
		border-radius: 50%; /* Make it circular */
		display: flex; /* Center the text */
		justify-content: center;
		align-items: center;
		anchor-name: --progress-bar;
	}
	.tooltip {
		position-anchor: --progress-bar;
	}
</style>
