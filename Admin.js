import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Admin({ session }) {
  const nav = useNavigate();
  const [tab, setTab] = useState('usuarios');
  const [usuarios, setUsuarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [msg, setMsg] = useState('');
  const [nuevoUser, setNuevoUser] = useState({email:'',password:'',nombre:'',rol:'analista'});
  const [nuevaEmp, setNuevaEmp] = useState({nombre:'',codigo:'',sheet_id:'',catalogo_id:'',folder_id:''});
  const [nuevoPer, setNuevoPer] = useState({empresa_id:'',nombre:'',fecha_inicio:'',fecha_fin:'',nu_lote_he:'',nu_lote_fer:''});

  useEffect(() => { cargarTodo(); }, []);

  const cargarTodo = async () => {
    const {data:u} = await supabase.from('perfiles').select('*').order('created_at');
    const {data:e} = await supabase.from('empresas').select('*').order('nombre');
    const {data:p} = await supabase.from('periodos_pago').select('*,empresas(nombre)').order('created_at',{ascending:false});
    setUsuarios(u||[]); setEmpresas(e||[]); setPeriodos(p||[]);
  };

  const crearEmpresa = async (e) => {
    e.preventDefault();
    const {error} = await supabase.from('empresas').insert(nuevaEmp);
    if(error){setMsg('❌ '+error.message);return;}
    setMsg('✅ Empresa creada');
    setNuevaEmp({nombre:'',codigo:'',sheet_id:'',catalogo_id:'',folder_id:''});
    cargarTodo();
  };

  const crearPeriodo = async (e) => {
    e.preventDefault();
    const {error} = await supabase.from('periodos_pago').insert(nuevoPer);
    if(error){setMsg('❌ '+error.message);return;}
    setMsg('✅ Período creado');
    setNuevoPer({empresa_id:'',nombre:'',fecha_inicio:'',fecha_fin:'',nu_lote_he:'',nu_lote_fer:''});
    cargarTodo();
  };

  const asignarEmpresa = async (userId,empresaId) => {
    await supabase.from('usuario_empresa').upsert({usuario_id:userId,empresa_id:empresaId});
    setMsg('✅ Empresa asignada'); cargarTodo();
  };

  const inp = {padding:'9px 13px',border:'1.5px solid #dde1e7',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none',width:'100%'};
  const btn = {background:'#e51b24',color:'#fff',border:'none',borderRadius:8,padding:'10px 20px',fontSize:13,fontWeight:700,cursor:'pointer',width:'100%',marginTop:8};
  const badge = (color) => ({color:'#fff',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,background:color});

  return (
    <div style={{minHeight:'100vh',background:'#f4f5f7',display:'flex',flexDirection:'column'}}>
      <header style={{background:'#1e242b',padding:'0 24px',height:60,display:'flex',alignItems:'center',gap:16,boxShadow:'0 2px 8px rgba(0,0,0,0.2)'}}>
        <button style={{background:'transparent',border:'1px solid #8c9199',color:'#fff',padding:'6px 12px',borderRadius:6,cursor:'pointer',fontSize:13}} onClick={()=>nav('/')}>← Volver</button>
        <span style={{fontSize:22,fontWeight:800,color:'#fff'}}>HR<span style={{color:'#e51b24'}}>Sync</span></span>
        <span style={{fontSize:14,color:'#8c9199',marginLeft:'auto'}}>Panel de Administración</span>
      </header>

      {msg && <div style={{background:'#1b7f3a',color:'#fff',padding:'10px 24px',fontSize:13,cursor:'pointer',textAlign:'center'}} onClick={()=>setMsg('')}>{msg} ✕</div>}

      <main style={{flex:1,padding:'32px 24px',maxWidth:1000,margin:'0 auto',width:'100%'}}>
        <div style={{display:'flex',gap:8,marginBottom:24}}>
          {['usuarios','empresas','periodos'].map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              style={{padding:'10px 20px',border:'1.5px solid #dde1e7',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600,
                background:tab===t?'#1e242b':'#fff',color:tab===t?'#fff':'#8c9199',fontFamily:'inherit'}}>
              {t==='usuarios'?'👤 Usuarios':t==='empresas'?'🏢 Empresas':'📅 Períodos'}
            </button>
          ))}
        </div>

        <div style={{background:'#fff',borderRadius:12,padding:24,border:'1px solid #dde1e7'}}>

          {/* USUARIOS */}
          {tab==='usuarios' && <>
            <h2 style={{fontSize:15,fontWeight:700,marginBottom:16}}>Usuarios registrados</h2>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead style={{borderBottom:'2px solid #dde1e7'}}>
                <tr>{['Nombre','Email','Rol','Asignar empresa'].map(h=><th key={h} style={{textAlign:'left',padding:'8px 12px',color:'#8c9199',fontWeight:600}}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {usuarios.map(u=>(
                  <tr key={u.id} style={{borderBottom:'1px solid #f4f5f7'}}>
                    <td style={{padding:'10px 12px'}}>{u.nombre}</td>
                    <td style={{padding:'10px 12px'}}>{u.email}</td>
                    <td style={{padding:'10px 12px'}}><span style={badge(u.rol==='admin'?'#e51b24':u.rol==='analista'?'#1b7f3a':'#8c9199')}>{u.rol}</span></td>
                    <td style={{padding:'10px 12px'}}>
                      <select style={{...inp,padding:'4px 8px',fontSize:12}} onChange={e=>asignarEmpresa(u.id,e.target.value)} defaultValue="">
                        <option value="">Asignar...</option>
                        {empresas.map(emp=><option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>}

          {/* EMPRESAS */}
          {tab==='empresas' && <>
            <h2 style={{fontSize:15,fontWeight:700,marginBottom:16}}>Agregar empresa</h2>
            <form onSubmit={crearEmpresa} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:24}}>
              <input style={inp} placeholder="Nombre empresa" value={nuevaEmp.nombre} onChange={e=>setNuevaEmp({...nuevaEmp,nombre:e.target.value})} required />
              <input style={inp} placeholder="Código (ej: QUEST)" value={nuevaEmp.codigo} onChange={e=>setNuevaEmp({...nuevaEmp,codigo:e.target.value})} required />
              <input style={inp} placeholder="ID Google Sheet" value={nuevaEmp.sheet_id} onChange={e=>setNuevaEmp({...nuevaEmp,sheet_id:e.target.value})} required />
              <input style={inp} placeholder="ID Catálogo" value={nuevaEmp.catalogo_id} onChange={e=>setNuevaEmp({...nuevaEmp,catalogo_id:e.target.value})} required />
              <input style={{...inp,gridColumn:'1/-1'}} placeholder="ID Carpeta Drive" value={nuevaEmp.folder_id} onChange={e=>setNuevaEmp({...nuevaEmp,folder_id:e.target.value})} required />
              <button style={{...btn,gridColumn:'1/-1'}} type="submit">Crear empresa</button>
            </form>
            <h2 style={{fontSize:15,fontWeight:700,marginBottom:16}}>Empresas registradas</h2>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead style={{borderBottom:'2px solid #dde1e7'}}>
                <tr>{['Nombre','Código','Estado'].map(h=><th key={h} style={{textAlign:'left',padding:'8px 12px',color:'#8c9199',fontWeight:600}}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {empresas.map(e=>(
                  <tr key={e.id} style={{borderBottom:'1px solid #f4f5f7'}}>
                    <td style={{padding:'10px 12px'}}>{e.nombre}</td>
                    <td style={{padding:'10px 12px'}}>{e.codigo}</td>
                    <td style={{padding:'10px 12px'}}><span style={badge(e.activa?'#1b7f3a':'#8c9199')}>{e.activa?'Activa':'Inactiva'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>}

          {/* PERÍODOS */}
          {tab==='periodos' && <>
            <h2 style={{fontSize:15,fontWeight:700,marginBottom:16}}>Crear período de pago</h2>
            <form onSubmit={crearPeriodo} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:24}}>
              <select style={{...inp,gridColumn:'1/-1'}} value={nuevoPer.empresa_id} onChange={e=>setNuevoPer({...nuevoPer,empresa_id:e.target.value})} required>
                <option value="">Seleccionar empresa...</option>
                {empresas.map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
              <input style={{...inp,gridColumn:'1/-1'}} placeholder="Nombre período (ej: 1B Enero 2026)" value={nuevoPer.nombre} onChange={e=>setNuevoPer({...nuevoPer,nombre:e.target.value})} required />
              <input style={inp} type="date" value={nuevoPer.fecha_inicio} onChange={e=>setNuevoPer({...nuevoPer,fecha_inicio:e.target.value})} required />
              <input style={inp} type="date" value={nuevoPer.fecha_fin} onChange={e=>setNuevoPer({...nuevoPer,fecha_fin:e.target.value})} required />
              <input style={inp} placeholder="NU_LOTE Horas Extras" value={nuevoPer.nu_lote_he} onChange={e=>setNuevoPer({...nuevoPer,nu_lote_he:e.target.value})} />
              <input style={inp} placeholder="NU_LOTE Feriados" value={nuevoPer.nu_lote_fer} onChange={e=>setNuevoPer({...nuevoPer,nu_lote_fer:e.target.value})} />
              <button style={{...btn,gridColumn:'1/-1'}} type="submit">Crear período</button>
            </form>
            <h2 style={{fontSize:15,fontWeight:700,marginBottom:16}}>Períodos registrados</h2>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead style={{borderBottom:'2px solid #dde1e7'}}>
                <tr>{['Empresa','Período','Inicio','Fin','Lote HE'].map(h=><th key={h} style={{textAlign:'left',padding:'8px 12px',color:'#8c9199',fontWeight:600}}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {periodos.map(p=>(
                  <tr key={p.id} style={{borderBottom:'1px solid #f4f5f7'}}>
                    <td style={{padding:'10px 12px'}}>{p.empresas?.nombre}</td>
                    <td style={{padding:'10px 12px'}}>{p.nombre}</td>
                    <td style={{padding:'10px 12px'}}>{p.fecha_inicio}</td>
                    <td style={{padding:'10px 12px'}}>{p.fecha_fin}</td>
                    <td style={{padding:'10px 12px'}}>{p.nu_lote_he||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>}
        </div>
      </main>
    </div>
  );
}
