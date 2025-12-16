'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const Spline = dynamic(() => import('@splinetool/react-spline').then((mod) => mod.default), {
  ssr: false,
  loading: () => null, // Don't show loading component, show Spline immediately
});

// Field-specific dialogue generators for login form
const getFieldDialogues = (fieldName: string, formData: { email: string; password: string }, firstName: string = '') => {
  const emailDomain = formData.email.includes('@') ? formData.email.split('@')[1] : '';
  const hasEmail = formData.email.trim().length > 0;
  const hasFirstName = firstName.length > 0;
  
  const baseDialogues: Record<string, string[]> = {
    email: hasEmail ? (hasFirstName ? [
      `Hey ${firstName}! I see you're using ${emailDomain}! 📧`,
      `Perfect ${firstName}! Your email looks good! ✨`,
      `Got it ${firstName}! Email saved! I'll remember this! 💌`,
      `Great ${firstName}! I've got your email! 📬`,
      `Email locked in ${firstName}! Ready to log in! 🔒`,
      `Perfect email ${firstName}! Let's get you signed in! 🚀`,
      `I see your email ${firstName}! Almost there! ⚡`,
      `Email looks good ${firstName}! What's next? 📧`,
      `Welcome back ${firstName}! I recognize your email! 👋`,
      `${firstName}, your email is perfect! Let's continue! ✨`,
    ] : [
      `Got it! I see you're using ${emailDomain}! 📧`,
      `Perfect! Your email looks good! ✨`,
      `Email saved! I'll remember this! 💌`,
      `Great! I've got your email! 📬`,
      `Email locked in! Ready to log in! 🔒`,
      `Perfect email! Let's get you signed in! 🚀`,
      `I see your email! Almost there! ⚡`,
      `Email looks good! What's next? 📧`,
    ]) : [
      "Enter your email! 📧",
      "I need your email to log you in! ✨",
      "Email please! Let's get started! 💌",
      "What's your email? 📬",
      "Email is required! 🔒",
    ],
    password: hasFirstName ? [
      `I'm not looking ${firstName}! 👀`,
      `Password entered ${firstName}! I won't peek! 🔒`,
      `Got your password ${firstName}! My lips are sealed! 🤐`,
      `Password locked in ${firstName}! I saw nothing! 🙈`,
      `Perfect ${firstName}! Password is safe with me! 🔐`,
      `Password entered ${firstName}! Ready to go! ⚡`,
      `I'm closing my eyes ${firstName}... password saved! 😅`,
      `${firstName}, password? What password? I saw nothing! 😉`,
      `Don't worry ${firstName}, I'm not looking! 👀`,
      `${firstName}, your password is safe with me! 🔒`,
    ] : [
      "I'm not looking! 👀",
      "Password entered! I won't peek! 🔒",
      "Got your password! My lips are sealed! 🤐",
      "Password locked in! I saw nothing! 🙈",
      "Perfect! Password is safe with me! 🔐",
      "Password entered! Ready to go! ⚡",
      "I'm closing my eyes... password saved! 😅",
      "Password? What password? I saw nothing! 😉",
    ],
  };
  
  return baseDialogues[fieldName] || [];
};

