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
    async listarPessoas(busca = '') {
        const res = await fetch(`/api/people?q=${encodeURIComponent(busca)}`);
        return res.json();
    },
    async obterPessoa(id) {
        const res = await fetch(`/api/people/${id}`);
        return res.json();
    },
    async atualizarPessoa(id, dados) {
        const res = await fetch(`/api/people/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Erro ao atualizar');
        return res.json();
    },
    async removerPessoa(id) {
        const res = await fetch(`/api/people/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao remover');
    },
    async marcarEntrada(id) {
        const res = await fetch(`/api/access/${id}/entry`, { method: 'POST' });
        if (!res.ok) throw new Error((await res.json()).error || 'Erro ao marcar entrada');
        return res.json();
    },
    async marcarSaida(id) {
        const res = await fetch(`/api/access/${id}/exit`, { method: 'POST' });
        if (!res.ok) throw new Error((await res.json()).error || 'Erro ao marcar saída');
        return res.json();
    },
    async listarRegistros() {
        const res = await fetch('/api/access/logs');
        return res.json();
    },
    async obterRaizExcel() {
        const res = await fetch('/api/config/excel-root');
        return res.json();
    },
    async definirRaizExcel(caminho) {
        const res = await fetch('/api/config/excel-root', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ excel_root: caminho }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Erro ao salvar configuração');
        return res.json();
    },
    async listarDiretorio(caminho) {
        const res = await fetch(`/api/fs/list${caminho ? `?path=${encodeURIComponent(caminho)}` : ''}`);
        return res.json();
    },
};

function formatarData(timestamp) {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    const preencher = (n) => String(n).padStart(2, '0');
    return `${preencher(d.getDate())}/${preencher(d.getMonth() + 1)}/${d.getFullYear()} ${preencher(d.getHours())}:${preencher(d.getMinutes())}`;
}

async function renderizarPessoas(busca = '') {
    const pessoas = await servicoApi.listarPessoas();
    const termoBusca = String(busca || '').trim().toLowerCase();
    const listaParaMostrar = termoBusca ? pessoas.filter(p => String(p.nome || '').toLowerCase().includes(termoBusca)) : pessoas;
    listaParaMostrar.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));
    const tbody = document.getElementById('tabela-pessoas');
    tbody.innerHTML = '';
    listaParaMostrar.forEach((p) => {
        const tr = document.createElement('tr');
        const marca = p.veiculo_marca || '';
        const modelo = p.veiculo_modelo || '';
        const cor = p.veiculo_cor || '';
        let veiculo = '';
        if (marca && modelo) veiculo = `${marca}/${modelo}`;
        else veiculo = marca || modelo || '';
        if (cor) veiculo = veiculo ? `${veiculo} / ${cor}` : cor;
        const digitosContato = String(p.contato || '').replace(/\D/g, '');
        const contatoFormatado = digitosContato ? `(${digitosContato.slice(0, 2)})${digitosContato.slice(2)}` : '';
        tr.innerHTML = `
      <td>${p.tipo}</td>
      <td>${p.nome}</td>
      <td>${p.cpf}</td>
      <td>${veiculo}</td>
      <td>${p.placa || ''}</td>
      <td>${contatoFormatado}</td>
      <td>${p.departamento || ''}</td>
      <td>
        <div class="acoes">
          <button data-acao="entrada" data-id="${p.id}">Entrada</button>
          <button class="secundario" data-acao="saida" data-id="${p.id}">Saída</button>
          <button class="botao-editar botao-icone" data-acao="editar" data-id="${p.id}" title="Editar">✏️</button>
          <button class="perigo botao-icone" data-acao="remover" data-id="${p.id}" title="Remover">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M9 3h6a1 1 0 0 1 1 1v1h4v2h-1.05l-1.2 12.01A3 3 0 0 1 14.78 23H9.22a3 3 0 0 1-2.97-2.99L5.05 7H4V5h4V4a1 1 0 0 1 1-1Zm1 2v1h4V5h-4Zm-2.9 2 1.1 11.01A1 1 0 0 0 9.22 21h5.56a1 1 0 0 0 .99-.99L16.9 7H7.1Z"/>
            </svg>
          </button>
        </div>
      </td>
    `;
        tbody.appendChild(tr);
    });
}

let filtrosRegistros = { nome: '', de: '', ate: '' };

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
    const camposVeiculo = Array.from(document.querySelectorAll('[data-veiculo]'));

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
            await renderizarPessoas(document.getElementById('busca').value || '');
        } catch (err) {
            estado.textContent = err.message;
        }
    });
}

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
        } catch (err) {
            alert(err.message);
        }
    });
}

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
        camposVeiculo.forEach((el) => {
            el.disabled = !temVeiculo;
            if (!temVeiculo) el.value = '';
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
        dados.contato = (dados.contato || '').replace(/\D/g, '');
        dados.tem_veiculo = Number(dados.tem_veiculo || '1');
        await servicoApi.atualizarPessoa(id, dados);
        fechar();
        await renderizarPessoas(document.getElementById('busca').value || '');
    };
    abrir();
}

function vincularBusca() {
    const entrada = document.getElementById('busca');
    entrada.addEventListener('input', () => {
        const busca = entrada.value || '';
        renderizarPessoas(busca);
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
            const res = await servicoApi.obterRaizExcel();
            entradaRaiz.value = res.excel_root || '';
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
        } catch (err) {
            estadoConfig.textContent = err.message;
        }
    });
}

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
        dados.entries.forEach(e => {
            const li = document.createElement('li');
            li.textContent = `📁 ${e.name}`;
            li.onclick = () => carregar(e.path);
            listaDir.appendChild(li);
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

document.addEventListener('DOMContentLoaded', inicializar);
