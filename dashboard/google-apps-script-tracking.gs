/**
 * Google Apps Script para tracking do Dashboard Precos de Terras PR
 *
 * PASSO A PASSO PARA CONFIGURACAO:
 *
 * 1. Cole TODO este codigo no Google Apps Script
 * 2. Substitua 'SEU_SPREADSHEET_ID_AQUI' pelo ID da sua planilha
 * 3. Salve o projeto (Ctrl+S)
 * 4. Execute a funcao setupSheet()
 *    - Selecione "setupSheet" no dropdown
 *    - Clique em "Executar"
 *    - Autorize o script quando solicitado
 * 5. Verifique os logs: Ver > Logs
 * 6. Implante como Web App:
 *    - Implantar > Nova implantacao
 *    - Tipo: Aplicativo da Web
 *    - Executar como: Eu
 *    - Acesso: Qualquer pessoa
 *    - Copie a URL gerada
 * 7. Atualize TRACKING_URL no index.html com a URL copiada
 */

// ============================================================================
// CONFIGURACAO
// ============================================================================

const SPREADSHEET_ID = 'SEU_SPREADSHEET_ID_AQUI'; // <- COLE SEU ID AQUI
const SHEET_NAME = 'Tracking Data';

// ============================================================================
// DEFINICAO DAS COLUNAS (85 campos)
// ============================================================================

const COLUMNS = [
  // === DADOS BASICOS (11 campos) ===
  'page',              // 1
  'referrer',          // 2
  'userAgent',         // 3
  'language',          // 4
  'screenWidth',       // 5
  'screenHeight',      // 6
  'platform',          // 7
  'timezone',          // 8
  'sessionId',         // 9
  'timestamp',         // 10
  'returningVisitor',  // 11

  // === DISPOSITIVO (7 campos) ===
  'colorDepth',        // 12
  'pixelRatio',        // 13
  'viewportWidth',     // 14
  'viewportHeight',    // 15
  'touchSupport',      // 16
  'cpuCores',          // 17
  'deviceMemory',      // 18

  // === NAVEGADOR (4 campos) ===
  'vendor',            // 19
  'cookiesEnabled',    // 20
  'doNotTrack',        // 21
  'onlineStatus',      // 22

  // === CONEXAO (3 campos) ===
  'connectionType',    // 23
  'connectionSpeed',   // 24
  'saveDataMode',      // 25

  // === URL/PAGINA (5 campos) ===
  'protocol',          // 26
  'hostname',          // 27
  'pathname',          // 28
  'queryString',       // 29
  'pageTitle',         // 30

  // === PERFORMANCE (1 campo) ===
  'loadTime',          // 31

  // === ORIENTACAO (1 campo) ===
  'screenOrientation', // 32

  // === TIMEZONE (1 campo) ===
  'timezoneOffset',    // 33

  // === PERFORMANCE DETALHADA (10 campos) ===
  'dnsLookupTime',           // 34
  'tcpConnectionTime',       // 35
  'serverResponseTime',      // 36
  'domContentLoadedTime',    // 37
  'domInteractiveTime',      // 38
  'firstPaint',              // 39
  'firstContentfulPaint',    // 40
  'transferSize',            // 41
  'encodedBodySize',         // 42
  'decodedBodySize',         // 43

  // === CONEXAO DETALHADA (2 campos) ===
  'connectionRTT',           // 44
  'connectionDownlinkMax',   // 45

  // === CAPACIDADES DO NAVEGADOR (8 campos) ===
  'languages',               // 46
  'localStorageEnabled',     // 47
  'sessionStorageEnabled',   // 48
  'indexedDBEnabled',        // 49
  'serviceWorkerEnabled',    // 50
  'webGLSupported',          // 51
  'webRTCSupported',         // 52
  'notificationPermission',  // 53

  // === PLUGINS E MIME TYPES (3 campos) ===
  'pluginsCount',            // 54
  'mimeTypesCount',          // 55
  'pdfViewerEnabled',        // 56

  // === HARDWARE ADICIONAL (3 campos) ===
  'maxTouchPoints',          // 57
  'batteryLevel',            // 58
  'batteryCharging',         // 59

  // === CONTEXTO DE NAVEGACAO (2 campos) ===
  'historyLength',           // 60
  'isIframe',                // 61

  // === MARKETING E UTM (5 campos) ===
  'utmSource',               // 62
  'utmMedium',               // 63
  'utmCampaign',             // 64
  'utmTerm',                 // 65
  'utmContent',              // 66

  // === INFORMACOES DE SESSAO (2 campos) ===
  'sessionStartTime',        // 67
  'pageViewsInSession',      // 68

  // === DISPOSITIVO MOVEL E TIPO (3 campos) ===
  'isMobile',                // 69
  'isTablet',                // 70
  'isDesktop',               // 71

  // === SEGURANCA E PRIVACIDADE (2 campos) ===
  'secureContext',           // 72
  'crossOriginIsolated',     // 73

  // === RENDERIZACAO (2 campos) ===
  'canvasSupported',         // 74
  'svgSupported',            // 75

  // === ARMAZENAMENTO (3 campos) ===
  'storageQuota',            // 76
  'storageUsage',            // 77
  'storageUsagePercent',     // 78

  // === TAMANHO DISPONIVEL DA TELA (2 campos) ===
  'availScreenWidth',        // 79
  'availScreenHeight',       // 80

  // === MODO DE EXIBICAO (1 campo) ===
  'displayMode',             // 81

  // === PREFERENCIAS DO USUARIO (4 campos) ===
  'prefersColorScheme',      // 82
  'prefersReducedMotion',    // 83
  'prefersReducedTransparency', // 84
  'prefersContrast'          // 85
];

