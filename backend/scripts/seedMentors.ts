import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import User from '../models/user';
import Mentor from '../models/mentor';

const DB_URI = process.env.MONGODB_URI;

if (!DB_URI) {
    console.error('Missing MONGODB_URI in .env');
    process.exit(1);
}

const mentorsData = [
    {
        name: 'Rahul Sharma',
        username: 'rahul_google',
        email: 'rahul.s@example.com',
        company: 'Google',
        headline: 'Senior Software Engineer at Google | Distributed Systems',
        bio: 'I have been working at Google for over 5 years, focusing on large-scale distributed systems and cloud infrastructure. I conduct 50+ interviews annually and can help you crack the core system design rounds.',
        expertise: ['System Design', 'Backend', 'DSA'],
        topics: ['System Design', 'DSA Problem Solving', 'Mock Interview'],
        avatar: 'https://i.pravatar.cc/150?u=rahul'
    },
    {
        name: 'Priya Patel',
        username: 'priyap_meta',
        email: 'priya.meta@example.com',
        company: 'Meta',
        headline: 'Frontend Architect @ Meta | React Specialist',
        bio: 'Passionate frontend developer currently building next-gen user interfaces at Meta. I specialize in React, UI performance, and frontend system architecture. Book a session to review your frontend knowledge!',
        expertise: ['Frontend', 'DSA'],
        topics: ['Frontend Development', 'Resume Review', 'Career Guidance'],
        avatar: 'https://i.pravatar.cc/150?u=priya'
    },
    {
        name: 'Amit Kumar',
        username: 'amit_amazon',
        email: 'amit.amz@example.com',
        company: 'Amazon',
        headline: 'SDE III at Amazon | Scalable Architectures',
        bio: 'I work extensively with AWS services to build scalable enterprise architectures. Mentoring students and junior developers is my passion. Let us master Amazon leadership principles and DSA together.',
        expertise: ['Backend', 'System Design', 'DevOps'],
        topics: ['System Design', 'Career Guidance', 'Mock Interview'],
        avatar: 'https://i.pravatar.cc/150?u=amit'
    },
    {
        name: 'Sneha Gupta',
        username: 'sneha_msft',
        email: 'sneha.msft@example.com',
        company: 'Microsoft',
        headline: 'Principal Engineer at Microsoft | Azure | AI/ML',
        bio: 'Building AI-driven cloud solutions on Microsoft Azure. Happy to help developers understand cloud deployments, architecture fundamentals, and crack the Microsoft interview loops.',
        expertise: ['ML/AI', 'Backend', 'System Design'],
        topics: ['ML/AI Guidance', 'System Design', 'Resume Review'],
        avatar: 'https://i.pravatar.cc/150?u=sneha'
    },
    {
        name: 'Rohan Singh',
        username: 'rohan_apple',
        email: 'rohan.apple@example.com',
        company: 'Apple',
        headline: 'iOS Developer at Apple | Swift Enthusiast',
        bio: 'Mobile-first developer shaping app experiences at Apple. I can guide you through the intricacies of iOS development, performance tuning, and how to present your portfolio right.',
        expertise: ['Mobile', 'Frontend'],
        topics: ['Career Guidance', 'Mock Interview'],
        avatar: 'https://i.pravatar.cc/150?u=rohan'
    },
    {
        name: 'Anjali Desai',
        username: 'anjali_netflix',
        email: 'anjali.netflix@example.com',
        company: 'Netflix',
        headline: 'Senior Data Scientist @ Netflix | Recommendation Systems',
        bio: 'I work on Netflix recommendation algorithms. If you want to dive deep into Machine Learning and Data Science interviews, I am here to teach you the best practices.',
        expertise: ['ML/AI', 'DSA'],
        topics: ['ML/AI Guidance', 'DSA Problem Solving', 'Career Guidance'],
        avatar: 'https://i.pravatar.cc/150?u=anjali'
    },
    {
        name: 'Vikram Reddy',
        username: 'vikram_uber',
        email: 'vikram.uber@example.com',
        company: 'Uber',
        headline: 'Staff Engineer at Uber | Real-time Systems',
        bio: 'Building low-latency real-time mapping platforms at Uber. System design is my strong suit, especially for platforms that handle millions of concurrent users.',
        expertise: ['System Design', 'Backend', 'DSA'],
        topics: ['System Design', 'Mock Interview', 'DSA Problem Solving'],
        avatar: 'https://i.pravatar.cc/150?u=vikram'
    },
    {
        name: 'Nidhi Jain',
        username: 'nidhi_airbnb',
        email: 'nidhi.airbnb@example.com',
        company: 'Airbnb',
        headline: 'Full-Stack Engineer at Airbnb | Typescript Edge',
        bio: 'I love writing scalable full-stack code using Node.js and React. Can provide actionable feedback on your personal projects, code quality, and help you ace full-stack technical rounds.',
        expertise: ['Frontend', 'Backend'],
        topics: ['Frontend Development', 'Backend Development', 'Resume Review'],
        avatar: 'https://i.pravatar.cc/150?u=nidhi'
    },
    {
        name: 'Aditya Verma',
        username: 'aditya_linkedin',
        email: 'aditya.linkedin@example.com',
        company: 'LinkedIn',
        headline: 'Data Engineer @ LinkedIn | Big Data',
        bio: 'I manage petabytes of data using Kafka, Spark, and Hadoop. Eager to help folks looking to pivot into Data Engineering or crack related technical discussions.',
        expertise: ['Backend', 'System Design'],
        topics: ['System Design', 'Career Guidance'],
        avatar: 'https://i.pravatar.cc/150?u=aditya'
    },
    {
        name: 'Neha Iyer',
        username: 'neha_twitter',
        email: 'neha.twitter@example.com',
        company: 'Twitter',
        headline: 'SRE at X (Twitter) | High Availability & Scale',
        bio: 'Ensuring 99.99% uptime for massive social ecosystems. Let us discuss DevOps, Site Reliability, CI/CD, and how to communicate effectively during system failure scenarios.',
        expertise: ['DevOps', 'Backend'],
        topics: ['System Design', 'Career Guidance'],
        avatar: 'https://i.pravatar.cc/150?u=neha'
    },
    {
        name: 'Karan Kapoor',
        username: 'karan_stripe',
        email: 'karan.stripe@example.com',
        company: 'Stripe',
        headline: 'Software Engineer @ Stripe | FinTech APIs',
        bio: 'I design robust, developer-friendly APIs that process millions of transactions. I can help you with clean coding principles and rigorous mock assessments.',
        expertise: ['Backend', 'System Design'],
        topics: ['Backend Development', 'System Design', 'Mock Interview'],
        avatar: 'https://i.pravatar.cc/150?u=karan'
    },
    {
        name: 'Pooja Rao',
        username: 'pooja_salesforce',
        email: 'pooja.salesforce@example.com',
        company: 'Salesforce',
        headline: 'QA Architect at Salesforce | Test Automation',
        bio: 'Dedicated to releasing flawless enterprise software. Happy to provide mentorship for QA roles, automation frameworks, and test-driven development methodologies.',
        expertise: ['DevOps', 'Backend'],
        topics: ['Career Guidance', 'Resume Review'],
        avatar: 'https://i.pravatar.cc/150?u=pooja'
    }
];

