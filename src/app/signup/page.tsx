'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const Spline = dynamic(() => import('@splinetool/react-spline').then((mod) => mod.default), {
  ssr: false,
});

const botDialogues = [
  "Hey there, chef! 👋",
  "Are you new here? Welcome!",
  "How's your day going?",
  "Ready to start your cooking journey?",
  "I'm here to help you cook amazing meals!",
  "Let's create something delicious together!",
  "What are you planning to cook today?",
  "I'm excited to meet you!",
  "Welcome to Chefora! 🍳",
  "Let's make cooking fun and easy!",
  "I'll be your cooking assistant!",
  "Ready to explore new recipes?",
];

type SignupForm = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  country: string;
  timeZone: string;
  cookFrequency: string;
};

const getPersonalizedDialogues = (name: string): string[] => {
  const firstName = name.split(' ')[0]; 
  return [
    `Oh! You're ${firstName}! 😊`,
    `Let's cook, ${firstName}! 🍳`,
    `Hey ${firstName}, ready to make magic? ✨`,
    `${firstName}, I've been waiting for you! 💫`,
    `Welcome ${firstName}! Let's create something amazing! 🎨`,
    `Ooh, ${firstName}! I like that name! 😉`,
    `${firstName}, you're going to love this! 💕`,
    `Hey ${firstName}! Ready to become a chef? 👨‍🍳`,
    `${firstName}, let's make your kitchen legendary! 🔥`,
    `So ${firstName}, what's cooking? 😄`,
    `${firstName}! I'm so excited to cook with you! 🎉`,
    `Hey ${firstName}, let's turn up the heat! 🌶️`,
    `${firstName}, you've got great taste! 😎`,
    `Welcome aboard, ${firstName}! Let's get cooking! 🚀`,
    `${firstName}, I can already tell we'll make a great team! 💪`,
  ];
};

