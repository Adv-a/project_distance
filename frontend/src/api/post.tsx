import { apiFetch } from "./fetch";
import { Post, TagValue } from "../type/objects";

export async function createPostOnThread(
    threadId: number,
    message: string,
    tags: TagValue[] = [],
    posted: string = ""
): Promise<Post> {
    const data = await apiFetch("posts/", "POST", {
        thread_id: threadId,
        message,
        tags,
        posted,
    });

    return Post.fromObject(data);
}