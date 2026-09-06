import { GLOBAL_FOLDER_ID, type Folder } from '$lib/db/database';
import { toDateKey } from '$lib/utils/weeks';

export function countKey(date: string, folderID: number) {
	return `${date}|${folderID}`;
}

export function formatNumber(value: number) {
	return new Intl.NumberFormat().format(value);
}

export function formatShortNumber(value: number) {
	if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
	if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
	return String(value);
}

export function getDateDaysAgo(days: number) {
	const date = new Date();
	date.setHours(0, 0, 0, 0);
	date.setDate(date.getDate() - days);
	return date;
}

export function buildCountsIndex(rows: { date: string; folderID: number; words: number }[]) {
	return new Map(rows.map((row) => [countKey(row.date, row.folderID), row.words]));
}

export function computeDailyData(
	dates: string[],
	dayLabels: string[],
	folderID: number,
	countsByKey: Map<string, number>
) {
	return dates.map((date, index) => ({
		day: dayLabels[index],
		words: countsByKey.get(countKey(date, folderID)) ?? 0
	}));
}

export function computeSixWeekAverages(currentWeekStart: Date, countsByKey: Map<string, number>) {
	const firstWeekStart = new Date(currentWeekStart);
	firstWeekStart.setDate(firstWeekStart.getDate() - 5 * 7);

	const sixWeekDates = Array.from({ length: 42 }, (_, i) => {
		const date = new Date(firstWeekStart);
		date.setDate(firstWeekStart.getDate() + i);
		return date;
	});

	return Array.from({ length: 6 }, (_, weekIndex) => {
		const week = sixWeekDates.slice(weekIndex * 7, weekIndex * 7 + 7);
		const weekWords = week.reduce(
			(total, date) => total + (countsByKey.get(countKey(toDateKey(date), GLOBAL_FOLDER_ID)) ?? 0),
			0
		);
		const weekStart = week[0];

		return {
			week: `Week of ${weekStart.getDate()} ${weekStart.toLocaleDateString('en-GB', { month: 'short' })} '${String(weekStart.getFullYear()).slice(-2)}`,
			dailyAverage: Math.round(weekWords / 7)
		};
	});
}

export function computeWeeklyFolderStats(
	folders: Folder[],
	weekDates: string[],
	dayLabels: string[],
	countsByKey: Map<string, number>
) {
	return folders.map((folder) => {
		const dailyData = computeDailyData(weekDates, dayLabels, folder.id, countsByKey);
		const words = dailyData.reduce((total, item) => total + item.words, 0);
		const goal = folder.weeklyWordGoal ?? 0;

		return {
			folder,
			words,
			goal,
			percentage: goal > 0 ? Math.min(100, (words / goal) * 100) : 0,
			dailyData
		};
	});
}

export function computeLastThreeMonths(folders: Folder[], countsByKey: Map<string, number>) {
	const ninetyDays = Array.from({ length: 90 }, (_, i) => getDateDaysAgo(89 - i));

	const series = folders.map((folder) => ({ key: `folder_${folder.id}`, label: folder.name }));

	const data = ninetyDays.map((date) => {
		const dateKey = toDateKey(date);
		const row: Record<string, string | number> = { day: dateKey };
		for (const folder of folders) {
			row[`folder_${folder.id}`] = countsByKey.get(countKey(dateKey, folder.id)) ?? 0;
		}
		return row;
	});

	return { series, data };
}
