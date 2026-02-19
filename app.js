import { firebaseConfig } from '../config/firebaseConfig.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Telegram Init
const tg = window.Telegram.WebApp;
tg.expand();

// Backend URL (Replace with your deployed backend URL)
const API_URL = "http://localhost:3000/api"; 

// State
let currentUser = {
    id: tg.initDataUnsafe?.user?.id || 'TEST_USER_123', // Fallback for browser testing
    username: tg.initDataUnsafe?.user?.username || 'Guest',
    balance: 0
};

// DOM Elements
const balanceEl = document.getElementById('balance');
const wheel = document.getElementById('wheel');
const spinBtn = document.getElementById('spin-btn');

// ===================================
// 🔄 INITIALIZATION
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('username').innerText = currentUser.username;
    
    // Listen to Balance Updates
    const userRef = doc(db, "users", String(currentUser.id));
    onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
            currentUser.balance = doc.data().balance;
            balanceEl.innerText = currentUser.balance;
        }
    });

    // Check for referrals on startup
    const startParam = tg.initDataUnsafe?.start_param;
    if (startParam) {
        processReferral(startParam);
    }
    
    // Load Referral Link
    const botUsername = "YOUR_BOT_USERNAME"; // 🔴 REPLACE
    document.getElementById('ref-link').value = `https://t.me/${botUsername}?start=${currentUser.id}`;
});

// ===================================
// 🎡 SPIN LOGIC
// ===================================

spinBtn.addEventListener('click', () => {
    // 1. Show Ad
    showAd().then((success) => {
        if (success) {
            triggerSpin();
        } else {
            showToast("Ad failed to load. Try again.");
        }
    });
});

function showAd() {
    return new Promise((resolve) => {
        if (typeof show_10491425 === 'function') {
            // Monetag Call
            show_10491425().then(() => {
                resolve(true);
            }).catch(() => {
                // Fallback or error handling
                console.log("Ad Error or Blocked");
                resolve(false); 
            });
        } else {
            // Dev mode fallback
            console.warn("Monetag SDK not loaded. Simulating ad.");
            setTimeout(() => resolve(true), 1000);
        }
    });
}

async function triggerSpin() {
    spinBtn.disabled = true;

    try {
        // Call Backend to get result
        const response = await fetch(`${API_URL}/spin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegramId: currentUser.id })
        });
        
        const data = await response.json();
        
        if (data.success) {
            performSpinAnimation(data.reward);
        } else {
            showToast("Server Error: " + data.error);
            spinBtn.disabled = false;
        }
    } catch (e) {
        console.error(e);
        spinBtn.disabled = false;
    }
}

function performSpinAnimation(reward) {
    // Mapping Reward to Degrees (Approximate based on 5 segments)
    // 0, 1, 2, 3, 10
    // 5 Segments = 72deg each
    // Need to fine tune based on visual CSS gradient
    
    const segmentMap = {
        0: 320,  // Black segment
        1: 36,   // Purple 1
        2: 108,  // Purple 2
        3: 180,  // Purple 3
        10: 252  // Pink
    };

    const targetDegree = segmentMap[reward] || 0;
    const spins = 5 * 360; // 5 Full spins
    const totalRotation = spins + targetDegree;

    // Apply Rotation
    wheel.style.transform = `rotate(${totalRotation}deg)`;

    // Wait for animation end (4s in CSS)
    setTimeout(() => {
        spinBtn.disabled = false;
        wheel.style.transition = 'none';
        wheel.style.transform = `rotate(${targetDegree}deg)`;
        
        // Reset transition for next time after small delay
        setTimeout(() => { wheel.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)'; }, 50);

        if (reward > 0) {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            showToast(`You won ${reward} coins!`);
        } else {
            showToast("No luck! Try again.");
        }
    }, 4000);
}

// ===================================
// 💰 PAYOUT & REFERRAL
// ===================================

window.copyReferral = () => {
    const copyText = document.getElementById("ref-link");
    copyText.select();
    document.execCommand("copy");
    showToast("Link Copied!");
};

async function processReferral(referrerId) {
    await fetch(`${API_URL}/refer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newUserId: currentUser.id, referrerId })
    });
}

document.getElementById('withdraw-btn').addEventListener('click', async () => {
    const amount = parseInt(document.getElementById('amount-input').value);
    const wallet = document.getElementById('wallet-address').value;
    const crypto = document.getElementById('crypto-select').value;

    if (!wallet || amount < 500) {
        showToast("Invalid inputs. Min 500 coins.");
        return;
    }

    const res = await fetch(`${API_URL}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            telegramId: currentUser.id,
            wallet,
            cryptoType: crypto,
            amountCoins: amount
        })
    });

    const data = await res.json();
    showToast(data.message || data.error);
});

// ===================================
// 📱 NAVIGATION
// ===================================

window.switchTab = (tabName) => {
    // Hide all pages
    document.querySelectorAll('section').forEach(el => {
        el.classList.add('hidden-page');
        el.classList.remove('active-page');
    });

    // Show target
    document.getElementById(`${tabName}-page`).classList.remove('hidden-page');
    document.getElementById(`${tabName}-page`).classList.add('active-page');

    // Update Nav Icons
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
};

function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 3000);
}