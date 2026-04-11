/* --- Auth.js --- */
import { 
    auth, 
    db, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword 
} from './firebase-config.js';

// Added getDoc to the import list below
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const roleField = document.getElementById('role-field');
const extraFields = document.getElementById('extra-fields');
const levelGroup = document.getElementById('level-group');
const passwordInput = document.getElementById('password');
const togglePassword = document.getElementById('togglePassword');
const eyeIcon = document.getElementById('eye-icon');
const roleSelect = document.getElementById('user-role-select');

// --- LECTURER UI LOGIC ---
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
            // LOGIN LOGIC
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // SMART ROUTING: Check role in Firestore
            const userDoc = await getDoc(doc(db, "users", user.uid));
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                // Send to appropriate dashboard based on saved role
                if (userData.role === 'lecturer') {
                    window.location.href = "lecturer-dashboard.html";
                } else {
                    window.location.href = "dashboard.html";
                }
            } else {
                window.location.href = "dashboard.html"; // Default fallback
            }

        } else {
            // SIGNUP LOGIC
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const fullName = document.getElementById('full-name').value.trim();
            const role = roleSelect.value; 
            const dept = document.getElementById('department').value;
            const rawLevel = document.getElementById('level').value;
            const level = (role === 'lecturer') ? "N/A" : rawLevel;

            // Save user profile to "users" collection
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                name: fullName,
                email: email,
                dept: dept,
                level: level, 
                role: role, 
                createdAt: new Date()
            });

            // Immediate redirect after signup
            if (role === 'lecturer') {
                window.location.href = "lecturer-dashboard.html";
            } else {
                window.location.href = "dashboard.html";
            }
        }
    } catch (error) {
        console.error("Auth Error:", error.code);
        let msg = "An error occurred. Please try again.";
        if (error.code === 'auth/email-already-in-use') msg = "Email already registered.";
        if (error.code === 'auth/invalid-credential') msg = "Incorrect email or password.";
        if (error.code === 'auth/weak-password') msg = "Password is too weak.";
        
        alert(msg);
        submitBtn.disabled = false;
        submitBtn.innerText = originalBtnText;
        isProcessing = false;
    }
});