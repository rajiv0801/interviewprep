import * as express from 'express';
import { getCodingStats } from '../controller/codingController';
import { protect } from '../middleware';

const codingRouter: express.Router = express.Router();

// Get coding stats for a specific platform and username
// Protected because it's only for logged-in users to see their (or others') profiles
codingRouter.get('/stats/:platform/:username', protect, getCodingStats);

export default codingRouter;
