import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

// 4. เข้าสู่ห้องแชท
document.getElementById('go-chat-btn').addEventListener('click', () => {
    window.location.href = "chat.html";
});

// 5. ออกจากระบบ
document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));