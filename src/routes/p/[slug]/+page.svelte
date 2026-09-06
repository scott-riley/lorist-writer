<script lang="ts">
	import type { PageProps } from './$types';
	import Editor from '$lib/components/Editor.svelte';
	let { params }: PageProps = $props();
</script>

{#key params.slug}
	<Editor postId={params.slug} />
{/key}
