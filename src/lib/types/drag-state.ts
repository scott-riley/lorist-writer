export interface DragState {
	isDraggingPost: boolean;
	hoveredFolderId: number | null;
	dropTargetFolderId: number | null;
	expandFolderId: number | null;
	resetDragTracking: () => void;
}
