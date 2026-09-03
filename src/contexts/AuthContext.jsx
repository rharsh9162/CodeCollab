import { createContext, useContext, useMemo } from 'react';
import { useUser, useClerk } from '@clerk/react';

const AuthContext = createContext(null);

function getConsistentColor(str = '') {
    const colors = [
        '#2563EB', '#06B6D4', '#10B981', '#F59E0B', 
        '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}

export function AuthProvider({ children }) {
    const { isLoaded, isSignedIn, user: clerkUser } = useUser();
    const { signOut: clerkSignOut } = useClerk();

    const user = useMemo(() => {
        if (!isLoaded || !isSignedIn || !clerkUser) return null;
        const email = clerkUser.primaryEmailAddress?.emailAddress || '';
        const displayName = clerkUser.fullName || clerkUser.firstName || clerkUser.username || (email ? email.split('@')[0] : 'User');
        return {
            uid: clerkUser.id,
            email,
            displayName,
            photoURL: clerkUser.imageUrl || null,
            userColor: getConsistentColor(clerkUser.id),
        };
    }, [isLoaded, isSignedIn, clerkUser]);

    const signOut = async () => {
        try {
            await clerkSignOut();
        } catch (err) {
            console.error('Clerk signOut error:', err);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading: !isLoaded, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}
