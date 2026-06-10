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

// โหลดข้อมูลเข้าสู่ระบบ
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserUid = user.uid;
        document.getElementById('user-email').textContent = user.email;

        // ดึงข้อมูลโปรไฟล์จากฐานข้อมูล
        const docSnap = await getDoc(doc(db, "users", currentUserUid));
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // อัปเดตหน้าแสดงผล
            if (data.name) {
                document.getElementById('display-name').textContent = data.name;
                document.getElementById('profile-name').value = data.name;
            } else {
                document.getElementById('display-name').textContent = user.email.split('@')[0];
            }
            
            if (data.bio) {
                document.getElementById('display-bio').textContent = data.bio;
                document.getElementById('profile-bio').value = data.bio;
            }
            
            if (data.profilePic) {
                document.getElementById('profile-img').src = data.profilePic;
            }
        }
        loadMyPosts();
    } else {
        window.location.href = "index.html";
    }
});

// เปิด/ปิด ฟอร์มแก้ไขโปรไฟล์
const editForm = document.getElementById('edit-form-section');
document.getElementById('toggle-edit-btn').addEventListener('click', () => {
    editForm.style.display = editForm.style.display === 'block' ? 'none' : 'block';
});
document.getElementById('cancel-edit-btn').addEventListener('click', () => {
    editForm.style.display = 'none';
});

// ระบบเปลี่ยนรูปโปรไฟล์ (คลิกที่รูปกลมๆ ด้านซ้าย)
document.getElementById('profile-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file || !currentUserUid) return;

    if (file.size > 1024 * 1024) {
        alert("ไฟล์รูปใหญ่เกินไปครับ! (ไม่เกิน 1MB)");
        return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file); 
    reader.onload = async () => {
        const base64Image = reader.result; 
        try {
            document.getElementById('profile-img').src = base64Image;
            await setDoc(doc(db, "users", currentUserUid), { profilePic: base64Image }, { merge: true });
        } catch (error) {
            alert("อัปโหลดรูปไม่สำเร็จ: " + error.message);
        }
    };
});

// บันทึกข้อมูลที่แก้ไข
document.getElementById('save-profile-btn').addEventListener('click', async () => {
    const nameInput = document.getElementById('profile-name').value;
    const bioInput = document.getElementById('profile-bio').value;
    if (!currentUserUid) return;

    try {
        await setDoc(doc(db, "users", currentUserUid), {
            name: nameInput,
            bio: bioInput
        }, { merge: true });
        
        // อัปเดตหน้าจอทันที
        document.getElementById('display-name').textContent = nameInput || "ไม่มีชื่อ";
        document.getElementById('display-bio').textContent = bioInput || "-";
        
        // ปิดฟอร์ม
        editForm.style.display = 'none';
    } catch (error) {
        alert("เกิดข้อผิดพลาด: " + error.message);
    }
});

// ออกจากระบบ
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = "index.html";
        }).catch((error) => console.error("ออกจากระบบไม่ได้:", error));
    });
}
// ฟังก์ชันดึงรูปภาพโพสต์มาโชว์ในหน้าโปรไฟล์
async function loadMyPosts() {
    const gridContainer = document.getElementById('profile-post-grid');
    const postCountElement = document.getElementById('post-count');
    if (!gridContainer || !currentUserUid) return;

    gridContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #a8a8a8; padding: 20px;">กำลังโหลดรูปภาพ...</div>';

    try {
        // ค้นหาโพสต์ที่เป็นของเรา (เช็กจาก uid)
        const postsRef = collection(db, "posts");
        const q = query(postsRef, where("uid", "==", currentUserUid));
        const querySnapshot = await getDocs(q);

        gridContainer.innerHTML = ''; // ล้างข้อความโหลด

        if (querySnapshot.empty) {
            gridContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #a8a8a8; padding: 20px;">ยังไม่มีโพสต์เลยครับ 📷</div>';
            postCountElement.textContent = '0';
            return;
        }

        // เก็บโพสต์ใส่ Array และเรียงลำดับเวลา (ใหม่สุดขึ้นก่อน)
        let myPosts = [];
        querySnapshot.forEach((docSnap) => {
            myPosts.push({ id: docSnap.id, ...docSnap.data() });
        });
        myPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // อัปเดตตัวเลขจำนวนโพสต์
        postCountElement.textContent = myPosts.length;

        // วาดรูปใส่ตาราง Grid
        myPosts.forEach(post => {
            const gridItem = document.createElement('div');
            gridItem.className = 'grid-item';
            // ใส่รูปลงไป
            gridItem.innerHTML = `<img src="${post.imageUrl}" alt="My Post">`;
            gridContainer.appendChild(gridItem);
        });

    } catch (error) {
        console.error("โหลดรูปโปรไฟล์ผิดพลาด: ", error);
        gridContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #ec4899;">เกิดข้อผิดพลาดในการโหลดรูปภาพ</div>';
    }
}