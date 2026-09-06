export const starterContent = {
	type: 'doc',
	content: [
		{
			type: 'heading',
			attrs: { level: 1 },
			content: [{ type: 'text', text: 'Welcome to Lorist' }]
		},
		{
			type: 'paragraph',
			content: [
				{
					type: 'text',
					text: 'Lorist is the writing app that gets out of your way. No tracking, no bloated feature sets, no trying to be an all–in–one productivity tool, no AI bloat of any kind. Just you, your words, and juuuust enough functionality to make writing feel lovely.'
				}
			]
		},
		{
			type: 'heading',
			attrs: { level: 2 },
			content: [{ type: 'text', text: 'Key features' }]
		},
		{
			type: 'paragraph',
			content: [
				{
					type: 'text',
					text: 'Being feature–light doesn\u2019t mean Lorist is under–powered. It\u2019s simply heavily curated, with a high threshold for \u2018useful\u2019. All that is to say, there\u2019s some pretty cool stuff under the hood.'
				}
			]
		},
		{
			type: 'heading',
			attrs: { level: 3 },
			content: [{ type: 'text', text: 'Focus Mode' }]
		},
		{
			type: 'paragraph',
			content: [
				{
					type: 'text',
					text: 'Writing can be a frustrating experience, especially when it comes to writing longer pieces over long periods of time. Focus mode dims everything but your current focused element, letting you focus on writing or editing what you care about right now, instead of getting distracted by stuff you\u2019ve already written or edited.'
				}
			]
		},
		{
			type: 'paragraph',
			content: [
				{ type: 'text', text: 'Hit ' },
				{
					type: 'text',
					marks: [{ type: 'code' }],
					text: 'Cmd + /'
				},
				{ type: 'text', text: ' to toggle focus mode on/off.' }
			]
		},
		{
			type: 'heading',
			attrs: { level: 3 },
			content: [{ type: 'text', text: 'Writing Goals' }]
		},
		{
			type: 'paragraph',
			content: [
				{
					type: 'text',
					text: 'Whether you\u2019re writing a book with chapter word–count goals, or looking to just hit a sweet spot length for blog posts, word goals let you manage and track how much you want to write.'
				}
			]
		},
		{
			type: 'paragraph',
			content: [
				{
					type: 'text',
					text: 'You can set static word goals at the folder level and/or global weekly word goals depending on how you like to track. Goal tracking is '
				},
				{
					type: 'text',
					marks: [{ type: 'italic' }],
					text: 'completely optional'
				},
				{
					type: 'text',
					text: ' and progress is displayed very unobtrusively at the top of any document that has goals attached. This isn\u2019t some kind freakish \u2018streak\u2019 feature.'
				}
			]
		},
		{
			type: 'heading',
			attrs: { level: 3 },
			content: [{ type: 'text', text: 'Offline–only' }]
		},
		{
			type: 'paragraph',
			content: [
				{
					type: 'text',
					text: 'All of your data is saved locally to your browser and not a single byte of your created content will be synced or uploaded to a server. This means you have full ownership of anything you produce, and your writing and ideas aren\u2019t being piped into a dozen sync and storage services and — perhaps most importantly — your data isn\u2019t getting gobbled up by AI.'
				}
			]
		},
		{
			type: 'heading',
			attrs: { level: 3 },
			content: [{ type: 'text', text: 'Markdown–based' }]
		},
		{
			type: 'paragraph',
			content: [
				{
					type: 'text',
					text: 'If you\u2019ve written in Markdown before, you should feel right at home in Lorist. Documents are simple and semantic, no block-based shenanigans, and can be exported to super clean Markdown.'
				}
			]
		}
	]
};
