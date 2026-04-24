const servicoApi = {
  async cadastrarPessoa(dados) {
    const res = await fetch('/api/people', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Erro ao cadastrar');
    return res.json();
  },
  async visaoGeral() {
    const res = await fetch('/api/stats/overview');
    return res.json();
  },
  async listarRegistros() {
    const res = await fetch('/api/access/logs');
    return res.json();
  },
  async listarPessoas() {
    const res = await fetch('/api/people');
    return res.json();
  },
  async listarRegistrosPessoa(id) {
    const res = await fetch(`/api/access/logs?personId=${encodeURIComponent(id)}`);
    return res.json();
  },
};

function formatarData(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

let filtrosRegistros = { nome: '', de: '', ate: '' };
let dadosNomesAtuais = { presentes: [], ausentes: [] };

async function renderizarVisaoGeral() {
  try {
    const o = await servicoApi.visaoGeral();
    const total = Number(o.total_funcionarios || 0);
    const presentes = Number(o.presentes || 0);
    const ausentes = Math.max(total - presentes, 0);
    
    dadosNomesAtuais.presentes = o.nomes_presentes || [];
    dadosNomesAtuais.ausentes = o.nomes_ausentes || [];
    
    document.getElementById('total-funcionarios').value = String(total);
    document.getElementById('presentes').value = String(presentes);
    const aus = document.getElementById('ausentes');
    if (aus) aus.value = String(ausentes);
  } catch {
    try {
      const pessoas = await servicoApi.listarPessoas();
      const funcionarios = pessoas.filter((p) => String(p.tipo).toLowerCase() === 'funcionario');
      const total = funcionarios.length;
      let presentes = 0;
      let nomesPresentes = [];
      let nomesAusentes = [];
      
      for (const f of funcionarios) {
        try {
          const logs = await servicoApi.listarRegistrosPessoa(f.id);
          const aberto = Array.isArray(logs) && logs.find((l) => !l.saida_at);
          if (aberto) {
            presentes += 1;
            nomesPresentes.push(f.nome);
          } else {
            nomesAusentes.push(f.nome);
          }
        } catch {}
      }
      
      dadosNomesAtuais.presentes = nomesPresentes;
      dadosNomesAtuais.ausentes = nomesAusentes;
      
      const ausentes = Math.max(total - presentes, 0);
      document.getElementById('total-funcionarios').value = String(total);
      document.getElementById('presentes').value = String(presentes);
      const aus = document.getElementById('ausentes');
      if (aus) aus.value = String(ausentes);
    } catch {
      document.getElementById('total-funcionarios').value = '0';
      document.getElementById('presentes').value = '0';
      const aus = document.getElementById('ausentes');
      if (aus) aus.value = '0';
      dadosNomesAtuais.presentes = [];
      dadosNomesAtuais.ausentes = [];
    }
  }
}

function vincularModalNomes() {
  const modal = document.getElementById('modal-nomes');
  const botaoFechar = document.getElementById('fechar-modal-nomes');
  const botaoOk = document.getElementById('ok-modal-nomes');
  const lista = document.getElementById('lista-nomes');
  const titulo = document.getElementById('titulo-modal-nomes');
  
  const entradaPres = document.getElementById('presentes');
  const entradaAus = document.getElementById('ausentes');
  
  function abrir(tipo) {
    lista.innerHTML = '';
    const nomes = tipo === 'presentes' ? dadosNomesAtuais.presentes : dadosNomesAtuais.ausentes;
    titulo.textContent = tipo === 'presentes' ? 'Funcionários Presentes' : 'Funcionários Ausentes';
    
    if (nomes.length === 0) {
      lista.innerHTML = '<li style="padding: 8px; color: #666;">Nenhum funcionário nesta lista.</li>';
    } else {
      nomes.forEach(n => {
        const li = document.createElement('li');
        li.textContent = n;
        li.style.padding = '8px';
        li.style.borderBottom = '1px solid #eee';
        lista.appendChild(li);
      });
    }
    modal.classList.remove('oculto');
  }
  
  function fechar() { modal.classList.add('oculto'); }
  
  entradaPres.onclick = () => abrir('presentes');
  entradaAus.onclick = () => abrir('ausentes');
  
  botaoFechar.onclick = fechar;
  botaoOk.onclick = fechar;
  modal.onclick = (e) => { if (e.target === modal) fechar(); };
}

async function renderizarRegistros(filtro = {}) {
  const registros = await servicoApi.listarRegistros();
  const tbody = document.getElementById('tabela-registros');
  tbody.innerHTML = '';
  const nome = String(filtro.nome || '').trim().toLowerCase();
  const de = filtro.de ? new Date(filtro.de) : null;
  const ate = filtro.ate ? new Date(filtro.ate) : null;
  const tempoDe = de ? new Date(de.getFullYear(), de.getMonth(), de.getDate()).getTime() : null;
  const tempoAte = ate ? new Date(ate.getFullYear(), ate.getMonth(), ate.getDate(), 23, 59, 59, 999).getTime() : null;
  const lista = registros.filter((l) => {
    const correspondeNome = nome ? (String(l.nome || '').toLowerCase().includes(nome)) : true;
    const ent = l.entrada_at ? new Date(l.entrada_at).getTime() : null;
    const sai = l.saida_at ? new Date(l.saida_at).getTime() : null;
    let correspondeData = true;
    if (tempoDe && tempoAte) {
      correspondeData = (ent && ent >= tempoDe && ent <= tempoAte) || (sai && sai >= tempoDe && sai <= tempoAte);
    } else if (tempoDe) {
      correspondeData = (ent && ent >= tempoDe) || (sai && sai >= tempoDe);
    } else if (tempoAte) {
      correspondeData = (ent && ent <= tempoAte) || (sai && sai <= tempoAte);
    }
    return correspondeNome && correspondeData;
  });
  lista.forEach((l) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${l.nome}</td>
      <td>${l.tipo}</td>
      <td>${formatarData(l.entrada_at)}</td>
      <td>${formatarData(l.saida_at)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function vincularFormulario() {
  const formulario = document.getElementById('formulario-cadastro');
  const estado = document.getElementById('status-cadastro');
  const seletorVeiculo = document.getElementById('tem_veiculo');
  const camposVeiculo = Array.from(document.querySelectorAll('#formulario-cadastro [data-veiculo]'));
  if (!formulario || !estado || !seletorVeiculo) return;
  function atualizarEstadoVeiculo() {
    const temVeiculo = seletorVeiculo.value === '1';
    camposVeiculo.forEach((el) => {
      el.disabled = !temVeiculo;
      if (!temVeiculo) el.value = '';
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
    } catch (err) {
      estado.textContent = err.message;
    }
  });
}

function vincularBuscaRegistros() {
  const entrada = document.getElementById('busca-registros');
  entrada.addEventListener('input', () => {
    filtrosRegistros.nome = entrada.value || '';
    renderizarRegistros(filtrosRegistros);
  });
}

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

function vincularSair() {
  const botaoSair = document.getElementById('botao-sair');
  botaoSair.addEventListener('click', () => {
    localStorage.removeItem('estaLogado');
    localStorage.removeItem('eRh');
    location.href = '/login.html';
  });
}

function vincularAtualizacaoVisaoGeral() {
  const botao = document.getElementById('atualizar-visao-geral');
  if (botao) {
    botao.addEventListener('click', () => {
      location.reload();
    });
  }
}

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
      const res = await fetch(`/api/reports/access?${consulta}`);
      if (!res.ok) throw new Error('not_ok');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `acessos_${de || 'inicio'}_${ate || 'fim'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      fechar();
    } catch (e) {
      try {
        const registros = await servicoApi.listarRegistros();
        const dataDe = de ? new Date(de) : null;
        const dataAte = ate ? new Date(ate) : null;
        const tempoDe = dataDe ? new Date(dataDe.getFullYear(), dataDe.getMonth(), dataDe.getDate()).getTime() : null;
        const tempoAte = dataAte ? new Date(dataAte.getFullYear(), dataAte.getMonth(), dataAte.getDate(), 23, 59, 59, 999).getTime() : null;
        const lista = registros.filter((l) => {
          const ent = l.entrada_at ? new Date(l.entrada_at).getTime() : null;
          const sai = l.saida_at ? new Date(l.saida_at).getTime() : null;
          let ok = true;
          if (tempoDe && tempoAte) ok = (ent && ent >= tempoDe && ent <= tempoAte) || (sai && sai >= tempoDe && sai <= tempoAte);
          else if (tempoDe) ok = (ent && ent >= tempoDe) || (sai && sai >= tempoDe);
          else if (tempoAte) ok = (ent && ent <= tempoAte) || (sai && sai <= tempoAte);
          return ok;
        });
        const linhas = [['Nome','Tipo','Entrada','Saida']];
        lista.forEach((l) => linhas.push([l.nome, l.tipo, formatarData(l.entrada_at), formatarData(l.saida_at)]));
        const csv = linhas.map((r) => r.map((c) => {
          const s = c == null ? '' : String(c);
          if (s.includes(';') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
          return s;
        }).join(';')).join('\n');
        const bom = '\uFEFF';
        const blob = new Blob([bom, csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `acessos_${de || 'inicio'}_${ate || 'fim'}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        fechar();
        alert('Geramos um CSV como alternativa imediata. Para ativar a exportação .xlsx, feche e abra o aplicativo.');
      } catch {
        alert('Não foi possível gerar o relatório agora.');
      }
    }
  });
}

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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializar);
} else {
  inicializar();
}
