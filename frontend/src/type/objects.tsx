export const Tag = {
    MESSAGE: "Message",
    IDEE: "Idee",
    FILM: "Film",
    PHOTO: "Photo",
} as const;

export type TagValue = typeof Tag[keyof typeof Tag];

export class User {
    id: number = 0;
    profilPicture: string | null = null;
    username: string = "";
    last_login: Date | null = null;
    date_joined: Date | null = null;

    constructor(data: Partial<User> = {}) {
        Object.assign(this, data);
    }

    static fromObject(obj: unknown): User {
        if (!obj || typeof obj !== "object") return new User();

        const data = obj as any;

        return new User({
            id: Number(data.id ?? 0),
            username: String(data.username ?? ""),
            last_login: data.last_login ? new Date(data.last_login) : null,
            date_joined: data.date_joined ? new Date(data.date_joined) : null,
            profilPicture:
                typeof data.profilPicture === "string"
                    ? data.profilPicture
                    : null,
        });
    }

    static fromJSON(json: string): User {
        return User.fromObject(JSON.parse(json));
    }
}

export class ConnectedUser extends User {
    email: string = "";

    constructor(data: Partial<ConnectedUser> = {}) {
        super(data);
        Object.assign(this, data);
    }

    static fromObject(obj: unknown): ConnectedUser {
        if (!obj || typeof obj !== "object") return new ConnectedUser();

        const data = obj as any;
        const baseUser = User.fromObject(obj);

        return new ConnectedUser({
            ...baseUser,
            email: String(data.email ?? ""),
        });
    }

    static fromJSON(json: string): ConnectedUser {
        return ConnectedUser.fromObject(JSON.parse(json));
    }
}

export class Post {
    id: number = 0;
    tags: TagValue[] = [];
    sender: User = new User();
    message: string = "";
    image_content: string | null = null;
    liked: User[] = [];
    posted: string = "";

    constructor(data: Partial<Post> = {}) {
        Object.assign(this, data);
    }

    static fromObject(obj: unknown): Post {
        if (!obj || typeof obj !== "object") return new Post();

        const data = obj as any;

        return new Post({
            id: Number(data.id ?? 0),
            tags: Array.isArray(data.tags) ? data.tags : [],
            sender: User.fromObject(data.sender),
            message: String(data.message ?? ""),
            image_content:
                typeof data.image_content === "string"
                    ? data.image_content
                    : null,
            liked: Array.isArray(data.liked)
                ? data.liked.map(User.fromObject)
                : [],
            posted: String(data.posted ?? ""),
        });
    }
}

export class Thread {
    id: number = 0;
    posts: Post[] = [];
    members: User[] = [];
    name: string = "";
    created_at: Date | null = null;

    constructor(data: Partial<Thread> = {}) {
        Object.assign(this, data);
    }

    static fromObject(obj: unknown): Thread {
        if (!obj || typeof obj !== "object") return new Thread();

        const data = obj as any;

        return new Thread({
            id: Number(data.id ?? 0),
            name: String(data.name ?? ""),
            created_at: data.created_at ? new Date(data.created_at) : null,
            members: Array.isArray(data.members)
                ? data.members.map(User.fromObject)
                : [],
            posts: Array.isArray(data.posts)
                ? data.posts.map(Post.fromObject)
                : [],
        });
    }
}