const getFieldDialogues = (fieldName: string, formData: SignupForm) => {
  const firstName = formData.name.trim().split(' ')[0] || 'chef';
  const hasName = formData.name.trim().length > 0;
  const country = formData.country.trim();
  const hasCountry = country.length > 0;
  
  const baseDialogues: Record<string, string[]> = {
    name: hasName ? [
      `Nice name ${firstName}! I like it! 😊`,
      `That's a beautiful name ${firstName}! ✨`,
      `Ooh ${firstName}, I'm going to remember that name! 💫`,
      `Great name ${firstName}! Let's make it famous! 🎨`,
      `I love that name ${firstName}! We're going to be great friends! 💕`,
      `${firstName}, that name sounds like a chef's name! 👨‍🍳`,
      `Perfect ${firstName}! Now I know what to call you! 😄`,
      `I'll remember ${firstName} forever! 🎉`,
      `Wow ${firstName}, that's a chef-worthy name! 🔥`,
      `I'm already a fan of ${firstName}! ⭐`,
      `Hey ${firstName}! That's a great name! 👋`,
      `${firstName}, I'm so excited to meet you! 💫`,
      `Welcome ${firstName}! Let's start cooking! 🍳`,
      `${firstName}, you have an amazing name! 🌟`,
    ] : [
      "Nice name! I like it! 😊",
      "That's a beautiful name! ✨",
      "Ooh, I'm going to remember that name! 💫",
      "Great name! Let's make it famous! 🎨",
      "I love that name! We're going to be great friends! 💕",
      "That name sounds like a chef's name! 👨‍🍳",
      "Perfect! Now I know what to call you! 😄",
      "I'll remember that name forever! 🎉",
      "Wow, that's a chef-worthy name! 🔥",
      "I'm already a fan of that name! ⭐",
    ],
    email: hasName ? [
      `Got it ${firstName}! I'll send you amazing recipes there! 📧`,
      `Perfect ${firstName}! Your recipe collection awaits! ✨`,
      `${firstName}, I'll make sure to send you the best cooking tips! 💌`,
      `Great ${firstName}! Expect some delicious surprises in your inbox! 🎁`,
      `Your email is safe with me, ${firstName}! 🔒`,
      `${firstName}, I'll keep you updated on all the tasty stuff! 🍳`,
      `Perfect ${firstName}! Now I can send you personalized recipes! 📬`,
      `Got your email ${firstName}! Let's cook up something special! 🎨`,
      `${firstName}, email saved! Prepare for recipe overload! 📮`,
      `I'll spam you ${firstName}... with amazing recipes! 😉`,
    ] : [
      "Got it! I'll send you amazing recipes there! 📧",
      "Perfect! Your recipe collection awaits! ✨",
      "I'll make sure to send you the best cooking tips! 💌",
      "Great! Expect some delicious surprises in your inbox! 🎁",
      "Your email is safe with me! 🔒",
      "I'll keep you updated on all the tasty stuff! 🍳",
      "Perfect! Now I can send you personalized recipes! 📬",
      "Got your email! Let's cook up something special! 🎨",
      "Email saved! Prepare for recipe overload! 📮",
      "I'll spam you... with amazing recipes! 😉",
    ],
    country: hasCountry ? (hasName ? [
      `Ooh ${firstName}, I love ${country}! What's the food like there? 🌍`,
      `Great choice ${firstName}! I'd love to learn recipes from ${country}! 🗺️`,
      `${firstName}, that's an amazing place! Let's explore their cuisine! 🍜`,
      `${firstName}, I'm curious about the cooking traditions in ${country}! 👨‍🍳`,
      `Wonderful ${firstName}! Every country has unique flavors! 🌶️`,
      `${firstName}, I'd love to cook dishes from ${country}! 🍲`,
      `${firstName}, ${country} has amazing food culture! Let's explore! 🎨`,
      `Perfect ${firstName}! I'll help you cook authentic ${country} dishes! ✨`,
      `${firstName}, I'm already researching recipes from ${country}! 🔍`,
      `${firstName}, ${country}'s food is legendary! Let's master it! 👑`,
    ] : [
      `Ooh, I love ${country}! What's the food like there? 🌍`,
      `Great choice! I'd love to learn recipes from ${country}! 🗺️`,
      `That's an amazing place! Let's explore their cuisine! 🍜`,
      `I'm curious about the cooking traditions in ${country}! 👨‍🍳`,
      `Wonderful! Every country has unique flavors! 🌶️`,
      `I'd love to cook dishes from ${country}! 🍲`,
      `${country} has amazing food culture! Let's explore! 🎨`,
      `Perfect! I'll help you cook authentic ${country} dishes! ✨`,
      `I'm already researching recipes from ${country}! 🔍`,
      `${country}'s food is legendary! Let's master it! 👑`,
    ]) : [
      "Tell me about your country! 🌍",
      "I'd love to know where you're from! 🗺️",
      "What country are you in? Let's explore their cuisine! 🍜",
      "Share your country and I'll help with authentic recipes! 👨‍🍳",
      "Every country has unique flavors! 🌶️",
      "I'd love to cook dishes from your country! 🍲",
      "Your country's food culture must be amazing! 🎨",
      "Perfect! Share your country and I'll help! ✨",
      "I'm ready to research recipes from your country! 🔍",
      "Your country's food is probably legendary! 👑",
    ],
    timeZone: hasName ? [
      `Perfect timing ${firstName}! I'll know when to send you recipes! ⏰`,
      `Got it ${firstName}! I'll schedule everything perfectly! 🕐`,
      `Great ${firstName}! Now I know your cooking schedule! 📅`,
      `${firstName}, timing is everything in cooking! ⏱️`,
      `${firstName}, I'll make sure recipes arrive at the right time! 🎯`,
      `Got your timezone ${firstName}! Let's sync our cooking! 🔄`,
      `Perfect ${firstName}! Now I can time everything perfectly! ⏲️`,
      `${firstName}, timing makes all the difference! 🕰️`,
      `${firstName}, timezone locked! I'll wake you up with recipes! ☕`,
      `Perfect ${firstName}! I'll know when you're ready to cook! 🍳`,
    ] : [
      "Perfect timing! I'll know when to send you recipes! ⏰",
      "Got it! I'll schedule everything perfectly! 🕐",
      "Great! Now I know your cooking schedule! 📅",
      "Perfect! Timing is everything in cooking! ⏱️",
      "I'll make sure recipes arrive at the right time! 🎯",
      "Got your timezone! Let's sync our cooking! 🔄",
      "Perfect! Now I can time everything perfectly! ⏲️",
      "Great! Timing makes all the difference! 🕰️",
      "Timezone locked! I'll wake you up with recipes! ☕",
      "Perfect! I'll know when you're ready to cook! 🍳",
    ],
    password: hasName ? [
      `I'm not looking ${firstName}! 👀`,
      `Oooooo ${firstName}, I got your password, fear me now! 😈`,
      `${firstName}, that's your password? A kid could crack that! 😂`,
      `Don't worry ${firstName}, I'm a robot, I can't remember it! 🤖`,
      `Your secret is safe with me ${firstName}! (I'm just kidding, I saw it) 😏`,
      `I won't tell anyone ${firstName}... maybe! 😉`,
      `${firstName}, password? What password? I saw nothing! 🙈`,
      `I'm closing my eyes ${firstName}... but I already saw it! 😅`,
      `Don't worry ${firstName}, I'm not a hacker... or am I? 🕵️`,
      `I'll keep your password safe ${firstName}... in my memory! 🧠`,
      `${firstName}, that's a password? Interesting choice! 🤔`,
      `I'm not judging ${firstName}, but that's an interesting password! 😄`,
      `${firstName}, password locked! (In my memory forever) 🔐`,
      `I saw it ${firstName}, but I'll pretend I didn't! 😇`,
    ] : [
      "I'm not looking! 👀",
      "Oooooo I got your password, fear me now! 😈",
      "That's your password? A kid could crack that! 😂",
      "Don't worry, I'm a robot, I can't remember it! 🤖",
      "Your secret is safe with me! (I'm just kidding, I saw it) 😏",
      "I won't tell anyone... maybe! 😉",
      "Password? What password? I saw nothing! 🙈",
      "I'm closing my eyes... but I already saw it! 😅",
      "Don't worry, I'm not a hacker... or am I? 🕵️",
      "I'll keep your password safe... in my memory! 🧠",
      "That's a password? Interesting choice! 🤔",
      "I'm not judging, but that's an interesting password! 😄",
      "Password locked! (In my memory forever) 🔐",
      "I saw it, but I'll pretend I didn't! 😇",
    ],
    confirmPassword: hasName ? [
      `Double checking ${firstName}? Smart move! 🧠`,
      `I see you're being careful ${firstName}! Good! 👍`,
      `Making sure it matches ${firstName}? I like that! ✅`,
      `Double the security ${firstName}, double the fun! 🔒`,
      `I'm still not looking ${firstName}... promise! 👀`,
      `Confirming passwords like a pro ${firstName}! 💪`,
      `Good ${firstName}! Always double-check important things! ✨`,
      `${firstName}, I see you're thorough! That's a chef's trait! 👨‍🍳`,
      `Double confirmation ${firstName}? You're security-conscious! 🛡️`,
      `Matching passwords ${firstName}? Perfect! You're all set! 🎯`,
    ] : [
      "Double checking? Smart move! 🧠",
      "I see you're being careful! Good! 👍",
      "Making sure it matches? I like that! ✅",
      "Double the security, double the fun! 🔒",
      "I'm still not looking... promise! 👀",
      "Confirming passwords like a pro! 💪",
      "Good! Always double-check important things! ✨",
      "I see you're thorough! That's a chef's trait! 👨‍🍳",
      "Double confirmation? You're security-conscious! 🛡️",
      "Matching passwords? Perfect! You're all set! 🎯",
    ],
  };
  
  return baseDialogues[fieldName] || [];
};

