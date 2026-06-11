const SUPABASE_URL = "https://niqyhaiytiusvyspjsld.supabase.co";
const SUPABASE_KEY = "sb_publishable_O6vm7g-Xiv4COo1mNHCBAw_jgEJbSDI";
const SENHA_PAINEL = "test1";

const CACHE_CENTRAL_KEY = "central_painel_cache_v7";
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
let grupoAtual = null;
let imagemSalaSelecionada = null;
let materialSalaSelecionado = null;
let pastaEditando = null;
let origemBibliotecaSala = "biblioteca";
let itemBibliotecaSelecionado = null;
let itensBibliotecaSala = [];
let itensRadioTvSala = [];
let todosRadioTvSalas = [];

document.addEventListener("DOMContentLoaded", () => {
  iniciarLoginCentral();
  configurarFiltros();
  configurarLogout();
  configurarVoltarSala();
  configurarEdicaoSala();
  configurarNovoPonto();
  configurarAdicionarMaterial();
  configurarCopiarCodigoSala();
  configurarModalPasta();
  configurarBibliotecaSala();
  atualizarRotuloBotaoNovo();
});

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
  ["buscaPontos", "filtroStatus", "ordenarPontos"].forEach(id => {
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

    const listaPontos = document.getElementById("listaPontos");
    if (listaPontos) listaPontos.hidden = false;

    // Se a TV foi aberta de dentro de uma pasta, volta para essa pasta.
    // Se não tiver pasta atual, volta para a tela geral.
    atualizarRotuloBotaoNovo();
    atualizarPainelFiltrado();
  });
}

function configurarEdicaoSala() {
  const btnEditar = document.getElementById("btnEditarSala");
  const btnFechar = document.getElementById("btnFecharEditarSala");
  const btnCancelar = document.getElementById("btnCancelarEditarSala");
  const btnSalvar = document.getElementById("btnSalvarEditarSala");
  const btnApagar = document.getElementById("btnApagarSala");
  const inputImagem = document.getElementById("editSalaImagem");
  const btnAlterarImagem = document.getElementById("btnAlterarImagemSala");
  const inputArquivoImagem = document.getElementById("inputImagemSala");

  if (btnEditar) btnEditar.addEventListener("click", abrirModalEditarSala);
  if (btnFechar) btnFechar.addEventListener("click", fecharModalEditarSala);
  if (btnCancelar) btnCancelar.addEventListener("click", fecharModalEditarSala);
  if (btnSalvar) btnSalvar.addEventListener("click", salvarEdicaoSala);
  if (btnApagar) btnApagar.addEventListener("click", apagarSalaAtual);
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
  if (grupoAtual) {
    return criarNovoPontoDentroDaPasta();
  }

  return criarNovaPasta();
}

async function criarNovaPasta() {
  const btnNovoPonto = document.getElementById("btnNovoPonto");
  const textoOriginal = btnNovoPonto ? btnNovoPonto.innerHTML : "";

  const nome = window.prompt("Nome da nova pasta/sala:", "Nova sala");
  if (nome === null) return;

  const nomeFinal = nome.trim() || "Nova sala";
  const predio = window.prompt("Subtexto / prédio:", "Prédio não informado");
  if (predio === null) return;

  const codigo = `PASTA_${gerarCodigoPonto()}`;

  const novaPasta = {
    codigo,
    nome: nomeFinal,
    grupo_nome: nomeFinal,
    predio: predio.trim() || "Prédio não informado",
    endereco: predio.trim() || "Prédio não informado",
    imagem_url: "",
    status: "pasta",
    tipo_ponto: "pasta",
    total_telas: 0,
    disponivel: true,
    eh_pasta: true
  };

  if (btnNovoPonto) {
    btnNovoPonto.disabled = true;
    btnNovoPonto.innerHTML = "<span>+</span> Criando...";
  }

  try {
    const { data, error } = await supabaseClient
      .from(TABELA_SALAS)
      .insert(novaPasta)
      .select("*")
      .single();

    if (error) throw error;

    const pastaCriada = combinarPontosComStatus([data || novaPasta])[0];

    todosOsPontos = [pastaCriada, ...todosOsPontos];
    sessionStorage.removeItem(CACHE_CENTRAL_KEY);
    atualizarPainelFiltrado();
  } catch (erro) {
    console.error("Erro ao criar pasta:", erro);
    alert(mensagemErroNovoPonto(erro));
  } finally {
    if (btnNovoPonto) {
      btnNovoPonto.disabled = false;
      btnNovoPonto.innerHTML = textoOriginal || "<span>+</span> Nova pasta";
    }
  }
}

