import { useState } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    ActivityIndicator,
} from "react-native";

import { login } from "../api/auth";
import { ConnectedUser } from "../types";

type LoginScreenProps = {
    onLogin: (user: ConnectedUser) => void;
};

export function LoginScreen({ onLogin }: LoginScreenProps) {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleLogin() {
        const cleanIdentifier = identifier.trim();

        if (!cleanIdentifier || !password) {
            setError("Entre ton username/email et ton mot de passe.");
            return;
        }

        try {
            setLoading(true);
            setError("");

            const user = await login(cleanIdentifier, password);

            onLogin(user);
        } catch (err) {
            console.error(err);
            setError("Identifiants invalides ou erreur serveur.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Connexion</Text>

            <TextInput
                style={styles.input}
                placeholder="Username ou email"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                autoCorrect={false}
            />

            <TextInput
                style={styles.input}
                placeholder="Mot de passe"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
                style={styles.button}
                onPress={handleLogin}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator />
                ) : (
                    <Text style={styles.buttonText}>Se connecter</Text>
                )}
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        justifyContent: "center",
        gap: 12,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 16,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    button: {
        padding: 14,
        borderRadius: 8,
        alignItems: "center",
        backgroundColor: "#222",
        marginTop: 8,
    },
    buttonText: {
        color: "white",
        fontWeight: "bold",
    },
    error: {
        color: "red",
    },
});