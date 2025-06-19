import React, { useState, useEffect } from 'react';
import { getActiveStockTakeSession } from '../firestoreAPI';

export const SessionScreen = ({ onStartNew, onContinue }) => {
    const [loading, setLoading] = useState(true);
    const [activeSession, setActiveSession] = useState(null);

    useEffect(() => {
        const checkSession = async () => {
            setLoading(true);
            try {
                const session = await getActiveStockTakeSession();
                setActiveSession(session);
            } catch (error) {
                console.error("Error checking for active session:", error);
            } finally {
                setLoading(false);
            }
        };
        checkSession();
    }, []);

    if (loading) {
        return <h2 style={{ color: 'white', marginTop: '4rem', textAlign: 'center' }}>Checking for active session...</h2>;
    }

    return (
        <div style={{ marginTop: '4rem', textAlign: 'center' }}>
            {activeSession ? (
                <div>
                    <p style={{ color: '#9ca3af' }}>A stock take started on {activeSession.startedAt?.toDate().toLocaleDateString()} is in progress.</p>
                    <button className="button" style={{ padding: '1.5rem', fontSize: '1.5rem', marginTop: '1rem' }} onClick={() => onContinue(activeSession.id)}>
                        Continue Stock Take
                    </button>
                </div>
            ) : (
                <button className="button" style={{ padding: '1.5rem', fontSize: '1.5rem' }} onClick={onStartNew}>
                    Start New Stock Take
                </button>
            )}
        </div>
    );
};