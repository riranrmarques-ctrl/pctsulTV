const SUPABASE_URL = "https://niqyhaiytiusvyspjsld.supabase.co";
const SUPABASE_KEY = "sb_publishable_O6vm7g-Xiv4COo1mNHCBAw_jgEJbSDI";
const SENHA_PAINEL = "test1";

const CACHE_CENTRAL_KEY = "central_painel_cache_v5";
const CACHE_CENTRAL_TTL = 30 * 60 * 1000;
const TABELA_SALAS = "salas";
const STORAGE_CAPAS_BUCKET = "capas-salas";
const STORAGE_MATERIAIS_BUCKET = "materiais-salas";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let todosOsPontos = [];
let todasAsPlaylists = [];
let todosOsMateriais = [];
let playlistsAtivas = 0;
let salaAtual = null;
let imagemSalaSelecionada = null;
let materialSalaSelecionado = null;

document.addEventListener("DOMContentLoaded", () => {
  iniciarLoginCentral();
  configurarFiltros();
  configurarLogout();
  configurarVoltarSala();
  configurarEdicaoSala();
  configurarNovoPonto();
  configurarAdicionarMaterial();
  configurarCopiarCodigoSala();
  configurarModalEditarMaterial();
});

function configurarModalEditarMaterial() {
  const btnFechar = document.getElementById("btnFecharEditarMaterial");
  const btnCancelar = document.getElementById("btnCancelarEditarMaterial");
  const btnSalvar = document.getElementById("btnSalvarEditarMaterial");
  const inputDuracao = document.getElementById("editMaterialDuracao");

  if (btnFechar) btnFechar.addEventListener("click", fecharModalEditarMaterial);
  if (btnCancelar) btnCancelar.addEventListener("click", fecharModalEditarMaterial);
  if (btnSalvar) btnSalvar.addEventListener("click", salvarEdicaoMaterial);

  if (inputDuracao) {
    inputDuracao.addEventListener("input", () => {
      inputDuracao.value = mascaraDuracaoMaterial(inputDuracao.value);
    });
  }
}

function iniciarLoginCentral() {
  const loginBox = document.getElementById("loginBox");
  const conteudoPainel = document.getElementById("conteudoPainel");
  const senhaInput = document.getElementById("senhaInput");
  const btnLogin = document.getElementById("btnLogin");
  const loginErro = document.getElementById("loginErro");

  function liberarPainel() {
    if (loginBox) loginBox.style.display = "none";
    if (conteudoPainel) conteudoPainel.style.display = "block";
    carregarcentralpainel();
  }

  function bloquearPainel() {
    if (loginBox) loginBox.style.display = "flex";
    if (conteudoPainel) conteudoPainel.style.display = "none";
  }

  function validarLogin() {
    const senha = senhaInput ? senhaInput.value.trim() : "";

    if (senha !== SENHA_PAINEL) {
      if (loginErro) loginErro.textContent = "Codigo invalido";
      return;
    }

    sessionStorage.setItem("painelLiberado", "1");

    if (loginErro) loginErro.textContent = "";
    liberarPainel();
  }

  if (sessionStorage.getItem("painelLiberado") === "1") {
    liberarPainel();
  } else {
    bloquearPainel();
  }

  if (btnLogin) btnLogin.onclick = validarLogin;

  if (senhaInput) {
    senhaInput.addEventListener("keydown", event => {
      if (event.key === "Enter") validarLogin();
    });
  }
}

function configurarFiltros() {
  ["buscaPontos", "filtroStatus", "filtroTipo", "ordenarPontos"].forEach(id => {
    const elemento = document.getElementById(id);
    if (!elemento) return;
    elemento.addEventListener("input", atualizarPainelFiltrado);
    elemento.addEventListener("change", atualizarPainelFiltrado);
  });
}

function configurarNovoPonto() {
  const btnNovoPonto = document.getElementById("btnNovoPonto");
  if (!btnNovoPonto) return;

  btnNovoPonto.addEventListener("click", criarNovoPonto);
}

function configurarAdicionarMaterial() {
  const btnAdicionarMaterial = document.getElementById("btnAdicionarMaterial");
  const inputMaterialSala = document.getElementById("inputMaterialSala");
  if (!btnAdicionarMaterial || !inputMaterialSala) return;

  btnAdicionarMaterial.addEventListener("click", () => inputMaterialSala.click());
  inputMaterialSala.addEventListener("change", () => {
    const arquivo = inputMaterialSala.files?.[0];
    if (!arquivo) return;

    abrirModalAdicionarMaterial(arquivo);
    inputMaterialSala.value = "";
  });

  const btnCancelar = document.getElementById("btnCancelarAdicionarMaterial");
  const btnFechar = document.getElementById("btnFecharAdicionarMaterial");
  const btnConfirmar = document.getElementById("btnConfirmarAdicionarMaterial");
  const inputDuracao = document.getElementById("materialDuracao");

  if (inputDuracao) {
    inputDuracao.addEventListener("input", () => {
      inputDuracao.value = mascaraDuracaoMaterial(inputDuracao.value);
    });
  }

  if (btnCancelar) btnCancelar.addEventListener("click", fecharModalAdicionarMaterial);
  if (btnFechar) btnFechar.addEventListener("click", fecharModalAdicionarMaterial);
  if (btnConfirmar) btnConfirmar.addEventListener("click", confirmarAdicionarMaterial);
}

function configurarCopiarCodigoSala() {
  const codigo = document.getElementById("salaCodigo");
  if (!codigo) return;

  codigo.addEventListener("click", () => copiarTexto(codigo.textContent || ""));
}

function configurarLogout() {
  const btnLogout = document.getElementById("btnLogout");
  if (!btnLogout) return;

  btnLogout.addEventListener("click", () => {
    sessionStorage.removeItem("painelLiberado");
    window.location.reload();
  });
}

function configurarVoltarSala() {
  const btnVoltar = document.getElementById("btnVoltarSalas");
  if (!btnVoltar) return;

  btnVoltar.addEventListener("click", () => {
    document.body.classList.remove("modo-sala");
    const salaDetalhe = document.getElementById("salaDetalhe");
    if (salaDetalhe) salaDetalhe.hidden = true;
  });
}

