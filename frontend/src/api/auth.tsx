import { apiFetch, getCsrfToken } from "./fetch";
import { ConnectedUser } from "../type/objects";

export async function login(
    usernameOrEmail: string,
    password: string
): Promise<ConnectedUser> {
    await getCsrfToken();

    const data = await apiFetch("auth/login/", "POST", {
        username_or_email: usernameOrEmail,
        password,
    });

    return ConnectedUser.fromObject(data.user);
}

export async function logout(): Promise<void> {
    await apiFetch("auth/logout/", "POST");
}

export async function getMe(): Promise<ConnectedUser> {
    const data = await apiFetch("auth/me/", "GET");
    return ConnectedUser.fromObject(data);
}

export async function changePassword(
    oldPassword: string,
    newPassword: string
): Promise<ConnectedUser> {
    const data = await apiFetch("auth/change-password/", "POST", {
        old_password: oldPassword,
        new_password: newPassword,
    });

    return ConnectedUser.fromObject(data.user);
}