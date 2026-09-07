<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	onMount(() => {
		const lastPost = localStorage.getItem('lastPost');
		if (lastPost && lastPost != page.params.slug) {
			goto(resolve(`/p/${lastPost}`));
		}
	});
</script>

<svelte:head>
	<title>Writing Stats | Lorist</title>
</svelte:head>

<div class="wrapper">
	<div class="empty">
		<div class="empty-icon"></div>
	</div>
</div>

<style>
	.wrapper {
		flex: 1;
		height: 100vh;
		overflow: auto;
		padding-bottom: var(--space-l);
	}
</style>
