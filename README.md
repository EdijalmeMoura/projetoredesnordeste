# Projeto Redes Nordeste — Plataforma imobiliária

Aplicação full-stack em português para apresentação e gestão de imóveis, com catálogo público responsivo, busca com filtros, formulários conectados a um CRM, autenticação e painel administrativo.

## Arquitetura escolhida

O repositório estava vazio (somente um README, sem serviços ou recursos de backend previamente configurados). Para entregar persistência funcional sem depender de credenciais de serviços externos, a implementação utiliza:

- **React + TypeScript + Vite** para o site e o painel.
- **Express** como API e servidor de produção.
- **SQLite** relacional via `node:sqlite` (runtime Node 22), armazenado em `data/redes-nordeste.sqlite`.
- **JWT + bcrypt** para autenticação, sessões e perfis de acesso.
- **Imagens e mídia**: o SQLite guarda metadados, legendas e ordenação; arquivos enviados ficam em `DATA_DIR/uploads` e são servidos pela rota `/uploads`. O backup inclui banco, uploads e o segredo JWT persistente.
- **Framer Motion** para animações leves e compatíveis com redução de movimento.

A aplicação usa uma única API e um único banco para o catálogo público e o Dashboard. Em hospedagens com disco efêmero, configure um volume persistente ou migre `DATA_DIR` e o diretório de uploads para serviços persistentes antes da publicação.

## Requisitos

- Node.js **22 ou superior**.
- npm 10 ou superior.

## Desenvolvimento local

```bash
npm install
npm run dev
```

A aplicação abre em `http://localhost:5173`; a API Express roda em `http://localhost:4000` e é acessada pelo front-end por URLs relativas (`/api` e `/uploads`). O banco e os arquivos são criados automaticamente no primeiro início.

### Primeiro acesso administrativo

Na primeira execução, caso não haja usuários no banco, o servidor cria um administrador. Por padrão o e-mail é `admin@redesnordeste.local` e uma senha forte **aleatória** é gerada e exibida uma única vez no log de inicialização do servidor. Em desenvolvimento, procure a mensagem no terminal/processo `api` iniciado por `npm run dev`; em produção, consulte o log de inicialização do processo do servidor. Copie a senha nesse primeiro início — ela não é armazenada em texto simples nem pode ser recuperada depois. Não existe senha fixa no código. Configure as variáveis antes do primeiro início em produção:

```bash
cp .env.example .env
# Edite ADMIN_EMAIL, ADMIN_NAME e ADMIN_PASSWORD (mínimo de 12 caracteres).
```

Defina também `JWT_SECRET` (mínimo de 32 caracteres) para produção. Se `JWT_SECRET` não for informado, a aplicação gera um segredo aleatório e o mantém em `DATA_DIR/jwt.secret`; preserve esse arquivo/volume para manter sessões válidas entre reinícios.

O endpoint de login tem limitação de tentativas. A sessão JWT expira em oito horas. A criação e alteração de usuários fica restrita ao perfil administrador.

## Dados demonstrativos

A instalação inicial inclui três imóveis **fictícios**, com fotos geradas para esta interface. Cada card e detalhe exibe a marca **Exemplo** e um aviso explícito; os registros são gravados com `is_demo = 1`. Os indicadores administrativos são calculados a partir do banco desta instalação e o painel informa a presença de conteúdo demonstrativo. Remova esses registros antes de operar com anúncios reais (ou limpe o banco de desenvolvimento e cadastre os imóveis autorizados).

## Funcionalidades implementadas

### Site público

- Página inicial com pesquisa por finalidade, tipo, cidade, bairro, faixa de preço e quartos.
- Listagem com filtros adicionais, ordenação, modo grade/lista, paginação e estado vazio.
- Página individual por slug, galeria ampliável, dados públicos protegidos, compartilhamento, favoritos locais e contato vinculado ao imóvel.
- Páginas de sobre, comprar, alugar, captação de imóveis, contato, privacidade e termos.
- Formulários de contato e captação com consentimento LGPD e persistência no banco; formulário de solicitações de privacidade com triagem no painel administrativo.
- Só são exibidos imóveis publicados, aprovados e dentro dos status comerciais permitidos; endereço residencial completo permanece privado por padrão.

### Painel administrativo (`/admin`)

- Login autenticado e perfis: administrador, gerente imobiliário, corretor e editor de anúncios.
- Visão geral baseada em consultas ao banco, atividade recente e gráficos sem métricas inventadas.
- Cadastro/edição de imóveis em sete etapas, salvamento de rascunhos, revisão/publicação, comodidades, galeria com capa/legendas/ordenação e upload limitado a imagens.
- Busca e filtros administrativos, publicação, destaque, duplicação em rascunho e arquivamento com histórico.
- CRM Kanban com persistência de etapa, notas e histórico de interações; links oficiais para conversa manual pelo WhatsApp.
- Gestão de proprietários, corretores, contas de usuário, agenda, solicitações de privacidade, configurações e conteúdo institucional/privacidade/termos, relatórios CSV e auditoria.
- Verificações de função na API, validação de entradas, hashes de senha, proteção de tentativas de login, limite/tipo de uploads e logs administrativos.

## API principal

- `GET /api/health`
- `GET /api/public/properties` e `GET /api/public/properties/:slug`
- `POST /api/public/leads`, `POST /api/public/owner-inquiries` e `POST /api/public/privacy-requests`
- `GET /api/admin/privacy-requests`, `PATCH /api/admin/privacy-requests/:id` e páginas institucionais administrativas (restritos a administrador)
- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- Rotas administrativas protegidas sob `/api/admin/*`.

A documentação de rotas e validações está no código em `server/index.js`. A API nunca retorna telefone/documentos de proprietário nem o endereço completo de imóveis à navegação pública por padrão.

## Build e execução

```bash
npm run check
npm run build
npm start
```

Em produção, o Express serve a pasta `dist`, além da API e dos arquivos enviados. Configure `PORT`, `DATA_DIR`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `JWT_SECRET` por variáveis de ambiente antes da primeira inicialização.

### Backup e restauração

Crie uma cópia consistente do banco, das imagens e do segredo persistente de sessão:

```bash
npm run backup
```

Para restaurar um snapshot, **pare o servidor primeiro** e substitua `<timestamp>` pelo nome da pasta criada em `data/backups/`:

```bash
npm run restore -- data/backups/<timestamp>
```

Agende backups em uma rotina operacional e mantenha cópias externas do diretório. O utilitário valida a integridade do banco antes de restaurar.

## Integrações ainda pendentes de configuração

- **WhatsApp Business / e-mail:** os links abrem uma conversa manual quando o número comercial é cadastrado; nenhuma mensagem é enviada automaticamente. Para automação, configure APIs oficiais, consentimentos e credenciais no ambiente.
- **Consulta de CEP e mapas:** o formulário aceita localização/coordenadas, mas não consulta serviços de terceiros nem exibe mapas sem integração configurada. URLs HTTPS de vídeo/tour podem ser cadastradas e abrem em nova aba.
- **Armazenamento de imagens:** uploads ficam no disco persistente de `DATA_DIR/uploads`. Conecte armazenamento de objetos caso a hospedagem não ofereça volume persistente.
- **Recuperação de senha:** a redefinição automatizada requer configuração de serviço transacional/e-mail; até lá, a equipe administradora pode provisionar uma nova conta e desativar a anterior.

## Verificações

```bash
npm run check
npm run build
```

Há dados de demonstração no primeiro início para permitir validar pesquisa, páginas e gráficos. Formulários públicos criam registros persistentes no banco SQLite local e aparecem no CRM/gestão correspondente.
