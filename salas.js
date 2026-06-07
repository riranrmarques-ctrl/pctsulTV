const SUPABASE_URL = "https://niqyhaiytiusvyspjsld.supabase.co";
const SUPABASE_KEY = "sb_publishable_O6vm7g-Xiv4COo1mNHCBAw_jgEJbSDI";
const SENHA_PAINEL = "@helena";

const CACHE_CENTRAL_KEY = "central_painel_cache_v4";
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

document.addEventListener("DOMContentLoaded", () => {
  iniciarLoginCentral();
  configurarFiltros();
  configurarLogout();
  configurarVoltarSala();
  configurarEdicaoSala();
  configurarNovoPonto();
  configurarAdicionarMaterial();
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

    adicionarMaterialSala(arquivo).finally(() => {
      inputMaterialSala.value = "";
    });
  });
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
    status: "ativo",
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

    const novoMaterial = {
      codigo_ponto: codigo,
      nome: nomeArquivoSemExtensao(arquivo.name),
      arquivo_url: arquivoUrl,
      arquivo_nome: arquivo.name,
      arquivo_tipo: arquivo.type || tipoArquivoPorNome(arquivo.name),
      arquivo_tamanho: arquivo.size || 0,
      status: "ativo"
    };

    const { data, error } = await supabaseClient
      .from("materiais_salas")
      .insert(novoMaterial)
      .select("*")
      .single();

    if (error) throw error;

    todosOsMateriais = [data || novoMaterial, ...todosOsMateriais];
    sessionStorage.removeItem(CACHE_CENTRAL_KEY);

    renderizarPlaylistSala(codigo);
    setTexto("salaTotalMidias", materiaisDaSala(codigo).length);
    setTexto("salaTotalPlaylists", playlistsDaSala(codigo).length);
    atualizarResumo(todosOsPontos);
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
  const playlists = dados?.playlists || [];
  const materiais = dados?.materiais || [];

  todasAsPlaylists = playlists;
  todosOsMateriais = materiais;
  playlistsAtivas = contarPlaylistsAtivas(playlists);
  todosOsPontos = combinarPontosComStatus(pontos);
  atualizarPainelFiltrado();
}

function combinarPontosComStatus(pontos) {
  const statusPorCodigo = {};

  return pontos.map(ponto => {
    const codigoPonto = normalizarCodigo(ponto.codigo || ponto.codigo_ponto || ponto.ponto_codigo || ponto.codigo_final || "");
    const statusEncontrado = statusPorCodigo[codigoPonto];

    const pontoIndisponivel =
      ponto.disponivel === false ||
      ponto.indisponivel === true ||
      String(ponto.disponivel || "").toLowerCase().trim() === "false" ||
      String(ponto.status_disponibilidade || "").toLowerCase().includes("indispon");

    const statusCadastro = normalizarStatus(ponto.status || ponto.status_final || "");
    const statusAtual = normalizarStatus(statusEncontrado?.status || statusEncontrado?.evento || statusCadastro);

    return {
      ...ponto,
      codigo_final: codigoPonto,
      status_final: pontoIndisponivel || statusCadastro === "desativado" ? "desativado" : statusAtual,
      ultimo_ping_final: statusEncontrado?.ultimo_ping || statusEncontrado?.data_hora || ponto.ultimo_ping || ponto.updated_at || ponto.created_at || null
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
  const status = textoStatus(ponto.status_final);
  const agora = new Date().toLocaleString("pt-BR");

  setTexto("salaTitulo", nome);
  setTexto("salaEndereco", endereco);
  setTexto("salaCodigo", codigo);
  setTexto("salaStatusTopo", `${status} desde ${agora}`);
  setTexto("salaTotalMidias", totalMidiasPonto(ponto));
  setTexto("salaTotalPlaylists", playlistsDaSala(codigo).length);
  setTexto("salaDiasOnline", totalTelasPonto(ponto, 0));

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
      status: salaAtual.status || salaAtual.status_final || "ativo",
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

  if (erro?.code === "PGRST205" || erro?.status === 404 || texto.includes("pontos")) {
    return "A tabela pontos ainda nao existe no banco novo. Rode o SQL de criacao das tabelas no Supabase.";
  }

  if (texto.toLowerCase().includes("bucket") || texto.toLowerCase().includes("storage")) {
    return "Nao foi possivel salvar a imagem. Crie o bucket publico capas-salas no Storage do Supabase.";
  }

  return "Nao foi possivel salvar as informacoes da sala.";
}

function mensagemErroNovoPonto(erro) {
  const texto = String(erro?.message || erro?.details || erro?.hint || "");

  if (erro?.code === "PGRST205" || erro?.status === 404 || texto.includes("pontos")) {
    return "A tabela pontos ainda nao existe no banco novo. Rode o SQL de criacao das tabelas no Supabase.";
  }

  if (texto.toLowerCase().includes("duplicate") || erro?.code === "23505") {
    return "O codigo gerado ja existe. Tente criar novamente.";
  }

  return "Nao foi possivel criar o novo ponto.";
}

function mensagemErroMaterial(erro) {
  const texto = String(erro?.message || erro?.details || erro?.hint || "");

  if (erro?.code === "PGRST205" || erro?.status === 404 || texto.includes("playlists")) {
    return "A tabela playlists ainda nao existe no banco novo. Crie a tabela playlists no Supabase.";
  }

  if (texto.toLowerCase().includes("bucket") || texto.toLowerCase().includes("storage")) {
    return "Nao foi possivel enviar o arquivo. Crie o bucket publico materiais-salas no Storage do Supabase.";
  }

  if (erro?.code === "PGRST204" || texto.includes("arquivo_url")) {
    return "Faltam colunas de arquivo na tabela playlists. Adicione arquivo_url, arquivo_nome, arquivo_tipo e arquivo_tamanho.";
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
    <article class="sala-playlist-item">
      <span class="playlist-handle">⋮⋮</span>
      <strong>${index + 1}.</strong>
      <div>
        <h4>${escaparHtml(item.nome || item.titulo || item.arquivo_nome || "Material sem nome")}</h4>
        <p>${escaparHtml(item.arquivo_nome || item.descricao || item.status || "")}</p>
      </div>
      <time>${escaparHtml(formatarDataHora(item.created_at))}</time>
      <time>${escaparHtml(formatarData(item.data_fim))}</time>
      <div class="playlist-acoes">
        <button type="button">✎</button>
        <button type="button">↓</button>
        <button type="button">×</button>
      </div>
    </article>
  `).join("");
}

function renderizarHistoricosSala() {
  const encerramento = document.getElementById("salaHistoricoEncerramento");
  const status = document.getElementById("salaHistoricoStatus");

  if (encerramento) {
    encerramento.innerHTML = `<div><span>Nenhum historico de encerramento.</span></div>`;
  }

  if (status) {
    status.innerHTML = `<div><span>Nenhum historico de status.</span></div>`;
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

  return todosOsMateriais.filter(item => {
    return normalizarCodigo(
      item.codigo_ponto ||
      item.codigo_cliente ||
      item.ponto_codigo ||
      item.codigo ||
      ""
    ) === codigoNormalizado;
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

function textoStatus(status) {
  if (status === "ativo") return "Ativo";
  if (status === "inativo") return "Inativo";
  return "Inativo";
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

function escaparHtml(valor) {
  return String(valor || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
