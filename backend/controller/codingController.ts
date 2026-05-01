import { Request, Response } from 'express';
import axios from 'axios';

export const getCodingStats = async (req: Request, res: Response): Promise<void> => {
    const { platform, username } = req.params;

    try {
        let apiUrl = '';
        let data: any = null;

        switch (platform) {
            case 'leetcode':
                apiUrl = `https://scraper-graphora.onrender.com/leetcode-data?username=${username}`;
                break;
            case 'gfg':
                apiUrl = `https://scraper-graphora.onrender.com/geeksforgeeks-data?username=${username}`;
                break;
            case 'codechef':
                apiUrl = `https://scraper-graphora.onrender.com/codechef-data?username=${username}`;
                break;
            case 'codeforces':
                apiUrl = `https://codeforces.com/api/user.info?handles=${username}`;
                break;
            case 'github':
                apiUrl = `https://api.github.com/users/${username}`;
                break;
            default:
                res.status(400).json({ success: false, message: 'Invalid platform' });
                return;
        }

        const isPost = platform === 'leetcode' || platform === 'gfg' || platform === 'codechef';
        const response = isPost 
            ? await axios.post(apiUrl, {}, { timeout: 15000 })
            : await axios.get(apiUrl, { timeout: 15000 });
        
        data = response.data;

        res.status(200).json({
            success: true,
            platform,
            data
        });
    } catch (error: any) {
        console.error(`Error fetching stats for ${platform}/${username}:`, error.message);
        
        // Return a consistent error response instead of letting the browser fail
        res.status(error.response?.status || 500).json({
            success: false,
            message: `Failed to fetch stats from ${platform}`,
            error: error.response?.data || error.message
        });
    }
};
