/* --- Auth.js --- */
import { 
    auth, 
    db, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword 
} from './firebase-config.js';

import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Initialize Icons
if (window.lucide) { lucide.createIcons(); }

// GSAP Entrance Animation
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
const roleField = document.getElementById('role-field'); // New
const extraFields = document.getElementById('extra-fields');
const levelGroup = document.getElementById('level-group'); // New
const passwordInput = document.getElementById('password');
const togglePassword = document.getElementById('togglePassword');
const eyeIcon = document.getElementById('eye-icon');
const roleSelect = document.getElementById('user-role-select'); // New

// --- NEW: LECTURER UI LOGIC ---
// Hides Level when 'Lecturer' is selected
if (roleSelect) {
    roleSelect.addEventListener('change', (e) => {
        if (e.target.value === 'lecturer') {
            gsap.to(levelGroup, { opacity: 0, x: -20, display: 'none', duration: 0.3 });
        } else {
            levelGroup.style.display = 'block';
            gsap.to(levelGroup, { opacity: 1, x: 0, duration: 0.3 });
        }
    });
}

// Password Visibility Toggle
if (togglePassword) {
    togglePassword.addEventListener('click', () => {
        const isPassword = passwordInput.getAttribute('type') === 'password';
        passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
        eyeIcon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
        lucide.createIcons(); 
    });
}

// Mode Switcher (Login vs Signup)
switchBtn.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    
    // Elements to hide in Login mode
    const signupOnlyFields = [nameField, roleField, extraFields];

    if (isLoginMode) {
        mainTitle.innerHTML = "Welcome <span>Back</span>";
        submitBtn.innerText = "Login to Classroom";
        toggleText.innerText = "New here?";
        switchBtn.innerText = "Create Account";
        gsap.to(signupOnlyFields, { duration: 0.3, opacity: 0, display: "none", stagger: 0.05 });
    } else {
        mainTitle.innerHTML = "Learnify<span>.com</span>";
        submitBtn.innerText = "Start Learning";
        toggleText.innerText = "Already have an account?";
        switchBtn.innerText = "Login";
        gsap.to(signupOnlyFields, { duration: 0.3, opacity: 1, display: "block", stagger: 0.05 });
        
        // Ensure Level is hidden if role was already set to Lecturer
        if (roleSelect.value === 'lecturer') levelGroup.style.display = 'none';
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
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = "dashboard.html";
        } else {
            // 1. Create Auth User
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Capture Form Data
            const fullName = document.getElementById('full-name').value.trim();
            const role = roleSelect.value; // DYNAMIC ROLE
            const dept = document.getElementById('department').value;
            
            // 3. Level Logic: Save as null if Lecturer, otherwise save as String for consistency
            const rawLevel = document.getElementById('level').value;
            const level = (role === 'lecturer') ? "N/A" : rawLevel;

            // 4. DATA HANDSHAKE: Save to 'students' collection (or you can rename to 'users')
            await setDoc(doc(db, "students", user.uid), {
                uid: user.uid,
                name: fullName,
                email: email,
                dept: dept,
                level: level, 
                role: role, // Saves 'student' or 'lecturer'
                createdAt: new Date()
            });

            console.log("Success: Profile created for", fullName);
            window.location.href = "dashboard.html"; 
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