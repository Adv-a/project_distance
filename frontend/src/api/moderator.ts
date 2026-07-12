import { apiFetch } from "./fetch";
import { Thread, User } from "../type/objects";

export async function createUserByModerator(
    username: string,
    email: string
): Promise<{
    id: number;
    username: string;
    email: string;
    temporary_password: string;
    must_change_password: boolean;
}> {
    return apiFetch("users/", "POST", {
        username,
        email,
    });
}

export async function resetUserPassword(userId: number): Promise<{
    user_id: number;
    username: string;
    temporary_password: string;
}> {
    return apiFetch(`users/${userId}/reset-password/`, "POST");
}

export async function createThreadByModerator(
    name: string,
    memberIds: number[]
): Promise<Thread> {
    const data = await apiFetch("threads/", "POST", {
        name,
        member_ids: memberIds,
    });

    return Thread.fromObject(data);
}

export async function findUsersBySearch(search: string): Promise<User[]> {
    const data = await apiFetch(
        `users/?search=${encodeURIComponent(search)}`,
        "GET"
    );

    const list = Array.isArray(data) ? data : data.results ?? [];

    return list.map(User.fromObject);
}