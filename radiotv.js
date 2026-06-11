const SUPABASE_URL = "https://niqyhaiytiusvyspjsld.supabase.co";
const SUPABASE_KEY = "sb_publishable_O6vm7g-Xiv4COo1mNHCBAw_jgEJbSDI";
const TABELA_RADIOTV = "radiotv";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let itensRadioTv = [];

document.addEventListener("DOMContentLoaded", () => {
  configurarEventos();
  carregarRadioTv();
});

window.addEventListener("load", () => {
  setTimeout(() => document.getElementById("preloader")?.classList.add("oculto"), 300);
});

function configurarEventos() {
  const btnAdicionar = document.getElementById("btnAdicionarRadioTv");
  if (btnAdicionar) btnAdicionar.addEventListener("click", abrirEscolhaTipo);

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

  ["buscaRadioTv", "filtroTipoRadioTv", "filtroStatusRadioTv"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", renderizarRadioTv);
    el.addEventListener("change", renderizarRadioTv);
  });

  ["radioTvTextoAviso", "radioTvCorFundo", "radioTvCorTexto"].forEach(id => {
    document.getElementById(id)?.addEventListener("input", atualizarPreviewAviso);
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

function abrirEscolhaTipo() { document.getElementById("modalEscolherTipo").hidden = false; }
function fecharEscolhaTipo() { document.getElementById("modalEscolherTipo").hidden = true; }

function abrirModalRadioTv(tipo, item = null) {
  limparModalRadioTv();
  const tipoFinal = tipo || item?.tipo || "musica";

  setValor("radioTvTipo", tipoFinal);
  setValor("radioTvId", item?.id || "");
  setValor("radioTvArtista", item?.artista || "");
  setValor("radioTvTitulo", item?.titulo || "");
  setValor("radioTvSite", item?.site || "");
  setValor("radioTvUrl", item?.url || "");
  setValor("radioTvTextoAviso", item?.texto_aviso || "");
  setValor("radioTvCorFundo", item?.cor_fundo || "#000000");
  setValor("radioTvCorTexto", item?.cor_texto || "#ffffff");

  const ativo = document.getElementById("radioTvAtivo");
  if (ativo) ativo.checked = item ? item.ativo !== false : true;

  aplicarTipoModal(tipoFinal);
  atualizarPreviewAviso();

  const titulo = document.getElementById("modalTituloRadioTv");
  if (titulo) titulo.textContent = item ? "Editar item" : `Adicionar ${tipoLabel(tipoFinal)}`;

  document.getElementById("modalEditarRadioTv").hidden = false;
}

function aplicarTipoModal(tipo) {
  const aviso = tipo === "aviso";
  document.getElementById("camposMidia").hidden = aviso;
  document.getElementById("camposAviso").hidden = !aviso;
  document.getElementById("previewAviso").hidden = !aviso;

  const campoArtista = document.querySelector(".campo-artista");
  if (campoArtista) campoArtista.hidden = tipo !== "musica";

  const tituloInput = document.getElementById("radioTvTitulo");
  const siteInput = document.getElementById("radioTvSite");
  const urlInput = document.getElementById("radioTvUrl");

  if (tituloInput) {
    tituloInput.placeholder = tipo === "youtube_live"
      ? "Ex: Aula magna ao vivo"
      : tipo === "playlist" ? "Ex: Playlist ambiente corporativo" : "Ex: Oceano";
  }

  if (siteInput) {
    siteInput.placeholder = tipo === "youtube_live" ? "YouTube" : "Ex: Spotify, YouTube, Site externo";
    if (tipo === "youtube_live" && !siteInput.value) siteInput.value = "YouTube";
  }

  if (urlInput) urlInput.placeholder = tipo === "youtube_live" ? "https://www.youtube.com/watch?v=..." : "https://...";
}

function fecharModalRadioTv() {
  document.getElementById("modalEditarRadioTv").hidden = true;
  limparModalRadioTv();
}

function limparModalRadioTv() {
  ["radioTvId", "radioTvTipo", "radioTvArtista", "radioTvTitulo", "radioTvSite", "radioTvUrl", "radioTvTextoAviso"].forEach(id => setValor(id, ""));
  setValor("radioTvCorFundo", "#000000");
  setValor("radioTvCorTexto", "#ffffff");
  const ativo = document.getElementById("radioTvAtivo");
  if (ativo) ativo.checked = true;
}

async function salvarRadioTv() {
  const id = getValor("radioTvId");
  const tipo = getValor("radioTvTipo") || "musica";
  const ativo = document.getElementById("radioTvAtivo")?.checked !== false;
  const dados = montarDadosFormulario(tipo, ativo);
  const erro = validarDadosRadioTv(tipo, dados);

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

function montarDadosFormulario(tipo, ativo) {
  const base = { tipo, ativo, updated_at: new Date().toISOString() };

  if (tipo === "aviso") {
    return {
      ...base,
      titulo: getValor("radioTvTextoAviso").slice(0, 80),
      artista: null,
      site: "Sistema",
      url: null,
      texto_aviso: getValor("radioTvTextoAviso"),
      cor_fundo: getValor("radioTvCorFundo") || "#000000",
      cor_texto: getValor("radioTvCorTexto") || "#ffffff",
      modo_exibicao: "rodape"
    };
  }

  return {
    ...base,
    titulo: getValor("radioTvTitulo"),
    artista: tipo === "musica" ? getValor("radioTvArtista") : null,
    site: getValor("radioTvSite") || (tipo === "youtube_live" ? "YouTube" : ""),
    url: normalizarUrl(getValor("radioTvUrl")),
    texto_aviso: null,
    cor_fundo: "#000000",
    cor_texto: "#ffffff",
    modo_exibicao: tipo === "youtube_live" ? "fullscreen" : "rodape"
  };
}

function validarDadosRadioTv(tipo, dados) {
  if (tipo === "aviso") {
    if (!dados.texto_aviso) return "Informe o texto do aviso.";
    return "";
  }
  if (tipo === "musica" && !dados.artista) return "Informe o artista/cantor.";
  if (!dados.titulo) return "Informe o título.";
  if (!dados.url) return "Informe a URL.";
  return "";
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
  if (item) alert(item.texto_aviso || item.titulo || "Aviso sem texto");
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
  preview.textContent = getValor("radioTvTextoAviso") || "Bem-vindo ao PCTSUL";
  preview.style.background = getValor("radioTvCorFundo") || "#000000";
  preview.style.color = getValor("radioTvCorTexto") || "#ffffff";
}

function nomeItem(item) {
  if (item.tipo === "musica") return `${item.artista || "Artista"} — ${item.titulo || "Música"}`;
  if (item.tipo === "aviso") return `Aviso: ${item.texto_aviso || item.titulo || "Sem texto"}`;
  return item.titulo || "Item sem título";
}

function subtituloItem(item) {
  if (item.tipo === "aviso") return `Fundo ${item.cor_fundo || "#000000"} • Texto ${item.cor_texto || "#ffffff"}`;
  if (item.tipo === "youtube_live") return `Transmissão ao vivo em tela cheia • ${item.url || ""}`;
  return item.url || "";
}

function tipoLabel(tipo) {
  if (tipo === "musica") return "Música";
  if (tipo === "playlist") return "Playlist";
  if (tipo === "aviso") return "Aviso";
  if (tipo === "youtube_live") return "YouTube ao vivo";
  return "Item";
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
