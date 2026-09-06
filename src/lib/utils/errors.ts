export function logError(action: string, error: unknown) {
	console.error(`Failed to ${action}:`, error);
}
