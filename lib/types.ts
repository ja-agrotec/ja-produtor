// Tipos do dominio JA Agrotec - Modulo Produtor
// Espelham as tabelas Supabase do projeto ja-prodcoop (gohoqgctcqltorfeohom).
// Atencao: mistura snake_case PT (criado_em/atualizado_em) e EN (created_at/updated_at)
// porque a base foi criada em fases. Mantenha o nome real da coluna em cada tabela.

export type Role = "admin" | "gerente" | "operador" | "visualizador";
export type StatusSafra = "planejamento" | "aberta" | "encerrada" | "cancelada";
export type TipoLancamento = "despesa" | "receita";
export type StatusLancamento = "rascunho" | "confirmado" | "cancelado";
export type StatusMaquina = "ativo" | "manutencao" | "inativo";
export type TipoCertificacao = "organico" | "globalgap" | "rainforest";
export type TipoContratoVenda =
  | "disponivel" | "forward" | "troca" | "fixacao" | "cbot" | "exportacao";
export type StatusVenda = "aberto" | "parcialmente_entregue" | "entregue" | "cancelado";
export type TipoManutencao = "preventiva" | "corretiva" | "revisao";
export type StatusChecklistItem = "pendente" | "ok" | "nao_conforme" | "nao_aplicavel";
export type Periodicidade = "mensal" | "bimestral" | "trimestral" | "semestral" | "anual";