// ============================================================================
// FUNCOES PRINCIPAIS
// ============================================================================

/**
 * Recebe requisicoes POST do tracking
 */
function doPost(e) {
  try {
    Logger.log('Requisicao recebida');
    const data = JSON.parse(e.postData.contents);
    Logger.log('Dados recebidos: ' + JSON.stringify(data).substring(0, 500) + '...');

    saveToSheet(data);

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Dados salvos com sucesso'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Erro: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Teste do endpoint (GET)
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: 'Precos de Terras PR Tracking API funcionando',
    version: '1.0',
    totalFields: COLUMNS.length,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Salva dados na planilha
 */
function saveToSheet(data) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    Logger.log('Planilha nao existe. Criando automaticamente...');
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]);

    const headerRange = sheet.getRange(1, 1, 1, COLUMNS.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4a7a86');
    headerRange.setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);

    Logger.log('Planilha criada com ' + COLUMNS.length + ' colunas');
  }

  const rowData = COLUMNS.map(column => {
    const value = data[column];
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (typeof value === 'object') return JSON.stringify(value);
    return value;
  });

  if (rowData.length !== COLUMNS.length) {
    Logger.log('ERRO: Valores (' + rowData.length + ') != Colunas (' + COLUMNS.length + ')');
  }

  const nextRow = sheet.getLastRow() + 1;
  sheet.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);

  Logger.log('Dados salvos na linha ' + nextRow + ' (' + rowData.length + ' colunas)');
}

// ============================================================================
// FUNCAO DE CONFIGURACAO INICIAL
// ============================================================================

/**
 * EXECUTE ESTA FUNCAO PRIMEIRO!
 * Cria a planilha com todos os headers corretos
 */
function setupSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  // Deletar aba se ja existe
  if (sheet) {
    Logger.log('Aba "' + SHEET_NAME + '" ja existe. Deletando para recriar...');
    spreadsheet.deleteSheet(sheet);
  }

  // Criar nova aba
  sheet = spreadsheet.insertSheet(SHEET_NAME);
  Logger.log('Aba criada: ' + SHEET_NAME);
  Logger.log('Total de colunas: ' + COLUMNS.length);

  // Adicionar headers
  Logger.log('Adicionando headers...');
  sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]);

  // Verificar
  const lastColumn = sheet.getLastColumn();
  Logger.log('Colunas criadas: ' + lastColumn);

  // Formatar
  const headerRange = sheet.getRange(1, 1, 1, COLUMNS.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4a7a86');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setWrap(false);
  headerRange.setVerticalAlignment('middle');
  sheet.setFrozenRows(1);

  // Ajustar larguras
  if (COLUMNS.length <= 20) {
    sheet.autoResizeColumns(1, COLUMNS.length);
  } else {
    sheet.autoResizeColumns(1, 20);
    for (let i = 21; i <= COLUMNS.length; i++) {
      sheet.setColumnWidth(i, 120);
    }
  }

  // Relatorio final
  Logger.log('\n=== CONFIGURACAO CONCLUIDA ===');
  Logger.log('Planilha: ' + SHEET_NAME);
  Logger.log('Colunas esperadas: ' + COLUMNS.length);
  Logger.log('Colunas criadas: ' + lastColumn);

  if (lastColumn === COLUMNS.length) {
    Logger.log('SUCESSO! Todas as colunas foram criadas!');
  } else {
    Logger.log('ATENCAO: Numero de colunas nao coincide!');
  }

  Logger.log('\nPrimeiras 5: ' + COLUMNS.slice(0, 5).join(', '));
  Logger.log('Ultimas 5: ' + COLUMNS.slice(-5).join(', '));
}

// ============================================================================
// FUNCOES DE DIAGNOSTICO
// ============================================================================

/**
 * Mostra estatisticas da planilha
 */
function getStats() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    Logger.log('Planilha nao encontrada. Execute setupSheet() primeiro.');
    return;
  }

  const totalRows = sheet.getLastRow() - 1;
  const totalColumns = sheet.getLastColumn();

  Logger.log('\n=== ESTATISTICAS ===');
  Logger.log('Total de registros: ' + totalRows);
  Logger.log('Total de colunas: ' + totalColumns);
  Logger.log('Colunas esperadas: ' + COLUMNS.length);

  if (totalRows > 0) {
    const firstRow = sheet.getRange(2, 1, 1, totalColumns).getValues()[0];
    const lastRow = sheet.getRange(sheet.getLastRow(), 1, 1, totalColumns).getValues()[0];

    Logger.log('Primeira pagina: ' + firstRow[0]);
    Logger.log('Ultima pagina: ' + lastRow[0]);
    Logger.log('Ultimo timestamp: ' + lastRow[9]);
  }
}

