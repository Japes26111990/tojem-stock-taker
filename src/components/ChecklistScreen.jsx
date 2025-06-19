import React, { useState, useEffect, useMemo } from 'react';
import { getAllInventoryItems, finishStockTakeSession } from '../firestoreAPI';
import { Search, Hash, Scale, Check, ScanLine } from 'lucide-react';

export const ChecklistScreen = ({ sessionId, onSelectItem, onScanRequest, onFinish }) => {
    const [allItems, setAllItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('remaining');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchItems = async () => {
            setLoading(true);
            try {
                const items = await getAllInventoryItems();
                setAllItems(items.sort((a, b) => a.name.localeCompare(b.name)));
            } catch (err) {
                setError("Failed to load inventory list.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchItems();
    }, [sessionId]);

    const { remainingItems, completedItems } = useMemo(() => {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        const filtered = searchTerm
            ? allItems.filter(item => item.name.toLowerCase().includes(lowerCaseSearchTerm))
            : allItems;
            
        return {
            remainingItems: filtered.filter(item => item.lastCountedInSessionId !== sessionId),
            completedItems: filtered.filter(item => item.lastCountedInSessionId === sessionId),
        };
    }, [allItems, searchTerm, sessionId]);

    const handleFinish = async () => {
        if (remainingItems.length > 0) {
            if (!window.confirm(`There are still ${remainingItems.length} items remaining. Are you sure you want to finish this session?`)) {
                return;
            }
        } else if (!window.confirm("Are you sure you want to finish this stock take session?")) {
            return;
        }
        
        setLoading(true);
        await finishStockTakeSession(sessionId);
        onFinish();
        setLoading(false);
    };
    
    const progress = allItems.length > 0 ? (completedItems.length / allItems.length) * 100 : 0;

    if (loading) return <p style={{color: 'white', textAlign: 'center'}}>Loading inventory checklist...</p>;
    if (error) return <p className="error-text">{error}</p>;

    const listToDisplay = activeTab === 'remaining' ? remainingItems : completedItems;

    return (
        <div className="card" style={{ padding: '1rem', textAlign: 'left' }}>
            <div className="progress-container">
                <p>Progress: {completedItems.length} / {allItems.length} items</p>
                <div className="progress-bar-background">
                    <div className="progress-bar-foreground" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            {/* --- THIS IS THE CORRECTED LAYOUT --- */}
            <div className="controls-container-vertical">
                <button className="button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem' }} onClick={onScanRequest}>
                    <ScanLine size={24}/> Scan Item QR Code
                </button>
                <div style={{ position: 'relative' }}>
                    <input 
                        type="text" 
                        placeholder="Or search for an item..." 
                        className="search-input"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <Search size={20} className="search-icon" />
                </div>
            </div>

            <div className="tabs-container">
                <button onClick={() => setActiveTab('remaining')} className={activeTab === 'remaining' ? 'tab active' : 'tab'}>Remaining ({remainingItems.length})</button>
                <button onClick={() => setActiveTab('completed')} className={activeTab === 'completed' ? 'tab active' : 'tab'}>Completed ({completedItems.length})</button>
            </div>

            <div className="item-list-container">
                {listToDisplay.map(item => (
                    <div key={item.id} className="item-row" onClick={() => onSelectItem(item)}>
                        <div className="item-row-icon">{item.stockTakeMethod === 'weight' ? <Scale size={20} /> : <Hash size={20} />}</div>
                        <div className="item-row-details">
                            <p className="item-name">{item.name}</p>
                            <p className="item-stock">Current Stock: {item.currentStock}</p>
                        </div>
                        {activeTab === 'completed' && <Check size={24} className="item-row-check" />}
                    </div>
                ))}
            </div>

            <button className="button button-complete" style={{ marginTop: '1rem' }} onClick={handleFinish} disabled={loading}>
                {loading ? 'Finishing...' : 'Finish Stock Take'}
            </button>
        </div>
    );
};