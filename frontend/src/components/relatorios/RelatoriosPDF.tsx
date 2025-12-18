import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import type { Equipamento, CmItem } from './types';

// Registrando uma fonte padrão (opcional, mas recomendado para acentuação)
// Font.register({
//   family: 'Roboto',
//   src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf'
// });

const styles = StyleSheet.create({
  page: {
    paddingTop: 20,
    paddingBottom: 80, // Aumentado consideravelmente para evitar sobreposição com o footer
    paddingHorizontal: 20,
    fontSize: 9,
    fontFamily: 'Helvetica',
    flexDirection: 'column',
  },
  header: {
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 50,
  },
  headerTitle: {
    flexGrow: 1,
    textAlign: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: '#666',
  },
  logo: {
    width: 100,
    height: 40,
    objectFit: 'contain',
  },
  filterSection: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  filterText: {
    fontSize: 8,
    marginBottom: 2,
    color: '#374151',
  },
  table: {
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'flex-start', // Alinha ao topo para lidar melhor com quebras de linha
    minHeight: 24,
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
    fontWeight: 'bold',
    // alignItems: 'center', // Removido para manter alinhamento à esquerda padrão
  },
  tableCell: {
    padding: 3,
    fontSize: 8,
  },
  // Larguras das colunas (total deve ser 100%)
  // Rebalanceado para acomodar Serial longo (22%) e Modelo (18%)
  colNome: { width: '14%' },
  colTipo: { width: '7%' },
  colStatus: { width: '7%' },
  colEscola: { width: '8%' },
  colUsuario: { width: '8%' },
  colModelo: { width: '18%' },
  colSerial: { width: '24%' }, // Aumentado drasticamente para comportar UUIDs
  colLoc: { width: '14%' },
  
  // Colunas CM
  colCmNome: { width: '25%' },
  colCmTipo: { width: '10%' },
  colCmStatus: { width: '10%' },
  colCmEscola: { width: '15%' },
  colCmModelo: { width: '20%' },
  colCmSerial: { width: '20%' },

  footer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#9ca3af',
    paddingTop: 10,
    backgroundColor: '#ffffff', // Garante fundo branco para o rodapé
  },
  footerText: {
    fontSize: 8,
    color: '#6b7280',
  },
  pageNumber: {
    fontSize: 8,
    color: '#6b7280',
  },
});

interface RelatoriosPDFProps {
  data: (Equipamento | CmItem)[];
  isCm: boolean;
  filters: {
    departamento: string;
    status: string;
    tipo: string;
    escola: string;
    text: string;
  };
  logoTop?: string | null;
  logoBottom?: string | null;
  escolaNome?: string;
}

