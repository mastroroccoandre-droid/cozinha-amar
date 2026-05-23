# 🏠 Residencial Amar — Sistema de Gestão Nutricional

Sistema web completo para gestão nutricional de ILPI (Instituição de Longa Permanência para Idosos). Desenvolvido com **Next.js 14**, **Supabase** e **Tailwind CSS**.

---

## 📋 Funcionalidades

| Módulo | Descrição |
|---|---|
| **Dashboard** | Métricas gerais, alertas de estoque e validade, visão do cardápio |
| **Produção do Dia** | Checklist da cozinha, confirmação de refeições, registro de perdas, baixa automática de estoque |
| **Cardápio Semanal** | Grade 7 dias × 6 refeições × 5 semanas, editável em um clique |
| **Preparações** | Cadastro de receitas com ingredientes por idoso, cálculo automático do total |
| **Estoque** | Controle com alertas de mínimo e validade, entrada de mercadoria, ajustes manuais |
| **Lista de Compras** | Geração automática baseada em cardápio + estoque, aprovação, recebimento por item |
| **Relatórios** | Consumo previsto vs realizado, perdas, movimentações, custo alimentar |
| **Configurações** | Parâmetros da ILPI, usuários, fornecedores, níveis de acesso |

---

## 🚀 Configuração — Passo a Passo

### 1. Pré-requisitos

- [Node.js](https://nodejs.org) 18 ou superior
- Conta gratuita no [Supabase](https://supabase.com)
- Conta no [Vercel](https://vercel.com) (para deploy, opcional)

---

### 2. Banco de dados no Supabase

**2.1** Acesse [supabase.com](https://supabase.com) → **New project** → preencha nome e senha do banco.

**2.2** No painel do projeto, vá em **SQL Editor** → **New query**.

**2.3** Cole o conteúdo completo do arquivo `supabase/migrations/001_schema_completo.sql` e clique em **Run**.

> Isso cria todas as tabelas, enums, políticas de segurança (RLS), triggers e dados iniciais.

**2.4** Vá em **Settings → API** e copie:
- `Project URL` → será o `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → será o `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

### 3. Instalar e rodar localmente

```bash
# Clone ou extraia o projeto
cd residencial-amar

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.local.example .env.local
# Edite o .env.local com os valores do Supabase

# Rode em desenvolvimento
npm run dev
```

Acesse: **http://localhost:3000**

---

### 4. Criar o primeiro usuário

**4.1** No Supabase, vá em **Authentication → Users → Add user**.

**4.2** Preencha email e senha.

**4.3** Para definir o perfil, você pode editar diretamente na tabela `usuarios` (SQL Editor):

```sql
UPDATE usuarios
SET perfil = 'admin', nome = 'Seu Nome'
WHERE email = 'seu@email.com';
```

Perfis disponíveis: `admin` · `nutricionista` · `cozinha`

---

### 5. Deploy no Vercel

```bash
# Instale o CLI do Vercel (opcional)
npm i -g vercel

# Deploy
vercel
```

Ou conecte o repositório direto em [vercel.com](https://vercel.com) e configure as variáveis de ambiente:

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do seu projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon do Supabase |

---

## 🗄️ Estrutura do projeto

```
residencial-amar/
├── src/
│   ├── app/
│   │   ├── (app)/                  # Páginas protegidas (requerem login)
│   │   │   ├── dashboard/
│   │   │   ├── producao/
│   │   │   ├── cardapio/
│   │   │   ├── preparacoes/
│   │   │   ├── estoque/
│   │   │   ├── compras/
│   │   │   ├── relatorios/
│   │   │   └── configuracoes/
│   │   ├── login/
│   │   ├── globals.css             # Design system completo
│   │   └── layout.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   └── AppLayout.tsx       # Sidebar + topbar
│   │   └── ui/
│   │       └── index.tsx           # Modal, Badge, Alert, ProgressBar...
│   ├── lib/
│   │   ├── supabase.ts             # Client browser
│   │   ├── supabase-server.ts      # Client servidor
│   │   ├── store.ts                # Estado global (Zustand)
│   │   └── utils.ts                # Utilitários e formatação
│   ├── types/
│   │   └── index.ts                # Todos os tipos TypeScript
│   └── middleware.ts               # Proteção de rotas
├── supabase/
│   └── migrations/
│       └── 001_schema_completo.sql # Schema PostgreSQL completo
├── .env.local.example
├── next.config.js
├── tailwind.config.js
└── package.json
```

---

## 🎨 Design

- **Cores principais:** Verde `#1D9E75` · Âmbar `#BA7517` · Vermelho `#A32D2D`
- **Sidebar:** `#2C2C2A` (carvão escuro)
- **Fontes:** DM Sans (corpo) + DM Serif Display (título)
- **Responsivo:** funciona em desktop e tablet

---

## 🔐 Níveis de acesso

| Perfil | Permissões |
|---|---|
| `admin` | Acesso total: configurações, aprovação de compras, relatórios |
| `nutricionista` | Edição de cardápio, preparações e ingredientes |
| `cozinha` | Visualizar produção, confirmar refeições, registrar perdas |

---

## 🧩 Semanas do cardápio

O sistema trabalha com **5 semanas fixas** que se repetem mensalmente. A semana ativa é calculada pelo dia do mês:

| Dia do mês | Semana |
|---|---|
| 1–7 | Semana 1 |
| 8–14 | Semana 2 |
| 15–21 | Semana 3 |
| 22–28 | Semana 4 |
| 29–31 | Semana 5 |

---

## 📦 Stack técnica

| Tecnologia | Versão | Uso |
|---|---|---|
| Next.js | 14.2 | Framework React com App Router |
| Supabase | 2.39 | Banco PostgreSQL + Auth + RLS |
| Tailwind CSS | 3.4 | Estilização utilitária |
| Zustand | 4.5 | Estado global (semana ativa, config) |
| date-fns | 3.3 | Manipulação de datas em pt-BR |
| lucide-react | 0.383 | Ícones |
| react-hot-toast | 2.4 | Notificações |
| TypeScript | 5 | Tipagem estática |

---

## ❓ FAQ

**Como alterar o número de idosos?**  
Configurações → campo "Número de idosos ativos" → Salvar. Todos os cálculos são atualizados automaticamente.

**Como funciona a baixa automática de estoque?**  
Ao finalizar o dia na tela de Produção, o sistema calcula o consumo de cada refeição confirmada com base nas preparações cadastradas e deduz do estoque.

**O cardápio se repete todo mês?**  
Sim. As 5 semanas são fixas e o sistema seleciona a semana correta baseado no dia do mês.

**Como fazer backup?**  
O Supabase faz backups automáticos diários. Você pode exportar os dados em Settings → Database → Backups.

---

*Desenvolvido para o Residencial Amar · Sistema de Gestão Nutricional para ILPI*
