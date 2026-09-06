import { db, GLOBAL_FOLDER_ID } from './database.ts';
import type { Folder, Post, DailyWordCount } from './db';

const DAY_MS = 24 * 60 * 60 * 1000;

const folderNames = [
	'Daily Journal',
	'Work',
	'Projects',
	'Ideas',
	'Learning',
	'Planning',
	'Travel',
	'Personal'
];

const titles = [
	'Morning notes',
	'Things I learned today',
	'Weekly planning',
	'Project update',
	'Research notes',
	'Ideas for later',
	'Meeting notes',
	'Books and articles',
	'Things to remember',
	'End-of-day reflection',
	'Weekend plans',
	'Questions to explore',
	'Writing practice',
	'Long-term goals',
	'Random observations'
];

const sentenceParts = [
	'Today I spent some time thinking about',
	'I made progress on',
	'One thing that stood out was',
	'I want to remember that',
	'The next step is to',
	'This seems more useful than I initially expected because',
	'I should probably revisit',
	'An interesting detail is',
	'I noticed that',
	'My main takeaway is',
	'This needs a little more work before',
	'I would like to explore',
	'The difficult part was',
	'A better approach might be to',
	'This gave me an idea for'
];

const subjects = [
	'the structure of the project',
	'a possible writing routine',
	'how small improvements compound over time',
	'the notes I collected this week',
	'a new approach to organizing information',
	'the relationship between planning and execution',
	'ways to make the next version simpler',
	'my priorities for the coming days',
	'how to turn this into something practical',
	'the details that are easy to overlook'
];

const endings = [
	'I will write down a clearer plan tomorrow.',
	'It is worth keeping this idea around for later.',
	'I think the simplest version is probably the best starting point.',
	'This should make the next session easier to begin.',
	'I do not need to solve everything at once.',
	'There is enough here to turn into a useful draft.',
	'I will come back to this when I have more context.',
	'The important thing is to keep making steady progress.'
];

function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(items: T[]): T {
	return items[randomInt(0, items.length - 1)];
}

function dateToISO(date: Date): string {
	return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
	return new Date(date.getTime() + days * DAY_MS);
}

function makeParagraph(text: string) {
	return {
		type: 'paragraph',
		attrs: {
			textAlign: null
		},
		content: [
			{
				type: 'text',
				text
			}
		]
	};
}

function makeTiptapDocument(paragraphCount: number) {
	const paragraphs = [];

	for (let i = 0; i < paragraphCount; i++) {
		const sentenceCount = randomInt(2, 5);
		const sentences: string[] = [];

		for (let j = 0; j < sentenceCount; j++) {
			const sentence = `${randomItem(sentenceParts)} ` + `${randomItem(subjects)}.`;

			sentences.push(sentence);
		}

		sentences.push(randomItem(endings));
		paragraphs.push(makeParagraph(sentences.join(' ')));
	}

	return {
		type: 'doc',
		content: paragraphs
	};
}

function extractText(content: any): string {
	if (!content) return '';

	if (Array.isArray(content)) {
		return content.map(extractText).join(' ');
	}

	if (typeof content === 'object') {
		return [typeof content.text === 'string' ? content.text : '', extractText(content.content)]
			.filter(Boolean)
			.join(' ');
	}

	return '';
}

function countWords(text: string): number {
	return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function makeSortKey(index: number): string {
	return `${String(index).padStart(6, '0')}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function seedDatabase() {
	await db.transaction('rw', db.folders, db.posts, db.dailyWordCounts, async () => {
		await db.folders.clear();
		await db.posts.clear();
		await db.dailyWordCounts.clear();

		const folders: Folder[] = folderNames.map((name, index) => ({
			id: index + 1,
			parentID: 0,
			name,
			icon: 'folder-01',
			hasWordGoal: index === 0 || index === 1,
			hasWeeklyWordGoal: index === 0 || index === 1,
			wordGoal: index === 0 ? 500 : null,
			weeklyWordGoal: index === 0 ? 3500 : null,
			sortKey: makeSortKey(index),
			deletedAt: null,
			isPinned: index < 2
		}));

		await db.folders.bulkAdd(folders);

		const posts: Post[] = [];
		let postID = 1;

		// Create approximately 4–10 posts per folder.
		for (const folder of folders) {
			const postCount = randomInt(4, 10);

			for (let i = 0; i < postCount; i++) {
				const title = `${randomItem(titles)} ${i > 0 ? `(${i + 1})` : ''}`.trim();

				const tiptapContent = makeTiptapDocument(randomInt(1, 5));

				const text = extractText(tiptapContent);
				const wordCount = countWords(text);

				posts.push({
					id: postID++,
					folderID: folder.id,
					title,
					content: JSON.stringify(tiptapContent),
					sortKey: makeSortKey(posts.length),
					wordCount,
					deletedAt: null
				});
			}
		}

		await db.posts.bulkAdd(posts);

		const dailyWordCounts: DailyWordCount[] = [];

		// Generate 84 days of daily writing data.
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const firstDay = addDays(today, -83);

		for (let dayIndex = 0; dayIndex < 84; dayIndex++) {
			const date = dateToISO(addDays(firstDay, dayIndex));

			let globalWords = 0;

			for (const folder of folders) {
				/*
				 * Roughly 20% of folder-days have no writing.
				 * The remaining days produce between 100 and 1,500 words.
				 */
				const wroteToday = Math.random() > 0.2;

				const words = wroteToday ? randomInt(100, 1500) : 0;

				if (words === 0) continue;

				globalWords += words;

				dailyWordCounts.push({
					key: `${date}|${folder.id}`,
					date,
					folderID: folder.id,
					words
				});
			}

			// Global aggregate row for the same date.
			if (globalWords > 0) {
				dailyWordCounts.push({
					key: `${date}|${GLOBAL_FOLDER_ID}`,
					date,
					folderID: GLOBAL_FOLDER_ID,
					words: globalWords
				});
			}
		}

		await db.dailyWordCounts.bulkAdd(dailyWordCounts);

		console.log(
			`Seeded ${folders.length} folders, ` +
				`${posts.length} posts, and ` +
				`${dailyWordCounts.length} daily word-count records.`
		);
	});
}
