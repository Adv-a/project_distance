import { useState } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    ActivityIndicator,
    StyleSheet,
    Image,
} from "react-native";

import { findUsersByUsername } from "../api/find";
import { logout } from "../api/auth";
import { ConnectedUser, User } from "../types";

type HomeScreenProps = {
    connectedUser: ConnectedUser;
    onLogout: () => void;
};

export function HomeScreen({ connectedUser, onLogout }: HomeScreenProps) {
    const [username, setUsername] = useState("");
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSearch() {
        const cleanUsername = username.trim();

        if (!cleanUsername) {
            setError("Entre un username.");
            setUsers([]);
            return;
        }

        try {
            setLoading(true);
            setError("");
            setUsers([]);

            const result = await findUsersByUsername(cleanUsername);

            if (result.length === 0) {
                setError("Aucun utilisateur trouvé.");
            } else {
                setUsers(result);
            }
        } catch (err) {
            console.error(err);
            setError("Erreur pendant la recherche.");
        } finally {
            setLoading(false);
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
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Recherche utilisateur</Text>
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

            <TextInput
                style={styles.input}
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
            />

            <Pressable style={styles.button} onPress={handleSearch}>
                <Text style={styles.buttonText}>Rechercher</Text>
            </Pressable>

            {loading && <ActivityIndicator style={styles.loader} />}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {users.map((user) => (
                <View key={user.id || user.username} style={styles.card}>
                    {user.profilPicture ? (
                        <Image
                            source={{ uri: user.profilPicture }}
                            style={styles.avatar}
                        />
                    ) : null}

                    <Text style={styles.username}>{user.username}</Text>

                    <Text>ID : {user.id}</Text>

                    <Text>
                        Dernière connexion :{" "}
                        {user.last_login
                            ? user.last_login.toLocaleString()
                            : "Jamais"}
                    </Text>

                    <Text>
                        Créé le :{" "}
                        {user.date_joined
                            ? user.date_joined.toLocaleString()
                            : "Inconnu"}
                    </Text>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
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
    loader: {
        marginTop: 16,
    },
    error: {
        marginTop: 12,
        color: "red",
    },
    card: {
        marginTop: 16,
        padding: 16,
        borderWidth: 1,
        borderRadius: 8,
        gap: 6,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        marginBottom: 8,
    },
    username: {
        fontSize: 18,
        fontWeight: "bold",
    },
});