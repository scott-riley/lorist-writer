import { generateKeyBetween } from 'fractional-indexing';

interface Sortable {
	sortKey: string;
}

export function sortKeyForIndex<T extends Sortable>(items: T[], index: number): string {
	const above = items[index - 1] ?? null;
	const below = items[index] ?? null;
	return generateKeyBetween(above?.sortKey ?? null, below?.sortKey ?? null);
}

export function sortKeyAppend<T extends Sortable>(items: T[]): string {
	const last = items[items.length - 1] ?? null;
	return generateKeyBetween(last?.sortKey ?? null, null);
}
