import Dexie, { type EntityTable } from 'dexie';
import { starterContent } from '$lib/utils/starter';
import { generateKeyBetween } from 'fractional-indexing';
import { resolve } from '$app/paths';
import { goto } from '$app/navigation';

interface Folder {
	id: number;
	parentID: number | null;
	name: string;
	icon: string | null;
	hasWordGoal: boolean;
	hasWeeklyWordGoal: boolean;
	wordGoal: number | null;
	weeklyWordGoal: number | null;
	sortKey: string;
	deletedAt: number | null;
	isPinned: boolean;
}

interface Post {
	id: number;
	folderID: number;
	title: string;
	content: string | null;
	sortKey: string;
	wordCount: number;
	deletedAt: number | null;
	isPinned: boolean;
	frontMatter?: string | null;
}

interface DailyWordCount {
	key: string; // "2026-09-04|12"
	date: string;
	folderID: number;
	words: number;
}

const db = new Dexie('LoristDatabase') as Dexie & {
	folders: EntityTable<Folder, 'id'>;
	posts: EntityTable<Post, 'id'>;
	dailyWordCounts: EntityTable<DailyWordCount, 'key'>;
};

db.version(1).stores({
	folders: '++id, parentId, updatedAt, deletedAt'
});

db.version(2).stores({
	folders: '++id, parentId, updatedAt, deletedAt',
	posts: '++id, folderID, updatedAt, deletedAt'
});

db.version(3).stores({
	folders: '++id, parentID, updatedAt, deletedAt',
	posts: '++id, folderID, updatedAt, deletedAt',
	dailyWordCounts: 'key, date, folderID, [date+folderID]'
});

async function seedOnboardingContent() {
	const folderCount = await db.folders.count();
	if (folderCount > 0) return; // already has data — never seed over existing

	const folderSortKey = generateKeyBetween(null, null);

	const folderId = await db.folders.add({
		parentID: null,
		name: 'Scratchpad',
		icon: 'folder-01',
		hasWordGoal: false,
		hasWeeklyWordGoal: false,
		wordGoal: null,
		weeklyWordGoal: null,
		sortKey: folderSortKey,
		deletedAt: null,
		isPinned: false
	});

	const postSortKey = generateKeyBetween(null, null);

	const postId = await db.posts.add({
		folderID: folderId,
		title: 'Welcome to Lorist',
		content: JSON.stringify(starterContent),
		sortKey: postSortKey,
		wordCount: 0,
		deletedAt: null,
		isPinned: false
	});

	goto(resolve('/p/[slug]', { slug: String(postId) }));
}

export { seedOnboardingContent };

const GLOBAL_FOLDER_ID = -1;

export type { Folder, Post, DailyWordCount };
export { db, GLOBAL_FOLDER_ID };
