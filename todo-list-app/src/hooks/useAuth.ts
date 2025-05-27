import { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { User } from '../types/models';

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
        setUser({
            id: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
        });
        } else {
        setUser(null);
        }
        setLoading(false);
    });

    return () => unsubscribe();
    }, []);

    return { user, loading };
};
