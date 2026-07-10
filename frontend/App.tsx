import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { getMe } from "./src/api/auth";
import { ConnectedUser } from "./src/types";
import { LoginScreen } from "./src/screens/LoginScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { ChangePasswordScreen } from "./src/screens/ChangePasswordScreen";

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

    if (loading) {
        return (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator />
            </View>
        );
    }

    if (!user) {
        return <LoginScreen onLogin={setUser} />;
    }

    if (user.must_change_password) {
        return <ChangePasswordScreen onPasswordChanged={setUser} />;
    }

    return (
        <HomeScreen
            connectedUser={user}
            onLogout={() => setUser(null)}
        />
    );
}