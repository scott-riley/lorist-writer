<script lang="ts">
	import type { PageProps } from './$types';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Editor from '$lib/components/Editor.svelte';
	let { params }: PageProps = $props();
</script>

{#key params.slug}
	<Editor postId={params.slug} />
{/key}
