import { QRCode } from 'react-qrcode-logo';
import { X } from 'lucide-react';
import IconSystem from '../assets/Icon_System.svg';
import LogoASRS from '../assets/Logo_ASRS.svg';

type Item = {
  id: string;
  nome?: string;
  tipo?: string;
  modelo?: string;
  serial?: string;
  status?: string;
  escola?: { nome?: string };
};

interface CentroMidiaIdCardProps {
  item: Item;
  onClose: () => void;
}

export default function CentroMidiaIdCard({ item, onClose }: Readonly<CentroMidiaIdCardProps>) {
  const nome = item.nome || 'Item sem nome';
  const tipo = item.tipo || '-';
  const modelo = item.modelo || '-';
  const serial = item.serial || '-';
  const escolaNome = item.escola?.nome || 'Escola não definida';
  const statusLabel = item.status || 'DISPONIVEL';
  const isAvailable = statusLabel === 'DISPONIVEL';
  const statusClass = isAvailable ? 'border-green-200 bg-green-50 text-green-600' : 'border-slate-200 bg-slate-50 text-slate-700';

  const qrData = JSON.stringify({
    id: item.id,
    nome,
    tipo,
    modelo,
    serial,
    escola: escolaNome,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center gap-4 bg-slate-900 px-6 py-4 text-white">
          <img src={LogoASRS} alt="ASRS Logo" className="h-12 w-12 rounded-full" />
          <div>
            <h2 className="text-xl font-bold leading-tight">{escolaNome}</h2>
            <p className="text-xs font-medium tracking-wider text-gray-400 uppercase">IDENTIFICADOR DO ITEM • CENTRO DE MÍDIA</p>
          </div>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 hover:bg-white/20"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row">
          <div className="flex-1 p-6 space-y-5">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">DADOS DO ITEM</p>
              <h3 className="text-2xl font-bold text-slate-800">{nome}</h3>
              <p className="text-sm text-gray-500">Item do Centro de Mídia</p>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">TIPO</p>
              <h3 className="text-sm font-semibold text-slate-800">{tipo}</h3>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">MODELO</p>
              <h3 className="text-sm font-semibold text-slate-800">{modelo}</h3>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">SERIAL</p>
              <h3 className="text-sm font-semibold text-slate-800">{serial}</h3>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">IDENTIFICADOR</p>
              <p className="text-sm font-mono text-slate-800 break-all">{item.id}</p>
            </div>
          </div>

          <div className="relative flex-1 p-6 bg-slate-50 md:bg-white">
            <div className="hidden md:block absolute left-0 top-6 bottom-6 w-px bg-dashed border-l border-gray-300"></div>
            <div className="hidden md:block absolute -left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-gray-200"></div>
            <div className="hidden md:block absolute -right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-gray-200"></div>

            <div className="flex flex-col h-full justify-center">
              <div className="flex flex-col items-center gap-8">
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">STATUS</p>
                  <span className={`inline-block rounded-full px-6 py-2 text-sm font-bold border ${statusClass}`}>
                    {statusLabel}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <div className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
                    <QRCode
                      value={qrData}
                      size={200}
                      logoImage={IconSystem}
                      logoWidth={50}
                      logoHeight={50}
                      logoOpacity={1}
                      eyeRadius={[
                        { outer: 10, inner: 4 },
                        { outer: 10, inner: 4 },
                        { outer: 10, inner: 4 },
                      ]}
                      qrStyle="dots"
                      fgColor="#1e293b"
                      bgColor="#FFFFFF"
                      ecLevel="H"
                      removeQrCodeBehindLogo={true}
                      logoPadding={5}
                      logoPaddingStyle="square"
                    />
                  </div>
                  <p className="text-xs text-gray-400 font-mono mt-2">ID: {item.id}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

