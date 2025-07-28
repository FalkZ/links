<script lang="ts">
	import { Crepe } from '@milkdown/crepe';
	import '@milkdown/crepe/theme/common/style.css';
	import '@milkdown/crepe/theme/frame.css';
	import { fileManager } from '$lib/local-files';
	import type { PageProps } from './$types';

	let crepe: Crepe;
	let readonly = true;

	const { data }: PageProps = $props();

	const editor = (root: HTMLDivElement) => {
		$effect(() => {
			crepe = new Crepe({
				root,
				defaultValue: data.file
			});

			crepe.setReadonly(readonly);
			crepe.create();

			return () => crepe.destroy();
		});
	};
</script>

<svelte:window
	onkeypress={(e) => {
		if (e.key === 'e' && readonly) {
			e.preventDefault();
			readonly = false;
			crepe.setReadonly(false);
		}
	}}
	onkeyup={(e) => {
		if (!readonly) {
			fileManager.writeFile(data.fileName!, crepe.getMarkdown());
		}
	}}
/>
<main>
	{#if data.hasHandle}
		<div use:editor></div>
	{:else}
		<button
			onclick={() => {
				fileManager.chooseFolder();
			}}
		>
			choose folder
		</button>
	{/if}
</main>

<style>
	:global {
		html,
		body {
			margin: 0;
			height: 100%;
			width: 100%;
		}
	}
</style>
