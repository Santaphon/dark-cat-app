// ==========================================
// 1. นำเข้า Firebase และตั้งค่า (Import & Config)
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// ==========================================
// 2. เช็กการล็อกอินและโหลดข้อมูล
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadNotifications(user.uid);
    } else {
        window.location.href = "index.html";
    }
});

// ==========================================
// 3. ฟังก์ชันดึงและวาดการแจ้งเตือน
// ==========================================
async function loadNotifications(uid) {
    const listContainer = document.getElementById('notifications-list');
    
    try {
        // ดึงข้อมูลจากคอลเล็กชัน "notifications" ที่ receiverId ตรงกับ UID ของเรา
        const q = query(collection(db, "notifications"), where("receiverId", "==", uid));
        const snapshot = await getDocs(q);

        listContainer.innerHTML = ''; // ล้างคำว่ากำลังโหลด

        if (snapshot.empty) {
            listContainer.innerHTML = '<div style="color: #a8a8a8; text-align: center; padding: 20px;">ยังไม่มีการแจ้งเตือนใหม่ครับ 🔕</div>';
            return;
        }

        // จับข้อมูลยัดใส่ Array เพื่อเอามาจัดเรียงเวลาจาก "ใหม่สุด -> เก่าสุด"
        let notifs = [];
        snapshot.forEach(doc => notifs.push({ id: doc.id, ...doc.data() }));
        notifs.sort((a, b) => b.createdAt - a.createdAt);

        // วนลูปสร้างกล่องแจ้งเตือนทีละอัน
        for (const notif of notifs) {
            // ไปดึงรูปและชื่อของ "คนที่มากดไลก์" จากคอลเล็กชัน users
            const senderDoc = await getDoc(doc(db, "users", notif.senderId));
            const senderData = senderDoc.exists() ? senderDoc.data() : { name: "ใครบางคน", profilePic: "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Black%20Cat.png" };

            const item = document.createElement('div');
            item.className = 'notify-item';
            
            // เช็กว่าเป็นแจ้งเตือนประเภทไหน (ตอนนี้มีแค่ Like เดี๋ยวอนาคตอาจมี Follow)
            let actionText = notif.type === 'like' ? 'ได้ถูกใจโพสต์ของคุณ ❤️' : (notif.type === 'comment' ? 'ได้คอมเมนต์โพสต์ของคุณ 💬' : 'มีปฏิสัมพันธ์กับคุณ');

            item.innerHTML = `
                <img src="${senderData.profilePic || 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Black%20Cat.png'}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 1px solid #262626;">
                <div>
                    <strong style="color: #fff; font-size: 0.95rem;">${senderData.name}</strong> 
                    <span style="color: #a8a8a8; font-size: 0.9rem;">${actionText}</span>
                </div>
            `;
            listContainer.appendChild(item);
        }
    } catch (error) {
        console.error("โหลดแจ้งเตือนพัง:", error);
        listContainer.innerHTML = '<div style="color: #ec4899; text-align: center;">เกิดข้อผิดพลาดในการโหลดข้อมูล 😿</div>';
    }
}