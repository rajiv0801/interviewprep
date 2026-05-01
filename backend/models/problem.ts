import mongoose, { Schema } from 'mongoose';
import { IProblem } from '../types/type';

const ProblemSchema = new Schema<IProblem>({
    title: { type: String, required: true, trim: true, maxLength: 200 },
    description: { type: String, required: true, trim: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true, index: true },
    companyTags: [{ type: String, trim: true, index: true }],
    topics: [{ type: String, trim: true, index: true }],
    pattern: [{
        type: String,
        trim: true,
        enum: ['sliding window', 'two pointers', 'tree traversal', 'graph traversal', 'dynamic programming', 'backtracking', 'greedy', 'heap', 'binary search', 'stack', 'bit manipulation', 'matrix', 'prefix sum', 'sorting', 'linked list', 'recursion', 'math', 'hash table', 'queue', 'divide and conquer'],
        index: true
    }],
    visibleTestCases: [{
        input: { type: String, required: true },
        output: { type: String, required: true },
        explanation: { type: String, trim: true }
    }],
    hiddenTestCases: [{
        input: { type: String, required: true },
        output: { type: String, required: true }
    }],
    starterCode: [{
        language: { type: String, required: true },
        code: { type: String, required: true }
    }],
    solutions: [{
        language: { type: String, required: true },
        code: { type: String, required: true }
    }],
    constraints: { type: String, trim: true },
    hints: [{ type: String, trim: true }],
    memoryLimit: { type: Number, default: 256, min: 1, max: 1024 },
    timeLimit: { type: Number, default: 2000 },
    submissionsCount: { type: Number, default: 0 },
    acceptedCount: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    slug: { type: String, unique: true },
    premium: { type: Boolean, default: false },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    relatedProblems: [{ type: Schema.Types.ObjectId, ref: 'Problem' }]
}, {
    timestamps: true
});

ProblemSchema.virtual('acceptanceRate').get(function () {
    if (this.submissionsCount === 0) return 0;
    return ((this.acceptedCount / this.submissionsCount) * 100).toFixed(1);
});

const Problem = mongoose.model<IProblem>('Problem', ProblemSchema);

export default Problem;