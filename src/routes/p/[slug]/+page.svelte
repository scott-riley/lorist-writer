<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import type { PageProps } from './$types';
	import Editor from '$lib/components/Editor.svelte';
	let { params }: PageProps = $props();
	let slug = $derived(page.params.slug ?? '');
	$effect(() => {
		localStorage.setItem('lastPost', slug);
	});
	onMount(() => {
		localStorage.setItem('lastPost', slug);
	});
</script>

{#key params.slug}
	<Editor postId={params.slug} />
{/key}
