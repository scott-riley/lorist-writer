<script>
	import CreditsIllo from '$lib/components/icons/CreditsIllo.svelte';
</script>

<svelte:head>
	<title>Credits | Lorist</title>
</svelte:head>

<div class="wrapper">
	<div class="empty">
		<div class="empty-icon">
			<CreditsIllo />
		</div>
		<h2>It takes a village…</h2>
		<p>
			A <a href="https://mindfuldesign.xyz" target="_blank">Mindful Design</a>
			product. Handcrafted by <a href="https://scott.is" target="_blank">Scott Riley</a>. Fonts by
			<a href="https://fontshare.com/" target="_blank">Fontshare</a>. Illustrations by
			<a href="https://streamlinehq.com/" target="_blank">Streamline</a>. Icons by
			<a href="https://hugeicons.com/" target="_blank">Huge Icons</a>.
		</p>
	</div>
</div>

<style>
	.wrapper {
		flex: 1;
		height: 100vh;
		overflow: auto;
		padding-bottom: var(--space-l);
	}
	.empty .empty-icon {
		/*margin-top: calc(var(--space-3xl) * -1);*/
		padding-bottom: 0;
	}
	a {
		color: var(--color-text-standout);
		text-decoration-color: var(--color-border-mid);
		text-decoration-thickness: 1.5px;
		transition: all 0.4s ease;
		&:hover {
			text-decoration-color: var(--color-text-standout);
			text-decoration-thickness: 2px;
		}
	}
</style>
