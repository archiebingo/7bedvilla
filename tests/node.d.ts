declare module 'node:fs' {
	export function existsSync(path: string): boolean;
	export function readdirSync(path: string): string[];
	export function statSync(path: string): { isDirectory(): boolean };
	export function readFileSync(path: string): { toString(encoding: string): string };
}

declare module 'node:path' {
	export function join(...parts: string[]): string;
}

declare const process: { env: Record<string, string | undefined> };
