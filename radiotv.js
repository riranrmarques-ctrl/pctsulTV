const SUPABASE_URL = "https://niqyhaiytiusvyspjsld.supabase.co";
const SUPABASE_KEY = "sb_publishable_O6vm7g-Xiv4COo1mNHCBAw_jgEJbSDI";
const TABELA_RADIOTV = "radiotv";
const STORAGE_MUSICAS_BUCKET = "radiotv-musicas";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let itensRadioTv = [];
let arquivoMusicaSelecionado = null;
let urlMusicaAtual = "";

document.addEventListener("DOMContentLoaded", () => {
  configurarEventos();
  carregarRadioTv();
});

window.addEventListener("load", () => {
  setTimeout(() => document.getElementById("preloader")?.classList.add("oculto"), 300);
});

function configurarEventos() {
  document.getElementById("btnAdicionarRadioTv")?.addEventListener("click", abrirEscolhaTipo);
  document.getElementById("btnFecharEscolhaTipo")?.addEventListener("click", fecharEscolhaTipo);
  document.getElementById("btnFecharRadioTv")?.addEventListener("click", fecharModalRadioTv);
  document.getElementById("btnCancelarRadioTv")?.addEventListener("click", fecharModalRadioTv);
  document.getElementById("btnSalvarRadioTv")?.addEventListener("click", salvarRadioTv);

  document.querySelectorAll("#modalEscolherTipo [data-tipo]").forEach(botao => {
    botao.addEventListener("click", () => {
      fecharEscolhaTipo();
      abrirModalRadioTv(botao.dataset.tipo || "musica");
    });
  });

  document.getElementById("btnSelecionarMusica")?.addEventListener("click", () => {
    document.getElementById("inputArquivoMusica")?.click();
  });

  document.getElementById("inputArquivoMusica")?.addEventListener("change", event => {
    arquivoMusicaSelecionado = event.target.files?.[0] || null;
    setTexto("nomeArquivoMusica", arquivoMusicaSelecionado ? arquivoMusicaSelecionado.name : "Nenhum arquivo selecionado");
  });

  ["buscaRadioTv", "filtroTipoRadioTv", "filtroStatusRadioTv"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", renderizarRadioTv);
    el.addEventListener("change", renderizarRadioTv);
  });

  ["avisoTitulo", "avisoTexto", "avisoCorFundo", "avisoCorTexto", "avisoVelocidade"].forEach(id => {
    document.getElementById(id)?.addEventListener("input", atualizarPreviewAviso);
    document.getElementById(id)?.addEventListener("change", atualizarPreviewAviso);
  });
}

async function carregarRadioTv() {
  try {
    const { data, error } = await supabaseClient
      .from(TABELA_RADIOTV)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    itensRadioTv = data || [];
    renderizarRadioTv();
  } catch (erro) {
    console.error("Erro ao carregar RadioTV:", erro);
    itensRadioTv = [];
    renderizarRadioTv();
  }
}

function abrirEscolhaTipo() {
  document.getElementById("modalEscolherTipo").hidden = false;
}

function fecharEscolhaTipo() {
  document.getElementById("modalEscolherTipo").hidden = true;
}

function abrirModalRadioTv(tipo, item = null) {
  limparModalRadioTv();

  const tipoFinal = tipo || item?.tipo || "musica";

  setValor("radioTvTipo", tipoFinal);
  setValor("radioTvId", item?.id || "");
  urlMusicaAtual = item?.url || "";

  setValor("musicaArtista", item?.artista || "");
  setValor("musicaTitulo", item?.titulo || "");
  setTexto("nomeArquivoMusica", item?.url ? "Música já enviada" : "Nenhum arquivo selecionado");

  setValor("linkArtista", item?.artista || "");
  setValor("linkTitulo", item?.titulo || "");
  setValor("linkSite", item?.site || "");
  setValor("linkUrl", item?.url || "");

  setValor("avisoTitulo", item?.titulo || "");
  setValor("avisoTexto", item?.texto_aviso || "");
  setValor("avisoCorFundo", item?.cor_fundo || "#000000");
  setValor("avisoCorTexto", item?.cor_texto || "#ffffff");
  setValor("avisoVelocidade", item?.velocidade || "normal");

  setValor("youtubeUrl", item?.url || "");
  setValor("youtubeInicio", dataParaInputLocal(item?.data_inicio || ""));
  setValor("youtubeFim", dataParaInputLocal(item?.data_fim || ""));

  const ativo = document.getElementById("radioTvAtivo");
  if (ativo) ativo.checked = item ? item.ativo !== false : true;

  aplicarTipoModal(tipoFinal);
  atualizarPreviewAviso();

  const titulo = document.getElementById("modalTituloRadioTv");
  if (titulo) titulo.textContent = item ? "Editar item" : `Adicionar ${tipoLabel(tipoFinal)}`;

  document.getElementById("modalEditarRadioTv").hidden = false;
}

