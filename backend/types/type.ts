import { Document, Model, Types } from 'mongoose';

// ==================== ENUMS ====================
export type UserLevel = 'beginner' | 'intermediate' | 'advanced';
export type UserRole = 'user' | 'admin' | 'professor';
export type SubscriptionPlan = 'free' | 'pro' | 'premium';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing' | 'expired';
export type SubscriptionInterval = 'monthly' | 'yearly';
export type ProgrammingLanguage = 'JavaScript' | 'Python' | 'C++' | 'Java' | 'Rust';
export type SubmissionLanguage = 'javascript' | 'python' | 'java' | 'C++';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Pattern = 'sliding window' | 'two pointers' | 'tree traversal' | 'graph traversal' | 'dynamic programming' | 'backtracking' | 'greedy' | 'heap' | 'binary search' | 'stack' | 'bit manipulation' | 'matrix' | 'prefix sum' | 'sorting' | 'linked list' | 'recursion' | 'math' | 'hash table' | 'queue' | 'divide and conquer';
export type RoadmapDomain = 'MERN Stack' | 'Frontend' | 'Backend' | 'Full Stack' | 'DevOps' | 'Data Science' | 'Machine Learning' | 'Mobile Development' | 'System Design';
export type RoadmapLevel = 'beginner' | 'intermediate' | 'advanced' | 'all';
export type ResourceType = 'article' | 'video' | 'course' | 'documentation' | 'book';
export type MockSessionType = 'company' | 'difficulty' | 'pattern' | 'custom';
export type MockSessionStatus = 'pending' | 'in_progress' | 'completed' | 'expired' | 'abandoned';
export type SubmissionStatus = 'Pending' | 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Memory Limit Exceeded' | 'Runtime Error' | 'Compilation Error' | 'Internal Error';
export type TestCaseStatus = 'passed' | 'failed' | 'error';
export type MentorExpertise = 'DSA' | 'System Design' | 'Frontend' | 'Backend' | 'ML/AI' | 'DevOps' | 'Mobile';
export type BookingType = 'video' | 'chat';
export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type MeetingProvider = 'jitsi' | 'zoom' | 'google_meet';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';
export type ConversationType = 'direct' | 'group' | 'mentor';
export type MessageType = 'text' | 'code' | 'file' | 'image';
export type StudyGroupRole = 'admin' | 'moderator' | 'member';
export type StudySessionStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
export type StudyGroupDifficulty = 'easy' | 'medium' | 'hard' | 'mixed';
export type MentorApplicationStatus = 'pending' | 'approved' | 'rejected';
export type SessionTopic = 'DSA Problem Solving' | 'System Design' | 'Resume Review' | 'Mock Interview' | 'Career Guidance' | 'Frontend Development' | 'Backend Development' | 'ML/AI Guidance';
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type PayoutMethod = 'bank_transfer' | 'upi';
export type NotificationType =
    | 'booking_confirmed' | 'booking_cancelled' | 'booking_reminder'
    | 'session_started' | 'session_completed'
    | 'new_message' | 'message_digest'
    | 'payment_received' | 'payout_processed'
    | 'review_received' | 'mentor_approved' | 'mentor_rejected';

// ==================== USER ====================
export interface IUserSubscription {
    plan: SubscriptionPlan;
    expiresAt?: Date;
    stripeCustomerId?: string;
}

export interface IUserStats {
    totalSubmissions: number;
    acceptedSubmissions: number;
    averageRuntime: number;
    accuracy: number;
    rank?: number;
}

export interface ISocialLinks {
    github?: string;
    linkedin?: string;
    portfolio?: string;
}

export interface ICodingProfiles {
    leetcode?: string;
    gfg?: string;
    codeforces?: string;
    codechef?: string;
    github?: string;
}

export interface IUser extends Document {
    name: string;
    username?: string;
    email: string;
    password: string;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    passwordChangedAt?: Date;
    bio?: string;
    level: UserLevel;
    languages: ProgrammingLanguage[];
    age?: number;
    role: UserRole;
    isEmailVerified: boolean;
    otp?: string;
    otpExpiry?: Date;
    otpVerified: boolean;
    totalMocksAttempted: number;
    completedMocks: number;
    college?: string;
    companies: string[];
    avatar?: string;
    timezone: string;
    lastLoginAt?: Date;
    subscription: IUserSubscription;
    mentorProfile?: Types.ObjectId;
    solvedProblems: Types.ObjectId[];
    bookmarkedProblems: Types.ObjectId[];
    stats: IUserStats;
    socialLinks: ISocialLinks;
    codingProfiles?: ICodingProfiles;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
    generateOTP(): string;
    verifyOTP(otp: string): boolean;
    clearOTP(): void;
    createPasswordResetToken(): string;
}

