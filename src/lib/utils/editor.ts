import { StarterKit } from '@tiptap/starter-kit';
import { Extension } from '@tiptap/core';
import { TableKit } from '@tiptap/extension-table'
import { TaskList, TaskItem } from '@tiptap/extension-list';
import Image from '@tiptap/extension-image';
import FileHandler from '@tiptap/extension-file-handler';
import { Focus, Placeholder, CharacterCount } from '@tiptap/extensions';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { Markdown } from '@tiptap/markdown'
import { Plugin } from '@tiptap/pm/state'
import { createLowlight, common } from 'lowlight';

const lowlight = createLowlight(common);

// https://tiptap.dev/docs/editor/markdown/examples
const PasteMarkdown = Extension.create({
  name: 'pasteMarkdown',

  addProseMirrorPlugins() {
    const { editor } = this;
    return [
      new Plugin({
        props: {
          handlePaste(view, event, slice) {
            const text = event.clipboardData?.getData('text/plain')

            if (!text) {
              return false
            }

            // Check if text looks like Markdown
            if (editor.markdown && looksLikeMarkdown(text)) {
              const { state, dispatch } = view
              // Parse the Markdown text to Tiptap JSON using the Markdown manager
              const json = editor.markdown.parse(text)

              // Insert the parsed JSON content at cursor position
              editor.commands.insertContent(json)
              return true
            }

            return false
          },
        },
      }),
    ]
  },
})

function looksLikeMarkdown(text: string): boolean {
  // Simple heuristic: check for Markdown syntax
  return (
    /^#{1,6}\s/.test(text) || // Headings
    /\*\*[^*]+\*\*/.test(text) || // Bold
    /\[.+\]\(.+\)/.test(text) || // Links
    /^[-*+]\s/.test(text)
  ) // Lists
}

export const editorExtensions = [
	StarterKit.configure({
		codeBlock: false
	}),
	Markdown,
	PasteMarkdown,
	TableKit,
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
