export function getTitleString(content: string | JSON) {
	const defaultTitle = 'New document';
	if (!content) {
		return defaultTitle;
	}

	let json;

	try {
		json = typeof content === 'string' ? JSON.parse(content) : content;
	} catch (error) {
		console.warn('Invalid post content:', content, error);
		return defaultTitle;
	}

	const firstBlock = json?.content?.[0];

	const fullText = firstBlock?.content
		?.map((node: { text: string }) => node.text ?? '')
		.join('')
		.trim();

	if (!fullText) {
		return defaultTitle;
	}

	const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
	const firstSentence = [...segmenter.segment(fullText)][0]?.segment ?? fullText;

	return firstSentence.trim() || defaultTitle;
}
