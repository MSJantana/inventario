export type Equipamento = {
  id: string
  nome: string
  usuarioNome?: string
  tipo: string
  modelo: string
  serial: string
  status: string
  localizacao?: string
  fabricante?: string
  dataAquisicao: string
  processador?: string
  memoria?: string
  observacoes?: string
  macaddress?: string
  escola?: { nome: string; sigla?: string }
}

export type CmItem = {
  id: string
  nome?: string
  tipo?: string
  modelo?: string
  serial?: string
  status?: string
  escola?: { nome?: string; sigla?: string }
}
