import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzv_T5rR6qzPrIs7hbZ8jQRHrWY6hWNlzGAOqZ_ukLAPe_dYoTtT4K5K9SGRHiXdw0r1Q/exec';

export default function Distribucion({ session }) {
  const { id } = useParams();
  const nav = useNavigate();
  const [empresa, setEmpresa] = useState(null);
  const [periodo, setPeriodo] = useState(null);
  const [periodos, setPeriodos] = useState([]);
  const [log, setLog] = useState([]);
  const [ejecutando, setEjecutando] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      const { data: e } = await supabase.from('empresas').select('*').eq('id', id).single();
      setEmpresa(e);
      const { data: p } = await supabase.from('periodos_pago')
        .select('*').eq('empresa_id', id).eq('activo', true).order('created_at', { ascending: false });
      setPeriodos(p || []);
    };
    cargar();
  }, [id]);

  const addLog = (msg, tipo = 'info') => {
    setLog(prev => [...prev, { msg, tipo, ts: new Date().toLocaleTimeString() }]);
  };

  const ejecutar = async (accion) => {
    if (!periodo && accion !== 'distribucion') {
      addLog('⚠️ Selecciona un período de pago primero.', 'warn'); return;
    }
    setEjecutando(true);
    addLog(`▶ Iniciando: ${accion}...`);

    try {
      const body = {
        accion,
        sheetId: empresa.sheet_id,
        catalogoId: empresa.catalogo_id,
        folderId: empresa.folder_id,
        empresaCodigo: empresa.codigo,
        periodoId: periodo?.id,
        nuLoteHE: periodo?.nu_lote_he,
        nuLoteFer: periodo?.nu_lote_fer,
        usuarioId: session.user.id
      };

      const resp = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const result = await resp.json();

      if (result.error) {
        addLog(`❌ Error: ${result.error}`, 'error');
      } else {
        addLog(`✅ ${result.mensaje || 'Completado'}`, 'ok');
        if (result.link) addLog(`📥 Archivo: ${result.link}`, 'link');

        // Registrar ejecución en Supabase
        await supabase.from('ejecuciones').insert({
          empresa_id: id,
          usuario_id: session.user.id,
          tipo: accion,
          estado: 'completado',
          filas_procesadas: result.filas || null,
          mensaje: result.mensaje || null
        });
      }
    } catch (err) {
      addLog(`❌ Error de conexión: ${err.message}`, 'error');
    }
    setEjecutando(false);
  };

  if (!empresa) return <div style={s.loading}>Cargando empresa...</div>;

  return (
    <div style={s.root}>
      {/* Header */}
      <header style={s.header}>
        <button style={s.back} onClick={() => nav('/')}>← Volver</button>
        <span style={s.logo}>HR<span style={{color:'#e51b24'}}>Sync</span></span>
        <span style={s.empNombre}>{empresa.nombre}</span>
      </header>

      <main style={s.main}>
        {/* Selector de período */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>📅 Período de Pago</h2>
          <select style={s.select} value={periodo?.id || ''} onChange={e => {
            setPeriodo(periodos.find(p => p.id === e.target.value) || null);
          }}>
            <option value="">-- Seleccionar período --</option>
            {periodos.map(p => (
              <option key={p.id} value={p.id}>{p.nombre} ({p.fecha_inicio} → {p.fecha_fin})</option>
            ))}
          </select>
          {periodo && (
            <div style={s.periodoInfo}>
              <span>🔑 Lote HE: <b>{periodo.nu_lote_he || 'N/D'}</b></span>
              <span>🔑 Lote Feriados: <b>{periodo.nu_lote_fer || 'N/D'}</b></span>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>⚡ Acciones</h2>
          <div style={s.acciones}>
            <BtnAccion icon="📊" label="Procesar Distribución" color="#1e242b"
              onClick={() => ejecutar('distribucion')} disabled={ejecutando} />
            <BtnAccion icon="📋" label="Generar Resumen" color="#1b7f3a"
              onClick={() => ejecutar('resumen')} disabled={ejecutando} />
            <BtnAccion icon="📥" label="Archivo Horas Extras" color="#e51b24"
              onClick={() => ejecutar('archivo_he')} disabled={ejecutando || !periodo} />
            <BtnAccion icon="📅" label="Archivo Feriados" color="#7c3aed"
              onClick={() => ejecutar('archivo_feriado')} disabled={ejecutando || !periodo} />
          </div>
          {ejecutando && <div style={s.ejecutando}>⏳ Procesando, por favor espera...</div>}
        </div>

        {/* Log */}
        {log.length > 0 && (
          <div style={s.card}>
            <h2 style={s.cardTitle}>📋 Registro de actividad</h2>
            <div style={s.logBox}>
              {log.map((l, i) => (
                <div key={i} style={{...s.logLine, color: l.tipo==='error'?'#dc2626':l.tipo==='ok'?'#1b7f3a':l.tipo==='warn'?'#d97706':'#1e242b'}}>
                  <span style={s.logTs}>{l.ts}</span>
                  {l.tipo === 'link'
                    ? <a href={l.msg.replace('📥 Archivo: ','')} target="_blank" rel="noreferrer" style={{color:'#2563eb'}}>{l.msg}</a>
                    : <span>{l.msg}</span>}
                </div>
              ))}
            </div>
            <button style={s.btnClear} onClick={() => setLog([])}>Limpiar log</button>
          </div>
        )}
      </main>
    </div>
  );
}

function BtnAccion({ icon, label, color, onClick, disabled }) {
  return (
    <button style={{...s.btnAccion, background: disabled ? '#dde1e7' : color, cursor: disabled ? 'not-allowed' : 'pointer'}}
      onClick={onClick} disabled={disabled}>
      <span style={{fontSize:22}}>{icon}</span>
      <span style={{fontSize:13,fontWeight:600}}>{label}</span>
    </button>
  );
}

const s = {
  root: {minHeight:'100vh',background:'#f4f5f7',display:'flex',flexDirection:'column'},
  header: {background:'#1e242b',padding:'0 24px',height:60,display:'flex',
    alignItems:'center',gap:20,boxShadow:'0 2px 8px rgba(0,0,0,0.2)'},
  back: {background:'transparent',border:'1px solid #8c9199',color:'#fff',
    padding:'6px 12px',borderRadius:6,cursor:'pointer',fontSize:13},
  logo: {fontSize:22,fontWeight:800,color:'#fff'},
  empNombre: {fontSize:14,color:'#8c9199',marginLeft:'auto'},
  main: {flex:1,padding:'32px 24px',maxWidth:900,margin:'0 auto',width:'100%',display:'flex',flexDirection:'column',gap:20},
  card: {background:'#fff',borderRadius:12,padding:'24px',border:'1px solid #dde1e7',boxShadow:'0 2px 8px rgba(0,0,0,0.05)'},
  cardTitle: {fontSize:16,fontWeight:700,color:'#1e242b',marginBottom:16},
  select: {width:'100%',padding:'10px 14px',border:'1.5px solid #dde1e7',borderRadius:8,
    fontSize:14,background:'#fff',outline:'none',fontFamily:'inherit'},
  periodoInfo: {display:'flex',gap:24,marginTop:12,fontSize:13,color:'#8c9199'},
  acciones: {display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12},
  btnAccion: {display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
    gap:8,color:'#fff',border:'none',borderRadius:10,padding:'18px 12px',
    fontFamily:'inherit',transition:'opacity 0.2s'},
  ejecutando: {marginTop:16,textAlign:'center',color:'#d97706',fontSize:13,fontWeight:600},
  logBox: {display:'flex',flexDirection:'column',gap:8,maxHeight:280,overflowY:'auto',
    background:'#f4f5f7',borderRadius:8,padding:14},
  logLine: {display:'flex',gap:10,fontSize:13,alignItems:'flex-start'},
  logTs: {color:'#8c9199',minWidth:60,fontSize:11},
  btnClear: {marginTop:12,background:'transparent',border:'1px solid #dde1e7',
    color:'#8c9199',padding:'6px 14px',borderRadius:6,cursor:'pointer',fontSize:12},
  loading: {display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'#8c9199'}
};
