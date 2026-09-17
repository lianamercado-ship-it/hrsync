-- ═══════════════════════════════════════════════════════════
-- HRSYNC — Schema Supabase
-- ═══════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- EMPRESAS
CREATE TABLE empresas (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nombre      TEXT NOT NULL,
  codigo      TEXT NOT NULL UNIQUE,
  sheet_id    TEXT NOT NULL,
  catalogo_id TEXT NOT NULL,
  folder_id   TEXT NOT NULL,
  activa      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- PERFILES
CREATE TABLE perfiles (
  id         UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nombre     TEXT NOT NULL,
  email      TEXT NOT NULL,
  rol        TEXT NOT NULL DEFAULT 'analista',
  activo     BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ACCESO USUARIO-EMPRESA
CREATE TABLE usuario_empresa (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  usuario_id      UUID REFERENCES perfiles(id) ON DELETE CASCADE,
  empresa_id      UUID REFERENCES empresas(id) ON DELETE CASCADE,
  puede_ejecutar  BOOLEAN DEFAULT true,
  puede_generar   BOOLEAN DEFAULT true,
  UNIQUE(usuario_id, empresa_id)
);

-- REGLAS POR EMPRESA
CREATE TABLE reglas_empresa (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  clave      TEXT NOT NULL,
  valor      TEXT NOT NULL,
  descripcion TEXT,
  UNIQUE(empresa_id, clave)
);

-- LOG DE EJECUCIONES
CREATE TABLE ejecuciones (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  empresa_id       UUID REFERENCES empresas(id),
  usuario_id       UUID REFERENCES perfiles(id),
  tipo             TEXT NOT NULL,
  estado           TEXT NOT NULL DEFAULT 'iniciado',
  filas_procesadas INTEGER,
  mensaje          TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- PERÍODOS DE PAGO
CREATE TABLE periodos_pago (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  empresa_id   UUID REFERENCES empresas(id),
  nombre       TEXT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin    DATE NOT NULL,
  frecuencia   TEXT DEFAULT 'B',
  nu_lote_he   TEXT,
  nu_lote_fer  TEXT,
  activo       BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- DATOS INICIALES QUEST
INSERT INTO empresas (nombre, codigo, sheet_id, catalogo_id, folder_id) VALUES
('Quest Panama', 'QUEST',
 '1ASjcV80hE55tt-kjt4Mswwel7PGsOM9vVKKUDKOyRY0',
 '1nhJKjVozIQRGa6hwIlWnHsRrs1IaO6S-BEtvAHCfW6A',
 '19oYFjPTEVuG_FbpU5YBPQIqSO2gLdk_7');

INSERT INTO reglas_empresa (empresa_id, clave, valor, descripcion)
SELECT id,'MAX_ALMUERZO','2.0','Pausa máxima como almuerzo (h)' FROM empresas WHERE codigo='QUEST';
INSERT INTO reglas_empresa (empresa_id, clave, valor, descripcion)
SELECT id,'HORA_CORTE_NOCTURNO','18.0','Corte diurno/nocturno' FROM empresas WHERE codigo='QUEST';
INSERT INTO reglas_empresa (empresa_id, clave, valor, descripcion)
SELECT id,'LIMITE_DIARIO','3.0','Límite extras diarias' FROM empresas WHERE codigo='QUEST';
INSERT INTO reglas_empresa (empresa_id, clave, valor, descripcion)
SELECT id,'LIMITE_SEMANAL','9.0','Límite extras semanales' FROM empresas WHERE codigo='QUEST';

-- ROW LEVEL SECURITY
ALTER TABLE empresas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE reglas_empresa  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ejecuciones     ENABLE ROW LEVEL SECURITY;
ALTER TABLE periodos_pago   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_todo_empresas" ON empresas FOR ALL USING (
  EXISTS (SELECT 1 FROM perfiles WHERE id=auth.uid() AND rol='admin'));
CREATE POLICY "analista_sus_empresas" ON empresas FOR SELECT USING (
  EXISTS (SELECT 1 FROM usuario_empresa WHERE usuario_id=auth.uid() AND empresa_id=empresas.id));
CREATE POLICY "perfil_propio" ON perfiles FOR ALL USING (id=auth.uid());
CREATE POLICY "admin_perfiles" ON perfiles FOR ALL USING (
  EXISTS (SELECT 1 FROM perfiles WHERE id=auth.uid() AND rol='admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
