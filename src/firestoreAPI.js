import { db, auth } from './firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, updateDoc, query, where, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';

// --- NEW AUTHENTICATION FUNCTION ---
export const authenticateScanner = async () => {
    try {
      const email = import.meta.env.VITE_SCANNER_USER_EMAIL;
      const password = import.meta.env.VITE_SCANNER_USER_PASSWORD;
      if (!email || !password) {
          throw new Error("Scanner credentials not configured in Vercel or .env.local file.");
      }
      await signInWithEmailAndPassword(auth, email, password);
      // If we get here, login was successful.
    } catch (err) {
      console.error("Authentication failed inside firestoreAPI:", err);
      // Re-throw the error so the UI can catch it
      throw new Error("App authentication failed. Please check credentials and redeploy.");
    }
};


// --- ALL OTHER FUNCTIONS ---

export const getAllInventoryItems = async () => {
    const collectionNames = ['components', 'rawMaterials', 'workshopSupplies'];
    const allItems = [];
    for (const collectionName of collectionNames) {
        const snapshot = await getDocs(collection(db, collectionName));
        snapshot.forEach(doc => {
            allItems.push({ collection: collectionName, id: doc.id, ...doc.data() });
        });
    }
    return allItems;
};

export const findInventoryItemById = async (id) => {
    if (!id) return null;
    const allItems = await getAllInventoryItems();
    const foundItem = allItems.find(item => item.id === id);
    if (!foundItem) {
        throw new Error(`No inventory item found with ID: ${id}`);
    }
    return foundItem;
};

export const updateStockCount = async (collectionName, docId, newStockCount, sessionId) => {
    const docRef = doc(db, collectionName, docId);
    return updateDoc(docRef, {
        currentStock: newStockCount,
        lastCountedAt: serverTimestamp(),
        lastCountedInSessionId: sessionId 
    });
};

const sessionsCollection = collection(db, 'stockTakeSessions');

export const getActiveStockTakeSession = async () => {
    const q = query(sessionsCollection, where("status", "==", "in-progress"));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        return null;
    }
    const sessionDoc = snapshot.docs[0];
    return { id: sessionDoc.id, ...sessionDoc.data() };
};

export const startNewStockTakeSession = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const batch = writeBatch(db);
    const allItems = await getAllInventoryItems();
    allItems.forEach(item => {
        const itemRef = doc(db, item.collection, item.id);
        batch.update(itemRef, { lastCountedInSessionId: null });
    });
    
    const newSession = {
        startedAt: serverTimestamp(),
        startedBy: user.email,
        status: 'in-progress',
        completedAt: null,
    };
    const newSessionRef = doc(sessionsCollection);
    batch.set(newSessionRef, newSession);

    await batch.commit();
    return newSessionRef.id;
};

export const finishStockTakeSession = async (sessionId) => {
    if (!sessionId) return;
    const sessionDocRef = doc(db, 'stockTakeSessions', sessionId);
    return updateDoc(sessionDocRef, {
        status: 'completed',
        completedAt: serverTimestamp()
    });
};