export interface IUserModel extends Model<IUser> {
    findByEmailorUsername(emailorUsername: string): Promise<IUser | null>;
}

// ==================== PROBLEM ====================
export interface ITestCase {
    input: string;
    output: string;
    explanation?: string;
}

export interface IStarterCode {
    language: string;
    code: string;
}

export interface ISolution {
    language: string;
    code: string;
}

export interface IProblem extends Document {
    title: string;
    description: string;
    difficulty: Difficulty;
    companyTags: string[];
    topics: string[];
    pattern: Pattern[];
    visibleTestCases: ITestCase[];
    hiddenTestCases: Omit<ITestCase, 'explanation'>[];
    starterCode: IStarterCode[];
    solutions: ISolution[];
    constraints?: string;
    hints: string[];
    memoryLimit: number;
    timeLimit: number;
    submissionsCount: number;
    acceptedCount: number;
    createdBy: Types.ObjectId;
    slug?: string;
    premium: boolean;
    likes: number;
    dislikes: number;
    relatedProblems: Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

// ==================== SUBMISSION ====================
export interface ITestCaseResult {
    testCaseId: number;
    status: TestCaseStatus;
    input?: string;
    expectedOutput?: string;
    actualOutput?: string;
    runtime?: number;
    memory?: number;
}

export interface ISubmission extends Document {
    user: Types.ObjectId;
    problem: Types.ObjectId;
    mockSession?: Types.ObjectId;
    code: string;
    language: SubmissionLanguage;
    status: SubmissionStatus;
    runtime?: number;
    memory?: number;
    errorMessage?: string;
    testCasesPassed: number;
    testCasesTotal: number;
    testCasesResults: ITestCaseResult[];
    attemptNumber?: number;
    judge0SubmissionId?: string;
    evaluatedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

// ==================== MOCK SESSION ====================
export interface IMockSessionConfig {
    company?: string;
    difficulty?: string;
    pattern?: string;
    problemCount: number;
}

export interface IMockProblem {
    problem: Types.ObjectId;
    order: number;
    submission?: Types.ObjectId;
    timeSpent: number;
    solved: boolean;
    startedAt?: Date;
    completedAt?: Date;
}

export interface IMockScore {
    solved: number;
    total: number;
    totalTime?: number;
    averageTime?: number;
    percentile?: number;
}

export interface IMockSession extends Document {
    user: Types.ObjectId;
    type: MockSessionType;
    config: IMockSessionConfig;
    problems: IMockProblem[];
    timeLimit: number;
    startedAt?: Date;
    completedAt?: Date;
    expiresAt?: Date;
    status: MockSessionStatus;
    score: IMockScore;
    createdAt: Date;
    updatedAt: Date;
}

// ==================== ROADMAP ====================
export interface IResource {
    title: string;
    url: string;
    type: ResourceType;
    duration?: number;
    isFree: boolean;
}

export interface IModule {
    title: string;
    order: number;
    description?: string;
    topics: string[];
    resources: IResource[];
    problems: Types.ObjectId[];
    prerequisites: Types.ObjectId[];
}

export interface IEnrolledUser {
    user: Types.ObjectId;
    progress: number;
    completedModules: Types.ObjectId[];
    startedAt: Date;
    completedAt?: Date;
    lastAccessedAt: Date;
}

export interface IRoadmapStats {
    totalEnrollments: number;
    averageCompletionTime: number;
    completionRate: number;
    rating: number;
    ratingsCount: number;
}

export interface IRoadmap extends Document {
    title: string;
    slug: string;
    description?: string;
    domain: RoadmapDomain;
    level: RoadmapLevel;
    thumbnail?: string;
    duration?: number;
    modules: IModule[];
    enrolledUsers: IEnrolledUser[];
    stats: IRoadmapStats;
    estimatedDuration?: number;
    isPublished: boolean;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

// ==================== COMPANY ====================
export interface IInterviewProcess {
    rounds?: number;
    typicalDuration?: string;
    stages: string[];
}

export interface ISalaryRange {
    min?: number;
    max?: number;
    currency: string;
}

export interface IDifficultyDistribution {
    easy: number;
    medium: number;
    hard: number;
}

export interface ICompany extends Document {
    name: string;
    logo?: string;
    description?: string;
    website?: string;
    hiring: boolean;
    interviewProcess: IInterviewProcess;
    salaryRange: ISalaryRange;
    difficultyDistribution: IDifficultyDistribution;
    popularTopics: string[];
    totalProblems: number;
    mockSessionCount: number;
    averageMockScore: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// ==================== MENTOR ====================
export interface ITimeSlot {
    start: string;
    end: string;
}

export interface IAvailability {
    dayOfWeek: number;
    slots: ITimeSlot[];
}

export interface IMentorExperience {
    years?: number;
    currentCompany?: string;
    currentRole?: string;
    pastCompanies: string[];
}

export interface IMentorPricing {
    thirtyMin?: number;
    sixtyMin?: number;
    currency: string;
}

export interface IMentorRating {
    average: number;
    count: number;
}

export interface IMentorBankAccount {
    accountNumber?: string;
    ifscCode?: string;
    accountHolder?: string;
}

export interface IMentorPayoutDetails {
    method?: PayoutMethod;
    upiId?: string;
    bankAccount?: IMentorBankAccount;
}

export interface IMentor extends Document {
    user: Types.ObjectId;
    slug: string;
    avatar?: string;
    linkedinUrl?: string;
    headline?: string;
    bio?: string;
    expertise: MentorExpertise[];
    sessionTopics: SessionTopic[];
    languages: string[];
    experience: IMentorExperience;
    availability: IAvailability[];
    timezone: string;
    pricing: IMentorPricing;
    rating: IMentorRating;
    totalSessions: number;
    totalEarnings: number;
    responseTime?: number;
    verified: boolean;
    verifiedAt?: Date;
    applicationStatus: MentorApplicationStatus;
    applicationNote?: string;
    cancellationRate: number;
    repeatStudentRate: number;
    payoutDetails?: IMentorPayoutDetails;
    isAcceptingBookings: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// ==================== BOOKING ====================
export interface IPayment {
    amount: number;
    currency: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    status: PaymentStatus;
    paidAt?: Date;
}

export interface IStudentFeedback {
    rating?: number;
    review?: string;
    submittedAt?: Date;
}

export interface IBookingRefund {
    amount?: number;
    reason?: string;
    processedAt?: Date;
    razorpayRefundId?: string;
}

export interface IBookingSessionNotes {
    content?: string;
    updatedAt?: Date;
}

export interface IBookingMentorPayout {
    amount?: number;
    status?: PayoutStatus;
    processedAt?: Date;
    transactionId?: string;
}

export interface IBooking extends Document {
    bookingId: string;
    mentor: Types.ObjectId;
    student: Types.ObjectId;
    scheduledAt: Date;
    duration: 30 | 60;
    timezone?: string;
    type: BookingType;
    topic?: string;
    agenda?: string;
    status: BookingStatus;
    jitsiRoomName?: string;
    meetingLink?: string;
    meetingProvider?: MeetingProvider;
    recordingUrl?: string;
    payment: IPayment;
    platformFee?: number;
    mentorPayout?: IBookingMentorPayout;
    studentFeedback: IStudentFeedback;
    sessionNotes?: IBookingSessionNotes;
    refund?: IBookingRefund;
    reminderSent: boolean;
    payoutProcessed: boolean;
    mentorNotes?: string;
    cancelledBy?: 'student' | 'mentor' | 'system';
    cancellationReason?: string;
    cancelledAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

// ==================== SUBSCRIPTION ====================
export interface ISubscriptionFeatures {
    unlimitedProblems: boolean;
    mockInterviews: number;
    profileSync: boolean;
    mentorMinutes: number;
}

export interface ISubscription extends Document {
    user: Types.ObjectId;
    plan: SubscriptionPlan;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripePriceId?: string;
    amount?: number;
    currency: string;
    interval?: SubscriptionInterval;
    status: SubscriptionStatus;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelledAt?: Date;
    features: ISubscriptionFeatures;
    createdAt: Date;
    updatedAt: Date;
}

// ==================== CODING PROFILE ====================
export interface ILeetCodeProfile {
    username?: string;
    totalSolved: number;
    easySolved: number;
    mediumSolved: number;
    hardSolved: number;
    ranking?: number;
    contestRating?: number;
    streak?: number;
    badges: string[];
    lastFetched?: Date;
    fetchError?: string;
}

export interface ICodeforcesProfile {
    handle?: string;
    rating?: number;
    maxRating?: number;
    rank?: string;
    contestsCount?: number;
    lastFetched?: Date;
}

export interface ICodeChefProfile {
    username?: string;
    rating?: number;
    stars?: number;
    globalRank?: number;
    lastFetched?: Date;
}

export interface IHackerRankCertificate {
    name: string;
    url: string;
}

export interface IHackerRankProfile {
    username?: string;
    badges: string[];
    certificates: IHackerRankCertificate[];
    lastFetched?: Date;
}

export interface IGitHubLanguage {
    name: string;
    percentage: number;
}

export interface IGitHubProfile {
    username?: string;
    contributions?: number;
    currentStreak?: number;
    longestStreak?: number;
    publicRepos?: number;
    followers?: number;
    topLanguages: IGitHubLanguage[];
    lastFetched?: Date;
}

export interface ICodingPlatforms {
    leetcode: ILeetCodeProfile;
    codeforces: ICodeforcesProfile;
    codechef: ICodeChefProfile;
    hackerrank: IHackerRankProfile;
    github: IGitHubProfile;
}

export interface IAggregatedStats {
    totalProblemsSolved?: number;
    strongestTopics: string[];
    weakestTopics: string[];
    consistencyScore?: number;
    activeDaysThisMonth?: number;
}

export interface ICodingProfile extends Document {
    user: Types.ObjectId;
    platforms: ICodingPlatforms;
    aggregatedStats: IAggregatedStats;
    lastFullSync?: Date;
    syncScheduled?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// ==================== CONVERSATION & MESSAGE ====================
export interface ILastMessage {
    content?: string;
    sender?: Types.ObjectId;
    sentAt?: Date;
}

export interface IConversation extends Document {
    participants: Types.ObjectId[];
    type: ConversationType;
    booking?: Types.ObjectId;
    lastMessage: ILastMessage;
    unreadCount: Map<string, number>;
    createdAt: Date;
    updatedAt: Date;
}

export interface ICodeBlock {
    language?: string;
    code?: string;
}

export interface IAttachment {
    url?: string;
    name?: string;
    size?: number;
    mimeType?: string;
}

export interface IReadReceipt {
    user: Types.ObjectId;
    readAt: Date;
}

export interface IMessage extends Document {
    conversation: Types.ObjectId;
    sender: Types.ObjectId;
    content?: string;
    type: MessageType;
    codeBlock?: ICodeBlock;
    attachment?: IAttachment;
    readBy: IReadReceipt[];
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// ==================== STUDY GROUP ====================
export interface IStudyGroupMember {
    user: Types.ObjectId;
    role: StudyGroupRole;
    joinedAt: Date;
}

export interface IStudyGroupSettings {
    isPublic: boolean;
    maxMembers: number;
    joinCode?: string;
    allowInvites: boolean;
}

export interface IStudyGroupFocus {
    topics: string[];
    difficulty?: StudyGroupDifficulty;
    targetCompanies: string[];
}

export interface IStudySession {
    title?: string;
    scheduledAt?: Date;
    duration?: number;
    problems: Types.ObjectId[];
    meetingLink?: string;
    host?: Types.ObjectId;
    participants: Types.ObjectId[];
    status: StudySessionStatus;
}

export interface IStudyGroupStats {
    totalProblemsAttempted: number;
    totalMeetingsHeld: number;
}

export interface IStudyGroup extends Document {
    name: string;
    description?: string;
    avatar?: string;
    creator: Types.ObjectId;
    members: IStudyGroupMember[];
    settings: IStudyGroupSettings;
    focus: IStudyGroupFocus;
    sessions: IStudySession[];
    conversation?: Types.ObjectId;
    stats: IStudyGroupStats;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// ==================== MENTOR REVIEW ====================
export interface IMentorReply {
    content: string;
    repliedAt: Date;
}

export interface IMentorReview extends Document {
    booking: Types.ObjectId;
    mentor: Types.ObjectId;
    student: Types.ObjectId;
    rating: number;
    review?: string;
    isPublic: boolean;
    isReported: boolean;
    reportReason?: string;
    mentorReply?: IMentorReply;
    createdAt: Date;
    updatedAt: Date;
}

// ==================== NOTIFICATION ====================
export interface INotification extends Document {
    user: Types.ObjectId;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, unknown>;
    isRead: boolean;
    readAt?: Date;
    actionUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}

// ==================== PAYOUT ====================
export interface IPayoutPeriod {
    start: Date;
    end: Date;
}

export interface IPayout extends Document {
    mentor: Types.ObjectId;
    bookings: Types.ObjectId[];
    amount: number;
    platformFee: number;
    netAmount: number;
    currency: string;
    status: PayoutStatus;
    method?: PayoutMethod;
    transactionId?: string;
    failureReason?: string;
    processedAt?: Date;
    period: IPayoutPeriod;
    createdAt: Date;
    updatedAt: Date;
}
