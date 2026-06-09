// 1. นำเข้าเฉพาะ App, Auth และ Firestore (ไม่ต้องใช้ Storage แล้ว)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 2. กุญแจของคุณ
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
const db = getFirestore(app); // ใช้แค่ Firestore ก็พอ!

let currentUserUid = null;

// 3. ปิดหน้าจอโหลดเมื่อข้อมูลพร้อม
const hideLoadingScreen = () => {
    const loader = document.getElementById('loading-screen');
    loader.style.opacity = '0';
    setTimeout(() => { loader.style.visibility = 'hidden'; }, 500);
};

// 4. โหลดข้อมูลเมื่อเข้าสู่ระบบ
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserUid = user.uid;
        document.getElementById('user-email').textContent = user.email || user.displayName;

        // ดึงข้อมูลชื่อ สถานะ และรูปภาพ
        const docSnap = await getDoc(doc(db, "users", currentUserUid));
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.name) document.getElementById('profile-name').value = data.name;
            if (data.bio) document.getElementById('profile-bio').value = data.bio;
            if (data.profilePic) document.getElementById('profile-img').src = data.profilePic;
        }
        
        hideLoadingScreen(); 

    } else {
        window.location.href = "index.html";
    }
});

// 5. ระบบเปลี่ยนรูปโปรไฟล์ (🔥 สูตรลับ: แปลงรูปเป็นข้อความ Base64 🔥)
document.getElementById('profile-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file || !currentUserUid) return;

    // เนื่องจากฐานข้อมูลเก็บข้อความได้จำกัด เราจึงดักไม่ให้ใช้ไฟล์ใหญ่เกิน 1MB
    if (file.size > 1024 * 1024) {
        alert("ไฟล์รูปใหญ่เกินไปครับ! รบกวนเลือกรูปภาพที่มีขนาดไม่เกิน 1MB นะครับ");
        return;
    }

    document.getElementById('profile-img').style.opacity = '0.5';

    // เครื่องมืออ่านไฟล์และแปลงเป็น Base64
    const reader = new FileReader();
    reader.readAsDataURL(file); 
    
    reader.onload = async () => {
        const base64Image = reader.result; // ได้รูปในรูปแบบข้อความยาวๆ มาแล้ว!

        try {
            // โชว์รูปหน้าเว็บ
            document.getElementById('profile-img').src = base64Image;
            document.getElementById('profile-img').style.opacity = '1';

            // บันทึกรูป (ข้อความ) ลง Firestore โดยตรง
            await setDoc(doc(db, "users", currentUserUid), {
                profilePic: base64Image
            }, { merge: true });

            console.log("อัปโหลดรูปภาพสำเร็จแบบง้อสายฟรี!");
        } catch (error) {
            alert("เกิดข้อผิดพลาดในการบันทึกรูป: " + error.message);
            document.getElementById('profile-img').style.opacity = '1';
        }
    };
});

// 6. ระบบบันทึกโปรไฟล์ (ชื่อ/สถานะ)
document.getElementById('save-profile-btn').addEventListener('click', async () => {
    const nameInput = document.getElementById('profile-name').value;
    const bioInput = document.getElementById('profile-bio').value;
    if (!currentUserUid) return;

    try {
        await setDoc(doc(db, "users", currentUserUid), {
            name: nameInput,
            bio: bioInput
        }, { merge: true });
        alert("บันทึกข้อมูลโปรไฟล์สำเร็จแล้ว! 🐈‍⬛✨");
    } catch (error) {
        alert("เกิดข้อผิดพลาด: " + error.message);
    }
});

// 7. ออกจากระบบ
document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));