<script lang="ts">
	import { onMount } from 'svelte';

	import { browser } from '$app/environment';

	import { seedOnboardingContent } from '$lib/db/database';
	import favicon from '$lib/assets/favicon.svg';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	import '$lib/assets/style.css';

	type Theme = 'light' | 'dark';

	let { children } = $props();
	let openPalette = $state(false);

	function getInitialTheme(): Theme {
		if (!browser) return 'light';
		const stored = localStorage.getItem('theme');
		if (stored === 'light' || stored === 'dark') {
			return stored;
		}
		return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}

	function toggleTheme() {
		theme = theme === 'dark' ? 'light' : 'dark';
		if (browser) {
			localStorage.setItem('theme', theme); // explicit choice now overrides system preference permanently
			document.documentElement.setAttribute('data-theme', theme);
		}
	}

	let theme = $state(getInitialTheme());

	onMount(() => {
		seedOnboardingContent();
		document.documentElement.setAttribute('data-theme', theme);
	});
</script>

<svelte:head>
	<link
		href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@1&display=swap"
		rel="stylesheet"
	/>
	<link href="https://api.fontshare.com/v2/css?f[]=neco@1,2&display=swap" rel="stylesheet" />
	<link
		href="https://api.fontshare.com/v2/css?f[]=general-sans@1,2&display=swap"
		rel="stylesheet"
	/>
	<link rel="stylesheet" href="https://use.hugeicons.com/font/icons.css" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Lilex:ital,wght@0,100..700;1,100..700&display=swap"
		rel="stylesheet"
	/>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="ui">
	<Sidebar onSearchClick={() => (openPalette = true)} {toggleTheme} {theme} />
	{@render children()}
	<a class="beta-badge" href="https://mindfuldesignxyz.gitbook.io/lorist/open-beta" target="_blank">
		<i class="hgi hgi-stroke hgi-rounded hgi-beta"></i>
		<span>Open beta</span>
	</a>
	<CommandPalette bind:open={openPalette} />
</div>

<style>
	.ui {
		display: flex;
		height: 100vh;
		overflow: hidden;
	}
	.beta-badge {
		position: fixed;
		bottom: 1rem;
		right: 1rem;
		display: flex;
		gap: var(--space-2xs);
		padding: var(--space-3xs) var(--space-xs) var(--space-3xs) 4px;
		border: 1px solid var(--color-border-mid);
		box-shadow: var(--shadow-elevation-low);
		border-radius: 999px;
		align-items: center;
		font-weight: 484;
		color: inherit;
		text-decoration: none;
		background: var(--color-bg);
		i {
			background: var(--color-text);
			color: var(--color-bg);
			padding: var(--space-3xs);
			border-radius: 999px;
		}
	}
</style>
