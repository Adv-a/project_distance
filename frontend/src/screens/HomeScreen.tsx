import { useEffect, useState } from "react";
import {
    View,
    Text,
    Pressable,
    ActivityIndicator,
    StyleSheet,
    ScrollView,
    Modal,
    TextInput,
} from "react-native";

import { findMyThreads } from "../api/find";
import { createPostOnThread } from "../api/post";
import { logout } from "../api/auth";
import { ConnectedUser, Thread, Tag, TagValue } from "../type/objects";

type HomeScreenProps = {
    connectedUser: ConnectedUser;
    onLogout: () => void;
};

export function HomeScreen({ connectedUser, onLogout }: HomeScreenProps) {
    const [threads, setThreads] = useState<Thread[]>([]);
    const [loading, setLoading] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);
    const [error, setError] = useState("");

    const [postModalVisible, setPostModalVisible] = useState(false);
    const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
    const [newPostMessage, setNewPostMessage] = useState("");
    const [newPostPosted, setNewPostPosted] = useState("");
    const [selectedTags, setSelectedTags] = useState<TagValue[]>([]);
    const [creatingPost, setCreatingPost] = useState(false);

    useEffect(() => {
        loadThreads();
    }, []);

    async function loadThreads() {
        try {
            setLoading(true);
            setError("");

            const result = await findMyThreads();
            setThreads(result);

            if (result.length > 0 && selectedThreadId === null) {
                setSelectedThreadId(result[0].id);
            }
        } catch (err) {
            console.error(err);
            setError("Erreur pendant le chargement des threads.");
        } finally {
            setLoading(false);
        }
    }

    function toggleTag(tag: TagValue) {
        setSelectedTags((current) => {
            if (current.includes(tag)) {
                return current.filter((item) => item !== tag);
            }

            return [...current, tag];
        });
    }

    function resetPostForm() {
        setNewPostMessage("");
        setNewPostPosted("");
        setSelectedTags([]);
        setSelectedThreadId(threads.length > 0 ? threads[0].id : null);
    }

    async function handleCreatePost() {
        if (!selectedThreadId) {
            setError("Choisis un thread.");
            return;
        }

        if (!newPostMessage.trim() && !newPostPosted.trim()) {
            setError("Écris au moins un message.");
            return;
        }

        try {
            setCreatingPost(true);
            setError("");

            await createPostOnThread(
                selectedThreadId,
                newPostMessage.trim(),
                selectedTags,
                newPostPosted.trim()
            );

            setPostModalVisible(false);
            resetPostForm();
            await loadThreads();
        } catch (err) {
            console.error(err);
            setError("Erreur pendant la création du post.");
        } finally {
            setCreatingPost(false);
        }
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
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Mood boards</Text>
                    <Text style={styles.connected}>
                        Connecté : {connectedUser.username}
                    </Text>
                </View>

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

            <Pressable
                style={styles.button}
                onPress={() => setPostModalVisible(true)}
            >
                <Text style={styles.buttonText}>Ajouter un post</Text>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={loadThreads}>
                <Text style={styles.secondaryButtonText}>Rafraîchir</Text>
            </Pressable>

            {loading && <ActivityIndicator style={styles.loader} />}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {!loading && threads.length === 0 ? (
                <Text>Aucun thread trouvé pour cet utilisateur.</Text>
            ) : null}

            {threads.map((thread) => (
                <View key={thread.id} style={styles.threadCard}>
                    <Text style={styles.threadTitle}>{thread.name}</Text>
                    <Text>ID : {thread.id}</Text>

                    <Text style={styles.sectionTitle}>Membres</Text>

                    {thread.members.map((member) => (
                        <View key={member.id} style={styles.memberCard}>
                            <Text>{member.username}</Text>
                        </View>
                    ))}

                    <Text style={styles.sectionTitle}>Posts</Text>

                    {thread.posts.length === 0 ? (
                        <Text>Aucun post dans ce thread.</Text>
                    ) : (
                        thread.posts.map((post) => (
                            <View key={post.id} style={styles.postCard}>
                                <Text style={styles.postAuthor}>
                                    {post.sender?.username ?? "Utilisateur inconnu"}
                                </Text>

                                <Text>{post.message}</Text>

                                {post.posted ? (
                                    <Text style={styles.posted}>{post.posted}</Text>
                                ) : null}

                                {post.tags.length > 0 ? (
                                    <Text style={styles.tags}>
                                        {post.tags.join(", ")}
                                    </Text>
                                ) : null}
                            </View>
                        ))
                    )}
                </View>
            ))}

            <Modal
                visible={postModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setPostModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Ajouter un post</Text>

                        <Text style={styles.label}>Choisir un thread</Text>

                        <ScrollView style={styles.threadPicker}>
                            {threads.map((thread) => {
                                const isSelected = selectedThreadId === thread.id;

                                return (
                                    <Pressable
                                        key={thread.id}
                                        style={[
                                            styles.threadOption,
                                            isSelected && styles.threadOptionSelected,
                                        ]}
                                        onPress={() => setSelectedThreadId(thread.id)}
                                    >
                                        <Text
                                            style={[
                                                styles.threadOptionText,
                                                isSelected && styles.threadOptionTextSelected,
                                            ]}
                                        >
                                            {thread.name}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>

                        <Text style={styles.label}>Message</Text>

                        <TextInput
                            style={styles.textArea}
                            placeholder="Écris ton post..."
                            value={newPostMessage}
                            onChangeText={setNewPostMessage}
                            multiline
                        />

                        <Text style={styles.label}>Texte secondaire / inspiration</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Optionnel"
                            value={newPostPosted}
                            onChangeText={setNewPostPosted}
                        />

                        <Text style={styles.label}>Tags</Text>

                        <View style={styles.tagsRow}>
                            {Object.values(Tag).map((tag) => {
                                const isSelected = selectedTags.includes(tag);

                                return (
                                    <Pressable
                                        key={tag}
                                        style={[
                                            styles.tagButton,
                                            isSelected && styles.tagButtonSelected,
                                        ]}
                                        onPress={() => toggleTag(tag)}
                                    >
                                        <Text
                                            style={[
                                                styles.tagButtonText,
                                                isSelected && styles.tagButtonTextSelected,
                                            ]}
                                        >
                                            {tag}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        <View style={styles.modalActions}>
                            <Pressable
                                style={styles.cancelButton}
                                onPress={() => {
                                    setPostModalVisible(false);
                                    resetPostForm();
                                }}
                                disabled={creatingPost}
                            >
                                <Text style={styles.cancelButtonText}>Annuler</Text>
                            </Pressable>

                            <Pressable
                                style={styles.createButton}
                                onPress={handleCreatePost}
                                disabled={creatingPost}
                            >
                                <Text style={styles.createButtonText}>
                                    {creatingPost ? "Création..." : "Créer"}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 24,
        gap: 12,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
    },
    connected: {
        marginTop: 4,
        opacity: 0.7,
    },
    logoutButton: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 8,
        backgroundColor: "#991b1b",
    },
    logoutButtonText: {
        color: "white",
        fontWeight: "bold",
    },
    button: {
        padding: 12,
        borderRadius: 8,
        alignItems: "center",
        backgroundColor: "#222",
    },
    buttonText: {
        color: "white",
        fontWeight: "bold",
    },
    secondaryButton: {
        padding: 12,
        borderRadius: 8,
        alignItems: "center",
        borderWidth: 1,
    },
    secondaryButtonText: {
        fontWeight: "bold",
    },
    loader: {
        marginTop: 16,
    },
    error: {
        marginTop: 12,
        color: "red",
    },
    threadCard: {
        marginTop: 16,
        padding: 16,
        borderWidth: 1,
        borderRadius: 8,
        gap: 8,
    },
    threadTitle: {
        fontSize: 20,
        fontWeight: "bold",
    },
    sectionTitle: {
        marginTop: 12,
        fontWeight: "bold",
    },
    memberCard: {
        padding: 8,
        borderWidth: 1,
        borderRadius: 6,
    },
    postCard: {
        padding: 10,
        borderWidth: 1,
        borderRadius: 6,
        gap: 4,
    },
    postAuthor: {
        fontWeight: "bold",
    },
    posted: {
        opacity: 0.7,
        fontSize: 12,
    },
    tags: {
        fontSize: 12,
        fontWeight: "bold",
        marginTop: 4,
    },

    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        padding: 24,
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    modalCard: {
        backgroundColor: "white",
        borderRadius: 12,
        padding: 18,
        gap: 10,
        maxHeight: "90%",
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: "bold",
        marginBottom: 8,
    },
    label: {
        fontWeight: "bold",
        marginTop: 6,
    },
    threadPicker: {
        maxHeight: 120,
    },
    threadOption: {
        padding: 10,
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 6,
    },
    threadOptionSelected: {
        backgroundColor: "#222",
    },
    threadOptionText: {
        fontWeight: "bold",
    },
    threadOptionTextSelected: {
        color: "white",
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
    },
    textArea: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        minHeight: 90,
        textAlignVertical: "top",
    },
    tagsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    tagButton: {
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 20,
        borderWidth: 1,
    },
    tagButtonSelected: {
        backgroundColor: "#222",
    },
    tagButtonText: {
        fontWeight: "bold",
    },
    tagButtonTextSelected: {
        color: "white",
    },
    modalActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 10,
        marginTop: 12,
    },
    cancelButton: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 8,
        borderWidth: 1,
    },
    cancelButtonText: {
        fontWeight: "bold",
    },
    createButton: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 8,
        backgroundColor: "#222",
    },
    createButtonText: {
        color: "white",
        fontWeight: "bold",
    },
});