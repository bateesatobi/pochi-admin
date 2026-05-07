import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import logo from '../assets/logo.png';

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
      <div className="login-bg-glow" />
      <div className="login-card animate-fade">
        <div className="login-brand">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24 }}>
            <div style={{ 
              background: '#0b182a', 
              padding: '16px 24px', 
              borderRadius: '20px', 
              boxShadow: '0 10px 20px rgba(11,24,42,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img src={logo} alt="Pochi" style={{ height: 64, width: 'auto', objectFit: 'contain' }} />
            </div>
          </div>
          <div className="brand-name">POCHI <span>Admin</span></div>
          <p style={{ marginTop: 8 }}>Secure administrator access only</p>
        </div>

        {error && <div className="login-error" style={{marginBottom:20}}>{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Admin Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="admin@pakacha.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <div style={{ position:'relative' }}>
              <input
                className="form-input"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ paddingRight:44 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-subtle)', cursor:'pointer' }}
              >
                {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>
          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? 'Authenticating...' : 'Access Admin Portal'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
