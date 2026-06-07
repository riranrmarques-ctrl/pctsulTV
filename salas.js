const SUPABASE_URL = "https://niqyhaiytiusvyspjsld.supabase.co";
const SUPABASE_KEY = "sb_publishable_O6vm7g-Xiv4COo1mNHCBAw_jgEJbSDI";
const SENHA_PAINEL = "@helena";

const CACHE_CENTRAL_KEY = "central_painel_cache_v3";
const CACHE_CENTRAL_TTL = 30 * 60 * 1000;
const STORAGE_CAPAS_BUCKET = "capas-salas";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let todosOsPontos = [];
let playlistsAtivas = 0;
let salaAtual = null;
let imagemSalaSelecionada = null;

document.addEventListener("DOMContentLoaded", () => {
  iniciarLoginCentral();
  configurarFiltros();
  configurarLogout();
  configurarVoltarSala();
  configurarEdicaoSala();
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

    if (!opcoes.forcarAtualizacao && cache?.dados) {
      aplicarDadosCentral(cache.dados);

      if (cache.fresco) return;
    }

    const { data: pontos, error: erroPontos } = await supabaseClient
      .from("pontos")
      .select("*")
      .order("created_at", { ascending: false });

    if (erroPontos) throw erroPontos;

    const status = await buscarStatusPontos();

    let playlists = [];

    const respostaPlaylists = await supabaseClient
      .from("playlists")
      .select("codigo_cliente,data_fim,status,created_at");

    if (respostaPlaylists.error) {
      console.warn("Playlists nao carregaram:", respostaPlaylists.error);
    } else {
      playlists = respostaPlaylists.data || [];
    }

    const dados = {
      pontos: pontos || [],
      status: status || [],
      playlists
    };

    salvarCacheCentral(dados);
    aplicarDadosCentral(dados);
  } catch (erro) {
    console.error("Erro ao carregar central painel:", erro);
    aplicarDadosCentral({ pontos: pontosDemo(), status: [], playlists: [] });
  }
}

function aplicarDadosCentral(dados) {
  const pontos = dados?.pontos || [];
  const status = dados?.status || [];
  const playlists = dados?.playlists || [];

  playlistsAtivas = contarPlaylistsAtivas(playlists);
  todosOsPontos = combinarPontosComStatus(pontos.length ? pontos : pontosDemo(), status);
  atualizarPainelFiltrado();
}

async function buscarStatusPontos() {
  const consultas = [
    { ordem: "ultimo_ping" },
    { ordem: "data_hora" },
    { ordem: "created_at" }
  ];

  for (const consulta of consultas) {
    const { data, error } = await supabaseClient
      .from("statuspontos")
      .select("*")
      .order(consulta.ordem, { ascending: false });

    if (!error) return data || [];

    console.warn(`Status nao carregou usando ${consulta.ordem}:`, error);
  }

  return [];
}

