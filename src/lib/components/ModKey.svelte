<script>
	const keyMap = [
		{
			platform: 'mac',
			key: 'meta',
			icon: 'command'
		},
		{
			platform: 'nonMac',
			key: 'meta',
			text: 'Ctrl +'
		}
	];
	const platform = navigator.platform.match('Mac') ? 'mac' : 'nonMac';
	let { key } = $props();
	const keyOutput = keyMap.find((k) => k.platform === platform && k.key === key);
</script>

{#if keyOutput?.text}
	<span class="letter-key">{keyOutput?.text}</span>
{:else if keyOutput?.icon}
	<i class={`hgi hgi-rounded hgi-stroke hgi-${keyOutput?.icon}`}></i>
{/if}
