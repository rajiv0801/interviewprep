import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import type { LoginInput } from '@interviewprep/common';
import AuthLayout from './AuthLayout';
import './Auth.css';

const Login = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState<LoginInput>({
        emailOrUsername: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await axios.post('/api/auth/login', formData);

            if (response.data.success) {
                toast.success('Welcome back!');
                // Store token if returned
                if (response.data.token) {
                    localStorage.setItem('token', response.data.token);
                }
                // Store user name for Navbar
                if (response.data.data?.user?.name) {
                    localStorage.setItem('userName', response.data.data.user.name);
                }
                // Dispatch event to update Navbar
                window.dispatchEvent(new Event('authChange'));
                // Navigate to dashboard
                navigate('/dashboard');
            }
        } catch (err: unknown) {
            console.error('Login error:', err);
            const axiosError = err as { response?: { data?: { message?: string } } };
            const msg = axiosError.response?.data?.message || 'Something went wrong';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Welcome back"
            subtitle="Enter your credentials to access your account"
        >
            <form className="auth-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label">Email or Username</label>
                    <input
                        type="text"
                        name="emailOrUsername"
                        className="form-input"
                        placeholder="john@example.com"
                        value={formData.emailOrUsername}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                        <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: '#6366f1', textDecoration: 'none' }}>Forgot password?</Link>
                    </div>
                    <input
                        type="password"
                        name="password"
                        className="form-input"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                </div>

                {error && <div className="error-message">{error}</div>}

                <button type="submit" className="auth-btn" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                    {!loading && <span>→</span>}
                </button>

                <div className="auth-footer">
                    Don't have an account?
                    <Link to="/signup" className="auth-link">Sign up</Link>
                </div>
            </form>
        </AuthLayout>
    );
};

export default Login;
