import { Response } from 'express';
import mongoose from 'mongoose';
import Problem from '../models/problem';
import Submission from '../models/submission';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { IProblem, Difficulty } from '../types/type';

// ==================== TYPES ====================

interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
}

interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

interface ProblemWithStatus {
    _id?: mongoose.Types.ObjectId;
    title?: string;
    difficulty?: Difficulty;
    topics?: string[];
    companyTags?: string[];
    pattern?: string[];
    submissionsCount?: number;
    acceptedCount?: number;
    slug?: string;
    premium?: boolean;
    createdAt?: Date;
    isSolved?: boolean;
    acceptanceRate?: string;
}

interface CompanyStats {
    easy: number;
    medium: number;
    hard: number;
    total: number;
    userSolved: number;
}

// ==================== CONFIGURATION ====================

const config = {
    env: process.env.NODE_ENV || 'development',
    maxPageLimit: 100,
    defaultPageLimit: 20,
};

// ==================== HELPER FUNCTIONS ====================

const sendResponse = <T>(res: Response, statusCode: number, data: ApiResponse<T>): void => {
    res.status(statusCode).json(data);
};

const sendError = (res: Response, statusCode: number, message: string): void => {
    sendResponse(res, statusCode, { success: false, message });
};

const handleError = (error: unknown, res: Response, context: string): void => {
    console.error(`[${context}] Error:`, error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    if (error instanceof Error && error.name === 'ValidationError') {
        sendError(res, 400, errorMessage);
        return;
    }

    if (error instanceof Error && error.message.includes('duplicate key')) {
        sendError(res, 409, 'A problem with this title or slug already exists');
        return;
    }

    sendResponse(res, 500, {
        success: false,
        message: `Error in ${context}`,
        error: config.env === 'development' ? errorMessage : undefined,
    });
};

const isValidObjectId = (id: string): boolean => {
    return mongoose.Types.ObjectId.isValid(id);
};

const generateSlug = (title: string): string => {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 100);
};

const sanitizePagination = (page: unknown, limit: unknown): { page: number; limit: number; skip: number } => {
    const sanitizedPage = Math.max(1, parseInt(String(page || '1'), 10) || 1);
    const sanitizedLimit = Math.min(
        config.maxPageLimit,
        Math.max(1, parseInt(String(limit || config.defaultPageLimit), 10) || config.defaultPageLimit)
    );
    const skip = (sanitizedPage - 1) * sanitizedLimit;
    return { page: sanitizedPage, limit: sanitizedLimit, skip };
};

const getStringParam = (param: unknown): string => {
    if (typeof param === 'string') return param;
    if (Array.isArray(param)) return param[0] || '';
    return String(param || '');
};

// ==================== CONTROLLERS ====================

/**
 * @route   POST /api/problems
 * @desc    Create a new problem
 * @access  Admin only
 */
export const createProblem = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 401, 'Not authenticated');
            return;
        }

        const {
            title,
            description,
            difficulty,
            companyTags,
            topics,
            pattern,
            visibleTestCases,
            hiddenTestCases,
            starterCode,
            solutions,
            constraints,
            hints,
            memoryLimit,
            timeLimit,
            premium,
            relatedProblems,
        } = req.body;

        // Check for existing problem
        const slug = generateSlug(title);
        const existingProblem = await Problem.findOne({
            $or: [
                { title: { $regex: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
                { slug },
            ],
        });

        if (existingProblem) {
            sendError(res, 409, 'A problem with this title already exists');
            return;
        }

        const problem = await Problem.create({
            title: title.trim(),
            description,
            difficulty,
            companyTags: companyTags || [],
            topics: topics || [],
            pattern: pattern || [],
            visibleTestCases: visibleTestCases || [],
            hiddenTestCases: hiddenTestCases || [],
            starterCode: starterCode || [],
            solutions: solutions || [],
            constraints: constraints || '',
            hints: hints || [],
            memoryLimit: memoryLimit || 256,
            timeLimit: timeLimit || 2000,
            premium: premium || false,
            relatedProblems: relatedProblems || [],
            slug,
            createdBy: req.user._id,
        });

        sendResponse(res, 201, {
            success: true,
            message: 'Problem created successfully',
            data: problem,
        });
    } catch (error) {
        handleError(error, res, 'createProblem');
    }
};

/**
 * @route   PUT /api/problems/:id
 * @desc    Update a problem
 * @access  Admin only
 */