function configurarEdicaoSala() {
  const btnEditar = document.getElementById("btnEditarSala");
  const btnFechar = document.getElementById("btnFecharEditarSala");
  const btnCancelar = document.getElementById("btnCancelarEditarSala");
  const btnSalvar = document.getElementById("btnSalvarEditarSala");
  const inputImagem = document.getElementById("editSalaImagem");
  const btnAlterarImagem = document.getElementById("btnAlterarImagemSala");
  const inputArquivoImagem = document.getElementById("inputImagemSala");

  if (btnEditar) btnEditar.addEventListener("click", abrirModalEditarSala);
  if (btnFechar) btnFechar.addEventListener("click", fecharModalEditarSala);
  if (btnCancelar) btnCancelar.addEventListener("click", fecharModalEditarSala);
  if (btnSalvar) btnSalvar.addEventListener("click", salvarEdicaoSala);
  if (btnAlterarImagem && inputArquivoImagem) {
    btnAlterarImagem.addEventListener("click", () => inputArquivoImagem.click());
  }

  if (inputImagem) {
    inputImagem.addEventListener("input", () => {
      const preview = document.getElementById("editSalaPreview");
      if (preview) preview.src = inputImagem.value.trim() || "https://placehold.co/800x450/png";
    });
  }

  if (inputArquivoImagem && inputImagem) {
    inputArquivoImagem.addEventListener("change", () => {
      const arquivo = inputArquivoImagem.files?.[0];
      if (!arquivo) return;

      imagemSalaSelecionada = arquivo;

      const leitor = new FileReader();
      leitor.onload = () => {
        const imagemBase64 = String(leitor.result || "");

        const preview = document.getElementById("editSalaPreview");
        if (preview) preview.src = imagemBase64;
      };
      leitor.readAsDataURL(arquivo);
    });
  }
}

async function criarNovoPonto() {
  const btnNovoPonto = document.getElementById("btnNovoPonto");
  const textoOriginal = btnNovoPonto ? btnNovoPonto.innerHTML : "";
  const codigo = gerarCodigoPonto();

  const novoPonto = {
    codigo,
    nome: "Nova sala",
    endereco: "Predio nao informado",
    imagem_url: "",
    status: "cadastrado",
    tipo_ponto: "sala",
    total_telas: 0,
    disponivel: true
  };

  if (btnNovoPonto) {
    btnNovoPonto.disabled = true;
    btnNovoPonto.innerHTML = "<span>+</span> Criando...";
  }

  try {
    const { data, error } = await supabaseClient
      .from(TABELA_SALAS)
      .insert(novoPonto)
      .select("*")
      .single();

    if (error) throw error;

    const pontoCriado = combinarPontosComStatus([data || novoPonto])[0];

    todosOsPontos = [pontoCriado, ...todosOsPontos];
    sessionStorage.removeItem(CACHE_CENTRAL_KEY);
    atualizarPainelFiltrado();
    abrirSala(pontoCriado);
    abrirModalEditarSala();
  } catch (erro) {
    console.error("Erro ao criar ponto:", erro);
    alert(mensagemErroNovoPonto(erro));
  } finally {
    if (btnNovoPonto) {
      btnNovoPonto.disabled = false;
      btnNovoPonto.innerHTML = textoOriginal || "<span>+</span> Novo ponto";
    }
  }
}

async function adicionarMaterialSala(arquivo) {
  const dataPostagem = getValor("materialDataPostagem");
  const dataEncerramento = getValor("materialDataEncerramento");
  const duracaoMaterial = normalizarDuracaoMaterial(getValor("materialDuracao") || "00:30");

  if (!salaAtual) {
    alert("Abra uma sala antes de adicionar material.");
    return;
  }

  if (!arquivo) return;

  const codigo = salaAtual.codigo_final || salaAtual.codigo;
  if (!codigo) {
    alert("Codigo da sala nao encontrado.");
    return;
  }

  const btnAdicionarMaterial = document.getElementById("btnAdicionarMaterial");
  const textoOriginal = btnAdicionarMaterial ? btnAdicionarMaterial.textContent : "";

  if (btnAdicionarMaterial) {
    btnAdicionarMaterial.disabled = true;
    btnAdicionarMaterial.textContent = "Enviando...";
  }

  try {
    const arquivoUrl = await enviarMaterialSala(codigo, arquivo);
    const codigosDestino = codigosDestinoMaterial(codigo);
    const nomeMaterial = nomeArquivoSemExtensao(arquivo.name);

    const registros = codigosDestino.map(codigoDestino => ({
      codigo_ponto: codigoDestino,
      nome: nomeMaterial,
      arquivo_url: arquivoUrl,
      arquivo_nome: arquivo.name,
      arquivo_tipo: arquivo.type || tipoArquivoPorNome(arquivo.name),
      arquivo_tamanho: arquivo.size || 0,
      duracao: duracaoMaterial,
      data_postagem: dataPostagem || null,
      data_encerramento: dataEncerramento || null,
      status: "ativo",
      ordem: materiaisDaSala(codigoDestino).length + 1
    }));

    const { data, error } = await supabaseClient
      .from("materiais_salas")
      .insert(registros)
      .select("*");

    if (error) throw error;

    todosOsMateriais = [...(data || registros), ...todosOsMateriais];
    sessionStorage.removeItem(CACHE_CENTRAL_KEY);

    renderizarPlaylistSala(codigo);
    setTexto("salaTotalMidias", materiaisDaSala(codigo).length);
    setTexto("salaTotalPlaylists", playlistsDaSala(codigo).length);
    setTexto("salaTotalRadioTv", radioTvDaSala(codigo).length);
    atualizarResumo(todosOsPontos);
    fecharModalAdicionarMaterial();
  } catch (erro) {
    console.error("Erro ao adicionar material:", erro);
    alert(mensagemErroMaterial(erro));
  } finally {
    if (btnAdicionarMaterial) {
      btnAdicionarMaterial.disabled = false;
      btnAdicionarMaterial.textContent = textoOriginal || "Adicionar material";
    }
  }
}

function abrirModalAdicionarMaterial(arquivo) {
  if (!salaAtual) {
    alert("Abra uma sala antes de adicionar material.");
    return;
  }

  materialSalaSelecionado = arquivo;

  setTexto("materialSelecionadoNome", arquivo.name || "Material selecionado");
  setValor("materialDataPostagem", dataInputLocal(new Date()));
  setValor("materialDataEncerramento", dataInputLocal(somarDias(new Date(), 30)));
  setValor("materialDuracao", "00:30");
  renderizarDestinosMaterial();

  const modal = document.getElementById("modalAdicionarMaterial");
  if (modal) modal.hidden = false;
}

function fecharModalAdicionarMaterial() {
  materialSalaSelecionado = null;

  const modal = document.getElementById("modalAdicionarMaterial");
  if (modal) modal.hidden = true;

  setTexto("materialSelecionadoNome", "Nenhum arquivo selecionado");
  setValor("materialDataPostagem", "");
  setValor("materialDataEncerramento", "");
  setValor("materialDuracao", "");
  const destinos = document.getElementById("materialSalasExtras");
  if (destinos) destinos.innerHTML = "";
}

