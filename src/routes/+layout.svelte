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
	<link href="https://api.fontshare.com/v2/css?f[]=rowan@1,2&display=swap" rel="stylesheet" />
	<link
		href="https://api.fontshare.com/v2/css?f[]=general-sans@1,2&display=swap"
		rel="stylesheet"
	/>
	<link rel="stylesheet" href="https://use.hugeicons.com/font/icons.css" />
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.bunny.net" />
	<link
		href="https://fonts.bunny.net/css?family=lilex:200,200i,300,300i,400,400i,500i,600,600i,700i"
		rel="stylesheet"
	/>
	<title>Lorist; the writing app that gets out of your way</title>
	<meta property="og:image" content="https://lorist.app/og.png" />
	<meta property="og:title" content="Lorist; the writing app that gets out of your way" />
	<meta
		property="og:description"
		content="Lorist was designed for people who still want to write their own words instead of asking robots to do it for them. It’s an ode to sitting down with a fresh coffee and… just writing."
	/>
</svelte:head>

<div class="ui">
	<Sidebar {toggleTheme} {theme} />
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
