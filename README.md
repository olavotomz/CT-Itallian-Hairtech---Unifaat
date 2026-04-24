# CT Itallian Hairtech - Sistema de Controle de Acesso

Um sistema desktop de controle de entrada e saída de pessoas, desenvolvido para a Itallian Hairtech Unifaat, que gerencia registros de funcionários, visitantes e seus veículos.

## 📋 Problematica Resolvida

A empresa enfrentava dificuldades em:

- **Rastreabilidade de acesso**: Sem registro automatizado de quem entra e sai da empresa
- **Gerenciamento de visitantes**: Impossível controlar fluxo de visitantes e seus dados
- **Informações de veículos**: Falta de registro de placas e dados de veículos para segurança
- **Relatórios manuais**: Necessidade de gerar planilhas manualmente para auditoria
- **Falta de informação em tempo real**: Impossibilidade de saber quantas pessoas estão presentes

**Solução**: Sistema automatizado que registra entrada/saída, gera relatórios em Excel e fornece painel em tempo real.

## 🛠️ Tecnologias Utilizadas

### Backend
- **Electron** - Framework para criar aplicações desktop multiplataforma
- **Express.js** - Servidor web e gerenciamento de rotas API
- **SQLite 3** (better-sqlite3) - Banco de dados leve e integrado
- **ExcelJS** - Geração de relatórios em Excel
- **DayJS** - Manipulação e formatação de datas
- **CORS** - Controle de compartilhamento de recursos entre origens
- **Crypto** - Criptografia de senhas com hash SHA256

### Frontend
- **HTML5** - Estrutura das páginas
- **CSS3** - Estilização responsiva
- **JavaScript (Vanilla)** - Interatividade e manipulação do DOM
- **Fetch API** - Comunicação com o backend

## 📦 Funcionalidades Principais

### 👥 Gestão de Pessoas
- Cadastro de funcionários e visitantes
- Registro de dados pessoais (nome, CPF, contato)
- Informações de veículos (marca, modelo, cor, placa)
- Departamento de atuação

### 📊 Registros de Acesso
- Registro automático de entrada e saída
- Busca por data/período
- Visualização em tempo real de presentes e ausentes
- Filtros avançados por período

### 📈 Relatórios
- Exportação de dados para Excel
- Relatórios personalizados por período
- Painel RH com estatísticas
- Contagem de presentes e ausentes

### 🔐 Segurança
- Sistema de autenticação com usuário e senha
- Código de administrador para recuperação de acesso
- Criação de novos usuários através de código administrativo
- Hash SHA256 com salt para senhas

### 🎨 Interface
- Tela de login
- Dashboard principal para operadores
- Painel RH com visualizações avançadas
- Interface responsiva e amigável em português

## 🚀 Como Usar

1. **Instalar dependências**:
   ```bash
   npm install
   ```

2. **Executar a aplicação**:
   ```bash
   npm start
   ```

3. **Credenciais padrão**:
   - Usuário RH: `rh` / Senha: `rhatb26`
   - Usuário Admin: `admin` / Senha: `23689498`
   - Código administrativo para reset: `R00t$#@!26`

## 📁 Estrutura do Projeto

```
CT-Itallian-Hairtech-Unifaat/
├── dist/win-unpacked/resources/app-src/
│   ├── main.js                 # Entrada da aplicação Electron
│   ├── package.json            # Dependências do projeto
│   ├── public/                 # Arquivos estáticos (HTML, CSS, JS)
│   │   ├── login.html          # Tela de login
│   │   ├── index.html          # Dashboard principal
│   │   ├── dashboard.html      # Painel RH
│   │   ├── styles.css          # Estilização global
│   │   ├── login.js            # Lógica de autenticação
│   │   ├── app.js              # Lógica principal
│   │   └── dashboard.js        # Lógica do painel RH
│   ├── src/                    # Backend
│   │   ├── server.js           # Servidor Express
│   │   ├── db.js               # Operações com banco de dados
│   │   ├── config.js           # Configurações
│   │   └── excel.js            # Geração de relatórios
│   └── resources/data/
│       └── data.db             # Banco de dados SQLite
```

## 💻 Requisitos do Sistema

- Windows 10 ou superior
- Node.js 16+ (para desenvolvimento)
- 100MB de espaço em disco

## 👥 Autor

Desenvolvido por **Guilherme Tomaz** para **Itallian Hairtech - Unifaat**

## 📝 Licença

ISC