// Error-specific dialogue messages for login
const getErrorDialogues = (errorType: string, formData: { email: string; password: string }, firstName: string = ''): string[] => {
  const hasFirstName = firstName.length > 0;
  
  const errorDialogues: Record<string, string[]> = {
    email: hasFirstName ? [
      `Uh oh ${firstName}! I need your email! 📧`,
      `${firstName}, email is missing! Can't log in without it! 😅`,
      `Hey ${firstName}! Your email is required! 👀`,
      `${firstName}, I need a valid email address! 🔍`,
      `Oops ${firstName}! Email is required! 😊`,
      `${firstName}, no email = no login! 📬`,
      `Email please ${firstName}! I need to know who you are! 📮`,
    ] : [
      "Uh oh! I need your email! 📧",
      "Email is missing! Can't log in without it! 😅",
      "Hey! Your email is required! 👀",
      "I need a valid email address! 🔍",
      "Oops! Email is required! 😊",
      "No email = no login! 📬",
      "Email please! I need to know who you are! 📮",
    ],
    password: hasFirstName ? [
      `Hey ${firstName}! You need a password! 🔒`,
      `${firstName}, password is important! Don't forget! 😊`,
      `Oops ${firstName}! Password is required! 🔐`,
      `${firstName}, I can't let you in without a password! 🚪`,
      `Secure your login with a password ${firstName}! 💪`,
      `Password please ${firstName}! Safety first! 🛡️`,
      `${firstName}, I need your password to log you in! 🔑`,
    ] : [
      "Hey! You need a password! 🔒",
      "Password is important! Don't forget! 😊",
      "Oops! Password is required! 🔐",
      "I can't let you in without a password! 🚪",
      "Secure your login with a password! 💪",
      "Password please! Safety first! 🛡️",
      "I need your password to log you in! 🔑",
    ],
    emailInvalid: hasFirstName ? [
      `Uh oh ${firstName}! That email doesn't look right! 📧`,
      `${firstName}, that email format is invalid! Check it again! 👀`,
      `Hey ${firstName}! I need a valid email address! 🔍`,
      `${firstName}, that's not a proper email! Try again! 😊`,
      `${firstName}, email format looks wrong! Double check! 📬`,
      `Invalid email ${firstName}! Make sure it has @ and .com! 🔍`,
    ] : [
      "Uh oh! That email doesn't look right! 📧",
      "That email format is invalid! Check it again! 👀",
      "Hey! I need a valid email address! 🔍",
      "That's not a proper email! Try again! 😊",
      "Email format looks wrong! Double check! 📬",
      "Invalid email! Make sure it has @ and .com! 🔍",
    ],
    invalidCredentials: hasFirstName ? [
      `Oops ${firstName}! Wrong email or password! 😅 Don't have an account? Click "Sign up" below to create one! 🎉`,
      `Hmm ${firstName}, those credentials don't match! 🔍 New here? Hit that "Sign up" button below and join the cooking party! 🍳`,
      `Invalid login ${firstName}! Check your email and password! 👀 Or maybe you're new? Click "Sign up" below to get started! ✨`,
      `${firstName}, can't log in with those details! Try again! 🔒 Or create a new account with the "Sign up" button below! 🚀`,
      `Wrong credentials ${firstName}! Double check and try again! 🔐 Don't have an account yet? The "Sign up" button below is calling your name! 📢`,
      `Login failed ${firstName}! Make sure email and password are correct! 🚪 New to Chefora? Click "Sign up" below to join us! 🎊`,
      `Uh oh ${firstName}! Those credentials don't work! 😅 Maybe you're new? Click "Sign up" below to create your account! 🌟`,
      `${firstName}, I don't recognize those credentials! 🔍 If you're new here, click "Sign up" below to start your cooking journey! 👨‍🍳`,
      `Hmm ${firstName}, something's not matching! 👀 Don't have an account? The "Sign up" button below is your ticket in! 🎫`,
      `${firstName}, wrong password or email! 🔒 New here? Click "Sign up" below and let's get you cooking! 🍲`,
    ] : [
      "Oops! Wrong email or password! 😅 Don't have an account? Click \"Sign up\" below to create one! 🎉",
      "Hmm, those credentials don't match! 🔍 New here? Hit that \"Sign up\" button below and join the cooking party! 🍳",
      "Invalid login! Check your email and password! 👀 Or maybe you're new? Click \"Sign up\" below to get started! ✨",
      "Can't log in with those details! Try again! 🔒 Or create a new account with the \"Sign up\" button below! 🚀",
      "Wrong credentials! Double check and try again! 🔐 Don't have an account yet? The \"Sign up\" button below is calling your name! 📢",
      "Login failed! Make sure email and password are correct! 🚪 New to Chefora? Click \"Sign up\" below to join us! 🎊",
      "Uh oh! Those credentials don't work! 😅 Maybe you're new? Click \"Sign up\" below to create your account! 🌟",
      "I don't recognize those credentials! 🔍 If you're new here, click \"Sign up\" below to start your cooking journey! 👨‍🍳",
      "Hmm, something's not matching! 👀 Don't have an account? The \"Sign up\" button below is your ticket in! 🎫",
      "Wrong password or email! 🔒 New here? Click \"Sign up\" below and let's get you cooking! 🍲",
    ],
    general: hasFirstName ? [
      `Oops ${firstName}! Something went wrong! 😅`,
      `${firstName}, there's an error! Let me help you fix it! 🔧`,
      `Something's not quite right ${firstName}! 👀`,
      `${firstName}, I see an issue! Let's fix it together! 💪`,
      `Error detected ${firstName}! Let's try again! 🔄`,
    ] : [
      "Oops! Something went wrong! 😅",
      "There's an error! Let me help you fix it! 🔧",
      "Something's not quite right! 👀",
      "I see an issue! Let's fix it together! 💪",
      "Error detected! Let's try again! 🔄",
    ],
  };
  
  return errorDialogues[errorType] || errorDialogues.general;
};

