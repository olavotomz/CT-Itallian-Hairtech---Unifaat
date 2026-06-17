// Serviço de API para comunicação com o backend
const servicoApi = {
  async cadastrarPessoa(dados) {
    const resposta = await fetch('/api/people', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    if (!resposta.ok) throw new Error((await resposta.json()).error || 'Erro ao cadastrar');
    return resposta.json();
  },
  async listarPessoas(busca = '') {
    const resposta = await fetch(`/api/people?q=${encodeURIComponent(busca)}`);
    return resposta.json();
  },
  async obterPessoa(id) {
    const resposta = await fetch(`/api/people/${id}`);
    return resposta.json();
  },
  async atualizarPessoa(id, dados) {
    const resposta = await fetch(`/api/people/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    if (!resposta.ok) throw new Error((await resposta.json()).error || 'Erro ao atualizar');
    return resposta.json();
  },
  async removerPessoa(id) {
    const resposta = await fetch(`/api/people/${id}`, { method: 'DELETE' });
    if (!resposta.ok) throw new Error('Erro ao remover');
  },
  async marcarEntrada(id) {
    const resposta = await fetch(`/api/access/${id}/entry`, { method: 'POST' });
    if (!resposta.ok) throw new Error((await resposta.json()).error || 'Erro ao marcar entrada');
    return resposta.json();
  },
  async marcarSaida(id) {
    const resposta = await fetch(`/api/access/${id}/exit`, { method: 'POST' });
    if (!resposta.ok) throw new Error((await resposta.json()).error || 'Erro ao marcar saída');
    return resposta.json();
  },
  async listarRegistros() {
    const resposta = await fetch('/api/access/logs');
    return resposta.json();
  },
  async obterRaizExcel() {
    const resposta = await fetch('/api/config/excel-root');
    return resposta.json();
  },
  async definirRaizExcel(caminho) {
    const resposta = await fetch('/api/config/excel-root', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ excel_root: caminho }),
    });
    if (!resposta.ok) throw new Error((await resposta.json()).error || 'Erro ao salvar configuração');
    return resposta.json();
  },
  async listarDiretorio(caminho) {
    const resposta = await fetch(`/api/fs/list${caminho ? `?path=${encodeURIComponent(caminho)}` : ''}`);
    return resposta.json();
  },
};

// Formata uma data para exibição
function formatarData(timestamp) {
  if (!timestamp) return '';
  const data = new Date(timestamp);
  const preencher = (n) => String(n).padStart(2, '0');
  return `${preencher(data.getDate())}/${preencher(data.getMonth() + 1)}/${data.getFullYear()} ${preencher(data.getHours())}:${preencher(data.getMinutes())}`;
}

// Formata um CPF
function formatarCPF(cpf) {
  const digitos = String(cpf || '').replace(/\D/g, '');
  if (digitos.length !== 11) return digitos;
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
}

// Renderiza a tabela de pessoas
async function renderizarPessoas(busca = '') {
  const pessoas = await servicoApi.listarPessoas();
  const termoBusca = String(busca || '').trim().toLowerCase();
  const listaParaMostrar = termoBusca ? pessoas.filter(p => String(p.nome || '').toLowerCase().includes(termoBusca)) : pessoas;
  listaParaMostrar.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));
  const corpoTabela = document.getElementById('tabela-pessoas');
  corpoTabela.innerHTML = '';
  listaParaMostrar.forEach((pessoa) => {
    const linha = document.createElement('tr');
    const marca = pessoa.veiculo_marca || '';
    const modelo = pessoa.veiculo_modelo || '';
    const cor = pessoa.veiculo_cor || '';
    let veiculo = '';
    if (marca && modelo) veiculo = `${marca}/${modelo}`;
    else veiculo = marca || modelo || '';
    if (cor) veiculo = veiculo ? `${veiculo} / ${cor}` : cor;
    const digitosContato = String(pessoa.contato || '').replace(/\D/g, '');
    const contatoFormatado = digitosContato ? `(${digitosContato.slice(0, 2)})${digitosContato.slice(2)}` : '';
    linha.innerHTML = `
      <td>${pessoa.tipo}</td>
      <td>${pessoa.nome}</td>
      <td>${formatarCPF(pessoa.cpf)}</td>
      <td>${veiculo}</td>
      <td>${pessoa.placa || ''}</td>
      <td>${contatoFormatado}</td>
      <td>${pessoa.departamento || ''}</td>
      <td>
        <div class="acoes">
          <button data-acao="entrada" data-id="${pessoa.id}">Entrada</button>
          <button class="secundario" data-acao="saida" data-id="${pessoa.id}">Saída</button>
          <button class="botao-editar botao-icone" data-acao="editar" data-id="${pessoa.id}" title="Editar">✏️</button>
          <button class="perigo botao-icone" data-acao="remover" data-id="${pessoa.id}" title="Remover">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M9 3h6a1 1 0 0 1 1 1v1h4v2h-1.05l-1.2 12.01A3 3 0 0 1 14.78 23H9.22a3 3 0 0 1-2.97-2.99L5.05 7H4V5h4V4a1 1 0 0 1 1-1Zm1 2v1h4V5h-4Zm-2.9 2 1.1 11.01A1 1 0 0 0 9.22 21h5.56a1 1 0 0 0 .99-.99L16.9 7H7.1Z"/>
            </svg>
          </button>
        </div>
      </td>
    `;
    corpoTabela.appendChild(linha);
  });
}

// Estado dos filtros de registros
let filtrosRegistros = { nome: '', de: '', ate: '' };

// Renderiza a tabela de registros
async function renderizarRegistros(filtro = {}) {
  const registros = await servicoApi.listarRegistros();
  const corpoTabela = document.getElementById('tabela-registros');
  corpoTabela.innerHTML = '';
  const nome = String(filtro.nome || '').trim().toLowerCase();
  const de = filtro.de ? new Date(filtro.de) : null;
  const ate = filtro.ate ? new Date(filtro.ate) : null;
  const tempoDe = de ? new Date(de.getFullYear(), de.getMonth(), de.getDate()).getTime() : null;
  const tempoAte = ate ? new Date(ate.getFullYear(), ate.getMonth(), ate.getDate(), 23, 59, 59, 999).getTime() : null;
  const listaFiltrada = registros.filter((registro) => {
    const correspondeNome = nome ? (String(registro.nome || '').toLowerCase().includes(nome)) : true;
    const entrada = registro.entrada_em ? new Date(registro.entrada_em).getTime() : null;
    const saida = registro.saida_em ? new Date(registro.saida_em).getTime() : null;
    let correspondeData = true;
    if (tempoDe && tempoAte) {
      correspondeData = (entrada && entrada >= tempoDe && entrada <= tempoAte) || (saida && saida >= tempoDe && saida <= tempoAte);
    } else if (tempoDe) {
      correspondeData = (entrada && entrada >= tempoDe) || (saida && saida >= tempoDe);
    } else if (tempoAte) {
      correspondeData = (entrada && entrada <= tempoAte) || (saida && saida <= tempoAte);
    }
    return correspondeNome && correspondeData;
  });
  listaFiltrada.forEach((registro) => {
    const linha = document.createElement('tr');
    linha.innerHTML = `
      <td>${registro.nome}</td>
      <td>${registro.tipo}</td>
      <td>${formatarData(registro.entrada_em)}</td>
      <td>${formatarData(registro.saida_em)}</td>
    `;
    corpoTabela.appendChild(linha);
  });
}

// Vincula o formulário de cadastro
function vincularFormulario() {
  const formulario = document.getElementById('formulario-cadastro');
  const estado = document.getElementById('status-cadastro');
  const seletorVeiculo = document.getElementById('tem_veiculo');
  const camposVeiculo = Array.from(document.querySelectorAll('[data-veiculo]'));

  function atualizarEstadoVeiculo() {
    const temVeiculo = seletorVeiculo.value === '1';
    camposVeiculo.forEach((elemento) => {
      elemento.disabled = !temVeiculo;
      if (!temVeiculo) elemento.value = '';
    });
  }
  seletorVeiculo.addEventListener('change', atualizarEstadoVeiculo);
  atualizarEstadoVeiculo();
  formulario.addEventListener('submit', async (e) => {
    e.preventDefault();
    estado.textContent = '';
    const dados = Object.fromEntries(new FormData(formulario).entries());
    dados.cpf = (dados.cpf || '').replace(/\D/g, '');
    if (dados.cpf.length !== 11) {
      estado.textContent = 'O CPF deve conter exatamente 11 dígitos';
      return;
    }
    dados.contato = (dados.contato || '').replace(/\D/g, '');
    dados.tem_veiculo = Number(dados.tem_veiculo || '1');
    try {
      await servicoApi.cadastrarPessoa(dados);
      estado.textContent = 'Cadastro realizado';
      formulario.reset();
      atualizarEstadoVeiculo();
      await renderizarPessoas(document.getElementById('busca').value || '');
    } catch (erro) {
      estado.textContent = erro.message;
      if (erro.message.includes('CPF')) {
        alert(erro.message);
      }
    }
  });
}

// Vincula a alternância do formulário de cadastro
function vincularAlternanciaCadastro() {
  const botao = document.getElementById('alternar-cadastro');
  const formulario = document.getElementById('formulario-cadastro');
  const secao = document.getElementById('secao-cadastro');
  if (!botao || !formulario || !secao) return;

  function sincronizarEstado() {
    const oculto = formulario.classList.contains('oculto');
    botao.setAttribute('aria-expanded', oculto ? 'false' : 'true');
    secao.classList.toggle('collapsed', oculto);
  }
  botao.addEventListener('click', () => {
    formulario.classList.toggle('oculto');
    sincronizarEstado();
  });
  sincronizarEstado();
}

// Vincula as ações da tabela de pessoas
function vincularAcoes() {
  const tabela = document.getElementById('tabela-pessoas');
  tabela.addEventListener('click', async (e) => {
    const botao = e.target.closest('button');
    if (!botao) return;
    const id = botao.dataset.id;
    const acao = botao.dataset.acao;
    try {
      if (acao === 'entrada') await servicoApi.marcarEntrada(id);
      if (acao === 'saida') await servicoApi.marcarSaida(id);
      if (acao === 'editar') {
        await abrirModalEdicao(id);
      }
      if (acao === 'remover') {
        if (confirm('Deseja excluir esse cadastro? Esta ação é irreversível.')) {
          await servicoApi.removerPessoa(id);
          await renderizarPessoas(document.getElementById('busca').value || '');
        }
      }
      await renderizarRegistros();
    } catch (erro) {
      alert(erro.message);
    }
  });
}

// Abre o modal de edição de pessoa
async function abrirModalEdicao(id) {
  const modal = document.getElementById('modal-edicao');
  const botaoFechar = document.getElementById('fechar-edicao');
  const formulario = document.getElementById('formulario-edicao');
  const botaoSalvar = document.getElementById('salvar-edicao');
  const seletorVeiculo = formulario.querySelector('[name="tem_veiculo"]');
  const camposVeiculo = Array.from(formulario.querySelectorAll('[data-veiculo]'));
  const pessoa = await servicoApi.obterPessoa(id);
  formulario.tipo.value = pessoa.tipo;
  formulario.nome.value = pessoa.nome || '';
  formulario.contato.value = pessoa.contato || '';
  formulario.cpf.value = pessoa.cpf || '';
  formulario.tem_veiculo.value = String(pessoa.tem_veiculo || 1);
  formulario.veiculo_marca.value = pessoa.veiculo_marca || '';
  formulario.veiculo_modelo.value = pessoa.veiculo_modelo || '';
  formulario.veiculo_cor.value = pessoa.veiculo_cor || '';
  formulario.placa.value = pessoa.placa || '';
  formulario.departamento.value = pessoa.departamento || '';

  function atualizarEstadoVeiculo() {
    const temVeiculo = seletorVeiculo.value === '1';
    camposVeiculo.forEach((elemento) => {
      elemento.disabled = !temVeiculo;
      if (!temVeiculo) elemento.value = '';
    });
  }
  seletorVeiculo.addEventListener('change', atualizarEstadoVeiculo);
  atualizarEstadoVeiculo();

  function abrir() { modal.classList.remove('oculto'); }
  function fechar() { modal.classList.add('oculto'); }
  botaoFechar.onclick = fechar;
  botaoSalvar.onclick = async () => {
    const dados = Object.fromEntries(new FormData(formulario).entries());
    dados.cpf = (dados.cpf || '').replace(/\D/g, '');
    if (dados.cpf.length !== 11) {
      alert('O CPF deve conter exatamente 11 dígitos');
      return;
    }
    dados.contato = (dados.contato || '').replace(/\D/g, '');
    dados.tem_veiculo = Number(dados.tem_veiculo || '1');
    try {
      await servicoApi.atualizarPessoa(id, dados);
      fechar();
      await renderizarPessoas(document.getElementById('busca').value || '');
    } catch (erro) {
      alert(erro.message);
    }
  };
  abrir();
}

// Vincula a busca de pessoas
function vincularBusca() {
  const entrada = document.getElementById('busca');
  entrada.addEventListener('input', () => {
    const busca = entrada.value || '';
    renderizarPessoas(busca);
  });
}

// Vincula a busca de registros
function vincularBuscaRegistros() {
  const entrada = document.getElementById('busca-registros');
  entrada.addEventListener('input', () => {
    filtrosRegistros.nome = entrada.value || '';
    renderizarRegistros(filtrosRegistros);
  });
}

// Vincula o filtro de registros
function vincularFiltroRegistros() {
  const botao = document.getElementById('botao-filtro-registros');
  const modal = document.getElementById('modal-filtro-registros');
  const botaoFechar = document.getElementById('fechar-filtro-registros');
  const botaoAplicar = document.getElementById('aplicar-filtro-registros');
  const botaoLimpar = document.getElementById('limpar-filtro-registros');
  const entradaDe = document.getElementById('registro-data-inicio');
  const entradaAte = document.getElementById('registro-data-fim');

  function abrir() { modal.classList.remove('oculto'); }
  function fechar() { modal.classList.add('oculto'); }
  botao.addEventListener('click', abrir);
  botaoFechar.addEventListener('click', fechar);
  modal.addEventListener('click', (e) => { if (e.target === modal) fechar(); });
  botaoAplicar.addEventListener('click', () => {
    filtrosRegistros.de = entradaDe.value || '';
    filtrosRegistros.ate = entradaAte.value || '';
    renderizarRegistros(filtrosRegistros);
    fechar();
  });
  botaoLimpar.addEventListener('click', () => {
    entradaDe.value = '';
    entradaAte.value = '';
    filtrosRegistros.de = '';
    filtrosRegistros.ate = '';
    renderizarRegistros(filtrosRegistros);
    fechar();
  });
}

// Vincula a seção de configurações
function vincularConfiguracao() {
  const botaoConfig = document.getElementById('alternar-configuracao');
  const secaoConfig = document.getElementById('configuracao');
  const entradaRaiz = document.getElementById('raiz-excel');
  const botaoSelecionar = document.getElementById('selecionar-pasta');
  const botaoSalvar = document.getElementById('salvar-config');
  const estadoConfig = document.getElementById('status-configuracao');

  botaoConfig.addEventListener('click', async () => {
    const visivel = !secaoConfig.classList.contains('oculto');
    if (!visivel) {
      const resposta = await servicoApi.obterRaizExcel();
      entradaRaiz.value = resposta.excel_root || '';
      secaoConfig.classList.remove('oculto');
    } else {
      secaoConfig.classList.add('oculto');
    }
  });

  botaoSelecionar.addEventListener('click', () => abrirNavegadorDiretorio(entradaRaiz.value));

  botaoSalvar.addEventListener('click', async () => {
    try {
      await servicoApi.definirRaizExcel(entradaRaiz.value);
      estadoConfig.textContent = 'Configuração salva';
      setTimeout(() => { estadoConfig.textContent = ''; secaoConfig.classList.add('oculto'); }, 2000);
    } catch (erro) {
      estadoConfig.textContent = erro.message;
    }
  });
}

// Abre o navegador de diretórios
function abrirNavegadorDiretorio(caminhoInicial) {
  const modal = document.getElementById('modal-diretorio');
  const botaoFechar = document.getElementById('fechar-diretorio');
  const spanAtual = document.getElementById('diretorio-atual');
  const botaoSubir = document.getElementById('subir-diretorio');
  const listaDir = document.getElementById('lista-diretorios');
  const botaoEscolher = document.getElementById('escolher-diretorio');
  let caminhoAtual = caminhoInicial || '';

  async function carregar(caminho) {
    const dados = await servicoApi.listarDiretorio(caminho);
    caminhoAtual = dados.path;
    spanAtual.textContent = caminhoAtual;
    listaDir.innerHTML = '';
    dados.entries.forEach(entrada => {
      const item = document.createElement('li');
      item.textContent = `📁 ${entrada.name}`;
      item.onclick = () => carregar(entrada.path);
      listaDir.appendChild(item);
    });
    botaoSubir.onclick = () => carregar(dados.parent);
  }

  function fechar() { modal.classList.add('oculto'); }
  botaoFechar.onclick = fechar;
  botaoEscolher.onclick = () => {
    document.getElementById('raiz-excel').value = caminhoAtual;
    fechar();
  };
  modal.classList.remove('oculto');
  carregar(caminhoAtual);
}

// Vincula o botão de sair
function vincularSair() {
  const botaoSair = document.getElementById('botao-sair');
  const modalSair = document.getElementById('modal-sair');
  const botaoCancelar = document.getElementById('cancelar-sair');
  const botaoConfirmar = document.getElementById('confirmar-sair');

  botaoSair.addEventListener('click', () => modalSair.classList.remove('oculto'));
  botaoCancelar.addEventListener('click', () => modalSair.classList.add('oculto'));
  botaoConfirmar.addEventListener('click', () => {
    localStorage.removeItem('estaLogado');
    localStorage.removeItem('eRh');
    location.href = '/login.html';
  });
}

// Função principal de inicialização
async function inicializar() {
  if (localStorage.getItem('estaLogado') !== '1') {
    location.replace('/login.html');
    return;
  }
  vincularSair();
  vincularConfiguracao();
  vincularAlternanciaCadastro();
  vincularFormulario();
  vincularAcoes();
  vincularBusca();
  vincularBuscaRegistros();
  vincularFiltroRegistros();
  await renderizarPessoas();
  await renderizarRegistros();
}

// Inicializa quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializar);
} else {
  inicializar();
}
