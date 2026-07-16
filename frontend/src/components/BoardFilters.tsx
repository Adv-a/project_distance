import { useState } from "react";
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { TagValue, Thread } from "../type/objects";

type Props = {
    threads: Thread[];
    selectedThreadId: number | null;
    selectedTags: TagValue[];
    onSelectThread: (threadId: number) => void;
    onToggleTag: (tag: TagValue) => void;
    onClearTags: () => void;
};

const TAG_OPTIONS: TagValue[] = [
    "Message",
    "Idee",
    "Film",
    "Photo",
] as TagValue[];

export function BoardFilters({
    threads,
    selectedThreadId,
    selectedTags,
    onSelectThread,
    onToggleTag,
    onClearTags,
}: Props) {
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const selectedThread = threads.find(
        (thread) => thread.id === selectedThreadId
    );

    return (
        <View style={styles.container}>
            <View style={styles.row}>
                <View style={styles.threadSelector}>
                    <Text style={styles.label}>Thread</Text>

                    <Pressable
                        style={styles.dropdownButton}
                        onPress={() => setDropdownOpen((open) => !open)}
                    >
                        <Text style={styles.dropdownButtonText} numberOfLines={1}>
                            {selectedThread
                                ? selectedThread.name
                                : "Choisir un thread"}
                        </Text>

                        <Text style={styles.dropdownArrow}>
                            {dropdownOpen ? "▲" : "▼"}
                        </Text>
                    </Pressable>

                    {dropdownOpen ? (
                        <View style={styles.dropdownMenu}>
                            {threads.map((thread) => {
                                const selected = thread.id === selectedThreadId;

                                return (
                                    <Pressable
                                        key={thread.id}
                                        style={[
                                            styles.dropdownItem,
                                            selected && styles.dropdownItemSelected,
                                        ]}
                                        onPress={() => {
                                            onSelectThread(thread.id);
                                            setDropdownOpen(false);
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.dropdownItemText,
                                                selected &&
                                                    styles.dropdownItemTextSelected,
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {thread.name}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    ) : null}
                </View>

                <View style={styles.tagsContainer}>
                    <View style={styles.tagsHeader}>
                        <Text style={styles.label}>Tags</Text>

                        {selectedTags.length > 0 ? (
                            <Pressable onPress={onClearTags}>
                                <Text style={styles.clearText}>Réinitialiser</Text>
                            </Pressable>
                        ) : null}
                    </View>

                    <View style={styles.tags}>
                        {TAG_OPTIONS.map((tag) => {
                            const selected = selectedTags.includes(tag);

                            return (
                                <Pressable
                                    key={tag}
                                    style={[
                                        styles.tagButton,
                                        selected && styles.tagButtonSelected,
                                    ]}
                                    onPress={() => onToggleTag(tag)}
                                >
                                    <Text
                                        style={[
                                            styles.tagButtonText,
                                            selected && styles.tagButtonTextSelected,
                                        ]}
                                    >
                                        {tag}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
        marginBottom: 18,
        borderWidth: 1,
        borderColor: "#F1C6A8",
        borderRadius: 20,
        padding: 14,
        backgroundColor: "#FFFFFF",
        zIndex: 20,
    },

    row: {
        flexDirection: "row",
        gap: 14,
        alignItems: "flex-start",
        flexWrap: "wrap",
    },

    threadSelector: {
        width: 260,
        maxWidth: "100%",
        position: "relative",
        zIndex: 30,
    },

    label: {
        marginBottom: 8,
        color: "#5C4033",
        fontSize: 13,
        fontWeight: "800",
    },

    dropdownButton: {
        minHeight: 44,
        borderWidth: 1,
        borderColor: "#F1C6A8",
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 11,
        backgroundColor: "#FFFBF3",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },

    dropdownButtonText: {
        flex: 1,
        color: "#2F241D",
        fontSize: 14,
        fontWeight: "800",
    },

    dropdownArrow: {
        color: "#E76F51",
        fontSize: 12,
        fontWeight: "900",
    },

    dropdownMenu: {
        position: "absolute",
        top: 72,
        left: 0,
        right: 0,
        borderWidth: 1,
        borderColor: "#F1C6A8",
        borderRadius: 14,
        overflow: "hidden",
        backgroundColor: "#FFFFFF",
        zIndex: 50,
    },

    dropdownItem: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F7E1D1",
        backgroundColor: "#FFFFFF",
    },

    dropdownItemSelected: {
        backgroundColor: "#E76F51",
    },

    dropdownItemText: {
        color: "#2F241D",
        fontWeight: "700",
    },

    dropdownItemTextSelected: {
        color: "#FFFFFF",
    },

    tagsContainer: {
        flex: 1,
        minWidth: 260,
    },

    tagsHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    clearText: {
        color: "#B91C1C",
        fontSize: 12,
        fontWeight: "800",
    },

    tags: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },

    tagButton: {
        borderWidth: 1,
        borderColor: "#F1C6A8",
        borderRadius: 999,
        paddingHorizontal: 13,
        paddingVertical: 8,
        backgroundColor: "#FFF7ED",
    },

    tagButtonSelected: {
        borderColor: "#2A9D8F",
        backgroundColor: "#2A9D8F",
    },

    tagButtonText: {
        color: "#5C4033",
        fontSize: 13,
        fontWeight: "800",
    },

    tagButtonTextSelected: {
        color: "#FFFFFF",
    },
});