export const updateProblem = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const id = getStringParam(req.params.id);

        if (!isValidObjectId(id)) {
            sendError(res, 400, 'Invalid problem ID');
            return;
        }

        const problem = await Problem.findById(id);
        if (!problem) {
            sendError(res, 404, 'Problem not found');
            return;
        }

        // Restricted fields
        const restrictedFields = ['submissionsCount', 'acceptedCount', 'createdBy', 'createdAt', 'updatedAt', 'likes', 'dislikes'];
        const updates: Record<string, unknown> = { ...req.body };
        restrictedFields.forEach(field => delete updates[field]);

        // Update slug if title changes
        if (updates.title && typeof updates.title === 'string') {
            const newSlug = generateSlug(updates.title);
            updates.slug = newSlug;
            // Check for slug collision (exclude current problem)
            const existingSlug = await Problem.findOne({
                slug: newSlug,
                _id: { $ne: id },
            } as Record<string, unknown>);
            if (existingSlug) {
                sendError(res, 409, 'A problem with a similar title already exists');
                return;
            }
        }

        const updatedProblem = await Problem.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true,
        });

        sendResponse(res, 200, {
            success: true,
            message: 'Problem updated successfully',
            data: updatedProblem,
        });
    } catch (error) {
        handleError(error, res, 'updateProblem');
    }
};

/**
 * @route   DELETE /api/problems/:id
 * @desc    Delete a problem
 * @access  Admin only
 */
export const deleteProblem = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const id = getStringParam(req.params.id);

        if (!isValidObjectId(id)) {
            sendError(res, 400, 'Invalid problem ID');
            return;
        }

        const problem = await Problem.findById(id);
        if (!problem) {
            sendError(res, 404, 'Problem not found');
            return;
        }

        const submissionCount = await Submission.countDocuments({ problem: id });
        if (submissionCount > 0) {
            sendError(res, 400, `Cannot delete problem with ${submissionCount} existing submissions`);
            return;
        }

        await problem.deleteOne();

        sendResponse(res, 200, {
            success: true,
            message: 'Problem deleted successfully',
        });
    } catch (error) {
        handleError(error, res, 'deleteProblem');
    }
};

/**
 * @route   GET /api/problems/:id
 * @desc    Get a single problem by ID or slug
 * @access  Protected
 */
export const getProblemById = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const id = getStringParam(req.params.id);
        const query = isValidObjectId(id) ? { _id: id } : { slug: id.toLowerCase() };

        const problem = await Problem.findOne(query)
            .select('-hiddenTestCases')
            .populate('createdBy', 'name username')
            .populate('relatedProblems', 'title difficulty slug')
            .lean();

        if (!problem) {
            sendError(res, 404, 'Problem not found');
            return;
        }

        const submissions = req.user ? await Submission.find({
            user: req.user._id,
            problem: problem._id,
        })
            .select('status language runtime memory createdAt')
            .sort({ createdAt: -1 })
            .limit(10)
            .lean() : [];

        let preferredStarterCode = null;
        if (problem.starterCode && problem.starterCode.length > 0) {
            const lastSubmission = submissions[0];
            if (lastSubmission) {
                preferredStarterCode = problem.starterCode.find(
                    (sc: { language: string }) => sc.language === lastSubmission.language
                );
            }
            if (!preferredStarterCode) {
                preferredStarterCode = problem.starterCode[0];
            }
        }

        sendResponse(res, 200, {
            success: true,
            data: {
                ...problem,
                preferredStarterCode,
                userSubmissions: submissions,
                isSolved: submissions.some(sub => sub.status === 'Accepted'),
            },
        });
    } catch (error) {
        handleError(error, res, 'getProblemById');
    }
};

/**
 * @route   GET /api/problems
 * @desc    Get all problems with filtering and pagination
 * @access  Protected
 */
