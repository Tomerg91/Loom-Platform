import daBoiAvatar from "../client/static/da-boi.webp";
import type { GridFeature } from "./components/FeaturesGrid";

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

export const testimonials = [
  {
    name: "Dr. Sarah Cohen",
    role: "Senior Satya Method Coach, Tel Aviv",
    avatarSrc: daBoiAvatar,
    socialUrl: "#",
    quote: "The Body Map changed everything. Clients can finally show me their 'red chest' instead of struggling to describe it. It's like having X-ray vision into their nervous system.",
  },
  {
    name: "Michael Levi",
    role: "Satya Method Practitioner, 8 Years",
    avatarSrc: daBoiAvatar,
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

export const examples = [
  {
    name: "Rachel T.",
    description: "Went from scattered notes to organized insights. Now tracks 12 clients effortlessly with Loom's Session Tracker.",
    imageSrc: daBoiAvatar,
    href: "#",
  },
  {
    name: "David K.",
    description: "Body Map helped him identify a pattern across 3 clients - tension migrating from shoulders to chest after Session 4.",
    imageSrc: daBoiAvatar,
    href: "#",
  },
  {
    name: "Yael M.",
    description: "Switched from paper logs to Loom. Her clients love seeing their progress visualized on the heat map.",
    imageSrc: daBoiAvatar,
    href: "#",
  },
];
