<script lang="ts">
	import { page } from '$app/state';
	import FolderContent from '$lib/components/FolderContent.svelte';

	let slug = $derived(page.params.slug ?? '');
</script>

{#key slug}
	<FolderContent {slug} />
{/key}
