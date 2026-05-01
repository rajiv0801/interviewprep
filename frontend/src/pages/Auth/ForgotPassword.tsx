import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import AuthLayout from './AuthLayout';
import './Auth.css';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await axios.post('/api/auth/forgot-password', { email });
            
            if (response.data.success) {
                setSuccess(true);
                toast.success('Password reset link sent to your email.');
            }
        } catch (err: unknown) {
            console.error('Forgot password error:', err);
            const axiosError = err as { response?: { data?: { message?: string } } };
            const msg = axiosError.response?.data?.message || 'Something went wrong';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <AuthLayout
                title="Check your email"
                subtitle="We've sent a password reset link to your email address."
            >
                <div className="auth-footer" style={{ marginTop: '20px' }}>
                    <Link to="/login" className="auth-btn" style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center' }}>
                        Return to Login
                    </Link>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            title="Forgot Password"
            subtitle="Enter your email address and we'll send you a link to reset your password"
        >
            <form className="auth-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                        type="email"
                        name="email"
                        className="form-input"
                        placeholder="john@example.com"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            setError('');
                        }}
                        required
                    />
                </div>

                {error && <div className="error-message">{error}</div>}

                <button type="submit" className="auth-btn" disabled={loading}>
                    {loading ? 'Sending link...' : 'Send Reset Link'}
                    {!loading && <span>→</span>}
                </button>

                <div className="auth-footer">
                    Remember your password?
                    <Link to="/login" className="auth-link">Log in</Link>
                </div>
            </form>
        </AuthLayout>
    );
};

export default ForgotPassword;
