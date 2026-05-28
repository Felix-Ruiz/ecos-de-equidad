"use client";

import { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import * as XLSX from 'xlsx';
import { Search, Upload, UserPlus, X, Edit2, Trash2, Download, AlertCircle, CheckCircle, QrCode, Lock, User, KeyRound } from 'lucide-react';
import Link from 'next/link';

interface Participante {
  id: string;
  documento: string;
  tipo_documento: string;
  nombre: string;
  apellido: string;
  correo: string;
  institucion: string;
  cargo: string;
  telefono: string;
  sexo: string;
  ciudad: string;
  pais: string;
  asistencia: boolean;
  origen: string;
}

export default function Home() {
  // ---- ESTADOS DE AUTENTICACIÓN ----
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  // ---- ESTADOS DEL SISTEMA ----
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [toast, setToast] = useState<{ show: boolean, message: string, type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState<{ show: boolean, message: string, onConfirm: () => void }>({ show: false, message: '', onConfirm: () => {} });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialFormState = {
    documento: '', tipo_documento: '', nombre: '', apellido: '',
    correo: '', institucion: '', cargo: '', telefono: '',
    sexo: '', ciudad: '', pais: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  // ---- VERIFICAR SESIÓN Y CARGAR DATOS ----
  useEffect(() => {
    const authStatus = sessionStorage.getItem('acofi_admin_auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
    setIsCheckingAuth(false);

    if (authStatus === 'true') {
      fetchParticipantes();
      
      const subscription = supabase
        .channel('public:participantes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'participantes' }, () => {
          fetchParticipantes();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [isAuthenticated]);

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (loginUser === 'AcofiAdmin' && loginPass === 'AcofiAdmin2030#') {
      sessionStorage.setItem('acofi_admin_auth', 'true');
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Usuario o contraseña incorrectos.');
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const fetchParticipantes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('participantes')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) {
      console.error("Error al cargar datos:", error);
      showToast('Error al sincronizar base de datos', 'error');
    } else {
      setParticipantes(data || []);
    }
    setLoading(false);
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      if (!bstr) return;

      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

      const dataRows = data.slice(1).filter(row => row.some(cell => cell !== undefined && String(cell).trim() !== ''));
      
      let tempIdCounter = 1;

      const toInsert = dataRows.map((row: any[]) => {
        let doc = String(row[0] || '').trim();
        
        if (!doc) {
          doc = String(tempIdCounter).padStart(3, '0');
          tempIdCounter++;
        }

        return {
          documento: doc,
          tipo_documento: String(row[1] || ''),
          nombre: String(row[2] || ''),
          apellido: String(row[3] || ''),
          correo: String(row[4] || ''),
          institucion: String(row[5] || ''),
          cargo: String(row[7] || ''),
          telefono: String(row[8] || ''),
          sexo: String(row[9] || ''),
          ciudad: String(row[10] || ''),
          pais: String(row[11] || ''),
          asistencia: false,
          origen: 'archivo'
        };
      });

      const { error } = await supabase.from('participantes').insert(toInsert);
      if (error) {
        showToast('Error al insertar registros. Verifica permisos.', 'error');
      } else {
        showToast('Archivo cargado exitosamente', 'success');
        fetchParticipantes();
      }
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  const toggleAsistencia = async (id: string, currentState: boolean) => {
    const newState = !currentState;
    setParticipantes(prev => prev.map(p => p.id === id ? { ...p, asistencia: newState } : p));

    const { error } = await supabase.from('participantes').update({ asistencia: newState }).eq('id', id);

    if (error) {
      showToast('Error al actualizar asistencia', 'error');
      setParticipantes(prev => prev.map(p => p.id === id ? { ...p, asistencia: currentState } : p));
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleManualSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const newParticipant = { ...formData, asistencia: false, origen: 'manual' };

    const { error } = await supabase.from('participantes').insert([newParticipant]);
    if (error) {
      showToast('Error al registrar participante.', 'error');
    } else {
      setShowModal(false);
      setFormData(initialFormState);
      showToast('Participante registrado con éxito', 'success');
      fetchParticipantes();
    }
  };

  const openEditModal = (p: Participante) => {
    setFormData({
      documento: p.documento, tipo_documento: p.tipo_documento, nombre: p.nombre, apellido: p.apellido,
      correo: p.correo, institucion: p.institucion, cargo: p.cargo, telefono: p.telefono,
      sexo: p.sexo, ciudad: p.ciudad, pais: p.pais
    });
    setEditingId(p.id);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    const { error } = await supabase.from('participantes').update(formData).eq('id', editingId);

    if (error) {
      showToast('Error al actualizar participante.', 'error');
    } else {
      setShowEditModal(false);
      setEditingId(null);
      setFormData(initialFormState);
      showToast('Datos actualizados correctamente', 'success');
      fetchParticipantes();
    }
  };

  const executeDelete = async (idsToDelete: string[]) => {
    setDeletingIds(prev => [...prev, ...idsToDelete]);
    const { error } = await supabase.from('participantes').delete().in('id', idsToDelete);
    
    if (error) {
      showToast('Error al eliminar participante(s).', 'error');
      setDeletingIds(prev => prev.filter(id => !idsToDelete.includes(id)));
    } else {
      setParticipantes(prev => prev.filter(p => !idsToDelete.includes(p.id)));
      setSelectedIds(prev => prev.filter(id => !idsToDelete.includes(id)));
      setDeletingIds(prev => prev.filter(id => !idsToDelete.includes(id)));
      showToast(idsToDelete.length > 1 ? 'Participantes eliminados' : 'Participante eliminado', 'success');
    }
  };

  const promptDelete = (id: string) => setConfirmDialog({ show: true, message: '¿Estás seguro de eliminar a este participante?', onConfirm: () => executeDelete([id]) });
  const promptDeleteSelected = () => setConfirmDialog({ show: true, message: `¿Eliminar los ${selectedIds.length} participantes seleccionados?`, onConfirm: () => executeDelete(selectedIds) });
  const promptDeleteAll = () => setConfirmDialog({ show: true, message: '¡ADVERTENCIA! ¿Eliminar a TODOS los participantes?', onConfirm: () => executeDelete(participantes.map(p => p.id)) });

  const handleSelectAll = (e: ChangeEvent<HTMLInputElement>) => {
    e.target.checked ? setSelectedIds(filteredParticipantes.map(p => p.id)) : setSelectedIds([]);
  };

  const toggleSelection = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]);

  const handleExport = () => {
    if (participantes.length === 0) return showToast('No hay datos para exportar.', 'error');

    const dataToExport = participantes.map((p, index) => ({
      'Nº': index + 1, 'Documento': p.documento, 'Tipo Documento': p.tipo_documento,
      'Nombres': p.nombre, 'Apellidos': p.apellido, 'Correo': p.correo,
      'Institución': p.institucion, 'Cargo': p.cargo, 'Teléfono': p.telefono,
      'Sexo': p.sexo, 'Ciudad': p.ciudad, 'País': p.pais,
      'Origen': p.origen === 'manual' ? 'Manual' : 'Archivo', 'Asistió': p.asistencia ? 'SÍ' : 'NO'
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Participantes");
    XLSX.writeFile(wb, "Ecos_de_Equidad_Asistencia.xlsx");
    showToast('Archivo exportado con éxito', 'success');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('acofi_admin_auth');
    setIsAuthenticated(false);
  };

  const filteredParticipantes = participantes.filter(p => 
    Object.values(p).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // ---- PANTALLA DE CARGA INICIAL ----
  if (isCheckingAuth) return null;

  // ---- PANTALLA DE LOGIN ----
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-[128px] opacity-40"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-[128px] opacity-40"></div>
        
        <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgb(0,0,0,0.1)] border border-white/80 w-full max-w-md relative z-10 animate-fade-in-up">
          <div className="text-center mb-8">
            <div className="inline-flex bg-indigo-50 p-4 rounded-full mb-4 shadow-inner">
              <Lock className="text-indigo-600" size={36} />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Acceso Restringido</h2>
            <p className="text-slate-500 font-medium mt-2">Ingresa tus credenciales para administrar el evento</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Usuario</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="text-indigo-400" size={20} />
                </div>
                <input 
                  type="text" 
                  required
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  className="pl-12 w-full bg-white border border-slate-200 rounded-2xl py-4 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700 shadow-sm" 
                  placeholder="Ej. Admin" 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <KeyRound className="text-indigo-400" size={20} />
                </div>
                <input 
                  type="password" 
                  required
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="pl-12 w-full bg-white border border-slate-200 rounded-2xl py-4 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700 shadow-sm" 
                  placeholder="••••••••" 
                />
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-red-50 text-red-600 text-sm font-bold rounded-xl text-center flex items-center justify-center gap-2">
                <AlertCircle size={18} /> {loginError}
              </div>
            )}

            <button 
              type="submit" 
              className="w-full py-4 mt-4 bg-linear-to-r from-indigo-600 to-blue-600 text-white rounded-2xl font-extrabold text-lg transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] transform hover:-translate-y-1"
            >
              Iniciar Sesión
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ---- PANTALLA DEL SISTEMA PRINCIPAL ----
  return (
    <div className="min-h-screen p-6 md:p-12 font-sans relative overflow-hidden">
      {toast.show && (
        <div className={`fixed bottom-6 right-6 z-70 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl transform transition-all duration-300 animate-fade-in-up ${toast.type === 'error' ? 'bg-linear-to-r from-red-500 to-rose-600 text-white' : 'bg-linear-to-r from-emerald-500 to-teal-600 text-white'}`}>
          {toast.type === 'error' ? <AlertCircle size={24} /> : <CheckCircle size={24} />}
          <span className="font-semibold tracking-wide">{toast.message}</span>
        </div>
      )}

      {confirmDialog.show && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgb(0,0,0,0.1)] w-full max-w-md p-8 border border-slate-100 text-center animate-scale-in">
            <AlertCircle size={56} className="mx-auto text-rose-500 mb-5" />
            <h3 className="text-2xl font-extrabold text-slate-800 mb-3 tracking-tight">Confirmar Acción</h3>
            <p className="text-slate-600 font-medium mb-8 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => setConfirmDialog({ show: false, message: '', onConfirm: () => {} })} className="px-6 py-3 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-all">Cancelar</button>
              <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog({ show: false, message: '', onConfirm: () => {} }); }} className="px-6 py-3 bg-linear-to-r from-rose-500 to-red-600 text-white rounded-xl font-bold hover:from-rose-600 hover:to-red-700 transition-all shadow-[0_0_15px_rgba(225,29,72,0.4)] hover:shadow-[0_0_25px_rgba(225,29,72,0.6)] transform hover:-translate-y-0.5">Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-[128px] opacity-40"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-[128px] opacity-40"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 bg-white/60 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80">
          <div>
            <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-linear-to-r from-blue-700 to-indigo-600 tracking-tight">
              Ecos de Equidad
            </h1>
            <p className="text-indigo-900/60 mt-2 font-medium">Gestión inteligente y control de asistencia</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 mt-6 md:mt-0">
            <Link 
              href="/qr" 
              target="_blank"
              className="flex items-center gap-2 bg-linear-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)] font-semibold transform hover:-translate-y-0.5"
            >
              <QrCode size={20} /> Mostrar QR
            </Link>

            <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="flex items-center gap-2 bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(59,130,246,0.4)] font-semibold transform hover:-translate-y-0.5"
            >
              <Upload size={20} /> Subir Excel
            </button>
            
            <button 
              onClick={() => setShowModal(true)} 
              className="flex items-center gap-2 bg-linear-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(30,41,59,0.3)] font-semibold transform hover:-translate-y-0.5"
            >
              <UserPlus size={20} /> Registro Manual
            </button>

            <button 
              onClick={handleExport} 
              className="flex items-center gap-2 bg-linear-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.4)] font-semibold transform hover:-translate-y-0.5"
            >
              <Download size={20} /> Exportar
            </button>

            {participantes.length > 0 && (
              <button 
                onClick={selectedIds.length > 0 ? promptDeleteSelected : promptDeleteAll} 
                className="flex items-center gap-2 bg-linear-to-r from-rose-500 to-red-500 text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(244,63,94,0.4)] font-semibold transform hover:-translate-y-0.5"
              >
                <Trash2 size={20} /> {selectedIds.length > 0 ? `Eliminar (${selectedIds.length})` : 'Eliminar Todos'}
              </button>
            )}

            <button 
              onClick={handleLogout} 
              className="flex items-center gap-2 bg-white/50 border border-slate-200 hover:bg-slate-100 text-slate-600 px-6 py-3 rounded-xl transition-all font-semibold"
            >
              Salir
            </button>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 overflow-hidden mb-8 p-8">
          <div className="flex flex-col lg:flex-row justify-between lg:items-end mb-8 gap-6">
            <div className="relative w-full lg:w-1/2">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="text-indigo-400" size={22} />
              </div>
              <input 
                type="text" 
                placeholder="Buscar participante por cualquier dato..." 
                className="pl-12 w-full bg-white/50 border border-indigo-100 rounded-2xl py-4 px-4 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all text-slate-700 font-medium shadow-sm" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
            
            <div className="flex flex-wrap gap-3">
              <div className="text-indigo-900/70 font-semibold bg-white/50 px-5 py-3 rounded-xl border border-indigo-50 shadow-sm flex items-center gap-2">
                Total Participantes: <span className="text-indigo-600 font-bold text-lg">{participantes.length}</span>
              </div>
              <div className="text-slate-700 font-semibold bg-white/50 px-5 py-3 rounded-xl border border-emerald-50 shadow-sm flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse"></span>
                Han llegado: <span className="text-emerald-600 font-bold text-lg">{participantes.filter(p => p.asistencia).length}</span>
              </div>
              <div className="text-slate-700 font-semibold bg-white/50 px-5 py-3 rounded-xl border border-rose-50 shadow-sm flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]"></span>
                Faltan: <span className="text-rose-600 font-bold text-lg">{participantes.filter(p => !p.asistencia).length}</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-widest font-bold">
                  <th className="p-5 border-b border-slate-100 w-12 text-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 cursor-pointer" 
                      checked={selectedIds.length === filteredParticipantes.length && filteredParticipantes.length > 0} 
                      onChange={handleSelectAll} 
                    />
                  </th>
                  <th className="p-5 border-b border-slate-100 text-center w-12">Nº</th>
                  <th className="p-5 border-b border-slate-100">Participante</th>
                  <th className="p-5 border-b border-slate-100">Documento</th>
                  <th className="p-5 border-b border-slate-100">Institución</th>
                  <th className="p-5 border-b border-slate-100">Origen</th>
                  <th className="p-5 border-b border-slate-100 text-center">Asistencia</th>
                  <th className="p-5 border-b border-slate-100 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white/40">
                {loading ? (
                  <tr><td colSpan={8} className="p-8 text-center text-indigo-400 font-medium animate-pulse">Sincronizando base de datos...</td></tr>
                ) : filteredParticipantes.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-slate-400 font-medium">No hay participantes.</td></tr>
                ) : (
                  filteredParticipantes.map((p, index) => (
                    <tr key={p.id} className={`border-b border-slate-50 hover:bg-indigo-50/40 transition-all duration-500 ${deletingIds.includes(p.id) ? 'opacity-30 blur-[2px] pointer-events-none scale-[0.98]' : 'opacity-100 scale-100'}`}>
                      <td className="p-5 text-center">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 cursor-pointer" 
                          checked={selectedIds.includes(p.id)} 
                          onChange={() => toggleSelection(p.id)} 
                        />
                      </td>
                      <td className="p-5 text-center font-bold text-slate-400">{index + 1}</td>
                      <td className="p-5">
                        <div className="font-bold text-slate-800">{p.nombre} {p.apellido}</div>
                        <div className="text-sm text-slate-500 font-medium">{p.correo}</div>
                      </td>
                      <td className="p-5">
                        <div className="text-slate-800 font-semibold">{p.documento}</div>
                        <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">{p.tipo_documento}</div>
                      </td>
                      <td className="p-5 text-slate-600 font-medium">{p.institucion}</td>
                      <td className="p-5">
                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide ${p.origen === 'manual' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {p.origen === 'manual' ? 'MANUAL' : 'ARCHIVO'}
                        </span>
                      </td>
                      <td className="p-5 text-center align-middle">
                        <div className="relative inline-block w-14 mr-2 align-middle select-none transition duration-200 ease-in">
                          <input 
                            type="checkbox" 
                            id={`toggle-${p.id}`} 
                            checked={p.asistencia} 
                            onChange={() => toggleAsistencia(p.id, p.asistencia)} 
                            className="toggle-checkbox absolute block w-7 h-7 rounded-full bg-white border-4 appearance-none cursor-pointer shadow-md" 
                          />
                          <label 
                            htmlFor={`toggle-${p.id}`} 
                            className="toggle-label block overflow-hidden h-7 rounded-full cursor-pointer"
                          ></label>
                        </div>
                      </td>
                      <td className="p-5 text-center align-middle">
                        <div className="flex justify-center gap-3">
                          <button onClick={() => openEditModal(p)} className="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => promptDelete(p.id)} className="text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 p-2 rounded-lg transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Crear */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgb(0,0,0,0.1)] w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-100">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur-md z-10">
              <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Registro Manual</h2>
              <button onClick={() => { setShowModal(false); setFormData(initialFormState); }} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-full">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleManualSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nombre *</label>
                <input required type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Apellido *</label>
                <input required type="text" name="apellido" value={formData.apellido} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de Documento *</label>
                <select required name="tipo_documento" value={formData.tipo_documento} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700">
                  <option value="">Selecciona...</option>
                  <option value="CC">Cédula de Ciudadanía</option>
                  <option value="TI">Tarjeta de Identidad</option>
                  <option value="CE">Cédula de Extranjería</option>
                  <option value="Pasaporte">Pasaporte</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Documento *</label>
                <input required type="text" name="documento" value={formData.documento} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Correo Electrónico *</label>
                <input required type="email" name="correo" value={formData.correo} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Institución *</label>
                <input required type="text" name="institucion" value={formData.institucion} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Cargo *</label>
                <input required type="text" name="cargo" value={formData.cargo} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Teléfono *</label>
                <input required type="text" name="telefono" value={formData.telefono} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Sexo *</label>
                <select required name="sexo" value={formData.sexo} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700">
                  <option value="">Selecciona...</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Ciudad *</label>
                <input required type="text" name="ciudad" value={formData.ciudad} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-2">País *</label>
                <input required type="text" name="pais" value={formData.pais} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" />
              </div>
              
              <div className="md:col-span-2 flex justify-end gap-4 mt-6 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => { setShowModal(false); setFormData(initialFormState); }} className="px-6 py-3 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-all">
                  Cancelar
                </button>
                <button type="submit" className="px-6 py-3 bg-linear-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] transform hover:-translate-y-0.5 transition-all">
                  Guardar Participante
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgb(0,0,0,0.1)] w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-100">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur-md z-10">
              <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Editar Participante</h2>
              <button onClick={() => { setShowEditModal(false); setEditingId(null); setFormData(initialFormState); }} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-full transition-all">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nombre *</label>
                <input required type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Apellido *</label>
                <input required type="text" name="apellido" value={formData.apellido} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de Documento *</label>
                <select required name="tipo_documento" value={formData.tipo_documento} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700">
                  <option value="">Selecciona...</option>
                  <option value="CC">Cédula de Ciudadanía</option>
                  <option value="TI">Tarjeta de Identidad</option>
                  <option value="CE">Cédula de Extranjería</option>
                  <option value="Pasaporte">Pasaporte</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Documento *</label>
                <input required type="text" name="documento" value={formData.documento} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Correo Electrónico *</label>
                <input required type="email" name="correo" value={formData.correo} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Institución *</label>
                <input required type="text" name="institucion" value={formData.institucion} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Cargo *</label>
                <input required type="text" name="cargo" value={formData.cargo} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Teléfono *</label>
                <input required type="text" name="telefono" value={formData.telefono} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Sexo *</label>
                <select required name="sexo" value={formData.sexo} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700">
                  <option value="">Selecciona...</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Ciudad *</label>
                <input required type="text" name="ciudad" value={formData.ciudad} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-2">País *</label>
                <input required type="text" name="pais" value={formData.pais} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" />
              </div>
              
              <div className="md:col-span-2 flex justify-end gap-4 mt-6 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => { setShowEditModal(false); setEditingId(null); setFormData(initialFormState); }} className="px-6 py-3 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-all">
                  Cancelar
                </button>
                <button type="submit" className="px-6 py-3 bg-linear-to-r from-blue-600 to-blue-500 text-white rounded-xl font-bold shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] transform hover:-translate-y-0.5 transition-all">
                  Actualizar Datos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}