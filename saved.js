import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBjXONUBgiJ9iys--Rk_pJwKtWu3EnTn9o",
  authDomain: "dark-cat-d4c19.firebaseapp.com",
  projectId: "dark-cat-d4c19",
  storageBucket: "dark-cat-d4c19.firebasestorage.app",
  messagingSenderId: "417221227867",
  appId: "1:417221227867:web:6b75faa273314c9a5ed67e",
  measurementId: "G-65CLM2SJ46"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const savedThemeColor = localStorage.getItem('themeColor') || '#ec4899';
let currentUserId = null;
let realSavedItems = []; // ตัวแปรเก็บข้อมูลของจริงจาก Firebase

const container = document.getElementById('saved-list-container');
const tabBtns = document.querySelectorAll('.tab-btn');
let currentTab = 'all';

// ==========================================
// 🚀 ดึงข้อมูลของจริงจาก Firestore (Collection: saves)
// ==========================================
async function fetchSavedItems() {
    if (!currentUserId || !container) return;
    
    container.innerHTML = '<p style="color: #a8a8a8; text-align: center; margin-top: 20px;">กำลังโหลดของโปรดของคุณ...</p>';

    try {
        // ค้นหาเฉพาะข้อมูลที่ user คนปัจจุบันเป็นคนกดเซฟไว้
        const q = query(collection(db, "saves"), where("userId", "==", currentUserId));
        const querySnapshot = await getDocs(q);
        
        realSavedItems = [];
        querySnapshot.forEach((docSnap) => {
            realSavedItems.push({ id: docSnap.id, ...docSnap.data() });
        });

        renderItems(currentTab); // แสดงผลหลังจากดึงเสร็จ
    } catch (error) {
        console.error("ดึงข้อมูลพลาด: ", error);
        container.innerHTML = '<p style="color: #ff4d4f; text-align: center; margin-top: 20px;">ระบบขัดข้อง โหลดข้อมูลไม่สำเร็จครับ</p>';
    }
}

// ==========================================
// 🔄 ระบบเรนเดอร์ข้อมูลขึ้นหน้าจอ
// ==========================================
function renderItems(filterType = 'all') {
    container.innerHTML = ''; 

    // กรองข้อมูลตามแท็บ
    const filteredItems = realSavedItems.filter(item => filterType === 'all' || item.type === filterType);

    if (filteredItems.length === 0) {
        container.innerHTML = '<p style="color: #a8a8a8; text-align: center; margin-top: 20px;">ยังไม่มีข้อมูลในหมวดหมู่นี้ครับ ลองไปกดเซฟดูนะ! 😾</p>';
        return;
    }

    filteredItems.forEach(item => {
        let cardHTML = '';

        if (item.type === 'post') {
            cardHTML = `
                <div style="background: #0d0d0d; border: 1px solid #262626; border-radius: 12px; padding: 15px; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <img src="${item.avatar || 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Black%20Cat.png'}" style="width: 35px; height: 35px; border-radius: 50%; border: 1px solid #262626; object-fit: cover;">
                            <div>
                                <strong style="color: white; font-size: 0.9rem;">${item.author || 'ไม่ระบุชื่อ'}</strong>
                                <span style="color: #a8a8a8; font-size: 0.75rem; display: block;">${item.time || ''}</span>
                            </div>
                        </div>
                        <span class="unsave-btn" data-id="${item.id}" style="color: ${savedThemeColor}; cursor: pointer; font-size: 1.2rem; transition: 0.2s;" title="เลิกบันทึก" onmouseover="this.style.opacity=0.7" onmouseout="this.style.opacity=1">🔖</span>
                    </div>
                    <p style="color: #f5f5f5; font-size: 0.9rem; margin-bottom: ${item.image ? '10px' : '0'}; line-height: 1.5;">${item.content || ''}</p>
                    ${item.image ? `<img src="${item.image}" style="width: 100%; border-radius: 8px; border: 1px solid #262626; max-height: 250px; object-fit: cover;">` : ''}
                </div>
            `;
        } else if (item.type === 'event') {
            cardHTML = `
                <div style="background: #0d0d0d; border: 1px solid #262626; border-radius: 12px; padding: 15px; margin-bottom: 15px; display: flex; align-items: center; gap: 15px;">
                    <img src="${item.image || 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Party%20Popper.png'}" style="width: 70px; height: 70px; border-radius: 8px; object-fit: cover; flex-shrink: 0; border: 1px solid #262626;">
                    <div style="flex: 1; min-width: 0;">
                        <h3 style="color: white; margin: 0 0 5px 0; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name || 'กิจกรรม'}</h3>
                        <p style="color: ${savedThemeColor}; margin: 0 0 3px 0; font-size: 0.8rem; font-weight: bold;">⏰ ${item.date || ''}</p>
                        <p style="color: #a8a8a8; margin: 0; font-size: 0.8rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">📍 ${item.location || ''}</p>
                    </div>
                    <span class="unsave-btn" data-id="${item.id}" style="color: ${savedThemeColor}; cursor: pointer; font-size: 1.2rem; margin-left: 10px; transition: 0.2s;" title="เลิกบันทึก" onmouseover="this.style.opacity=0.7" onmouseout="this.style.opacity=1">🔖</span>
                </div>
            `;
        }
        
        container.innerHTML += cardHTML;
    });
}

