import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import AuthLayout from './AuthLayout';
import './Auth.css';

const ResetPassword = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({
        password: '',
        passwordConfirm: ''
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
        
        if (formData.password !== formData.passwordConfirm) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await axios.post('/api/auth/reset-password', { 
                token, 
                password: formData.password, 
                passwordConfirm: formData.passwordConfirm 
            });
            
            if (response.data.success) {
                toast.success('Password successfully reset! You can now log in.');
                navigate('/login');
            }
        } catch (err: unknown) {
            console.error('Reset password error:', err);
            const axiosError = err as { response?: { data?: { message?: string } } };
            const msg = axiosError.response?.data?.message || 'Invalid or expired token, please try again.';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Reset Password"
            subtitle="Enter your new password below"
        >
            <form className="auth-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label">New Password</label>
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

                <div className="form-group">
                    <label className="form-label">Confirm New Password</label>
                    <input
                        type="password"
                        name="passwordConfirm"
                        className="form-input"
                        placeholder="••••••••"
                        value={formData.passwordConfirm}
                        onChange={handleChange}
                        required
                    />
                </div>

                {error && <div className="error-message">{error}</div>}

                <button type="submit" className="auth-btn" disabled={loading}>
                    {loading ? 'Resetting...' : 'Reset Password'}
                    {!loading && <span>→</span>}
                </button>
            </form>
        </AuthLayout>
    );
};

export default ResetPassword;
