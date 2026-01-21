/**
 * Mapeamento e normalização de nomenclaturas de terras agrícolas
 *
 * Unifica metodologia antiga (até 2016) com metodologia nova (2017+)
 * baseado no Sistema de Capacidade de Uso do Solo (SBCS)
 *
 * Referências:
 * - Metodologia_atual.pdf: Sistema de capacidade de uso (Classes I-VIII)
 * - Equivalencia_SIPT25.pdf: Equivalência com SIPT (Sistema ITR)
 * - terras_metodologia.pdf: Metodologia antiga (Roxa/Mista/Arenosa + Mecanizada/etc)
 */

/**
 * Mapeamento de categorias antigas para nova
 */
export const CATEGORIA_MAP = {
  'Roxa': 'Classe de Capacidade de Uso',
  'Mista': 'Classe de Capacidade de Uso',
  'Arenosa': 'Classe de Capacidade de Uso',
  'Classe de Capacidade de Uso': 'Classe de Capacidade de Uso',
};

/**
 * Mapeamento de subcategorias antigas para novas
 * Baseado na equivalência documentada entre metodologias
 *
 * Heurística usada:
 * - Roxa (mais fértil) + Mecanizada → A-I ou A-II (aptidão boa)
 * - Mista (média) + Mecanizada → A-II ou A-III (aptidão boa/regular)
 * - Arenosa (menos fértil) + Mecanizada → A-III ou A-IV (aptidão regular/restrita)
 * - Não Mecanizável → B-VI ou B-VII (pastagem/silvicultura)
 * - Inaproveitável → C-VIII (preservação)
 */
export const SUBCATEGORIA_MAP = {
  // Roxa
  'Roxa|Mecanizada': 'A-I',
  'Roxa|Mecanizável': 'A-II',
  'Roxa|Não Mecanizável': 'B-VI',
  'Roxa|Inaproveitáveis': 'C-VIII',

  // Mista
  'Mista|Mecanizada': 'A-II',
  'Mista|Mecanizável': 'A-III',
  'Mista|Não Mecanizável': 'B-VII',
  'Mista|Inaproveitáveis': 'C-VIII',

  // Arenosa
  'Arenosa|Mecanizada': 'A-III',
  'Arenosa|Mecanizável': 'A-IV',
  'Arenosa|Não Mecanizável': 'B-VII',
  'Arenosa|Inaproveitáveis': 'C-VIII',

  // Subcategorias já no formato novo (passthrough)
  'A-I': 'A-I',
  'A-II': 'A-II',
  'A-III': 'A-III',
  'A-IV': 'A-IV',
  'B-V': 'B-V',
  'B-VI': 'B-VI',
  'B-VII': 'B-VII',
  'C-VIII': 'C-VIII',
};

/**
 * Labels descritivos baseados na nomenclatura SIPT
 * (Sistema de Imposto sobre a Propriedade Territorial Rural)
 */
export const CLASSE_LABELS = {
  'A-I': 'Lavoura - Aptidão Boa (Classe I)',
  'A-II': 'Lavoura - Aptidão Boa (Classe II)',
  'A-III': 'Lavoura - Aptidão Regular (Classe III)',
  'A-IV': 'Lavoura - Aptidão Restrita (Classe IV)',
  'B-V': 'Pastagem Plantada (Classe V)',
  'B-VI': 'Pastagem Plantada (Classe VI)',
  'B-VII': 'Silvicultura - Pastagem Natural (Classe VII)',
  'C-VIII': 'Preservação da Flora (Classe VIII)',
};

/**
 * Descrições detalhadas das classes conforme SBCS
 */