export const getAllProblems = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { page, limit, difficulty, company, topic, pattern, search, premium, sortBy, sortOrder } = req.query;
        const { page: sanitizedPage, limit: sanitizedLimit, skip } = sanitizePagination(page, limit);

        // Build query
        const query: Record<string, unknown> = {};

        const difficultyStr = getStringParam(difficulty);
        if (difficultyStr && ['easy', 'medium', 'hard'].includes(difficultyStr)) {
            query.difficulty = difficultyStr;
        }

        const companyStr = getStringParam(company);
        if (companyStr) {
            query.companyTags = { $in: [companyStr] };
        }

        const topicStr = getStringParam(topic);
        if (topicStr) {
            query.topics = { $in: [topicStr] };
        }

        const patternStr = getStringParam(pattern);
        if (patternStr) {
            query.pattern = { $in: [patternStr] };
        }

        if (premium === 'true') {
            query.premium = true;
        } else if (premium === 'false') {
            query.premium = false;
        }

        const searchStr = getStringParam(search);
        if (searchStr && searchStr.length <= 100) {
            const sanitizedSearch = searchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.$or = [
                { title: { $regex: sanitizedSearch, $options: 'i' } },
                { topics: { $in: [new RegExp(sanitizedSearch, 'i')] } },
            ];
        }

        // Sort
        const allowedSortFields = ['title', 'difficulty', 'createdAt', 'submissionsCount', 'acceptedCount', 'likes'];
        const sortByParam = getStringParam(sortBy);
        const sortOrderValue = sortOrder === 'asc' ? 1 : -1;
        
        // Use aggregation for acceptanceRate sorting, otherwise use regular query
        if (sortByParam === 'acceptanceRate') {
            // Build aggregation pipeline for acceptance rate sorting
            const matchStage: Record<string, unknown> = { ...query };
            
            const pipeline: any[] = [
                { $match: matchStage },
                {
                    $addFields: {
                        computedAcceptanceRate: {
                            $cond: {
                                if: { $eq: ['$submissionsCount', 0] },
                                then: 0,
                                else: {
                                    $multiply: [
                                        { $divide: ['$acceptedCount', '$submissionsCount'] },
                                        100
                                    ]
                                }
                            }
                        }
                    }
                },
                { $sort: { computedAcceptanceRate: sortOrderValue } },
                { $skip: skip },
                { $limit: sanitizedLimit },
                {
                    $project: {
                        title: 1,
                        difficulty: 1,
                        topics: 1,
                        companyTags: 1,
                        pattern: 1,
                        submissionsCount: 1,
                        acceptedCount: 1,
                        slug: 1,
                        premium: 1,
                        createdAt: 1
                    }
                }
            ];

            const [problems, total] = await Promise.all([
                Problem.aggregate(pipeline),
                Problem.countDocuments(query),
            ]);

            const solvedSubmissions = req.user ? await Submission.find({
                user: req.user._id,
                problem: { $in: problems.map(p => p._id) },
                status: 'Accepted',
            }).distinct('problem') : [];

            const solvedIds = new Set(solvedSubmissions.map(id => id.toString()));

            const problemsWithStatus: ProblemWithStatus[] = problems.map(problem => ({
                ...problem,
                isSolved: solvedIds.has(problem._id.toString()),
                acceptanceRate: problem.submissionsCount > 0
                    ? ((problem.acceptedCount / problem.submissionsCount) * 100).toFixed(1)
                    : '0.0',
            }));

            const pagination: PaginationInfo = {
                page: sanitizedPage,
                limit: sanitizedLimit,
                total,
                pages: Math.ceil(total / sanitizedLimit),
            };

            sendResponse(res, 200, {
                success: true,
                data: { problems: problemsWithStatus, pagination },
            });
            return;
        }
        
        // Regular sorting for non-acceptanceRate fields
        const sortField = allowedSortFields.includes(sortByParam) ? sortByParam : 'createdAt';
        const sort: Record<string, 1 | -1> = { [sortField]: sortOrderValue };

        const [problems, total] = await Promise.all([
            Problem.find(query)
                .select('title difficulty topics companyTags pattern submissionsCount acceptedCount slug premium createdAt')
                .sort(sort)
                .skip(skip)
                .limit(sanitizedLimit)
                .lean(),
            Problem.countDocuments(query),
        ]);

        const solvedSubmissions = req.user ? await Submission.find({
            user: req.user._id,
            problem: { $in: problems.map(p => p._id) },
            status: 'Accepted',
        }).distinct('problem') : [];

        const solvedIds = new Set(solvedSubmissions.map(id => id.toString()));

        const problemsWithStatus: ProblemWithStatus[] = problems.map(problem => ({
            ...problem,
            isSolved: solvedIds.has(problem._id.toString()),
            acceptanceRate: problem.submissionsCount > 0
                ? ((problem.acceptedCount / problem.submissionsCount) * 100).toFixed(1)
                : '0.0',
        }));

        const pagination: PaginationInfo = {
            page: sanitizedPage,
            limit: sanitizedLimit,
            total,
            pages: Math.ceil(total / sanitizedLimit),
        };

        sendResponse(res, 200, {
            success: true,
            data: { problems: problemsWithStatus, pagination },
        });
    } catch (error) {
        handleError(error, res, 'getAllProblems');
    }
};

