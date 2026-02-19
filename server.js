const express = require('express');
const cors = require('cors');
const { db, admin } = require('./firebaseAdmin');

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// 🧠 PROBABILITY LOGIC
// ==========================================
const REWARDS = [
    { value: 0,  weight: 39.0 },
    { value: 1,  weight: 50.9 },
    { value: 2,  weight: 10.0 },
    { value: 3,  weight: 10.0 }, // Adjusted to sum to ~100 with user logic
    { value: 10, weight: 0.1 }
];

const spinWheel = () => {
    let totalWeight = REWARDS.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let reward of REWARDS) {
        if (random < reward.weight) return reward.value;
        random -= reward.weight;
    }
    return 0;
};

// ==========================================
// 🚀 ENDPOINTS
// ==========================================

// 1. Process Spin
app.post('/api/spin', async (req, res) => {
    const { telegramId } = req.body;
    
    // Anti-Cheat: Rate limiting could go here
    
    try {
        const reward = spinWheel();
        const userRef = db.collection('users').doc(String(telegramId));

        await db.runTransaction(async (t) => {
            const doc = await t.get(userRef);
            if (!doc.exists) {
                // Create user if not exists
                t.set(userRef, { 
                    balance: reward, 
                    spins: 1, 
                    createdAt: admin.firestore.FieldValue.serverTimestamp() 
                });
            } else {
                const newBalance = (doc.data().balance || 0) + reward;
                t.update(userRef, { 
                    balance: newBalance,
                    spins: admin.firestore.FieldValue.increment(1)
                });
            }
            
            // Log the spin
            const spinRef = db.collection('spins').doc();
            t.set(spinRef, {
                userId: telegramId,
                reward: reward,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        res.json({ success: true, reward, message: `You won ${reward} coins!` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: "Spin failed" });
    }
});

// 2. Withdrawal Request
app.post('/api/withdraw', async (req, res) => {
    const { telegramId, wallet, cryptoType, amountCoins } = req.body;
    const MINIMUM_COINS = 500; // Example minimum

    if (amountCoins < MINIMUM_COINS) {
        return res.status(400).json({ success: false, error: "Minimum withdrawal not met" });
    }

    try {
        await db.runTransaction(async (t) => {
            const userRef = db.collection('users').doc(String(telegramId));
            const doc = await t.get(userRef);
            const currentBalance = doc.data().balance || 0;

            if (currentBalance < amountCoins) {
                throw new Error("Insufficient balance");
            }

            // Deduct balance
            t.update(userRef, { balance: currentBalance - amountCoins });

            // Create withdrawal record
            const withdrawRef = db.collection('withdrawals').doc();
            t.set(withdrawRef, {
                userId: telegramId,
                wallet,
                cryptoType,
                amountCoins,
                status: 'pending',
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        res.json({ success: true, message: "Withdrawal requested successfully" });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// 3. Referral System
app.post('/api/refer', async (req, res) => {
    const { newUserId, referrerId } = req.body;
    const REFERRAL_REWARD = 20;

    if (newUserId === referrerId) return res.json({ success: false });

    try {
        await db.runTransaction(async (t) => {
            const userRef = db.collection('users').doc(String(newUserId));
            const userDoc = await t.get(userRef);

            // Only reward if user is new and hasn't been referred
            if (!userDoc.exists || !userDoc.data().referredBy) {
                 const referrerRef = db.collection('users').doc(String(referrerId));
                 
                 t.update(referrerRef, { 
                     balance: admin.firestore.FieldValue.increment(REFERRAL_REWARD) 
                 });
                 
                 t.set(userRef, { referredBy: referrerId }, { merge: true });
            }
        });
        res.json({ success: true });
    } catch (e) {
        console.log("Referral error", e);
        res.json({ success: false }); // Silent fail
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));