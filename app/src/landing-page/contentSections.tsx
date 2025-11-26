import type { GridFeature } from "./components/FeaturesGrid";
import {
  TestimonialAvatar1,
  TestimonialAvatar2,
  ExampleAvatar1,
  ExampleAvatar2,
  ExampleAvatar3,
} from "./components/AvatarIllustrations";

export const features: GridFeature[] = [
  {
    name: "The Sensory Layer",
    description: "Clients don't just tell you they are tight—they show you. Our interactive Body Map tracks heat, tension, and vibration over time.",
    emoji: "🌡️",
    href: "/signup",
    size: "large",
  },
  {
    name: "The Infinite Session",
    description: "Never ask 'What session number is this?' again. Loom automatically tracks session counts and connects previous homework to current insights.",
    emoji: "♾️",
    href: "/signup",
    size: "large",
  },
  {
    name: "Frictionless Business",
    description: "You pay, they heal. Invite unlimited clients for free. Integrated payments and simple scheduling rules keep the admin out of the therapy room.",
    emoji: "💳",
    href: "/signup",
    size: "large",
  },
];

// SVG data URLs for testimonial avatars
const testimonialAvatar1 = `data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='grad1' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23fbbf24;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%23f97316;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle cx='50' cy='50' r='45' fill='url(%23grad1)' /%3E%3Ccircle cx='35' cy='40' r='8' fill='white' opacity='0.6' /%3E%3Ccircle cx='65' cy='40' r='8' fill='white' opacity='0.6' /%3E%3Cpath d='M 40 60 Q 50 70 60 60' stroke='white' stroke-width='3' fill='none' /%3E%3C/svg%3E`;

const testimonialAvatar2 = `data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='grad2' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23a78bfa;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%237c3aed;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect x='10' y='10' width='80' height='80' fill='url(%23grad2)' rx='8' /%3E%3Crect x='25' y='25' width='20' height='20' fill='white' opacity='0.4' rx='4' /%3E%3Crect x='55' y='25' width='20' height='20' fill='white' opacity='0.4' rx='4' /%3E%3Crect x='40' y='60' width='20' height='15' fill='white' opacity='0.6' rx='3' /%3E%3C/svg%3E`;

export const testimonials = [
  {
    name: "Dr. Sarah Cohen",
    role: "Senior Satya Method Coach, Tel Aviv",
    avatarSrc: testimonialAvatar1,
    socialUrl: "#",
    quote: "The Body Map changed everything. Clients can finally show me their 'red chest' instead of struggling to describe it. It's like having X-ray vision into their nervous system.",
  },
  {
    name: "Michael Levi",
    role: "Satya Method Practitioner, 8 Years",
    avatarSrc: testimonialAvatar2,
    socialUrl: "#",
    quote: "I was drowning in session notes. Loom's automatic tracking means I can stay present with my clients instead of frantically scribbling 'Session 7' in my notebook.",
  },
];

export const faqs = [
  {
    id: 1,
    question: "Do my clients have to pay?",
    answer: "No! You subscribe to Loom, and your clients get free access. They can log their sensations and view their session history at no cost. You're paying for the container, not per-seat.",
    href: "/pricing",
  },
  {
    id: 2,
    question: "Is it available in Hebrew?",
    answer: "Yes. Loom is fully localized in Hebrew and English. Your clients can switch languages instantly from their dashboard.",
    href: "#",
  },
  {
    id: 3,
    question: "How does pricing work?",
    answer: "Hobby plan (₪99/mo) supports up to 5 clients. Pro plan (₪199/mo) includes unlimited clients plus the Resource Library for sharing materials. Both include all core features.",
    href: "/pricing",
  },
];

export const footerNavigation = {
  app: [
    { name: "Pricing", href: "/pricing" },
    { name: "Sign Up", href: "/signup" },
  ],
  company: [
    { name: "About Satya Method", href: "#" },
    { name: "Privacy", href: "#" },
    { name: "Terms of Service", href: "#" },
  ],
};

