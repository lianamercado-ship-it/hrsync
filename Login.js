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
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'linear-gradient(135deg,#1e242b 60%,#2d3540 100%)'}}>
      <div style={{background:'#fff',borderRadius:16,padding:'40px 36px',width:'100%',maxWidth:400,boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{fontSize:36,fontWeight:800,color:'#1e242b'}}>HR<span style={{color:'#e51b24'}}>Sync</span></div>
          <p style={{fontSize:13,color:'#8c9199',marginTop:4}}>Distribuidor de Horas Extras</p>
        </div>
        <form onSubmit={handleLogin} style={{display:'flex',flexDirection:'column',gap:18}}>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            <label style={{fontSize:13,fontWeight:600}}>Correo electrónico</label>
            <input style={{padding:'10px 14px',border:'1.5px solid #dde1e7',borderRadius:8,fontSize:14,outline:'none',fontFamily:'inherit'}}
              type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="usuario@empresa.com" required />
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            <label style={{fontSize:13,fontWeight:600}}>Contraseña</label>
            <input style={{padding:'10px 14px',border:'1.5px solid #dde1e7',borderRadius:8,fontSize:14,outline:'none',fontFamily:'inherit'}}
              type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          {error && <div style={{background:'#fef2f2',color:'#dc2626',padding:'10px 14px',borderRadius:8,fontSize:13,border:'1px solid #fecaca'}}>{error}</div>}
          <button style={{background:'#e51b24',color:'#fff',border:'none',borderRadius:8,padding:'13px',fontSize:15,fontWeight:700,cursor:'pointer',fontFamily:'inherit',opacity:loading?0.7:1}}
            type="submit" disabled={loading}>{loading ? 'Ingresando...' : 'Ingresar'}</button>
        </form>
        <p style={{textAlign:'center',fontSize:12,color:'#8c9199',marginTop:24}}>Powered by <strong>Grupo STT</strong> · HRSync v1.0</p>
      </div>
    </div>
  );
}
