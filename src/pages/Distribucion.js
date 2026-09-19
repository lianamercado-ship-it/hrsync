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
      const { data: p } = await supabase.from('periodos_pago').select('*').eq('empresa_id', id).eq('activo', true).order('created_at', { ascending: false });
      setPeriodos(p || []);
    };
    cargar();
  }, [id]);

  const addLog = (msg, tipo = 'info') => setLog(prev => [...prev, { msg, tipo, ts: new Date().toLocaleTimeString() }]);

  const ejecutar = async (accion) => {
    setEjecutando(true);
    addLog(`▶ Iniciando: ${accion}...`);
    try {
      const resp = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion,
          sheetId: empresa.sheet_id,
          catalogoId: empresa.catalogo_id,
          folderId: empresa.folder_id,
          empresaCodigo: empresa.codigo,
          nuLoteHE: periodo?.nu_lote_he,
          nuLoteFer: periodo?.nu_lote_fer,
        })
      });
      const result = await resp.json();
      if (result.error) { addLog(`❌ Error: ${result.error}`, 'error'); }
      else {
        addLog(`✅ ${result.mensaje}`, 'ok');
        if (result.link) addLog(`📥 ${result.link}`, 'link');
        await supabase.from('ejecuciones').insert({
          empresa_id: id, usuario_id: session.user.id,
          tipo: accion, estado: 'completado',
          filas_procesadas: result.filas || null, mensaje: result.mensaje
        });
      }
    } catch (err) { addLog(`❌ Error: ${err.message}`, 'error'); }
    setEjecutando(false);
  };

  if (!empresa) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'#8c9199'}}>Cargando...</div>;

  return (
    <div style={{minHeight:'100vh',background:'#f4f5f7',display:'flex',flexDirection:'column'}}>
      <header style={{background:'#1e242b',padding:'0 24px',height:60,display:'flex',alignItems:'center',gap:20,boxShadow:'0 2px 8px rgba(0,0,0,0.2)'}}>
        <button style={{background:'transparent',border:'1px solid #8c9199',color:'#fff',padding:'6px 12px',borderRadius:6,cursor:'pointer',fontSize:13}} onClick={() => nav('/')}>← Volver</button>
        <span style={{fontSize:22,fontWeight:800,color:'#fff'}}>HR<span style={{color:'#e51b24'}}>Sync</span></span>
        <span style={{fontSize:14,color:'#8c9199',marginLeft:'auto'}}>{empresa.nombre}</span>
      </header>
      <main style={{flex:1,padding:'32px 24px',maxWidth:900,margin:'0 auto',width:'100%',display:'flex',flexDirection:'column',gap:20}}>

        {/* Período */}
        <div style={{background:'#fff',borderRadius:12,padding:24,border:'1px solid #dde1e7'}}>
          <h2 style={{fontSize:16,fontWeight:700,marginBottom:16}}>📅 Período de Pago</h2>
          <select style={{width:'100%',padding:'10px 14px',border:'1.5px solid #dde1e7',borderRadius:8,fontSize:14,fontFamily:'inherit',outline:'none'}}
            value={periodo?.id || ''} onChange={e => setPeriodo(periodos.find(p => p.id === e.target.value) || null)}>
            <option value="">-- Seleccionar período --</option>
            {periodos.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.fecha_inicio} → {p.fecha_fin})</option>)}
          </select>
          {periodo && (
            <div style={{display:'flex',gap:24,marginTop:12,fontSize:13,color:'#8c9199'}}>
              <span>🔑 Lote HE: <b>{periodo.nu_lote_he || 'N/D'}</b></span>
              <span>🔑 Lote Feriados: <b>{periodo.nu_lote_fer || 'N/D'}</b></span>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div style={{background:'#fff',borderRadius:12,padding:24,border:'1px solid #dde1e7'}}>
          <h2 style={{fontSize:16,fontWeight:700,marginBottom:16}}>⚡ Acciones</h2>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12}}>
            {[
              {icon:'📊',label:'Procesar Distribución',accion:'distribucion',color:'#1e242b'},
              {icon:'📋',label:'Generar Resumen',accion:'resumen',color:'#1b7f3a'},
              {icon:'📥',label:'Archivo Horas Extras',accion:'archivo_he',color:'#e51b24'},
              {icon:'📅',label:'Archivo Feriados',accion:'archivo_feriado',color:'#7c3aed'},
            ].map(btn => (
              <button key={btn.accion} disabled={ejecutando}
                style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,background:ejecutando?'#dde1e7':btn.color,color:'#fff',border:'none',borderRadius:10,padding:'18px 12px',cursor:ejecutando?'not-allowed':'pointer',fontFamily:'inherit'}}
                onClick={() => ejecutar(btn.accion)}>
                <span style={{fontSize:22}}>{btn.icon}</span>
                <span style={{fontSize:13,fontWeight:600}}>{btn.label}</span>
              </button>
            ))}
          </div>
          {ejecutando && <div style={{marginTop:16,textAlign:'center',color:'#d97706',fontSize:13,fontWeight:600}}>⏳ Procesando, por favor espera...</div>}
        </div>

        {/* Log */}
        {log.length > 0 && (
          <div style={{background:'#fff',borderRadius:12,padding:24,border:'1px solid #dde1e7'}}>
            <h2 style={{fontSize:16,fontWeight:700,marginBottom:16}}>📋 Registro de actividad</h2>
            <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:280,overflowY:'auto',background:'#f4f5f7',borderRadius:8,padding:14}}>
              {log.map((l, i) => (
                <div key={i} style={{display:'flex',gap:10,fontSize:13,color:l.tipo==='error'?'#dc2626':l.tipo==='ok'?'#1b7f3a':l.tipo==='warn'?'#d97706':'#1e242b'}}>
                  <span style={{color:'#8c9199',minWidth:60,fontSize:11}}>{l.ts}</span>
                  {l.tipo==='link' ? <a href={l.msg} target="_blank" rel="noreferrer" style={{color:'#2563eb'}}>{l.msg}</a> : <span>{l.msg}</span>}
                </div>
              ))}
            </div>
            <button style={{marginTop:12,background:'transparent',border:'1px solid #dde1e7',color:'#8c9199',padding:'6px 14px',borderRadius:6,cursor:'pointer',fontSize:12}} onClick={() => setLog([])}>Limpiar log</button>
          </div>
        )}
      </main>
    </div>
  );
}