function aplicarTipoModal(tipo) {
  document.getElementById("camposMusica").hidden = tipo !== "musica";
  document.getElementById("camposLinkExterno").hidden = tipo !== "link_externo";
  document.getElementById("camposAviso").hidden = tipo !== "aviso";
  document.getElementById("previewAviso").hidden = tipo !== "aviso";
  document.getElementById("camposYoutubeLive").hidden = tipo !== "youtube_live";
}

function fecharModalRadioTv() {
  document.getElementById("modalEditarRadioTv").hidden = true;
  limparModalRadioTv();
}

function limparModalRadioTv() {
  arquivoMusicaSelecionado = null;
  urlMusicaAtual = "";

  [
    "radioTvId", "radioTvTipo",
    "musicaArtista", "musicaTitulo",
    "linkArtista", "linkTitulo", "linkSite", "linkUrl",
    "avisoTitulo", "avisoTexto",
    "youtubeUrl", "youtubeInicio", "youtubeFim"
  ].forEach(id => setValor(id, ""));

  setValor("avisoCorFundo", "#000000");
  setValor("avisoCorTexto", "#ffffff");
  setValor("avisoVelocidade", "normal");
  setTexto("nomeArquivoMusica", "Nenhum arquivo selecionado");

  const inputArquivo = document.getElementById("inputArquivoMusica");
  if (inputArquivo) inputArquivo.value = "";

  const ativo = document.getElementById("radioTvAtivo");
  if (ativo) ativo.checked = true;
}

async function salvarRadioTv() {
  const id = getValor("radioTvId");
  const tipo = getValor("radioTvTipo") || "musica";
  const ativo = document.getElementById("radioTvAtivo")?.checked !== false;

  const erro = validarFormulario(tipo);
  if (erro) {
    alert(erro);
    return;
  }

  const btnSalvar = document.getElementById("btnSalvarRadioTv");
  const textoOriginal = btnSalvar ? btnSalvar.textContent : "";

  if (btnSalvar) {
    btnSalvar.disabled = true;
    btnSalvar.textContent = "Salvando...";
  }

  try {
    const dados = await montarDadosFormulario(tipo, ativo);

    const resposta = id
      ? await supabaseClient.from(TABELA_RADIOTV).update(dados).eq("id", id).select("*").single()
      : await supabaseClient.from(TABELA_RADIOTV).insert(dados).select("*").single();

    if (resposta.error) throw resposta.error;

    const salvo = resposta.data;

    if (id) {
      itensRadioTv = itensRadioTv.map(item => String(item.id) === String(id) ? salvo : item);
    } else {
      itensRadioTv = [salvo, ...itensRadioTv];
    }

    renderizarRadioTv();
    fecharModalRadioTv();
  } catch (erro) {
    console.error("Erro ao salvar RadioTV:", erro);
    alert(erro?.message || erro?.details || "Não foi possível salvar.");
  } finally {
    if (btnSalvar) {
      btnSalvar.disabled = false;
      btnSalvar.textContent = textoOriginal || "Salvar";
    }
  }
}

function validarFormulario(tipo) {
  if (tipo === "musica") {
    if (!arquivoMusicaSelecionado && !urlMusicaAtual) return "Selecione a mídia de áudio.";
    if (!getValor("musicaArtista")) return "Informe o cantor/artista.";
    if (!getValor("musicaTitulo")) return "Informe o nome da música.";
    return "";
  }

  if (tipo === "link_externo") {
    if (!getValor("linkArtista")) return "Informe o cantor/banda.";
    if (!getValor("linkTitulo")) return "Informe a música, álbum ou playlist.";
    if (!getValor("linkUrl")) return "Informe a URL.";
    return "";
  }

  if (tipo === "aviso") {
    if (!getValor("avisoTitulo")) return "Informe o título do aviso.";
    if (!getValor("avisoTexto")) return "Informe o texto geral do aviso.";
    return "";
  }

  if (tipo === "youtube_live") {
    if (!getValor("youtubeUrl")) return "Informe o link da transmissão.";
    if (!getValor("youtubeInicio")) return "Informe a hora de início.";
    if (!getValor("youtubeFim")) return "Informe a hora de encerramento.";
    if (new Date(getValor("youtubeFim")) <= new Date(getValor("youtubeInicio"))) return "O encerramento precisa ser depois do início.";
    return "";
  }

  return "";
}