// Time-based greeting messages with first name
const getTimeBasedGreetings = (firstName: string = ''): string[] => {
  const hour = new Date().getHours();
  const hasFirstName = firstName.length > 0;
  
  if (hour >= 5 && hour < 12) {
    // Morning (5 AM - 11:59 AM)
    return hasFirstName ? [
      `Good morning ${firstName}! ☀️`,
      `Rise and shine ${firstName}! Ready to cook? 🌅`,
      `Morning ${firstName}! Let's start your day with great food! 🌞`,
      `Good morning ${firstName}! What's cooking today? 🍳`,
      `Morning sunshine ${firstName}! Welcome back! ☀️`,
      `Good morning ${firstName}! Ready for some delicious recipes? 🌅`,
      `Hello ${firstName}! Welcome back to Chefora! 👋`,
      `${firstName}, good morning! Let's cook something amazing! 🍳`,
    ] : [
      "Good morning! ☀️",
      "Rise and shine! Ready to cook? 🌅",
      "Morning! Let's start your day with great food! 🌞",
      "Good morning! What's cooking today? 🍳",
      "Morning sunshine! Welcome back! ☀️",
      "Good morning! Ready for some delicious recipes? 🌅",
    ];
  } else if (hour >= 12 && hour < 17) {
    // Afternoon (12 PM - 4:59 PM)
    return hasFirstName ? [
      `Good afternoon ${firstName}! 🌤️`,
      `Afternoon ${firstName}! Perfect time for a meal! 🍽️`,
      `Good afternoon ${firstName}! What are we cooking today? 🌞`,
      `Afternoon ${firstName}! Ready to explore some recipes? 🍳`,
      `Good afternoon ${firstName}! Let's make something tasty! 🌤️`,
      `Afternoon ${firstName}! Welcome back to Chefora! 🍽️`,
      `Hello ${firstName}! Welcome back! 👋`,
      `${firstName}, good afternoon! Let's cook! 🍳`,
    ] : [
      "Good afternoon! 🌤️",
      "Afternoon! Perfect time for a meal! 🍽️",
      "Good afternoon! What are we cooking today? 🌞",
      "Afternoon! Ready to explore some recipes? 🍳",
      "Good afternoon! Let's make something tasty! 🌤️",
      "Afternoon! Welcome back to Chefora! 🍽️",
    ];
  } else if (hour >= 17 && hour < 22) {
    // Evening (5 PM - 9:59 PM)
    return hasFirstName ? [
      `Good evening ${firstName}! 🌆`,
      `Evening ${firstName}! Time for dinner prep! 🍲`,
      `Good evening ${firstName}! What's on the menu tonight? 🌙`,
      `Evening ${firstName}! Let's cook something amazing! 🌆`,
      `Good evening ${firstName}! Ready to create magic in the kitchen? ✨`,
      `Evening ${firstName}! Welcome back! 🍽️`,
      `Hello ${firstName}! Welcome back to Chefora! 👋`,
      `${firstName}, good evening! Let's make dinner! 🍳`,
    ] : [
      "Good evening! 🌆",
      "Evening! Time for dinner prep! 🍲",
      "Good evening! What's on the menu tonight? 🌙",
      "Evening! Let's cook something amazing! 🌆",
      "Good evening! Ready to create magic in the kitchen? ✨",
      "Evening! Welcome back! 🍽️",
    ];
  } else {
    // Night (10 PM - 4:59 AM)
    return hasFirstName ? [
      `Good night ${firstName}! Or are you a night owl? 🦉`,
      `Late night cooking ${firstName}? I like your style! 🌙`,
      `Good evening ${firstName}! Still up and cooking? ⭐`,
      `Night owl ${firstName}! What are we making? 🌙`,
      `Good evening ${firstName}! Late night recipe session? 🦉`,
      `Evening ${firstName}! Perfect time for some comfort food! 🌆`,
      `Hello ${firstName}! Welcome back! 👋`,
      `${firstName}, still up? Let's cook! 🍳`,
    ] : [
      "Good night! Or are you a night owl? 🦉",
      "Late night cooking? I like your style! 🌙",
      "Good evening! Still up and cooking? ⭐",
      "Night owl! What are we making? 🌙",
      "Good evening! Late night recipe session? 🦉",
      "Evening! Perfect time for some comfort food! 🌆",
    ];
  }
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [splineLoaded, setSplineLoaded] = useState(false);
  const [activeDialogues, setActiveDialogues] = useState<Array<{
    id: string;
    text: string;
    top: number;
    left: number;
    fading: boolean;
  }>>([]);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>(''); // Store fetched user name
  const [firstName, setFirstName] = useState<string>(''); // Store first name only
  const splineRef = useRef<HTMLDivElement>(null);
  const splineAppRef = useRef<any>(null);
  const dialogueTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const formRef = useRef(form);
  const shownDialoguesRef = useRef<Set<string>>(new Set());
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Keep formRef updated
  useEffect(() => {
    formRef.current = form;
  }, [form]);

  // Check if user is already logged in and redirect if so
  useEffect(() => {
    // Only check once on mount, not repeatedly
    let isMounted = true;
    
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });
        const data = await res.json();
        if (isMounted && data.user && data.user.id) {
          // User is already logged in, redirect to dashboard
          console.log('[Login Page] User already authenticated, redirecting to dashboard');
          // Clear the justLoggedIn flag if it exists
          sessionStorage.removeItem('justLoggedIn');
          // Use window.location.replace to avoid adding to history and prevent back button issues
          window.location.replace('/dashboard');
        }
      } catch (err) {
        // Ignore errors, user is not logged in
        if (isMounted) {
          console.error('Auth check error:', err);
        }
      }
    };
    
    // Only check once after a short delay
    const timeout = setTimeout(checkAuth, 300);
    
    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, []);

  // Fetch user name from database when email is entered
  useEffect(() => {
    // Clear any existing timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Only fetch if email is valid format and has @ symbol
    if (!form.email || !form.email.includes('@')) {
      setUserName(''); // Clear name if email is invalid
      setFirstName('');
      return;
    }

    // Debounce the API call - wait 800ms after user stops typing
    fetchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/get-user-by-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email.trim() }),
        });

        const data = await res.json();
        if (res.ok && data.name) {
          setUserName(data.name);
          // Extract first name from full name
          const first = data.name.trim().split(' ')[0];
          setFirstName(first);
        } else {
          setUserName(''); // Clear if user not found
          setFirstName('');
        }
      } catch (err) {
        console.error('Error fetching user name:', err);
        setUserName(''); // Clear on error
        setFirstName('');
      }
    }, 800);

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [form.email]);

  // Generate position near/above bot's head - for form-related messages
  const getBotHeadPosition = (existingPositions: Array<{ top: number; left: number }> = []) => {
    // Bot's head/face is roughly at: 22-28% left, 32-38% top (avoid this area with more padding)
      const allActivePositions = [
        ...existingPositions,
        ...activeDialogues.map(d => ({ top: d.top, left: d.left }))
      ].filter(p => p.top >= 0 && p.top <= 100 && p.left >= 0 && p.left <= 100); // Filter out invalid positions
    
    let attempts = 0;
    let position;
    
    do {
      const positions = [
        // Far left side (well away from bot) - constrained to viewport (15-75% top, 5-70% left)
        { top: Math.min(20 + Math.random() * 10, 70), left: 5 + Math.random() * 5 },
        // Far left, middle height - constrained
        { top: Math.min(35 + Math.random() * 12, 70), left: 5 + Math.random() * 5 },
        // Far left, lower - constrained
        { top: Math.min(50 + Math.random() * 12, 70), left: 5 + Math.random() * 5 },
        // Above and far to the right of head (more space) - constrained
        { top: Math.min(20 + Math.random() * 8, 70), left: 35 + Math.random() * 8 },
        // Above and far to the left of head - constrained
        { top: Math.min(20 + Math.random() * 8, 70), left: 5 + Math.random() * 6 },
        // To the right side of head (further away) - constrained
        { top: Math.min(35 + Math.random() * 12, 70), left: 35 + Math.random() * 7 },
        // To the left side of head (further away) - constrained
        { top: Math.min(35 + Math.random() * 12, 70), left: 5 + Math.random() * 6 },
        // Above head, far to the right - constrained (min 18% from top)
        { top: Math.min(Math.max(18, 20 + Math.random() * 8), 70), left: 35 + Math.random() * 6 },
        // Above head, far to the left - constrained
        { top: Math.min(Math.max(18, 20 + Math.random() * 8), 70), left: 5 + Math.random() * 5 },
        // Below and far to the right - constrained
        { top: Math.min(50 + Math.random() * 12, 70), left: 35 + Math.random() * 7 },
        // Below and far to the left - constrained
        { top: Math.min(50 + Math.random() * 12, 70), left: 5 + Math.random() * 6 },
      ];
      
      position = positions[Math.floor(Math.random() * positions.length)];
      
      // Ensure position is within viewport bounds (accounting for dialogue size ~220px width, ~80px height)
      // Container starts at -20vh with 10vh padding, so viewport starts at ~12% of container height
      // Use more conservative bounds to prevent any cropping
      position.top = Math.max(15, Math.min(position.top, 75)); // Keep between 15% and 75% from top (accounts for container offset)
      position.left = Math.max(5, Math.min(position.left, 70)); // Keep between 5% and 70% from left (more padding for bubble width)
      
      attempts++;
      
      // Check if position is too close to bot's face (avoid 18-32% left, 28-42% top with more padding)
      const tooCloseToBot = position.left >= 15 && position.left <= 35 && 
                           position.top >= 25 && position.top <= 45;
      
      // Check if position is too close to existing dialogues
      const tooCloseToExisting = allActivePositions.some(existing => {
        const distance = Math.sqrt(
          Math.pow(position.top - existing.top, 2) + 
          Math.pow(position.left - existing.left, 2)
        );
        return distance < 12; // Minimum 12% distance between dialogues
      });
      
      if (!tooCloseToBot && !tooCloseToExisting) break;
      
    } while (attempts < 50);
    
    return position;
  };

  // Generate position around bot without covering it
  const getGreetingPosition = (existingPositions: Array<{ top: number; left: number }> = []) => {
    // Bot is at center-left: roughly 15-35% left, 25-55% top
    // We need to avoid this area completely
    let attempts = 0;
    let position;
    
    do {
      const zones = [
        // Top-left corner (safe zone) - constrained to viewport (15-75% top, 5-70% left)
        { top: Math.min(Math.random() * 15 + 18, 70), left: Math.random() * 10 + 5 },
        // Top-right of left panel (safe zone) - constrained
        { top: Math.min(Math.random() * 15 + 18, 70), left: Math.random() * 8 + 35 },
        // Left edge top (safe zone) - constrained
        { top: Math.min(Math.random() * 15 + 18, 70), left: Math.random() * 5 + 5 },
        // Left edge bottom (safe zone) - constrained
        { top: Math.min(Math.random() * 10 + 50, 70), left: Math.random() * 5 + 5 },
        // Bottom-left corner (safe zone) - constrained
        { top: Math.min(Math.random() * 10 + 60, 70), left: Math.random() * 10 + 5 },
        // Bottom-right of left panel (safe zone) - constrained
        { top: Math.min(Math.random() * 10 + 60, 70), left: Math.random() * 8 + 35 },
        // Far left edge middle (safe zone) - constrained
        { top: Math.min(Math.random() * 10 + 45, 70), left: Math.random() * 5 + 5 },
        // Far left edge top (safe zone) - constrained
        { top: Math.min(Math.random() * 15 + 18, 70), left: Math.random() * 5 + 5 },
        // Above and far to the right of head - constrained
        { top: Math.min(20 + Math.random() * 8, 70), left: 35 + Math.random() * 8 },
        // Above and far to the left of head - constrained
        { top: Math.min(20 + Math.random() * 8, 70), left: 5 + Math.random() * 6 },
        // To the right side of head - constrained
        { top: Math.min(35 + Math.random() * 12, 70), left: 35 + Math.random() * 7 },
        // To the left side of head - constrained
        { top: Math.min(35 + Math.random() * 12, 70), left: 5 + Math.random() * 6 },
      ];
      
      position = zones[Math.floor(Math.random() * zones.length)];
      
      // Ensure position is within viewport bounds (accounting for dialogue size ~220px width, ~80px height)
      // Container starts at -20vh with 10vh padding, so viewport starts at ~12% of container height
      // Use more conservative bounds to prevent any cropping
      position.top = Math.max(15, Math.min(position.top, 75)); // Keep between 15% and 75% from top (accounts for container offset)
      position.left = Math.max(5, Math.min(position.left, 70)); // Keep between 5% and 70% from left (more padding for bubble width)
      
      attempts++;
      
      // Check if position is too close to bot area (15-35% left, 25-55% top)
      const tooCloseToBot = position.left >= 12 && position.left <= 42 && 
                           position.top >= 20 && position.top <= 60;
      
      // Check if position is too close to existing dialogues
      const tooCloseToExisting = existingPositions.some(existing => {
        const distance = Math.sqrt(
          Math.pow(position.top - existing.top, 2) + 
          Math.pow(position.left - existing.left, 2)
        );
        return distance < 15; // Minimum 15% distance between dialogues
      });
      
      if (!tooCloseToBot && !tooCloseToExisting) break;
    } while (attempts < 30); // Max 30 attempts to find a good position
    
    return position;
  };

  // Show time-based greeting AFTER bot is fully loaded and visible
  useEffect(() => {
    if (!splineLoaded) return;

    // Wait 800ms for bot to be fully visible before showing dialogue
    const showDialogueTimeout = setTimeout(() => {
      // Use fetched first name if available
      const greetings = getTimeBasedGreetings(firstName);
      const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
      
      const position = getGreetingPosition();
      const id = `greeting-${Date.now()}`;

      setActiveDialogues([{
        id,
        text: randomGreeting,
        top: position.top,
        left: position.left,
        fading: false,
      }]);

      // Start fade-out after 5-7 seconds
      const fadeDelay = 5000 + Math.random() * 2000;
      const maxLifetime = 10000; // Maximum 10 seconds before forced removal
      
      // Main fade-out timeout
      const fadeTimeout = setTimeout(() => {
        setActiveDialogues(current => {
          const dialogue = current.find(d => d.id === id);
          if (!dialogue) return current;
          
          return current.map(d => 
            d.id === id ? { ...d, fading: true } : d
          );
        });
        
        // Remove after fade-out animation
        const removeTimeout = setTimeout(() => {
          setActiveDialogues(current => current.filter(d => d.id !== id));
          dialogueTimeoutsRef.current.delete(id);
          dialogueTimeoutsRef.current.delete(`${id}-max`);
        }, 500);
        
        dialogueTimeoutsRef.current.set(`${id}-remove`, removeTimeout);
      }, fadeDelay);

      // Safety timeout - force removal after max lifetime
      const maxLifetimeTimeout = setTimeout(() => {
        setActiveDialogues(current => current.filter(d => d.id !== id));
        
        // Clean up all related timeouts
        const fadeTimeout = dialogueTimeoutsRef.current.get(id);
        const removeTimeout = dialogueTimeoutsRef.current.get(`${id}-remove`);
        if (fadeTimeout) {
          clearTimeout(fadeTimeout);
          dialogueTimeoutsRef.current.delete(id);
        }
        if (removeTimeout) {
          clearTimeout(removeTimeout);
          dialogueTimeoutsRef.current.delete(`${id}-remove`);
        }
        dialogueTimeoutsRef.current.delete(`${id}-max`);
      }, maxLifetime);

      dialogueTimeoutsRef.current.set(id, fadeTimeout);
      dialogueTimeoutsRef.current.set(`${id}-max`, maxLifetimeTimeout);
    }, 800);

    return () => {
      // Clean up on unmount
      clearTimeout(showDialogueTimeout);
      dialogueTimeoutsRef.current.forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
      dialogueTimeoutsRef.current.clear();
    };
  }, [splineLoaded, firstName]); // Re-trigger greeting when first name is fetched

  // Check if a field has validation errors
  const checkFieldError = (fieldName: string, fieldElement: HTMLElement | null): boolean => {
    if (!fieldElement) return false;
    
    const fieldValue = formRef.current[fieldName as keyof typeof formRef.current];
    const isEmpty = !fieldValue || String(fieldValue).trim().length === 0;
    
    // Check for browser validation errors first
    if (fieldElement instanceof HTMLInputElement) {
      if (!fieldElement.validity.valid) {
        return true;
      }
      if (fieldElement.required && isEmpty) {
        return true;
      }
    }
    
    // Check for custom validation errors
    if (fieldName === 'email' && fieldValue) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(fieldValue).trim())) {
        return true;
      }
    }
    
    return false;
  };

  // Show field-specific dialogue when user finishes typing in a field
  const showFieldDialogue = (fieldName: string, fieldElement: HTMLElement | null = null) => {
    if (!splineLoaded) return;
    
    const currentForm = formRef.current;
    
    // First check if field has errors - if so, show error dialogue instead
    const hasError = checkFieldError(fieldName, fieldElement);
    if (hasError) {
      let errorType = fieldName;
      if (fieldName === 'email') {
        const fieldValue = currentForm.email;
        if (fieldValue) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(fieldValue.trim())) {
            errorType = 'emailInvalid';
          }
        }
      }
      showErrorDialogue(errorType);
      return;
    }
    
    // Field is valid, check if it has a value before showing regular dialogue
    const fieldValue = currentForm[fieldName as keyof typeof currentForm];
    if (!fieldValue || String(fieldValue).trim().length === 0) {
      return;
    }
    
    // Special handling for email field - show personalized welcome
    if (fieldName === 'email' && firstName) {
      if (!shownDialoguesRef.current.has(`email-welcome-${firstName}`)) {
        // Show personalized welcome first
        const welcomeMessages = [
          `Hello ${firstName}! Welcome back! 👋`,
          `Hey ${firstName}! Good to see you again! 😊`,
          `${firstName}! Welcome back to Chefora! 🍳`,
          `Welcome back ${firstName}! Ready to cook? 👨‍🍳`,
          `Hello ${firstName}! Let's get you logged in! 🚀`,
          `Hey ${firstName}! Welcome back! Let's continue cooking! ✨`,
        ];
        const welcomeMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
        shownDialoguesRef.current.add(`email-welcome-${firstName}`);
        
        // Show welcome message
        setTimeout(() => {
          setActiveDialogues(prev => {
            const cleaned = prev.filter(d => !(d.id.includes('field-email') && d.fading));
            if (cleaned.length >= 2) return cleaned;
            
            const existingPositions = cleaned.map(d => ({ top: d.top, left: d.left }));
            const position = getBotHeadPosition(existingPositions);
            const id = `field-email-welcome-${Date.now()}`;
            
            const fadeDelay = 4000 + Math.random() * 2000;
            const maxLifetime = 10000;
            
            const fadeTimeout = setTimeout(() => {
              setActiveDialogues(current => {
                const dialogue = current.find(d => d.id === id);
                if (!dialogue) return current;
                return current.map(d => d.id === id ? { ...d, fading: true } : d);
              });
              
              const removeTimeout = setTimeout(() => {
                setActiveDialogues(current => current.filter(d => d.id !== id));
                dialogueTimeoutsRef.current.delete(id);
                dialogueTimeoutsRef.current.delete(`${id}-max`);
                dialogueTimeoutsRef.current.delete(`${id}-remove`);
              }, 500);
              
              dialogueTimeoutsRef.current.set(`${id}-remove`, removeTimeout);
            }, fadeDelay);
            
            const maxLifetimeTimeout = setTimeout(() => {
              setActiveDialogues(current => current.filter(d => d.id !== id));
              const fadeTimeout = dialogueTimeoutsRef.current.get(id);
              const removeTimeout = dialogueTimeoutsRef.current.get(`${id}-remove`);
              if (fadeTimeout) {
                clearTimeout(fadeTimeout);
                dialogueTimeoutsRef.current.delete(id);
              }
              if (removeTimeout) {
                clearTimeout(removeTimeout);
                dialogueTimeoutsRef.current.delete(`${id}-remove`);
              }
              dialogueTimeoutsRef.current.delete(`${id}-max`);
            }, maxLifetime);
            
            dialogueTimeoutsRef.current.set(id, fadeTimeout);
            dialogueTimeoutsRef.current.set(`${id}-max`, maxLifetimeTimeout);
            
            return [...cleaned, {
              id,
              text: welcomeMessage,
              top: position.top,
              left: position.left,
              fading: false,
            }];
          });
        }, 300);
      }
    }
    
    const dialogues = getFieldDialogues(fieldName, currentForm, firstName);
    if (!dialogues || dialogues.length === 0) return;
    
    // Get dialogues that haven't been shown for this field
    const availableDialogues = dialogues.filter(d => {
      const dialogueKey = `${fieldName}-${d}`;
      return !shownDialoguesRef.current.has(dialogueKey);
    });
    
    let randomDialogue: string;
    let dialogueKey: string;
    
    if (availableDialogues.length === 0) {
      // All dialogues shown, loop back
      randomDialogue = dialogues[Math.floor(Math.random() * dialogues.length)];
      dialogueKey = `${fieldName}-${randomDialogue}`;
    } else {
      randomDialogue = availableDialogues[Math.floor(Math.random() * availableDialogues.length)];
      dialogueKey = `${fieldName}-${randomDialogue}`;
      shownDialoguesRef.current.add(dialogueKey);
    }
    
    // Clear existing field dialogues
    setActiveDialogues(prev => {
      prev.forEach(d => {
        if (d.id.includes('field-')) {
          const fadeTimeout = dialogueTimeoutsRef.current.get(d.id);
          const removeTimeout = dialogueTimeoutsRef.current.get(`${d.id}-remove`);
          const maxTimeout = dialogueTimeoutsRef.current.get(`${d.id}-max`);
          
          if (fadeTimeout) {
            clearTimeout(fadeTimeout);
            dialogueTimeoutsRef.current.delete(d.id);
          }
          if (removeTimeout) {
            clearTimeout(removeTimeout);
            dialogueTimeoutsRef.current.delete(`${d.id}-remove`);
          }
          if (maxTimeout) {
            clearTimeout(maxTimeout);
            dialogueTimeoutsRef.current.delete(`${d.id}-max`);
          }
        }
      });
      
      return prev.map(d => d.id.includes('field-') ? { ...d, fading: true } : d);
    });
    
    // Show new field dialogue after a short delay
    setTimeout(() => {
      setActiveDialogues(prev => {
        const cleaned = prev.filter(d => !(d.id.includes('field-') && d.fading));
        
        if (cleaned.length >= 2) return cleaned;
        
        const existingPositions = cleaned.map(d => ({ top: d.top, left: d.left }));
        const position = getBotHeadPosition(existingPositions);
        const id = `field-${fieldName}-${Date.now()}`;
        
        const fadeDelay = 4000 + Math.random() * 2000;
        const maxLifetime = 10000;
        
        const fadeTimeout = setTimeout(() => {
          setActiveDialogues(current => {
            const dialogue = current.find(d => d.id === id);
            if (!dialogue) return current;
            
            return current.map(d => 
              d.id === id ? { ...d, fading: true } : d
            );
          });
          
          const removeTimeout = setTimeout(() => {
            setActiveDialogues(current => current.filter(d => d.id !== id));
            dialogueTimeoutsRef.current.delete(id);
            dialogueTimeoutsRef.current.delete(`${id}-max`);
            dialogueTimeoutsRef.current.delete(`${id}-remove`);
          }, 500);
          
          dialogueTimeoutsRef.current.set(`${id}-remove`, removeTimeout);
        }, fadeDelay);
        
        const maxLifetimeTimeout = setTimeout(() => {
          setActiveDialogues(current => current.filter(d => d.id !== id));
          
          const fadeTimeout = dialogueTimeoutsRef.current.get(id);
          const removeTimeout = dialogueTimeoutsRef.current.get(`${id}-remove`);
          if (fadeTimeout) {
            clearTimeout(fadeTimeout);
            dialogueTimeoutsRef.current.delete(id);
          }
          if (removeTimeout) {
            clearTimeout(removeTimeout);
            dialogueTimeoutsRef.current.delete(`${id}-remove`);
          }
          dialogueTimeoutsRef.current.delete(`${id}-max`);
        }, maxLifetime);
        
        dialogueTimeoutsRef.current.set(id, fadeTimeout);
        dialogueTimeoutsRef.current.set(`${id}-max`, maxLifetimeTimeout);
        
        return [...cleaned, {
          id,
          text: randomDialogue,
          top: position.top,
          left: position.left,
          fading: false,
        }];
      });
    }, 500);
  };

  // Show error dialogue when validation fails
  const showErrorDialogue = (errorType: string) => {
    if (!splineLoaded) return;
    
    const errorDialogues = getErrorDialogues(errorType, formRef.current, firstName);
    if (errorDialogues.length === 0) return;
    
    const randomDialogue = errorDialogues[Math.floor(Math.random() * errorDialogues.length)];
    
    setActiveDialogues(prev => {
      // Clear existing error dialogues
      prev.forEach(d => {
        if (d.id.includes('error-')) {
          const fadeTimeout = dialogueTimeoutsRef.current.get(d.id);
          const removeTimeout = dialogueTimeoutsRef.current.get(`${d.id}-remove`);
          const maxTimeout = dialogueTimeoutsRef.current.get(`${d.id}-max`);
          
          if (fadeTimeout) {
            clearTimeout(fadeTimeout);
            dialogueTimeoutsRef.current.delete(d.id);
          }
          if (removeTimeout) {
            clearTimeout(removeTimeout);
            dialogueTimeoutsRef.current.delete(`${d.id}-remove`);
          }
          if (maxTimeout) {
            clearTimeout(maxTimeout);
            dialogueTimeoutsRef.current.delete(`${d.id}-max`);
          }
        }
      });
      
      const cleaned = prev.filter(d => !d.id.includes('error-'));
      const existingPositions = cleaned.map(d => ({ top: d.top, left: d.left }));
      const position = getBotHeadPosition(existingPositions);
      const id = `error-${errorType}-${Date.now()}`;
      
      const fadeDelay = 5000 + Math.random() * 2000;
      const maxLifetime = 10000;
      
      const fadeTimeout = setTimeout(() => {
        setActiveDialogues(current => {
          const dialogue = current.find(d => d.id === id);
          if (!dialogue) return current;
          
          return current.map(d => 
            d.id === id ? { ...d, fading: true } : d
          );
        });
        
        const removeTimeout = setTimeout(() => {
          setActiveDialogues(current => current.filter(d => d.id !== id));
          dialogueTimeoutsRef.current.delete(id);
          dialogueTimeoutsRef.current.delete(`${id}-max`);
          dialogueTimeoutsRef.current.delete(`${id}-remove`);
        }, 500);
        
        dialogueTimeoutsRef.current.set(`${id}-remove`, removeTimeout);
      }, fadeDelay);
      
      const maxLifetimeTimeout = setTimeout(() => {
        setActiveDialogues(current => current.filter(d => d.id !== id));
        
        const fadeTimeout = dialogueTimeoutsRef.current.get(id);
        const removeTimeout = dialogueTimeoutsRef.current.get(`${id}-remove`);
        if (fadeTimeout) {
          clearTimeout(fadeTimeout);
          dialogueTimeoutsRef.current.delete(id);
        }
        if (removeTimeout) {
          clearTimeout(removeTimeout);
          dialogueTimeoutsRef.current.delete(`${id}-remove`);
        }
        dialogueTimeoutsRef.current.delete(`${id}-max`);
      }, maxLifetime);
      
      dialogueTimeoutsRef.current.set(id, fadeTimeout);
      dialogueTimeoutsRef.current.set(`${id}-max`, maxLifetimeTimeout);
      
      return [...cleaned, {
        id,
        text: randomDialogue,
        top: position.top,
        left: position.left,
        fading: false,
      }];
    });
  };

  // Forward pointer events to Spline for full-screen interaction
  useEffect(() => {
    if (!splineLoaded) return;
    
    const forwardPointerEvents = (e: PointerEvent) => {
      // Only forward if not clicking on form elements
      const target = e.target as HTMLElement;
      if (target.closest('.auth-form-card input, .auth-form-card button, .auth-form-card select, .auth-form-card a')) {
        return; // Don't forward events when interacting with form elements
      }

      if (splineRef.current) {
        const canvas = splineRef.current.querySelector('canvas');
        if (canvas) {
          const event = new PointerEvent(e.type, {
            pointerId: e.pointerId,
            pointerType: e.pointerType,
            isPrimary: e.isPrimary,
            clientX: e.clientX,
            clientY: e.clientY,
            buttons: e.buttons,
            button: e.button,
            bubbles: true,
            cancelable: true,
          });
          canvas.dispatchEvent(event);
        }
      }
    };

    document.addEventListener('pointermove', forwardPointerEvents, { passive: true });
    document.addEventListener('pointerdown', forwardPointerEvents, { passive: true });
    document.addEventListener('pointerup', forwardPointerEvents, { passive: true });

    return () => {
      document.removeEventListener('pointermove', forwardPointerEvents);
      document.removeEventListener('pointerdown', forwardPointerEvents);
      document.removeEventListener('pointerup', forwardPointerEvents);
    };
  }, [splineLoaded]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(false); // Don't set loading until validation passes

    // Client-side validation
    if (!form.email.trim()) {
      setError('Email is required');
      showErrorDialogue('email');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      setError('Please enter a valid email address');
      showErrorDialogue('emailInvalid');
      return;
    }

    if (!form.password.trim()) {
      setError('Password is required');
      showErrorDialogue('password');
      return;
    }

    // All validation passed, proceed with submission
    setLoading(true);

    try {
      // Always redirect to dashboard after login
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          redirectTo: '/dashboard',
        }),
        credentials: 'include', // Ensure cookies are included
      });

      const data = await res.json();
      if (!res.ok) {
        // Handle server-side errors
        const errorMessage = data.error || 'Invalid credentials';
        setError(errorMessage);
        setLoading(false);
        
        // Show appropriate error dialogue
        if (errorMessage.toLowerCase().includes('invalid') || 
            errorMessage.toLowerCase().includes('credentials') ||
            errorMessage.toLowerCase().includes('wrong')) {
          showErrorDialogue('invalidCredentials');
        } else if (errorMessage.toLowerCase().includes('email')) {
          showErrorDialogue('emailInvalid');
        } else {
          showErrorDialogue('general');
        }
        return;
      }

      // Login successful - cookie is set in the response
      console.log('[Login] Login successful, cookie set. Verifying and redirecting...');
      
      // Wait a moment for browser to process the cookie, then verify and redirect
      setTimeout(async () => {
        try {
          // Verify the cookie is available
          const verifyRes = await fetch('/api/auth/me', {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
          });
          
          const verifyData = await verifyRes.json();
          
          if (verifyData.user && verifyData.user.id) {
            console.log('[Login] Cookie verified, redirecting to dashboard');
            // Cookie is confirmed, redirect directly to dashboard
            window.location.replace('/dashboard');
          } else {
            console.warn('[Login] Cookie not yet available, waiting...');
            // Retry after a delay
            setTimeout(() => {
              window.location.replace('/dashboard');
            }, 1000);
          }
        } catch (err) {
          console.error('[Login] Error verifying cookie:', err);
          // On error, redirect anyway
          window.location.replace('/dashboard');
        }
      }, 500);
    } catch (err) {
      console.error(err);
      setError('Network error');
      setLoading(false);
      showErrorDialogue('general');
    }
  }

  return (
    <div className="auth-page-container">
      {/* Animated background */}
      <div className="auth-bg-animated">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      <div className="auth-layout">
        {/* Left side - 3D Spline Scene */}
        <div 
          className={`auth-3d-panel ${splineLoaded ? 'spline-loaded' : 'spline-loading'}`} 
          ref={splineRef}
        >
          <Spline
            scene="https://prod.spline.design/REr-djaDUZ9Wm2hB/scene.splinecode"
            onLoad={(app: any) => {
              splineAppRef.current = app;
              console.log('Spline scene loaded, app:', app);
              
              // Show immediately after load - no delay needed
              setSplineLoaded(true);
            }}
          />
          
          {/* Time-based Greeting Dialogues */}
          {activeDialogues.map((dialogue) => (
            <div
              key={dialogue.id}
              className={`bot-dialogue-tile ${dialogue.fading ? 'dialogue-fading' : ''}`}
              style={{
                top: `${dialogue.top}%`,
                left: `${dialogue.left}%`,
              }}
            >
              <div className="bot-dialogue-content">
                <div className="bot-dialogue-bubble">
                  <p className="bot-dialogue-text">{dialogue.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Login Form */}
        <div className="auth-form-panel">
          <div className="auth-form-card">
            <div className="auth-form-header">
              <div className="auth-logo-wrapper">
                <div className="auth-logo-glow"></div>
                <h1 className="auth-title">Welcome back</h1>
              </div>
              <div className="auth-logo-image-wrapper">
                <img
                  src="/assets/chefora-logo.svg"
                  alt="Chefora"
                  className="auth-logo-image"
                />
              </div>
              <p className="auth-subtitle">
                Log in to continue with Chefora
          </p>
            </div>

            <form 
              onSubmit={handleSubmit} 
              onInvalid={(e) => {
                // Catch browser validation errors
                const target = e.target as HTMLElement;
                if (target instanceof HTMLInputElement) {
                  const fieldName = target.name || target.id || '';
                  if (fieldName) {
                    const fieldMap: Record<string, string> = {
                      'email': 'email',
                      'password': 'password',
                    };
                    const mappedField = fieldMap[fieldName] || fieldName;
                    showErrorDialogue(mappedField);
                  } else {
                    showErrorDialogue('general');
                  }
                }
              }}
              className="auth-form"
            >
              <div className="auth-input-group">
                <label className="auth-label">Email</label>
                <div className="auth-input-wrapper">
                  <svg
                    className="auth-input-icon"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                    />
                  </svg>
            <input
                    name="email"
                    className="auth-input-modern"
                    placeholder="Enter your email"
              type="email"
              value={form.email}
              onChange={e =>
                setForm(prev => ({
                  ...prev,
                  email: e.target.value,
                }))
              }
                    onFocus={() => setFocusedField('email')}
                    onBlur={(e) => {
                      setFocusedField(null);
                      showFieldDialogue('email', e.target as HTMLElement);
                    }}
                    required
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-label">Password</label>
                <div className="auth-input-wrapper">
                  <svg
                    className="auth-input-icon"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
            <input
                    name="password"
                    className="auth-input-modern"
                    placeholder="Enter your password"
              type="password"
              value={form.password}
              onChange={e =>
                setForm(prev => ({
                  ...prev,
                  password: e.target.value,
                }))
              }
                    onFocus={() => setFocusedField('password')}
                    onBlur={(e) => {
                      setFocusedField(null);
                      showFieldDialogue('password', e.target as HTMLElement);
                    }}
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="auth-error-message">
                  <svg
                    className="auth-error-icon"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {error}
                </div>
              )}

            <button
              type="submit"
                className="auth-btn-modern-primary"
              disabled={loading}
            >
                {loading ? (
                  <>
                    <span className="auth-btn-spinner"></span>
                    Logging in…
                  </>
                ) : (
                  <>
                    Log in
                    <svg
                      className="auth-btn-arrow"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </>
                )}
            </button>

              <div className="auth-divider">
                <span>or</span>
              </div>

            <button
              type="button"
                className="auth-btn-modern-secondary"
              onClick={() => alert('Hook this to Google OAuth later')}
            >
                <svg
                  className="auth-google-icon"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              Continue with Google
            </button>

              <button
                type="button"
                className="auth-forgot-link"
                onClick={() => alert('Forgot password feature coming soon')}
              >
                Forgot password?
              </button>
          </form>

            <div className="auth-footer">
              <p className="auth-footer-text">
            Don&apos;t have an account?{' '}
            <button
              type="button"
                  className="auth-link-modern"
              onClick={() => router.push('/signup')}
            >
              Sign up
            </button>
          </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
