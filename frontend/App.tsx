import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { LoginScreen } from "./src/screens/LoginScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { getMe } from "./src/api/auth";
import { ConnectedUser } from "./types";

export default function App() {
    const [user, setUser] = useState<ConnectedUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function restoreSession() {
            try {
                const me = await getMe();
                setUser(me);
            } catch {
                setUser(null);
            } finally {
                setLoading(false);
            }
        }

        restoreSession();
    }, []);

    function handleLogout() {
        setUser(null);
    }

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: "center" }}>
                <ActivityIndicator />
            </View>
        );
    }

    if (!user) {
        return <LoginScreen onLogin={setUser} />;
    }

    return <HomeScreen connectedUser={user} onLogout={handleLogout} />;
}