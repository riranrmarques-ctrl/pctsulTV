const SUPABASE_URL = "https://niqyhaiytiusvyspjsld.supabase.co";
const SUPABASE_KEY = "sb_publishable_O6vm7g-Xiv4COo1mNHCBAw_jgEJbSDI";

const TABELA_BIBLIOTECA = "biblioteca";
const STORAGE_BIBLIOTECA_BUCKET = "biblioteca";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let arquivosBiblioteca = [];
let arquivoSelecionado = null;
let urlDetectadaTxt = "";

document.addEventListener("DOMContentLoaded", () => {
  configurarEventos();
  carregarBiblioteca();
  carregarResumoSalas();
});

function configurarEventos() {
  const btnAdicionar = document.getElementById("btnAdicionarArquivo");
  const inputArquivo = document.getElementById("inputArquivoBiblioteca");
  const btnFechar = document.getElementById("btnFecharModalBiblioteca");
  const btnCancelar = document.getElementById("btnCancelarBiblioteca");
  const btnSalvar = document.getElementById("btnSalvarBiblioteca");
  const busca = document.getElementById("buscaBiblioteca");
  const filtro = document.getElementById("filtroTipoBiblioteca");

  if (btnAdicionar && inputArquivo) {
    btnAdicionar.addEventListener("click", () => inputArquivo.click());

    inputArquivo.addEventListener("change", () => {
      const arquivo = inputArquivo.files?.[0];
      if (!arquivo) return;

      abrirModalArquivo(arquivo);
      inputArquivo.value = "";
    });
  }

  if (btnFechar) btnFechar.addEventListener("click", fecharModal);
  if (btnCancelar) btnCancelar.addEventListener("click", fecharModal);
  if (btnSalvar) btnSalvar.addEventListener("click", salvarArquivoBiblioteca);

  if (busca) busca.addEventListener("input", renderizarBiblioteca);
  if (filtro) filtro.addEventListener("change", renderizarBiblioteca);
}

async function carregarBiblioteca() {
  try {
    const { data, error } = await supabaseClient
      .from(TABELA_BIBLIOTECA)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    arquivosBiblioteca = data || [];
    renderizarBiblioteca();
  } catch (erro) {
    console.error("Erro ao carregar biblioteca:", erro);
    arquivosBiblioteca = [];
    renderizarBiblioteca();
  }
}

async function abrirModalArquivo(arquivo) {
  arquivoSelecionado = arquivo;
  urlDetectadaTxt = "";

  const tipo = tipoBibliotecaArquivo(arquivo);
  if (!tipo) {
    alert("Envie apenas arquivos TXT ou PNG.");
    return;
  }

  setTexto("nomeArquivoBiblioteca", arquivo.name);
  setTexto("detalheArquivoBiblioteca", `${tipo === "site" ? "Site TXT" : "Moldura PNG"} • ${formatarTamanho(arquivo.size)}`);

  const preview = document.getElementById("previewArquivoBiblioteca");

  if (preview) preview.innerHTML = tipo === "site" ? "TXT" : "PNG";

  if (tipo === "site") {
    const texto = await arquivo.text();
    urlDetectadaTxt = extrairUrlDoTexto(texto);
    setValor("urlDetectadaBiblioteca", urlDetectadaTxt);

    if (preview) preview.innerHTML = "SITE";
  }

  if (tipo === "moldura") {
    const leitor = new FileReader();
    leitor.onload = () => {
      if (preview) preview.innerHTML = `<img src="${String(leitor.result)}" alt="">`;
    };
    leitor.readAsDataURL(arquivo);
  }

  const modal = document.getElementById("modalAdicionarBiblioteca");
  if (modal) modal.hidden = false;
}

function fecharModal() {
  arquivoSelecionado = null;
  urlDetectadaTxt = "";

  const modal = document.getElementById("modalAdicionarBiblioteca");
  if (modal) modal.hidden = true;

  setTexto("nomeArquivoBiblioteca", "Nenhum arquivo");
  setTexto("detalheArquivoBiblioteca", "Selecione um TXT ou PNG");
  setValor("nomeBiblioteca", "");
  setValor("urlDetectadaBiblioteca", "");

  const preview = document.getElementById("previewArquivoBiblioteca");
  if (preview) preview.innerHTML = "TXT";
}

