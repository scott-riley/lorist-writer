import { db } from '$lib/db/database';

function getCountKey(date: string, folderID: number) {
	return `${date}|${folderID}`;
}

export async function incrementDailyCount(date: string, folderID: number, amount: number) {
	const key = getCountKey(date, folderID);
	const existing = await db.dailyWordCounts.get(key);

	await db.dailyWordCounts.put({
		key,
		date,
		folderID,
		words: (existing?.words ?? 0) + amount
	});
}
