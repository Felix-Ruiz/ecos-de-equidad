"use client";

import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { ScanLine } from 'lucide-react';

export default function VistaQR() {
  const [registroUrl, setRegistroUrl] = useState('');

  useEffect(() => {
    // Genera automáticamente la URL basándose en el dominio actual
    setRegistroUrl(`${window.location.origin}/registro`);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Luces de fondo deslumbrantes */}
      <div className="absolute top-[-20%] left-[-10%] w-600px h-600px bg-indigo-600 rounded-full mix-blend-screen filter blur-[150px] opacity-40 animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-600px h-600px bg-fuchsia-600 rounded-full mix-blend-screen filter blur-[150px] opacity-40 animate-pulse"></div>

      <div className="relative z-10 text-center max-w-2xl w-full">
        <h1 className="text-5xl md:text-7xl font-extrabold bg-clip-text text-transparent bg-linear-to-r from-blue-400 via-indigo-400 to-purple-400 tracking-tight mb-4 drop-shadow-lg">
          Ecos de Equidad
        </h1>
        <p className="text-slate-300 text-xl md:text-2xl font-medium mb-12">
          Escanea el código para registrar tu asistencia
        </p>

        <div className="bg-white p-8 md:p-12 rounded-[3rem] shadow-[0_0_60px_rgba(99,102,241,0.4)] inline-block relative border-8 border-white/10 bg-clip-padding">
          <div className="absolute -top-6 -right-6 bg-linear-to-br from-indigo-500 to-purple-600 text-white p-4 rounded-full shadow-xl">
            <ScanLine size={32} />
          </div>
          
          {registroUrl ? (
            <QRCode 
              value={registroUrl} 
              size={350}
              level="H"
              className="w-full h-auto max-w-350px"
            />
          ) : (
            <div className="w-350px h-350px bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center">
              <span className="text-slate-400 font-bold">Generando QR...</span>
            </div>
          )}
        </div>

        <div className="mt-12 inline-block bg-white/10 backdrop-blur-md border border-white/20 px-8 py-4 rounded-full">
          <p className="text-slate-200 font-mono text-lg tracking-wider">
            {registroUrl.replace(/^https?:\/\//, '')}
          </p>
        </div>
      </div>
    </div>
  );
}