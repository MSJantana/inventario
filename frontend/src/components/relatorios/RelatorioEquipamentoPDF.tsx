import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

type Escola = {
  nome?: string
  sigla?: string
}

type Movimentacao = {
  id: string
  tipoMovimento?: string
  dataMovimento?: string
  observacoes?: string
  origem?: string
  destino?: string
  responsavel?: string
}

type EquipamentoRelatorioPdf = {
  id: string
  nome?: string
  nomeEquipamento?: string
  patrimonio?: string
  usuarioNome?: string
  status?: string
  modelo?: string
  serial?: string
  dataAquisicao?: string
  localizacao?: string
  escola?: Escola
  movimentacoes?: Movimentacao[]
}

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  header: {
    marginBottom: 18,
    padding: 18,
    borderRadius: 12,
    backgroundColor: '#0f172a',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logo: {
    width: 72,
    height: 28,
    objectFit: 'contain',
  },
  headerKicker: {
    fontSize: 9,
    color: '#94a3b8',
    letterSpacing: 1.2,
  },
  headerTitle: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerMeta: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    fontSize: 8,
    fontWeight: 'bold',
    backgroundColor: '#1e293b',
    color: '#e2e8f0',
  },
  section: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    width: '31%',
    minHeight: 70,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  label: {
    fontSize: 8,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  value: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  timelineItem: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timelineTipo: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  timelineDate: {
    fontSize: 9,
    color: '#64748b',
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  timelineCell: {
    width: '48%',
  },
  footer: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
  },
  footerText: {
    fontSize: 8,
    color: '#64748b',
  },
})

function formatDate(value?: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('pt-BR')
}

function formatDateTime(value?: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('pt-BR')
}

function getEquipmentName(equipamento: EquipamentoRelatorioPdf): string {
  return equipamento.nome || equipamento.nomeEquipamento || 'Equipamento não identificado'
}

function getPatrimonio(patrimonio?: string): string {
  return patrimonio?.trim() || '00000'
}

interface RelatorioEquipamentoPDFProps {
  equipamento: EquipamentoRelatorioPdf
  historico: Movimentacao[]
  logoTop?: string | null
  logoBottom?: string | null
}

export function RelatorioEquipamentoPDF({
  equipamento,
  historico,
  logoTop,
  logoBottom,
}: Readonly<RelatorioEquipamentoPDFProps>) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerKicker}>RELATÓRIO DO EQUIPAMENTO</Text>
            {logoTop ? <Image src={logoTop} style={styles.logo} /> : <View />}
          </View>

          <Text style={styles.headerTitle}>{getEquipmentName(equipamento)}</Text>

          <View style={styles.headerMeta}>
            <Text style={styles.badge}>ID {equipamento.id}</Text>
            <Text style={styles.badge}>{(equipamento.status || 'SEM STATUS').replaceAll('_', ' ')}</Text>
            <Text style={styles.badge}>{equipamento.escola?.nome || 'Escola não definida'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cadastro</Text>
          <View style={styles.grid}>
            <View style={styles.card}>
              <Text style={styles.label}>Modelo</Text>
              <Text style={styles.value}>{equipamento.modelo || 'Não informado'}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.label}>Número de série</Text>
              <Text style={styles.value}>{equipamento.serial || 'Não informado'}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.label}>Número do patrimônio</Text>
              <Text style={styles.value}>{getPatrimonio(equipamento.patrimonio)}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.label}>Data de aquisição</Text>
              <Text style={styles.value}>{formatDate(equipamento.dataAquisicao)}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.label}>Setor</Text>
              <Text style={styles.value}>{equipamento.localizacao || 'Não informado'}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.label}>Usuário</Text>
              <Text style={styles.value}>{equipamento.usuarioNome || 'Não atribuído'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Histórico do equipamento</Text>
          {historico.length === 0 ? (
            <Text style={styles.footerText}>Nenhuma movimentação registrada.</Text>
          ) : (
            historico.map((item) => (
              <View key={item.id} style={styles.timelineItem}>
                <View style={styles.timelineHeader}>
                  <Text style={styles.timelineTipo}>{(item.tipoMovimento || 'SEM TIPO').replaceAll('_', ' ')}</Text>
                  <Text style={styles.timelineDate}>{formatDateTime(item.dataMovimento)}</Text>
                </View>
                <View style={styles.timelineRow}>
                  <View style={styles.timelineCell}>
                    <Text style={styles.label}>Origem</Text>
                    <Text style={styles.value}>{item.origem || 'Não informada'}</Text>
                  </View>
                  <View style={styles.timelineCell}>
                    <Text style={styles.label}>Destino</Text>
                    <Text style={styles.value}>{item.destino || 'Não informado'}</Text>
                  </View>
                </View>
                <View style={styles.timelineRow}>
                  <View style={styles.timelineCell}>
                    <Text style={styles.label}>Responsável</Text>
                    <Text style={styles.value}>{item.responsavel || 'Não informado'}</Text>
                  </View>
                </View>
                <Text style={styles.label}>Descrição</Text>
                <Text>{item.observacoes || 'Sem observações registradas.'}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.footer} fixed>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {logoBottom ? <Image src={logoBottom} style={{ width: 72, height: 24, objectFit: 'contain', marginRight: 8 }} /> : <View />}
            <Text style={styles.footerText}>Sistema de Inventário • Relatório do equipamento</Text>
          </View>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
            fixed
          />
        </View>
      </Page>
    </Document>
  )
}
