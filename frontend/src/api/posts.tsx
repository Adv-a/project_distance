import type { ImagePickerAsset } from "expo-image-picker";

import { apiFetch } from "./fetch";
import { Post, TagValue } from "../type/objects";

function dateInputToISOString(value: string): string {
    if (!value.trim()) {
        return new Date().toISOString();
    }

    const [year, month, day] = value.split("-").map(Number);

    if (!year || !month || !day) {
        return new Date().toISOString();
    }

    return new Date(year, month - 1, day, 12, 0, 0).toISOString();
}

export async function updatePost(
    postId: number,
    message: string,
    tags: TagValue[] = [],
    posted: string = "",
    newMediaFiles: ImagePickerAsset[] = [],
    deleteMediaIds: number[] = []
): Promise<Post> {
    const formData = new FormData();

    formData.append("message", message);
    formData.append("posted", dateInputToISOString(posted));
    formData.append("delete_media_ids", JSON.stringify(deleteMediaIds));

    tags.forEach((tag) => {
        formData.append("tags", tag);
    });

    newMediaFiles.forEach((media, index) => {
        const fallbackName =
            media.type === "video"
                ? `video-${index}.mp4`
                : `image-${index}.jpg`;

        if (media.file) {
            formData.append("media_files", media.file);
        } else {
            formData.append(
                "media_files",
                {
                    uri: media.uri,
                    name: media.fileName ?? fallbackName,
                    type:
                        media.mimeType ??
                        (media.type === "video"
                            ? "video/mp4"
                            : "image/jpeg"),
                } as any
            );
        }
    });

    const data = await apiFetch(`posts/${postId}/`, "PATCH", formData);

    return Post.fromObject(data);
}

export async function createPostOnThread(
    threadId: number,
    message: string,
    tags: TagValue[] = [],
    posted: string = "",
    mediaFiles: ImagePickerAsset[] = []
): Promise<Post> {
    const formData = new FormData();

    formData.append("thread_id", String(threadId));
    formData.append("message", message);

    formData.append("posted", dateInputToISOString(posted));

    tags.forEach((tag) => {
        formData.append("tags", tag);
    });

    mediaFiles.forEach((media, index) => {
        const fallbackName =
            media.type === "video"
                ? `video-${index}.mp4`
                : `image-${index}.jpg`;

        if (media.file) {
            formData.append("media_files", media.file);
        } else {
            formData.append(
                "media_files",
                {
                    uri: media.uri,
                    name: media.fileName ?? fallbackName,
                    type:
                        media.mimeType ??
                        (media.type === "video"
                            ? "video/mp4"
                            : "image/jpeg"),
                } as any
            );
        }
    });

    const data = await apiFetch("posts/", "POST", formData);

    return Post.fromObject(data);
}