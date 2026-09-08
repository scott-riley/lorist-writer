import { db, type Post } from '$lib/db/database';

export async function getFolderPosts(folderId: number): Promise<Post[]> {
	return db.posts
		.where('folderID')
		.equals(folderId)
		.filter((p) => p.deletedAt == null)
		.sortBy('sortKey');
}