async function salvarArquivoBiblioteca() {
  if (!arquivoSelecionado) {
    alert("Selecione um arquivo.");
    return;
  }

  const tipo = tipoBibliotecaArquivo(arquivoSelecionado);
  if (!tipo) {
    alert("Tipo de arquivo inválido.");
    return;
  }

  const nome = getValor("nomeBiblioteca") || nomeArquivoSemExtensao(arquivoSelecionado.name);
const urlDigitada = urlDetectadaTxt;

  if (tipo === "site" && !urlDigitada) {
    alert("O TXT precisa conter uma URL ou você precisa informar a URL no campo.");
    return;
  }

  const btnSalvar = document.getElementById("btnSalvarBiblioteca");
  const textoOriginal = btnSalvar ? btnSalvar.textContent : "";

  if (btnSalvar) {
    btnSalvar.disabled = true;
    btnSalvar.textContent = "Salvando...";
  }

  try {
    const arquivoUrl = await enviarArquivoStorage(arquivoSelecionado);
    const capaUrl = tipo === "site" ? gerarCapaSite(urlDigitada) : arquivoUrl;

    const registro = {
      nome,
      tipo,
      arquivo_url: arquivoUrl,
      arquivo_nome: arquivoSelecionado.name,
      arquivo_tamanho: arquivoSelecionado.size || 0,
      capa_url: capaUrl
    };

    const { data, error } = await supabaseClient
      .from(TABELA_BIBLIOTECA)
      .insert(registro)
      .select("*")
      .single();

    if (error) throw error;

    arquivosBiblioteca = [data || registro, ...arquivosBiblioteca];
    renderizarBiblioteca();
    fecharModal();
  } catch (erro) {
    console.error("ERRO COMPLETO AO SALVAR BIBLIOTECA:", erro);

    alert(
      erro?.message ||
      erro?.error_description ||
      erro?.details ||
      JSON.stringify(erro, null, 2) ||
      "Erro desconhecido ao salvar."
    );
  } finally {
    if (btnSalvar) {
      btnSalvar.disabled = false;
      btnSalvar.textContent = textoOriginal || "Salvar arquivo";
    }
  }
}

async function enviarArquivoStorage(arquivo) {
  const nomeSeguro = (arquivo.name || "arquivo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-");

  const caminho = `${Date.now()}-${nomeSeguro}`;

  const { error } = await supabaseClient
    .storage
    .from(STORAGE_BIBLIOTECA_BUCKET)
    .upload(caminho, arquivo, {
      cacheControl: "3600",
      upsert: false
    });

  if (error) throw error;

  const { data } = supabaseClient
    .storage
    .from(STORAGE_BIBLIOTECA_BUCKET)
    .getPublicUrl(caminho);

  return data.publicUrl;
}

function renderizarBiblioteca() {
  const lista = document.getElementById("listaBiblioteca");
  if (!lista) return;

  const busca = normalizarBusca(getValor("buscaBiblioteca"));
  const filtro = document.getElementById("filtroTipoBiblioteca")?.value || "todos";

  let itens = arquivosBiblioteca.filter(item => {
    const texto = normalizarBusca(`${item.nome || ""} ${item.tipo || ""} ${item.arquivo_nome || ""}`);
    const combinaBusca = !busca || texto.includes(busca);
    const combinaTipo = filtro === "todos" || item.tipo === filtro;
    return combinaBusca && combinaTipo;
  });

  setTexto("totalArquivos", arquivosBiblioteca.length);
  setTexto("totalSites", arquivosBiblioteca.filter(item => item.tipo === "site").length);
  setTexto("totalMolduras", arquivosBiblioteca.filter(item => item.tipo === "moldura").length);
  setTexto("contadorLista", `${itens.length} ${itens.length === 1 ? "item" : "itens"}`);

  if (!itens.length) {
    lista.innerHTML = `<div class="empty-state">Nenhum arquivo encontrado.</div>`;
    return;
  }

  lista.innerHTML = itens.map(item => {
    const preview = item.capa_url
      ? `<img src="${escaparHtml(item.capa_url)}" alt="">`
      : tipoLabel(item.tipo);

    return `
      <article class="biblioteca-item">
        <div class="item-preview">${preview}</div>

        <div class="item-info">
          <h3>${escaparHtml(item.nome || item.arquivo_nome || "Arquivo sem nome")}</h3>
          <p>${escaparHtml(item.arquivo_nome || "")}</p>
        </div>

        <div class="item-meta">
          <span>Tipo</span>
          <strong>${escaparHtml(tipoLabel(item.tipo))}</strong>
        </div>

        <div class="item-meta">
          <span>Postado</span>
          <strong>${escaparHtml(formatarData(item.created_at))}</strong>
        </div>

        <div class="item-meta">
          <span>Tamanho</span>
          <strong>${escaparHtml(formatarTamanho(item.arquivo_tamanho || 0))}</strong>
        </div>

        <div class="item-acoes">
          <button type="button" onclick="baixarArquivoBiblioteca('${escaparHtml(String(item.id))}')">↓</button>
          <button type="button" onclick="deletarArquivoBiblioteca('${escaparHtml(String(item.id))}')">×</button>
        </div>
      </article>
    `;
  }).join("");
}

