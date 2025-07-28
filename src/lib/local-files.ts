import { openDB, type IDBPDatabase } from 'idb';

export interface MarkdownFile {
	name: string;
	content: string;
	handle: FileSystemFileHandle;
}

interface DatabaseSchema {
	handles: {
		key: string;
		value: FileSystemDirectoryHandle;
	};
}

export class LocalFileManager {
	private directoryHandle: FileSystemDirectoryHandle | null = null;
	private dbName = 'milkdown-db';
	private storeName = 'handles';
	private handleKey = 'directory-handle';

	private async openDB(): Promise<IDBPDatabase<DatabaseSchema>> {
		return openDB<DatabaseSchema>(this.dbName, 1, {
			upgrade(db) {
				if (!db.objectStoreNames.contains('handles')) {
					db.createObjectStore('handles');
				}
			}
		});
	}

	private async saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
		const db = await this.openDB();
		await db.put('handles', handle, this.handleKey);
		this.directoryHandle = handle;
		db.close();
	}

	private async loadDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
		if (this.directoryHandle) return this.directoryHandle;

		try {
			const db = await this.openDB();
			const result = await db.get('handles', this.handleKey);
			db.close();

			if (!result) {
				return null;
			}

			const permission = await result.queryPermission({
				mode: 'readwrite'
			});

			if (permission === 'granted') {
				return result;
			}

			return null;
		} catch (e: unknown) {
			console.error(e);
			return null;
		}
	}

	async hasDirectoryHandle() {
		return Boolean(await this.loadDirectoryHandle());
	}

	async chooseFolder(): Promise<void> {
		const directoryHandle = await window.showDirectoryPicker({
			mode: 'readwrite'
		});
		await this.saveDirectoryHandle(directoryHandle);
	}

	async readMarkdownFiles(): Promise<MarkdownFile[]> {
		this.directoryHandle = await this.loadDirectoryHandle();

		if (!this.directoryHandle) {
			throw new Error('No folder available');
		}

		const markdownFiles: MarkdownFile[] = [];

		for await (const [name, handle] of this.directoryHandle.entries()) {
			if (handle.kind === 'file' && this.isMarkdownFile(name)) {
				const file = await handle.getFile();
				const content = await file.text();

				markdownFiles.push({
					name,
					content,
					handle
				});
			}
		}

		return markdownFiles;
	}

	private async getFileHandle(name: string): Promise<FileSystemFileHandle> {
		this.directoryHandle = await this.loadDirectoryHandle();

		if (!this.directoryHandle) {
			throw new Error('No folder available');
		}

		return this.directoryHandle.getFileHandle(name + '.md');
	}

	async getFile(name: string): Promise<string> {
		const fileHandle = await this.getFileHandle(name);
		const file = await fileHandle.getFile();
		const content = await file.text();

		return content;
	}

	async writeFile(name: string, content: string): Promise<void> {
		console.log('Write file', name, content);
		const fileHandle = await this.getFileHandle(name);
		const writable = await fileHandle.createWritable();
		await writable.write(content);
		await writable.close();
	}

	async createFile(name: string, content: string): Promise<MarkdownFile> {
		await this.chooseFolder();

		if (!this.directoryHandle) {
			throw new Error('No folder available');
		}

		const fileHandle = await this.directoryHandle.getFileHandle(name, { create: true });
		await this.writeFile(fileHandle, content);

		return {
			name,
			content,
			handle: fileHandle
		};
	}

	private isMarkdownFile(filename: string): boolean {
		return /\.(md|markdown)$/i.test(filename);
	}
}

export const fileManager = new LocalFileManager();
