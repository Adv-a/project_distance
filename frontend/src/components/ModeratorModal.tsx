import { useState } from "react";
import {
    Modal,
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    ScrollView,
} from "react-native";

import {
    createThreadByModerator,
    createUserByModerator,
    findUsersBySearch,
    resetUserPassword,
} from "../api/moderator";
import { User } from "../type/objects";
import { colors } from "../theme";

type ModeratorModalProps = {
    visible: boolean;
    onClose: () => void;
    onChanged: () => Promise<void>;
};

export function ModeratorModal({
    visible,
    onClose,
    onChanged,
}: ModeratorModalProps) {
    const [newUsername, setNewUsername] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [temporaryPassword, setTemporaryPassword] = useState("");

    const [threadName, setThreadName] = useState("");
    const [userSearch, setUserSearch] = useState("");
    const [foundUsers, setFoundUsers] = useState<User[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

    const [resetSearch, setResetSearch] = useState("");
    const [resetUsers, setResetUsers] = useState<User[]>([]);
    const [resetPasswordResult, setResetPasswordResult] = useState("");

    const [error, setError] = useState("");

    function toggleSelectedUser(id: number) {
        setSelectedUserIds((current) =>
            current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id]
        );
    }

    async function handleCreateUser() {
        try {
            setError("");
            setTemporaryPassword("");

            const result = await createUserByModerator(
                newUsername.trim(),
                newEmail.trim()
            );

            setTemporaryPassword(result.temporary_password);
            setNewUsername("");
            setNewEmail("");
        } catch (err) {
            console.error(err);
            setError("Impossible de créer le user.");
        }
    }

    async function handleSearchUsers() {
        try {
            setError("");
            const result = await findUsersBySearch(userSearch.trim());
            setFoundUsers(result);
        } catch (err) {
            console.error(err);
            setError("Recherche impossible.");
        }
    }

    async function handleCreateThread() {
        try {
            setError("");

            await createThreadByModerator(threadName.trim(), selectedUserIds);

            setThreadName("");
            setUserSearch("");
            setFoundUsers([]);
            setSelectedUserIds([]);

            await onChanged();
        } catch (err) {
            console.error(err);
            setError("Impossible de créer le thread.");
        }
    }

    async function handleSearchResetUsers() {
        try {
            setError("");
            const result = await findUsersBySearch(resetSearch.trim());
            setResetUsers(result);
        } catch (err) {
            console.error(err);
            setError("Recherche impossible.");
        }
    }

    async function handleResetPassword(userId: number) {
        try {
            setError("");
            setResetPasswordResult("");

            const result = await resetUserPassword(userId);
            setResetPasswordResult(
                `${result.username} → ${result.temporary_password}`
            );
        } catch (err) {
            console.error(err);
            setError("Impossible de reset le mot de passe.");
        }
    }

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <ScrollView contentContainerStyle={styles.card}>
                    <Text style={styles.title}>Espace modérateur</Text>
                    <Text style={styles.subtitle}>
                        Création d’utilisateurs, threads et mots de passe temporaires.
                    </Text>

                    {error ? (
                        <Text style={styles.error}>
                            {error instanceof Error
                                ? error.message
                                : typeof error === "string"
                                    ? error
                                    : JSON.stringify(error)}
                        </Text>
                    ) : null}

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Créer un user</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Username"
                            value={newUsername}
                            onChangeText={setNewUsername}
                            autoCapitalize="none"
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            value={newEmail}
                            onChangeText={setNewEmail}
                            autoCapitalize="none"
                        />

                        <Pressable
                            style={styles.primaryButton}
                            onPress={handleCreateUser}
                        >
                            <Text style={styles.primaryButtonText}>
                                Créer le user
                            </Text>
                        </Pressable>

                        {temporaryPassword ? (
                            <View style={styles.passwordBox}>
                                <Text style={styles.passwordLabel}>
                                    Mot de passe temporaire :
                                </Text>
                                <Text style={styles.passwordValue}>
                                    {temporaryPassword}
                                </Text>
                                <Text style={styles.passwordHelp}>
                                    À donner au user maintenant. Il devra le changer
                                    à la prochaine connexion.
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Créer un thread</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Nom du thread"
                            value={threadName}
                            onChangeText={setThreadName}
                        />

                        <View style={styles.searchRow}>
                            <TextInput
                                style={[styles.input, styles.searchInput]}
                                placeholder="Chercher un user"
                                value={userSearch}
                                onChangeText={setUserSearch}
                                autoCapitalize="none"
                            />

                            <Pressable
                                style={styles.smallButton}
                                onPress={handleSearchUsers}
                            >
                                <Text style={styles.smallButtonText}>OK</Text>
                            </Pressable>
                        </View>

                        {foundUsers.map((user) => {
                            const selected = selectedUserIds.includes(user.id);

                            return (
                                <Pressable
                                    key={user.id}
                                    style={[
                                        styles.userOption,
                                        selected && styles.userOptionSelected,
                                    ]}
                                    onPress={() => toggleSelectedUser(user.id)}
                                >
                                    <Text
                                        style={[
                                            styles.userOptionText,
                                            selected && styles.userOptionTextSelected,
                                        ]}
                                    >
                                        {user.username}
                                    </Text>
                                </Pressable>
                            );
                        })}

                        <Pressable
                            style={styles.primaryButton}
                            onPress={handleCreateThread}
                        >
                            <Text style={styles.primaryButtonText}>
                                Créer le thread
                            </Text>
                        </Pressable>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            Reset mot de passe
                        </Text>

                        <View style={styles.searchRow}>
                            <TextInput
                                style={[styles.input, styles.searchInput]}
                                placeholder="Chercher un user"
                                value={resetSearch}
                                onChangeText={setResetSearch}
                                autoCapitalize="none"
                            />

                            <Pressable
                                style={styles.smallButton}
                                onPress={handleSearchResetUsers}
                            >
                                <Text style={styles.smallButtonText}>OK</Text>
                            </Pressable>
                        </View>

                        {resetUsers.map((user) => (
                            <View key={user.id} style={styles.resetRow}>
                                <Text style={styles.resetUsername}>
                                    {user.username}
                                </Text>

                                <Pressable
                                    style={styles.resetButton}
                                    onPress={() => handleResetPassword(user.id)}
                                >
                                    <Text style={styles.resetButtonText}>
                                        Reset
                                    </Text>
                                </Pressable>
                            </View>
                        ))}

                        {resetPasswordResult ? (
                            <View style={styles.passwordBox}>
                                <Text style={styles.passwordLabel}>
                                    Nouveau mot de passe temporaire :
                                </Text>
                                <Text style={styles.passwordValue}>
                                    {resetPasswordResult}
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    <Pressable style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeText}>Fermer</Text>
                    </Pressable>
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(47, 36, 29, 0.45)",
        padding: 20,
    },
    card: {
        backgroundColor: colors.cream,
        borderRadius: 28,
        padding: 22,
        gap: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    title: {
        fontSize: 26,
        fontWeight: "900",
        color: colors.brown,
    },
    subtitle: {
        color: colors.muted,
    },
    section: {
        backgroundColor: colors.surface,
        borderRadius: 22,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 10,
    },
    sectionTitle: {
        fontSize: 19,
        fontWeight: "900",
        color: colors.brown,
    },
    input: {
        backgroundColor: colors.cream,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 12,
    },
    searchRow: {
        flexDirection: "row",
        gap: 8,
    },
    searchInput: {
        flex: 1,
    },
    primaryButton: {
        backgroundColor: colors.primary,
        padding: 13,
        borderRadius: 16,
        alignItems: "center",
    },
    primaryButtonText: {
        color: "white",
        fontWeight: "900",
    },
    smallButton: {
        backgroundColor: colors.secondary,
        borderRadius: 14,
        paddingHorizontal: 16,
        justifyContent: "center",
    },
    smallButtonText: {
        color: "white",
        fontWeight: "900",
    },
    userOption: {
        padding: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
    },
    userOptionSelected: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    userOptionText: {
        color: colors.text,
        fontWeight: "800",
    },
    userOptionTextSelected: {
        color: "white",
    },
    resetRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        padding: 10,
    },
    resetUsername: {
        fontWeight: "800",
        color: colors.text,
    },
    resetButton: {
        backgroundColor: colors.danger,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    resetButtonText: {
        color: "white",
        fontWeight: "900",
    },
    passwordBox: {
        backgroundColor: colors.surfaceWarm,
        borderRadius: 16,
        padding: 12,
        gap: 4,
    },
    passwordLabel: {
        fontWeight: "800",
        color: colors.brown,
    },
    passwordValue: {
        fontSize: 18,
        fontWeight: "900",
        color: colors.primaryDark,
    },
    passwordHelp: {
        color: colors.muted,
        fontSize: 12,
    },
    error: {
        color: colors.danger,
        fontWeight: "800",
    },
    closeButton: {
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
        borderRadius: 16,
        alignItems: "center",
    },
    closeText: {
        fontWeight: "900",
        color: colors.brown,
    },
});