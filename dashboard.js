import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

        try {
            // ดึงข้อมูลโปรไฟล์ของเรา
            const docSnap = await getDoc(doc(db, "users", currentUserUid));
            if (docSnap.exists()) {
                const data = docSnap.data();
                
                // อัปเดตข้อมูลมินิโปรไฟล์แผงด้านขวา
                const rightName = document.getElementById('right-panel-name');
                const rightBio = document.getElementById('right-panel-bio');
                const rightImg = document.getElementById('right-panel-img');
                
                if (rightName) rightName.textContent = data.name || user.email.split('@')[0];
                if (rightBio) rightBio.textContent = data.bio || "ยังไม่มีสถานะ";
                if (rightImg && data.profilePic) rightImg.src = data.profilePic;
            }

            // สั่งปิดหน้าจอโหลด
            hideLoadingScreen(); 
            // โหลดฟีดและเพื่อน
            loadFeedPosts(); 
            loadFriendsList(); 

        } catch (error) {
            console.error("โหลดข้อมูลพัง:", error);
            hideLoadingScreen(); 
        }

    } else {
        window.location.href = "index.html";
    }
});


// 4. เข้าสู่ห้องแชท (ต้องเช็กก่อนว่าปุ่มมีอยู่จริงไหม เพื่อป้องกัน Error)
const chatBtn = document.getElementById('go-chat-btn');
if (chatBtn) {
    chatBtn.addEventListener('click', () => {
        window.location.href = "chat.html";
    });
}

 else {
    console.error("หาปุ่ม logout-btn ไม่เจอ! เช็ก ID ใน HTML อีกทีนะครับ");
}

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
            querySnapshot.forEach((docSnap) => {
                const userData = docSnap.data();
                const friendUid = docSnap.id;
                
                // เช็กว่าไม่ใช่ชื่อตัวเอง
                if(friendUid === currentUserUid) return;

                // สร้างการ์ดรายชื่อเพื่อน
                const userCard = document.createElement('div');
                userCard.style.display = 'flex';
                userCard.style.alignItems = 'center';
                userCard.style.justifyContent = 'space-between';

                // ใส่แค่รูปกับชื่อก่อน ส่วนปุ่มเราจะสร้างแยกเพื่อใส่คำสั่งคลิก
                userCard.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <img src="${userData.profilePic || 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Black%20Cat.png'}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 1px solid #262626;">
                        <div>
                            <strong style="display: block; font-size: 0.9rem;">${userData.name}</strong>
                            <span style="color: #a8a8a8; font-size: 0.8rem;">${userData.bio || 'ยังไม่มีสถานะ'}</span>
                        </div>
                    </div>
                `;

                // สร้างปุ่ม "เพิ่มเพื่อน" แยกออกมา
                const addBtn = document.createElement('button');
                addBtn.textContent = 'เพิ่มเพื่อน';
                addBtn.style.cssText = "background: #0095f6; color: white; border: none; padding: 6px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.85rem; transition: background 0.2s;";
                
                // เอฟเฟกต์ตอนเอาเมาส์ชี้
                addBtn.onmouseover = () => { if(!addBtn.disabled) addBtn.style.background = '#1877f2'; };
                addBtn.onmouseout = () => { if(!addBtn.disabled) addBtn.style.background = '#0095f6'; };

                // ⚡ ใส่คำสั่งให้ปุ่มทำงานเมื่อถูกกด ⚡
                addBtn.addEventListener('click', async () => {
                    try {
                        // 1. เปลี่ยนหน้าตาปุ่มเป็น "กำลังโหลด"
                        addBtn.textContent = 'กำลังเพิ่ม...';
                        addBtn.style.background = '#363636';
                        addBtn.disabled = true;

                        // 2. บันทึกเพื่อนลงในฐานข้อมูล (สร้างหมวด friends ใต้ชื่อเรา)
                        const friendRef = doc(db, "users", currentUserUid, "friends", friendUid);
                        await setDoc(friendRef, {
                            name: userData.name,
                            profilePic: userData.profilePic || '',
                            addedAt: new Date()
                        });

                        // 3. เปลี่ยนหน้าตาปุ่มเป็น "เป็นเพื่อนแล้ว"
                        addBtn.textContent = 'เป็นเพื่อนแล้ว';
                        addBtn.style.background = '#262626';
                        addBtn.style.color = '#a8a8a8';
                        addBtn.style.cursor = 'default';
                        
                    } catch (error) {
                        console.error("บันทึกเพื่อนไม่ได้: ", error);
                        addBtn.textContent = 'เพิ่มเพื่อน';
                        addBtn.style.background = '#0095f6';
                        addBtn.disabled = false;
                        alert("เกิดข้อผิดพลาด ลองใหม่อีกครั้งครับ");
                    }
                });

                // นำปุ่มไปแปะในการ์ด แล้วเอาการ์ดไปโชว์ในหน้าต่าง
                userCard.appendChild(addBtn);
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
// ฟังก์ชันดึงโพสต์จากฐานข้อมูลมาแสดงที่หน้าหลัก
async function loadFeedPosts() {
    const feedContainer = document.querySelector('.feed');
    if (!feedContainer || !currentUserUid) return;

    try {
        const postsRef = collection(db, "posts");
        const postSnapshot = await getDocs(postsRef);

        feedContainer.innerHTML = ''; // ล้างหน้า Feed เดิม

        if (postSnapshot.empty) {
            feedContainer.innerHTML = '<div style="text-align:center; color:#a8a8a8; margin-top:50px;">ยังไม่มีโพสต์เลย เริ่มสร้างโพสต์แรกของคุณสิ! 🐈‍⬛</div>';
            return;
        }

        let allPosts = [];
        postSnapshot.forEach((docSnap) => {
            allPosts.push({ id: docSnap.id, ...docSnap.data() });
        });
        allPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        for (const post of allPosts) {
            const userDoc = await getDoc(doc(db, "users", post.uid));
            const userData = userDoc.exists() ? userDoc.data() : { name: "ผู้ใช้งาน", profilePic: "" };
            const profilePic = userData.profilePic || 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Black%20Cat.png';

            // --- ส่วนที่เพิ่มใหม่: เช็กระบบไลก์ ---
            const likes = post.likes || []; // ดึงข้อมูลคนกดไลก์ (ถ้าไม่มีให้เป็นอาเรย์ว่าง)
            const isLiked = likes.includes(currentUserUid); // เช็กว่าตัวเราเคยไลก์โพสต์นี้ไหม
            const heartIcon = isLiked ? '❤️' : '🤍';
            const likeCount = likes.length;

            const postElement = document.createElement('article');
            postElement.className = 'post';
            postElement.innerHTML = `
                <div class="post-header">
                    <img src="${profilePic}" alt="Profile">
                    <span class="username">${userData.name}</span>
                    <span class="time">• เพิ่งโพสต์</span>
                </div>
                <div class="post-image" style="background: #121212;">
                    <img src="${post.imageUrl}" style="width: 100%; display: block;" alt="Post image">
                </div>
                <div class="post-actions" style="margin-top: 10px; font-size: 1.5rem; display: flex; gap: 15px; align-items: center;">
                    <span class="like-btn" style="cursor: pointer; transition: transform 0.2s;">${heartIcon}</span> 
                    <span style="cursor: pointer;">💬</span> 
                    <span style="cursor: pointer;">📤</span>
                </div>
                <div class="like-count-display" style="font-size: 0.9rem; font-weight: 600; margin-top: 5px;">
                    ${likeCount} ถูกใจ
                </div>
                <div class="post-caption" style="font-size: 0.9rem; margin-top: 5px; line-height: 1.5;">
                    <strong>${userData.name}</strong> ${post.caption}
                </div>
            `;

            // --- ใส่คำสั่งกดปุ่มหัวใจ ---
            const likeBtn = postElement.querySelector('.like-btn');
            const likeCountDisplay = postElement.querySelector('.like-count-display');

            likeBtn.addEventListener('click', async () => {
                // เอฟเฟกต์หัวใจเด้งดึ๋ง
                likeBtn.style.transform = 'scale(1.3)';
                setTimeout(() => likeBtn.style.transform = 'scale(1)', 150);

                const postRef = doc(db, "posts", post.id);
                try {
                    if (likeBtn.textContent === '🤍') {
                        // 1. กรณีเปลี่ยนเป็นไลก์ ❤️
                        likeBtn.textContent = '❤️';
                        likes.push(currentUserUid); // เพิ่มตัวเลขบนหน้าจอทันที (ไม่ต้องรอโหลด)
                        likeCountDisplay.textContent = `${likes.length} ถูกใจ`;
                        // บันทึกลงฐานข้อมูล
                        await updateDoc(postRef, { likes: arrayUnion(currentUserUid) });
                    } else {
                        // 2. กรณียกเลิกไลก์ 🤍
                        likeBtn.textContent = '🤍';
                        const index = likes.indexOf(currentUserUid);
                        if (index > -1) likes.splice(index, 1); // ลดตัวเลขบนหน้าจอ
                        likeCountDisplay.textContent = `${likes.length} ถูกใจ`;
                        // ลบออกจากฐานข้อมูล
                        await updateDoc(postRef, { likes: arrayRemove(currentUserUid) });
                    }
                } catch (error) {
                    console.error("กดหัวใจไม่สำเร็จ:", error);
                }
            });

            feedContainer.appendChild(postElement);
        }
    } catch (error) {
        console.error("โหลดโพสต์ผิดพลาด:", error);
    }
}

// ฟังก์ชันดึงรายชื่อเพื่อนมาแสดงที่แผงด้านขวา
async function loadFriendsList() {
    const friendsContainer = document.getElementById('friends-list-container');
    if (!friendsContainer || !currentUserUid) return;

    try {
        // วิ่งไปที่ฐานข้อมูล หมวดหมู่ friends ของเรา
        const friendsRef = collection(db, "users", currentUserUid, "friends");
        const snapshot = await getDocs(friendsRef);

        friendsContainer.innerHTML = ''; // ล้างข้อความ "กำลังโหลดเพื่อน..."

        if (snapshot.empty) {
            friendsContainer.innerHTML = '<div style="text-align: center; color: #a8a8a8; font-size: 0.8rem;">ยังไม่มีเพื่อน ลองค้นหาเพื่อนดูสิ! 🔍</div>';
            return;
        }

        // วนลูปวาดรายชื่อเพื่อนทีละคน
        snapshot.forEach((docSnap) => {
            const friend = docSnap.data();
            const friendElement = document.createElement('div');
            friendElement.style.cssText = "display: flex; align-items: center; justify-content: space-between;";
            
            friendElement.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${friend.profilePic || 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Black%20Cat.png'}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid #262626;">
                    <div style="display: flex; flex-direction: column;">
                        <strong style="font-size: 0.85rem; color: #f5f5f5;">${friend.name}</strong>
                        <span style="font-size: 0.75rem; color: #a8a8a8;">เป็นเพื่อนกันแล้ว</span>
                    </div>
                </div>
                <a href="chat.html" style="background: transparent; color: #0095f6; border: none; font-size: 0.75rem; font-weight: 600; cursor: pointer; text-decoration: none;">แชท</a>
            `;
            friendsContainer.appendChild(friendElement);
        });
    } catch (error) {
        console.error("โหลดรายชื่อเพื่อนผิดพลาด:", error);
        friendsContainer.innerHTML = '<div style="color: #ec4899; font-size: 0.8rem; text-align: center;">โหลดข้อมูลล้มเหลว</div>';
    }
}
// ==========================================
// 🔍 1. ระบบค้นหาเพื่อนและเพิ่มเพื่อน
// ==========================================
const searchModal = document.getElementById('search-modal');
const searchResults = document.getElementById('search-results');
const searchBtn = document.getElementById('search-btn');
const closeModalBtn = document.getElementById('close-modal-btn');

