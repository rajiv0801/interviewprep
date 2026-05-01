import * as express from 'express';
import { protect, optionalAuth, adminOnly, validate, submissionLimiter } from '../middleware';
import {
    createProblemSchema,
    updateProblemSchema,
    getProblemSchema,
    listProblemsSchema,
    deleteProblemSchema,
} from '../validator';
import {
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
} from '../controller/problemController';

const problemRouter: express.Router = express.Router();

// ==================== HEALTH CHECK (First - matches /health before /:id) ====================

problemRouter.get('/health', (_req, res) => {
    res.status(200).json({ success: true, message: 'Problem service is healthy' });
});


problemRouter.get('/user/solved', protect, validate(listProblemsSchema), getSolvedProblems);

// Get problem stats (difficulty counts, topic counts)
problemRouter.get('/stats', optionalAuth, getProblemStats);

problemRouter.post('/generate-mock', protect, submissionLimiter, generateMockProblems);


problemRouter.get('/company/:company', protect, getProblemsByCompany);


problemRouter.post('/', protect, adminOnly, validate(createProblemSchema), createProblem);

// Update problem - Admin only
problemRouter.put('/:id', protect, adminOnly, validate(updateProblemSchema), updateProblem);

// PATCH also supported for partial updates
problemRouter.patch('/:id', protect, adminOnly, validate(updateProblemSchema), updateProblem);

// Delete problem - Admin only
problemRouter.delete('/:id', protect, adminOnly, validate(deleteProblemSchema), deleteProblem);


// Get all problems with filtering & pagination
problemRouter.get('/', optionalAuth, validate(listProblemsSchema), getAllProblems);

// Get submissions for a problem (before /:id to match /123/submissions)
problemRouter.get('/:id/submissions', protect, validate(getProblemSchema), getSubmissions);

// Get single problem by ID or slug (LAST - catches all remaining /:id patterns)
problemRouter.get('/:id', optionalAuth, validate(getProblemSchema), getProblemById);

export default problemRouter;