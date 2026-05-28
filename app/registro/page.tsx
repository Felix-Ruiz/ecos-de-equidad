"use client";

import { useState, ChangeEvent, FormEvent } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { CheckCircle2, UserPlus, Sparkles } from 'lucide-react';

export default function RegistroPublico() {
  const initialFormState = {
    documento: '', tipo_documento: '', nombre: '', apellido: '',
    correo: '', institucion: '', cargo: '', telefono: '',
    sexo: '', ciudad: '', pais: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const newParticipant = {
      ...formData,
      asistencia: false,
      origen: 'manual'
    };

    const { error } = await supabase.from('participantes').insert([newParticipant]);
    
    if (error) {
      alert('Hubo un error al registrarte. Por favor intenta de nuevo.');
      console.error(error);
      setIsSubmitting(false);
    } else {
      setIsSuccess(true);
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-6">
        <div className="bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-[0_20px_50px_rgb(0,0,0,0.1)] max-w-md w-full text-center border border-white">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-400 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <CheckCircle2 size={80} className="text-emerald-500 relative z-10" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-800 mb-4 tracking-tight">¡Registro Exitoso!</h2>
          <p className="text-slate-600 font-medium mb-8">Tu información ha sido guardada correctamente en el sistema de Ecos de Equidad.</p>
          <button 
            onClick={() => { setIsSuccess(false); setFormData(initialFormState); }}
            className="w-full py-4 bg-linear-to-r from-indigo-600 to-blue-500 text-white rounded-2xl font-bold shadow-[0_0_20px_rgba(79,70,229,0.3)]"
          >
            Registrar a otra persona
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 py-10 px-4 sm:px-6 relative overflow-hidden">
      {/* Elementos decorativos de fondo para móvil */}
      <div className="absolute top-[-10%] left-[-20%] w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-40"></div>
      <div className="absolute bottom-[-10%] right-[-20%] w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-40"></div>

      <div className="max-w-2xl mx-auto relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-white/60 rounded-full mb-4 shadow-sm border border-white">
            <Sparkles className="text-indigo-600" size={32} />
          </div>
          <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-linear-to-r from-blue-700 to-indigo-600 tracking-tight">
            Ecos de Equidad
          </h1>
          <p className="text-indigo-900/60 mt-3 font-medium text-lg">Registro de Participantes</p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_20px_50px_rgb(0,0,0,0.05)] border border-white/80 overflow-hidden">
          <div className="p-6 md:p-10">
            <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100">
              <UserPlus className="text-indigo-500" size={24} />
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Ingresa tus datos</h2>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className="block text-sm font-bold text-slate-700 mb-2">Nombre *</label><input required type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} className="w-full bg-white border border-slate-200 rounded-xl p-4 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700 shadow-sm" placeholder="Ej. Juan" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">Apellido *</label><input required type="text" name="apellido" value={formData.apellido} onChange={handleInputChange} className="w-full bg-white border border-slate-200 rounded-xl p-4 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700 shadow-sm" placeholder="Ej. Pérez" /></div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de Documento *</label>
                <select required name="tipo_documento" value={formData.tipo_documento} onChange={handleInputChange} className="w-full bg-white border border-slate-200 rounded-xl p-4 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700 shadow-sm appearance-none">
                  <option value="">Selecciona...</option>
                  <option value="CC">Cédula de Ciudadanía</option>
                  <option value="TI">Tarjeta de Identidad</option>
                  <option value="CE">Cédula de Extranjería</option>
                  <option value="Pasaporte">Pasaporte</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">Número de Documento *</label><input required type="text" name="documento" value={formData.documento} onChange={handleInputChange} className="w-full bg-white border border-slate-200 rounded-xl p-4 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700 shadow-sm" placeholder="Ej. 1023456789" /></div>
              
              <div className="md:col-span-2"><label className="block text-sm font-bold text-slate-700 mb-2">Correo Electrónico *</label><input required type="email" name="correo" value={formData.correo} onChange={handleInputChange} className="w-full bg-white border border-slate-200 rounded-xl p-4 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700 shadow-sm" placeholder="ejemplo@correo.com" /></div>
              
              <div><label className="block text-sm font-bold text-slate-700 mb-2">Institución *</label><input required type="text" name="institucion" value={formData.institucion} onChange={handleInputChange} className="w-full bg-white border border-slate-200 rounded-xl p-4 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700 shadow-sm" placeholder="Empresa o Universidad" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">Cargo *</label><input required type="text" name="cargo" value={formData.cargo} onChange={handleInputChange} className="w-full bg-white border border-slate-200 rounded-xl p-4 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700 shadow-sm" placeholder="Ej. Ingeniero" /></div>
              
              <div><label className="block text-sm font-bold text-slate-700 mb-2">Teléfono *</label><input required type="tel" name="telefono" value={formData.telefono} onChange={handleInputChange} className="w-full bg-white border border-slate-200 rounded-xl p-4 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700 shadow-sm" placeholder="+57 300 000 0000" /></div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Sexo *</label>
                <select required name="sexo" value={formData.sexo} onChange={handleInputChange} className="w-full bg-white border border-slate-200 rounded-xl p-4 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700 shadow-sm appearance-none">
                  <option value="">Selecciona...</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              
              <div><label className="block text-sm font-bold text-slate-700 mb-2">Ciudad *</label><input required type="text" name="ciudad" value={formData.ciudad} onChange={handleInputChange} className="w-full bg-white border border-slate-200 rounded-xl p-4 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700 shadow-sm" placeholder="Ej. Bogotá" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">País *</label><input required type="text" name="pais" value={formData.pais} onChange={handleInputChange} className="w-full bg-white border border-slate-200 rounded-xl p-4 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700 shadow-sm" placeholder="Ej. Colombia" /></div>
              
              <div className="md:col-span-2 mt-6">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full py-4 bg-linear-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-extrabold text-lg transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] transform hover:-translate-y-1 disabled:opacity-70 disabled:transform-none"
                >
                  {isSubmitting ? 'Guardando...' : 'Completar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}