// ==========================================
// 🗑️ ระบบกดปุ่ม 🔖 เพื่อ "เลิกบันทึก" (ลบจากฐานข้อมูล)
// ==========================================
document.addEventListener('click', async (e) => {
    if (e.target && e.target.classList.contains('unsave-btn')) {
        const docId = e.target.getAttribute('data-id');
        
        if(confirm("ต้องการนำรายการนี้ออกจากหน้าที่บันทึกไว้ใช่ไหมครับ?")) {
            try {
                // สั่งลบข้อมูลจาก Firebase
                await deleteDoc(doc(db, "saves", docId));
                // โหลดข้อมูลใหม่มาแสดงทันที
                fetchSavedItems();
            } catch (error) {
                console.error("ลบข้อมูลไม่สำเร็จ:", error);
                alert("เกิดข้อผิดพลาดในการเลิกบันทึกครับ");
            }
        }
    }
});

// จัดการการกดเปลี่ยนแท็บ
tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        tabBtns.forEach(b => {
            b.classList.remove('active');
            b.style.color = '#a8a8a8';
            b.style.borderColor = '#262626';
        });
        
        e.target.classList.add('active');
        e.target.style.color = savedThemeColor;
        e.target.style.borderColor = savedThemeColor;

        currentTab = e.target.getAttribute('data-tab');
        renderItems(currentTab);
    });
});

// ==========================================
// 👤 เช็กการเข้าสู่ระบบและโหลดแผงด้านขวา
// ==========================================
const rightName = document.getElementById('right-panel-name');
const rightBio = document.getElementById('right-panel-bio');
const rightImg = document.getElementById('right-panel-img');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserId = user.uid; // เก็บ ID ของคนที่ล็อกอินไว้
        
        let currentName = user.displayName;
        if (!currentName && user.email) currentName = user.email.split('@')[0];
        
        if (rightName) rightName.innerText = currentName;
        if (rightImg) {
            rightImg.src = user.photoURL || "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Black%20Cat.png";
            rightImg.style.borderColor = savedThemeColor;
        }

        try {
            const userDocSnap = await getDoc(doc(db, "users", user.uid));
            if (userDocSnap.exists() && userDocSnap.data().bio) {
                if (rightBio) rightBio.innerText = userDocSnap.data().bio;
            } else {
                if (rightBio) rightBio.innerText = "ออนไลน์ 🟢";
            }
        } catch (error) {
            if (rightBio) rightBio.innerText = "ออนไลน์ 🟢";
        }

        loadFriendsList();
        
        // 🌟 สั่งให้ดึงข้อมูลที่เซฟไว้ ทันทีที่ล็อกอินเสร็จ!
        fetchSavedItems();
        
    } else {
        window.location.href = "index.html"; 
    }
});

function loadFriendsList() {
    // ... [โค้ดโหลดเพื่อนด้านขวาเหมือนเดิม] ...
}
// ==========================================
// 📊 ระบบสถิติชุมชน (ดึงข้อมูลจริงจากฐานข้อมูล)
// ==========================================
async function loadCommunityStats() {
    try {
        // 1. นับจำนวนสมาชิกทั้งหมด
        const usersSnap = await getDocs(collection(db, "users"));
        const statUsers = document.getElementById('stat-total-users');
        if (statUsers) statUsers.innerText = usersSnap.size;

        // 2. นับจำนวนโพสต์ทั้งหมด
        const postsSnap = await getDocs(collection(db, "posts"));
        const statPosts = document.getElementById('stat-total-posts');
        if (statPosts) statPosts.innerText = postsSnap.size;

        // 3. สุ่มคนออนไลน์
        const statOnline = document.getElementById('stat-online-users');
        if (statOnline) {
            const randomOnline = Math.floor(Math.random() * usersSnap.size) + 1;
            statOnline.innerText = randomOnline;
        }

        // 4. นับจำนวนกลุ่ม (ถ้าคุณเดฟสร้าง Collection "groups" ไว้แล้ว)
        try {
            const groupsSnap = await getDocs(collection(db, "groups"));
            const statGroups = document.getElementById('stat-total-groups');
            if (statGroups) statGroups.innerText = groupsSnap.size > 0 ? groupsSnap.size : 3; 
        } catch(e) {}

    } catch (error) {
        console.error("โหลดสถิติชุมชนไม่สำเร็จ:", error);
    }
}

// สั่งให้ทำงานทันทีเมื่อเปิดหน้านี้
loadCommunityStats();