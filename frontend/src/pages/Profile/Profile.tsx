import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { motion } from 'framer-motion';
import { SiLeetcode, SiCodeforces, SiCodechef, SiGithub } from 'react-icons/si';
import { FaLaptopCode, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import './Profile.css';

interface LeetCodeStat {
    difficulty: string;
    count: number;
}

interface CodeforcesStats {
    rank?: string;
    rating?: number;
    maxRating?: number;
}

interface CodeChefStats {
    "Questions Solved"?: number;
    "Contests"?: number;
    [key: string]: unknown;
}

interface GitHubStats {
    public_repos: number;
    followers: number;
    html_url: string;
    message?: string;
}

interface GfgStats {
    "Problems Solved"?: number;
    "Coding Score"?: number;
    [key: string]: unknown;
}

interface CodingData {
    leetcode?: LeetCodeStat[];
    gfg?: GfgStats;
    codeforces?: CodeforcesStats;
    codechef?: CodeChefStats;
    github?: GitHubStats;
}

interface UserData {
    name: string;
    username: string;
    email: string;
    avatar?: string;
    codingProfiles?: {
        leetcode?: string;
        gfg?: string;
        codeforces?: string;
        codechef?: string;
        github?: string;
    };
}

const Profile: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<UserData | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [handles, setHandles] = useState({
        leetcode: '',
        gfg: '',
        codeforces: '',
        codechef: '',
        github: '',
    });
    const [codingData, setCodingData] = useState<CodingData>({});
    const [loadingData, setLoadingData] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return navigate('/login');
                const res = await axios.get<{ success: boolean, data: { user: UserData } }>('/api/auth/profile', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const userData = res.data.data.user;
                setUser(userData);
                if (userData && userData.codingProfiles) {
                    setHandles({
                        leetcode: userData.codingProfiles.leetcode || '',
                        gfg: userData.codingProfiles.gfg || '',
                        codeforces: userData.codingProfiles.codeforces || '',
                        codechef: userData.codingProfiles.codechef || '',
                        github: userData.codingProfiles.github || '',
                    });
                    fetchCodingData(userData.codingProfiles);
                }
            } catch(e) { 
                console.error("Profile fetch error:", e);
                toast.error("Session expired. Please login again.");
                navigate('/login');
            }
        };
        fetchProfile();
    }, [navigate]);

    const fetchCodingData = async (profiles: NonNullable<UserData['codingProfiles']>) => {
        setLoadingData(true);
        const newData: CodingData = {};

        try {
            const promises = [];

            // Fetch LeetCode
            if (profiles.leetcode) {
                promises.push(
                    axios.get(`/api/coding/stats/leetcode/${profiles.leetcode}`)
                        .then(res => {
                            const data = res.data.data;
                            if (data && !data.errors && data.data?.matchedUser?.submitStats?.acSubmissionNum) {
                                newData.leetcode = data.data.matchedUser.submitStats.acSubmissionNum;
                            }
                        })
                        .catch(err => console.error("Leetcode fetch error:", err))
                );
            }

            // Fetch GFG
            if (profiles.gfg) {
                promises.push(
                    axios.get(`/api/coding/stats/gfg/${profiles.gfg}`)
                        .then(res => {
                            const data = res.data.data;
                            if (data && !data.info) newData.gfg = data;
                        })
                        .catch(err => console.error("GFG fetch error:", err))
                );
            }

            // Fetch CodeChef
            if (profiles.codechef) {
                promises.push(
                    axios.get(`/api/coding/stats/codechef/${profiles.codechef}`)
                        .then(res => {
                            const data = res.data.data;
                            if (data && !data.info) newData.codechef = data;
                        })
                        .catch(err => console.error("Codechef fetch error:", err))
                );
            }

            // Fetch CodeForces
            if (profiles.codeforces) {
                promises.push(
                    axios.get(`/api/coding/stats/codeforces/${profiles.codeforces}`)
                        .then(res => {
                            const data = res.data.data;
                            if (data && data.status === 'OK') newData.codeforces = data.result[0];
                        })
                        .catch(err => console.error("Codeforces fetch error:", err))
                );
            }

            // Fetch GitHub
            if (profiles.github) {
                promises.push(
                    axios.get(`/api/coding/stats/github/${profiles.github}`)
                        .then(res => {
                            const data = res.data.data;
                            if (data && !data.message) newData.github = data;
                        })
                        .catch(err => console.error("GitHub fetch error:", err))
                );
            }

            await Promise.allSettled(promises);
            setCodingData(newData);
        } catch (error) {
            console.error("Error fetching coding data:", error);
            toast.error("Failed to fetch some coding profiles.");
        } finally {
            setLoadingData(false);
        }
    };

    const handleSaveHandles = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.patch<{ success: boolean, data: { user: UserData } }>('/api/auth/profile', {
                codingProfiles: handles
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(res.data.data.user);
            setIsEditing(false);
            toast.success("Coding profiles updated!");
            fetchCodingData(handles);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to update profiles";
            toast.error(message);
        }
    };

    const renderLeetcodeStats = () => {
        if (!codingData.leetcode) return null;
        const stats = codingData.leetcode;
        const total = stats.find((s: LeetCodeStat) => s.difficulty === 'All')?.count || 0;
        const easy = stats.find((s: LeetCodeStat) => s.difficulty === 'Easy')?.count || 0;
        const medium = stats.find((s: LeetCodeStat) => s.difficulty === 'Medium')?.count || 0;
        const hard = stats.find((s: LeetCodeStat) => s.difficulty === 'Hard')?.count || 0;

        return (
            <div className="platform-card leetcode">
                <div className="platform-header">
                    <SiLeetcode className="platform-icon" />
                    <h3>LeetCode</h3>
                </div>
                <div className="platform-stats">
                    <div className="stat-circle">
                        <span className="total-solved">{total}</span>
                        <span className="solved-label">Solved</span>
                    </div>
                    <div className="stat-details">
                        <div className="stat-row easy">
                            <span>Easy</span>
                            <strong>{easy}</strong>
                        </div>
                        <div className="stat-row medium">
                            <span>Medium</span>
                            <strong>{medium}</strong>
                        </div>
                        <div className="stat-row hard">
                            <span>Hard</span>
                            <strong>{hard}</strong>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderCodeforcesStats = () => {
        if (!codingData.codeforces) return null;
        const cf = codingData.codeforces;
        return (
            <div className="platform-card codeforces">
                <div className="platform-header">
                    <SiCodeforces className="platform-icon" />
                    <h3>Codeforces</h3>
                </div>
                <div className="cf-stats">
                    <div className="cf-rank">{cf.rank || 'Unrated'}</div>
                    <div className="cf-rating-box">
                        <div className="cf-metric">
                            <span>Rating</span>
                            <strong>{cf.rating || 0}</strong>
                        </div>
                        <div className="cf-metric">
                            <span>Max Rating</span>
                            <strong>{cf.maxRating || 0}</strong>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderCodechefStats = () => {
        if (!codingData.codechef) return null;
        const cc = codingData.codechef;
        return (
            <div className="platform-card codechef">
                <div className="platform-header">
                    <SiCodechef className="platform-icon" />
                    <h3>CodeChef</h3>
                </div>
                <div className="cc-stats">
                    <div className="cc-metric">
                        <span>Questions Solved</span>
                        <strong>{cc["Questions Solved"] || 0}</strong>
                    </div>
                    <div className="cc-metric">
                        <span>Contests</span>
                        <strong>{cc["Contests"] || 0}</strong>
                    </div>
                </div>
            </div>
        );
    };

    const renderGithubStats = () => {
        if (!codingData.github) return null;
        const gh = codingData.github;
        return (
            <div className="platform-card github">
                <div className="platform-header">
                    <SiGithub className="platform-icon" />
                    <h3>GitHub</h3>
                </div>
                <div className="gh-stats">
                    <div className="gh-metric">
                        <span>Repos</span>
                        <strong>{gh.public_repos || 0}</strong>
                    </div>
                    <div className="gh-metric">
                        <span>Followers</span>
                        <strong>{gh.followers || 0}</strong>
                    </div>
                </div>
                <div className="gh-profile">
                    <a href={gh.html_url} target="_blank" rel="noreferrer">View Profile</a>
                </div>
            </div>
        );
    };

    const renderGfgStats = () => {
        if (!codingData.gfg) return null;
        const gfg = codingData.gfg;
        // GFG format from scraper wasn't tested successfully but usually it has { "Problems Solved": ... } or similar.
        // We will display raw object keys if needed, or specific if we know them.
        return (
            <div className="platform-card gfg">
                <div className="platform-header">
                    <FaLaptopCode className="platform-icon" /> {/* Using generic for Gfg */}
                    <h3>GeeksForGeeks</h3>
                </div>
                <div className="gfg-stats">
                    {gfg["Problems Solved"] !== undefined && (
                        <div className="gfg-metric">
                            <span>Solved</span>
                            <strong>{gfg["Problems Solved"]}</strong>
                        </div>
                    )}
                    {gfg["Coding Score"] !== undefined && (
                        <div className="gfg-metric">
                            <span>Coding Score</span>
                            <strong>{gfg["Coding Score"]}</strong>
                        </div>
                    )}
                    {/* Fallback if format differs */}
                    {Object.keys(gfg).length > 0 && gfg["Problems Solved"] === undefined && gfg["Coding Score"] === undefined && (
                        <p className="fallback-text">Profile synced successfully. Hover to view raw stats.</p>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="profile-page-container">
            <div className="profile-header-section">
                <div className="user-info-brief">
                    <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=random`} alt="Avatar" className="profile-avatar" />
                    <div className="user-details">
                        <h1>{user?.name}</h1>
                        <p>{user?.email}</p>
                    </div>
                </div>
                
                <div className="edit-handles-section">
                    {!isEditing ? (
                        <button className="btn-edit" onClick={() => setIsEditing(true)}>
                            <FaEdit /> Edit Coding Handles
                        </button>
                    ) : (
                        <div className="handles-form">
                            <h3>Update Coding Profiles</h3>
                            <div className="input-group">
                                <label>LeetCode Username</label>
                                <input type="text" value={handles.leetcode} onChange={(e) => setHandles({...handles, leetcode: e.target.value})} placeholder="e.g. saurabhnative" />
                            </div>
                            <div className="input-group">
                                <label>Codeforces Handle</label>
                                <input type="text" value={handles.codeforces} onChange={(e) => setHandles({...handles, codeforces: e.target.value})} placeholder="e.g. tourist" />
                            </div>
                            <div className="input-group">
                                <label>CodeChef Username</label>
                                <input type="text" value={handles.codechef} onChange={(e) => setHandles({...handles, codechef: e.target.value})} placeholder="e.g. tourist" />
                            </div>
                            <div className="input-group">
                                <label>GeeksForGeeks Username</label>
                                <input type="text" value={handles.gfg} onChange={(e) => setHandles({...handles, gfg: e.target.value})} />
                            </div>
                            <div className="input-group">
                                <label>GitHub Username</label>
                                <input type="text" value={handles.github} onChange={(e) => setHandles({...handles, github: e.target.value})} />
                            </div>
                            <div className="form-actions">
                                <button className="btn-save" onClick={handleSaveHandles}><FaSave /> Save</button>
                                <button className="btn-cancel" onClick={() => setIsEditing(false)}><FaTimes /> Cancel</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="coding-stats-section">
                <h2>Coding Profiles </h2>
                {loadingData ? (
                    <div className="loading-stats">Fetching realtime stats...</div>
                ) : (
                    <motion.div 
                        className="stats-grid"
                        initial="hidden"
                        animate="visible"
                        variants={{
                            hidden: { opacity: 0 },
                            visible: {
                                opacity: 1,
                                transition: { staggerChildren: 0.1 }
                            }
                        }}
                    >
                        {codingData.leetcode && <motion.div variants={{hidden:{y:20,opacity:0}, visible:{y:0,opacity:1}}}>{renderLeetcodeStats()}</motion.div>}
                        {codingData.codeforces && <motion.div variants={{hidden:{y:20,opacity:0}, visible:{y:0,opacity:1}}}>{renderCodeforcesStats()}</motion.div>}
                        {codingData.codechef && <motion.div variants={{hidden:{y:20,opacity:0}, visible:{y:0,opacity:1}}}>{renderCodechefStats()}</motion.div>}
                        {codingData.github && <motion.div variants={{hidden:{y:20,opacity:0}, visible:{y:0,opacity:1}}}>{renderGithubStats()}</motion.div>}
                        {codingData.gfg && <motion.div variants={{hidden:{y:20,opacity:0}, visible:{y:0,opacity:1}}}>{renderGfgStats()}</motion.div>}
                        
                        {!codingData.leetcode && !codingData.codeforces && !codingData.codechef && !codingData.github && !codingData.gfg && (
                            <div className="no-profiles-message">
                                <p>No coding profiles linked yet! Click "Edit Coding Handles" above to sync your LeetCode, CodeForces, CodeChef, and GitHub stats.</p>
                            </div>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default Profile;
