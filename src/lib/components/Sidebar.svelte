<script lang="ts">
	import { onMount } from 'svelte';

	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	import Folders from '$lib/components/Folders.svelte';
	import Pinned from '$lib/components/Pinned.svelte';

	let {
		toggleTheme,
		theme
	}: {
		toggleTheme: () => void;
		theme: 'light' | 'dark';
	} = $props();

	let collapsed = $state(false);

	function toggleSidebar() {
		localStorage.setItem('sidebarState', collapsed ? 'expanded' : 'collapsed');
		collapsed = !collapsed;
	}

	onMount(() => {
		if (localStorage.getItem('sidebarState') === 'collapsed') {
			collapsed = true;
		}
		function handleKeydown(e: KeyboardEvent) {
			if (e.metaKey && e.shiftKey && e.key.toLowerCase() === 'e') {
				e.preventDefault();
				toggleSidebar();
			}
		}
		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});
</script>

<div class="sidebar" class:collapsed>
	<div class="sidebar-top">
		<header class="sidebar-header">
			<div class="logo">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 83 83"
					fill="none"
				>
					<rect width="83" height="83" rx="41.5" fill="black" />
					<path
						d="M52.6426 36.9445L62.7093 43.8015V45.1875L48.7034 65.9775H47.3174L37.3237 59.1934H32.9468L28.3512 65.9775H26.9652L16.8984 59.1204V57.7344L48.1198 11.413H49.5058L59.5726 18.27V19.656L37.3966 52.5552V57.5156L51.2566 36.9445H52.6426Z"
						fill="white"
					/>
				</svg>
				<span>Lorist</span>
			</div>
			<div class="actions">
				<button
					class="ghost icon large"
					onclick={toggleSidebar}
					style="anchor-name: --expand-collapse-button"
				>
					<i class="hgi hgi-stroke hgi-rounded hgi-layout-left"></i>
					<div
						class="tooltip"
						style="position-anchor: --expand-collapse-button; position-area: center right;"
					>
						{collapsed ? 'Expand' : 'Collapse'} sidebar
						<span class="shortcut">
							<i class="hgi hgi-stroke hgi-rounded hgi-command"></i>
							<i class="hgi hgi-stroke hgi-rounded hgi-arrow-big-up-dash"></i>
							<span class="letter-key">E</span>
						</span>
					</div>
				</button>
			</div>
		</header>
		<Pinned />
		<Folders />
	</div>
	<div class="sidebar-bottom">
		<div class="menu-items">
			<a
				class="menu-item trash-item"
				href={resolve('/trash')}
				aria-current={page.url.pathname === '/trash'}
			>
				<div class="menu-item-name">
					<div class="mimic-button ghost icon large menu-item-icon">
						<i class="hgi hgi-stroke hgi-rounded hgi-delete-03"></i>
					</div>
					<span class="ghost name-text">Deleted Items</span>
				</div>
			</a>
			<button class="menu-item" popovertarget="settings-more">
				<div class="menu-item-name">
					<div class="mimic-button ghost icon large menu-item-icon">
						<i class="hgi hgi-stroke hgi-rounded hgi-more-horizontal-square-02"></i>
					</div>
					<span class="ghost name-text">More</span>
				</div>
				<i class="hgi hgi-stroke hgi-rounded hgi-arrow-right-01"></i>
			</button>

			<div id="settings-more" class="popover-menu" popover="auto">
				<button class="menu-item" onclick={toggleTheme}>
					<div class="menu-item-name">
						{#if theme === 'light'}
							<div class="mimic-button ghost icon large menu-item-icon">
								<i class="hgi hgi-stroke hgi-rounded hgi-moon"></i>
							</div>
							<span class="ghost name-text">Switch to dark theme</span>
						{:else}
							<div class="mimic-button ghost icon large menu-item-icon">
								<i class="hgi hgi-stroke hgi-rounded hgi-sun-02"></i>
							</div>
							<span class="ghost name-text">Switch to light theme</span>
						{/if}
					</div>
				</button>
				<a
					class="menu-item"
					href={resolve('/export')}
					aria-current={page.url.pathname === '/export'}
				>
					<div class="menu-item-name">
						<div class="mimic-button ghost icon large menu-item-icon">
							<i class="hgi hgi-stroke hgi-rounded hgi-download-square-02"></i>
						</div>
						<span class="ghost name-text">Export Library</span>
					</div>
				</a>
				<a
					class="menu-item"
					href={resolve('/credits')}
					aria-current={page.url.pathname === '/credits'}
				>
					<div class="menu-item-name">
						<div class="mimic-button ghost icon large menu-item-icon">
							<i class="hgi hgi-stroke hgi-rounded hgi-address-book"></i>
						</div>
						<span class="ghost name-text">Credits</span>
					</div>
				</a>
				<a class="menu-item" href="https://docs.lorist.app" target="_blank">
					<div class="menu-item-name">
						<div class="mimic-button ghost icon large menu-item-icon">
							<i class="hgi hgi-stroke hgi-rounded hgi-mortarboard-02"></i>
						</div>
						<span class="ghost name-text">Documentation</span>
						<i class="hgi hgi-stroke hgi-rounded hgi-external-link"></i>
					</div>
				</a>
			</div>
		</div>
	</div>
</div>

<style>
	#settings-more {
		position-area: center right;
		transform: translate3d(8px, -4px, 0);
	}
	.sidebar {
		padding: var(--space-2xs);
		border-right: 1px solid var(--color-border);
		width: clamp(240px, 20.5vw, 340px);
		height: 100vh;
		max-width: 340px;
		display: flex;
		flex-direction: column;
		align-items: start;
		justify-content: space-between;
		overflow: auto;
		transition: width 0.2s ease;
		@media (max-width: 1030px) {
			position: fixed;
			top: 0;
			left: 0;
			z-index: 10;
			background: var(--color-bg);
			box-shadow: var(--shadow-elevation-medium);
			width: clamp(340px, 20.5vw, 380px);
		}
		@media (max-width: 600px) {
			position: relative;
			width: 100%;
			max-width: 100vw;
		}
		&.collapsed {
			width: 60px;
			box-shadow: none;
			@media (max-width: 600px) {
				height: 60px;
				width: 100%;
				z-index: 1;
				.trash-item {
					display: none;
				}
			}
			.sidebar-header {
				flex-direction: column;
				gap: var(--space-xs);
				@media (max-width: 600px) {
					flex-direction: row;
					justify-content: start;
				}
			}
			:global(.pinned-items),
			:global(.folders),
			:global(.name-text) {
				display: none;
			}
			:global([popovertarget='settings-more']) {
				& > i {
					display: none;
				}
			}
			#settings-more .name-text {
				display: block;
			}
			:global(.menu-item-name) {
				transform: translate3d(-4px, 1.5px, 0);
			}
			.logo span {
				display: none;
			}
		}
	}
	.sidebar-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-left: var(--space-xs);
		padding-right: var(--space-xs);
		padding-bottom: var(--space-2xs);
	}
	.sidebar-top,
	.sidebar-bottom {
		/*flex-grow: 1;*/
		width: 100%;
	}
	.logo {
		display: flex;
		align-items: center;
		justify-content: start;
		gap: calc(var(--space-2xs) + 2px);
		span {
			font-weight: 640;
			font-size: var(--step-2);
			color: var(--color-text-standout);
		}
		svg {
			rect {
				fill: var(--color-bg-logo);
			}
			path {
				fill: var(--color-text-logo);
			}
		}
	}
	.tooltip {
		transform: translateX(6px);
	}
</style>
