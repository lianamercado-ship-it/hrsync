// ══════════════════════════════════════════════════════════════
// HRSYNC — Web App API (Google Apps Script)
// Este script se despliega como Web App y recibe llamadas
// desde el frontend React para ejecutar las distribuciones
// ══════════════════════════════════════════════════════════════

// ─── Punto de entrada POST ───────────────────────────────────
function doPost(e) {
  try {
    var body   = JSON.parse(e.postData.contents);
    var accion = body.accion;
    var result;

    switch (accion) {
      case 'distribucion':
        result = ejecutarDistribucion(body);
        break;
      case 'resumen':
        result = ejecutarResumen(body);
        break;
      case 'archivo_he':
        result = ejecutarArchivoHE(body);
        break;
      case 'archivo_feriado':
        result = ejecutarArchivoFeriado(body);
        break;
      default:
        result = { error: 'Acción no reconocida: ' + accion };
    }

    return respuesta(result);
  } catch (err) {
    return respuesta({ error: err.message });
  }
}

// ─── Respuesta CORS ──────────────────────────────────────────
function doGet(e) {
  return respuesta({ status: 'HRSync API activa', version: '1.0' });
}

function respuesta(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ──────────────────────────────────────────────────────────────
// ACCIÓN 1: Procesar Distribución de Horas Extras
// ──────────────────────────────────────────────────────────────
function ejecutarDistribucion(body) {
  var ss         = SpreadsheetApp.openById(body.sheetId);
  var ssCatalogo = SpreadsheetApp.openById(body.catalogoId);

  var hojaQuest   = ss.getSheetByName("Quest Overtime");
  var hojaReporte = ss.getSheetByName("Reporte de Trabajadores");
  var hojaTool    = ss.getSheetByName("TOOL DE HORAS EXTRAS");
  var hojaFer     = ssCatalogo.getSheetByName("CATALOGO DE DIAS FERIADOS");
  var hojaT       = ssCatalogo.getSheetByName("TIPOS DE TURNOS");

  if (!hojaQuest || !hojaReporte || !hojaTool || !hojaFer || !hojaT) {
    return { error: 'Una o más pestañas no existen en el Sheet.' };
  }

  // Llamar al motor de distribución (reutiliza toda la lógica del script v5)
  var filas = motorDistribucion(ss, ssCatalogo, hojaQuest, hojaReporte, hojaTool, hojaFer, hojaT);

  return {
    ok: true,
    mensaje: '✅ Distribución completada. ' + filas + ' filas procesadas.',
    filas: filas
  };
}

// ──────────────────────────────────────────────────────────────
// ACCIÓN 2: Generar Resumen
// ──────────────────────────────────────────────────────────────
function ejecutarResumen(body) {
  var ss       = SpreadsheetApp.openById(body.sheetId);
  var hojaTool = ss.getSheetByName("TOOL DE HORAS EXTRAS");
  if (!hojaTool) return { error: 'No existe TOOL DE HORAS EXTRAS.' };
  generarResumen(hojaTool, ss);
  return { ok: true, mensaje: '✅ Resumen generado correctamente.' };
}

// ──────────────────────────────────────────────────────────────
// ACCIÓN 3: Generar Archivo Horas Extras
// ──────────────────────────────────────────────────────────────
function ejecutarArchivoHE(body) {
  var ss       = SpreadsheetApp.openById(body.sheetId);
  var hojaTool = ss.getSheetByName("TOOL DE HORAS EXTRAS");
  var hojaRes  = ss.getSheetByName("Resumen de Horas Extras");
  if (!hojaTool || !hojaRes) return { error: 'Pestañas requeridas no encontradas.' };

  var nuLote = body.nuLoteHE || hojaRes.getRange(2,2).getValue().toString().trim();
  if (!nuLote) return { error: 'NU_LOTE no definido.' };

  // Buscar fecha en Periodos de Pagos BI
  var ssCat    = SpreadsheetApp.openById(body.catalogoId);
  var hojaPer  = ssCat.getSheetByName("Periodos de Pagos BI");
  var fIni = "", fFin = "";
  if (hojaPer) {
    var c1 = hojaRes.getRange(1,2).getValue().toString().trim();
    var c2 = hojaRes.getRange(1,5).getValue().toString().trim();
    var c3 = hojaRes.getRange(1,8).getValue().toString().trim();
    var dp  = hojaPer.getDataRange().getValues();
    for (var pi = 1; pi < dp.length; pi++) {
      var a  = dp[pi][0] ? dp[pi][0].toString().trim().toLowerCase() : "";
      var bv = dp[pi][1] ? dp[pi][1].toString().trim().toLowerCase() : "";
      var cv = dp[pi][2] ? dp[pi][2].toString().trim().toLowerCase() : "";
      if (a===c1.toLowerCase() && bv===c2.toLowerCase() && cv===c3.toLowerCase()) {
        var fR = dp[pi][4];
        if (fR instanceof Date) {
          fIni = String(fR.getDate()).padStart(2,"0") + String(fR.getMonth()+1).padStart(2,"0") + fR.getFullYear();
        } else if (fR) {
          var pf = fR.toString().trim().split("/");
          if (pf.length===3) fIni = String(parseInt(pf[0],10)).padStart(2,"0") + String(parseInt(pf[1],10)).padStart(2,"0") + pf[2].trim();
          else fIni = fR.toString().trim();
        }
        fFin = fIni;
        break;
      }
    }
  }
  if (!fIni) return { error: 'No se encontró la fecha en Periodos de Pagos BI.' };

  var mc = {14:"30",15:"29",16:"39",17:"31",18:"32",19:"33",20:"34",21:"35",22:"38",23:"37",
            24:"40",25:"48",26:"53",27:"36",28:"49",29:"59",30:"90",31:"91",32:"92",33:"93",
            34:"94",35:"95",36:"96",37:"97",38:"28"};
  var uf    = hojaTool.getLastRow();
  var datos = hojaTool.getRange(5,1,uf-4,40).getValues();
  var ma    = {};
  for (var i=0;i<datos.length;i++) {
    var fi=datos[i], eid=fi[0]?fi[0].toString().trim():"";
    if (!eid||eid==="TOTAL"||!/^\d+$/.test(eid)) continue;
    if (!ma[eid]) ma[eid]={};
    for (var idx in mc) {
      idx=parseInt(idx); var v=fi[idx];
      if (typeof v==="number"&&v!==0) { var cod=mc[idx]; ma[eid][cod]=Math.round(((ma[eid][cod]||0)+v)*100)/100; }
    }
  }
  var ids = Object.keys(ma).sort(function(a,b){return parseInt(a,10)-parseInt(b,10);});
  var io  = Object.keys(mc).map(Number).sort(function(a,b){return a-b;});
  var lineas = [["iD","EMPRESA","COD_TRABAJADOR","CONCEPTO","FECHA_INICIAL","FECHA_FINAL","FRECUENCIA_PAGO","CANTIDAD","PORCENTAJE","MONTO","NU_LOTE","USUARIO_CARGA"].join("\t")];
  var cnt = 1;
  for (var r=0;r<ids.length;r++) {
    var eid=ids[r];
    for (var ci=0;ci<io.length;ci++) {
      var idx=io[ci], cod=mc[idx], qty=ma[eid][cod];
      if (!qty||qty===0) continue;
      lineas.push([cnt,"260",eid,cod,fIni,fFin,"B",qty,"","",nuLote,"USUARIO"].join("\t"));
      cnt++;
    }
  }
  var csv = lineas.join("\n");
  var fn  = "CargaNomina_Quest_"+fIni+"_"+fFin+".csv";
  var carp = DriveApp.getFolderById(body.folderId);
  var ae   = carp.getFilesByName(fn); while(ae.hasNext()) ae.next().setTrashed(true);
  var arch = carp.createFile(Utilities.newBlob(csv,"text/plain",fn));
  arch.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return {
    ok: true,
    mensaje: '✅ Archivo HE generado: ' + fn + ' (' + (cnt-1) + ' registros)',
    link: 'https://drive.google.com/uc?export=download&id=' + arch.getId(),
    filas: cnt-1
  };
}

// ──────────────────────────────────────────────────────────────
// ACCIÓN 4: Generar Archivo Feriados
// ──────────────────────────────────────────────────────────────
function ejecutarArchivoFeriado(body) {
  var ss       = SpreadsheetApp.openById(body.sheetId);
  var hojaTool = ss.getSheetByName("TOOL DE HORAS EXTRAS");
  var hojaRes  = ss.getSheetByName("Resumen de Horas Extras");
  if (!hojaTool||!hojaRes) return { error: 'Pestañas requeridas no encontradas.' };

  var nuLote = body.nuLoteFer || hojaRes.getRange(2,15).getValue().toString().trim();
  if (!nuLote) return { error: 'NU_LOTE Feriado no definido.' };

  var uf    = hojaTool.getLastRow();
  var datos = hojaTool.getRange(5,1,uf-4,40).getValues();
  var regs=[], idsSet={};
  for (var i=0;i<datos.length;i++) {
    var fi=datos[i], eid=fi[0]?fi[0].toString().trim():"";
    if (!eid||eid==="TOTAL"||!/^\d+$/.test(eid)) continue;
    var qty=fi[39]; if (typeof qty!=="number"||qty===0) continue;
    var fv=fi[2], fs="";
    if (fv instanceof Date) fs=(fv.getMonth()+1)+"/"+fv.getDate()+"/"+fv.getFullYear();
    else fs=fv.toString().trim();
    var key=eid+"|"+fs;
    if (!idsSet[key]) { idsSet[key]=regs.length; regs.push({empId:eid,fecha:fs,cantidad:qty}); }
    else regs[idsSet[key]].cantidad=Math.round((regs[idsSet[key]].cantidad+qty)*100)/100;
  }
  if (regs.length===0) return { error: 'No se encontraron registros con Concepto 41.' };
  regs.sort(function(a,b){return parseInt(a.empId,10)-parseInt(b.empId,10);});
  var lineas=[["iD","EMPRESA","TRABAJADOR","CONCEPTO","FECHA","CANTIDAD","HORAS","MINUTOS","USUARIO_CARGA","NU_LOTE","OBSERVACIONES"].join("\t")];
  for (var r=0;r<regs.length;r++) lineas.push([r+1,"260",regs[r].empId,"41",regs[r].fecha,regs[r].cantidad,"","","URUARIO",nuLote,""].join("\t"));
  var csv=lineas.join("\n"), fn="CargaFeriado_Quest_"+nuLote+".csv";
  var carp=DriveApp.getFolderById(body.folderId);
  var ae=carp.getFilesByName(fn); while(ae.hasNext()) ae.next().setTrashed(true);
  var arch=carp.createFile(Utilities.newBlob(csv,"text/plain",fn));
  arch.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);

  return {
    ok: true,
    mensaje: '✅ Archivo Feriados generado: ' + fn + ' (' + regs.length + ' registros)',
    link: 'https://drive.google.com/uc?export=download&id=' + arch.getId(),
    filas: regs.length
  };
}

// ──────────────────────────────────────────────────────────────
// MOTOR DE DISTRIBUCIÓN (mismo que el script v5)
// ──────────────────────────────────────────────────────────────
function motorDistribucion(ss, ssCatalogo, hojaQ, hojaR, hojaTool, hojaFer, hojaT) {
  // ── Aquí va todo el código del script v5 ──
  // (copiar desde procesarDistribucionHorasExtras del script v5,
  //  pero sin llamar a SpreadsheetApp.getUi() y retornando el count)
  // Por brevedad referenciamos la función del script v5:
  return ejecutarMotorV5(ss, ssCatalogo, hojaQ, hojaR, hojaTool, hojaFer, hojaT);
}

// NOTA: Pegar aquí todo el contenido del script v5 (funciones auxiliares)
// Las funciones: clasificar, segmentarConAlmuerzo, construirBloquesV2,
// distribuirFeriado, distribuirDiaEspecial, distribuirDiaRegular,
// asignarExtras, calcTotalH, generarResumen, h2d, d2hStr, fechaStr, rnd2, rnd4
// Se pegan aquí directamente para que estén disponibles en la Web App.
