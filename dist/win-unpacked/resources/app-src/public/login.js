const servicoApi = {
  async entrar(nome_usuario, senha) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: nome_usuario, password: senha }),
    });
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!ct.includes('application/json')) throw new Error('Falha no login');
    const dados = await res.json();
    if (!res.ok) throw new Error(dados.error || 'Falha no login');
    return dados;
  },
  async criarUsuario(codigo_admin, nome_usuario, senha) {
    const res = await fetch('/api/auth/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_code: codigo_admin, username: nome_usuario, password: senha }),
    });
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!ct.includes('application/json')) throw new Error('Falha ao criar usuário');
    const dados = await res.json();
    if (!res.ok) throw new Error(dados.error || 'Falha ao criar usuário');
    return dados;
  }
};

function vincularPaginaLogin() {
  const formularioLogin = document.getElementById('login-form');
  const estadoLogin = document.getElementById('login-status');
  const botaoEsqueciSenha = document.getElementById('forgot-btn');
  const botaoDesligar = document.getElementById('power-close');
  const painelCriarUsuario = document.getElementById('create-user');
  const formularioCriarUsuario = document.getElementById('create-user-form');
  const estadoCriarUsuario = document.getElementById('create-status');
  const modalEsqueciSenha = document.getElementById('forgot-modal');
  const fecharEsqueciSenhaBtn = document.getElementById('forgot-close');
  const cancelarEsqueciSenhaBtn = document.getElementById('forgot-cancel');
  const formularioCodigoAdmin = document.getElementById('admin-code-form');
  const estadoEsqueciSenha = document.getElementById('forgot-status');

  formularioLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    estadoLogin.textContent = '';
    const dados = Object.fromEntries(new FormData(formularioLogin).entries());
    const usuario = String((dados.usuario || '')).trim().toLowerCase();
    const senha = String(dados.senha || '').trim();
    const ehUsuarioRh = usuario === 'rh';
    const ehSenhaRh = senha.toLowerCase() === 'rhatb26';
    try {
      if (ehUsuarioRh && ehSenhaRh) {
        localStorage.setItem('estaLogado', '1');
        localStorage.setItem('eRh', '1');
        location.href = '/dashboard.html';
        return;
      }
      await servicoApi.entrar(usuario, senha);
      localStorage.setItem('estaLogado', '1');
      localStorage.removeItem('eRh');
      location.href = '/index.html';
    } catch (err) {
      if (usuario === 'admin' && senha === '23689498') {
        localStorage.setItem('estaLogado', '1');
        localStorage.removeItem('eRh');
        location.href = '/index.html';
      } else {
        estadoLogin.textContent = err.message;
      }
    }
  });

  function abrirEsqueciSenha() { modalEsqueciSenha.classList.remove('oculto'); }
  function fecharEsqueciSenha() { modalEsqueciSenha.classList.add('oculto'); painelCriarUsuario.classList.remove('visible'); estadoEsqueciSenha.textContent = ''; }
  
  botaoEsqueciSenha.addEventListener('click', () => { abrirEsqueciSenha(); });
  fecharEsqueciSenhaBtn.addEventListener('click', () => { fecharEsqueciSenha(); });
  cancelarEsqueciSenhaBtn.addEventListener('click', () => { fecharEsqueciSenha(); });
  
  formularioCodigoAdmin.addEventListener('submit', (e) => {
    e.preventDefault();
    estadoEsqueciSenha.textContent = '';
    const dados = Object.fromEntries(new FormData(formularioCodigoAdmin).entries());
    const codigo = String(dados.admin_code || '');
    if (codigo === 'R00t$#@!26') {
      painelCriarUsuario.classList.add('visible');
    } else {
      estadoEsqueciSenha.textContent = 'Código inválido';
    }
  });

  formularioCriarUsuario.addEventListener('submit', async (e) => {
    e.preventDefault();
    estadoCriarUsuario.textContent = '';
    const dados = Object.fromEntries(new FormData(formularioCriarUsuario).entries());
    const novoUsuario = String((dados.novo_usuario || '').trim()).toLowerCase();
    const novaSenha = String(dados.nova_senha || '');
    try {
      await servicoApi.criarUsuario('R00t$#@!26', novoUsuario, novaSenha);
      estadoCriarUsuario.textContent = 'Usuário criado';
      formularioCriarUsuario.reset();
    } catch (err) {
      estadoCriarUsuario.textContent = err.message;
    }
  });

  botaoDesligar.addEventListener('click', () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    window.open('', '_self');
    window.close();
    setTimeout(() => { location.href = 'about:blank'; }, 200);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', vincularPaginaLogin);
} else {
  vincularPaginaLogin();
}
