import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Logo STT */}
        <div style={styles.logoBox}>
          <span style={styles.logoText}>HR<span style={{color:'#e51b24'}}>Sync</span></span>
          <p style={styles.logoSub}>Distribuidor de Horas Extras</p>
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Correo electrónico</label>
            <input style={styles.input} type="email" value={email}
              onChange={e=>setEmail(e.target.value)} placeholder="usuario@empresa.com" required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Contraseña</label>
            <input style={styles.input} type="password" value={password}
              onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          {error && <div style={styles.error}>{error}</div>}
          <button style={{...styles.btn, opacity: loading ? 0.7 : 1}} type="submit" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p style={styles.footer}>
          Powered by <strong>Grupo STT</strong> · HRSync v1.0
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {display:'flex',alignItems:'center',justifyContent:'center',
    minHeight:'100vh',background:'linear-gradient(135deg,#1e242b 60%,#2d3540 100%)'},
  card: {background:'#fff',borderRadius:16,padding:'40px 36px',width:'100%',maxWidth:400,
    boxShadow:'0 20px 60px rgba(0,0,0,0.3)'},
  logoBox: {textAlign:'center',marginBottom:32},
  logoText: {fontSize:36,fontWeight:800,color:'#1e242b',letterSpacing:1},
  logoSub: {fontSize:13,color:'#8c9199',marginTop:4},
  form: {display:'flex',flexDirection:'column',gap:18},
  field: {display:'flex',flexDirection:'column',gap:6},
  label: {fontSize:13,fontWeight:600,color:'#1e242b'},
  input: {padding:'10px 14px',border:'1.5px solid #dde1e7',borderRadius:8,fontSize:14,
    outline:'none',transition:'border 0.2s',fontFamily:'inherit'},
  error: {background:'#fef2f2',color:'#dc2626',padding:'10px 14px',borderRadius:8,fontSize:13,
    border:'1px solid #fecaca'},
  btn: {background:'#e51b24',color:'#fff',border:'none',borderRadius:8,padding:'13px',
    fontSize:15,fontWeight:700,cursor:'pointer',transition:'background 0.2s',fontFamily:'inherit'},
  footer: {textAlign:'center',fontSize:12,color:'#8c9199',marginTop:24}
};