/**
 * Mapa completo de colunas
 */
function getColumnMap() {
  Logger.log('\n=== MAPA DE COLUNAS ===\n');

  COLUMNS.forEach((col, index) => {
    const colNumber = index + 1;
    const colLetter = getColumnLetter(colNumber);
    Logger.log(colNumber + '. [' + colLetter + '] ' + col);
  });

  Logger.log('\nTotal: ' + COLUMNS.length + ' colunas');
}

/**
 * Converte numero para letra (1->A, 27->AA)
 */
function getColumnLetter(columnNumber) {
  let temp, letter = '';
  while (columnNumber > 0) {
    temp = (columnNumber - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    columnNumber = (columnNumber - temp - 1) / 26;
  }
  return letter;
}

// ============================================================================
// DASHBOARD AUTOMATICO
// ============================================================================

/**
 * Cria aba Dashboard com metricas automaticas
 */
function createDashboardSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let dashboardSheet = spreadsheet.getSheetByName('Dashboard');

  if (!dashboardSheet) {
    dashboardSheet = spreadsheet.insertSheet('Dashboard');
  } else {
    dashboardSheet.clear();
  }

  dashboardSheet.getRange('A1').setValue('Precos de Terras PR - Dashboard de Analytics');
  dashboardSheet.getRange('A1').setFontSize(16).setFontWeight('bold');

  const ds = SHEET_NAME;
  let row = 3;

  dashboardSheet.getRange(row, 1).setValue('Total de Visitantes Unicos (Sessoes)');
  dashboardSheet.getRange(row, 2).setFormula(`=COUNTA(UNIQUE('${ds}'!I:I))-1`);
  row++;

  dashboardSheet.getRange(row, 1).setValue('Total de Page Views');
  dashboardSheet.getRange(row, 2).setFormula(`=COUNTA('${ds}'!A:A)-1`);
  row++;

  dashboardSheet.getRange(row, 1).setValue('Novos vs Returning Visitors');
  row++;
  dashboardSheet.getRange(row, 1).setValue('  - Novos Visitantes');
  dashboardSheet.getRange(row, 2).setFormula(`=COUNTIF('${ds}'!K:K,FALSE)`);
  row++;
  dashboardSheet.getRange(row, 1).setValue('  - Returning Visitors');
  dashboardSheet.getRange(row, 2).setFormula(`=COUNTIF('${ds}'!K:K,TRUE)`);
  row++;
  dashboardSheet.getRange(row, 1).setValue('  - Taxa de Retorno (%)');
  dashboardSheet.getRange(row, 2).setFormula(`=IF(COUNTA('${ds}'!K:K)-1>0,COUNTIF('${ds}'!K:K,TRUE)/(COUNTA('${ds}'!K:K)-1)*100,0)`);
  row += 2;

  dashboardSheet.getRange(row, 1).setValue('Dispositivos');
  row++;
  dashboardSheet.getRange(row, 1).setValue('  - Desktop');
  dashboardSheet.getRange(row, 2).setFormula(`=COUNTIF('${ds}'!BS:BS,TRUE)`);
  row++;
  dashboardSheet.getRange(row, 1).setValue('  - Mobile');
  dashboardSheet.getRange(row, 2).setFormula(`=COUNTIF('${ds}'!BQ:BQ,TRUE)`);
  row++;
  dashboardSheet.getRange(row, 1).setValue('  - Tablet');
  dashboardSheet.getRange(row, 2).setFormula(`=COUNTIF('${ds}'!BR:BR,TRUE)`);
  row += 2;

  dashboardSheet.getRange(row, 1).setValue('Tema');
  row++;
  dashboardSheet.getRange(row, 1).setValue('  - Dark Mode');
  dashboardSheet.getRange(row, 2).setFormula(`=COUNTIF('${ds}'!CD:CD,"dark")`);
  row++;
  dashboardSheet.getRange(row, 1).setValue('  - Light Mode');
  dashboardSheet.getRange(row, 2).setFormula(`=COUNTIF('${ds}'!CD:CD,"light")`);
  row += 2;

  dashboardSheet.getRange(row, 1).setValue('Tempo Medio de Carregamento (ms)');
  dashboardSheet.getRange(row, 2).setFormula(`=AVERAGE('${ds}'!AE:AE)`);
  row++;

  dashboardSheet.getRange(row, 1).setValue('Tempo Medio First Contentful Paint (ms)');
  dashboardSheet.getRange(row, 2).setFormula(`=AVERAGE('${ds}'!AN:AN)`);

  dashboardSheet.autoResizeColumns(1, 2);

  Logger.log('Dashboard criado com sucesso!');
}
