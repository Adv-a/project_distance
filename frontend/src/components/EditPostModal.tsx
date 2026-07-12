import { useEffect, useMemo, useState } from "react";
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

import { updatePost } from "../api/posts";
import { Post, PostMedia, TagValue } from "../type/objects";

type Props = {
    visible: boolean;
    post: Post | null;
    onClose: () => void;
    onUpdated: () => void | Promise<void>;
};

const TAG_OPTIONS: TagValue[] = [
    "Message",
    "Idee",
    "Film",
    "Photo",
] as TagValue[];

const MAX_UPLOAD_SIZE_MB = 95;
const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
const MAX_MEDIA_FILES = 10;

function normalizeError(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;

    try {
        return JSON.stringify(error);
    } catch {
        return "Une erreur inconnue est survenue.";
    }
}

function dateToInputValue(date: Date | null): string {
    if (!date || Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getMediaUrl(value: string | null | undefined): string {
    if (!value) return "";

    if (
        value.startsWith("http://") ||
        value.startsWith("https://")
    ) {
        return value;
    }

    const cleanValue = value.startsWith("/") ? value : `/${value}`;

    if (typeof window !== "undefined") {
        return `${window.location.origin}${cleanValue}`;
    }

    const backendUrl = process.env.EXPO_PUBLIC_API_URL ?? "";
    return `${backendUrl}${cleanValue}`;
}

function getAssetSize(asset: ImagePicker.ImagePickerAsset): number {
    if (typeof asset.fileSize === "number") return asset.fileSize;

    if (asset.file && typeof asset.file.size === "number") {
        return asset.file.size;
    }

    return 0;
}

function formatBytes(bytes: number): string {
    if (bytes <= 0) return "taille inconnue";

    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} Mo`;
}

function getTotalMediaSize(mediaFiles: ImagePicker.ImagePickerAsset[]): number {
    return mediaFiles.reduce((total, media) => {
        return total + getAssetSize(media);
    }, 0);
}

export function EditPostModal({
    visible,
    post,
    onClose,
    onUpdated,
}: Props) {
    const [message, setMessage] = useState("");
    const [posted, setPosted] = useState("");
    const [selectedTags, setSelectedTags] = useState<TagValue[]>([]);

    const [newMediaFiles, setNewMediaFiles] =
        useState<ImagePicker.ImagePickerAsset[]>([]);

    const [deleteMediaIds, setDeleteMediaIds] = useState<number[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const existingMedia = useMemo<PostMedia[]>(() => {
        if (!post || !Array.isArray(post.media)) {
            return [];
        }

        return post.media.filter((media) => {
            return !deleteMediaIds.includes(media.id);
        });
    }, [post, deleteMediaIds]);

    const totalMediaCount = existingMedia.length + newMediaFiles.length;

    useEffect(() => {
        if (!visible || !post) return;

        setMessage(post.message ?? "");
        setPosted(dateToInputValue(post.posted));
        setSelectedTags(post.tags ?? []);
        setNewMediaFiles([]);
        setDeleteMediaIds([]);
        setError(null);
    }, [visible, post]);

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

    function toggleDeleteExistingMedia(mediaId: number) {
        setDeleteMediaIds((currentIds) => {
            if (currentIds.includes(mediaId)) {
                return currentIds.filter((id) => id !== mediaId);
            }

            return [...currentIds, mediaId];
        });
    }

    function removeNewMedia(indexToRemove: number) {
        setNewMediaFiles((currentFiles) => {
            return currentFiles.filter((_, index) => index !== indexToRemove);
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

            const remainingSlots = MAX_MEDIA_FILES - existingMedia.length;

            if (remainingSlots <= 0) {
                setError(`Tu peux avoir maximum ${MAX_MEDIA_FILES} médias par post.`);
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

            if (newMediaFiles.length + selectedAssets.length > remainingSlots) {
                setError(`Tu peux ajouter encore ${remainingSlots} média(s) maximum.`);
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

            const currentNewSize = getTotalMediaSize(newMediaFiles);
            const selectedSize = getTotalMediaSize(selectedAssets);
            const totalSize = currentNewSize + selectedSize;

            if (totalSize > MAX_UPLOAD_SIZE_BYTES) {
                setError(
                    `Les nouveaux médias sont trop lourds : ${formatBytes(
                        totalSize
                    )}. Limite : ${MAX_UPLOAD_SIZE_MB} Mo.`
                );
                return;
            }

            setNewMediaFiles((currentFiles) => [
                ...currentFiles,
                ...selectedAssets,
            ]);
        } catch (pickError) {
            setError(normalizeError(pickError));
        }
    }

    async function handleSubmit() {
        if (!post) return;

        if (!message.trim() && totalMediaCount === 0) {
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

        const totalNewSize = getTotalMediaSize(newMediaFiles);

        if (totalNewSize > MAX_UPLOAD_SIZE_BYTES) {
            setError(
                `Les nouveaux médias sont trop lourds : ${formatBytes(
                    totalNewSize
                )}. Limite : ${MAX_UPLOAD_SIZE_MB} Mo.`
            );
            return;
        }

        try {
            setLoading(true);
            setError(null);

            await updatePost(
                post.id,
                message.trim(),
                selectedTags,
                posted.trim(),
                newMediaFiles,
                deleteMediaIds
            );

            await onUpdated();
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
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <ScrollView
                        contentContainerStyle={styles.content}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <Text style={styles.title}>Modifier le post</Text>

                        <Text style={styles.subtitle}>
                            Tu peux modifier le message, la date, les tags et les médias.
                        </Text>

                        <Text style={styles.label}>Message</Text>

                        <TextInput
                            style={[styles.input, styles.messageInput]}
                            placeholder="Message..."
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

                        <Text style={styles.label}>Médias existants</Text>

                        {post?.media && post.media.length > 0 ? (
                            <View style={styles.mediaGrid}>
                                {post.media.map((media) => {
                                    const deleted =
                                        deleteMediaIds.includes(media.id);

                                    return (
                                        <View
                                            key={media.id}
                                            style={[
                                                styles.mediaPreviewCard,
                                                deleted && styles.mediaDeleted,
                                            ]}
                                        >
                                            {media.media_type === "image" ? (
                                                <Image
                                                    source={{
                                                        uri: getMediaUrl(media.file),
                                                    }}
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

                                            <Pressable
                                                style={[
                                                    styles.deleteMediaButton,
                                                    deleted &&
                                                        styles.restoreMediaButton,
                                                ]}
                                                onPress={() =>
                                                    toggleDeleteExistingMedia(media.id)
                                                }
                                                disabled={loading}
                                            >
                                                <Text style={styles.deleteMediaText}>
                                                    {deleted ? "↺" : "×"}
                                                </Text>
                                            </Pressable>

                                            {deleted ? (
                                                <View style={styles.deletedOverlay}>
                                                    <Text style={styles.deletedText}>
                                                        Supprimé
                                                    </Text>
                                                </View>
                                            ) : null}
                                        </View>
                                    );
                                })}
                            </View>
                        ) : (
                            <Text style={styles.helper}>
                                Aucun média existant.
                            </Text>
                        )}

                        <Text style={styles.label}>Ajouter des médias</Text>

                        <Pressable
                            style={[
                                styles.mediaButton,
                                totalMediaCount >= MAX_MEDIA_FILES &&
                                    styles.buttonDisabled,
                            ]}
                            onPress={pickMedia}
                            disabled={
                                loading || totalMediaCount >= MAX_MEDIA_FILES
                            }
                        >
                            <Text style={styles.mediaButtonText}>
                                Ajouter des images ou vidéos
                            </Text>
                        </Pressable>

                        <Text style={styles.helper}>
                            {totalMediaCount} / {MAX_MEDIA_FILES} médias. Maximum{" "}
                            {MAX_UPLOAD_SIZE_MB} Mo pour les nouveaux fichiers.
                        </Text>

                        {newMediaFiles.length > 0 ? (
                            <View style={styles.mediaGrid}>
                                {newMediaFiles.map((media, index) => (
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

                                        <Pressable
                                            style={styles.deleteMediaButton}
                                            onPress={() => removeNewMedia(index)}
                                            disabled={loading}
                                        >
                                            <Text style={styles.deleteMediaText}>
                                                ×
                                            </Text>
                                        </Pressable>

                                        <Text style={styles.newMediaBadge}>
                                            nouveau
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        ) : null}

                        {error ? (
                            <Text style={styles.error}>{String(error)}</Text>
                        ) : null}

                        <View style={styles.actions}>
                            <Pressable
                                style={styles.cancelButton}
                                onPress={onClose}
                                disabled={loading}
                            >
                                <Text style={styles.cancelText}>Annuler</Text>
                            </Pressable>

                            <Pressable
                                style={[
                                    styles.submitButton,
                                    loading && styles.buttonDisabled,
                                ]}
                                onPress={handleSubmit}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.submitText}>
                                        Enregistrer
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
        marginTop: 7,
        fontSize: 12,
        color: "#8A6F5A",
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
        width: 104,
        height: 104,
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

    deleteMediaButton: {
        position: "absolute",
        top: 6,
        right: 6,
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#B91C1C",
    },

    restoreMediaButton: {
        backgroundColor: "#2A9D8F",
    },

    deleteMediaText: {
        color: "#FFFFFF",
        fontSize: 18,
        lineHeight: 21,
        fontWeight: "900",
    },

    mediaDeleted: {
        opacity: 0.65,
    },

    deletedOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(47, 36, 29, 0.55)",
    },

    deletedText: {
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: "900",
    },

    newMediaBadge: {
        position: "absolute",
        left: 6,
        bottom: 6,
        borderRadius: 999,
        overflow: "hidden",
        paddingHorizontal: 7,
        paddingVertical: 3,
        backgroundColor: "#2A9D8F",
        color: "#FFFFFF",
        fontSize: 10,
        fontWeight: "900",
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
});