async function montarDadosFormulario(tipo, ativo) {
  const base = {
    tipo,
    ativo,
    updated_at: new Date().toISOString()
  };

  if (tipo === "musica") {
    const url = arquivoMusicaSelecionado ? await enviarMusicaStorage(arquivoMusicaSelecionado) : urlMusicaAtual;

    return {
      ...base,
      titulo: getValor("musicaTitulo"),
      artista: getValor("musicaArtista"),
      site: "Upload interno",
      url,
      texto_aviso: null,
      cor_fundo: "#000000",
      cor_texto: "#ffffff",
      velocidade: null,
      data_inicio: null,
      data_fim: null,
      modo_exibicao: "rodape"
    };
  }

  if (tipo === "link_externo") {
    return {
      ...base,
      titulo: getValor("linkTitulo"),
      artista: getValor("linkArtista"),
      site: getValor("linkSite") || "Link externo",
      url: normalizarUrl(getValor("linkUrl")),
      texto_aviso: null,
      cor_fundo: "#000000",
      cor_texto: "#ffffff",
      velocidade: null,
      data_inicio: null,
      data_fim: null,
      modo_exibicao: "rodape"
    };
  }

  if (tipo === "aviso") {
    return {
      ...base,
      titulo: getValor("avisoTitulo"),
      artista: null,
      site: "Sistema",
      url: null,
      texto_aviso: getValor("avisoTexto"),
      cor_fundo: getValor("avisoCorFundo") || "#000000",
      cor_texto: getValor("avisoCorTexto") || "#ffffff",
      velocidade: getValor("avisoVelocidade") || "normal",
      data_inicio: null,
      data_fim: null,
      modo_exibicao: "rodape"
    };
  }

  return {
    ...base,
    titulo: "YouTube ao vivo",
    artista: null,
    site: "YouTube",
    url: normalizarUrl(getValor("youtubeUrl")),
    texto_aviso: null,
    cor_fundo: "#000000",
    cor_texto: "#ffffff",
    velocidade: null,
    data_inicio: getValor("youtubeInicio"),
    data_fim: getValor("youtubeFim"),
    modo_exibicao: "fullscreen"
  };
}

async function enviarMusicaStorage(arquivo) {
  const nomeSeguro = (arquivo.name || "musica")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-");

  const caminho = `${Date.now()}-${nomeSeguro}`;

  const { error } = await supabaseClient
    .storage
    .from(STORAGE_MUSICAS_BUCKET)
    .upload(caminho, arquivo, {
      cacheControl: "3600",
      upsert: false
    });

  if (error) throw error;

  const { data } = supabaseClient
    .storage
    .from(STORAGE_MUSICAS_BUCKET)
    .getPublicUrl(caminho);

  return data.publicUrl;
}

function renderizarRadioTv() {
  const lista = document.getElementById("listaRadioTv");
  if (!lista) return;

  const busca = normalizarBusca(getValor("buscaRadioTv"));
  const filtroTipo = document.getElementById("filtroTipoRadioTv")?.value || "todos";
  const filtroStatus = document.getElementById("filtroStatusRadioTv")?.value || "todos";

  const itens = itensRadioTv.filter(item => {
    const texto = normalizarBusca(`${item.titulo || ""} ${item.artista || ""} ${item.site || ""} ${item.texto_aviso || ""} ${item.url || ""}`);
    const status = item.ativo === false ? "inativo" : "ativo";
    return (!busca || texto.includes(busca)) &&
           (filtroTipo === "todos" || item.tipo === filtroTipo) &&
           (filtroStatus === "todos" || status === filtroStatus);
  });

  atualizarResumo();
  setTexto("contadorLista", `${itens.length} ${itens.length === 1 ? "item" : "itens"}`);

  if (!itens.length) {
    lista.innerHTML = `<div class="empty-state">Nenhum item cadastrado no RadioTV.</div>`;
    return;
  }

  lista.innerHTML = itens.map(item => {
    const status = item.ativo === false ? "inativo" : "ativo";
    const abrir = item.url
      ? `<a href="${escaparHtml(item.url)}" target="_blank" rel="noopener" title="Abrir">↗</a>`
      : `<button type="button" onclick="visualizarAviso('${escaparHtml(String(item.id))}')" title="Visualizar">👁</button>`;

    return `
      <article class="radiotv-item">
        <div class="item-info">
          <h3>${escaparHtml(nomeItem(item))}</h3>
          <p>${escaparHtml(subtituloItem(item))}</p>
        </div>
        <div class="item-meta"><span>Tipo</span><strong>${escaparHtml(tipoLabel(item.tipo))}</strong></div>
        <div class="item-meta"><span>Site</span><strong>${escaparHtml(item.site || "Sistema")}</strong></div>
        <div class="item-meta"><span>Status</span><strong class="status-pill ${status}">${status === "ativo" ? "Ativo" : "Inativo"}</strong></div>
        <div class="item-acoes">
          <button type="button" onclick="editarRadioTv('${escaparHtml(String(item.id))}')" title="Editar">✎</button>
          ${abrir}
          <button type="button" onclick="deletarRadioTv('${escaparHtml(String(item.id))}')" title="Deletar">×</button>
        </div>
      </article>
    `;
  }).join("");
}

