/* --- Smart Auth.js with GSAP --- */
import { 
    auth, 
    db, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword 
} from './firebase-config.js';

import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Initialize Icons
if (window.lucide) { lucide.createIcons(); }

// GSAP Entrance Animation (Kept exactly as you had it)
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
const levelGroup = document.getElementById('level-group'); // May be null on Lecturer page
const passwordInput = document.getElementById('password');
const togglePassword = document.getElementById('togglePassword');
const eyeIcon = document.getElementById('eye-icon');

// --- SMART PAGE DETECTION ---
// This looks at the data-page attribute we added to your HTML
const pageType = signupForm.getAttribute('data-page'); // 'student' or 'lecturer'

// Password Visibility Toggle
if (togglePassword) {
    togglePassword.addEventListener('click', () => {
        const isPassword = passwordInput.getAttribute('type') === 'password';
        passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
        eyeIcon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
        lucide.createIcons(); 
    });
}

// Mode Switcher (Login vs Signup) - GSAP Updated
switchBtn.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    
    // levelGroup might not exist on the lecturer page, so we filter it
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
            // LOGIN LOGIC
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                // Send to appropriate dashboard based on saved role
                window.location.href = (userData.role === 'lecturer') ? "lecturer-dashboard.html" : "dashboard.html";
            } else {
                window.location.href = "dashboard.html"; 
            }

        } else {
            // SIGNUP LOGIC
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const fullName = document.getElementById('full-name').value.trim();
            const dept = document.getElementById('department').value;
            
            // Check for level only if it's a student page
            const level = (pageType === 'student') ? document.getElementById('level').value : "Staff";

            // Save user profile to "users" collection
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                name: fullName,
                email: email,
                dept: dept,
                level: level, 
                role: pageType, // Uses 'student' or 'lecturer' from the HTML attribute
                createdAt: new Date()
            });

            // Redirect
            window.location.href = (pageType === 'lecturer') ? "lecturer-dashboard.html" : "dashboard.html";
        }
    } catch (error) {
        console.error("Auth Error:", error.code);
        let msg = "An error occurred. Please try again.";
        if (error.code === 'auth/email-already-in-use') msg = "Email already registered.";
        if (error.code === 'auth/invalid-credential') msg = "Incorrect email or password.";
        
        alert(msg);
        submitBtn.disabled = false;
        submitBtn.innerText = originalBtnText;
        isProcessing = false;
    }
});