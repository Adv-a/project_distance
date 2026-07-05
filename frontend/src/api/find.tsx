import { Thread, User } from "../type/objects";
import { apiFetch } from "./fetch";

export async function findUsersByUsername(username: string): Promise<User[]> {
    const data = await apiFetch(
        `users/?username=${encodeURIComponent(username)}`,
        "GET"
    );

    const list = Array.isArray(data) ? data : data.results ?? [];

    return list.map(User.fromObject);
}

export async function findThreadsByName(name: string): Promise<Thread[]> {
    const data = await apiFetch(
        `threads/?name=${encodeURIComponent(name)}`,
        "GET"
    );

    const list = Array.isArray(data) ? data : data.results ?? [];

    return list.map(Thread.fromObject);
}

export async function findMyThreads(): Promise<Thread[]> {
    const data = await apiFetch("threads/", "GET");

    const list = Array.isArray(data) ? data : data.results ?? [];

    return list.map(Thread.fromObject);
}