// SVG data URLs for example carousel images
const exampleImage1 = `data:image/svg+xml,%3Csvg viewBox='0 0 280 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='exGrad1' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23fbbf24;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%23ec4899;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='280' height='160' fill='%23f5f5f5' /%3E%3Ccircle cx='70' cy='50' r='30' fill='url(%23exGrad1)' opacity='0.8' /%3E%3Ccircle cx='180' cy='80' r='40' fill='%23a78bfa' opacity='0.6' /%3E%3Cpath d='M 40 120 Q 60 110 80 120 T 120 120 T 160 120 T 200 120 T 240 120' stroke='%237c3aed' stroke-width='3' fill='none' opacity='0.7' /%3E%3Ccircle cx='240' cy='50' r='20' fill='%2306b6d4' opacity='0.5' /%3E%3C/svg%3E`;

const exampleImage2 = `data:image/svg+xml,%3Csvg viewBox='0 0 280 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='exGrad2' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%237c3aed;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%2306b6d4;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='280' height='160' fill='%23f9f5ff' /%3E%3Cg fill='url(%23exGrad2)' opacity='0.4'%3E%3Crect x='30' y='20' width='25' height='25' /%3E%3Crect x='70' y='20' width='25' height='25' /%3E%3Crect x='110' y='20' width='25' height='25' /%3E%3Crect x='150' y='20' width='25' height='25' /%3E%3Crect x='190' y='20' width='25' height='25' /%3E%3Crect x='230' y='20' width='25' height='25' /%3E%3C/g%3E%3Cg fill='%23a78bfa' opacity='0.7'%3E%3Crect x='30' y='65' width='35' height='35' /%3E%3Crect x='75' y='65' width='35' height='35' /%3E%3Crect x='170' y='65' width='35' height='35' /%3E%3Crect x='215' y='65' width='35' height='35' /%3E%3C/g%3E%3Cg fill='%23f97316' opacity='0.5'%3E%3Ccircle cx='50' cy='130' r='12' /%3E%3Ccircle cx='110' cy='130' r='12' /%3E%3Ccircle cx='170' cy='130' r='12' /%3E%3Ccircle cx='230' cy='130' r='12' /%3E%3C/g%3E%3C/svg%3E`;

const exampleImage3 = `data:image/svg+xml,%3Csvg viewBox='0 0 280 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='exGrad3' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23ec4899;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%23fbbf24;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='280' height='160' fill='%23fffbeb' /%3E%3Cpath d='M 40 60 Q 60 30 90 50 Q 110 70 85 95 Q 60 110 40 90 Z' fill='url(%23exGrad3)' opacity='0.7' /%3E%3Cpath d='M 150 40 Q 180 35 200 60 Q 210 90 180 110 Q 150 115 140 85 Z' fill='%2306b6d4' opacity='0.6' /%3E%3Cpath d='M 220 80 Q 240 70 260 85 Q 265 110 245 120 Q 220 125 215 100 Z' fill='%237c3aed' opacity='0.5' /%3E%3Ccircle cx='120' cy='130' r='18' fill='%23a78bfa' opacity='0.4' /%3E%3C/svg%3E`;

export const examples = [
  {
    name: "Rachel T.",
    description: "Went from scattered notes to organized insights. Now tracks 12 clients effortlessly with Loom's Session Tracker.",
    imageSrc: exampleImage1,
    href: "#",
  },
  {
    name: "David K.",
    description: "Body Map helped him identify a pattern across 3 clients - tension migrating from shoulders to chest after Session 4.",
    imageSrc: exampleImage2,
    href: "#",
  },
  {
    name: "Yael M.",
    description: "Switched from paper logs to Loom. Her clients love seeing their progress visualized on the heat map.",
    imageSrc: exampleImage3,
    href: "#",
  },
];
