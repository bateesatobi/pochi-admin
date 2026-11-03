import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAdminAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid admin credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <aside className="login-panel-brand" aria-hidden="false">
          <div className="login-panel-inner">
            <div className="login-mark" aria-hidden="true">P</div>
            <h1 className="login-brand-title">Pochi</h1>
            <p className="login-brand-tagline">
              Operations console for marketplace payments, vendors, and compliance.
            </p>
            <ul className="login-brand-points">
              <li>Disbursements &amp; wallet controls</li>
              <li>Vendor KYC and catalog oversight</li>
              <li>Pay Later and referral campaigns</li>
            </ul>
          </div>
          <div className="login-panel-footer">Authorized staff only · pakacha.com</div>
        </aside>

        <main className="login-panel-form">
          <div className="login-form-wrap animate-fade">
            <header className="login-form-header">
              <p className="login-kicker">Admin sign in</p>
              <h2>Welcome back</h2>
              <p className="login-form-sub">Use your administrator email and password.</p>
            </header>

            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="admin-email">Email</label>
                <div className="login-input-wrap">
                  <Mail size={16} className="login-input-icon" aria-hidden="true" />
                  <input
                    id="admin-email"
                    className="form-input login-input"
                    type="email"
                    autoComplete="username"
                    placeholder="admin@pakacha.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="admin-password">Password</label>
                <div className="login-input-wrap">
                  <Lock size={16} className="login-input-icon" aria-hidden="true" />
                  <input
                    id="admin-password"
                    className="form-input login-input"
                    type={showPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="login-pass-toggle"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button className="login-btn" type="submit" disabled={loading}>
                {loading ? (
                  'Signing in…'
                ) : (
                  <>
                    Sign in <ArrowRight size={16} aria-hidden="true" />
                  </>
                )}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LoginPage;
