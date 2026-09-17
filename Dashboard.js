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
        const { data: ue } = await supabase.from('usuario_empresa')
          .select('empresa_id, empresas(*)').eq('usuario_id', session.user.id);
        setEmpresas((ue || []).map(x => x.empresas));
      }
      setLoading(false);
    };
    cargar();
  }, [session]);

  const logout = async () => { await supabase.auth.signOut(); };

  return (
    <div style={s.root}>
      {/* Header */}
      <header style={s.header}>
        <span style={s.logo}>HR<span style={{color:'#e51b24'}}>Sync</span></span>
        <div style={s.headerRight}>
          <span style={s.userName}>{perfil?.nombre || session.user.email}</span>
          {perfil?.rol === 'admin' && (
            <button style={s.btnSec} onClick={() => nav('/admin')}>⚙️ Admin</button>
          )}
          <button style={s.btnOut} onClick={logout}>Salir</button>
        </div>
      </header>

      {/* Contenido */}
      <main style={s.main}>
        <h1 style={s.titulo}>Mis Empresas</h1>
        <p style={s.sub}>Selecciona una empresa para procesar sus horas extras</p>

        {loading ? (
          <div style={s.loading}>Cargando empresas...</div>
        ) : empresas.length === 0 ? (
          <div style={s.empty}>No tienes empresas asignadas. Contacta al administrador.</div>
        ) : (
          <div style={s.grid}>
            {empresas.map(emp => (
              <div key={emp.id} style={s.card} onClick={() => nav(`/empresa/${emp.id}`)}>
                <div style={s.cardIcon}>🏢</div>
                <div style={s.cardNombre}>{emp.nombre}</div>
                <div style={s.cardCodigo}>{emp.codigo}</div>
                <div style={s.cardBtn}>Abrir →</div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer style={s.footer}>HRSync v1.0 · Powered by Grupo STT</footer>
    </div>
  );
}

const s = {
  root: {minHeight:'100vh',display:'flex',flexDirection:'column',background:'#f4f5f7'},
  header: {background:'#1e242b',padding:'0 32px',height:60,display:'flex',
    alignItems:'center',justifyContent:'space-between',boxShadow:'0 2px 8px rgba(0,0,0,0.2)'},
  logo: {fontSize:24,fontWeight:800,color:'#fff',letterSpacing:1},
  headerRight: {display:'flex',alignItems:'center',gap:12},
  userName: {color:'#8c9199',fontSize:13},
  btnSec: {background:'transparent',border:'1px solid #8c9199',color:'#fff',
    padding:'6px 14px',borderRadius:6,cursor:'pointer',fontSize:13},
  btnOut: {background:'#e51b24',border:'none',color:'#fff',
    padding:'6px 14px',borderRadius:6,cursor:'pointer',fontSize:13,fontWeight:600},
  main: {flex:1,padding:'40px 32px',maxWidth:1100,margin:'0 auto',width:'100%'},
  titulo: {fontSize:28,fontWeight:700,color:'#1e242b',marginBottom:8},
  sub: {fontSize:14,color:'#8c9199',marginBottom:32},
  loading: {textAlign:'center',padding:40,color:'#8c9199'},
  empty: {textAlign:'center',padding:40,color:'#8c9199',background:'#fff',
    borderRadius:12,border:'1px solid #dde1e7'},
  grid: {display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:20},
  card: {background:'#fff',borderRadius:12,padding:'28px 24px',cursor:'pointer',
    border:'1.5px solid #dde1e7',transition:'all 0.2s',textAlign:'center',
    boxShadow:'0 2px 8px rgba(0,0,0,0.06)'},
  cardIcon: {fontSize:36,marginBottom:12},
  cardNombre: {fontSize:16,fontWeight:700,color:'#1e242b',marginBottom:4},
  cardCodigo: {fontSize:12,color:'#8c9199',marginBottom:16},
  cardBtn: {color:'#e51b24',fontWeight:600,fontSize:13},
  footer: {textAlign:'center',padding:'16px',fontSize:12,color:'#8c9199',
    borderTop:'1px solid #dde1e7',background:'#fff'}
};
