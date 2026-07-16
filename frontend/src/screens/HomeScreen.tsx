import { useEffect, useMemo, useState } from "react";
import { BoardFilters } from "../components/BoardFilters";
import {
    View,
    Text,
    Pressable,
    ActivityIndicator,
    StyleSheet,
    ScrollView,
} from "react-native";

import { EditPostModal } from "../components/EditPostModal";
import { Post } from "../type/objects";

import { logout } from "../api/auth";
import { findMyThreads } from "../api/threads";
import { ConnectedUser, Thread, TagValue } from "../type/objects";
import { MasonryBoard } from "../components/MasonryBoard";
import { PostModal } from "../components/PostModal";
import { ModeratorModal } from "../components/ModeratorModal";
import { colors } from "../theme";

type HomeScreenProps = {
    connectedUser: ConnectedUser;
    onLogout: () => void;
};

function getThreadTime(thread: Thread): number {
    if (!thread.created_at) {
        return thread.id;
    }

    const date = new Date(thread.created_at);

    if (Number.isNaN(date.getTime())) {
        return thread.id;
    }

    return date.getTime();
}

function sortThreadsOldestFirst(threads: Thread[]): Thread[] {
    return [...threads].sort((a, b) => {
        const timeDiff = getThreadTime(a) - getThreadTime(b);

        if (timeDiff !== 0) {
            return timeDiff;
        }

        return a.id - b.id;
    });
}

