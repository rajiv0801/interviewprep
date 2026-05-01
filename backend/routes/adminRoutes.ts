import { Router } from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware';
import {
    listMentorApplications,
    approveMentor,
    rejectMentor,
    getAdminRevenue
} from '../controller/mentorController';

const adminRouter = Router();

// All admin routes require authentication + admin role
adminRouter.use(protect, adminOnly);

// Mentor application management
adminRouter.get('/mentor-applications', listMentorApplications);
adminRouter.put('/mentors/:id/approve', approveMentor);
adminRouter.put('/mentors/:id/reject', rejectMentor);

// Revenue & analytics
adminRouter.get('/revenue', getAdminRevenue);

export default adminRouter;