if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        searchModal.style.display = 'none';
    });
}

if (searchBtn) {
    searchBtn.addEventListener('click', async () => {
        const keyword = document.getElementById('search-input').value.trim();
        if (!keyword) return;

        searchModal.style.display = 'flex';
        searchResults.innerHTML = '<div style="text-align:center; color:#a8a8a8; margin-top:20px;">กำลังค้นหา... 🐈‍⬛</div>';

        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("name", "==", keyword)); 
            const querySnapshot = await getDocs(q);
            
            searchResults.innerHTML = ''; 
            
            if (querySnapshot.empty) {
                searchResults.innerHTML = '<div style="text-align:center; color:#a8a8a8; margin-top:20px;">ไม่พบผู้ใช้งานชื่อนี้ครับ</div>';
            } else {
                querySnapshot.forEach((docSnap) => {
                    const userData = docSnap.data();
                    const friendUid = docSnap.id;
                    
                    if(friendUid === currentUserUid) return;

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
                    `;

                    const addBtn = document.createElement('button');
                    addBtn.textContent = 'เพิ่มเพื่อน';
                    addBtn.style.cssText = "background: #0095f6; color: white; border: none; padding: 6px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.85rem; transition: background 0.2s;";
                    
                    addBtn.addEventListener('click', async () => {
                        try {
                            addBtn.textContent = 'กำลังเพิ่ม...';
                            addBtn.style.background = '#363636';
                            addBtn.disabled = true;

                            const friendRef = doc(db, "users", currentUserUid, "friends", friendUid);
                            await setDoc(friendRef, {
                                name: userData.name,
                                profilePic: userData.profilePic || '',
                                addedAt: new Date()
                            });

                            addBtn.textContent = 'เป็นเพื่อนแล้ว';
                            addBtn.style.background = '#262626';
                            addBtn.style.color = '#a8a8a8';
                            addBtn.style.cursor = 'default';
                        } catch (error) {
                            console.error("บันทึกเพื่อนไม่ได้: ", error);
                            addBtn.textContent = 'เพิ่มเพื่อน';
                            addBtn.style.background = '#0095f6';
                            addBtn.disabled = false;
                        }
                    });

                    userCard.appendChild(addBtn);
                    searchResults.appendChild(userCard);
                });
                if(searchResults.innerHTML === '') {
                    searchResults.innerHTML = '<div style="text-align:center; color:#a8a8a8; margin-top:20px;">ไม่พบผู้ใช้งานอื่นชื่อนี้ครับ</div>';
                }
            }
        } catch (e) {
            console.error("ค้นหาผิดพลาด: ", e);
        }
    });
}

// ==========================================
// 📸 2. ระบบสร้างโพสต์ (Create Post)
// ==========================================
const createBtn = document.getElementById('create-nav-btn');
const createModal = document.getElementById('create-post-modal');
const closeCreateBtn = document.getElementById('close-create-btn');
const postImageUpload = document.getElementById('post-image-upload');
const postImagePreview = document.getElementById('post-image-preview');
const uploadPlaceholder = document.getElementById('upload-placeholder');
let postBase64Image = "";

if (createBtn && createModal) {
    createBtn.addEventListener('click', (e) => {
        e.preventDefault();
        createModal.style.display = 'flex';
    });
    
    if(closeCreateBtn) {
        closeCreateBtn.addEventListener('click', () => {
            createModal.style.display = 'none';
        });
    }
}

if (postImageUpload) {
    postImageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 1024 * 1024) {
            alert("ไฟล์รูปใหญ่เกินไปครับ! (ขอไม่เกิน 1MB นะ)");
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file); 
        reader.onload = () => {
            postBase64Image = reader.result; 
            if(postImagePreview && uploadPlaceholder) {
                postImagePreview.src = postBase64Image;
                postImagePreview.style.display = 'block';
                uploadPlaceholder.style.display = 'none';
            }
        };
    });
}

const sharePostBtn = document.getElementById('share-post-btn');
if (sharePostBtn) {
    sharePostBtn.addEventListener('click', async () => {
        const caption = document.getElementById('post-caption').value.trim();
        if (!postBase64Image) {
            alert("กรุณาเลือกรูปภาพก่อนครับ!");
            return;
        }
        try {
            sharePostBtn.textContent = 'กำลังแชร์...';
            sharePostBtn.style.background = '#363636';
            sharePostBtn.disabled = true;

            const postId = "post_" + Date.now().toString(); 
            const newPostRef = doc(db, "posts", postId); 
            
            await setDoc(newPostRef, {
                uid: currentUserUid,
                imageUrl: postBase64Image,
                caption: caption,
                likes: [],
                createdAt: new Date().toISOString()
            });

            alert("แชร์โพสต์สำเร็จ! 🎉");
            if(createModal) createModal.style.display = 'none';
            
            postBase64Image = "";
            if(postImagePreview) {
                postImagePreview.src = "";
                postImagePreview.style.display = 'none';
            }
            if(uploadPlaceholder) uploadPlaceholder.style.display = 'block';
            document.getElementById('post-caption').value = '';

            loadFeedPosts(); // รีเฟรชฟีดใหม่
        } catch (error) {
            console.error("สร้างโพสต์ไม่ได้: ", error);
            alert("เกิดข้อผิดพลาดในการแชร์โพสต์");
        } finally {
            sharePostBtn.textContent = 'แชร์โพสต์';
            sharePostBtn.style.background = '#ec4899';
            sharePostBtn.disabled = false;
        }
    });
}

// ==========================================
// 🚪 3. ระบบออกจากระบบ (Logout)
// ==========================================
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = "index.html";
        }).catch((error) => console.error("ออกจากระบบไม่ได้:", error));
    });
}
// หลังจากอัปเดต Likes แล้ว (ถ้าเพิ่มไลก์)
if (!likes.includes(currentUserUid)) {
    await addDoc(collection(db, "notifications"), {
        receiverId: post.uid, // เจ้าของโพสต์
        senderId: currentUserUid, // คนที่มากดไลก์
        type: "like",
        postId: post.id,
        createdAt: serverTimestamp(),
        read: false
    });
}