export const RelatoriosPDF = ({ data, isCm, filters, logoTop, logoBottom, escolaNome }: RelatoriosPDFProps) => {
  const title = isCm ? 'Relatório Centro de Mídia' : 'Relatório de Equipamentos';
  const emissionDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        
        {/* Cabeçalho */}
        <View style={styles.header} fixed>
          <View style={{ width: 100 }} /> {/* Spacer para centralizar o título */}
          <View style={styles.headerTitle}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>Emitido em: {emissionDate}</Text>
          </View>
          <View style={{ width: 100, alignItems: 'flex-end' }}>
            {logoTop && <Image src={logoTop} style={styles.logo} />}
          </View>
        </View>

        {/* Filtros */}
        <View style={styles.filterSection}>
          <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 4 }}>Filtros aplicados:</Text>
          <Text style={styles.filterText}>Departamento: {filters.departamento}</Text>
          <Text style={styles.filterText}>Status: {filters.status}</Text>
          <Text style={styles.filterText}>Tipo: {filters.tipo}</Text>
          <Text style={styles.filterText}>Escola: {filters.escola}</Text>
          {filters.text && <Text style={styles.filterText}>Busca: {filters.text}</Text>}
        </View>

        {/* Tabela */}
        <View style={styles.table}>
          {/* Header da Tabela */}
          <View style={[styles.tableRow, styles.tableHeader]} fixed>
            {isCm ? (
              <>
                <Text style={[styles.tableCell, styles.colCmNome]}>Nome</Text>
                <Text style={[styles.tableCell, styles.colCmTipo]}>Tipo</Text>
                <Text style={[styles.tableCell, styles.colCmStatus]}>Status</Text>
                <Text style={[styles.tableCell, styles.colCmEscola]}>Escola</Text>
                <Text style={[styles.tableCell, styles.colCmModelo]}>Modelo</Text>
                <Text style={[styles.tableCell, styles.colCmSerial]}>Serial</Text>
              </>
            ) : (
              <>
                <Text style={[styles.tableCell, styles.colNome]}>Nome</Text>
                <Text style={[styles.tableCell, styles.colTipo]}>Tipo</Text>
                <Text style={[styles.tableCell, styles.colStatus]}>Status</Text>
                <Text style={[styles.tableCell, styles.colEscola]}>Escola</Text>
                <Text style={[styles.tableCell, styles.colUsuario]}>Usuário</Text>
                <Text style={[styles.tableCell, styles.colModelo]}>Modelo</Text>
                <Text style={[styles.tableCell, styles.colSerial]}>Serial</Text>
                <Text style={[styles.tableCell, styles.colLoc]}>Localização</Text>
              </>
            )}
          </View>

          {/* Linhas da Tabela */}
          {data.map((item, index) => {
            const status = (item.status || '-').replace('_', ' ');
            const escola = item.escola?.sigla || item.escola?.nome || '-';
            
            return (
              <View key={item.id} style={[styles.tableRow, { backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb' }]} wrap={false}>
                {isCm ? (
                  <>
                    <Text style={[styles.tableCell, styles.colCmNome]}>{item.nome || '-'}</Text>
                    <Text style={[styles.tableCell, styles.colCmTipo]}>{item.tipo || '-'}</Text>
                    <Text style={[styles.tableCell, styles.colCmStatus]}>{status}</Text>
                    <Text style={[styles.tableCell, styles.colCmEscola]}>{escola}</Text>
                    <Text style={[styles.tableCell, styles.colCmModelo]}>{item.modelo || '-'}</Text>
                    <Text style={[styles.tableCell, styles.colCmSerial]}>{item.serial || '-'}</Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.tableCell, styles.colNome]}>{(item as Equipamento).nome || '-'}</Text>
                    <Text style={[styles.tableCell, styles.colTipo]}>{(item as Equipamento).tipo || '-'}</Text>
                    <Text style={[styles.tableCell, styles.colStatus]}>{status}</Text>
                    <Text style={[styles.tableCell, styles.colEscola]}>{escola}</Text>
                    <Text style={[styles.tableCell, styles.colUsuario]}>{(item as Equipamento).usuarioNome || '-'}</Text>
                    <Text style={[styles.tableCell, styles.colModelo]}>{(item as Equipamento).modelo || '-'}</Text>
                    <Text style={[styles.tableCell, styles.colSerial]}>{(item as Equipamento).serial || '-'}</Text>
                    <Text style={[styles.tableCell, styles.colLoc]}>{(item as Equipamento).localizacao || '-'}</Text>
                  </>
                )}
              </View>
            );
          })}
        </View>

        {/* Totalizador */}
        <View style={{ marginTop: 5, padding: 5, borderTopWidth: 1, borderTopColor: '#000' }} wrap={false}>
            <Text style={{ fontSize: 10, fontWeight: 'bold' }}>Total de registros: {data.length}</Text>
        </View>

        {/* Rodapé */}
        <View style={styles.footer} fixed>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {logoBottom && <Image src={logoBottom} style={{ width: 80, height: 30, objectFit: 'contain', marginRight: 10 }} />}
            <Text style={styles.footerText}>Relatório gerado pelo Sistema de Inventário</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
             <Text style={styles.footerText}>{escolaNome}</Text>
          </View>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
            `Página ${pageNumber} de ${totalPages}`
          )} />
        </View>

      </Page>
    </Document>
  );
};