export function HomeScreen({ connectedUser, onLogout }: HomeScreenProps) {
    const [threads, setThreads] = useState<Thread[]>([]);
    const [loading, setLoading] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);
    const [postModalVisible, setPostModalVisible] = useState(false);
    const [moderatorModalVisible, setModeratorModalVisible] = useState(false);
    const [error, setError] = useState("");
    const [editingPost, setEditingPost] = useState<Post | null>(null);
    const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
    const [selectedTags, setSelectedTags] = useState<TagValue[]>([]);

    useEffect(() => {
        loadThreads();
    }, []);

    async function loadThreads() {
        try {
            setLoading(true);
            setError("");

            const result = await findMyThreads();
            setThreads(result);
        } catch (err) {
            console.error(err);
            setError("Impossible de charger les mood boards.");
        } finally {
            setLoading(false);
        }
    }

    const sortedThreads = useMemo(() => {
        return sortThreadsOldestFirst(threads);
    }, [threads]);

    useEffect(() => {
        if (sortedThreads.length === 0) {
            setSelectedThreadId(null);
            return;
        }

        const selectedThreadStillExists = sortedThreads.some(
            (thread) => thread.id === selectedThreadId
        );

        if (selectedThreadId === null || !selectedThreadStillExists) {
            setSelectedThreadId(sortedThreads[0].id);
        }
    }, [sortedThreads, selectedThreadId]);

    const filteredThreads = useMemo(() => {
        const selectedThread = sortedThreads.find(
            (thread) => thread.id === selectedThreadId
        );

        if (!selectedThread) {
            return [];
        }

        const posts = Array.isArray(selectedThread.posts)
            ? selectedThread.posts
            : [];

        const filteredPosts =
            selectedTags.length === 0
                ? posts
                : posts.filter((post) => {
                    const postTags = Array.isArray(post.tags)
                        ? post.tags
                        : [];

                    return selectedTags.some((tag) =>
                        postTags.includes(tag)
                    );
                });

        return [
            new Thread({
                ...selectedThread,
                posts: filteredPosts,
            }),
        ];
    }, [sortedThreads, selectedThreadId, selectedTags]);

    function toggleSelectedTag(tag: TagValue) {
        setSelectedTags((currentTags) => {
            if (currentTags.includes(tag)) {
                return currentTags.filter(
                    (currentTag) => currentTag !== tag
                );
            }

            return [...currentTags, tag];
        });
    }

    async function handleLogout() {
        try {
            setLogoutLoading(true);
            await logout();
            onLogout();
        } catch (err) {
            console.error(err);
            setError("Erreur pendant la déconnexion.");
        } finally {
            setLogoutLoading(false);
        }
    }

    return (
        <View style={styles.page}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.hero}>
                    <View style={styles.heroText}>
                        <Text style={styles.kicker}>Mood board partagé</Text>
                        <Text style={styles.title}>
                            Tes inspirations, tes threads, tes idées.
                        </Text>
                        <Text style={styles.subtitle}>
                            Connecté en tant que {connectedUser.username}
                        </Text>
                    </View>

                    <View style={styles.actions}>
                        <Pressable
                            style={styles.primaryButton}
                            onPress={() => setPostModalVisible(true)}
                        >
                            <Text style={styles.primaryButtonText}>
                                Ajouter un post
                            </Text>
                        </Pressable>

                        {connectedUser.is_moderator ? (
                            <Pressable
                                style={styles.secondaryButton}
                                onPress={() => setModeratorModalVisible(true)}
                            >
                                <Text style={styles.secondaryButtonText}>
                                    Modération
                                </Text>
                            </Pressable>
                        ) : null}

                        <Pressable
                            style={styles.ghostButton}
                            onPress={loadThreads}
                        >
                            <Text style={styles.ghostButtonText}>Rafraîchir</Text>
                        </Pressable>

                        <Pressable
                            style={styles.logoutButton}
                            onPress={handleLogout}
                            disabled={logoutLoading}
                        >
                            <Text style={styles.logoutButtonText}>
                                {logoutLoading ? "..." : "Logout"}
                            </Text>
                        </Pressable>
                    </View>
                </View>

                {loading ? (
                    <ActivityIndicator style={styles.loader} />
                ) : null}

                {error ? (
                    <Text style={styles.error}>
                        {error instanceof Error
                            ? error.message
                            : typeof error === "string"
                                ? error
                                : JSON.stringify(error)}
                    </Text>
                ) : null}
                <BoardFilters
                    threads={sortedThreads}
                    selectedThreadId={selectedThreadId}
                    selectedTags={selectedTags}
                    onSelectThread={setSelectedThreadId}
                    onToggleTag={toggleSelectedTag}
                    onClearTags={() => setSelectedTags([])}
                />

                <MasonryBoard
                    threads={filteredThreads}
                    onEditPost={setEditingPost}
                />
            </ScrollView>

            <PostModal
                visible={postModalVisible}
                threads={threads}
                onClose={() => setPostModalVisible(false)}
                onCreated={loadThreads}
            />

            <ModeratorModal
                visible={moderatorModalVisible}
                onClose={() => setModeratorModalVisible(false)}
                onChanged={loadThreads}
            />
            <EditPostModal
                visible={editingPost !== null}
                post={editingPost}
                onClose={() => setEditingPost(null)}
                onUpdated={loadThreads}
            />
    </View>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: colors.background,
    },
    container: {
        padding: 24,
        gap: 24,
    },
    hero: {
        backgroundColor: colors.surfaceWarm,
        borderRadius: 32,
        padding: 24,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 20,
    },
    heroText: {
        gap: 6,
    },
    kicker: {
        color: colors.primaryDark,
        fontWeight: "900",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    title: {
        fontSize: 34,
        lineHeight: 39,
        fontWeight: "900",
        color: colors.brown,
    },
    subtitle: {
        color: colors.muted,
        fontSize: 16,
    },
    actions: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    primaryButton: {
        backgroundColor: colors.primary,
        paddingVertical: 13,
        paddingHorizontal: 18,
        borderRadius: 999,
    },
    primaryButtonText: {
        color: "white",
        fontWeight: "900",
    },
    secondaryButton: {
        backgroundColor: colors.accent,
        paddingVertical: 13,
        paddingHorizontal: 18,
        borderRadius: 999,
    },
    secondaryButtonText: {
        color: "white",
        fontWeight: "900",
    },
    ghostButton: {
        backgroundColor: colors.surface,
        paddingVertical: 13,
        paddingHorizontal: 18,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
    },
    ghostButtonText: {
        color: colors.brown,
        fontWeight: "900",
    },
    logoutButton: {
        backgroundColor: colors.brown,
        paddingVertical: 13,
        paddingHorizontal: 18,
        borderRadius: 999,
    },
    logoutButtonText: {
        color: "white",
        fontWeight: "900",
    },
    loader: {
        marginTop: 10,
    },
    error: {
        color: colors.danger,
        fontWeight: "800",
    },
});