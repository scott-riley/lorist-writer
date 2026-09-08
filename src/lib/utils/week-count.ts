import { db } from '$lib/db/database';
import { getWeekDates } from '$lib/utils/weeks';

// format a compound key based on date and folder id
function countKey(date: string, folderID: number) {
	return `${date}|${folderID}`;
}

// when given a folder id, return the current week's word count for it
export async function getWeeklyWordCount(folderID: number): Promise<number> {
	const weekDates = getWeekDates();
	// get all keys for the selected folder during the current week
	const weekKeys = weekDates.map((date) => countKey(date, folderID));
	const rows = await db.dailyWordCounts.bulkGet(weekKeys);
	let totalWords = 0;
	for (const row of rows) {
		totalWords += row?.words ?? 0;
	}
	return totalWords;
}
