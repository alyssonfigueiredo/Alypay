# Alypay — Cobrança automática via WhatsApp Business Cloud API

Sistema em Node.js que lê uma planilha Google Sheets, identifica devedores
com status **pendente** e **vencidos**, e envia uma mensagem de cobrança via
**WhatsApp Business Cloud API** (API oficial da Meta) usando um template
pré-aprovado. Roda em um cron diário, mas **nunca envia nada automaticamente
no primeiro disparo do dia sem aprovação manual**.

## Como funciona (visão geral do fluxo)

1. Todo dia, no horário configurado (`CRON_SCHEDULE`), o processo lê a
   planilha e gera um **preview** em `logs/previews/preview-<data>.json`
   com a lista de quem seria cobrado — **nenhuma mensagem é enviada aqui**.
2. Você roda `npm run approve` para revisar essa lista no terminal e
   confirmar digitando `CONFIRMAR`.
3. Só depois da confirmação as mensagens são enviadas, uma a uma, com
   intervalo entre envios (rate limit) e retry com backoff em caso de falha
   transitória.
4. Cada envio bem-sucedido é registrado em `logs/sent/<data>.json`. Se o
   processo for interrompido no meio e você rodar `npm run approve`
   novamente no mesmo dia, ele **não reenvia quem já recebeu** — só tenta
   de novo quem falhou.

## Requisitos

- Node.js >= 18
- Uma planilha Google Sheets com as colunas (nessa ordem, com cabeçalho na
  primeira linha): `nome | telefone | valor devido | data de vencimento | status`
  - `status` deve conter o texto `pendente` (case-insensitive) para quem
    ainda deve.
  - `data de vencimento` no formato `DD/MM/YYYY` (também aceita `YYYY-MM-DD`).
- Uma conta WhatsApp Business com acesso à Cloud API (Meta) e um número já
  verificado.
- Um template de mensagem **aprovado** no Meta Business Manager (obrigatório
  para mensagens fora da janela de 24h — ver seção abaixo).

## Instalação

```bash
npm install
cp .env.example .env
# edite o .env com suas credenciais (veja seções abaixo)
```

## 1. Configurando o Google Sheets (Service Account)

O projeto usa uma **Service Account** do Google Cloud para ler a planilha
sem precisar de login interativo — ideal para um processo automatizado.

1. No [Google Cloud Console](https://console.cloud.google.com/), crie (ou
   use) um projeto e ative a **Google Sheets API**.
2. Vá em **IAM & Admin > Service Accounts** e crie uma nova service account
   (não precisa de nenhuma role de projeto, só precisamos do e-mail dela).
3. Nessa service account, crie uma chave (**Keys > Add Key > JSON**) e baixe
   o arquivo JSON.
4. Abra o JSON e copie:
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (copie o valor
     inteiro, incluindo `-----BEGIN PRIVATE KEY-----` e `\n` literais — o
     JSON já vem com `\n` escapado, é só colar entre aspas no `.env`)
5. **Compartilhe a planilha** com o e-mail da service account
   (`client_email`) dando permissão de **Leitor** — do mesmo jeito que você
   compartilharia com outra pessoa.
6. Copie o ID da planilha da URL:
   `https://docs.google.com/spreadsheets/d/`**`<ESTE_TRECHO>`**`/edit`
   → `GOOGLE_SHEETS_SPREADSHEET_ID`
7. Ajuste `GOOGLE_SHEETS_RANGE` se sua aba tiver outro nome (ex:
   `Devedores!A:E`). O intervalo deve cobrir a linha de cabeçalho + todas as
   colunas usadas.

**Nunca comite o JSON da service account nem o `.env`** — ambos já estão no
`.gitignore`.

## 2. Configurando o WhatsApp Business Cloud API