export const CLASSE_DESCRICOES = {
  'A-I': 'Terras cultiváveis, aparentemente sem problemas especiais de conservação. Grãos com altas produtividades.',
  'A-II': 'Terras cultiváveis com problemas simples de conservação. Grãos com produtividades acima da média.',
  'A-III': 'Terras cultiváveis com problemas complexos de conservação. Grãos com produtividades médias.',
  'A-IV': 'Terras cultiváveis ocasionalmente com sérios problemas de conservação. Grãos e pastagens para gado de leite.',
  'B-V': 'Terras para pastagens e/ou reflorestamento. Áreas alagáveis não sistematizadas.',
  'B-VI': 'Terras para pastagens e/ou reflorestamento com problemas simples. Pastagens para bovino de corte.',
  'B-VII': 'Terras somente para pastagens ou reflorestamento com problemas complexos. Áreas declivosas.',
  'C-VIII': 'Terras impróprias para cultura, pastagem ou reflorestamento. Proteção da fauna e flora silvestre.',
};

/**
 * Grupos de classes
 */
export const GRUPOS = {
  'A': {
    nome: 'Grupo A - Terras Cultiváveis',
    classes: ['A-I', 'A-II', 'A-III', 'A-IV'],
    cor: '#4a7a86'
  },
  'B': {
    nome: 'Grupo B - Pastagens e Reflorestamento',
    classes: ['B-V', 'B-VI', 'B-VII'],
    cor: '#85c5cf'
  },
  'C': {
    nome: 'Grupo C - Preservação',
    classes: ['C-VIII'],
    cor: '#C6AC8F'
  }
};

/**
 * Obtém o grupo de uma classe
 */
export function getGrupo(classe) {
  for (const [key, grupo] of Object.entries(GRUPOS)) {
    if (grupo.classes.includes(classe)) {
      return { key, ...grupo };
    }
  }
  return null;
}

/**
 * Normaliza uma linha de dados da metodologia antiga para a nova
 */
export function normalizarRegistro(registro) {
  const { categoria, subcategoria, ...rest } = registro;

  // Se já está no formato novo, retorna como está
  if (categoria === 'Classe de Capacidade de Uso' && subcategoria && subcategoria.match(/^[ABC]-[IV]+$/)) {
    return {
      ...rest,
      categoria: 'Classe de Capacidade de Uso',
      subcategoria,
      categoriaOriginal: categoria,
      subcategoriaOriginal: subcategoria,
    };
  }

  // Mapeia categoria antiga para nova
  const novaCategoria = CATEGORIA_MAP[categoria] || categoria;

  // Mapeia subcategoria antiga para nova
  const chave = `${categoria}|${subcategoria}`;
  const novaSubcategoria = SUBCATEGORIA_MAP[chave] || SUBCATEGORIA_MAP[subcategoria] || subcategoria;

  return {
    ...rest,
    categoria: novaCategoria,
    subcategoria: novaSubcategoria,
    categoriaOriginal: categoria,
    subcategoriaOriginal: subcategoria,
  };
}

/**
 * Normaliza um array de registros
 */
export function normalizarDados(dados) {
  if (!Array.isArray(dados)) return [];
  return dados.map(normalizarRegistro);
}

/**
 * Obtém o label formatado de uma classe
 */
export function getClasseLabel(classe, formato = 'completo') {
  if (!classe) return '';

  switch (formato) {
    case 'curto':
      return classe;
    case 'sipt':
      return CLASSE_LABELS[classe]?.split('(')[0].trim() || classe;
    case 'completo':
    default:
      return CLASSE_LABELS[classe] || classe;
  }
}

/**
 * Obtém a descrição de uma classe
 */
export function getClasseDescricao(classe) {
  return CLASSE_DESCRICOES[classe] || '';
}

/**
 * Verifica se é uma subcategoria no formato novo
 */
export function isNovoFormato(subcategoria) {
  return /^[ABC]-[IV]+$/.test(subcategoria);
}

/**
 * Verifica se é uma subcategoria no formato antigo
 */
export function isAntigoFormato(subcategoria) {
  const antigas = ['Mecanizada', 'Mecanizável', 'Não Mecanizável', 'Inaproveitáveis'];
  return antigas.includes(subcategoria);
}
