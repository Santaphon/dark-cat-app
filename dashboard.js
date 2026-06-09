import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

let currentUserUid = null;

const hideLoadingScreen = () => {
    const loader = document.getElementById('loading-screen');
    loader.style.opacity = '0';
    setTimeout(() => { loader.style.visibility = 'hidden'; }, 500);
};

// 1. โหลดข้อมูลเมื่อเข้าสู่ระบบ
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserUid = user.uid;
        document.getElementById('user-email').textContent = user.email;

        // ดึงข้อมูลโปรไฟล์
        const docSnap = await getDoc(doc(db, "users", currentUserUid));
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // อัปเดตช่องกรอกข้อมูล
            if (data.name) document.getElementById('profile-name').value = data.name;
            if (data.bio) document.getElementById('profile-bio').value = data.bio;
            if (data.profilePic) document.getElementById('profile-img').src = data.profilePic;

            // อัปเดตป้ายชื่อ Header ด้านบน
            if (data.name) document.getElementById('display-name').textContent = data.name;
            if (data.bio) document.getElementById('display-bio').textContent = `"${data.bio}"`;
        } else {
            document.getElementById('display-name').textContent = "ผู้ใช้ใหม่";
            document.getElementById('display-bio').textContent = "ยังไม่มีสถานะ";
        }
        
        hideLoadingScreen(); 
    } else {
        window.location.href = "index.html";
    }
});

// 2. ระบบเปลี่ยนรูปโปรไฟล์ (Base64)
document.getElementById('profile-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file || !currentUserUid) return;

    if (file.size > 1024 * 1024) {
        alert("ไฟล์รูปใหญ่เกินไปครับ! (ไม่เกิน 1MB)");
        return;
    }

    document.getElementById('profile-img').style.opacity = '0.5';

    const reader = new FileReader();
    reader.readAsDataURL(file); 
    
    reader.onload = async () => {
        const base64Image = reader.result; 
        try {
            document.getElementById('profile-img').src = base64Image;
            document.getElementById('profile-img').style.opacity = '1';

            await setDoc(doc(db, "users", currentUserUid), {
                profilePic: base64Image
            }, { merge: true });
        } catch (error) {
            alert("เกิดข้อผิดพลาดในการบันทึกรูป: " + error.message);
            document.getElementById('profile-img').style.opacity = '1';
        }
    };
});

// 3. ระบบบันทึกโปรไฟล์
document.getElementById('save-profile-btn').addEventListener('click', async () => {
    const nameInput = document.getElementById('profile-name').value;
    const bioInput = document.getElementById('profile-bio').value;
    if (!currentUserUid) return;

    try {
        await setDoc(doc(db, "users", currentUserUid), {
            name: nameInput,
            bio: bioInput
        }, { merge: true });
        
        // อัปเดตป้ายชื่อ Header ด้านบนทันทีที่กดเซฟ
        document.getElementById('display-name').textContent = nameInput || "ผู้ใช้ไร้นาม";
        document.getElementById('display-bio').textContent = `"${bioInput || 'ยังไม่มีสถานะ'}"`;

        alert("อัปเดตข้อมูลพอร์ทัลสำเร็จแล้ว! 🐈‍⬛✨");
    } catch (error) {
        alert("เกิดข้อผิดพลาด: " + error.message);
    }
});

// --- แก้ไขโค้ดส่วนล่างสุดของ dashboard.js ให้เป็นแบบนี้ ---

// 4. เข้าสู่ห้องแชท (ต้องเช็กก่อนว่าปุ่มมีอยู่จริงไหม เพื่อป้องกัน Error)
const chatBtn = document.getElementById('go-chat-btn');
if (chatBtn) {
    chatBtn.addEventListener('click', () => {
        window.location.href = "chat.html";
    });
}

// 5. ออกจากระบบ (ใช้ id="logout-btn" ให้ตรงกับใน HTML)
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = "index.html";
        }).catch((error) => {
            alert("เกิดข้อผิดพลาดในการออกจากระบบ");
        });
    });
} else {
    console.error("หาปุ่ม logout-btn ไม่เจอ! เช็ก ID ใน HTML อีกทีนะครับ");
}
// ฟังก์ชันระบบค้นหาเพื่อน (Pop-up Modal)
const searchModal = document.getElementById('search-modal');
const searchResults = document.getElementById('search-results');

// กดกากบาทปิดหน้าต่าง
document.getElementById('close-modal-btn').addEventListener('click', () => {
    searchModal.style.display = 'none';
});

// เมื่อกดปุ่มค้นหา
document.getElementById('search-btn').addEventListener('click', async () => {
    const keyword = document.getElementById('search-input').value.trim();
    if (!keyword) return;

    // เปิดหน้าต่าง Pop-up ขึ้นมาโชว์ตอนกำลังโหลด
    searchModal.style.display = 'flex';
    searchResults.innerHTML = '<div style="text-align:center; color:#a8a8a8; margin-top:20px;">กำลังค้นหา... 🐈‍⬛</div>';

    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("name", "==", keyword)); 
        const querySnapshot = await getDocs(q);
        
        searchResults.innerHTML = ''; // ล้างข้อความ "กำลังค้นหา" ออก
        
        if (querySnapshot.empty) {
            searchResults.innerHTML = '<div style="text-align:center; color:#a8a8a8; margin-top:20px;">ไม่พบผู้ใช้งานชื่อนี้ครับ</div>';
        } else {
            querySnapshot.forEach((doc) => {
                const userData = doc.data();
                const friendUid = doc.id;
                
                // เช็กว่าไม่ใช่ชื่อตัวเอง
                if(friendUid === currentUserUid) return;

                // สร้างการ์ดรายชื่อเพื่อน
                const userCard = document.createElement('div');
                userCard.style.display = 'flex';
                userCard.style.alignItems = 'center';
                userCard.style.justifyContent = 'space-between';

                userCard.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <img src="${userData.profilePic || 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Black%20Cat.png'}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 1px solid #262626;">
                        <div>
                            <strong style="display: block; font-size: 0.9rem;">${userData.name}</strong>
                            <span style="color: #a8a8a8; font-size: 0.8rem;">${userData.bio || 'ยังไม่มีสถานะ'}</span>
                        </div>
                    </div>
                    <button style="background: #0095f6; color: white; border: none; padding: 6px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.85rem; transition: background 0.2s;" onmouseover="this.style.background='#1877f2'" onmouseout="this.style.background='#0095f6'">เพิ่มเพื่อน</button>
                `;
                searchResults.appendChild(userCard);
            });
            
            // กรณีเจอแต่ชื่อตัวเอง
            if(searchResults.innerHTML === '') {
                 searchResults.innerHTML = '<div style="text-align:center; color:#a8a8a8; margin-top:20px;">ไม่พบผู้ใช้งานอื่นชื่อนี้ครับ</div>';
            }
        }
    } catch (e) {
        console.error("ค้นหาผิดพลาด: ", e);
        searchResults.innerHTML = '<div style="text-align:center; color:#ec4899; margin-top:20px;">เกิดข้อผิดพลาดในการเชื่อมต่อ</div>';
    }
});