const getCookFrequencyDialogues = (frequency: string, formData: SignupForm) => {
  const firstName = formData.name.trim().split(' ')[0] || 'chef';
  const hasName = formData.name.trim().length > 0;
  const country = formData.country.trim();
  const hasCountry = country.length > 0;
  
  const dialogues: Record<string, string[]> = {
    rarely: hasName ? [
      `Rarely ${firstName}? Let's change that! I'll make you love cooking! 🍳`,
      `No worries ${firstName}! I'll help you cook more often! 👨‍🍳`,
      `Rarely ${firstName}? Challenge accepted! Let's make it daily! 🔥`,
      `${firstName}, I see a future chef in you! Let's unlock it! ✨`,
      `Rarely cooking ${firstName}? We're about to change that game! 🚀`,
      `Don't worry ${firstName}, I'll make cooking addictive! 💉`,
      `Rarely ${firstName}? I'll turn you into a cooking machine! 🤖`,
      `${firstName}, let's make 'rarely' become 'always'! 💪`,
    ] : [
      "Rarely? Let's change that! I'll make you love cooking! 🍳",
      "No worries! I'll help you cook more often! 👨‍🍳",
      "Rarely? Challenge accepted! Let's make it daily! 🔥",
      "I see a future chef in you! Let's unlock it! ✨",
      "Rarely cooking? We're about to change that game! 🚀",
      "Don't worry, I'll make cooking addictive! 💉",
      "Rarely? I'll turn you into a cooking machine! 🤖",
      "Let's make 'rarely' become 'always'! 💪",
    ],
    sometimes: hasName ? [
      `Sometimes ${firstName}? Let's make it 'often'! I'll help! 🍳`,
      `Good start ${firstName}! Let's level up your cooking game! 📈`,
      `Sometimes is better than never ${firstName}! Let's do more! 🔥`,
      `${firstName}, I'll help you cook more frequently! 👨‍🍳`,
      `Sometimes ${firstName}? How about we make it a habit? ✨`,
      `You're on the right track ${firstName}! Let's cook more! 🚀`,
      `${firstName}, sometimes is a great foundation! Let's build on it! 💪`,
      `I'll make you want to cook every day ${firstName}! 😉`,
    ] : [
      "Sometimes? Let's make it 'often'! I'll help! 🍳",
      "Good start! Let's level up your cooking game! 📈",
      "Sometimes is better than never! Let's do more! 🔥",
      "I'll help you cook more frequently! 👨‍🍳",
      "Sometimes? How about we make it a habit? ✨",
      "You're on the right track! Let's cook more! 🚀",
      "Sometimes is a great foundation! Let's build on it! 💪",
      "I'll make you want to cook every day! 😉",
    ],
    daily: hasName ? [
      `Daily ${firstName}? You're already a pro! Let's master it! 👑`,
      `Daily cooking ${firstName}? I love your dedication! 🔥`,
      `${firstName}, you're a true chef! Let's explore new recipes! 🍳`,
      `Daily ${firstName}? You're my kind of person! Let's cook! 👨‍🍳`,
      `A daily cook ${firstName}! I'm so excited to work with you! ✨`,
      `Daily ${firstName}? You're going to love what I have in store! 🚀`,
      `A daily chef ${firstName}! Let's discover amazing recipes together! 💎`,
      `Daily cooking ${firstName}? We're going to be best friends! 💕`,
    ] : [
      "Daily? You're already a pro! Let's master it! 👑",
      "Daily cooking? I love your dedication! 🔥",
      "You're a true chef! Let's explore new recipes! 🍳",
      "Daily? You're my kind of person! Let's cook! 👨‍🍳",
      "A daily cook! I'm so excited to work with you! ✨",
      "Daily? You're going to love what I have in store! 🚀",
      "A daily chef! Let's discover amazing recipes together! 💎",
      "Daily cooking? We're going to be best friends! 💕",
    ],
  };
  
  return dialogues[frequency] || [];
};

