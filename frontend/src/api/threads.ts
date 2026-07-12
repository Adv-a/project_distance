import { apiFetch } from "./fetch";
import { Thread } from "../type/objects";

export async function findMyThreads(): Promise<Thread[]> {
    const data = await apiFetch("threads/", "GET");

    const list = Array.isArray(data) ? data : data.results ?? [];

    return list.map(Thread.fromObject);
}