export interface Fazenda {
  id: string;
  nome: string;
  cidade?: string | null;
  estado?: string | null;
  area_total_ha?: number | null;
  proprietario?: string | null;
  cnpj_cpf?: string | null;
  telefone?: string | null;
  email?: string | null;
  observacoes?: string | null;
  certificada?: boolean | null;
  tipo_certificacao?: TipoCertificacao | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Usuario {
  id: string;
  auth_id?: string | null;
  nome: string;
  email: string;
  role: Role;
  fazenda_id?: string | null;
  telefone?: string | null;
  cargo?: string | null;
  ativo: boolean;
  ultimo_acesso?: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface Talhao {
  id: string;
  fazenda_id: string;
  nome: string;
  area_ha?: number | null;
  cultura_atual?: string | null;
  solo?: string | null;
  irrigado?: boolean | null;
  coordenadas?: string | null;
  observacoes?: string | null;
  segue_certificacao?: boolean | null;
  producao_sc?: number | null;
  safra_id?: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Safra {
  id: string;
  fazenda_id: string;
  nome: string;
  cultura: string;
  ano_agricola?: string | null;
  data_plantio?: string | null;
  data_colheita?: string | null;
  area_ha?: number | null;
  producao_sc?: number | null;
  produtividade_sc_ha?: number | null;
  custo_total?: number | null;
  receita_total?: number | null;
  status: StatusSafra;
  observacoes?: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface Categoria {
  id: string;
  nome: string;
  tipo: TipoLancamento;
  cor?: string | null;
  icone?: string | null;
  ativo: boolean;
  criado_em: string;
}

export interface Insumo {
  id: string;
  nome: string;
  categoria?: string | null;
  unidade: string;
  principio_ativo?: string | null;
  fabricante?: string | null;
  registro_mapa?: string | null;
  estoque_atual?: number | null;
  estoque_minimo?: number | null;
  preco_unitario?: number | null;
  fazenda_id?: string | null;
  certificacao_permitida?: boolean | null;
  tipo?: string | null;
  modo_aplicacao?: string | null;
  culturas?: string[] | null;
  dose_recomendada?: string | null;
  periodo_aplicacao?: string | null;
  intervalo_seguranca?: number | null;
  formulacao?: string | null;
  classe_toxicologica?: string | null;
  observacoes?: string | null;
  global?: boolean | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Maquina {
  id: string;
  fazenda_id?: string | null;
  nome: string;
  tipo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  ano?: number | null;
  placa?: string | null;
  numero_serie?: string | null;
  horimetro_atual?: number | null;
  km_atual?: number | null;
  proxima_manutencao_h?: number | null;
  status: StatusMaquina;
  observacoes?: string | null;
  valor_aquisicao?: number | null;
  ano_aquisicao?: number | null;
  vida_util_anos?: number | null;
  valor_residual?: number | null;
  custo_hora?: number | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Operador {
  id: string;
  fazenda_id?: string | null;
  nome: string;
  cpf?: string | null;
  telefone?: string | null;
  cnh?: string | null;
  categoria_cnh?: string | null;
  funcao?: string | null;
  salario?: number | null;
  data_admissao?: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Lancamento {
  id: string;
  fazenda_id: string;
  safra_id?: string | null;
  talhao_id?: string | null;
  categoria_id: string;
  maquina_id?: string | null;
  operador_id?: string | null;
  usuario_id?: string | null;
  tipo: TipoLancamento;
  data_lancamento: string;
  descricao?: string | null;
  insumo_id?: string | null;
  quantidade?: number | null;
  unidade?: string | null;
  custo_unitario?: number | null;
  custo_total?: number | null;
  nota_fiscal?: string | null;
  comprovante_url?: string | null;
  observacoes?: string | null;
  status: StatusLancamento;
  offline_id?: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface Manutencao {
  id: string;
  maquina_id: string;
  tipo: TipoManutencao;
  data: string;
  horimetro?: number | null;
  km?: number | null;
  descricao: string;
  custo?: number | null;
  oficina?: string | null;
  proximo_h?: number | null;
  proximo_km?: number | null;
  criado_em: string;
}

export interface VendaGraos {
  id: string;
  fazenda_id: string;
  safra_id?: string | null;
  cultura?: string | null;
  tipo_contrato: TipoContratoVenda;
  quantidade_sc: number;
  preco_saca?: number | null;
  moeda?: string | null;
  cotacao_dolar?: number | null;
  data_contrato?: string | null;
  data_entrega?: string | null;
  comprador?: string | null;
  numero_contrato?: string | null;
  status: StatusVenda;
  qualidade_registro_id?: string | null;
  checklist_exportacao?: any | null;
  observacoes?: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface EntregaGraos {
  id: string;
  venda_id: string;
  fazenda_id?: string | null;
  talhao_id?: string | null;
  data_entrega?: string | null;
  quantidade_sc: number;
  preco_saca?: number | null;
  peso_bruto_kg?: number | null;
  umidade_pct?: number | null;
  impureza_pct?: number | null;
  nota_fiscal?: string | null;
  transportadora?: string | null;
  observacoes?: string | null;
  criado_em: string;
}

// Sem talhao_id, sem responsavel, sem atualizado_em (banco nao tem).
// Workaround: armazenar talhao_id e responsavel dentro de dados_qualidade
// como _talhao_id e _responsavel.
export interface QualidadeRegistro {
  id: string;
  fazenda_id: string;
  safra_id?: string | null;
  cultura: string;
  data_registro: string;
  dados_qualidade: any;
  observacoes?: string | null;
  criado_em: string;
}

export interface LancamentoOffline {
  id: string;
  usuario_id?: string | null;
  payload: any;
  status: "pendente" | "sincronizado" | "erro";
  tentativas?: number | null;
  erro_msg?: string | null;
  criado_em: string;
  sincronizado_em?: string | null;
}

// documentos usa created_at/updated_at (snake_case ingles)
export interface Documento {
  id: string;
  created_at: string;
  updated_at: string;
  nome_arquivo: string;
  url_arquivo?: string | null;
  tamanho_bytes?: number | null;
  mime_type?: string | null;
  tipo_documento: string;
  descricao?: string | null;
  destaque?: boolean | null;
  versao?: number | null;
  modulo_origem?: string | null;
  entidade_id?: string | null;
  entidade_descricao?: string | null;
  usuario_id?: string | null;
  fazenda_id?: string | null;
  safra_id?: string | null;
  venda_id?: string | null;
}

// analise_solo usa created_at/updated_at (snake_case ingles) e tem schema rico
export interface AnaliseSolo {
  id: string;
  fazenda_id: string;
  talhao_id?: string | null;
  data_coleta: string;
  laboratorio?: string | null;
  numero_amostra?: string | null;
  profundidade?: string | null;
  cultura_referencia?: string | null;
  resultados: any;
  recomendacoes?: string | null;
  status?: string | null;
  observacoes?: string | null;
  created_at: string;
  updated_at: string;
}

// certificacao_checklists: 1 row POR ITEM (nao por checklist).
// Cada item de cada tipo de certificacao em uma fazenda eh uma linha.
export interface CertificacaoChecklistItem {
  id: string;
  fazenda_id: string;
  tipo_certificacao: TipoCertificacao;
  item_id: string;
  status: StatusChecklistItem;
  observacao?: string | null;
  auditado_em?: string | null;
  auditado_por?: string | null;
  created_at: string;
  updated_at: string;
}

// despesas_fixas usa valor_mensal e descricao (nao valor/observacoes)
export interface DespesaFixa {
  id: string;
  fazenda_id?: string | null;
  nome: string;
  categoria?: string | null;
  valor_mensal: number;
  periodicidade: Periodicidade;
  data_inicio?: string | null;
  data_fim?: string | null;
  descricao?: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}