const seedMentors = async () => {
    try {
        await mongoose.connect(DB_URI);
        console.log('Connected to Database');

        let usersCreated = 0;
        let mentorsCreated = 0;

        for (const data of mentorsData) {
            // Check if user already exists
            let user = await User.findOne({ email: data.email });

            if (!user) {
                // Create User
                user = new User({
                    name: data.name,
                    username: data.username,
                    email: data.email,
                    password: 'password123', // Dummy password
                    role: 'user', // Since mentor isn't an enum in UserSchema role, we keep it as user and link
                    isEmailVerified: true,
                    isActive: true, // Needed
                    avatar: data.avatar,
                    companies: [data.company] // Using enum array
                });
                await user.save();
                usersCreated++;
            }

            // Check if mentor profile already exists
            const existingMentor = await Mentor.findOne({ user: user._id });

            if (!existingMentor) {
                // Generate simple slug
                const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000);

                const mentor = new Mentor({
                    user: user._id,
                    slug,
                    avatar: data.avatar,
                    linkedinUrl: `https://linkedin.com/in/${data.username}`,
                    headline: data.headline,
                    bio: data.bio,
                    expertise: data.expertise,
                    sessionTopics: data.topics,
                    languages: ['English', 'Hindi'],
                    experience: {
                        years: Math.floor(Math.random() * 5) + 3, // 3-7 years
                        currentCompany: data.company,
                        currentRole: data.headline.split(' at ')[0].split(' @ ')[0]
                    },
                    availability: [
                        { dayOfWeek: 1, slots: [{ start: "18:00", end: "20:00" }] },
                        { dayOfWeek: 3, slots: [{ start: "18:00", end: "20:00" }] },
                        { dayOfWeek: 6, slots: [{ start: "10:00", end: "14:00" }] }
                    ],
                    timezone: 'Asia/Kolkata',
                    pricing: {
                        thirtyMin: 500,
                        sixtyMin: 900,
                        currency: 'INR'
                    },
                    rating: { average: parseFloat((Math.random() * 1 + 4).toFixed(1)), count: Math.floor(Math.random() * 100) + 10 },
                    totalSessions: Math.floor(Math.random() * 50) + 20,
                    totalEarnings: 0,
                    verified: true,
                    verifiedAt: new Date(),
                    applicationStatus: 'approved',
                    isAcceptingBookings: true,
                    isActive: true
                });

                await mentor.save();
                
                // Link mentor profile to user
                user.mentorProfile = mentor._id;
                await user.save();
                
                mentorsCreated++;
            }
        }

        console.log(`Seed complete! Created ${usersCreated} new users and ${mentorsCreated} new mentors.`);
        process.exit(0);
    } catch (err) {
        console.error('Seed error:', err);
        process.exit(1);
    }
};

seedMentors();
