// 1. นำเข้า Firebase และเพิ่มฟังก์ชันสร้างบัญชี (createUserWithEmailAndPassword)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// 2. ใส่ Config ของคุณตรงนี้
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
const provider = new GoogleAuthProvider();

// 3. ระบบน้องแมว 3D หันตามเมาส์
const characterImage = document.getElementById('character-pose');
document.addEventListener("mousemove", (e) => {
    let xAxis = (window.innerWidth / 2 - e.pageX) / 25;
    let yAxis = (window.innerHeight / 2 - e.pageY) / 25;
    if (characterImage) {
        characterImage.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg) translateZ(20px)`;
    }
});

// 4. ระบบสลับหน้าต่าง (Login <-> Register)
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const formTitle = document.getElementById('form-title');
const formSubtitle = document.getElementById('form-subtitle');

document.getElementById('show-register').addEventListener('click', (e) => {
    e.preventDefault(); // ป้องกันเว็บเด้ง
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    formTitle.textContent = 'สมัครสมาชิก';
    formSubtitle.textContent = 'มาร่วมเป็นครอบครัว DARK CAT กันเถอะ 🐈‍⬛';
});

document.getElementById('show-login').addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
    formTitle.textContent = 'เข้าสู่ระบบ';
    formSubtitle.textContent = 'ยินดีต้อนรับกลับมา! คิดถึงจังเลย 🐾';
});

// 5. ระบบปุ่ม Google
const googleBtn = document.getElementById('google-btn');
if (googleBtn) {
    googleBtn.addEventListener('click', () => {
        signInWithPopup(auth, provider).then((result) => {
            alert("ยินดีต้อนรับคุณ " + result.user.displayName);
        }).catch((error) => {
            alert("เกิดข้อผิดพลาด: " + error.message);
        });
    });
}

// 6. ระบบสมัครสมาชิกด้วย Email/Password
registerForm.addEventListener('submit', (e) => {
    e.preventDefault(); // ป้องกันเว็บรีเฟรชตอนกดปุ่ม
    
    // ดึงค่าที่ผู้ใช้พิมพ์มา
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    // สั่ง Firebase สร้างบัญชี
    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // สำเร็จ!
            alert("สร้างบัญชีสำเร็จ! ลองเข้าสู่ระบบด้วยอีเมลนี้ได้เลยครับ 🎉");
            registerForm.reset(); // ล้างข้อมูลในช่องกรอก
            document.getElementById('show-login').click(); // สลับกลับไปหน้าล็อกอินอัตโนมัติ
        })
        .catch((error) => {
            // ไม่สำเร็จ (เช่น รหัสผ่านสั้นไป หรืออีเมลนี้มีคนใช้แล้ว)
            if (error.code === 'auth/email-already-in-use') {
                alert("อีเมลนี้มีผู้ใช้งานแล้วครับ");
            } else if (error.code === 'auth/weak-password') {
                alert("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษรครับ");
            } else {
                alert("เกิดข้อผิดพลาด: " + error.message);
            }
        });
});
// 7. ระบบเข้าสู่ระบบ (Login) ด้วย Email/Password
loginForm.addEventListener('submit', (e) => {
    e.preventDefault(); // ป้องกันเว็บรีเฟรชตอนกดปุ่ม
    
    // ดึงอีเมลและรหัสผ่านจากช่องกรอกของหน้าล็อกอิน
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    // สั่ง Firebase ให้ตรวจสอบและล็อกอิน
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // สำเร็จ!
            loginForm.reset();
            window.location.href = "dashboard.html";
        })
        .catch((error) => {
            // ไม่สำเร็จ (รหัสผิด หรือไม่มีอีเมลนี้)
            if (error.code === 'auth/invalid-credential') {
                alert("อีเมลหรือรหัสผ่านไม่ถูกต้องครับ โปรดลองอีกครั้ง");
            } else {
                alert("เกิดข้อผิดพลาด: " + error.message);
            }
        });
});