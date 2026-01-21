# Precos de Terras PR - Setup do Sistema de Tracking

Este guia explica como configurar o sistema de tracking para coletar dados de uso do dashboard.

## Dados Coletados

O sistema coleta **85 campos** de dados anonimos, incluindo:

- **Dados Basicos**: pagina, referrer, timestamp, session ID, returning visitor
- **Dispositivo**: tela, viewport, touch support, CPU, memoria
- **Navegador**: user agent, idioma, cookies, Do Not Track
- **Conexao**: tipo, velocidade, RTT
- **Performance**: tempo de carregamento, DNS, TCP, FCP
- **Marketing**: parametros UTM
- **Preferencias**: tema (dark/light), reduced motion

---

## Passo 1: Criar a Planilha do Google Sheets

1. Acesse [Google Sheets](https://sheets.google.com)
2. Crie uma nova planilha
3. De um nome (ex: "Precos Terras Analytics")
4. Copie o **ID da planilha** da URL:
   ```
   https://docs.google.com/spreadsheets/d/[ID_DA_PLANILHA]/edit
   ```

---

## Passo 2: Configurar o Google Apps Script

1. Acesse [Google Apps Script](https://script.google.com)
2. Clique em **"Novo projeto"**
3. De um nome ao projeto (ex: "Precos Terras Tracking")
4. Cole o conteudo do arquivo `google-apps-script-tracking.gs`
5. Na linha 28, substitua `'SEU_SPREADSHEET_ID_AQUI'` pelo ID da planilha:
   ```javascript
   const SPREADSHEET_ID = '1abc123xyz'; // Cole seu ID aqui
   ```
6. Salve (Ctrl+S)

---

## Passo 3: Executar a Configuracao Inicial

1. No Google Apps Script, selecione a funcao `setupSheet` no dropdown
2. Clique em **"Executar"**
3. Autorize o script quando solicitado:
   - Clique em "Revisar permissoes"
   - Escolha sua conta
   - Clique em "Avancado" > "Ir para [nome do projeto]"
   - Clique em "Permitir"
4. Verifique os logs: Ver > Logs
5. Volte para a planilha - voce vera a aba "Tracking Data" com os headers

---

## Passo 4: Implantar como Aplicativo Web

1. No Apps Script, clique em **"Implantar"** > **"Nova implantacao"**
2. Clique no icone de engrenagem e selecione **"Aplicativo da Web"**
3. Configure:
   - **Descricao**: "Precos Terras Tracking API"
   - **Executar como**: "Eu ([seu email])"
   - **Quem tem acesso**: "Qualquer pessoa"
4. Clique em **"Implantar"**
5. Copie a **URL do aplicativo da Web**
6. Clique em "Concluido"

---

## Passo 5: Atualizar a URL no Dashboard

1. Abra o arquivo `dashboard/index.html`
2. Na linha 19, substitua a URL:
   ```javascript
   const TRACKING_URL = 'https://script.google.com/macros/s/[SUA_URL]/exec';
   ```
3. Salve o arquivo
4. Faca commit e deploy

---

## Passo 6: Testar o Tracking

1. Abra o dashboard no navegador
2. Abra o Console (F12 > Console)
3. Mude `DEBUG = true` no index.html para ver os logs
4. Voce vera mensagens como:
   ```
   [Tracking] Inicializando rastreamento
   [Tracking] Enviando dados: {...}
   ```
5. Verifique a planilha - uma nova linha deve aparecer

---

## Funcoes Uteis do Apps Script

### `setupSheet()`
Cria ou reconfigura a planilha com todos os headers

### `getStats()`
Mostra estatisticas rapidas (total de registros, etc.)

### `createDashboardSheet()`
Cria uma aba com metricas resumidas e formulas automaticas

---

## Privacidade e LGPD

Todos os dados coletados sao:
- Anonimos (sem informacoes pessoalmente identificaveis)
- Armazenados apenas na sua conta do Google Sheets
- Usados exclusivamente para analise de uso
- Respeitam a configuracao "Do Not Track"

Campos de privacidade:
- `doNotTrack`: Indica se o usuario solicitou nao ser rastreado
- Nenhum endereco IP e coletado
- Nenhum dado pessoal e coletado

---

## Troubleshooting

### Dados nao estao sendo enviados
- Verifique se TRACKING_URL esta correto
- Abra o Console e procure erros
- Ative DEBUG = true no index.html

### Erro de permissao no Apps Script
- Reautorize o script
- Verifique se "Quem tem acesso" esta como "Qualquer pessoa"

### Colunas faltando na planilha
- Execute `setupSheet()` novamente

### Dados nao aparecem na planilha
- Verifique os logs do Apps Script: Ver > Logs
- Teste a funcao `doGet()` para verificar se funciona
