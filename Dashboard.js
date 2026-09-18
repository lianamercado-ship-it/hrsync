import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Dashboard({ session }) {
  const [empresas, setEmpresas] = useState([]);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    const cargar = async () => {
      const { data: p } = await supabase.from('perfiles').select('*').eq('id', session.user.id).single();
      setPerfil(p);
      if (p?.rol === 'admin') {
        const { data: e } = await supabase.from('empresas').select('*').eq('activa', true);
        setEmpresas(e || []);
      } else {
        const { data: ue } = await supabase.from('usuario_empresa').select('empresa_id, empresas(*)').eq('usuario_id', session.user.id);
        setEmpresas((ue || []).map(x => x.empresas));
      }
      setLoading(false);
    };
    cargar();
  }, [session]);

  const logout = async () => { await supabase.auth.signOut(); };

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',background:'#f4f5f7'}}>
      <header style={{background:'#1e242b',padding:'0 32px',height:60,display:'flex',alignItems:'center',justifyContent:'space-between',boxShadow:'0 2px 8px rgba(0,0,0,0.2)'}}>
        <span style={{fontSize:24,fontWeight:800,color:'#fff'}}>HR<span style={{color:'#e51b24'}}>Sync</span></span>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <span style={{color:'#8c9199',fontSize:13}}>{perfil?.nombre || session.user.email}</span>
          {perfil?.rol === 'admin' && (
            <button style={{background:'transparent',border:'1px solid #8c9199',color:'#fff',padding:'6px 14px',borderRadius:6,cursor:'pointer',fontSize:13}} onClick={() => nav('/admin')}>⚙️ Admin</button>
          )}
          <button style={{background:'#e51b24',border:'none',color:'#fff',padding:'6px 14px',borderRadius:6,cursor:'pointer',fontSize:13,fontWeight:600}} onClick={logout}>Salir</button>
        </div>
      </header>
      <main style={{flex:1,padding:'40px 32px',maxWidth:1100,margin:'0 auto',width:'100%'}}>
        <h1 style={{fontSize:28,fontWeight:700,marginBottom:8}}>Mis Empresas</h1>
        <p style={{fontSize:14,color:'#8c9199',marginBottom:32}}>Selecciona una empresa para procesar sus horas extras</p>
        {loading ? <div style={{textAlign:'center',padding:40,color:'#8c9199'}}>Cargando...</div>
        : empresas.length === 0 ? <div style={{textAlign:'center',padding:40,color:'#8c9199',background:'#fff',borderRadius:12,border:'1px solid #dde1e7'}}>No tienes empresas asignadas.</div>
        : <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:20}}>
            {empresas.map(emp => (
              <div key={emp.id} style={{background:'#fff',borderRadius:12,padding:'28px 24px',cursor:'pointer',border:'1.5px solid #dde1e7',textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}
                onClick={() => nav(`/empresa/${emp.id}`)}>
                <div style={{fontSize:36,marginBottom:12}}>🏢</div>
                <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>{emp.nombre}</div>
                <div style={{fontSize:12,color:'#8c9199',marginBottom:16}}>{emp.codigo}</div>
                <div style={{color:'#e51b24',fontWeight:600,fontSize:13}}>Abrir →</div>
              </div>
            ))}
          </div>}
      </main>
      <footer style={{textAlign:'center',padding:'16px',fontSize:12,color:'#8c9199',borderTop:'1px solid #dde1e7',background:'#fff'}}>HRSync v1.0 · Powered by Grupo STT</footer>
    </div>
  );
}
