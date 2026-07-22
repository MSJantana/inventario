import { QRCode } from 'react-qrcode-logo';
import { X, Factory, Cpu, HardDrive, MapPin } from 'lucide-react';
import { isExpired, formatDate } from '../utils/validity';
import IconSystem from '../assets/Icon_System.svg';
import LogoASRS from '../assets/Logo_ASRS.svg';

type Equipamento = {
  id: string;
  nome?: string;
  nomeEquipamento?: string;
  patrimonio?: string;
  usuarioNome?: string;
  tipo?: string;
  modelo?: string;
  serial?: string;
  status?: string;
  localizacao?: string;
  fabricante?: string;
  dataAquisicao?: string;
  processador?: string;
  memoria?: string;
  observacoes?: string;
  macaddress?: string;
  escolaId?: string;
  escola?: { nome?: string; sigla?: string };
};

interface EquipmentIdCardProps {
  equipamento: Equipamento;
  onClose: () => void;
}

export default function EquipmentIdCard({ equipamento, onClose }: Readonly<EquipmentIdCardProps>) {
  const expired = isExpired(equipamento.dataAquisicao);
  const dataAquisicaoFmt = formatDate(equipamento.dataAquisicao);
  const reportPath = `/equipamentos/${encodeURIComponent(equipamento.id)}/relatorio`;
  const reportUrl = globalThis.location?.origin ? `${globalThis.location.origin}${reportPath}` : reportPath;
  
  // Dados fictícios ou reais
  const escolaNome = equipamento.escola?.nome || 'Escola não definida';
  const usuario = equipamento.usuarioNome || 'Não atribuído';
  const modelo = equipamento.modelo || 'Modelo não especificado';
  const patrimonio = equipamento.patrimonio?.trim() || '00000';
  const fabricante = equipamento.fabricante || '-';
  const processador = equipamento.processador || '-';
  const memoria = equipamento.memoria || '-';
  const statusLabel = expired ? 'VENCIDO' : (equipamento.status || 'ATIVO');
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 bg-slate-900 px-6 py-4 text-white">
          <img src={LogoASRS} alt="ASRS Logo" className="h-12 w-12 rounded-full" />
          <div>
            <h2 className="text-xl font-bold leading-tight">{escolaNome}</h2>
            <p className="text-xs font-medium tracking-wider text-gray-400 uppercase">IDENTIFICADOR DO EQUIPAMENTO • 7INVENTORY</p>
          </div>
          <button 
            onClick={onClose} 
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 hover:bg-white/20"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col md:flex-row">
          {/* Left Column */}
          <div className="flex-1 p-6 space-y-6">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">DADOS DO USUÁRIO</p>
              <h3 className="text-2xl font-bold text-slate-800">{usuario}</h3>
              <p className="text-sm text-gray-500">Usuário responsável pelo equipamento</p>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">MODELO</p>
              <h3 className="text-xl font-semibold text-slate-800">{modelo}</h3>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">PATRIMONIO</p>
              <h3 className="text-xl font-semibold text-slate-800">{patrimonio}</h3>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">AQUISIÇÃO</p>
              <h3 className="text-xl font-semibold text-slate-800">{dataAquisicaoFmt}</h3>
              <p className="text-xs text-gray-400 mt-1">Gerado por 7Inventory • Uso interno de TI</p>
            </div>

            {/* Tech Specs Card */}
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
               <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 text-blue-500"><Factory size={18} /></div>
                    <div>
                       <p className="text-xs text-gray-400">Fabricante</p>
                       <p className="font-semibold text-slate-800">{fabricante}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 text-green-500"><Cpu size={18} /></div>
                    <div>
                       <p className="text-xs text-gray-400">Processador</p>
                       <p className="font-semibold text-slate-800">{processador}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 text-orange-500"><HardDrive size={18} /></div>
                    <div>
                       <p className="text-xs text-gray-400">Memória RAM</p>
                       <p className="font-semibold text-slate-800">{memoria}</p>
                    </div>
                  </div>
               </div>
            </div>
          </div>

          {/* Right Column / Middle Card */}
          <div className="relative flex-1 p-6 bg-slate-50 md:bg-white">
             {/* Divider decorative */}
             <div className="hidden md:block absolute left-0 top-6 bottom-6 w-px bg-dashed border-l border-gray-300"></div>
             <div className="hidden md:block absolute -left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-gray-200"></div>
             <div className="hidden md:block absolute -right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-gray-200"></div>

             <div className="flex flex-col h-full justify-center">
                {/* Status & QR */}
                <div className="flex flex-col items-center gap-8">
                   <div className="flex flex-col items-center gap-3">
                      <div className="flex items-center gap-3">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">STATUS</p>
                        <span className={`inline-block rounded-full px-6 py-2 text-sm font-bold border ${expired ? 'border-red-200 bg-red-50 text-red-600' : 'border-green-200 bg-green-50 text-green-600'}`}>
                           {statusLabel}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin size={16} className="text-gray-400" />
                        <span className="text-sm font-medium">{equipamento.localizacao || 'Localização não definida'}</span>
                      </div>
                   </div>
                   
                   <div className="flex flex-col items-center gap-2">
                      <div className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
                         <QRCode
                            value={reportUrl}
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
                      <p className="text-center text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
                        Escaneie para abrir o relatório do equipamento
                      </p>
                      <p className="text-xs text-gray-400 font-mono mt-2">ID: {equipamento.id}</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
