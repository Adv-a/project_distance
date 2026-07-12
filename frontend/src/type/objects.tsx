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
    last_login: string | null = null;
    date_joined: string | null = null;

    constructor(data: Partial<User> = {}) {
        Object.assign(this, data);
    }

    static fromObject(obj: unknown): User {
        if (!obj || typeof obj !== "object") {
            return new User();
        }

        const data = obj as any;

        return new User({
            id: Number(data.id ?? 0),
            username: String(data.username ?? ""),
            profilPicture:
                typeof data.profilPicture === "string"
                    ? data.profilPicture
                    : null,
            last_login:
                typeof data.last_login === "string"
                    ? data.last_login
                    : null,
            date_joined:
                typeof data.date_joined === "string"
                    ? data.date_joined
                    : null,
        });
    }
}

export class ConnectedUser extends User {
    email: string = "";
    is_moderator: boolean = false;
    must_change_password: boolean = false;

    constructor(data: Partial<ConnectedUser> = {}) {
        super(data);
        Object.assign(this, data);
    }

    static fromObject(obj: unknown): ConnectedUser {
        if (!obj || typeof obj !== "object") {
            return new ConnectedUser();
        }

        const data = obj as any;
        const baseUser = User.fromObject(obj);

        return new ConnectedUser({
            ...baseUser,
            email: String(data.email ?? ""),
            is_moderator: Boolean(data.is_moderator ?? false),
            must_change_password: Boolean(data.must_change_password ?? false),
        });
    }
}

export class PostMedia {
    id: number = 0;
    file: string | null = null;
    media_type: "image" | "video" = "image";
    order: number = 0;

    constructor(data: Partial<PostMedia> = {}) {
        Object.assign(this, data);
    }

    static fromObject(obj: unknown): PostMedia {
        if (!obj || typeof obj !== "object") {
            return new PostMedia();
        }

        const data = obj as any;

        return new PostMedia({
            id: Number(data.id ?? 0),
            file:
                typeof data.file === "string"
                    ? data.file
                    : null,
            media_type:
                data.media_type === "video"
                    ? "video"
                    : "image",
            order: Number(data.order ?? 0),
        });
    }
}

export class Post {
    id: number = 0;
    tags: TagValue[] = [];
    sender: User = new User();
    message: string = "";

    image_content: string | null = null;
    video_content: string | null = null;

    liked: User[] = [];
    posted: Date | null = null;
    media: PostMedia[] = [];
    can_edit: boolean = false;

    constructor(data: Partial<Post> = {}) {
        Object.assign(this, data);
    }

    static fromObject(obj: unknown): Post {
        if (!obj || typeof obj !== "object") {
            return new Post();
        }

        const data = obj as any;

        return new Post({
            id: Number(data.id ?? 0),

            tags: Array.isArray(data.tags)
                ? data.tags
                : [],

            sender: User.fromObject(data.sender),

            message: String(data.message ?? ""),

            image_content:
                typeof data.image_content === "string"
                    ? data.image_content
                    : null,

            video_content:
                typeof data.video_content === "string"
                    ? data.video_content
                    : null,

            media: Array.isArray(data.media)
                ? data.media.map(PostMedia.fromObject)
                : [],

            liked: Array.isArray(data.liked)
                ? data.liked.map(User.fromObject)
                : [],

            posted: data.posted
                ? new Date(data.posted)
                : null,

            can_edit: Boolean(data.can_edit ?? false),
        });
    }
}

export class Thread {
    id: number = 0;
    posts: Post[] = [];
    members: User[] = [];
    name: string = "";
    created_at: string | null = null;

    constructor(data: Partial<Thread> = {}) {
        Object.assign(this, data);
    }

    static fromObject(obj: unknown): Thread {
        if (!obj || typeof obj !== "object") {
            return new Thread();
        }

        const data = obj as any;

        return new Thread({
            id: Number(data.id ?? 0),
            name: String(data.name ?? ""),
            created_at:
                typeof data.created_at === "string"
                    ? data.created_at
                    : null,
            members: Array.isArray(data.members)
                ? data.members.map(User.fromObject)
                : [],
            posts: Array.isArray(data.posts)
                ? data.posts.map(Post.fromObject)
                : [],
        });
    }
}