/**
 * @route   GET /api/problems/user/solved
 * @desc    Get all problems solved by current user
 * @access  Protected
 */
export const getSolvedProblems = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 401, 'Not authenticated');
            return;
        }

        const { page, limit, difficulty, company, topic } = req.query;
        const { page: sanitizedPage, limit: sanitizedLimit, skip } = sanitizePagination(page, limit);

        const solvedProblemIds = await Submission.find({
            user: req.user._id,
            status: 'Accepted',
        }).distinct('problem');

        const query: Record<string, unknown> = { _id: { $in: solvedProblemIds } };

        const difficultyStr = getStringParam(difficulty);
        if (difficultyStr && ['easy', 'medium', 'hard'].includes(difficultyStr)) {
            query.difficulty = difficultyStr;
        }

        const companyStr = getStringParam(company);
        if (companyStr) {
            query.companyTags = { $in: [companyStr] };
        }

        const topicStr = getStringParam(topic);
        if (topicStr) {
            query.topics = { $in: [topicStr] };
        }

        const [problems, total] = await Promise.all([
            Problem.find(query)
                .select('title difficulty topics companyTags slug premium createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(sanitizedLimit)
                .lean(),
            Problem.countDocuments(query),
        ]);

        const pagination: PaginationInfo = {
            page: sanitizedPage,
            limit: sanitizedLimit,
            total,
            pages: Math.ceil(total / sanitizedLimit),
        };

        sendResponse(res, 200, {
            success: true,
            data: { problems, pagination },
        });
    } catch (error) {
        handleError(error, res, 'getSolvedProblems');
    }
};

/**
 * @route   GET /api/problems/:id/submissions
 * @desc    Get user's submissions for a specific problem
 * @access  Protected
 */
export const getSubmissions = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 401, 'Not authenticated');
            return;
        }

        const id = getStringParam(req.params.id);
        const { page, limit } = req.query;

        if (!isValidObjectId(id)) {
            sendError(res, 400, 'Invalid problem ID');
            return;
        }

        const problem = await Problem.findById(id).select('title difficulty').lean();
        if (!problem) {
            sendError(res, 404, 'Problem not found');
            return;
        }

        const { page: sanitizedPage, limit: sanitizedLimit, skip } = sanitizePagination(page, limit);

        const [submissions, total] = await Promise.all([
            Submission.find({ user: req.user._id, problem: id })
                .select('status language runtime memory testCasesPassed testCasesTotal createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Math.min(sanitizedLimit, 50))
                .populate('mockSession', 'title')
                .lean(),
            Submission.countDocuments({ user: req.user._id, problem: id }),
        ]);

        const pagination: PaginationInfo = {
            page: sanitizedPage,
            limit: sanitizedLimit,
            total,
            pages: Math.ceil(total / sanitizedLimit),
        };

        sendResponse(res, 200, {
            success: true,
            data: { problem: { title: problem.title, difficulty: problem.difficulty }, submissions, pagination },
        });
    } catch (error) {
        handleError(error, res, 'getSubmissions');
    }
};

/**
 * @route   GET /api/problems/company/:company
 * @desc    Get problems by company tag
 * @access  Protected
 */
export const getProblemsByCompany = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 401, 'Not authenticated');
            return;
        }

        const company = getStringParam(req.params.company).trim().substring(0, 100);
        const { difficulty } = req.query;

        const query: Record<string, unknown> = { companyTags: { $in: [company] } };

        const difficultyStr = getStringParam(difficulty);
        if (difficultyStr && ['easy', 'medium', 'hard'].includes(difficultyStr)) {
            query.difficulty = difficultyStr;
        }

        const problems = await Problem.find(query)
            .select('title difficulty topics companyTags submissionsCount acceptedCount slug')
            .lean();

        const userSolved = await Submission.find({
            user: req.user._id,
            status: 'Accepted',
            problem: { $in: problems.map(p => p._id) },
        }).distinct('problem');

        const solvedIds = new Set(userSolved.map(id => id.toString()));

        const problemsWithStatus: ProblemWithStatus[] = problems.map(problem => ({
            ...problem,
            isSolved: solvedIds.has(problem._id.toString()),
            acceptanceRate: problem.submissionsCount > 0
                ? ((problem.acceptedCount / problem.submissionsCount) * 100).toFixed(1)
                : '0.0',
        }));

        const stats: CompanyStats = { easy: 0, medium: 0, hard: 0, total: problems.length, userSolved: userSolved.length };
        problems.forEach(problem => {
            const diff = problem.difficulty as 'easy' | 'medium' | 'hard';
            if (diff in stats) stats[diff]++;
        });

        sendResponse(res, 200, {
            success: true,
            data: { company, problems: problemsWithStatus, stats },
        });
    } catch (error) {
        handleError(error, res, 'getProblemsByCompany');
    }
};

