/* --- Smart Auth.js with GSAP & Security Shield --- */
import { 
    auth, 
    db, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword 
} from './firebase-config.js';

import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Initialize Icons
if (window.lucide) { lucide.createIcons(); }

// 1. --- SECURITY REDIRECT SHIELD ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const currentPage = document.getElementById('signup-form').getAttribute('data-page');

            // If a student tries to access the lecturer auth page, kick them out
            if (userData.role === 'student' && currentPage === 'lecturer') {
                alert("Access Denied: You do not have staff privileges.");
                window.location.href = "dashboard.html";
            }
        }
    }
});

// 2. --- GSAP Entrance Animation ---
if (typeof gsap !== "undefined") {
    gsap.from(".glass-container", { duration: 1.5, y: 60, opacity: 0, ease: "power4.out", delay: 0.2 });
}

let isLoginMode = false;
let isProcessing = false;

// Selectors
const signupForm = document.getElementById('signup-form');
const submitBtn = document.getElementById('submit-btn');
const switchBtn = document.getElementById('switch-mode');
const toggleText = document.getElementById('toggle-text');
const mainTitle = document.getElementById('main-title');
const nameField = document.getElementById('name-field');
const extraFields = document.getElementById('extra-fields');
const levelGroup = document.getElementById('level-group'); 
const passwordInput = document.getElementById('password');
const togglePassword = document.getElementById('togglePassword');
const eyeIcon = document.getElementById('eye-icon');

// SMART PAGE DETECTION
const pageType = signupForm.getAttribute('data-page'); 

// Password Visibility Toggle
if (togglePassword) {
    togglePassword.addEventListener('click', () => {
        const isPassword = passwordInput.getAttribute('type') === 'password';
        passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
        eyeIcon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
        lucide.createIcons(); 
    });
}

// Mode Switcher
switchBtn.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    const signupOnlyFields = [nameField, extraFields].filter(el => el !== null);

    if (isLoginMode) {
        mainTitle.innerHTML = "Welcome <span>Back</span>";
        submitBtn.innerText = pageType === 'lecturer' ? "Staff Login" : "Login to Classroom";
        toggleText.innerText = "New here?";
        switchBtn.innerText = "Create Account";
        gsap.to(signupOnlyFields, { duration: 0.3, opacity: 0, display: "none", stagger: 0.05 });
    } else {
        mainTitle.innerHTML = pageType === 'lecturer' ? "Lecturer <span>Portal</span>" : "Learnify<span>.com</span>";
        submitBtn.innerText = pageType === 'lecturer' ? "Register Staff" : "Start Learning";
        toggleText.innerText = "Already have an account?";
        switchBtn.innerText = "Login";
        gsap.to(signupOnlyFields, { duration: 0.3, opacity: 1, display: "block", stagger: 0.05 });
    }
});

// --- MAIN SUBMISSION LOGIC ---
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isProcessing) return;
    isProcessing = true;
    
    const originalBtnText = submitBtn.innerText;
    submitBtn.innerText = "Connecting...";
    submitBtn.disabled = true;

    const email = document.getElementById('email').value.trim();
    const password = passwordInput.value;

    try {
        if (isLoginMode) {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
            
            if (userDoc.exists()) {
                const role = userDoc.data().role;
                window.location.href = (role === 'lecturer') ? "lecturer-dashboard.html" : "dashboard.html";
            }
        } else {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            const fullName = document.getElementById('full-name').value.trim();
            const dept = document.getElementById('department').value;
            const level = (pageType === 'student') ? document.getElementById('level').value : "Staff";

            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                name: fullName,
                email: email,
                dept: dept,
                level: level, 
                role: pageType, 
                createdAt: new Date()
            });

            window.location.href = (pageType === 'lecturer') ? "lecturer-dashboard.html" : "dashboard.html";
        }
    } catch (error) {
        alert("Auth Error: " + error.message);
        submitBtn.disabled = false;
        submitBtn.innerText = originalBtnText;
        isProcessing = false;
    }
});
