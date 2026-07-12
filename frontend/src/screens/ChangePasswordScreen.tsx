import { useState } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
} from "react-native";

import { changePassword } from "../api/auth";
import { ConnectedUser } from "../type/objects";

type Props = {
    onPasswordChanged: (user: ConnectedUser) => void;
};

export function ChangePasswordScreen({ onPasswordChanged }: Props) {
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit() {
        if (!oldPassword || !newPassword || !confirmPassword) {
            setError("Tous les champs sont obligatoires.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Les deux nouveaux mots de passe ne correspondent pas.");
            return;
        }

        if (newPassword.length < 8) {
            setError("Le nouveau mot de passe doit faire au moins 8 caractères.");
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const updatedUser = await changePassword(oldPassword, newPassword);
            onPasswordChanged(updatedUser);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Erreur lors du changement de mot de passe."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <View style={styles.page}>
            <View style={styles.card}>
                <Text style={styles.title}>Change ton mot de passe</Text>

                <Text style={styles.subtitle}>
                    Tu utilises actuellement un mot de passe temporaire. Tu dois définir ton propre mot de passe avant d’accéder à l’application.
                </Text>

                <TextInput
                    style={styles.input}
                    placeholder="Mot de passe temporaire"
                    secureTextEntry
                    value={oldPassword}
                    onChangeText={setOldPassword}
                />

                <TextInput
                    style={styles.input}
                    placeholder="Nouveau mot de passe"
                    secureTextEntry
                    value={newPassword}
                    onChangeText={setNewPassword}
                />

                <TextInput
                    style={styles.input}
                    placeholder="Confirmer le nouveau mot de passe"
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                />

                {error ? (
                    <Text style={styles.error}>
                        {error instanceof Error
                            ? error.message
                            : typeof error === "string"
                                ? error
                                : JSON.stringify(error)}
                    </Text>
                ) : null}

                <Pressable
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? "Modification..." : "Valider mon nouveau mot de passe"}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        minHeight: "100%",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        backgroundColor: "#FFF7ED",
    },
    card: {
        width: "100%",
        maxWidth: 460,
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        padding: 28,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
    },
    title: {
        fontSize: 28,
        fontWeight: "800",
        color: "#2F241D",
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 15,
        color: "#8A6F5A",
        lineHeight: 22,
        marginBottom: 24,
    },
    input: {
        borderWidth: 1,
        borderColor: "#F1C6A8",
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        marginBottom: 12,
        backgroundColor: "#FFFBF3",
    },
    error: {
        color: "#B91C1C",
        marginBottom: 12,
        fontWeight: "600",
    },
    button: {
        backgroundColor: "#E76F51",
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: "center",
        marginTop: 8,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: "#FFFFFF",
        fontWeight: "800",
        fontSize: 16,
    },
});