/**
 * @route   POST /api/problems/generate-mock
 * @desc    Generate random mock interview problems
 * @access  Protected
 */
export const generateMockProblems = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        if (!req.user) {
            sendError(res, 401, 'Not authenticated');
            return;
        }

        const { company, difficulty = 'medium', count = 3 } = req.body;
        const problemCount = Math.min(Math.max(1, parseInt(count, 10) || 3), 5);

        type DistType = { easy: number; medium: number; hard: number };
        const distributions: Record<string, DistType> = {
            easy: { easy: 2, medium: 1, hard: 0 },
            medium: { easy: 1, medium: 1, hard: 1 },
            hard: { easy: 0, medium: 1, hard: 2 },
        };

        const distribution = distributions[difficulty] || distributions.medium;
        const baseQuery: Record<string, unknown> = {};
        if (company) {
            baseQuery.companyTags = { $in: [String(company).trim()] };
        }

        const mockProblems: IProblem[] = [];

        for (const [diff, targetCount] of Object.entries(distribution)) {
            if (targetCount > 0) {
                const problems = await Problem.aggregate([
                    { $match: { ...baseQuery, difficulty: diff } },
                    { $sample: { size: targetCount } },
                    {
                        $project: {
                            title: 1, description: 1, difficulty: 1, topics: 1, pattern: 1,
                            constraints: 1, memoryLimit: 1, timeLimit: 1, starterCode: 1, visibleTestCases: 1, slug: 1,
                        },
                    },
                ]);
                mockProblems.push(...problems);
            }
        }

        const shuffled = mockProblems.sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, problemCount);

        if (selected.length === 0) {
            sendError(res, 404, 'No problems found matching the criteria');
            return;
        }

        sendResponse(res, 200, {
            success: true,
            data: { company: company || 'All Companies', difficulty, problemCount: selected.length, problems: selected },
        });
    } catch (error) {
        handleError(error, res, 'generateMockProblems');
    }
};

/**
 * @route   GET /api/problems/stats
 * @desc    Get problem statistics (difficulty counts, topic counts)
 * @access  Protected
 */
export const getProblemStats = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        // Difficulty breakdown
        const difficultyCounts = await Problem.aggregate([
            { $group: { _id: '$difficulty', count: { $sum: 1 } } }
        ]);

        const difficultyMap: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
        difficultyCounts.forEach((d: { _id: string; count: number }) => {
            difficultyMap[d._id] = d.count;
        });

        const total = await Problem.countDocuments();

        // Company breakdown
        const companyCounts = await Problem.aggregate([
            { $unwind: '$companyTags' },
            { $group: { _id: '$companyTags', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 20 }
        ]);

        // Pattern breakdown
        const patternCounts = await Problem.aggregate([
            { $unwind: '$pattern' },
            { $group: { _id: '$pattern', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 20 }
        ]);

        // Topic breakdown (unwind topics array, count each)
        const topicCounts = await Problem.aggregate([
            { $unwind: '$topics' },
            { $group: { _id: '$topics', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 20 }
        ]);

        // User solved count
        const solvedCount = req.user ? await Submission.distinct('problem', {
            user: req.user._id,
            status: 'Accepted',
        }) : [];

        sendResponse(res, 200, {
            success: true,
            data: {
                total,
                easy: difficultyMap.easy,
                medium: difficultyMap.medium,
                hard: difficultyMap.hard,
                solved: solvedCount.length,
                topics: topicCounts.map((t: { _id: string; count: number }) => ({
                    name: t._id,
                    count: t.count,
                })),
                companies: companyCounts.map((t: { _id: string; count: number }) => ({
                    name: t._id,
                    count: t.count,
                })),
                patterns: patternCounts.map((t: { _id: string; count: number }) => ({
                    name: t._id,
                    count: t.count,
                })),
            },
        });
    } catch (error) {
        handleError(error, res, 'getProblemStats');
    }
};

// ==================== EXPORTS ====================

export default {
    createProblem,
    updateProblem,
    deleteProblem,
    getProblemById,
    getAllProblems,
    getSolvedProblems,
    getSubmissions,
    getProblemsByCompany,
    generateMockProblems,
    getProblemStats,
};
