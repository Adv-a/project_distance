import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

import { createPostOnThread } from "../api/posts";
import { TagValue, Thread } from "../type/objects";

const MAX_UPLOAD_SIZE_MB = 95;
const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
const MAX_MEDIA_FILES = 10;

function getAssetSize(asset: ImagePicker.ImagePickerAsset): number {
    if (typeof asset.fileSize === "number") {
        return asset.fileSize;
    }

    if (asset.file && typeof asset.file.size === "number") {
        return asset.file.size;
    }

    return 0;
}

function formatBytes(bytes: number): string {
    if (bytes <= 0) {
        return "taille inconnue";
    }

    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} Mo`;
}

function getTotalMediaSize(mediaFiles: ImagePicker.ImagePickerAsset[]): number {
    return mediaFiles.reduce((total, media) => {
        return total + getAssetSize(media);
    }, 0);
}

type Props = {
    visible: boolean;
    threads: Thread[];
    onClose: () => void;
    onCreated: () => void | Promise<void>;
};

const TAG_OPTIONS: TagValue[] = [
    "Message",
    "Idee",
    "Film",
    "Photo",
] as TagValue[];

function getTodayInputValue(): string {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function normalizeError(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === "string") {
        return error;
    }

    try {
        return JSON.stringify(error);
    } catch {
        return "Une erreur inconnue est survenue.";
    }
}

export function PostModal({
    visible,
    threads,
    onClose,
    onCreated,
}: Props) {
    const [selectedThreadId, setSelectedThreadId] =
        useState<number | null>(null);

    const [message, setMessage] = useState("");
    const [posted, setPosted] = useState(getTodayInputValue());
    const [selectedTags, setSelectedTags] = useState<TagValue[]>([]);
    const [mediaFiles, setMediaFiles] =
        useState<ImagePicker.ImagePickerAsset[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!visible) {
            return;
        }

        setError(null);

        if (threads.length > 0 && selectedThreadId === null) {
            setSelectedThreadId(threads[0].id);
        }
    }, [visible, threads, selectedThreadId]);

    function resetForm() {
        setSelectedThreadId(threads[0]?.id ?? null);
        setMessage("");
        setSelectedTags([]);
        setMediaFiles([]);
        setPosted(getTodayInputValue());
        setError(null);
    }

    function removeMedia(indexToRemove: number) {
        setMediaFiles((currentFiles) => {
            return currentFiles.filter((_, index) => index !== indexToRemove);
        });
    }

    function handleClose() {
        if (loading) {
            return;
        }

        resetForm();
        onClose();
    }

    function toggleTag(tag: TagValue) {
        setSelectedTags((currentTags) => {
            if (currentTags.includes(tag)) {
                return currentTags.filter(
                    (currentTag) => currentTag !== tag
                );
            }

            return [...currentTags, tag];
        });
    }

    async function pickMedia() {
        try {
            setError(null);

            if (Platform.OS !== "web") {
                const permission =
                    await ImagePicker.requestMediaLibraryPermissionsAsync();

                if (!permission.granted) {
                    setError("L’accès aux photos et vidéos est nécessaire.");
                    return;
                }
            }

            const remainingSlots = MAX_MEDIA_FILES - mediaFiles.length;

            if (remainingSlots <= 0) {
                setError(`Tu peux envoyer maximum ${MAX_MEDIA_FILES} médias par post.`);
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images", "videos"],
                allowsMultipleSelection: true,
                selectionLimit: remainingSlots,
                allowsEditing: false,
                quality: 0.85,
            });

            if (result.canceled || result.assets.length === 0) {
                return;
            }

            const selectedAssets = result.assets;

            if (mediaFiles.length + selectedAssets.length > MAX_MEDIA_FILES) {
                setError(`Tu peux envoyer maximum ${MAX_MEDIA_FILES} médias par post.`);
                return;
            }

            const oversizedFile = selectedAssets.find((asset) => {
                const size = getAssetSize(asset);
                return size > MAX_UPLOAD_SIZE_BYTES;
            });

            if (oversizedFile) {
                setError(
                    `Un fichier est trop lourd : ${formatBytes(
                        getAssetSize(oversizedFile)
                    )}. Limite : ${MAX_UPLOAD_SIZE_MB} Mo par fichier.`
                );
                return;
            }

            const currentSize = getTotalMediaSize(mediaFiles);
            const selectedSize = getTotalMediaSize(selectedAssets);
            const totalSize = currentSize + selectedSize;

            if (totalSize > MAX_UPLOAD_SIZE_BYTES) {
                setError(
                    `Les médias sélectionnés sont trop lourds : ${formatBytes(
                        totalSize
                    )}. Limite totale : ${MAX_UPLOAD_SIZE_MB} Mo.`
                );
                return;
            }

            setMediaFiles((currentFiles) => [
                ...currentFiles,
                ...selectedAssets,
            ]);
        } catch (pickError) {
            setError(normalizeError(pickError));
        }
    }

    async function handleSubmit() {
        if (selectedThreadId === null) {
            setError("Choisis un thread.");
            return;
        }

        if (!message.trim() && mediaFiles.length === 0) {
            setError("Ajoute au moins un message, une image ou une vidéo.");
            return;
        }

        if (
            posted.trim() &&
            !/^\d{4}-\d{2}-\d{2}$/.test(posted.trim())
        ) {
            setError(
                "La date doit être au format AAAA-MM-JJ, par exemple 2026-07-10."
            );
            return;
        }

        const totalSize = getTotalMediaSize(mediaFiles);

        if (totalSize > MAX_UPLOAD_SIZE_BYTES) {
            setError(
                `Les médias sélectionnés sont trop lourds : ${formatBytes(totalSize)}. Limite totale : ${MAX_UPLOAD_SIZE_MB} Mo.`
            );
            return;
        }
        try {
            setLoading(true);
            setError(null);

            await createPostOnThread(
                selectedThreadId,
                message.trim(),
                selectedTags,
                posted.trim(),
                mediaFiles
            );

            resetForm();
            await onCreated();
            onClose();
        } catch (submitError) {
            setError(normalizeError(submitError));
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <ScrollView
                        contentContainerStyle={styles.content}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <Text style={styles.title}>Nouveau post</Text>

                        <Text style={styles.subtitle}>
                            Choisis un thread et ajoute une inspiration.
                        </Text>

                        <Text style={styles.label}>Thread</Text>

                        <View style={styles.threadList}>
                            {threads.map((thread) => {
                                const selected =
                                    selectedThreadId === thread.id;

                                return (
                                    <Pressable
                                        key={thread.id}
                                        style={[
                                            styles.threadOption,
                                            selected &&
                                                styles.threadOptionSelected,
                                        ]}
                                        onPress={() =>
                                            setSelectedThreadId(thread.id)
                                        }
                                    >
                                        <Text
                                            style={[
                                                styles.threadOptionText,
                                                selected &&
                                                    styles.threadOptionTextSelected,
                                            ]}
                                        >
                                            {String(thread.name ?? "")}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        {threads.length === 0 ? (
                            <Text style={styles.helper}>
                                Tu ne fais encore partie d’aucun thread.
                            </Text>
                        ) : null}

                        <Text style={styles.label}>Message</Text>

                        <TextInput
                            style={[styles.input, styles.messageInput]}
                            placeholder="Écris ton message..."
                            placeholderTextColor="#A68A78"
                            value={message}
                            onChangeText={setMessage}
                            multiline
                            maxLength={2000}
                            textAlignVertical="top"
                        />

                        <Text style={styles.label}>Date du post</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="AAAA-MM-JJ"
                            placeholderTextColor="#A68A78"
                            value={posted}
                            onChangeText={setPosted}
                            autoCapitalize="none"
                        />

                        <Text style={styles.helper}>
                            Exemple : 2026-07-10
                        </Text>

                        <Text style={styles.label}>Tags</Text>

                        <View style={styles.tags}>
                            {TAG_OPTIONS.map((tag) => {
                                const selected =
                                    selectedTags.includes(tag);

                                return (
                                    <Pressable
                                        key={tag}
                                        style={[
                                            styles.tag,
                                            selected && styles.tagSelected,
                                        ]}
                                        onPress={() => toggleTag(tag)}
                                    >
                                        <Text
                                            style={[
                                                styles.tagText,
                                                selected &&
                                                    styles.tagTextSelected,
                                            ]}
                                        >
                                            {String(tag)}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        <Text style={styles.label}>Images ou vidéos</Text>

                        <Pressable
                            style={styles.mediaButton}
                            onPress={pickMedia}
                            disabled={loading}
                        >
                            <Text style={styles.mediaButtonText}>
                                {mediaFiles.length > 0
                                    ? "Ajouter d’autres images ou vidéos"
                                    : "Choisir des images ou vidéos"}
                            </Text>
                        </Pressable>
                        <Text style={styles.helper}>
                            {mediaFiles.length} / {MAX_MEDIA_FILES} médias sélectionnés. Maximum {MAX_UPLOAD_SIZE_MB} Mo au total.
                        </Text>

                            {mediaFiles.length > 0 ? (
                                <View style={styles.mediaGrid}>
                                    {mediaFiles.map((media, index) => (
                                        <View
                                            key={`${media.uri}-${index}`}
                                            style={styles.mediaPreviewCard}
                                        >
                                            {media.type === "image" ? (
                                                <Image
                                                    source={{ uri: media.uri }}
                                                    style={styles.mediaThumb}
                                                    resizeMode="cover"
                                                />
                                            ) : (
                                                <View style={styles.videoThumb}>
                                                    <Text style={styles.videoIcon}>
                                                        ▶
                                                    </Text>
                                                </View>
                                            )}

                                            <Text style={styles.mediaIndex}>
                                                {index + 1}
                                            </Text>

                                            <Pressable
                                                style={styles.deleteMediaButton}
                                                onPress={() => removeMedia(index)}
                                                disabled={loading}
                                            >
                                                <Text style={styles.deleteMediaText}>
                                                    ×
                                                </Text>
                                            </Pressable>
                                        </View>
                                    ))}
                            </View>
                        ) : null}

                        {mediaFiles.length > 0 ? (
                            <Pressable
                                onPress={() => setMediaFiles([])}
                                disabled={loading}
                            >
                                <Text style={styles.removeMedia}>
                                    Retirer les médias
                                </Text>
                            </Pressable>
                        ) : null}

                        {error ? (
                            <Text style={styles.error}>{String(error)}</Text>
                        ) : null}

                        <View style={styles.actions}>
                            <Pressable
                                style={styles.cancelButton}
                                onPress={handleClose}
                                disabled={loading}
                            >
                                <Text style={styles.cancelText}>
                                    Annuler
                                </Text>
                            </Pressable>

                            <Pressable
                                style={[
                                    styles.submitButton,
                                    (loading || threads.length === 0) &&
                                        styles.buttonDisabled,
                                ]}
                                onPress={handleSubmit}
                                disabled={loading || threads.length === 0}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.submitText}>
                                        Créer
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(47, 36, 29, 0.55)",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
    },

    modal: {
        width: "100%",
        maxWidth: 620,
        maxHeight: "92%",
        borderRadius: 24,
        backgroundColor: "#FFFFFF",
        overflow: "hidden",
    },

    content: {
        padding: 26,
    },

    title: {
        fontSize: 28,
        fontWeight: "800",
        color: "#2F241D",
    },

    subtitle: {
        marginTop: 8,
        marginBottom: 24,
        fontSize: 15,
        lineHeight: 22,
        color: "#8A6F5A",
    },

    label: {
        marginTop: 16,
        marginBottom: 9,
        fontSize: 14,
        fontWeight: "800",
        color: "#5C4033",
    },

    helper: {
        marginTop: 5,
        fontSize: 12,
        color: "#8A6F5A",
    },

    threadList: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },

    threadOption: {
        borderWidth: 1,
        borderColor: "#F1C6A8",
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 9,
        backgroundColor: "#FFFBF3",
    },

    threadOptionSelected: {
        borderColor: "#E76F51",
        backgroundColor: "#E76F51",
    },

    threadOptionText: {
        color: "#5C4033",
        fontWeight: "700",
    },

    threadOptionTextSelected: {
        color: "#FFFFFF",
    },

    input: {
        width: "100%",
        borderWidth: 1,
        borderColor: "#F1C6A8",
        borderRadius: 14,
        paddingHorizontal: 15,
        paddingVertical: 13,
        backgroundColor: "#FFFBF3",
        color: "#2F241D",
        fontSize: 15,
    },

    messageInput: {
        minHeight: 120,
    },

    tags: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },

    tag: {
        borderWidth: 1,
        borderColor: "#F1C6A8",
        borderRadius: 999,
        paddingHorizontal: 13,
        paddingVertical: 8,
        backgroundColor: "#FFFFFF",
    },

    tagSelected: {
        borderColor: "#2A9D8F",
        backgroundColor: "#2A9D8F",
    },

    tagText: {
        color: "#5C4033",
        fontWeight: "700",
    },

    tagTextSelected: {
        color: "#FFFFFF",
    },

    mediaButton: {
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: "#E76F51",
        borderRadius: 16,
        paddingHorizontal: 18,
        paddingVertical: 16,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFF7ED",
    },

    mediaButtonText: {
        color: "#E76F51",
        fontSize: 15,
        fontWeight: "800",
    },

    mediaGrid: {
        marginTop: 12,
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },

    mediaPreviewCard: {
        width: 92,
        height: 92,
        borderRadius: 14,
        overflow: "hidden",
        position: "relative",
        backgroundColor: "#F5E7DB",
    },

    mediaThumb: {
        width: "100%",
        height: "100%",
    },

    videoThumb: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#2F241D",
    },

    videoIcon: {
        color: "#FFFFFF",
        fontSize: 24,
        fontWeight: "800",
    },

    mediaIndex: {
        position: "absolute",
        top: 6,
        right: 6,
        width: 22,
        height: 22,
        borderRadius: 11,
        overflow: "hidden",
        textAlign: "center",
        lineHeight: 22,
        backgroundColor: "#E76F51",
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: "800",
    },

    removeMedia: {
        marginTop: 10,
        color: "#B91C1C",
        fontWeight: "800",
    },

    error: {
        marginTop: 16,
        borderRadius: 12,
        padding: 12,
        backgroundColor: "#FDECEC",
        color: "#B91C1C",
        fontWeight: "700",
    },

    actions: {
        marginTop: 26,
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 10,
    },

    cancelButton: {
        minWidth: 110,
        borderWidth: 1,
        borderColor: "#F1C6A8",
        borderRadius: 14,
        paddingHorizontal: 18,
        paddingVertical: 13,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFFFFF",
    },

    cancelText: {
        color: "#5C4033",
        fontWeight: "800",
    },

    submitButton: {
        minWidth: 130,
        borderRadius: 14,
        paddingHorizontal: 18,
        paddingVertical: 13,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#E76F51",
    },

    submitText: {
        color: "#FFFFFF",
        fontWeight: "800",
    },

    buttonDisabled: {
        opacity: 0.55,
    },

    deleteMediaButton: {
        position: "absolute",
        top: 6,
        left: 6,
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#B91C1C",
    },

    deleteMediaText: {
        color: "#FFFFFF",
        fontSize: 18,
        lineHeight: 21,
        fontWeight: "900",
    },
});