function editarRadioTv(id) {
  const item = itensRadioTv.find(registro => String(registro.id) === String(id));
  if (item) abrirModalRadioTv(item.tipo, item);
}

async function deletarRadioTv(id) {
  if (!confirm("Deseja deletar este item do RadioTV?")) return;

  try {
    const { error } = await supabaseClient.from(TABELA_RADIOTV).delete().eq("id", id);
    if (error) throw error;
    itensRadioTv = itensRadioTv.filter(registro => String(registro.id) !== String(id));
    renderizarRadioTv();
  } catch (erro) {
    console.error("Erro ao deletar RadioTV:", erro);
    alert("Não foi possível deletar.");
  }
}

function visualizarAviso(id) {
  const item = itensRadioTv.find(registro => String(registro.id) === String(id));
  if (item) alert(`${item.titulo || "Aviso"}\n\n${item.texto_aviso || ""}`);
}

function atualizarResumo() {
  setTexto("totalItensResumo", itensRadioTv.length);
  setTexto("itensAtivosResumo", itensRadioTv.filter(item => item.ativo !== false).length);
  setTexto("avisosResumo", itensRadioTv.filter(item => item.tipo === "aviso").length);
  setTexto("youtubeResumo", itensRadioTv.filter(item => item.tipo === "youtube_live").length);
}

function atualizarPreviewAviso() {
  const preview = document.getElementById("textoPreviewAviso");
  if (!preview) return;

  const titulo = getValor("avisoTitulo");
  const texto = getValor("avisoTexto") || "Bem-vindo ao PCTSUL";
  preview.textContent = titulo ? `${titulo}: ${texto}` : texto;
  preview.style.background = getValor("avisoCorFundo") || "#000000";
  preview.style.color = getValor("avisoCorTexto") || "#ffffff";
}

function nomeItem(item) {
  if (item.tipo === "musica") return `${item.artista || "Artista"} — ${item.titulo || "Música"}`;
  if (item.tipo === "link_externo") return `${item.artista || "Artista"} — ${item.titulo || "Link externo"}`;
  if (item.tipo === "aviso") return `Aviso: ${item.titulo || "Sem título"}`;
  if (item.tipo === "youtube_live") return "YouTube ao vivo";
  return item.titulo || "Item sem título";
}

function subtituloItem(item) {
  if (item.tipo === "aviso") return `${item.texto_aviso || ""} • Velocidade ${item.velocidade || "normal"}`;
  if (item.tipo === "youtube_live") return `${formatarDataHora(item.data_inicio)} até ${formatarDataHora(item.data_fim)} • ${item.url || ""}`;
  return item.url || "";
}

function tipoLabel(tipo) {
  if (tipo === "musica") return "Música";
  if (tipo === "link_externo") return "Link externo";
  if (tipo === "aviso") return "Aviso";
  if (tipo === "youtube_live") return "YouTube ao vivo";
  return "Item";
}

function dataParaInputLocal(valor) {
  if (!valor) return "";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  data.setMinutes(data.getMinutes() - data.getTimezoneOffset());
  return data.toISOString().slice(0, 16);
}

function formatarDataHora(valor) {
  if (!valor) return "-";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "-";
  return data.toLocaleString("pt-BR");
}

function normalizarUrl(url) {
  const texto = String(url || "").trim();
  if (!texto) return "";
  if (texto.startsWith("http://") || texto.startsWith("https://")) return texto;
  return "https://" + texto;
}

function normalizarBusca(valor) {
  return String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
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
