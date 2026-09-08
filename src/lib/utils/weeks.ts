// properly format a date as the date portion of count's compound key
export function toDateKey(date = new Date()) {
	const year = date.getFullYear();
	// make sure those pesky days get leading 0's if needed'
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

// get the monday of the current week,
// yes this is lots of extra work for not wanting weeks to start on a sunday
// yes it is that important to me
// https://codingtechroom.com/question/-get-date-monday-current-week-javascript
const getMonday = () => {
	const today = new Date();
	const dayOfWeek = today.getDay(); // Returns 0 for Sunday, 1 for Monday, etc.
	const mondayDate = new Date(today);
	const differenceToMonday = (dayOfWeek + 6) % 7; // Calculate difference to last Monday
	mondayDate.setDate(today.getDate() - differenceToMonday);
	return mondayDate;
};

// get an array of week days formatted as a correct string for compound key
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from#sequence_generator_range
export function getWeekDates() {
	const monday = getMonday();
	return Array.from({ length: 7 }, (_, index) => {
		const current = new Date(monday);
		current.setDate(monday.getDate() + index);
		return toDateKey(current);
	});
}
