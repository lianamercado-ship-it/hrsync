import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Distribucion from './pages/Distribucion';
import Admin from './pages/Admin';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <Splash />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
        <Route path="/" element={session ? <Dashboard session={session} /> : <Navigate to="/login" />} />
        <Route path="/empresa/:id" element={session ? <Distribucion session={session} /> : <Navigate to="/login" />} />
        <Route path="/admin" element={session ? <Admin session={session} /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

function Splash() {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#1e242b'}}>
      <div style={{textAlign:'center',color:'#fff'}}>
        <div style={{fontSize:40,fontWeight:700,color:'#e51b24',letterSpacing:2}}>HRSync</div>
        <div style={{fontSize:14,color:'#8c9199',marginTop:8}}>Cargando...</div>
      </div>
    </div>
  );
}
