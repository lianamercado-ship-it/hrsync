import React, { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as XLSX from 'xlsx';

const TIPOS_TURNO = ['Diurno','Mixto Diurno','Mixto Nocturno','Nocturno'];

export default function CargaOvertime({ session }) {
  const { id } = useParams();
  const nav = useNavigate();
  const fileRef = useRef();
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [msg, setMsg] = useState('');
  const [paso, setPaso] = useState('upload'); // upload | validar | procesando

  // ── Leer Excel ───────────────────────────────────────────
  const leerExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCargando(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb  = XLSX.read(evt.target.result, { type: 'array', cellDates: true });
        const ws  = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        // Buscar fila de encabezados (contiene "Employee Number" o similar)
        let headerRow = -1;
        for (let i = 0; i < raw.length; i++) {
          const rowStr = raw[i].join('|').toLowerCase();
          if (rowStr.includes('employee') && rowStr.includes('time')) {
            headerRow = i; break;
          }
        }
        if (headerRow === -1) { setMsg('❌ No se encontró la fila de encabezados.'); setCargando(false); return; }

        const headers = raw[headerRow];
        const datos   = raw.slice(headerRow + 1).filter(r => r[0] && r[0].toString().trim() !== '');

        const filasProc = datos.map((r, idx) => {
          // Calcular horas
          const inicio = parseHora(r[5]);
          const fin    = parseHora(r[6]);
          let horas = 0;
          if (inicio !== null && fin !== null) {
            horas = fin < inicio ? (fin + 24 - inicio) : (fin - inicio);
          }

          return {
            idx,
            id:       r[0] ? r[0].toString().trim() : '',
            nombre:   r[1] ? r[1].toString().trim() : '',
            fecha:    formatFecha(r[2]),
            turno:    r[3] ? r[3].toString().replace(/^PAN-/i,'').trim() : '',
            payGroup: r[4] ? r[4].toString().trim() : '',
            inicio:   formatHora(r[5]),
            fin:      formatHora(r[6]),
            // Columnas adicionales editables
            diaEspecial: '',   // '' | 'si' | 'no'
            almuerzo:    '',
            hrsRegulares:'',
            tipoTurno:   '',
            // Calculadas
            horasBrutas: round2(horas),
            horasNetas:  round2(horas), // se recalcula al editar
            incluir:     true
          };
        });

        setFilas(filasProc);
        setPaso('validar');
        setMsg('');
      } catch(err) {
        setMsg('❌ Error al leer el archivo: ' + err.message);
      }
      setCargando(false);
    };
    reader.readAsArrayBuffer(file);
  };

  // ── Editar celda ─────────────────────────────────────────
  const editar = (idx, campo, valor) => {
    setFilas(prev => prev.map(f => {
      if (f.idx !== idx) return f;
      const updated = { ...f, [campo]: valor };
      // Recalcular horasNetas
      const alm = parseFloat(updated.almuerzo) || 0;
      const reg = parseFloat(updated.hrsRegulares) || 0;
      updated.horasNetas = round2(Math.max(0, updated.horasBrutas - alm - reg));
      // Si diaEspecial = 'no' → no incluir
      updated.incluir = updated.diaEspecial !== 'no';
      return updated;
    }));
  };

  // ── Totales ───────────────────────────────────────────────
  const totalHorasBrutas = filas.filter(f=>f.incluir).reduce((s,f)=>s+f.horasBrutas,0);
  const totalHorasNetas  = filas.filter(f=>f.incluir).reduce((s,f)=>s+f.horasNetas,0);

  // ── Enviar al Apps Script ─────────────────────────────────
  const procesarEnSheet = async () => {
    setPaso('procesando');
    setMsg('⏳ Cargando datos al Sheet...');
    try {
      const filasEnviar = filas.filter(f => f.incluir).map(f => ({
        id: f.id, nombre: f.nombre, fecha: f.fecha, turno: f.turno,
        payGroup: f.payGroup, inicio: f.inicio, fin: f.fin,
        diaEspecial: f.diaEspecial === 'si' ? '8' : '',
        almuerzo: f.almuerzo || '',
        hrsRegulares: f.hrsRegulares || '',
        tipoTurno: f.tipoTurno || ''
      }));

      const resp = await fetch(
        'https://script.google.com/macros/s/AKfycbzv_T5rR6qzPrIs7hbZ8jQRHrWY6hWNlzGAOqZ_ukLAPe_dYoTtT4K5K9SGRHiXdw0r1Q/exec',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accion: 'cargar_overtime', filas: filasEnviar })
        }
      );
      const result = await resp.json();
      if (result.error) { setMsg('❌ ' + result.error); setPaso('validar'); }
      else { setMsg('✅ ' + result.mensaje + ' — Ahora puedes ejecutar la distribución.'); }
    } catch(err) {
      setMsg('❌ Error: ' + err.message);
      setPaso('validar');
    }
  };

  return (
    <div style={{minHeight:'100vh',background:'#f4f5f7',display:'flex',flexDirection:'column'}}>
      {/* Header */}
      <header style={{background:'#1e242b',padding:'0 24px',height:60,display:'flex',alignItems:'center',gap:16,boxShadow:'0 2px 8px rgba(0,0,0,0.2)'}}>
        <button style={{background:'transparent',border:'1px solid #8c9199',color:'#fff',padding:'6px 12px',borderRadius:6,cursor:'pointer',fontSize:13}}
          onClick={() => nav(`/empresa/${id}`)}>← Volver</button>
        <span style={{fontSize:22,fontWeight:800,color:'#fff'}}>HR<span style={{color:'#e51b24'}}>Sync</span></span>
        <span style={{fontSize:14,color:'#8c9199',marginLeft:'auto'}}>Cargar Quest Overtime</span>
      </header>

      <main style={{flex:1,padding:'24px',maxWidth:1400,margin:'0 auto',width:'100%'}}>

        {/* PASO 1: Upload */}
        {paso === 'upload' && (
          <div style={{background:'#fff',borderRadius:12,padding:40,textAlign:'center',border:'2px dashed #dde1e7',maxWidth:600,margin:'40px auto'}}>
            <div style={{fontSize:48,marginBottom:16}}>📂</div>
            <h2 style={{fontSize:20,fontWeight:700,marginBottom:8}}>Cargar archivo Quest Overtime</h2>
            <p style={{color:'#8c9199',fontSize:14,marginBottom:24}}>Selecciona el archivo Excel exportado desde Dayforce.<br/>Formato: PAN - RESIDENT Pay Summary ITOS Overtime</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={leerExcel} style={{display:'none'}} />
            <button style={{background:'#e51b24',color:'#fff',border:'none',borderRadius:8,padding:'12px 32px',fontSize:15,fontWeight:700,cursor:'pointer'}}
              onClick={() => fileRef.current.click()}>
              {cargando ? '⏳ Leyendo...' : '📁 Seleccionar archivo'}
            </button>
            {msg && <p style={{color:'#dc2626',marginTop:16,fontSize:13}}>{msg}</p>}
          </div>
        )}

        {/* PASO 2: Validar */}
        {(paso === 'validar' || paso === 'procesando') && (
          <>
            {/* Resumen */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:20}}>
              {[
                {label:'Total líneas', valor: filas.length, color:'#1e242b'},
                {label:'Líneas incluidas', valor: filas.filter(f=>f.incluir).length, color:'#1b7f3a'},
                {label:'Total Horas Cliente', valor: round2(totalHorasBrutas)+'h', color:'#2563eb'},
                {label:'Total Horas Netas', valor: round2(totalHorasNetas)+'h', color:'#e51b24'},
              ].map(c => (
                <div key={c.label} style={{background:'#fff',borderRadius:10,padding:'16px 20px',border:'1px solid #dde1e7',textAlign:'center'}}>
                  <div style={{fontSize:22,fontWeight:800,color:c.color}}>{c.valor}</div>
                  <div style={{fontSize:12,color:'#8c9199',marginTop:4}}>{c.label}</div>
                </div>
              ))}
            </div>

            {msg && (
              <div style={{background: msg.startsWith('✅')?'#f0fdf4':'#fef2f2',
                border:`1px solid ${msg.startsWith('✅')?'#bbf7d0':'#fecaca'}`,
                color: msg.startsWith('✅')?'#1b7f3a':'#dc2626',
                padding:'12px 16px',borderRadius:8,marginBottom:16,fontSize:13}}>
                {msg}
              </div>
            )}

            {/* Botones acción */}
            <div style={{display:'flex',gap:12,marginBottom:16,justifyContent:'flex-end'}}>
              <button style={{background:'#f4f5f7',border:'1px solid #dde1e7',borderRadius:8,padding:'10px 20px',cursor:'pointer',fontSize:13}}
                onClick={() => { setFilas([]); setPaso('upload'); setMsg(''); }}>
                🔄 Cargar otro archivo
              </button>
              <button style={{background: paso==='procesando'?'#8c9199':'#1e242b',color:'#fff',border:'none',borderRadius:8,
                padding:'10px 24px',cursor: paso==='procesando'?'not-allowed':'pointer',fontSize:13,fontWeight:700}}
                onClick={procesarEnSheet} disabled={paso==='procesando'}>
                {paso==='procesando' ? '⏳ Procesando...' : '🚀 Cargar al Sheet y Procesar'}
              </button>
            </div>

            {/* Tabla */}
            <div style={{background:'#fff',borderRadius:12,border:'1px solid #dde1e7',overflow:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:1100}}>
                <thead>
                  <tr style={{background:'#1e242b',color:'#fff'}}>
                    {['Incl.','ID','Nombre','Fecha','Turno','Inicio','Fin','Horas\nCliente','Día\nEspecial','Almuerzo\n(h)','Hrs\nRegulares','Tipo\nTurno','Horas\nNetas'].map(h => (
                      <th key={h} style={{padding:'10px 8px',textAlign:'center',fontWeight:600,whiteSpace:'pre-line',fontSize:11}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f,i) => (
                    <tr key={f.idx} style={{background: !f.incluir?'#fef2f2':i%2===0?'#f9fafb':'#fff',borderBottom:'1px solid #f0f0f0'}}>
                      {/* Incluir */}
                      <td style={{textAlign:'center',padding:'6px 4px'}}>
                        <input type="checkbox" checked={f.incluir}
                          onChange={e => editar(f.idx,'incluir',e.target.checked)} />
                      </td>
                      {/* Datos fijos */}
                      <td style={{padding:'6px 8px',fontWeight:600}}>{f.id}</td>
                      <td style={{padding:'6px 8px',maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.nombre}</td>
                      <td style={{padding:'6px 8px',whiteSpace:'nowrap'}}>{f.fecha}</td>
                      <td style={{padding:'6px 8px',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis'}}>{f.turno}</td>
                      <td style={{padding:'6px 8px',whiteSpace:'nowrap'}}>{f.inicio}</td>
                      <td style={{padding:'6px 8px',whiteSpace:'nowrap'}}>{f.fin}</td>
                      <td style={{padding:'6px 8px',textAlign:'center',fontWeight:600,color:'#2563eb'}}>{f.horasBrutas}</td>
                      {/* DIA ESPECIAL */}
                      <td style={{padding:'6px 4px',textAlign:'center'}}>
                        <select style={{fontSize:11,padding:'2px 4px',border:'1px solid #dde1e7',borderRadius:4,background:'#fff'}}
                          value={f.diaEspecial} onChange={e => editar(f.idx,'diaEspecial',e.target.value)}>
                          <option value="">—</option>
                          <option value="si">✅ Sí</option>
                          <option value="no">❌ No</option>
                        </select>
                      </td>
                      {/* ALMUERZO */}
                      <td style={{padding:'6px 4px',textAlign:'center'}}>
                        <input type="number" min="0" max="4" step="0.5"
                          style={{width:56,fontSize:11,padding:'2px 4px',border:'1px solid #dde1e7',borderRadius:4,textAlign:'center'}}
                          value={f.almuerzo} onChange={e => editar(f.idx,'almuerzo',e.target.value)}
                          placeholder="0" />
                      </td>
                      {/* HORAS REGULARES */}
                      <td style={{padding:'6px 4px',textAlign:'center'}}>
                        <input type="number" min="0" max="24" step="0.5"
                          style={{width:56,fontSize:11,padding:'2px 4px',border:'1px solid #dde1e7',borderRadius:4,textAlign:'center'}}
                          value={f.hrsRegulares} onChange={e => editar(f.idx,'hrsRegulares',e.target.value)}
                          placeholder="0" />
                      </td>
                      {/* TIPO TURNO */}
                      <td style={{padding:'6px 4px'}}>
                        <select style={{fontSize:11,padding:'2px 4px',border:'1px solid #dde1e7',borderRadius:4,background:'#fff',width:'100%'}}
                          value={f.tipoTurno} onChange={e => editar(f.idx,'tipoTurno',e.target.value)}>
                          <option value="">Auto</option>
                          {TIPOS_TURNO.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      {/* HORAS NETAS */}
                      <td style={{padding:'6px 8px',textAlign:'center',fontWeight:700,
                        color: f.horasNetas===f.horasBrutas?'#1e242b':'#e51b24'}}>
                        {f.horasNetas}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* TOTALES */}
                <tfoot>
                  <tr style={{background:'#1e242b',color:'#fff',fontWeight:700}}>
                    <td colSpan={7} style={{padding:'10px 8px',textAlign:'right'}}>TOTALES</td>
                    <td style={{padding:'10px 8px',textAlign:'center',color:'#60a5fa'}}>{round2(totalHorasBrutas)}</td>
                    <td colSpan={3}></td>
                    <td style={{padding:'10px 8px',textAlign:'center',color:'#fca5a5'}}>{round2(totalHorasNetas)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ── Utilidades ───────────────────────────────────────────────
function parseHora(val) {
  if (!val) return null;
  if (val instanceof Date) return val.getHours() + val.getMinutes()/60 + val.getSeconds()/3600;
  const s = val.toString().trim().toLowerCase();
  const pm = s.includes('pm') || s.includes('p.m.');
  const am = s.includes('am') || s.includes('a.m.');
  const clean = s.replace(/(am|pm|a\.m\.|p\.m\.)/g,'').trim();
  const parts = clean.split(':');
  if (parts.length < 2) return null;
  let h = parseInt(parts[0],10), m = parseInt(parts[1],10), sec = parts[2]?parseInt(parts[2],10):0;
  if (pm && h < 12) h += 12;
  if (am && h === 12) h = 0;
  return h + m/60 + sec/3600;
}

function formatHora(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return String(val.getHours()).padStart(2,'0') + ':' +
           String(val.getMinutes()).padStart(2,'0') + ':' +
           String(val.getSeconds()).padStart(2,'0');
  }
  return val.toString().trim();
}

function formatFecha(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return (val.getMonth()+1) + '/' + val.getDate() + '/' + val.getFullYear();
  }
  return val.toString().trim();
}

function round2(v) { return Math.round(v*100)/100; }
