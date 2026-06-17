// Serviço de API para comunicação com o backend
const servicoApi = {
  // Obtém o status do sistema (se tem usuários e código admin configurado)
  async status() {
    const resposta = await fetch('/api/auth/status');
    const tipoConteudo = (resposta.headers.get('content-type') || '').toLowerCase();
    if (!tipoConteudo.includes('application/json')) throw new Error('Falha ao obter status');
    const dados = await resposta.json();
    if (!resposta.ok) {
      const erro = new Error(dados.error || 'Falha ao obter status');
      erro.status = resposta.status;
      throw erro;
    }
    return dados;
  },
  // Realiza o login do usuário
  async entrar(nome_usuario, senha) {
    const resposta = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: nome_usuario, password: senha }),
    });
    const tipoConteudo = (resposta.headers.get('content-type') || '').toLowerCase();
    if (!tipoConteudo.includes('application/json')) throw new Error('Falha no login');
    const dados = await resposta.json();
    if (!resposta.ok) {
      const erro = new Error(dados.error || 'Falha no login');
      erro.status = resposta.status;
      throw erro;
    }
    return dados;
  },
  // Verifica se o código de administrador é válido
  async verificarCodigoAdmin(codigo_admin) {
    const resposta = await fetch('/api/auth/admin-code/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_code: codigo_admin }),
    });
    const tipoConteudo = (resposta.headers.get('content-type') || '').toLowerCase();
    if (!tipoConteudo.includes('application/json')) throw new Error('Falha ao validar código');
    const dados = await resposta.json();
    if (!resposta.ok) {
      const erro = new Error(dados.error || 'Falha ao validar código');
      erro.status = resposta.status;
      throw erro;
    }
    return dados;
  },
  // Inicializa o sistema (primeiro usuário)
  async bootstrap(codigo_admin, nome_usuario, senha) {
    const resposta = await fetch('/api/auth/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_code: codigo_admin, username: nome_usuario, password: senha }),
    });
    const tipoConteudo = (resposta.headers.get('content-type') || '').toLowerCase();
    if (!tipoConteudo.includes('application/json')) throw new Error('Falha ao inicializar');
    const dados = await resposta.json();
    if (!resposta.ok) {
      const erro = new Error(dados.error || 'Falha ao inicializar');
      erro.status = resposta.status;
      throw erro;
    }
    return dados;
  },
  // Cria um novo usuário
  async criarUsuario(codigo_admin, nome_usuario, senha, papel) {
    const resposta = await fetch('/api/auth/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_code: codigo_admin, username: nome_usuario, password: senha, role: papel }),
    });
    const tipoConteudo = (resposta.headers.get('content-type') || '').toLowerCase();
    if (!tipoConteudo.includes('application/json')) throw new Error('Falha ao criar usuário');
    const dados = await resposta.json();
    if (!resposta.ok) {
      const erro = new Error(dados.error || 'Falha ao criar usuário');
      erro.status = resposta.status;
      throw erro;
    }
    return dados;
  }
};

