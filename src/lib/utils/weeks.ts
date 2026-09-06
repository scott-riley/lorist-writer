export function toDateKey(date = new Date()) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

export function getMonday(date = new Date()) {
	const monday = new Date(date);
	monday.setHours(0, 0, 0, 0);

	const day = monday.getDay();
	const daysSinceMonday = day === 0 ? 6 : day - 1;

	monday.setDate(monday.getDate() - daysSinceMonday);
	return monday;
}

export function getWeekDates(date = new Date()) {
	const monday = getMonday(date);

	return Array.from({ length: 7 }, (_, index) => {
		const current = new Date(monday);
		current.setDate(monday.getDate() + index);
		return toDateKey(current);
	});
}
