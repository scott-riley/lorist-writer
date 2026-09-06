import { StarterKit } from '@tiptap/starter-kit';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import Image from '@tiptap/extension-image';
import FileHandler from '@tiptap/extension-file-handler';
import { Focus, Placeholder, CharacterCount } from '@tiptap/extensions';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { createLowlight, common } from 'lowlight';

const lowlight = createLowlight(common);

export const editorExtensions = [
	StarterKit.configure({
		codeBlock: false
	}),
	Image,
	TaskList,
	CharacterCount,
	CodeBlockLowlight.configure({
		lowlight
	}),
	TaskItem.configure({
		nested: true
	}),
	Focus.configure({
		className: 'has-focus',
		mode: 'all'
	}),
	Placeholder.configure({
		placeholder: 'Write something …'
	}),
	FileHandler.configure({
		allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
		onDrop: (currentEditor, files, pos) => {
			files.forEach((file) => {
				const fileReader = new FileReader();
				fileReader.readAsDataURL(file);
				fileReader.onload = () => {
					currentEditor
						.chain()
						.insertContentAt(pos, {
							type: 'image',
							attrs: {
								src: fileReader.result
							}
						})
						.focus()
						.run();
				};
			});
		},
		onPaste: (currentEditor, files, htmlContent) => {
			files.forEach((file) => {
				const fileReader = new FileReader();
				fileReader.readAsDataURL(file);
				fileReader.onload = () => {
					currentEditor
						.chain()
						.insertContentAt(currentEditor.state.selection.anchor, {
							type: 'image',
							attrs: {
								src: fileReader.result
							}
						})
						.focus()
						.run();
				};
			});
		}
	})
];