function combinarPontosComStatus(pontos, status) {
  const statusPorCodigo = {};

  (status || []).forEach(item => {
    const codigoStatus = normalizarCodigo(
      item.codigo ||
      item.codigo_ponto ||
      item.ponto_codigo ||
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
  setTexto("playlistsAtivasResumo", playlistsAtivas || 8);
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
  setTexto("salaDiasOnline", totalTelasPonto(ponto, 0));

  const salaImagem = document.getElementById("salaImagem");
  if (salaImagem) {
    salaImagem.src = imagem;
    salaImagem.alt = nome;
  }

  renderizarPlaylistSala();
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

    const { error } = await supabaseClient
      .from("pontos")
      .update(dadosAtualizados)
      .eq("codigo", codigo);

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

function renderizarPlaylistSala() {
  const lista = document.getElementById("salaPlaylistLista");
  if (!lista) return;

  const itens = [
    ["Netplace Telecom", "provedora de internet", "05/05/2026, 19:52:23", "19/04/2027"],
    ["Jhontanas", "Charles", "05/05/2026, 19:34:34", "04/07/2026"],
    ["Jacqueline Pacheco Moreira", "dentistas", "07/05/2026, 11:09:40", "19/09/2026"],
    ["Dr. Breno Souza Silva", "consultoria premium", "07/05/2026, 11:21:26", "19/06/2026"],
    ["Jhontanas", "fernanda", "14/05/2026, 13:37:26", "13/06/2026"],
    ["Jhontanas", "hotel", "23/05/2026, 01:14:26", "19/07/2026"]
  ];

  lista.innerHTML = itens.map((item, index) => `
    <article class="sala-playlist-item">
      <span class="playlist-handle">⋮⋮</span>
      <strong>${index + 1}.</strong>
      <div>
        <h4>${escaparHtml(item[0])}</h4>
        <p>${escaparHtml(item[1])}</p>
      </div>
      <time>${escaparHtml(item[2])}</time>
      <time>${escaparHtml(item[3])}</time>
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
    encerramento.innerHTML = [
      ["Jhontanas | esquenta.mp4", "02/06/2026"],
      ["Jhontanas | daiane.", "31/05/2026"]
    ].map((item, index) => `
      <div>
        <strong>${index + 1}.</strong>
        <span>${escaparHtml(item[0])}</span>
        <time>${escaparHtml(item[1])}</time>
      </div>
    `).join("");
  }

  if (status) {
    status.innerHTML = Array.from({ length: 9 }, (_, index) => `
      <div>
        <strong>${index + 1}.</strong>
        <span>Ativo em 07/06/2026, 02:26:49</span>
        <time>07/06/2026, 02:26:49</time>
      </div>
    `).join("");
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
  if (Number.isFinite(numero) && numero > 0) return numero;

  return [3, 2, 4, 1, 2, 5, 3, 6][index % 8];
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
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80";
}

function normalizarCodigo(codigo) {
  return String(codigo || "").trim().toUpperCase();
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

function pontosDemo() {
  return [
    {
      nome: "Smart Fit Ilheus",
      cidade: "Zona Sul",
      endereco: "Av. Tancredo Neves, 2495 - Jardim Atlantico, Ilheus",
      codigo: "A4M4G1W",
      status: "ativo",
      imagem_url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80"
    },
    {
      nome: "Aeroshake / Avenida",
      cidade: "Ilheus",
      endereco: "Avenida Soares Lopes",
      codigo: "V2M6E5Y",
      status: "ativo",
      imagem_url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=80"
    },
    {
      nome: "Aeroshake / Missael Tavares",
      cidade: "Ilheus",
      endereco: "Praca Missael Tavares, Cidade Nova",
      codigo: "G4A0K4A",
      status: "ativo",
      imagem_url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80"
    },
    {
      nome: "Smart Fit Conlar",
      cidade: "Itabuna",
      endereco: "Avenida Juracy Magalhaes, 782 - Nossa Senhora de Fatima",
      codigo: "H6M9G7J",
      status: "inativo",
      imagem_url: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=900&q=80"
    },
    {
      nome: "Smart Fit Shopping",
      cidade: "Itabuna",
      endereco: "Av. Aziz Maron, s/n - Goes Calmon",
      codigo: "O8L2K6R",
      status: "inativo",
      imagem_url: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=900&q=80"
    },
    {
      nome: "Academia Smart Fit",
      cidade: "Porto Seguro",
      endereco: "Av. dos Trabalhadores, 2008 - Olhos D'agua",
      codigo: "P9M8Z4R",
      status: "inativo",
      imagem_url: "https://images.unsplash.com/photo-1558611848-73f7eb4001a1?auto=format&fit=crop&w=900&q=80"
    },
    {
      nome: "Jacques Janine",
      cidade: "Ilheus",
      endereco: "Praia dos Milionarios - R. Acana, 11 - Nossa Sra. da Vitoria",
      codigo: "T4D8A5N",
      status: "inativo",
      imagem_url: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=80"
    },
    {
      nome: "UESC",
      cidade: "Ilheus x Itabuna",
      endereco: "Campus Soane Nazare de Andrade",
      codigo: "L7O9K4M",
      status: "ativo",
      imagem_url: "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=900&q=80"
    }
  ];
}