function renderizarDestinosMaterial() {
  const container = document.getElementById("materialSalasExtras");
  if (!container || !salaAtual) return;

  const codigoAtual = normalizarCodigo(salaAtual.codigo_final || salaAtual.codigo || "");
  const salasExtras = todosOsPontos.filter(ponto => {
    return normalizarCodigo(ponto.codigo_final || ponto.codigo || "") !== codigoAtual;
  });

  if (!salasExtras.length) {
    container.innerHTML = `<div class="material-salas-vazia">Nenhuma outra sala cadastrada.</div>`;
    return;
  }

  container.innerHTML = salasExtras.map(ponto => {
    const codigo = ponto.codigo_final || ponto.codigo || "";
    return `
      <label>
        <input type="checkbox" value="${escaparHtml(codigo)}">
        <strong>${escaparHtml(nomePonto(ponto))}</strong>
        <small>${escaparHtml(codigo)}</small>
      </label>
    `;
  }).join("");
}

function codigosDestinoMaterial(codigoAtual) {
  const codigos = new Set([normalizarCodigo(codigoAtual)]);

  document.querySelectorAll("#materialSalasExtras input:checked").forEach(input => {
    const codigo = normalizarCodigo(input.value);
    if (codigo) codigos.add(codigo);
  });

  return Array.from(codigos);
}

function mascaraDuracaoMaterial(valor) {
  const apenasNumeros = String(valor || "").replace(/\D/g, "").slice(0, 4);

  if (apenasNumeros.length <= 2) return apenasNumeros;

  return `${apenasNumeros.slice(0, 2)}:${apenasNumeros.slice(2)}`;
}

