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

  // Formularios
  const [nuevoUser, setNuevoUser] = useState({ email:'', password:'', nombre:'', rol:'analista' });
  const [nuevaEmp, setNuevaEmp] = useState({ nombre:'', codigo:'', sheet_id:'', catalogo_id:'', folder_id:'' });
  const [nuevoPer, setNuevoPer] = useState({ empresa_id:'', nombre:'', fecha_inicio:'', fecha_fin:'', nu_lote_he:'', nu_lote_fer:'' });

  useEffect(() => { cargarTodo(); }, []);

  const cargarTodo = async () => {
    const { data: u } = await supabase.from('perfiles').select('*').order('created_at');
    const { data: e } = await supabase.from('empresas').select('*').order('nombre');
    const { data: p } = await supabase.from('periodos_pago').select('*, empresas(nombre)').order('created_at', { ascending: false });
    setUsuarios(u || []); setEmpresas(e || []); setPeriodos(p || []);
  };

  const crearUsuario = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.admin.createUser({
      email: nuevoUser.email, password: nuevoUser.password,
      user_metadata: { nombre: nuevoUser.nombre }
    });
    if (error) { setMsg('❌ ' + error.message); return; }
    await supabase.from('perfiles').update({ rol: nuevoUser.rol }).eq('id', data.user.id);
    setMsg('✅ Usuario creado'); setNuevoUser({ email:'', password:'', nombre:'', rol:'analista' });
    cargarTodo();
  };

  const crearEmpresa = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('empresas').insert(nuevaEmp);
    if (error) { setMsg('❌ ' + error.message); return; }
    setMsg('✅ Empresa creada'); setNuevaEmp({ nombre:'', codigo:'', sheet_id:'', catalogo_id:'', folder_id:'' });
    cargarTodo();
  };

  const crearPeriodo = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('periodos_pago').insert(nuevoPer);
    if (error) { setMsg('❌ ' + error.message); return; }
    setMsg('✅ Período creado'); setNuevoPer({ empresa_id:'', nombre:'', fecha_inicio:'', fecha_fin:'', nu_lote_he:'', nu_lote_fer:'' });
    cargarTodo();
  };

  const asignarEmpresa = async (userId, empresaId) => {
    await supabase.from('usuario_empresa').upsert({ usuario_id: userId, empresa_id: empresaId });
    setMsg('✅ Empresa asignada'); cargarTodo();
  };

  return (
    <div style={s.root}>
      <header style={s.header}>
        <button style={s.back} onClick={() => nav('/')}>← Volver</button>
        <span style={s.logo}>HR<span style={{color:'#e51b24'}}>Sync</span></span>
        <span style={s.titulo}>Panel de Administración</span>
      </header>

      {msg && <div style={s.msgBar} onClick={() => setMsg('')}>{msg} ✕</div>}

      <main style={s.main}>
        {/* Tabs */}
        <div style={s.tabs}>
          {['usuarios','empresas','periodos'].map(t => (
            <button key={t} style={{...s.tab, ...(tab===t ? s.tabActive : {})}} onClick={() => setTab(t)}>
              {t === 'usuarios' ? '👤 Usuarios' : t === 'empresas' ? '🏢 Empresas' : '📅 Períodos'}
            </button>
          ))}
        </div>

        {/* USUARIOS */}
        {tab === 'usuarios' && (
          <div style={s.section}>
            <h2 style={s.secTitle}>Crear usuario</h2>
            <form onSubmit={crearUsuario} style={s.form}>
              <input style={s.input} placeholder="Nombre completo" value={nuevoUser.nombre} onChange={e=>setNuevoUser({...nuevoUser,nombre:e.target.value})} required />
              <input style={s.input} placeholder="Email" type="email" value={nuevoUser.email} onChange={e=>setNuevoUser({...nuevoUser,email:e.target.value})} required />
              <input style={s.input} placeholder="Contraseña" type="password" value={nuevoUser.password} onChange={e=>setNuevoUser({...nuevoUser,password:e.target.value})} required />
              <select style={s.input} value={nuevoUser.rol} onChange={e=>setNuevoUser({...nuevoUser,rol:e.target.value})}>
                <option value="analista">Analista</option>
                <option value="admin">Admin</option>
                <option value="viewer">Solo lectura</option>
              </select>
              <button style={s.btn} type="submit">Crear usuario</button>
            </form>
            <h2 style={{...s.secTitle,marginTop:24}}>Usuarios existentes</h2>
            <table style={s.tabla}>
              <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Asignar empresa</th></tr></thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id}>
                    <td>{u.nombre}</td><td>{u.email}</td>
                    <td><span style={{...s.badge, background: u.rol==='admin'?'#e51b24':u.rol==='analista'?'#1b7f3a':'#8c9199'}}>{u.rol}</span></td>
                    <td>
                      <select style={{...s.input,padding:'4px 8px',fontSize:12}} onChange={e=>asignarEmpresa(u.id,e.target.value)} defaultValue="">
                        <option value="">Asignar...</option>
                        {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* EMPRESAS */}
        {tab === 'empresas' && (
          <div style={s.section}>
            <h2 style={s.secTitle}>Agregar empresa</h2>
            <form onSubmit={crearEmpresa} style={s.form}>
              <input style={s.input} placeholder="Nombre empresa" value={nuevaEmp.nombre} onChange={e=>setNuevaEmp({...nuevaEmp,nombre:e.target.value})} required />
              <input style={s.input} placeholder="Código (ej: QUEST)" value={nuevaEmp.codigo} onChange={e=>setNuevaEmp({...nuevaEmp,codigo:e.target.value})} required />
              <input style={s.input} placeholder="ID Google Sheet" value={nuevaEmp.sheet_id} onChange={e=>setNuevaEmp({...nuevaEmp,sheet_id:e.target.value})} required />
              <input style={s.input} placeholder="ID Catálogo" value={nuevaEmp.catalogo_id} onChange={e=>setNuevaEmp({...nuevaEmp,catalogo_id:e.target.value})} required />
              <input style={s.input} placeholder="ID Carpeta Drive" value={nuevaEmp.folder_id} onChange={e=>setNuevaEmp({...nuevaEmp,folder_id:e.target.value})} required />
              <button style={s.btn} type="submit">Crear empresa</button>
            </form>
            <h2 style={{...s.secTitle,marginTop:24}}>Empresas registradas</h2>
            <table style={s.tabla}>
              <thead><tr><th>Nombre</th><th>Código</th><th>Estado</th></tr></thead>
              <tbody>
                {empresas.map(e => (
                  <tr key={e.id}>
                    <td>{e.nombre}</td><td>{e.codigo}</td>
                    <td><span style={{...s.badge,background:e.activa?'#1b7f3a':'#8c9199'}}>{e.activa?'Activa':'Inactiva'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PERÍODOS */}
        {tab === 'periodos' && (
          <div style={s.section}>
            <h2 style={s.secTitle}>Crear período de pago</h2>
            <form onSubmit={crearPeriodo} style={s.form}>
              <select style={s.input} value={nuevoPer.empresa_id} onChange={e=>setNuevoPer({...nuevoPer,empresa_id:e.target.value})} required>
                <option value="">Seleccionar empresa...</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
              <input style={s.input} placeholder="Nombre período (ej: 1B Enero 2026)" value={nuevoPer.nombre} onChange={e=>setNuevoPer({...nuevoPer,nombre:e.target.value})} required />
              <input style={s.input} type="date" value={nuevoPer.fecha_inicio} onChange={e=>setNuevoPer({...nuevoPer,fecha_inicio:e.target.value})} required />
              <input style={s.input} type="date" value={nuevoPer.fecha_fin} onChange={e=>setNuevoPer({...nuevoPer,fecha_fin:e.target.value})} required />
              <input style={s.input} placeholder="NU_LOTE Horas Extras" value={nuevoPer.nu_lote_he} onChange={e=>setNuevoPer({...nuevoPer,nu_lote_he:e.target.value})} />
              <input style={s.input} placeholder="NU_LOTE Feriados" value={nuevoPer.nu_lote_fer} onChange={e=>setNuevoPer({...nuevoPer,nu_lote_fer:e.target.value})} />
              <button style={s.btn} type="submit">Crear período</button>
            </form>
            <h2 style={{...s.secTitle,marginTop:24}}>Períodos registrados</h2>
            <table style={s.tabla}>
              <thead><tr><th>Empresa</th><th>Período</th><th>Inicio</th><th>Fin</th><th>Lote HE</th></tr></thead>
              <tbody>
                {periodos.map(p => (
                  <tr key={p.id}>
                    <td>{p.empresas?.nombre}</td><td>{p.nombre}</td>
                    <td>{p.fecha_inicio}</td><td>{p.fecha_fin}</td><td>{p.nu_lote_he||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

const s = {
  root:{minHeight:'100vh',background:'#f4f5f7',display:'flex',flexDirection:'column'},
  header:{background:'#1e242b',padding:'0 24px',height:60,display:'flex',alignItems:'center',gap:16,boxShadow:'0 2px 8px rgba(0,0,0,0.2)'},
  back:{background:'transparent',border:'1px solid #8c9199',color:'#fff',padding:'6px 12px',borderRadius:6,cursor:'pointer',fontSize:13},
  logo:{fontSize:22,fontWeight:800,color:'#fff'},
  titulo:{fontSize:14,color:'#8c9199',marginLeft:'auto'},
  msgBar:{background:'#1b7f3a',color:'#fff',padding:'10px 24px',fontSize:13,cursor:'pointer',textAlign:'center'},
  main:{flex:1,padding:'32px 24px',maxWidth:1000,margin:'0 auto',width:'100%'},
  tabs:{display:'flex',gap:8,marginBottom:24},
  tab:{padding:'10px 20px',border:'1.5px solid #dde1e7',borderRadius:8,background:'#fff',cursor:'pointer',fontSize:13,fontWeight:600,color:'#8c9199'},
  tabActive:{background:'#1e242b',color:'#fff',border:'1.5px solid #1e242b'},
  section:{background:'#fff',borderRadius:12,padding:24,border:'1px solid #dde1e7'},
  secTitle:{fontSize:15,fontWeight:700,color:'#1e242b',marginBottom:16},
  form:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:8},
  input:{padding:'9px 13px',border:'1.5px solid #dde1e7',borderRadius:8,fontSize:13,fontFamily:'inherit',outline:'none'},
  btn:{background:'#e51b24',color:'#fff',border:'none',borderRadius:8,padding:'10px 20px',fontSize:13,fontWeight:700,cursor:'pointer',gridColumn:'1/-1'},
  tabla:{width:'100%',borderCollapse:'collapse',fontSize:13},
  badge:{color:'#fff',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600},
};
