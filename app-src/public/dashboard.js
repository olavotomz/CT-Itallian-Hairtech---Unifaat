// Serviço de API para comunicação com o backend
const servicoApi = {
  // Cadastra uma nova pessoa
  async cadastrarPessoa(dados) {
    const resposta = await fetch('/api/people', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    if (!resposta.ok) throw new Error((await resposta.json()).error || 'Erro ao cadastrar');
    return resposta.json();
  },
  // Obtém a visão geral do sistema
  async visaoGeral() {
    const resposta = await fetch('/api/stats/overview');
    return resposta.json();
  },
  // Lista todos os registros de acesso
  async listarRegistros() {
    const resposta = await fetch('/api/access/logs');
    return resposta.json();
  },
  // Lista todas as pessoas
  async listarPessoas() {
    const resposta = await fetch('/api/people');
    return resposta.json();
  },
  // Lista registros de uma pessoa específica
  async listarRegistrosPessoa(id) {
    const resposta = await fetch(`/api/access/logs?personId=${encodeURIComponent(id)}`);
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

// Estado dos filtros de registros
let filtrosRegistros = { nome: '', de: '', ate: '' };
// Dados dos nomes atuais (presentes/ausentes)
let dadosNomesAtuais = { presentes: [], ausentes: [] };

// Renderiza a visão geral do sistema
async function renderizarVisaoGeral() {
  try {
    const dados = await servicoApi.visaoGeral();
    const total = Number(dados.total_funcionarios || 0);
    const presentes = Number(dados.presentes || 0);
    const ausentes = Math.max(total - presentes, 0);
    
    dadosNomesAtuais.presentes = dados.nomes_presentes || [];
    dadosNomesAtuais.ausentes = dados.nomes_ausentes || [];
    
    document.getElementById('total-funcionarios').value = String(total);
    document.getElementById('presentes').value = String(presentes);
    const campoAusentes = document.getElementById('ausentes');
    if (campoAusentes) campoAusentes.value = String(ausentes);
  } catch {
    try {
      // Fallback se a visão geral falhar
      const pessoas = await servicoApi.listarPessoas();
      const funcionarios = pessoas.filter((p) => String(p.tipo).toLowerCase() === 'funcionario');
      const total = funcionarios.length;
      let presentes = 0;
      let nomesPresentes = [];
      let nomesAusentes = [];
      
      for (const funcionario of funcionarios) {
        try {
          const registros = await servicoApi.listarRegistrosPessoa(funcionario.id);
          const registroAberto = Array.isArray(registros) && registros.find((r) => !r.saida_em);
          if (registroAberto) {
            presentes += 1;
            nomesPresentes.push(funcionario.nome);
          } else {
            nomesAusentes.push(funcionario.nome);
          }
        } catch {}
      }
      
      dadosNomesAtuais.presentes = nomesPresentes;
      dadosNomesAtuais.ausentes = nomesAusentes;
      
      const ausentes = Math.max(total - presentes, 0);
      document.getElementById('total-funcionarios').value = String(total);
      document.getElementById('presentes').value = String(presentes);
      const campoAusentes = document.getElementById('ausentes');
      if (campoAusentes) campoAusentes.value = String(ausentes);
    } catch {
      document.getElementById('total-funcionarios').value = '0';
      document.getElementById('presentes').value = '0';
      const campoAusentes = document.getElementById('ausentes');
      if (campoAusentes) campoAusentes.value = '0';
      dadosNomesAtuais.presentes = [];
      dadosNomesAtuais.ausentes = [];
    }
  }
}

// Vincula o modal de nomes (presentes/ausentes)
function vincularModalNomes() {
  const modal = document.getElementById('modal-nomes');
  const botaoFechar = document.getElementById('fechar-modal-nomes');
  const botaoOk = document.getElementById('ok-modal-nomes');
  const lista = document.getElementById('lista-nomes');
  const titulo = document.getElementById('titulo-modal-nomes');
  
  const campoPresentes = document.getElementById('presentes');
  const campoAusentes = document.getElementById('ausentes');
  
  function abrir(tipo) {
    lista.innerHTML = '';
    const nomes = tipo === 'presentes' ? dadosNomesAtuais.presentes : dadosNomesAtuais.ausentes;
    titulo.textContent = tipo === 'presentes' ? 'Funcionários Presentes' : 'Funcionários Ausentes';
    
    if (nomes.length === 0) {
      lista.innerHTML = '<li style="padding: 8px; color: #666;">Nenhum funcionário nesta lista.</li>';
    } else {
      nomes.forEach(nome => {
        const item = document.createElement('li');
        item.textContent = nome;
        item.style.padding = '8px';
        item.style.borderBottom = '1px solid #eee';
        lista.appendChild(item);
      });
    }
    modal.classList.remove('oculto');
  }
  
  function fechar() { modal.classList.add('oculto'); }
  
  campoPresentes.onclick = () => abrir('presentes');
  campoAusentes.onclick = () => abrir('ausentes');
  
  botaoFechar.onclick = fechar;
  botaoOk.onclick = fechar;
  modal.onclick = (e) => { if (e.target === modal) fechar(); };
}

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
  const estado = document.getElementById('estado-cadastro');
  const seletorVeiculo = document.getElementById('tem_veiculo');
  const camposVeiculo = Array.from(document.querySelectorAll('#formulario-cadastro [data-veiculo]'));
  if (!formulario || !estado || !seletorVeiculo) return;
  
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
    dados.contato = (dados.contato || '').replace(/\D/g, '');
    dados.tem_veiculo = Number(dados.tem_veiculo || '1');
    try {
      await servicoApi.cadastrarPessoa(dados);
      estado.textContent = 'Cadastro realizado';
      formulario.reset();
      atualizarEstadoVeiculo();
      await renderizarVisaoGeral();
    } catch (erro) {
      estado.textContent = erro.message;
    }
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

// Vincula o botão de sair
function vincularSair() {
  const botaoSair = document.getElementById('botao-sair');
  botaoSair.addEventListener('click', () => {
    localStorage.removeItem('estaLogado');
    localStorage.removeItem('eRh');
    location.href = '/login.html';
  });
}

// Vincula a atualização da visão geral
function vincularAtualizacaoVisaoGeral() {
  const botao = document.getElementById('atualizar-visao-geral');
  if (botao) {
    botao.addEventListener('click', () => {
      location.reload();
    });
  }
}

// Vincula a exportação para Excel
function vincularExportacao() {
  const botaoAbrir = document.getElementById('abrir-exportacao');
  const modal = document.getElementById('modal-exportacao');
  const botaoFechar = document.getElementById('fechar-exportacao');
  const botaoGerar = document.getElementById('gerar-exportacao');
  const entradaDe = document.getElementById('exportar-data-inicio');
  const entradaAte = document.getElementById('exportar-data-fim');
  
  function abrir() { modal.classList.remove('oculto'); }
  function fechar() { modal.classList.add('oculto'); }
  if (botaoAbrir) botaoAbrir.addEventListener('click', abrir);
  if (botaoFechar) botaoFechar.addEventListener('click', fechar);
  modal.addEventListener('click', (e) => { if (e.target === modal) fechar(); });
  botaoGerar.addEventListener('click', async () => {
    const de = entradaDe.value || '';
    const ate = entradaAte.value || '';
    const consulta = new URLSearchParams({ from: de, to: ate }).toString();
    try {
      const resposta = await fetch(`/api/reports/access?${consulta}`);
      if (!resposta.ok) throw new Error('not_ok');
      const blob = await resposta.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `acessos_${de || 'inicio'}_${ate || 'fim'}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      fechar();
    } catch (erro) {
      try {
        // Fallback: gera CSV se o Excel falhar
        const registros = await servicoApi.listarRegistros();
        const dataDe = de ? new Date(de) : null;
        const dataAte = ate ? new Date(ate) : null;
        const tempoDe = dataDe ? new Date(dataDe.getFullYear(), dataDe.getMonth(), dataDe.getDate()).getTime() : null;
        const tempoAte = dataAte ? new Date(dataAte.getFullYear(), dataAte.getMonth(), dataAte.getDate(), 23, 59, 59, 999).getTime() : null;
        const lista = registros.filter((registro) => {
          const entrada = registro.entrada_em ? new Date(registro.entrada_em).getTime() : null;
          const saida = registro.saida_em ? new Date(registro.saida_em).getTime() : null;
          let ok = true;
          if (tempoDe && tempoAte) ok = (entrada && entrada >= tempoDe && entrada <= tempoAte) || (saida && saida >= tempoDe && saida <= tempoAte);
          else if (tempoDe) ok = (entrada && entrada >= tempoDe) || (saida && saida >= tempoDe);
          else if (tempoAte) ok = (entrada && entrada <= tempoAte) || (saida && saida <= tempoAte);
          return ok;
        });
        const linhas = [['Nome','Tipo','Entrada','Saída']];
        lista.forEach((registro) => linhas.push([registro.nome, registro.tipo, formatarData(registro.entrada_em), formatarData(registro.saida_em)]));
        const csv = linhas.map((linha) => linha.map((celula) => {
          const texto = celula == null ? '' : String(celula);
          if (texto.includes(';') || texto.includes('"') || texto.includes('\n')) return `"${texto.replace(/"/g, '""')}"`;
          return texto;
        }).join(';')).join('\n');
        const bom = '\uFEFF';
        const blob = new Blob([bom, csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `acessos_${de || 'inicio'}_${ate || 'fim'}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        fechar();
        alert('Geramos um CSV como alternativa imediata. Para ativar a exportação .xlsx, feche e abra o aplicativo.');
      } catch {
        alert('Não foi possível gerar o relatório agora.');
      }
    }
  });
}

// Função principal de inicialização
async function inicializar() {
  if (localStorage.getItem('estaLogado') !== '1') {
    location.replace('/login.html');
    return;
  }
  if (localStorage.getItem('eRh') !== '1') {
    location.replace('/index.html');
    return;
  }
  vincularSair();
  vincularFormulario();
  vincularBuscaRegistros();
  vincularFiltroRegistros();
  vincularExportacao();
  vincularAtualizacaoVisaoGeral();
  vincularModalNomes();
  await renderizarVisaoGeral();
  await renderizarRegistros(filtrosRegistros);
}

// Inicializa quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializar);
} else {
  inicializar();
}