1. No [Meta for Developers](https://developers.facebook.com/), dentro do
   seu App com o produto **WhatsApp** configurado, pegue:
   - **Temporary/System User token** → `WHATSAPP_TOKEN` (para produção, gere
     um **token de System User de longa duração** em
     Business Settings > System Users, não o token temporário de 24h)
   - **Phone Number ID** (na página do produto WhatsApp > API Setup) →
     `WHATSAPP_PHONE_NUMBER_ID`
   - **WhatsApp Business Account ID** → `WHATSAPP_BUSINESS_ACCOUNT_ID`
     (opcional, só documentado no `.env`)

### Criando o template de mensagem

Mensagens de cobrança são enviadas **fora da janela de 24h** de
atendimento, então a Cloud API **exige o uso de um template pré-aprovado** —
não é possível mandar texto livre nesse caso.

No **Meta Business Manager > WhatsApp Manager > Message Templates**, crie um
novo template:

| Campo | Valor sugerido |
|---|---|
| Nome | `cobranca_pendente` |
| Categoria | **Utility** (lembrete de cobrança/pagamento se enquadra aqui, não em Marketing) |
| Idioma | Português (BR) — `pt_BR` |
| Corpo (Body) | `Olá {{1}}, identificamos uma pendência no valor de {{2}} com vencimento em {{3}}. Para evitar transtornos, regularize o quanto antes. Em caso de dúvidas, entre em contato conosco.` |

As três variáveis do body são preenchidas pelo sistema, nessa ordem:
`{{1}}` = nome do devedor, `{{2}}` = valor formatado em R$, `{{3}}` =
data de vencimento (DD/MM/YYYY).

Depois de submeter, aguarde a aprovação da Meta (normalmente minutos a
poucas horas). Só use o template em produção depois do status **Approved**.

Se você já tem um template aprovado com nome/variáveis diferentes, ajuste
`WHATSAPP_TEMPLATE_NAME` e `WHATSAPP_TEMPLATE_LANGUAGE` no `.env`, e edite a
ordem/quantidade dos parâmetros em `src/services/whatsappService.js`
(função `buildTemplatePayload`) para bater com o seu template.

## 3. Variáveis de ambiente

Veja `.env.example` para a lista completa e comentada. As obrigatórias são
validadas na inicialização — o processo falha rápido com uma mensagem clara
se alguma estiver faltando.

## Uso

### Rodar o agendador (produção)

```bash
npm start
```

Isso inicia o processo com `node-cron`, que todo dia às `CRON_SCHEDULE`
(padrão `0 9 * * *`, timezone `CRON_TIMEZONE`) gera o preview do dia e
**para**, aguardando você rodar `npm run approve`. O processo precisa ficar
rodando continuamente (ex: com `pm2`, `systemd`, ou um serviço equivalente).

### Gerar o preview manualmente (sem esperar o cron)

```bash
npm run preview
```

Imprime no terminal a lista de quem seria cobrado hoje e salva em
`logs/previews/preview-<data>.json`. Não envia nada.

### Revisar, aprovar e disparar

```bash
npm run approve
# ou para uma data específica:
npm run approve -- 2026-07-09
```

Mostra a lista completa (nome, telefone, valor, vencimento), pede para você
digitar `CONFIRMAR`, e só então dispara as mensagens — respeitando o
intervalo configurado em `WHATSAPP_SEND_DELAY_MS` entre cada envio. Se
rodado de novo no mesmo dia, não reenvia quem já recebeu com sucesso.

## Logs

| Arquivo | Conteúdo |
|---|---|
| `logs/app.log` | Log geral (info/warn), inclui cada envio bem-sucedido |
| `logs/failures.log` | Só falhas: número inválido, linha da planilha com dado inválido, erro definitivo de envio (token expirado, template rejeitado, etc) |
| `logs/previews/preview-<data>.json` | Snapshot de quem seria cobrado naquele dia |
| `logs/approvals/<data>.json` | Marca de que o dia foi aprovado (quem/quando) |
| `logs/sent/<data>.json` | Registro de cada envio bem-sucedido, usado para não duplicar |

## Tratamento de erros e retry

- Falhas transitórias (erro de rede, timeout, HTTP 5xx, HTTP 429) são
  retentadas automaticamente com backoff exponencial
  (`WHATSAPP_RETRY_BASE_DELAY_MS * 2^tentativa`), até `WHATSAPP_MAX_RETRIES`
  vezes.
- Falhas permanentes (número inválido, template incorreto, token
  expirado/HTTP 401/403, etc — qualquer 4xx exceto 429) **não são
  retentadas** e vão direto para `logs/failures.log`.
- Linhas da planilha com telefone, data ou valor inválido são ignoradas do
  preview e logadas separadamente em `logs/failures.log`, sem travar o
  processamento das demais linhas.

## Estrutura do projeto

```
src/
  config/env.js           # carrega e valida variáveis de ambiente
  services/
    sheetsService.js       # leitura e filtro da planilha (Google Sheets API)
    whatsappService.js      # envio de template via WhatsApp Cloud API + retry
  jobs/
    collectionJob.js        # orquestra preview / aprovação / envio
  scripts/
    preview.js               # gera preview manualmente (npm run preview)
    approve.js                # revisão + confirmação + disparo (npm run approve)
  utils/
    phoneNormalizer.js        # normalização de telefone BR para E.164
    dateUtils.js               # parse de data / verificação de vencido
    money.js                    # parse e formatação de valores em R$
    logger.js                    # winston (app.log e failures.log)
    sleep.js                      # helper de delay (rate limit)
  index.js                 # entrypoint: agenda o cron
logs/                     # previews, aprovações, envios e logs (gitignored)
.env.example              # documentação das variáveis necessárias
```

## Segurança

- Nenhuma credencial fica hardcoded no código — tudo vem do `.env`, que está
  no `.gitignore`.
- Não é usada nenhuma biblioteca não-oficial de WhatsApp (sem QR code, sem
  automação de navegador) — apenas chamadas HTTP diretas à Graph API oficial
  da Meta.
- Nenhum disparo em massa acontece sem confirmação manual explícita
  (`npm run approve`, exige digitar `CONFIRMAR`).