function baixarArquivoBiblioteca(id) {
  const item = arquivosBiblioteca.find(arquivo => String(arquivo.id) === String(id));
  if (!item?.arquivo_url) return;

  const link = document.createElement("a");
  link.href = item.arquivo_url;
  link.download = item.arquivo_nome || item.nome || "arquivo";
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function deletarArquivoBiblioteca(id) {
  const item = arquivosBiblioteca.find(arquivo => String(arquivo.id) === String(id));
  if (!item) return;

  if (!confirm("Deseja deletar este arquivo da biblioteca?")) return;

  try {
    const { error } = await supabaseClient
      .from(TABELA_BIBLIOTECA)
      .delete()
      .eq("id", id);

    if (error) throw error;

    arquivosBiblioteca = arquivosBiblioteca.filter(arquivo => String(arquivo.id) !== String(id));
    renderizarBiblioteca();
  } catch (erro) {
    console.error("Erro ao deletar:", erro);
    alert("Não foi possível deletar o arquivo.");
  }
}

function tipoBibliotecaArquivo(arquivo) {
  const nome = String(arquivo?.name || "").toLowerCase();
  const tipo = String(arquivo?.type || "").toLowerCase();

  if (nome.endsWith(".txt") || tipo === "text/plain") return "site";
  if (nome.endsWith(".png") || tipo === "image/png") return "moldura";

  return "";
}

function tipoLabel(tipo) {
  if (tipo === "site") return "Site TXT";
  if (tipo === "moldura") return "Moldura PNG";
  return "Arquivo";
}

function extrairUrlDoTexto(texto) {
  const conteudo = String(texto || "");

  const match = conteudo.match(/URL=(.+)/i);

  if (!match) return "";

  let url = match[1].trim();

  if (
    !url.startsWith("http://") &&
    !url.startsWith("https://")
  ) {
    url = "https://" + url;
  }

  return url;
}

function mensagemErroBiblioteca(erro) {
  const texto = String(erro?.message || erro?.details || erro?.hint || "");

  if (texto.toLowerCase().includes("bucket") || texto.toLowerCase().includes("storage")) {
    return "Crie um bucket público chamado biblioteca no Storage do Supabase.";
  }

  if (erro?.code === "PGRST205" || texto.includes("biblioteca")) {
    return "Crie a tabela biblioteca no Supabase usando o SQL enviado.";
  }

  return "Não foi possível salvar o arquivo.";
}

function nomeArquivoSemExtensao(nome) {
  return String(nome || "arquivo").replace(/\.[^/.]+$/, "") || "arquivo";
}

function formatarData(valor) {
  if (!valor) return "-";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "-";
  return data.toLocaleDateString("pt-BR");
}

function formatarTamanho(bytes) {
  const numero = Number(bytes || 0);

  if (numero < 1024) return `${numero} B`;
  if (numero < 1024 * 1024) return `${(numero / 1024).toFixed(1)} KB`;

  return `${(numero / (1024 * 1024)).toFixed(1)} MB`;
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

async function carregarResumoSalas() {
  try {
    const { data: salas, error } = await supabaseClient
      .from("salas")
      .select("*");

    if (error) throw error;

    const total = salas.length;
    const ativos = salas.filter(sala => sala.status === "ativo").length;
    const inativos = total - ativos;

    const telas = salas.reduce((soma, sala) => {
      return soma + Number(sala.total_telas || 0);
    }, 0);

    setTexto("totalPontosResumo", total);
    setTexto("pontosAtivosResumo", ativos);
    setTexto("pontosInativosResumo", inativos);
    setTexto("playlistsAtivasResumo", telas);
  } catch (erro) {
    console.error("Erro ao carregar resumo:", erro);
  }
}


function gerarCapaSite(url) {
  if (!url) return "";

  try {
    const dominio = new URL(url).hostname;

    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(dominio)}&sz=128`;
  } catch {
    return "";
  }
}
