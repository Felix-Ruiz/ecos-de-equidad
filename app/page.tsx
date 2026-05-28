"use client";

import { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import Papa from 'papaparse';
import { Search, Upload, UserPlus, Check, X } from 'lucide-react';

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
  const [showModal, setShowModal] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    documento: '', tipo_documento: '', nombre: '', apellido: '',
    correo: '', institucion: '', cargo: '', telefono: '',
    sexo: '', ciudad: '', pais: ''
  });

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

    Papa.parse(file, {
      skipEmptyLines: true,
      complete: async (results: any) => {
        const dataRows = results.data.slice(1);
        
        const toInsert = dataRows.map((row: any[]) => ({
          documento: row[0] || '',
          tipo_documento: row[1] || '',
          nombre: row[2] || '',
          apellido: row[3] || '',
          correo: row[4] || '',
          institucion: row[5] || '',
          cargo: row[7] || '',
          telefono: row[8] || '',
          sexo: row[9] || '',
          ciudad: row[10] || '',
          pais: row[11] || '',
          asistencia: false,
          origen: 'archivo'
        }));

        const { error } = await supabase.from('participantes').insert(toInsert);
        if (error) {
          alert('Error al insertar registros');
          console.error(error);
        } else {
          alert('Archivo cargado exitosamente');
          fetchParticipantes();
        }
      }
    });
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

  const handleManualSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const newParticipant = {
      ...formData,
      asistencia: false,
      origen: 'manual'
    };

    const { error } = await supabase.from('participantes').insert([newParticipant]);
    if (error) {
      alert('Error al registrar participante');
    } else {
      setShowModal(false);
      setFormData({
        documento: '', tipo_documento: '', nombre: '', apellido: '',
        correo: '', institucion: '', cargo: '', telefono: '',
        sexo: '', ciudad: '', pais: ''
      });
      fetchParticipantes();
    }
  };

  const filteredParticipantes = participantes.filter(p => 
    Object.values(p).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Ecos de Equidad</h1>
            <p className="text-gray-500 mt-1">Gestión y control de asistencia</p>
          </div>
          
          <div className="flex gap-4 mt-4 md:mt-0">
            <input 
              type="file" 
              accept=".csv" 
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
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg transition shadow-sm font-medium"
            >
              <Upload size={18} /> Subir Archivo
            </button>
            
            <button 
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-5 py-2.5 rounded-lg transition shadow-sm font-medium"
            >
              <UserPlus size={18} /> Registro Manual
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8 p-6">
          <div className="relative w-full md:w-1/2 mb-6">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="text-gray-400" size={20} />
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre, documento, correo, institución..."
              className="pl-10 w-full border border-gray-200 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-gray-50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm uppercase tracking-wider">
                  <th className="p-4 font-semibold">Participante</th>
                  <th className="p-4 font-semibold">Documento</th>
                  <th className="p-4 font-semibold">Institución</th>
                  <th className="p-4 font-semibold">Origen</th>
                  <th className="p-4 font-semibold text-center">Asistencia</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="p-4 text-center text-gray-500">Cargando datos...</td></tr>
                ) : filteredParticipantes.length === 0 ? (
                  <tr><td colSpan={5} className="p-4 text-center text-gray-500">No se encontraron participantes.</td></tr>
                ) : (
                  filteredParticipantes.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="p-4">
                        <div className="font-medium text-gray-800">{p.nombre} {p.apellido}</div>
                        <div className="text-sm text-gray-500">{p.correo}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-gray-800">{p.documento}</div>
                        <div className="text-xs text-gray-400">{p.tipo_documento}</div>
                      </td>
                      <td className="p-4 text-gray-700">{p.institucion}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${p.origen === 'manual' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {p.origen === 'manual' ? 'Manual' : 'Archivo'}
                        </span>
                      </td>
                      <td className="p-4 text-center align-middle">
                        <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                          <input 
                            type="checkbox" 
                            name="toggle" 
                            id={`toggle-${p.id}`}
                            checked={p.asistencia}
                            onChange={() => toggleAsistencia(p.id, p.asistencia)}
                            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                          />
                          <label 
                            htmlFor={`toggle-${p.id}`} 
                            className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
                          ></label>
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

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-800">Registro Manual de Participante</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleManualSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label><input required type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label><input required type="text" name="apellido" value={formData.apellido} onChange={handleInputChange} className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Documento</label><input type="text" name="tipo_documento" value={formData.tipo_documento} onChange={handleInputChange} className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Documento</label><input required type="text" name="documento" value={formData.documento} onChange={handleInputChange} className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label><input required type="email" name="correo" value={formData.correo} onChange={handleInputChange} className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Institución</label><input type="text" name="institucion" value={formData.institucion} onChange={handleInputChange} className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label><input type="text" name="cargo" value={formData.cargo} onChange={handleInputChange} className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label><input type="text" name="telefono" value={formData.telefono} onChange={handleInputChange} className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Sexo</label><input type="text" name="sexo" value={formData.sexo} onChange={handleInputChange} className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label><input type="text" name="ciudad" value={formData.ciudad} onChange={handleInputChange} className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">País</label><input type="text" name="pais" value={formData.pais} onChange={handleInputChange} className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              
              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 transition">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Guardar Participante</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}