async function criarNovoPontoDentroDaPasta() {
  if (!grupoAtual) return criarNovaPasta();

  const btnNovoPonto = document.getElementById("btnNovoPonto");
  const textoOriginal = btnNovoPonto ? btnNovoPonto.innerHTML : "";
  const codigo = gerarCodigoPonto();
  const totalAtual = todosOsPontos.filter(ponto => !ehRegistroPasta(ponto) && chaveGrupoPonto(ponto) === grupoAtual.chave).length;

  const novoPonto = {
    codigo,
    nome: `TV ${String(totalAtual + 1).padStart(2, "0")}`,
    grupo_nome: grupoAtual.nome,
    predio: grupoAtual.predio,
    endereco: grupoAtual.predio,
    imagem_url: "",
    status: "cadastrado",
    tipo_ponto: "sala",
    total_telas: 0,
    disponivel: true,
    eh_pasta: false
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

    const pontosDoGrupo = todosOsPontos.filter(ponto => !ehRegistroPasta(ponto) && chaveGrupoPonto(ponto) === grupoAtual.chave);
    renderizarTvsDoGrupo(grupoAtual, pontosDoGrupo);
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

async function confirmarAdicionarMaterial() {
  if (!materialSalaSelecionado) {
    alert("Selecione um arquivo para adicionar.");
    return;
  }

  const dataPostagem = getValor("materialDataPostagem");
  const dataEncerramento = getValor("materialDataEncerramento");

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

    let radiotvSalas = [];

    const respostaRadioTvSalas = await supabaseClient
      .from("radiotv_salas")
      .select("*, radiotv:radiotv_id(*)");

    if (respostaRadioTvSalas.error) {
      console.warn("RadioTV vinculado nao carregou:", respostaRadioTvSalas.error);
    } else {
      radiotvSalas = respostaRadioTvSalas.data || [];
    }

    const dados = {
      pontos: pontos || [],
      status,
      playlists,
      materiais,
      radiotvSalas
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
  const radiotvSalas = dados?.radiotvSalas || [];

  todasAsPlaylists = playlists;
  todosOsMateriais = materiais;
  todosRadioTvSalas = radiotvSalas;
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
    const texto = normalizarBusca(`${nomePonto(ponto)} ${nomeGrupoPonto(ponto)} ${predioPonto(ponto)} ${enderecoPonto(ponto)} ${ponto.cidade || ""} ${ponto.codigo_final || ""}`);
    const combinaBusca = !busca || texto.includes(busca);
    const combinaStatus = filtroStatus === "todos" || ponto.status_final === filtroStatus;
    return combinaBusca && combinaStatus;
  });

  pontos = ordenarPontos(pontos, ordenar);
  atualizarResumo(todosOsPontos);

  if (grupoAtual) {
    const pontosDoGrupo = pontos.filter(ponto => !ehRegistroPasta(ponto) && chaveGrupoPonto(ponto) === grupoAtual.chave);
    renderizarTvsDoGrupo(grupoAtual, pontosDoGrupo);
  } else {
    renderizarGrupos(pontos);
  }
}

function atualizarResumo(pontos) {
  const pontosReais = pontos.filter(p => !ehRegistroPasta(p));
  const total = pontosReais.length;
  const ativos = pontosReais.filter(p => p.status_final === "ativo").length;
  const inativos = pontosReais.filter(p => p.status_final !== "ativo").length;

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
  renderizarGrupos(pontos);
}

function renderizarGrupos(pontos) {
  const lista = document.getElementById("listaPontos");
  if (!lista) return;

  grupoAtual = null;
  lista.innerHTML = "";

  if (!pontos.length) {
    lista.innerHTML = `<div class="empty-state">Nenhuma sala encontrada.</div>`;
    return;
  }

  const grupos = agruparPontosPorSala(pontos);

  grupos.forEach(grupo => {
    const imagem = imagemPonto(grupo.pontos[0]);
    const totalTvs = grupo.pontos.length;
    lista.innerHTML += `
      <article class="point-card pasta-card" data-grupo="${escaparHtml(grupo.chave)}">
        <div class="card-topo">
          <span class="status-pill pasta-pill">Pasta</span>
          <span class="telas-topo">${totalTvs} ${totalTvs === 1 ? "TV" : "TVs"}</span>
        </div>

        <img src="${escaparHtml(imagem)}" alt="${escaparHtml(grupo.nome)}" loading="lazy">

        <h3 class="pasta-titulo">${escaparHtml(grupo.nome)}</h3>

        <div class="card-info">
          <p class="pasta-subtexto">${escaparHtml(grupo.predio)}</p>
          <span class="codigo-pill">Pasta</span>
        </div>

        <button class="btn-abrir-grupo" type="button" data-grupo="${escaparHtml(grupo.chave)}">
          <span>Entrar na sala</span>
          <strong>→</strong>
        </button>
      </article>
    `;
  });

  lista.querySelectorAll(".btn-abrir-grupo").forEach(botao => {
    botao.addEventListener("click", () => {
      const chave = botao.dataset.grupo || "";
      const grupo = grupos.find(item => item.chave === chave);
      if (!grupo) return;
      grupoAtual = { chave: grupo.chave, nome: grupo.nome, predio: grupo.predio };
      renderizarTvsDoGrupo(grupoAtual, grupo.pontos);
      atualizarRotuloBotaoNovo();
    });
  });


}

function renderizarTvsDoGrupo(grupo, pontos) {
  const lista = document.getElementById("listaPontos");
  if (!lista) return;

  const pontosOrdenados = ordenarPontos(pontos, document.getElementById("ordenarPontos")?.value || "nome");

  lista.innerHTML = `
    <div class="grupo-topbar">
      <button type="button" id="btnVoltarGrupos" class="btn-voltar-grupos">Voltar</button>
      <div class="grupo-topbar-textos" id="btnEditarPastaTopbar" title="Editar nome e subtexto da pasta">
        <h2>${escaparHtml(grupo.nome)}</h2>
        <p>${escaparHtml(grupo.predio)}</p>
      </div>
      <div class="grupo-topbar-acoes">
        <button type="button" id="btnEditarPastaGrupo">Editar pasta</button>
        <strong>${pontosOrdenados.length} ${pontosOrdenados.length === 1 ? "TV" : "TVs"}</strong>
      </div>
    </div>
  `;

  if (!pontosOrdenados.length) {
    lista.innerHTML += `<div class="empty-state">Nenhuma TV encontrada nesta sala.</div>`;
  }

  pontosOrdenados.forEach((ponto, index) => {
    const nome = nomeTvPonto(ponto, index);
    const status = ponto.status_final;
    const imagem = imagemPonto(ponto);
    const codigo = ponto.codigo_final || "------";
    const midias = materiaisDaSala(codigo).length;

    lista.innerHTML += `
      <article class="point-card tv-card" data-codigo="${escaparHtml(codigo)}">
        <div class="card-topo">
          <span class="status-pill ${classeStatusVisual(status)}">${textoStatus(status)}</span>
        </div>

        <img src="${escaparHtml(imagem)}" alt="${escaparHtml(nome)}" loading="lazy">

        <h3>${escaparHtml(nome)}</h3>

        <div class="card-info">
          <p>${escaparHtml(grupo.nome)}</p>
          <span class="codigo-pill">${escaparHtml(codigo)}</span>
        </div>

        <button class="btn-detalhes" type="button" data-codigo="${escaparHtml(codigo)}">
          <span>Abrir playlist</span>
          <strong>→</strong>
        </button>
      </article>
    `;
  });

  document.getElementById("btnVoltarGrupos")?.addEventListener("click", () => {
    grupoAtual = null;
    atualizarRotuloBotaoNovo();
    atualizarPainelFiltrado();
  });

  document.getElementById("btnEditarPastaTopbar")?.addEventListener("click", () => abrirModalEditarPasta(grupo));
  document.getElementById("btnEditarPastaGrupo")?.addEventListener("click", () => abrirModalEditarPasta(grupo));

  lista.querySelectorAll(".btn-detalhes").forEach(botao => {
    botao.addEventListener("click", () => {
      const codigo = botao.dataset.codigo || "";
      const ponto = todosOsPontos.find(item => normalizarCodigo(item.codigo_final) === normalizarCodigo(codigo));
      if (ponto) abrirSala(ponto);
    });
  });
}

function agruparPontosPorSala(pontos) {
  const mapa = new Map();

  pontos.forEach(ponto => {
    const chave = chaveGrupoPonto(ponto);
    const nome = nomeGrupoPonto(ponto);
    const predio = predioPonto(ponto);

    if (!mapa.has(chave)) {
      mapa.set(chave, {
        chave,
        nome,
        predio,
        pasta: null,
        pontos: []
      });
    }

    const grupo = mapa.get(chave);

    if (ehRegistroPasta(ponto)) {
      grupo.pasta = ponto;
      grupo.nome = nome;
      grupo.predio = predio;
    } else {
      grupo.pontos.push(ponto);
    }
  });

  return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function ehRegistroPasta(ponto) {
  const codigo = String(ponto?.codigo_final || ponto?.codigo || "").toUpperCase();
  return ponto?.eh_pasta === true || ponto?.tipo_ponto === "pasta" || codigo.startsWith("PASTA_") || codigo.startsWith("PASTA-");
}

function chaveGrupoPonto(ponto) {
  return normalizarBusca(`${nomeGrupoPonto(ponto)}-${predioPonto(ponto)}`);
}

function nomeGrupoPonto(ponto) {
  const direto = ponto.grupo_nome || ponto.nome_grupo || ponto.pasta_nome || ponto.sala_nome || ponto.nome_sala || ponto.predio_sala;
  if (direto) return String(direto).trim();

  const nome = nomePonto(ponto);
  return nome
    .replace(/TV\s*\d+/ig, "")
    .replace(/0?\d+$/g, "")
    .replace(/[\-_]+$/g, "")
    .trim() || nome;
}

function predioPonto(ponto) {
  return ponto.predio || ponto.nome_predio || ponto.bloco || ponto.endereco || ponto.endereco_completo || "Prédio não informado";
}

function nomeTvPonto(ponto, index = 0) {
  return ponto.tv_nome || ponto.nome_tv || ponto.sub_sala || ponto.apelido_tv || ponto.nome || ponto.nome_ponto || `TV ${String(index + 1).padStart(2, "0")}`;
}

function abrirSala(ponto) {
  salaAtual = ponto;

  const nome = nomePonto(ponto);
  const endereco = grupoAtual?.nome || nomeGrupoPonto(ponto) || enderecoPonto(ponto);
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

  setValor("editSalaNome", nomeTvPonto(salaAtual));
  setValor("editSalaEndereco", predioPonto(salaAtual)); // oculto: subtitulo do ponto vem da pasta
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
  const grupoNomeFixo = nomeGrupoPonto(salaAtual);
  const endereco = predioPonto(salaAtual);

  const dadosAtualizados = {
    nome,
    endereco,
    grupo_nome: grupoNomeFixo,
    predio: endereco
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
      grupo_nome: dadosAtualizados.grupo_nome,
      predio: dadosAtualizados.predio,
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
        endereco_completo: dadosAtualizados.endereco,
        grupo_nome: dadosAtualizados.grupo_nome,
        predio: dadosAtualizados.predio
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
      renomearMaterial(botao.dataset.id);
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

async function renomearMaterial(id) {
  const material = buscarMaterialPorId(id);
  if (!material) return;

  const nomeAtual = material.nome || material.arquivo_nome || "Material sem nome";
  const novoNome = window.prompt("Novo nome do arquivo:", nomeAtual);
  if (!novoNome || novoNome.trim() === nomeAtual) return;

  try {
    const { error } = await supabaseClient
      .from("materiais_salas")
      .update({ nome: novoNome.trim() })
      .eq("id", id);

    if (error) throw error;

    material.nome = novoNome.trim();
    sessionStorage.removeItem(CACHE_CENTRAL_KEY);
    renderizarPlaylistSala(material.codigo_ponto || material.codigo_cliente || salaAtual?.codigo_final || salaAtual?.codigo);
    mostrarStatusFlutuante("Nome atualizado");
  } catch (erro) {
    console.error("Erro ao renomear material:", erro);
    mostrarStatusFlutuante("Nao foi possivel renomear", "erro");
  }
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
    const codigo = salaAtual?.codigo_final || salaAtual?.codigo || "";
    const itens = radioTvDaSala(codigo);

    if (!itens.length) {
      radioTv.innerHTML = `
        <div class="radio-tv-item">
          <strong>1.</strong>
          <span>Nenhum item cadastrado</span>
          <time>Noticias, rodape ou musica</time>
        </div>
      `;
    } else {
      radioTv.innerHTML = itens.map((vinculo, index) => {
        const item = vinculo.radiotv || vinculo;
        const nome = item.tipo === "aviso"
          ? `Aviso: ${item.titulo || item.texto_aviso || "Sem titulo"}`
          : item.tipo === "youtube_live"
            ? "YouTube ao vivo"
            : `${item.artista || ""} ${item.artista ? "—" : ""} ${item.titulo || "RadioTV"}`.trim();

        const tipo = item.tipo === "aviso" ? "Rodape" : item.tipo === "youtube_live" ? "Tela cheia" : (item.site || item.tipo || "RadioTV");

        return `
          <div class="radio-tv-item">
            <strong>${index + 1}.</strong>
            <span>${escaparHtml(nome)}</span>
            <time>${escaparHtml(tipo)}</time>
          </div>
        `;
      }).join("");
    }
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
  const codigoNormalizado = normalizarCodigo(codigoSala);

  return todosRadioTvSalas.filter(item => {
    return normalizarCodigo(item.codigo_ponto || item.codigo_cliente || item.ponto_codigo || item.codigo || "") === codigoNormalizado;
  });
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

  const limiteOffline = 5 * 60 * 1000;
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


function atualizarRotuloBotaoNovo() {
  const btn = document.getElementById("btnNovoPonto");
  if (!btn) return;
  btn.innerHTML = grupoAtual ? "<span>+</span> Novo ponto" : "<span>+</span> Nova pasta";
}

function configurarModalPasta() {
  document.getElementById("btnFecharEditarPasta")?.addEventListener("click", fecharModalEditarPasta);
  document.getElementById("btnCancelarEditarPasta")?.addEventListener("click", fecharModalEditarPasta);
  document.getElementById("btnSalvarEditarPasta")?.addEventListener("click", salvarEdicaoPasta);
  document.getElementById("btnApagarPasta")?.addEventListener("click", apagarPastaAtual);
}

function abrirModalEditarPasta(grupo) {
  pastaEditando = grupo;
  setValor("editPastaNome", grupo.nome || "");
  setValor("editPastaPredio", grupo.predio || "");
  const modal = document.getElementById("modalEditarPasta");
  if (modal) modal.hidden = false;
}

function fecharModalEditarPasta() {
  pastaEditando = null;
  const modal = document.getElementById("modalEditarPasta");
  if (modal) modal.hidden = true;
}

async function salvarEdicaoPasta() {
  if (!pastaEditando) return;

  const nome = getValor("editPastaNome") || pastaEditando.nome;
  const predio = getValor("editPastaPredio") || pastaEditando.predio;

  const registrosGrupo = todosOsPontos.filter(ponto => chaveGrupoPonto(ponto) === pastaEditando.chave);
  const codigos = registrosGrupo.map(ponto => ponto.codigo_final || ponto.codigo).filter(Boolean);

  try {
    const { error } = await supabaseClient
      .from(TABELA_SALAS)
      .update({ grupo_nome: nome, predio, endereco: predio })
      .in("codigo", codigos);

    if (error) throw error;

    todosOsPontos = todosOsPontos.map(ponto => {
      if (!codigos.includes(ponto.codigo_final || ponto.codigo)) return ponto;
      return { ...ponto, grupo_nome: nome, predio, endereco: predio };
    });

    if (grupoAtual && grupoAtual.chave === pastaEditando.chave) {
      grupoAtual = { chave: normalizarBusca(`${nome}-${predio}`), nome, predio };
    }

    sessionStorage.removeItem(CACHE_CENTRAL_KEY);
    fecharModalEditarPasta();
    atualizarPainelFiltrado();
  } catch (erro) {
    console.error("Erro ao editar pasta:", erro);
    alert("Não foi possível editar a pasta.");
  }
}

async function apagarPastaAtual() {
  if (!pastaEditando) return;

  const registrosGrupo = todosOsPontos.filter(ponto => chaveGrupoPonto(ponto) === pastaEditando.chave);
  const codigos = registrosGrupo.map(ponto => ponto.codigo_final || ponto.codigo).filter(Boolean);
  const totalTvs = registrosGrupo.filter(ponto => !ehRegistroPasta(ponto)).length;

  const confirmar = window.confirm(`Apagar a pasta "${pastaEditando.nome}"?\n\nIsso também remove ${totalTvs} TV(s) desta pasta.`);
  if (!confirmar) return;

  try {
    const { error } = await supabaseClient
      .from(TABELA_SALAS)
      .delete()
      .in("codigo", codigos);

    if (error) throw error;

    todosOsPontos = todosOsPontos.filter(ponto => !codigos.includes(ponto.codigo_final || ponto.codigo));
    grupoAtual = null;
    sessionStorage.removeItem(CACHE_CENTRAL_KEY);
    fecharModalEditarPasta();
    atualizarRotuloBotaoNovo();
    atualizarPainelFiltrado();
  } catch (erro) {
    console.error("Erro ao apagar pasta:", erro);
    alert("Não foi possível apagar a pasta.");
  }
}



async function apagarSalaAtual() {
  if (!salaAtual) return;

  const codigo = salaAtual.codigo_final || salaAtual.codigo;
  const nome = nomeTvPonto(salaAtual) || salaAtual.nome || codigo;

  const confirmar = window.confirm(`Apagar o ponto "${nome}"?\n\nA playlist vinculada a este ponto também deixará de aparecer no painel.`);
  if (!confirmar) return;

  try {
    const { error } = await supabaseClient
      .from(TABELA_SALAS)
      .delete()
      .eq("codigo", codigo);

    if (error) throw error;

    todosOsPontos = todosOsPontos.filter(item => normalizarCodigo(item.codigo_final || item.codigo) !== normalizarCodigo(codigo));
    sessionStorage.removeItem(CACHE_CENTRAL_KEY);
    fecharModalEditarSala();

    document.body.classList.remove("modo-sala");
    const salaDetalhe = document.getElementById("salaDetalhe");
    if (salaDetalhe) salaDetalhe.hidden = true;

    if (grupoAtual) {
      const pontosDoGrupo = todosOsPontos.filter(item => !ehRegistroPasta(item) && chaveGrupoPonto(item) === grupoAtual.chave);
      renderizarTvsDoGrupo(grupoAtual, pontosDoGrupo);
    } else {
      atualizarPainelFiltrado();
    }
  } catch (erro) {
    console.error("Erro ao apagar ponto:", erro);
    alert("Não foi possível apagar este ponto.");
  }
}

async function deletarTvGrupo(codigo) {
  if (!codigo) return;

  const ponto = todosOsPontos.find(item => normalizarCodigo(item.codigo_final || item.codigo) === normalizarCodigo(codigo));
  const nome = ponto ? (nomeTvPonto(ponto) || ponto.nome || codigo) : codigo;

  const confirmar = window.confirm(`Deseja apagar a TV "${nome}"?

A playlist vinculada a esta TV também deixará de aparecer no painel.`);
  if (!confirmar) return;

  try {
    const { error } = await supabaseClient
      .from(TABELA_SALAS)
      .delete()
      .eq("codigo", codigo);

    if (error) throw error;

    todosOsPontos = todosOsPontos.filter(item => normalizarCodigo(item.codigo_final || item.codigo) !== normalizarCodigo(codigo));
    sessionStorage.removeItem(CACHE_CENTRAL_KEY);

    if (grupoAtual) {
      const pontosDoGrupo = todosOsPontos.filter(item => !ehRegistroPasta(item) && chaveGrupoPonto(item) === grupoAtual.chave);
      renderizarTvsDoGrupo(grupoAtual, pontosDoGrupo);
    } else {
      atualizarPainelFiltrado();
    }
  } catch (erro) {
    console.error("Erro ao apagar TV:", erro);
    alert("Não foi possível apagar esta TV.");
  }
}

function configurarBibliotecaSala() {
  document.getElementById("btnAbrirBibliotecaSala")?.addEventListener("click", abrirModalBibliotecaSala);
  document.getElementById("btnFecharBibliotecaSala")?.addEventListener("click", fecharModalBibliotecaSala);
  document.getElementById("btnCancelarBibliotecaSala")?.addEventListener("click", fecharModalBibliotecaSala);
  document.getElementById("btnConfirmarBibliotecaSala")?.addEventListener("click", adicionarItemBibliotecaNaSala);
  document.getElementById("buscaBibliotecaSala")?.addEventListener("input", renderizarListaBibliotecaSala);

  document.querySelectorAll(".biblioteca-tabs button").forEach(botao => {
    botao.addEventListener("click", () => {
      origemBibliotecaSala = botao.dataset.origem || "biblioteca";
      document.querySelectorAll(".biblioteca-tabs button").forEach(b => b.classList.remove("ativo"));
      botao.classList.add("ativo");
      itemBibliotecaSelecionado = null;
      renderizarListaBibliotecaSala();
    });
  });
}

async function abrirModalBibliotecaSala() {
  if (!salaAtual) {
    alert("Abra uma TV antes de adicionar itens da biblioteca.");
    return;
  }

  const modal = document.getElementById("modalBibliotecaSala");
  if (modal) modal.hidden = false;

  renderizarDestinosBibliotecaSala();

  try {
    const [bib, radio] = await Promise.all([
      supabaseClient.from("biblioteca").select("*").order("created_at", { ascending: false }),
      supabaseClient.from("radiotv").select("*").order("created_at", { ascending: false })
    ]);

    if (!bib.error) itensBibliotecaSala = bib.data || [];
    if (!radio.error) itensRadioTvSala = radio.data || [];

    renderizarListaBibliotecaSala();
  } catch (erro) {
    console.error("Erro ao carregar biblioteca/RadioTV:", erro);
    renderizarListaBibliotecaSala();
  }
}

function fecharModalBibliotecaSala() {
  itemBibliotecaSelecionado = null;
  setValor("buscaBibliotecaSala", "");
  const modal = document.getElementById("modalBibliotecaSala");
  if (modal) modal.hidden = true;
}

function renderizarListaBibliotecaSala() {
  const lista = document.getElementById("listaBibliotecaSala");
  if (!lista) return;

  const busca = normalizarBusca(getValor("buscaBibliotecaSala"));
  const itens = origemBibliotecaSala === "biblioteca" ? itensBibliotecaSala : itensRadioTvSala;

  const filtrados = itens.filter(item => {
    const texto = normalizarBusca(`${item.nome || ""} ${item.titulo || ""} ${item.artista || ""} ${item.site || ""} ${item.arquivo_nome || ""} ${item.tipo || ""}`);
    return !busca || texto.includes(busca);
  });

  if (!filtrados.length) {
    lista.innerHTML = `<div class="playlist-vazia">Nenhum item encontrado.</div>`;
    return;
  }

  lista.innerHTML = filtrados.map(item => {
    const id = String(item.id);
    const nome = origemBibliotecaSala === "biblioteca"
      ? (item.nome || item.arquivo_nome || "Arquivo")
      : (item.tipo === "musica" || item.tipo === "link_externo" ? `${item.artista || ""} — ${item.titulo || ""}` : item.titulo || item.texto_aviso || "RadioTV");
    const sub = origemBibliotecaSala === "biblioteca"
      ? (item.tipo || item.arquivo_nome || "Biblioteca")
      : (item.site || item.tipo || "RadioTV");

    return `
      <button type="button" class="biblioteca-item-select ${itemBibliotecaSelecionado?.id == item.id ? "selecionado" : ""}" data-id="${escaparHtml(id)}">
        <strong>${escaparHtml(nome)}</strong>
        <span>${escaparHtml(sub)}</span>
      </button>
    `;
  }).join("");

  lista.querySelectorAll(".biblioteca-item-select").forEach(botao => {
    botao.addEventListener("click", () => {
      const id = botao.dataset.id || "";
      itemBibliotecaSelecionado = filtrados.find(item => String(item.id) === String(id));
      renderizarListaBibliotecaSala();
    });
  });
}

function renderizarDestinosBibliotecaSala() {
  const container = document.getElementById("bibliotecaSalasExtras");
  if (!container || !salaAtual) return;

  const codigoAtual = normalizarCodigo(salaAtual.codigo_final || salaAtual.codigo || "");
  const chave = chaveGrupoPonto(salaAtual);
  const tvsDaPasta = todosOsPontos.filter(ponto => !ehRegistroPasta(ponto) && chaveGrupoPonto(ponto) === chave && normalizarCodigo(ponto.codigo_final || ponto.codigo || "") !== codigoAtual);

  if (!tvsDaPasta.length) {
    container.innerHTML = `<div class="material-salas-vazia">Nenhuma outra TV nesta sala.</div>`;
    return;
  }

  container.innerHTML = tvsDaPasta.map(ponto => {
    const codigo = ponto.codigo_final || ponto.codigo || "";
    return `
      <label>
        <input type="checkbox" value="${escaparHtml(codigo)}">
        <strong>${escaparHtml(nomeTvPonto(ponto))}</strong>
        <span>${escaparHtml(codigo)}</span>
      </label>
    `;
  }).join("");
}

function codigosDestinoBibliotecaSala(codigoAtual) {
  const codigos = [codigoAtual];
  document.querySelectorAll("#bibliotecaSalasExtras input:checked").forEach(input => {
    const codigo = String(input.value || "").trim();
    if (codigo && !codigos.includes(codigo)) codigos.push(codigo);
  });
  return codigos;
}

async function adicionarItemBibliotecaNaSala() {
  if (!salaAtual || !itemBibliotecaSelecionado) {
    alert("Selecione um item para adicionar.");
    return;
  }

  const codigoAtual = salaAtual.codigo_final || salaAtual.codigo;
  const destinos = codigosDestinoBibliotecaSala(codigoAtual);

  try {
    if (origemBibliotecaSala === "radiotv") {
      const registrosRadioTv = destinos.map(codigo => ({
        codigo_ponto: codigo,
        radiotv_id: itemBibliotecaSelecionado.id,
        ativo: true
      }));

      const { data, error } = await supabaseClient
        .from("radiotv_salas")
        .insert(registrosRadioTv)
        .select("*, radiotv:radiotv_id(*)");

      if (error) throw error;

      todosRadioTvSalas = [...(data || registrosRadioTv), ...todosRadioTvSalas];
      sessionStorage.removeItem(CACHE_CENTRAL_KEY);
      renderizarHistoricosSala();
      setTexto("salaTotalRadioTv", radioTvDaSala(codigoAtual).length);
      fecharModalBibliotecaSala();
      return;
    }

    const nome = itemBibliotecaSelecionado.nome || itemBibliotecaSelecionado.arquivo_nome || "Arquivo da biblioteca";
    const url = itemBibliotecaSelecionado.arquivo_url || itemBibliotecaSelecionado.capa_url || "";
    const tipo = `biblioteca_${itemBibliotecaSelecionado.tipo || "arquivo"}`;

    const registros = destinos.map(codigo => ({
      codigo_ponto: codigo,
      nome: nome.trim() || "Item selecionado",
      arquivo_url: url,
      arquivo_nome: itemBibliotecaSelecionado.arquivo_nome || nome,
      arquivo_tipo: tipo,
      arquivo_tamanho: itemBibliotecaSelecionado.arquivo_tamanho || 0,
      data_postagem: new Date().toISOString(),
      data_encerramento: null,
      status: "ativo",
      ordem: materiaisDaSala(codigo).length + 1
    }));

    const { data, error } = await supabaseClient
      .from("materiais_salas")
      .insert(registros)
      .select("*");

    if (error) throw error;

    todosOsMateriais = [...(data || registros), ...todosOsMateriais];
    sessionStorage.removeItem(CACHE_CENTRAL_KEY);
    renderizarPlaylistSala(codigoAtual);
    setTexto("salaTotalMidias", materiaisDaSala(codigoAtual).length);
    fecharModalBibliotecaSala();
  } catch (erro) {
    console.error("Erro ao adicionar item selecionado:", erro);
    alert(origemBibliotecaSala === "radiotv"
      ? "Não foi possível vincular este item do RadioTV. Confira se a tabela radiotv_salas foi criada."
      : "Não foi possível adicionar este item na TV.");
  }
}