// Vincula todos os eventos da página de login
function vincularPaginaLogin() {
  // Obtém referências aos elementos da página
  const formularioLogin = document.getElementById('formulario-login');
  const estadoLogin = document.getElementById('estado-login');
  const botaoEsqueciSenha = document.getElementById('botao-esqueci-senha');
  const botaoDesligar = document.getElementById('botao-desligar');
  const painelCriarUsuario = document.getElementById('painel-criar-usuario');
  const formularioCriarUsuario = document.getElementById('formulario-criar-usuario');
  const estadoCriarUsuario = document.getElementById('estado-criar-usuario');
  const modalEsqueciSenha = document.getElementById('modal-esqueci-senha');
  const fecharEsqueciSenhaBtn = document.getElementById('fechar-esqueci-senha');
  const cancelarEsqueciSenhaBtn = document.getElementById('cancelar-esqueci-senha');
  const formularioCodigoAdmin = document.getElementById('formulario-codigo-admin');
  const estadoEsqueciSenha = document.getElementById('estado-esqueci-senha');

  // Variáveis de estado
  let codigoAdminAtual = '';
  let modoBootstrap = false;

  // Evento de envio do formulário de login
  formularioLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    estadoLogin.textContent = '';
    const dados = Object.fromEntries(new FormData(formularioLogin).entries());
    const usuario = String((dados.usuario || '')).trim().toLowerCase();
    const senha = String(dados.senha || '').trim();
    try {
      const resp = await servicoApi.entrar(usuario, senha);
      localStorage.setItem('estaLogado', '1');
      if (resp.is_rh) localStorage.setItem('eRh', '1');
      else localStorage.removeItem('eRh');
      location.href = resp.redirect || '/index.html';
    } catch (erro) {
      estadoLogin.textContent = erro.message;
    }
  });

  // Funções para abrir e fechar o modal de esqueci senha
  function abrirEsqueciSenha() { modalEsqueciSenha.classList.remove('oculto'); }
  function fecharEsqueciSenha() { 
    modalEsqueciSenha.classList.add('oculto'); 
    painelCriarUsuario.classList.remove('visible'); 
    estadoEsqueciSenha.textContent = '';
    estadoCriarUsuario.textContent = '';
    codigoAdminAtual = '';
    modoBootstrap = false;
  }
  
  // Vincula eventos dos botões do modal
  botaoEsqueciSenha.addEventListener('click', () => { abrirEsqueciSenha(); });
  fecharEsqueciSenhaBtn.addEventListener('click', () => { fecharEsqueciSenha(); });
  cancelarEsqueciSenhaBtn.addEventListener('click', () => { fecharEsqueciSenha(); });
  
  // Evento de envio do formulário de código admin
  formularioCodigoAdmin.addEventListener('submit', async (e) => {
    e.preventDefault();
    estadoEsqueciSenha.textContent = '';
    const dados = Object.fromEntries(new FormData(formularioCodigoAdmin).entries());
    const codigo = String(dados.codigo_admin || '');
    try {
      await servicoApi.verificarCodigoAdmin(codigo);
      codigoAdminAtual = codigo;
      modoBootstrap = false;
      painelCriarUsuario.classList.add('visible');
    } catch (erro) {
      if (erro.status === 428) {
        // Código ainda não configurado - modo bootstrap
        codigoAdminAtual = codigo;
        modoBootstrap = true;
        painelCriarUsuario.classList.add('visible');
        estadoEsqueciSenha.textContent = 'Código ainda não configurado. Crie o primeiro usuário para inicializar.';
      } else {
        estadoEsqueciSenha.textContent = erro.message;
      }
    }
  });

  // Evento de envio do formulário de criar usuário
  formularioCriarUsuario.addEventListener('submit', async (e) => {
    e.preventDefault();
    estadoCriarUsuario.textContent = '';
    const dados = Object.fromEntries(new FormData(formularioCriarUsuario).entries());
    const novoUsuario = String((dados.novo_usuario || '').trim()).toLowerCase();
    const novaSenha = String(dados.nova_senha || '');
    const papel = String(dados.papel || 'portaria').trim().toLowerCase();
    try {
      if (!codigoAdminAtual) {
        estadoCriarUsuario.textContent = 'Informe o código de administrador';
        return;
      }
      if (modoBootstrap) {
        await servicoApi.bootstrap(codigoAdminAtual, novoUsuario, novaSenha);
        estadoCriarUsuario.textContent = 'Sistema inicializado';
      } else {
        await servicoApi.criarUsuario(codigoAdminAtual, novoUsuario, novaSenha, papel);
        estadoCriarUsuario.textContent = 'Usuário criado';
      }
      formularioCriarUsuario.reset();
    } catch (erro) {
      estadoCriarUsuario.textContent = erro.message;
    }
  });

  // Evento do botão desligar
  botaoDesligar.addEventListener('click', () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    window.open('', '_self');
    window.close();
    setTimeout(() => { location.href = 'about:blank'; }, 200);
  });
}

// Inicializa a página quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', vincularPaginaLogin);
} else {
  vincularPaginaLogin();
}