const getErrorDialogues = (errorType: string, formData: SignupForm): string[] => {
  const firstName = formData.name.trim().split(' ')[0] || 'chef';
  const hasName = formData.name.trim().length > 0;
  
  const errorDialogues: Record<string, string[]> = {
    name: hasName ? [
      `Hey ${firstName}, I need your full name! 😊`,
      `${firstName}, don't you wanna share your name with me? 👀`,
      `Come on ${firstName}, I need to know what to call you! 😄`,
      `${firstName}, your name is required! Don't be shy! 😉`,
      `Hey ${firstName}, I can't help you without your name! 🤖`,
    ] : [
      "Don't you wanna share your name with me? 👀",
      "I need your name! Don't be shy! 😊",
      "Come on, I need to know what to call you! 😄",
      "Your name is required! I'm waiting! 😉",
      "I can't help you without your name! 🤖",
      "Hey! What should I call you? 👋",
      "Name please! I'm curious! 🔍",
    ],
    email: hasName ? [
      `Uh oh ${firstName}, I need your email! 📧`,
      `${firstName}, how can I send you recipes without an email? 😅`,
      `Hey ${firstName}, your email is missing! Check again! 👀`,
      `${firstName}, I need a valid email address! 🔍`,
      `Oops ${firstName}! Email is required! 😊`,
      `${firstName}, no email = no recipes! 📬`,
    ] : [
      "Uh oh, I need your email! 📧",
      "How can I send you recipes without an email? 😅",
      "Your email is missing! Check again! 👀",
      "I need a valid email address! 🔍",
      "Oops! Email is required! 😊",
      "No email = no recipes! 📬",
      "Email please! I need to contact you! 📮",
    ],
    password: hasName ? [
      `Hey ${firstName}, you need a password! 🔒`,
      `${firstName}, passwords are important! Don't forget! 😊`,
      `Oops ${firstName}! Password is required! 🔐`,
      `${firstName}, I can't let you in without a password! 🚪`,
      `Hey ${firstName}, secure your account with a password! 💪`,
    ] : [
      "Hey, you need a password! 🔒",
      "Passwords are important! Don't forget! 😊",
      "Oops! Password is required! 🔐",
      "I can't let you in without a password! 🚪",
      "Secure your account with a password! 💪",
      "Password please! Safety first! 🛡️",
    ],
    passwordMismatch: hasName ? [
      `Uh oh ${firstName}! Your passwords don't match! 😅`,
      `${firstName}, the passwords need to be the same! 🔄`,
      `Oops ${firstName}! Passwords don't match! Try again! 😊`,
      `${firstName}, I see two different passwords! Make them match! 👀`,
      `Hey ${firstName}, passwords need to match! 🔒`,
      `${firstName}, one password, two fields, same value! Got it? 😄`,
    ] : [
      "Uh oh! Your passwords don't match! 😅",
      "The passwords need to be the same! 🔄",
      "Oops! Passwords don't match! Try again! 😊",
      "I see two different passwords! Make them match! 👀",
      "Passwords need to match! 🔒",
      "One password, two fields, same value! Got it? 😄",
    ],
    passwordTooShort: hasName ? [
      `Hey ${firstName}, that password is too short! Make it longer! 📏`,
      `${firstName}, your password needs to be stronger! 💪`,
      `Oops ${firstName}! Password is too short! Make it at least 6 characters! 🔐`,
      `${firstName}, I need a longer password for security! 🛡️`,
    ] : [
      "That password is too short! Make it longer! 📏",
      "Your password needs to be stronger! 💪",
      "Password is too short! Make it at least 6 characters! 🔐",
      "I need a longer password for security! 🛡️",
    ],
    emailInvalid: hasName ? [
      `Uh oh ${firstName}! That email doesn't look right! 📧`,
      `${firstName}, that email format is invalid! Check it again! 👀`,
      `Hey ${firstName}, I need a valid email address! 🔍`,
      `${firstName}, that's not a proper email! Try again! 😊`,
    ] : [
      "Uh oh! That email doesn't look right! 📧",
      "That email format is invalid! Check it again! 👀",
      "I need a valid email address! 🔍",
      "That's not a proper email! Try again! 😊",
    ],
    general: hasName ? [
      `Oops ${firstName}! Something went wrong! 😅`,
      `${firstName}, there's an error! Let me help you fix it! 🔧`,
      `Hey ${firstName}, something's not quite right! 👀`,
      `${firstName}, I see an issue! Let's fix it together! 💪`,
    ] : [
      "Oops! Something went wrong! 😅",
      "There's an error! Let me help you fix it! 🔧",
      "Something's not quite right! 👀",
      "I see an issue! Let's fix it together! 💪",
    ],
  };
  
  return errorDialogues[errorType] || errorDialogues.general;
};

