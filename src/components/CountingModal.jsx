import React, { useState, useMemo } from 'react';
import { updateStockCount } from '../firestoreAPI';
import { ScanLine } from 'lucide-react';
import '../App.css'; 

export const CountingModal = ({ item, sessionId, onClose, onVerifyScanRequest }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [inputValue, setInputValue] = useState('');

    // The 'isVerified' prop will now be passed down from the App component
    const isVerified = item.isVerified || false;

    const calculatedQuantity = useMemo(() => {
        if (item?.stockTakeMethod !== 'weight' || !inputValue) return null;
        const totalWeight = parseFloat(inputValue);
        const tareWeight = item.tareWeight || 0;
        const unitWeight = item.unitWeight || 0;
        if (unitWeight <= 0 || totalWeight < tareWeight) return "Invalid";
        const netWeight = totalWeight - tareWeight;
        const quantity = Math.round(netWeight / unitWeight);
        return isNaN(quantity) ? "Invalid" : quantity;
    }, [inputValue, item]);

    const handleUpdateStock = async () => {
        if (!item || inputValue === '') return alert("Please enter a value.");
        setLoading(true);
        setError(null);
        let newStockCount = 0;

        if (item.stockTakeMethod === 'weight') {
            const qty = calculatedQuantity;
            if (typeof qty !== 'number' || qty < 0) {
                setError("Invalid weight calculation. Please check the value.");
                setLoading(false);
                return;
            }
            newStockCount = qty;
        } else {
            newStockCount = parseInt(inputValue, 10);
        }

        if (isNaN(newStockCount) || newStockCount < 0) {
            setError("Invalid quantity. Please enter a valid number.");
            setLoading(false);
            return;
        }
        
        try {
            await updateStockCount(item.collection, item.id, newStockCount, sessionId);
            onClose(true);
        } catch (err) {
            console.error("Failed to update stock:", err);
            setError("Failed to update stock in the database.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-backdrop" onClick={() => onClose(false)}>
            <div className="card" style={{textAlign: 'left'}} onClick={(e) => e.stopPropagation()}>
                <h2 style={{ fontSize: '1.5rem', textAlign: 'center' }}>Count Item: {item.name}</h2>
                <div className="item-details" style={{paddingBottom: '1rem', marginBottom: '1rem', borderBottom: '1px solid #374151'}}>
                    <p><strong>Current Recorded Stock:</strong> {item.currentStock}</p>
                    <p><strong>Method:</strong> <span className="method-text">{item.stockTakeMethod}</span></p>
                </div>
                
                {/* --- NEW: Conditional rendering based on verification status --- */}
                {isVerified ? (
                    // Show the counting form if verified
                    <div className="animate-fade-in">
                        {item.stockTakeMethod === 'weight' ? (
                            <div>
                                <label>Enter Total Weight (g)</label>
                                <input type="number" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="e.g., 500" className="input-large"/>
                                {calculatedQuantity !== null && (
                                    <p style={{textAlign: 'center', fontSize: '1.2rem', margin: '1rem 0'}}>
                                        Calculated Quantity: <strong style={{color: '#7dd3fc'}}>{calculatedQuantity}</strong>
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div>
                                <label>Enter Manual Count</label>
                                <input type="number" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="e.g., 232" className="input-large"/>
                            </div>
                        )}

                        {error && <p className="error-text" style={{marginTop: '1rem'}}>{error}</p>}
                        
                        <button className="button" style={{marginTop: '1rem'}} onClick={handleUpdateStock} disabled={loading}>
                            {loading ? 'Updating...' : 'Update Stock Count'}
                        </button>
                    </div>
                ) : (
                    // Show the verification button if not yet verified
                    <div style={{textAlign: 'center', marginTop: '2rem'}}>
                        <p style={{color: '#eab308'}}>Please scan the item's QR code to confirm you have the correct item before counting.</p>
                        <button className="button" style={{ padding: '1.5rem', fontSize: '1.5rem', marginTop: '1rem' }} onClick={() => onVerifyScanRequest(item.id)}>
                            <ScanLine size={32} style={{display: 'inline-block', marginRight: '1rem'}} />
                            Scan to Confirm Item
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};