"use client";

import { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import * as XLSX from 'xlsx';
import { Search, Upload, UserPlus, X, Edit2, Trash2, Download } from 'lucide-react';

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
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  
  // Estados para Modales
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialFormState = {
    documento: '', tipo_documento: '', nombre: '', apellido: '',
    correo: '', institucion: '', cargo: '', telefono: '',
    sexo: '', ciudad: '', pais: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchParticipantes();
  }, []);

  const fetchParticipantes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('participantes')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) {
      console.error("Error al cargar datos:", error);
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

      // Filtramos filas que tengan al menos algún dato, ya no exigimos que el documento (row[0]) exista
      const dataRows = data.slice(1).filter(row => row.some(cell => cell !== undefined && String(cell).trim() !== ''));
      
      let tempIdCounter = 1;

      const toInsert = dataRows.map((row: any[]) => {
        let doc = String(row[0] || '').trim();
        
        // Asignar ID temporal si no tiene documento
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
        alert('Error al insertar registros. Verifica los permisos RLS en Supabase.');
        console.error(error);
      } else {
        alert('Archivo cargado exitosamente');
        fetchParticipantes();
      }
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const toggleAsistencia = async (id: string, currentState: boolean) => {
    const newState = !currentState;
    
    setParticipantes((prev: Participante[]) => 
      prev.map(p => p.id === id ? { ...p, asistencia: newState } : p)
    );

    const { error } = await supabase
      .from('participantes')
      .update({ asistencia: newState })
      .eq('id', id);

    if (error) {
      console.error("Error actualizando asistencia:", error);
      setParticipantes((prev: Participante[]) => 
        prev.map(p => p.id === id ? { ...p, asistencia: currentState } : p)
      );
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ---- NUEVAS FUNCIONES: CREAR, EDITAR, ELIMINAR, EXPORTAR ----

  const handleManualSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const newParticipant = {
      ...formData,
      asistencia: false,
      origen: 'manual'
    };

    const { error } = await supabase.from('participantes').insert([newParticipant]);
    if (error) {
      alert('Error al registrar participante. Verifica los permisos RLS.');
    } else {
      setShowModal(false);
      setFormData(initialFormState);
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

    const { error } = await supabase
      .from('participantes')
      .update(formData)
      .eq('id', editingId);

    if (error) {
      alert('Error al actualizar participante.');
    } else {
      setShowEditModal(false);
      setEditingId(null);
      setFormData(initialFormState);
      fetchParticipantes();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar a este participante? Esta acción no se puede deshacer.')) return;
    
    const { error } = await supabase.from('participantes').delete().eq('id', id);
    if (error) {
      alert('Error al eliminar participante.');
    } else {
      fetchParticipantes();
    }
  };

  const handleExport = () => {
    if (participantes.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }

    const dataToExport = participantes.map(p => ({
      'Documento': p.documento,
      'Tipo Documento': p.tipo_documento,
      'Nombres': p.nombre,
      'Apellidos': p.apellido,
      'Correo': p.correo,
      'Institución': p.institucion,
      'Cargo': p.cargo,
      'Teléfono': p.telefono,
      'Sexo': p.sexo,
      'Ciudad': p.ciudad,
      'País': p.pais,
      'Origen': p.origen === 'manual' ? 'Manual' : 'Archivo',
      'Asistió': p.asistencia ? 'SÍ' : 'NO'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Participantes");
    XLSX.writeFile(workbook, "Ecos_de_Equidad_Asistencia.xlsx");
  };

  // -------------------------------------------------------------

  const filteredParticipantes = participantes.filter(p => 
    Object.values(p).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="min-h-screen p-6 md:p-12 font-sans relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
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
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
            />
            <button 
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.click();
                }
              }}
              className="flex items-center gap-2 bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(59,130,246,0.4)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)] font-semibold transform hover:-translate-y-0.5"
            >
              <Upload size={20} /> Subir Excel
            </button>
            
            <button 
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-linear-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(30,41,59,0.3)] hover:shadow-[0_0_25px_rgba(30,41,59,0.5)] font-semibold transform hover:-translate-y-0.5"
            >
              <UserPlus size={20} /> Registro Manual
            </button>

            <button 
              onClick={handleExport}
              className="flex items-center gap-2 bg-linear-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] font-semibold transform hover:-translate-y-0.5"
            >
              <Download size={20} /> Exportar Datos
            </button>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 overflow-hidden mb-8 p-8">
          <div className="relative w-full md:w-1/2 mb-8">
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

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-widest font-bold">
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
                  <tr><td colSpan={6} className="p-8 text-center text-indigo-400 font-medium animate-pulse">Sincronizando base de datos...</td></tr>
                ) : filteredParticipantes.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-medium">No hay participantes en el radar.</td></tr>
                ) : (
                  filteredParticipantes.map((p) => (
                    <tr key={p.id} className="border-b border-slate-50 hover:bg-indigo-50/40 transition-colors duration-200">
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
                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide ${p.origen === 'manual' ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-200' : 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'}`}>
                          {p.origen === 'manual' ? 'MANUAL' : 'ARCHIVO'}
                        </span>
                      </td>
                      <td className="p-5 text-center align-middle">
                        <div className="relative inline-block w-14 mr-2 align-middle select-none">
                          <input 
                            type="checkbox" 
                            name="toggle" 
                            id={`toggle-${p.id}`}
                            checked={p.asistencia}
                            onChange={() => toggleAsistencia(p.id, p.asistencia)}
                            className="toggle-checkbox absolute block w-7 h-7 rounded-full bg-white border-4 appearance-none cursor-pointer shadow-sm"
                          />
                          <label 
                            htmlFor={`toggle-${p.id}`} 
                            className="toggle-label block overflow-hidden h-7 rounded-full cursor-pointer shadow-inner"
                          ></label>
                        </div>
                      </td>
                      <td className="p-5 text-center align-middle">
                        <div className="flex justify-center gap-3">
                          <button 
                            onClick={() => openEditModal(p)}
                            className="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors"
                            title="Editar Participante"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(p.id)}
                            className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors"
                            title="Eliminar Participante"
                          >
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

      {/* Modal para Crear Participante */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgb(0,0,0,0.1)] w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-100">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur-md z-10">
              <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Registro Manual</h2>
              <button onClick={() => { setShowModal(false); setFormData(initialFormState); }} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-full transition-all">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleManualSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className="block text-sm font-bold text-slate-700 mb-2">Nombre</label><input required type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">Apellido</label><input required type="text" name="apellido" value={formData.apellido} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">Tipo de Documento</label><input type="text" name="tipo_documento" value={formData.tipo_documento} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">Documento</label><input required type="text" name="documento" value={formData.documento} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">Correo Electrónico</label><input required type="email" name="correo" value={formData.correo} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">Institución</label><input type="text" name="institucion" value={formData.institucion} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">Cargo</label><input type="text" name="cargo" value={formData.cargo} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">Teléfono</label><input type="text" name="telefono" value={formData.telefono} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">Sexo</label><input type="text" name="sexo" value={formData.sexo} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">Ciudad</label><input type="text" name="ciudad" value={formData.ciudad} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" /></div>
              <div className="md:col-span-2"><label className="block text-sm font-bold text-slate-700 mb-2">País</label><input type="text" name="pais" value={formData.pais} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" /></div>
              
              <div className="md:col-span-2 flex justify-end gap-4 mt-6 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => { setShowModal(false); setFormData(initialFormState); }} className="px-6 py-3 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-all">Cancelar</button>
                <button type="submit" className="px-6 py-3 bg-linear-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] transform hover:-translate-y-0.5">Guardar Participante</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Editar Participante */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgb(0,0,0,0.1)] w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-100">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur-md z-10">
              <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Editar Participante</h2>
              <button onClick={() => { setShowEditModal(false); setEditingId(null); setFormData(initialFormState); }} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-full transition-all">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className="block text-sm font-bold text-slate-700 mb-2">Nombre</label><input required type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">Apellido</label><input required type="text" name="apellido" value={formData.apellido} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">Tipo de Documento</label><input type="text" name="tipo_documento" value={formData.tipo_documento} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">Documento</label><input required type="text" name="documento" value={formData.documento} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">Correo Electrónico</label><input required type="email" name="correo" value={formData.correo} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">Institución</label><input type="text" name="institucion" value={formData.institucion} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">Cargo</label><input type="text" name="cargo" value={formData.cargo} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">Teléfono</label><input type="text" name="telefono" value={formData.telefono} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">Sexo</label><input type="text" name="sexo" value={formData.sexo} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">Ciudad</label><input type="text" name="ciudad" value={formData.ciudad} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" /></div>
              <div className="md:col-span-2"><label className="block text-sm font-bold text-slate-700 mb-2">País</label><input type="text" name="pais" value={formData.pais} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700" /></div>
              
              <div className="md:col-span-2 flex justify-end gap-4 mt-6 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => { setShowEditModal(false); setEditingId(null); setFormData(initialFormState); }} className="px-6 py-3 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-all">Cancelar</button>
                <button type="submit" className="px-6 py-3 bg-linear-to-r from-blue-600 to-blue-500 text-white rounded-xl font-bold hover:from-blue-700 hover:to-blue-600 transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] transform hover:-translate-y-0.5">Actualizar Datos</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}