function normalizarDuracaoMaterial(valor) {
  const texto = String(valor || "").trim();
  const partes = texto.split(":");

  if (partes.length !== 2) return "";

  const minutos = Number(partes[0]);
  const segundos = Number(partes[1]);

  if (!Number.isInteger(minutos) || !Number.isInteger(segundos)) return "";
  if (minutos < 0 || minutos > 99 || segundos < 0 || segundos > 59) return "";

  return `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
}

async function confirmarAdicionarMaterial() {
  if (!materialSalaSelecionado) {
    alert("Selecione um arquivo para adicionar.");
    return;
  }

  const dataPostagem = getValor("materialDataPostagem");
  const dataEncerramento = getValor("materialDataEncerramento");
  const duracaoMaterial = normalizarDuracaoMaterial(getValor("materialDuracao"));

  if (!duracaoMaterial) {
    alert("Informe a duração no formato 00:00. Os segundos precisam ficar entre 00 e 59.");
    return;
  }

  setValor("materialDuracao", duracaoMaterial);

  if (!dataPostagem || !dataEncerramento) {
    alert("Informe a postagem e o encerramento do material.");
    return;
  }

  if (new Date(dataEncerramento) <= new Date(dataPostagem)) {
    alert("O encerramento precisa ser depois da postagem.");
    return;
  }

  await adicionarMaterialSala(materialSalaSelecionado);
}

function lerCacheCentral() {
  try {
    const bruto = sessionStorage.getItem(CACHE_CENTRAL_KEY);
    if (!bruto) return null;

    const cache = JSON.parse(bruto);
    const fresco = Date.now() - Number(cache.criadoEm || 0) < CACHE_CENTRAL_TTL;

    return {
      fresco,
      dados: cache.dados || null
    };
  } catch {
    return null;
  }
}

function salvarCacheCentral(dados) {
  try {
    sessionStorage.setItem(CACHE_CENTRAL_KEY, JSON.stringify({
      criadoEm: Date.now(),
      dados
    }));
  } catch {
    return;
  }
}

async function carregarcentralpainel(opcoes = {}) {
  try {
    const cache = lerCacheCentral();

    const cacheComPontosReais = Array.isArray(cache?.dados?.pontos) && cache.dados.pontos.length > 0;

    if (!opcoes.forcarAtualizacao && cache?.dados && cacheComPontosReais) {
      aplicarDadosCentral(cache.dados);

      if (cache.fresco) return;
    }

    const { data: pontos, error: erroPontos } = await supabaseClient
      .from(TABELA_SALAS)
      .select("*")
      .order("created_at", { ascending: false });

    if (erroPontos) throw erroPontos;

    const status = await buscarStatusReaisSalas();

    let playlists = [];

    const respostaPlaylists = await supabaseClient
      .from("playlists")
      .select("*");

    if (respostaPlaylists.error) {
      console.warn("Playlists nao carregaram:", respostaPlaylists.error);
    } else {
      playlists = respostaPlaylists.data || [];
    }

    let materiais = [];

    const respostaMateriais = await supabaseClient
      .from("materiais_salas")
      .select("*");

    if (respostaMateriais.error) {
      console.warn("Materiais nao carregaram:", respostaMateriais.error);
    } else {
      materiais = respostaMateriais.data || [];
    }

    const dados = {
      pontos: pontos || [],
      status,
      playlists,
      materiais
    };

    salvarCacheCentral(dados);
    aplicarDadosCentral(dados);
  } catch (erro) {
    console.error("Erro ao carregar central painel:", erro);
    aplicarDadosCentral({ pontos: [], playlists: [] });
  }
}

function aplicarDadosCentral(dados) {
  const pontos = dados?.pontos || [];
  const status = dados?.status || [];
  const playlists = dados?.playlists || [];
  const materiais = dados?.materiais || [];

  todasAsPlaylists = playlists;
  todosOsMateriais = materiais;
  playlistsAtivas = contarPlaylistsAtivas(playlists);
  todosOsPontos = combinarPontosComStatus(pontos, status);
  atualizarPainelFiltrado();
}

async function buscarStatusReaisSalas() {
  const { data, error } = await supabaseClient
    .from("status_salas")
    .select("*")
    .order("ultimo_ping", { ascending: false });

  if (!error) return data || [];

  return [];
}

function combinarPontosComStatus(pontos, status = []) {
  const statusPorCodigo = {};

  (status || []).forEach(item => {
    const codigoStatus = normalizarCodigo(
      item.codigo ||
      item.codigo_ponto ||
      item.ponto_codigo ||
      item.codigo_sala ||
      item.sala_codigo ||
      ""
    );

    if (!codigoStatus || statusPorCodigo[codigoStatus]) return;

    statusPorCodigo[codigoStatus] = item;
  });

  return pontos.map(ponto => {
    const codigoPonto = normalizarCodigo(ponto.codigo || ponto.codigo_ponto || ponto.ponto_codigo || ponto.codigo_final || "");
    const statusEncontrado = statusPorCodigo[codigoPonto];

    const pontoIndisponivel =
      ponto.disponivel === false ||
      ponto.indisponivel === true ||
      String(ponto.disponivel || "").toLowerCase().trim() === "false" ||
      String(ponto.status_disponibilidade || "").toLowerCase().includes("indispon");

    const statusCadastro = normalizarStatusCadastro(ponto.status || ponto.status_final || "");
    const ultimoPing = statusEncontrado?.ultimo_ping || statusEncontrado?.data_hora || statusEncontrado?.created_at || null;
    const statusAtual = statusEncontrado ? normalizarStatus(statusEncontrado?.status || statusEncontrado?.evento || "") : "inativo";
    const statusConexao = statusAtual === "ativo" && pingRecente(ultimoPing) ? "ativo" : "inativo";

    return {
      ...ponto,
      codigo_final: codigoPonto,
      status_final: pontoIndisponivel || statusCadastro === "desativado" ? "desativado" : statusConexao,
      ultimo_ping_final: ultimoPing
    };
  });
}

function atualizarPainelFiltrado() {
  const busca = normalizarBusca(document.getElementById("buscaPontos")?.value || "");
  const filtroStatus = document.getElementById("filtroStatus")?.value || "todos";
  const ordenar = document.getElementById("ordenarPontos")?.value || "recentes";

  let pontos = todosOsPontos.filter(ponto => {
    const texto = normalizarBusca(`${ponto.nome || ""} ${ponto.nome_ponto || ""} ${ponto.endereco || ""} ${ponto.cidade || ""} ${ponto.codigo_final || ""}`);
    const combinaBusca = !busca || texto.includes(busca);
    const combinaStatus = filtroStatus === "todos" || ponto.status_final === filtroStatus;
    return combinaBusca && combinaStatus;
  });

  pontos = ordenarPontos(pontos, ordenar);
  atualizarResumo(todosOsPontos);
  renderizarPontos(pontos);
}

function atualizarResumo(pontos) {
  const total = pontos.length;
  const ativos = pontos.filter(p => p.status_final === "ativo").length;
  const inativos = pontos.filter(p => p.status_final !== "ativo").length;

  setTexto("totalPontosResumo", total);
  setTexto("pontosAtivosResumo", ativos);
  setTexto("pontosInativosResumo", inativos);
  setTexto("playlistsAtivasResumo", playlistsAtivas);
}

function ordenarPontos(pontos, ordenar) {
  const ordemStatus = {
    ativo: 1,
    inativo: 2,
    desativado: 3
  };

  return [...pontos].sort((a, b) => {
    if (ordenar === "nome") {
      return nomePonto(a).localeCompare(nomePonto(b), "pt-BR");
    }

    if (ordenar === "status") {
      return (ordemStatus[a.status_final] || 99) - (ordemStatus[b.status_final] || 99);
    }

    return new Date(b.ultimo_ping_final || b.created_at || 0) - new Date(a.ultimo_ping_final || a.created_at || 0);
  });
}

function renderizarPontos(pontos) {
  const lista = document.getElementById("listaPontos");
  if (!lista) return;

  lista.innerHTML = "";

  if (!pontos.length) {
    lista.innerHTML = `<div class="empty-state">Nenhum ponto encontrado.</div>`;
    return;
  }

  pontos.forEach((ponto, index) => {
    const nome = nomePonto(ponto);
    const status = ponto.status_final;
    const imagem = imagemPonto(ponto);
    const endereco = enderecoPonto(ponto);
    const codigo = ponto.codigo_final || "------";
    const totalTelas = totalTelasPonto(ponto, index);

    lista.innerHTML += `
      <article class="point-card" data-codigo="${escaparHtml(codigo)}">
        <div class="card-topo">
          <span class="status-pill ${classeStatusVisual(status)}">${textoStatus(status)}</span>
          <span class="telas-topo">${totalTelas} ${totalTelas === 1 ? "tela" : "telas"}</span>
        </div>

        <img src="${escaparHtml(imagem)}" alt="${escaparHtml(nome)}" loading="lazy">

        <h3>${escaparHtml(nome)}</h3>

        <div class="card-info">
          <p>${escaparHtml(endereco)}</p>
          <span class="codigo-pill">${escaparHtml(codigo)}</span>
        </div>

        <button class="btn-detalhes" type="button" data-codigo="${escaparHtml(codigo)}">
          <span>Entrar na sala</span>
          <strong>→</strong>
        </button>
      </article>
    `;
  });

  lista.querySelectorAll(".btn-detalhes").forEach(botao => {
    botao.addEventListener("click", () => {
      const codigo = botao.dataset.codigo || "";
      const ponto = pontos.find(item => normalizarCodigo(item.codigo_final) === normalizarCodigo(codigo));
      if (ponto) abrirSala(ponto);
    });
  });
}

function abrirSala(ponto) {
  salaAtual = ponto;

  const nome = nomePonto(ponto);
  const endereco = enderecoPonto(ponto);
  const imagem = imagemPonto(ponto);
  const codigo = ponto.codigo_final || "------";

  setTexto("salaTitulo", nome);
  setTexto("salaEndereco", endereco);
  setTexto("salaCodigo", codigo);
  setTexto("salaStatusTopo", textoStatusSala(ponto));
  aplicarClasseStatusSala(ponto.status_final);
  setTexto("salaTotalMidias", materiaisDaSala(codigo).length);
  setTexto("salaTotalPlaylists", playlistsDaSala(codigo).length);
  setTexto("salaDiasOnline", totalTelasPonto(ponto, 0));
  setTexto("salaTotalRadioTv", radioTvDaSala(codigo).length);

  const salaImagem = document.getElementById("salaImagem");
  if (salaImagem) {
    salaImagem.src = imagem;
    salaImagem.alt = nome;
  }

  renderizarPlaylistSala(codigo);
  renderizarHistoricosSala();

  const salaDetalhe = document.getElementById("salaDetalhe");
  if (salaDetalhe) salaDetalhe.hidden = false;

  document.body.classList.add("modo-sala");
}

function abrirModalEditarSala() {
  if (!salaAtual) return;

  imagemSalaSelecionada = null;

  setValor("editSalaNome", nomePonto(salaAtual));
  setValor("editSalaEndereco", salaAtual.endereco || salaAtual.endereco_completo || salaAtual.localizacao || "");
  setValor("editSalaImagem", imagemPonto(salaAtual));

  const preview = document.getElementById("editSalaPreview");
  if (preview) preview.src = imagemPonto(salaAtual);

  const modal = document.getElementById("modalEditarSala");
  if (modal) modal.hidden = false;
}

function fecharModalEditarSala() {
  const modal = document.getElementById("modalEditarSala");
  if (modal) modal.hidden = true;
}

async function salvarEdicaoSala() {
  if (!salaAtual) return;

  const codigo = salaAtual.codigo_final || salaAtual.codigo;
  if (!codigo) {
    alert("Codigo da sala nao encontrado.");
    return;
  }

  const nome = getValor("editSalaNome");
  const endereco = getValor("editSalaEndereco");

  const dadosAtualizados = {
    nome,
    endereco
  };

  const btnSalvar = document.getElementById("btnSalvarEditarSala");
  const textoOriginal = btnSalvar ? btnSalvar.textContent : "";

  if (btnSalvar) {
    btnSalvar.disabled = true;
    btnSalvar.textContent = "Salvando...";
  }

  try {
    if (imagemSalaSelecionada) {
      dadosAtualizados.imagem_url = await enviarCapaSala(codigo, imagemSalaSelecionada);
    } else {
      dadosAtualizados.imagem_url = getValor("editSalaImagem");
    }

    const dadosPersistencia = {
      codigo,
      nome: dadosAtualizados.nome,
      endereco: dadosAtualizados.endereco,
      imagem_url: dadosAtualizados.imagem_url,
      cidade: salaAtual.cidade || salaAtual.regiao || salaAtual.bairro || null,
      status: salaAtual.status || "cadastrado",
      tipo_ponto: salaAtual.tipo_ponto || "sala",
      total_telas: totalTelasPonto(salaAtual, 0),
      disponivel: salaAtual.disponivel !== false
    };

    const { error } = await supabaseClient
      .from(TABELA_SALAS)
      .upsert(dadosPersistencia, { onConflict: "codigo" });

    if (error) throw error;

    Object.assign(salaAtual, dadosAtualizados, {
      nome_ponto: dadosAtualizados.nome,
      endereco_completo: dadosAtualizados.endereco
    });

    todosOsPontos = todosOsPontos.map(ponto => {
      if (normalizarCodigo(ponto.codigo_final || ponto.codigo) !== normalizarCodigo(codigo)) return ponto;
      return {
        ...ponto,
        ...dadosAtualizados,
        nome_ponto: dadosAtualizados.nome,
        endereco_completo: dadosAtualizados.endereco
      };
    });

    sessionStorage.removeItem(CACHE_CENTRAL_KEY);
    atualizarSalaAberta();
    atualizarPainelFiltrado();
    fecharModalEditarSala();
  } catch (erro) {
    console.error("Erro ao salvar sala:", erro);
    alert(mensagemErroSala(erro));
  } finally {
    if (btnSalvar) {
      btnSalvar.disabled = false;
      btnSalvar.textContent = textoOriginal || "Salvar alteracoes";
    }
  }
}

function atualizarSalaAberta() {
  if (!salaAtual) return;

  setTexto("salaTitulo", nomePonto(salaAtual));
  setTexto("salaEndereco", enderecoPonto(salaAtual));
  setTexto("salaCodigo", salaAtual.codigo_final || salaAtual.codigo || "------");
  setTexto("salaDiasOnline", totalTelasPonto(salaAtual, 0));

  const salaImagem = document.getElementById("salaImagem");
  if (salaImagem) {
    salaImagem.src = imagemPonto(salaAtual);
    salaImagem.alt = nomePonto(salaAtual);
  }
}

async function enviarCapaSala(codigo, arquivo) {
  const extensao = (arquivo.name || "jpg").split(".").pop() || "jpg";
  const caminho = `${normalizarCodigo(codigo).toLowerCase()}/capa-${Date.now()}.${extensao}`;

  const { error } = await supabaseClient
    .storage
    .from(STORAGE_CAPAS_BUCKET)
    .upload(caminho, arquivo, {
      cacheControl: "3600",
      upsert: true
    });

  if (error) throw error;

  const { data } = supabaseClient
    .storage
    .from(STORAGE_CAPAS_BUCKET)
    .getPublicUrl(caminho);

  return data.publicUrl;
}

async function enviarMaterialSala(codigo, arquivo) {
  const nomeSeguro = (arquivo.name || "material")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-");

  const caminho = `${normalizarCodigo(codigo).toLowerCase()}/${Date.now()}-${nomeSeguro}`;

  const { error } = await supabaseClient
    .storage
    .from(STORAGE_MATERIAIS_BUCKET)
    .upload(caminho, arquivo, {
      cacheControl: "3600",
      upsert: false
    });

  if (error) throw error;

  const { data } = supabaseClient
    .storage
    .from(STORAGE_MATERIAIS_BUCKET)
    .getPublicUrl(caminho);

  return data.publicUrl;
}

function mensagemErroSala(erro) {
  const texto = String(erro?.message || erro?.details || erro?.hint || "");

  if (erro?.code === "PGRST205" || erro?.status === 404 || texto.includes("salas")) {
    return "A tabela salas ainda nao existe no banco novo. Crie a tabela salas no Supabase.";
  }

  if (texto.toLowerCase().includes("bucket") || texto.toLowerCase().includes("storage")) {
    return "Nao foi possivel salvar a imagem. Crie o bucket publico capas-salas no Storage do Supabase.";
  }

  return "Nao foi possivel salvar as informacoes da sala.";
}

function mensagemErroNovoPonto(erro) {
  const texto = String(erro?.message || erro?.details || erro?.hint || "");

  if (erro?.code === "PGRST205" || erro?.status === 404 || texto.includes("salas")) {
    return "A tabela salas ainda nao existe no banco novo. Crie a tabela salas no Supabase.";
  }

  if (texto.toLowerCase().includes("duplicate") || erro?.code === "23505") {
    return "O codigo gerado ja existe. Tente criar novamente.";
  }

  return "Nao foi possivel criar o novo ponto.";
}

function mensagemErroMaterial(erro) {
  const texto = String(erro?.message || erro?.details || erro?.hint || "");

  if (erro?.code === "PGRST205" || erro?.status === 404) {
    return "A tabela materiais_salas ainda nao existe no banco novo. Crie a tabela materiais_salas no Supabase.";
  }

  if (texto.toLowerCase().includes("bucket") || texto.toLowerCase().includes("storage")) {
    return "Nao foi possivel enviar o arquivo. Crie o bucket publico materiais-salas no Storage do Supabase.";
  }

  if (
    erro?.code === "PGRST204" ||
    erro?.status === 400 ||
    texto.includes("arquivo_url") ||
    texto.includes("data_postagem") ||
    texto.includes("data_encerramento") ||
    texto.includes("ordem")
  ) {
    return "Faltam colunas na tabela materiais_salas. Execute o SQL atualizado e rode notify pgrst, 'reload schema'; no Supabase.";
  }

  return "Nao foi possivel adicionar o material.";
}

function renderizarPlaylistSala(codigoSala) {
  const lista = document.getElementById("salaPlaylistLista");
  if (!lista) return;

  const itens = materiaisDaSala(codigoSala);

  if (!itens.length) {
    lista.innerHTML = `<div class="playlist-vazia">Nenhum material cadastrado para esta sala.</div>`;
    return;
  }

  lista.innerHTML = itens.map((item, index) => `
    <article class="sala-playlist-item" data-id="${escaparHtml(item.id)}" draggable="true">
      <span class="playlist-handle">⋮⋮</span>
      <strong>${index + 1}.</strong>
      <div>
        <h4>${escaparHtml(item.nome || item.arquivo_nome || "Material sem nome")}</h4>
      </div>
      <div class="playlist-datas">
        <time><span>Postagem</span>${escaparHtml(formatarData(item.data_postagem || item.created_at))}</time>
        <time><span>Vencimento</span>${escaparHtml(formatarData(item.data_encerramento || item.data_fim || ""))}</time>
        <time><span>Duração</span>${escaparHtml(normalizarDuracaoMaterial(item.duracao || "00:30") || "00:30")}</time>
      </div>
      <div class="playlist-acoes">
        <button type="button" class="btn-renomear-material" data-id="${escaparHtml(item.id)}">✎</button>
        <button type="button" class="btn-download-material" data-id="${escaparHtml(item.id)}">↓</button>
        <button type="button" class="btn-deletar-material" data-id="${escaparHtml(item.id)}">×</button>
      </div>
    </article>
  `).join("");

  configurarAcoesMateriais();
  configurarOrdenacaoMateriais(codigoSala);
}

function configurarOrdenacaoMateriais(codigoSala) {
  const itens = document.querySelectorAll("#salaPlaylistLista .sala-playlist-item");
  let idArrastado = "";

  itens.forEach(item => {
    item.addEventListener("dragstart", event => {
      idArrastado = item.dataset.id || "";
      item.classList.add("arrastando");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", idArrastado);
    });

    item.addEventListener("dragend", () => {
      item.classList.remove("arrastando");
      itens.forEach(outroItem => outroItem.classList.remove("drag-over"));
    });

    item.addEventListener("dragover", event => {
      event.preventDefault();
      item.classList.add("drag-over");
      event.dataTransfer.dropEffect = "move";
    });

    item.addEventListener("dragleave", () => {
      item.classList.remove("drag-over");
    });

    item.addEventListener("drop", event => {
      event.preventDefault();
      item.classList.remove("drag-over");

      const idOrigem = event.dataTransfer.getData("text/plain") || idArrastado;
      const idDestino = item.dataset.id || "";
      reordenarMaterial(idOrigem, idDestino, codigoSala);
    });
  });
}

async function reordenarMaterial(idOrigem, idDestino, codigoSala) {
  if (!idOrigem || !idDestino || String(idOrigem) === String(idDestino)) return;

  const itens = materiaisDaSala(codigoSala);
  const origemIndex = itens.findIndex(item => String(item.id) === String(idOrigem));
  const destinoIndex = itens.findIndex(item => String(item.id) === String(idDestino));

  if (origemIndex < 0 || destinoIndex < 0) return;

  const [movido] = itens.splice(origemIndex, 1);
  itens.splice(destinoIndex, 0, movido);

  itens.forEach((item, index) => {
    item.ordem = index + 1;
  });

  todosOsMateriais = todosOsMateriais.map(material => {
    const atualizado = itens.find(item => String(item.id) === String(material.id));
    return atualizado ? { ...material, ordem: atualizado.ordem } : material;
  });

  renderizarPlaylistSala(codigoSala);

  try {
    const respostas = await Promise.all(itens.map(item => {
      return supabaseClient
        .from("materiais_salas")
        .update({ ordem: item.ordem })
        .eq("id", item.id);
    }));

    const erro = respostas.find(resposta => resposta.error)?.error;
    if (erro) throw erro;

    sessionStorage.removeItem(CACHE_CENTRAL_KEY);
    mostrarStatusFlutuante("Ordem atualizada");
  } catch (erro) {
    console.error("Erro ao salvar ordem:", erro);
    mostrarStatusFlutuante("Nao foi possivel salvar a ordem", "erro");
  }
}

function configurarAcoesMateriais() {
  document.querySelectorAll(".btn-renomear-material").forEach(botao => {
    botao.addEventListener("click", () => {
      animarBotao(botao);
      editarMaterial(botao.dataset.id);
    });
  });

  document.querySelectorAll(".btn-download-material").forEach(botao => {
    botao.addEventListener("click", () => {
      animarBotao(botao);
      baixarMaterial(botao.dataset.id);
    });
  });

  document.querySelectorAll(".btn-deletar-material").forEach(botao => {
    botao.addEventListener("click", () => {
      animarBotao(botao);
      deletarMaterial(botao.dataset.id);
    });
  });
}

function editarMaterial(id) {
  const material = buscarMaterialPorId(id);
  if (!material) return;

  const nomeAtual = material.nome || material.arquivo_nome || "Material sem nome";
  const duracaoAtual = normalizarDuracaoMaterial(material.duracao || "00:30") || "00:30";
  const vencimentoAtual = dataParaInputData(material.data_encerramento || material.data_fim || "");

  setValor("editMaterialNome", nomeAtual);
  setValor("editMaterialVencimento", vencimentoAtual);
  setValor("editMaterialDuracao", duracaoAtual);

  const modal = document.getElementById("modalEditarMaterial");
  if (modal) {
    modal.dataset.id = String(id);
    modal.hidden = false;
  }
}

function fecharModalEditarMaterial() {
  const modal = document.getElementById("modalEditarMaterial");
  if (!modal) return;

  modal.hidden = true;
  modal.dataset.id = "";
}

async function salvarEdicaoMaterial() {
  const modal = document.getElementById("modalEditarMaterial");
  const id = modal?.dataset.id || "";
  const material = buscarMaterialPorId(id);

  if (!material) return;

  const nomeAtual = material.nome || material.arquivo_nome || "Material sem nome";
  const novoNome = getValor("editMaterialNome") || nomeAtual;
  const vencimento = getValor("editMaterialVencimento");
  const duracao = normalizarDuracaoMaterial(getValor("editMaterialDuracao"));

  if (!vencimento) {
    alert("Informe o vencimento.");
    return;
  }

  if (!duracao) {
    alert("Informe a duração no formato 00:00.");
    return;
  }

  const dadosAtualizados = {
    nome: novoNome.trim(),
    data_encerramento: `${vencimento}T23:59:00`,
    duracao
  };

  try {
    const { error } = await supabaseClient
      .from("materiais_salas")
      .update(dadosAtualizados)
      .eq("id", id);

    if (error) throw error;

    Object.assign(material, dadosAtualizados);
    sessionStorage.removeItem(CACHE_CENTRAL_KEY);

    const codigo = material.codigo_ponto || material.codigo_cliente || salaAtual?.codigo_final || salaAtual?.codigo;
    renderizarPlaylistSala(codigo);
    fecharModalEditarMaterial();
    mostrarStatusFlutuante("Material atualizado");
  } catch (erro) {
    console.error("Erro ao editar material:", erro);
    mostrarStatusFlutuante("Nao foi possivel editar", "erro");
  }
}

function dataParaInputData(valor) {
  if (!valor) return "";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return String(valor).slice(0, 10);
  return data.toISOString().slice(0, 10);
}

function normalizarDataVencimentoMaterial(valor) {
  const texto = String(valor || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return "";

  const data = new Date(`${texto}T23:59:00`);
  if (Number.isNaN(data.getTime())) return "";

  return `${texto}T23:59:00`;
}

async function baixarMaterial(id) {
  const material = buscarMaterialPorId(id);
  if (!material?.arquivo_url) {
    mostrarStatusFlutuante("Arquivo nao encontrado", "erro");
    return;
  }

  try {
    const resposta = await fetch(material.arquivo_url);
    if (!resposta.ok) throw new Error("Arquivo indisponivel");

    const blob = await resposta.blob();
    const url = URL.createObjectURL(blob);
    baixarUrl(url, nomeDownloadMaterial(material));
    URL.revokeObjectURL(url);
    mostrarStatusFlutuante("Download iniciado");
    return;
  } catch (erro) {
    console.error("Erro ao baixar material:", erro);
  }

  baixarUrl(material.arquivo_url, nomeDownloadMaterial(material));
  mostrarStatusFlutuante("Download iniciado");
}

function baixarUrl(url, nomeArquivo) {
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function nomeDownloadMaterial(material) {
  const nome = String(material?.nome || material?.arquivo_nome || "material").trim();
  const arquivoNome = String(material?.arquivo_nome || "").trim();

  if (/\.[a-z0-9]+$/i.test(nome) || !arquivoNome.includes(".")) return nome;

  const extensao = arquivoNome.split(".").pop();
  return `${nome}.${extensao}`;
}

async function deletarMaterial(id) {
  const material = buscarMaterialPorId(id);
  if (!material) return;

  const confirmar = window.confirm("Deseja deletar este arquivo?");
  if (!confirmar) return;

  try {
    const caminhoStorage = caminhoStorageMaterial(material.arquivo_url);

    if (caminhoStorage) {
      await supabaseClient
        .storage
        .from(STORAGE_MATERIAIS_BUCKET)
        .remove([caminhoStorage]);
    }

    const { error } = await supabaseClient
      .from("materiais_salas")
      .delete()
      .eq("id", id);

    if (error) throw error;

    todosOsMateriais = todosOsMateriais.filter(item => String(item.id) !== String(id));
    sessionStorage.removeItem(CACHE_CENTRAL_KEY);

    const codigo = salaAtual?.codigo_final || salaAtual?.codigo || material.codigo_ponto || material.codigo_cliente;
    renderizarPlaylistSala(codigo);
    setTexto("salaTotalMidias", materiaisDaSala(codigo).length);
    mostrarStatusFlutuante("Arquivo deletado");
  } catch (erro) {
    console.error("Erro ao deletar material:", erro);
    mostrarStatusFlutuante("Nao foi possivel deletar", "erro");
  }
}

function animarBotao(botao) {
  if (!botao) return;

  botao.classList.remove("botao-clicado");
  void botao.offsetWidth;
  botao.classList.add("botao-clicado");

  setTimeout(() => {
    botao.classList.remove("botao-clicado");
  }, 420);
}

function buscarMaterialPorId(id) {
  return todosOsMateriais.find(item => String(item.id) === String(id));
}

function renderizarHistoricosSala() {
  const radioTv = document.getElementById("salaRadioTvLista");
  const status = document.getElementById("salaHistoricoStatus");

  if (radioTv) {
    radioTv.innerHTML = `
      <div class="radio-tv-item">
        <strong>1.</strong>
        <span>Nenhum item cadastrado</span>
        <time>Noticias, rodape ou musica</time>
      </div>
    `;
  }

  if (status) {
    const statusAtual = salaAtual?.status_final || "inativo";
    const classe = statusAtual === "ativo" ? "status-ativo" : "status-inativo";
    const texto = statusAtual === "ativo" ? "Ativo" : "Inativo";
    const data = salaAtual?.ultimo_ping_final ? formatarDataHora(salaAtual.ultimo_ping_final) : "Sem conexao registrada";

    status.innerHTML = `
      <div>
        <strong>1.</strong>
        <span class="${classe}">${texto}</span>
        <time>${escaparHtml(data)}</time>
      </div>
    `;
  }
}

function totalTelasPonto(ponto, index) {
  const valor =
    ponto.total_telas ||
    ponto.quantidade_telas ||
    ponto.qtd_telas ||
    ponto.telas ||
    ponto.numero_telas;

  const numero = Number(valor);
  if (Number.isFinite(numero) && numero >= 0) return numero;

  return 0;
}

function totalMidiasPonto(ponto) {
  const valor =
    ponto.total_midias ||
    ponto.quantidade_midias ||
    ponto.qtd_midias ||
    ponto.midias;

  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= 0 ? numero : 0;
}

function playlistsDaSala(codigoSala) {
  const codigoNormalizado = normalizarCodigo(codigoSala);

  return todasAsPlaylists.filter(item => {
    return normalizarCodigo(
      item.codigo_cliente ||
      item.codigo_ponto ||
      item.ponto_codigo ||
      item.codigo ||
      ""
    ) === codigoNormalizado;
  });
}

function materiaisDaSala(codigoSala) {
  const codigoNormalizado = normalizarCodigo(codigoSala);

  return todosOsMateriais
    .filter(item => {
      return normalizarCodigo(
        item.codigo_ponto ||
        item.codigo_cliente ||
        item.ponto_codigo ||
        item.codigo ||
        ""
      ) === codigoNormalizado;
    })
    .sort((a, b) => {
      const ordemA = Number(a.ordem || 0);
      const ordemB = Number(b.ordem || 0);

      if (ordemA !== ordemB) return ordemA - ordemB;

      return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    });
}

function radioTvDaSala(codigoSala) {
  return [];
}

function contarPlaylistsAtivas(playlists) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return playlists.filter(item => {
    const status = String(item.status || "").toLowerCase().trim();
    if (status && status !== "ativo") return false;
    if (!item.data_fim) return true;

    const dataFim = new Date(item.data_fim);
    return !Number.isNaN(dataFim.getTime()) && dataFim >= hoje;
  }).length;
}

function nomePonto(ponto) {
  return ponto.nome || ponto.nome_ponto || ponto.nome_local || ponto.titulo || ponto.codigo_final || "Ponto sem nome";
}

function enderecoPonto(ponto) {
  const cidade = ponto.cidade || ponto.regiao || ponto.bairro || "";
  const endereco = ponto.endereco || ponto.endereco_completo || ponto.localizacao || "";

  if (cidade && endereco) return `${cidade} | ${endereco}`;
  return endereco || cidade || "Endereco nao informado";
}

function imagemPonto(ponto) {
  return ponto.imagem_url ||
    ponto.foto_url ||
    ponto.imagem ||
    ponto.banner_url ||
    "https://placehold.co/900x520/111111/ffffff?text=Sem+imagem";
}

function formatarData(valor) {
  if (!valor) return "";

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return String(valor);

  return data.toLocaleDateString("pt-BR");
}

function formatarDataHora(valor) {
  if (!valor) return "";

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return String(valor);

  return data.toLocaleString("pt-BR");
}

function dataInputLocal(data) {
  const d = new Date(data);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function somarDias(data, dias) {
  const d = new Date(data);
  d.setDate(d.getDate() + dias);
  return d;
}

function nomeArquivoSemExtensao(nome) {
  const texto = String(nome || "Novo material").trim();
  return texto.replace(/\.[^/.]+$/, "") || "Novo material";
}

function tipoArquivoPorNome(nome) {
  const extensao = String(nome || "").split(".").pop().toLowerCase();

  if (["jpg", "jpeg", "png", "gif", "webp"].includes(extensao)) return `image/${extensao === "jpg" ? "jpeg" : extensao}`;
  if (["mp4", "webm", "mov", "m4v"].includes(extensao)) return `video/${extensao}`;
  if (extensao === "txt") return "text/plain";

  return "application/octet-stream";
}

function caminhoStorageMaterial(url) {
  const texto = String(url || "");
  const marcador = `/storage/v1/object/public/${STORAGE_MATERIAIS_BUCKET}/`;
  const indice = texto.indexOf(marcador);

  if (indice === -1) return "";

  return decodeURIComponent(texto.slice(indice + marcador.length));
}

function normalizarCodigo(codigo) {
  return String(codigo || "").trim().toUpperCase();
}

function gerarCodigoPonto() {
  const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let codigo = "";

  for (let i = 0; i < 7; i += 1) {
    codigo += caracteres[Math.floor(Math.random() * caracteres.length)];
  }

  const jaExiste = todosOsPontos.some(ponto => {
    return normalizarCodigo(ponto.codigo_final || ponto.codigo) === codigo;
  });

  return jaExiste ? gerarCodigoPonto() : codigo;
}

function normalizarStatus(status) {
  const s = String(status || "").toLowerCase().trim();

  if (
    s === "ativo" ||
    s === "online" ||
    s === "rodando" ||
    s === "reproduzindo" ||
    s === "conectou"
  ) {
    return "ativo";
  }

  if (s.includes("desativ") || s.includes("indispon")) return "desativado";

  return "inativo";
}

function normalizarStatusCadastro(status) {
  const s = String(status || "").toLowerCase().trim();

  if (s.includes("desativ") || s.includes("indispon")) return "desativado";

  return "cadastrado";
}

function pingRecente(data) {
  if (!data) return false;

  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return false;

  const limiteOffline = 12 * 60 * 1000;
  return Date.now() - d.getTime() <= limiteOffline;
}

function textoStatus(status) {
  if (status === "ativo") return "Ativo";
  if (status === "inativo") return "Inativo";
  return "Inativo";
}

function textoStatusSala(ponto) {
  if (ponto.status_final === "ativo") {
    return ponto.ultimo_ping_final
      ? `Ativo desde ${formatarDataHora(ponto.ultimo_ping_final)}`
      : "Ativo";
  }

  if (ponto.status_final === "desativado") return "Desativado";

  return ponto.ultimo_ping_final
    ? `Inativo desde ${formatarDataHora(ponto.ultimo_ping_final)}`
    : "Inativo - sem conexao";
}

function aplicarClasseStatusSala(status) {
  const badge = document.getElementById("salaStatusTopo");
  if (!badge) return;

  badge.classList.remove("ativo", "inativo", "desativado");
  badge.classList.add(classeStatusVisual(status));
}

function classeStatusVisual(status) {
  if (status === "ativo") return "ativo";
  if (status === "inativo") return "inativo";
  return "desativado";
}

function normalizarBusca(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function setTexto(id, texto) {
  const el = document.getElementById(id);
  if (el) el.textContent = texto;
}

function setValor(id, valor) {
  const el = document.getElementById(id);
  if (el) el.value = valor || "";
}

function getValor(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

async function copiarTexto(texto) {
  const valor = String(texto || "").trim();
  if (!valor) return;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(valor);
    } else {
      const input = document.createElement("textarea");
      input.value = valor;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }

    mostrarStatusFlutuante("Codigo copiado");
  } catch (erro) {
    console.error("Erro ao copiar codigo:", erro);
    mostrarStatusFlutuante("Nao foi possivel copiar o codigo", "erro");
  }
}

function mostrarStatusFlutuante(mensagem, tipo = "ok") {
  let aviso = document.getElementById("statusFlutuante");

  if (!aviso) {
    aviso = document.createElement("div");
    aviso.id = "statusFlutuante";
    aviso.className = "status-flutuante";
    document.body.appendChild(aviso);
  }

  aviso.textContent = mensagem;
  aviso.className = `status-flutuante ativo ${tipo}`;

  clearTimeout(mostrarStatusFlutuante.timer);
  mostrarStatusFlutuante.timer = setTimeout(() => {
    aviso.classList.remove("ativo");
  }, 1800);
}

function escaparHtml(valor) {
  return String(valor || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