const timezones = [
  { value: '', label: 'Select timezone' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (ET) - New York' },
  { value: 'America/Chicago', label: 'Central Time (CT) - Chicago' },
  { value: 'America/Denver', label: 'Mountain Time (MT) - Denver' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT) - Los Angeles' },
  { value: 'America/Phoenix', label: 'Mountain Time (MST) - Phoenix' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT) - Anchorage' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST) - Honolulu' },
  { value: 'America/Toronto', label: 'Eastern Time - Toronto' },
  { value: 'America/Vancouver', label: 'Pacific Time - Vancouver' },
  { value: 'America/Mexico_City', label: 'Central Time - Mexico City' },
  { value: 'America/Sao_Paulo', label: 'Brasilia Time - São Paulo' },
  { value: 'America/Buenos_Aires', label: 'Argentina Time - Buenos Aires' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT) - London' },
  { value: 'Europe/Paris', label: 'Central European Time (CET) - Paris' },
  { value: 'Europe/Berlin', label: 'Central European Time - Berlin' },
  { value: 'Europe/Rome', label: 'Central European Time - Rome' },
  { value: 'Europe/Madrid', label: 'Central European Time - Madrid' },
  { value: 'Europe/Amsterdam', label: 'Central European Time - Amsterdam' },
  { value: 'Europe/Stockholm', label: 'Central European Time - Stockholm' },
  { value: 'Europe/Athens', label: 'Eastern European Time (EET) - Athens' },
  { value: 'Europe/Moscow', label: 'Moscow Time (MSK) - Moscow' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST) - Dubai' },
  { value: 'Asia/Karachi', label: 'Pakistan Standard Time (PKT) - Karachi' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST) - Mumbai, Delhi' },
  { value: 'Asia/Dhaka', label: 'Bangladesh Standard Time (BST) - Dhaka' },
  { value: 'Asia/Bangkok', label: 'Indochina Time (ICT) - Bangkok' },
  { value: 'Asia/Singapore', label: 'Singapore Time (SGT) - Singapore' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong Time (HKT) - Hong Kong' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (CST) - Beijing, Shanghai' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST) - Tokyo' },
  { value: 'Asia/Seoul', label: 'Korea Standard Time (KST) - Seoul' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET) - Sydney' },
  { value: 'Australia/Melbourne', label: 'Australian Eastern Time - Melbourne' },
  { value: 'Australia/Brisbane', label: 'Australian Eastern Time - Brisbane' },
  { value: 'Australia/Perth', label: 'Australian Western Time (AWST) - Perth' },
  { value: 'Pacific/Auckland', label: 'New Zealand Time (NZST) - Auckland' },
  { value: 'Africa/Cairo', label: 'Eastern European Time - Cairo' },
  { value: 'Africa/Johannesburg', label: 'South Africa Standard Time (SAST) - Johannesburg' },
  { value: 'Africa/Lagos', label: 'West Africa Time (WAT) - Lagos' },
];

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    country: '',
    timeZone: '',
    cookFrequency: '',
  });
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
  const splineRef = useRef<HTMLDivElement>(null);
  const splineAppRef = useRef<any>(null);
  const dialogueTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const formRef = useRef(form);
  
  useEffect(() => {
    formRef.current = form;
  }, [form]);

  const getRandomPosition = (existingPositions: Array<{ top: number; left: number }> = []) => {
    
    let attempts = 0;
    let position: { top: number; left: number };
    
    do {
      const zones = [
        
        { top: Math.min(Math.random() * 15 + 18, 70), left: Math.random() * 10 + 5 },
        
        { top: Math.min(Math.random() * 15 + 18, 70), left: Math.random() * 8 + 35 },
        
        { top: Math.min(Math.random() * 15 + 18, 70), left: Math.random() * 5 + 5 },
        
        { top: Math.min(Math.random() * 15 + 50, 70), left: Math.random() * 5 + 5 },
        
        { top: Math.min(Math.random() * 10 + 60, 70), left: Math.random() * 10 + 5 },
        
        { top: Math.min(Math.random() * 10 + 60, 70), left: Math.random() * 8 + 35 },
        
        { top: Math.min(Math.random() * 10 + 45, 70), left: Math.random() * 5 + 5 },
        
        { top: Math.min(Math.random() * 15 + 18, 70), left: Math.random() * 5 + 5 },
      ];
      
      position = zones[Math.floor(Math.random() * zones.length)];
      
      position.top = Math.max(15, Math.min(position.top, 75)); 
      position.left = Math.max(5, Math.min(position.left, 70)); 
      
      attempts++;
      
      const tooCloseToBot = position.left >= 12 && position.left <= 42 && 
                           position.top >= 20 && position.top <= 60;
      
      const tooCloseToExisting = existingPositions.some(existing => {
        const distance = Math.sqrt(
          Math.pow(position.top - existing.top, 2) + 
          Math.pow(position.left - existing.left, 2)
        );
        return distance < 15; 
      });
      
      if (!tooCloseToBot && !tooCloseToExisting) break;
    } while (attempts < 20); 
    
    return position;
  };

  const getBotHeadPosition = (existingPositions: Array<{ top: number; left: number }> = []) => {
    
    const allActivePositions = [
      ...existingPositions,
      ...activeDialogues.map(d => ({ top: d.top, left: d.left }))
    ].filter(p => p.top >= 0 && p.top <= 100 && p.left >= 0 && p.left <= 100); 
    
    let attempts = 0;
    let position: { top: number; left: number };
    
    do {
      const positions = [
        
        { top: Math.min(20 + Math.random() * 10, 70), left: 5 + Math.random() * 5 },
        
        { top: Math.min(35 + Math.random() * 12, 70), left: 5 + Math.random() * 5 },
        
        { top: Math.min(50 + Math.random() * 12, 70), left: 5 + Math.random() * 5 },
        
        { top: Math.min(20 + Math.random() * 8, 70), left: 35 + Math.random() * 8 },
        
        { top: Math.min(20 + Math.random() * 8, 70), left: 5 + Math.random() * 6 },
        
        { top: Math.min(35 + Math.random() * 12, 70), left: 35 + Math.random() * 7 },
        
        { top: Math.min(35 + Math.random() * 12, 70), left: 5 + Math.random() * 6 },
        
        { top: Math.min(Math.max(18, 20 + Math.random() * 8), 70), left: 35 + Math.random() * 6 },
        
        { top: Math.min(Math.max(18, 20 + Math.random() * 8), 70), left: 5 + Math.random() * 5 },
        
        { top: Math.min(50 + Math.random() * 12, 70), left: 35 + Math.random() * 7 },
        
        { top: Math.min(50 + Math.random() * 12, 70), left: 5 + Math.random() * 6 },
      ];
      
      position = positions[Math.floor(Math.random() * positions.length)];
      
      position.top = Math.max(15, Math.min(position.top, 75)); 
      position.left = Math.max(5, Math.min(position.left, 70)); 
      
      attempts++;
      
      const tooCloseToBot = position.left >= 15 && position.left <= 35 && 
                           position.top >= 25 && position.top <= 45;
      
      const tooCloseToExisting = allActivePositions.some(existing => {
        const distance = Math.sqrt(
          Math.pow(position.top - existing.top, 2) + 
          Math.pow(position.left - existing.left, 2)
        );
        return distance < 12; 
      });
      
      if (!tooCloseToBot && !tooCloseToExisting) break;
      
    } while (attempts < 50); 
    
    return position;
  };

  useEffect(() => {
    if (!splineLoaded) return;

    const showDialogue = (usePersonalized = false) => {
      setActiveDialogues(prev => {
        
        if (prev.length >= 2) return prev;

        let availableDialogues: string[];
        if (usePersonalized && form.name.trim().length > 0) {
          availableDialogues = getPersonalizedDialogues(form.name).filter(
            d => !prev.some(ad => ad.text === d)
          );
        } else {
          
          availableDialogues = botDialogues.filter(
            d => !prev.some(ad => ad.text === d)
          );
        }
        
        if (availableDialogues.length === 0) return prev;

        const randomDialogue = availableDialogues[Math.floor(Math.random() * availableDialogues.length)];
        const existingPositions = prev.map(d => ({ top: d.top, left: d.left }));
        
        const isPersonalized = usePersonalized && form.name.trim().length > 0;
        const position = isPersonalized 
          ? getBotHeadPosition(existingPositions)
          : getRandomPosition(existingPositions);
        const id = `dialogue-${Date.now()}-${Math.random()}`;

        const fadeDelay = 3000 + Math.random() * 2000;
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
          }, 500);
          
          dialogueTimeoutsRef.current.set(`${id}-remove`, removeTimeout);
        }, fadeDelay);

        const maxLifetimeTimeout = setTimeout(() => {
          setActiveDialogues(current => {
            const dialogue = current.find(d => d.id === id);
            if (!dialogue) return current; 
            
            return current.filter(d => d.id !== id);
          });
          
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

        return [...prev, {
          id,
          text: randomDialogue,
          top: position.top,
          left: position.left,
          fading: false,
        }];
      });
    };

    const initialDelay = 1000 + Math.random() * 2000;
    const initialTimeout = setTimeout(() => {
      showDialogue();
    }, initialDelay);

    const scheduledTimeouts: NodeJS.Timeout[] = [];
    const scheduleNextDialogue = () => {
      
      const delay = 4000 + Math.random() * 6000;
      const timeout = setTimeout(() => {
        
        showDialogue(false);
        
        scheduleNextDialogue();
      }, delay);
      scheduledTimeouts.push(timeout);
    };

    scheduleNextDialogue();

    return () => {
      clearTimeout(initialTimeout);
      scheduledTimeouts.forEach(timeout => clearTimeout(timeout));
      
      dialogueTimeoutsRef.current.forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
      dialogueTimeoutsRef.current.clear();
    };
  }, [splineLoaded, form.name]);

  useEffect(() => {
    if (!splineLoaded) return;
    
    const cleanupInterval = setInterval(() => {
      setActiveDialogues(current => {
        const now = Date.now();
        const maxAge = 12000; 
        
        return current.filter(dialogue => {
          
          const timestampMatch = dialogue.id.match(/\d+/);
          if (timestampMatch) {
            const dialogueTime = parseInt(timestampMatch[0]);
            const age = now - dialogueTime;
            
            if (age > maxAge) {
              
              const fadeTimeout = dialogueTimeoutsRef.current.get(dialogue.id);
              const removeTimeout = dialogueTimeoutsRef.current.get(`${dialogue.id}-remove`);
              const maxTimeout = dialogueTimeoutsRef.current.get(`${dialogue.id}-max`);
              
              if (fadeTimeout) {
                clearTimeout(fadeTimeout);
                dialogueTimeoutsRef.current.delete(dialogue.id);
              }
              if (removeTimeout) {
                clearTimeout(removeTimeout);
                dialogueTimeoutsRef.current.delete(`${dialogue.id}-remove`);
              }
              if (maxTimeout) {
                clearTimeout(maxTimeout);
                dialogueTimeoutsRef.current.delete(`${dialogue.id}-max`);
              }
              
              return false; 
            }
          }
          return true; 
        });
      });
    }, 2000); 
    
    return () => {
      clearInterval(cleanupInterval);
    };
  }, [splineLoaded]);

  const shownDialoguesRef = useRef<Set<string>>(new Set());
  
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const showContextualDialogue = useCallback(() => {
    if (!splineLoaded) return;
    
    const contextualDialogues: string[] = [];
    const firstName = form.name.trim().split(' ')[0];
    
    if (form.name.trim().length > 0) {
      contextualDialogues.push(
        `Hey ${firstName}, still here? Let's finish this! 😊`,
        `${firstName}, you're doing great! Keep going! 💪`,
        `Come on ${firstName}, we're almost there! 🚀`,
        `${firstName}, I'm waiting for you to finish! 👀`,
      );
    }
    
    if (form.email.trim().length > 0) {
      contextualDialogues.push(
        "Email's done! What's next? 📧",
        "Great email! Ready for more? ✨",
        "Email looks good! Keep it up! 👍",
      );
    }
    
    if (form.country.trim().length > 0) {
      contextualDialogues.push(
        `I love ${form.country}! What's next? 🌍`,
        `Great choice with ${form.country}! Let's continue! 🗺️`,
      );
    }
    
    if (form.timeZone.trim().length > 0) {
      contextualDialogues.push(
        "Timezone set! Almost done! ⏰",
        "Perfect timing! What's next? 🕐",
      );
    }
    
    if (form.cookFrequency) {
      const frequencyMessages = {
        rarely: "Rarely cooking? Let's change that together! 🍳",
        sometimes: "Sometimes is good, but daily is better! 👨‍🍳",
        daily: "Daily cooking? You're my hero! 👑",
      };
      contextualDialogues.push(frequencyMessages[form.cookFrequency as keyof typeof frequencyMessages]);
    }
    
    if (form.password.trim().length > 0) {
      contextualDialogues.push(
        "Password set! I'm still not looking! 👀",
        "Password done! Almost there! 🔒",
      );
    }
    
    contextualDialogues.push(
      "Hey! Still thinking? I'm here to help! 💫",
      "Take your time, but don't forget I'm waiting! 😄",
      "I'm getting excited! Let's finish this! 🎉",
      "You're doing great! Keep going! ✨",
      "Almost there! You've got this! 🔥",
      "I'm here whenever you're ready! 👋",
    );
    
    if (contextualDialogues.length === 0) return;
    
    const randomDialogue = contextualDialogues[Math.floor(Math.random() * contextualDialogues.length)];
    
    setActiveDialogues(prev => {
      
      if (prev.length >= 2) return prev;
      
      prev.forEach(d => {
        if (d.id.includes('contextual-')) {
          
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
      
      const cleaned = prev.filter(d => !d.id.includes('contextual-'));
      const existingPositions = cleaned.map(d => ({ top: d.top, left: d.left }));
      const position = getBotHeadPosition(existingPositions);
      const id = `contextual-${Date.now()}`;
      
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
        setActiveDialogues(current => {
          const dialogue = current.find(d => d.id === id);
          if (!dialogue) return current;
          return current.filter(d => d.id !== id);
        });
        
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
    
    idleTimeoutRef.current = setTimeout(() => {
      showContextualDialogue();
    }, 30000);
  }, [splineLoaded, form.name, form.email, form.country, form.timeZone, form.cookFrequency, form.password]);

  useEffect(() => {
    if (!splineLoaded) return;
    
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
      
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
      
      idleTimeoutRef.current = setTimeout(() => {
        showContextualDialogue();
      }, 30000); 
    };

    document.addEventListener('mousemove', updateActivity, { passive: true });
    document.addEventListener('click', updateActivity, { passive: true });
    document.addEventListener('keydown', updateActivity, { passive: true });
    document.addEventListener('scroll', updateActivity, { passive: true });

    idleTimeoutRef.current = setTimeout(() => {
      showContextualDialogue();
    }, 30000);

    return () => {
      document.removeEventListener('mousemove', updateActivity);
      document.removeEventListener('click', updateActivity);
      document.removeEventListener('keydown', updateActivity);
      document.removeEventListener('scroll', updateActivity);
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
    };
  }, [splineLoaded, showContextualDialogue]);

  useEffect(() => {
    const forwardPointerEvents = (e: PointerEvent) => {
      
      const target = e.target as HTMLElement;
      if (target.closest('.auth-form-card input, .auth-form-card button, .auth-form-card select, .auth-form-card a')) {
        return; 
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
  }, []);

  function updateField<K extends keyof typeof form>(key: K, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
    
    lastActivityRef.current = Date.now();
    
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }
    
    idleTimeoutRef.current = setTimeout(() => {
      showContextualDialogue();
    }, 30000); 
  }

  const checkFieldError = (fieldName: string, fieldElement: HTMLElement | null): boolean => {
    if (!fieldElement) return false;
    
    const fieldValue = formRef.current[fieldName as keyof typeof formRef.current];
    const isEmpty = !fieldValue || String(fieldValue).trim().length === 0;
    
    if (fieldElement instanceof HTMLInputElement || fieldElement instanceof HTMLSelectElement) {
      
      if (!fieldElement.validity.valid) {
        return true;
      }
      
      if (fieldElement.required && isEmpty) {
        return true;
      }
    }
    
    if (fieldName === 'email' && fieldValue) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(fieldValue).trim())) {
        return true;
      }
    }
    
    if (fieldName === 'password' && fieldValue) {
      if (String(fieldValue).trim().length < 6) {
        return true;
      }
    }
    
    if (fieldName === 'confirmPassword' && fieldValue) {
      if (formRef.current.password !== fieldValue) {
        return true;
      }
    }
    
    return false;
  };

  const showFieldDialogue = (fieldName: string, fieldElement: HTMLElement | null = null) => {
    if (!splineLoaded) return;
    
    const currentForm = formRef.current;
    
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
      } else if (fieldName === 'password') {
        const fieldValue = currentForm.password;
        if (fieldValue && fieldValue.length < 6) {
          errorType = 'passwordTooShort';
        }
      } else if (fieldName === 'confirmPassword') {
        if (currentForm.password !== currentForm.confirmPassword) {
          errorType = 'passwordMismatch';
        }
      }
      
      showErrorDialogue(errorType);
      return;
    }
    
    const fieldValue = currentForm[fieldName as keyof typeof currentForm];
    if (!fieldValue || String(fieldValue).trim().length === 0) {
      
      return;
    }
    
    let dialogues: string[] = [];
    if (fieldName === 'cookFrequency') {
      const frequency = currentForm.cookFrequency as 'rarely' | 'sometimes' | 'daily' | '';
      if (frequency) {
        dialogues = getCookFrequencyDialogues(frequency, currentForm);
      } else {
        return; 
      }
    } else {
      dialogues = getFieldDialogues(fieldName, currentForm);
    }
    
    if (!dialogues || dialogues.length === 0) {
      console.warn(`No dialogues found for field: ${fieldName}`);
      return;
    }
    
    const fieldKey = fieldName === 'cookFrequency' ? `cookFrequency-${currentForm.cookFrequency}` : fieldName;
    const availableDialogues = dialogues.filter(d => {
      const dialogueKey = `${fieldKey}-${d}`;
      return !shownDialoguesRef.current.has(dialogueKey);
    });
    
    let randomDialogue: string;
    let dialogueKey: string;
    
    if (availableDialogues.length === 0) {
      
      randomDialogue = dialogues[Math.floor(Math.random() * dialogues.length)];
      dialogueKey = `${fieldKey}-${randomDialogue}`;
      
    } else {
      
      randomDialogue = availableDialogues[Math.floor(Math.random() * availableDialogues.length)];
      dialogueKey = `${fieldKey}-${randomDialogue}`;
      shownDialoguesRef.current.add(dialogueKey);
    }
    
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
    
    setTimeout(() => {
      setActiveDialogues(prev => {
        
        const cleaned = prev.filter(d => !(d.id.includes('field-') && d.fading));
        
        if (cleaned.length >= 2) return cleaned;
        
        const existingPositions = cleaned.map(d => ({ top: d.top, left: d.left }));
        const position = getBotHeadPosition(existingPositions);
        const id = `field-${fieldKey}-${Date.now()}`;
        
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
          setActiveDialogues(current => {
            const dialogue = current.find(d => d.id === id);
            if (!dialogue) return current;
            return current.filter(d => d.id !== id);
          });
          
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

  const showErrorDialogue = (errorType: string) => {
    if (!splineLoaded) return;
    
    const errorDialogues = getErrorDialogues(errorType, formRef.current);
    if (errorDialogues.length === 0) return;
    
    const randomDialogue = errorDialogues[Math.floor(Math.random() * errorDialogues.length)];
    
    setActiveDialogues(prev => {
      
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
        setActiveDialogues(current => {
          const dialogue = current.find(d => d.id === id);
          if (!dialogue) return current;
          return current.filter(d => d.id !== id);
        });
        
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(false); 

    if (!form.name.trim()) {
      setError('Name is required');
      showErrorDialogue('name');
      return;
    }

    if (!form.email.trim()) {
      setError('Email is required');
      showErrorDialogue('email');
      return;
    }

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

    if (form.password.trim().length < 6) {
      setError('Password must be at least 6 characters');
      showErrorDialogue('passwordTooShort');
      return;
    }

    if (!form.confirmPassword.trim()) {
      setError('Please confirm your password');
      showErrorDialogue('password');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      showErrorDialogue('passwordMismatch');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        
        const errorMessage = data.error || 'Something went wrong';
        setError(errorMessage);
        setLoading(false);
        
        if (errorMessage.toLowerCase().includes('email')) {
          showErrorDialogue('emailInvalid');
        } else if (errorMessage.toLowerCase().includes('password')) {
          showErrorDialogue('password');
        } else {
          showErrorDialogue('general');
        }
        return;
      }

      router.push('/onboarding');
    } catch (err) {
      console.error(err);
      setError('Network error');
      setLoading(false);
      showErrorDialogue('general');
    }
  }

  return (
    <div className="auth-page-container">
      {}
      <div className="auth-bg-animated">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      <div className="auth-layout">
        {}
        <div 
          className={`auth-3d-panel ${splineLoaded ? 'spline-loaded' : 'spline-loading'}`} 
          ref={splineRef}
        >
          <Spline
            scene="https://prod.spline.design/0CNb5lpojqWGCKeX/scene.splinecode"
            onLoad={(app: any) => {
              splineAppRef.current = app;
              console.log('Spline scene loaded, app:', app);
              
              console.log('=== SPLINE OBJECTS ===');
              const logObjects = (obj: any, depth = 0) => {
                if (obj && obj.name) {
                  console.log('  '.repeat(depth) + obj.name, obj);
                }
                if (obj && obj.children) {
                  obj.children.forEach((child: any) => logObjects(child, depth + 1));
                }
              };
              if (app && app.scene) {
                logObjects(app.scene);
              }
              console.log('====================');
              
              setTimeout(() => {
                setSplineLoaded(true);
              }, 500);
            }}
          />
          
          {}
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

        {}
        <div className="auth-form-panel">
          <div className="auth-form-card">
            <div className="auth-form-header">
              <div className="auth-logo-wrapper">
                <div className="auth-logo-glow"></div>
                <h1 className="auth-title">Create your account</h1>
              </div>
              <p className="auth-subtitle">
                Chefora – Your personal AI cooking assistant
          </p>
            </div>

            <form 
              onSubmit={handleSubmit} 
              onInvalid={(e) => {
                
                const target = e.target as HTMLElement;
                if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement) {
                  const fieldName = target.name || target.id || '';
                  if (fieldName) {
                    
                    const fieldMap: Record<string, string> = {
                      'name': 'name',
                      'email': 'email',
                      'password': 'password',
                      'confirmPassword': 'confirmPassword',
                      'country': 'country',
                      'timeZone': 'timeZone',
                      'cookFrequency': 'cookFrequency',
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
                <label className="auth-label">Full Name</label>
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
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
            <input
                    name="name"
                    className="auth-input-modern"
                    placeholder="Enter your name"
              value={form.name}
              onChange={e => updateField('name', e.target.value)}
                    onFocus={() => setFocusedField('name')}
                    onBlur={(e) => {
                      setFocusedField(null);
                      showFieldDialogue('name', e.target as HTMLElement);
                    }}
                    required
                  />
                </div>
              </div>

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
              onChange={e => updateField('email', e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={(e) => {
                      setFocusedField(null);
                      showFieldDialogue('email', e.target as HTMLElement);
                    }}
                    required
                  />
                </div>
              </div>

              <div className="auth-form-row">
                <div className="auth-input-group">
                  <label className="auth-label">Country (optional)</label>
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
                        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
              <input
                      name="country"
                      className="auth-input-modern"
                      placeholder="Country"
                value={form.country}
                onChange={e => updateField('country', e.target.value)}
                      onFocus={() => setFocusedField('country')}
                      onBlur={(e) => {
                        setFocusedField(null);
                        showFieldDialogue('country', e.target as HTMLElement);
                      }}
                    />
                  </div>
                </div>

                <div className="auth-input-group">
                  <label className="auth-label">Time Zone (optional)</label>
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
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <select
                      name="timeZone"
                      className="auth-input-modern auth-select"
                value={form.timeZone}
                onChange={e => updateField('timeZone', e.target.value)}
                      onFocus={() => setFocusedField('timeZone')}
                      onBlur={(e) => {
                        setFocusedField(null);
                        showFieldDialogue('timeZone', e.target as HTMLElement);
                      }}
                    >
                      {timezones.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
            </div>

              <div className="auth-input-group">
                <label className="auth-label">How often do you cook?</label>
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
                      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                    />
                  </svg>
            <select
                    name="cookFrequency"
                    className="auth-input-modern auth-select"
              value={form.cookFrequency}
              onChange={e => updateField('cookFrequency', e.target.value)}
                    onFocus={() => setFocusedField('cookFrequency')}
                    onBlur={(e) => {
                      setFocusedField(null);
                      showFieldDialogue('cookFrequency', e.target as HTMLElement);
                    }}
            >
                    <option value="">Select frequency</option>
              <option value="rarely">Rarely</option>
              <option value="sometimes">Sometimes</option>
              <option value="daily">Daily</option>
            </select>
                </div>
              </div>

              <div className="auth-form-row">
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
                placeholder="Password"
                type="password"
                value={form.password}
                onChange={e => updateField('password', e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={(e) => {
                        setFocusedField(null);
                        showFieldDialogue('password', e.target as HTMLElement);
                      }}
                      required
                    />
                  </div>
                </div>

                <div className="auth-input-group">
                  <label className="auth-label">Confirm Password</label>
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
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
              <input
                      name="confirmPassword"
                      className="auth-input-modern"
                placeholder="Confirm password"
                type="password"
                value={form.confirmPassword}
                onChange={e => updateField('confirmPassword', e.target.value)}
                      onFocus={() => setFocusedField('confirmPassword')}
                      onBlur={(e) => {
                        setFocusedField(null);
                        showFieldDialogue('confirmPassword', e.target as HTMLElement);
                      }}
                      required
                    />
                  </div>
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
                    Creating account…
                  </>
                ) : (
                  <>
                    Sign up with Email
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

              <p className="auth-terms">
                By continuing, you agree to Chefora's{' '}
                <a href="#" className="auth-terms-link">
                  Terms &amp; Privacy Policy
                </a>
            </p>
          </form>

            <div className="auth-footer">
              <p className="auth-footer-text">
            Already have an account?{' '}
            <button
              type="button"
                  className="auth-link-modern"
              onClick={() => router.push('/login')}
            >
              Log in
            </button>
          </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
