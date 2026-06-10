import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
let profileBase64Image = "";

// 🌟 พระเอกของงาน: เช็กว่ามีรหัสเพื่อนส่งมาใน URL ไหม? (เช่น profile.html?uid=12345)
const urlParams = new URLSearchParams(window.location.search);
const targetUid = urlParams.get('uid'); 

// ดักจับ Element จากหน้าจอหลัก
const displayNameEl = document.getElementById('display-name');
const displayBioEl = document.getElementById('display-bio');
const profileImgEl = document.getElementById('profile-img');
const userEmailEl = document.getElementById('user-email');

// ปุ่มแก้ไขโปรไฟล์ 
const editBtn = document.getElementById('edit-profile-btn') || document.getElementById('toggle-edit-btn');
const editModal = document.getElementById('edit-profile-modal') || document.getElementById('edit-form-section');
const closeModalBtn = document.getElementById('close-edit-modal-btn') || document.getElementById('cancel-edit-btn');
const saveBtn = editModal ? editModal.querySelector('#save-profile-btn') : document.getElementById('save-profile-btn');

const nameInput = document.getElementById('edit-name-input') || document.getElementById('profile-name');
const bioInput = document.getElementById('edit-bio-input') || document.getElementById('profile-bio');
const picInput = document.getElementById('edit-profile-pic-input') || document.getElementById('profile-upload');
const previewImg = document.getElementById('edit-preview-img') || document.getElementById('profile-img');

// ==========================================
// 1. โหลดข้อมูลมาแสดงผล
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserUid = user.uid;
        
        // 🌟 ตัดสินใจว่าจะโชว์ข้อมูลใคร: ถ้ากดดูเพื่อนให้ใช้ targetUid ถ้าดูตัวเองให้ใช้ currentUserUid
        const displayUid = targetUid ? targetUid : currentUserUid;

        // 🌟 ถ้ากำลังดูโปรไฟล์ "เพื่อน" ให้ซ่อนอีเมลและซ่อนปุ่ม "แก้ไขโปรไฟล์" ไปเลย!
        if (targetUid && targetUid !== currentUserUid) {
            if (editBtn) editBtn.style.display = 'none';
            if (userEmailEl) userEmailEl.style.display = 'none';
        } else {
            if (userEmailEl) userEmailEl.textContent = user.email;
        }

        try {
            // ดึงข้อมูลผู้ใช้ (ตาม ID ที่เลือกไว้ด้านบน) มาแสดงผล
            const docSnap = await getDoc(doc(db, "users", displayUid));
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (displayNameEl) displayNameEl.textContent = data.name || "ผู้ใช้งาน";
                if (displayBioEl) displayBioEl.textContent = data.bio || "-";
                if (profileImgEl) profileImgEl.src = data.profilePic || 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Black%20Cat.png';
            }
            
            // โหลดรูปภาพโพสต์ โดยส่งรหัสคนที่อยากดูไปให้ฟังก์ชันด้วย
            loadUserPosts(displayUid);
        } catch (error) {
            console.error("โหลดข้อมูลโปรไฟล์พัง:", error);
        }
    } else {
        window.location.href = "index.html";
    }
});

// ==========================================
// 2. ฟังก์ชันโหลดโพสต์ส่วนตัวเข้า Grid
// ==========================================
async function loadUserPosts(uidToLoad) {
    const gridContainer = document.getElementById('profile-post-grid');
    const postCountElement = document.getElementById('post-count');
    if (!gridContainer) return;

    gridContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #a8a8a8; padding: 20px;">กำลังโหลดรูปภาพ...</div>';
    try {
        const postsRef = collection(db, "posts");
        // 🌟 ค้นหาเฉพาะโพสต์ที่เป็นของ uidToLoad
        const q = query(postsRef, where("uid", "==", uidToLoad));
        const querySnapshot = await getDocs(q);

        gridContainer.innerHTML = ''; 

        if (querySnapshot.empty) {
            gridContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #a8a8a8; padding: 20px;">ยังไม่มีโพสต์เลยครับ 📷</div>';
            if (postCountElement) postCountElement.textContent = '0';
            return;
        }

        let myPosts = [];
        querySnapshot.forEach((docSnap) => {
            myPosts.push({ id: docSnap.id, ...docSnap.data() });
        });
        myPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (postCountElement) postCountElement.textContent = myPosts.length;
        
        myPosts.forEach(post => {
            const gridItem = document.createElement('div');
            gridItem.className = 'grid-item';
            gridItem.innerHTML = `<img src="${post.imageUrl}" alt="User Post">`;
            gridContainer.appendChild(gridItem);
        });
    } catch (error) {
        console.error("โหลดรูปโพสต์ผิดพลาด: ", error);
        gridContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #ec4899;">เกิดข้อผิดพลาดในการโหลดรูปภาพ</div>';
    }
}

// ==========================================
// 3. ระบบแก้ไขโปรไฟล์แบบ Pop-up (ใช้ได้เฉพาะตอนดูตัวเอง)
// ==========================================
if (editBtn && editModal) {
    editBtn.addEventListener('click', async () => {
        if (!currentUserUid) return;
        try {
            const userDoc = await getDoc(doc(db, "users", currentUserUid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (nameInput) nameInput.value = userData.name || "";
                if (bioInput) bioInput.value = userData.bio || "";
                if (previewImg) previewImg.src = userData.profilePic || 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Black%20Cat.png';
            }
            editModal.style.display = 'flex'; 
        } catch (error) {
            console.error("ดึงข้อมูลมาพรีวิวไม่สำเร็จ:", error);
        }
    });
}

if (closeModalBtn && editModal) {
    closeModalBtn.addEventListener('click', () => {
        editModal.style.display = 'none';
        profileBase64Image = ""; 
    });
}

if (picInput) {
    picInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 1024 * 1024) {
            alert("ไฟล์รูปใหญ่เกินไปครับ! ขอไม่เกิน 1MB นะครับ");
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            profileBase64Image = reader.result;
            if (previewImg) previewImg.src = profileBase64Image; 
        };
    });
}

if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
        const newName = nameInput ? nameInput.value.trim() : "";
        const newBio = bioInput ? bioInput.value.trim() : "";
        if (!newName) {
            alert("กรุณากรอกชื่อผู้ใช้งานด้วยครับ!");
            return;
        }

        try {
            saveBtn.textContent = 'กำลังบันทึก...';
            saveBtn.disabled = true;

            const updateData = { name: newName, bio: newBio };
            if (profileBase64Image) {
                updateData.profilePic = profileBase64Image;
            }

            const userRef = doc(db, "users", currentUserUid);
            await updateDoc(userRef, updateData);

            alert("อัปเดตโปรไฟล์เรียบร้อยแล้วครับ! 🎉");
            if (editModal) editModal.style.display = 'none';
            window.location.reload(); 
        } catch (error) {
            console.error("บันทึกข้อมูลโปรไฟล์พัง:", error);
            alert("เกิดข้อผิดพลาดในการบันทึกข้อมูลครับ");
        } finally {
            saveBtn.textContent = 'บันทึก';
            saveBtn.disabled = false;
        }
    });
}

// ==========================================
// 4. ระบบออกจากระบบ (Logout)
// ==========================================
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = "index.html";
        }).catch((error) => console.error("ออกจากระบบไม่ได้:", error));
    });
}