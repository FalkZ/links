import { fileManager } from '$lib/local-files';
import type { PageLoadEvent } from './$types';

type Data =
	| {
			hasHandle: true;
			file: string;
			fileName: string;
	  }
	| {
			hasHandle: false;
	  };

export const load = async ({ params }: PageLoadEvent): Promise<Data> => {
	const hasHandle = await fileManager.hasDirectoryHandle();

	if (!hasHandle) return { hasHandle };

	return {
		hasHandle,
		file: await fileManager.getFile(params.file),
		fileName: params.file
	};
};
