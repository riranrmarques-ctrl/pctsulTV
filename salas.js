const SUPABASE_URL = "https://hhqqwjjdhzxqjuyazjwk.supabase.co";
const SUPABASE_KEY = "sb_publishable_8yHAzibYZJbW9PfdrOumkg_R7u2HWly";
const SENHA_PAINEL = "@helena";

const CACHE_CENTRAL_KEY = "central_painel_cache_v2";
const CACHE_CENTRAL_TTL = 30 * 60 * 1000;

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let todosOsPontos = [];

document.addEventListener("DOMContentLoaded", () => {
  iniciarLoginCentral();
});

function iniciarLoginCentral() {
  const loginBox = document.getElementById("loginBox");
  const conteudoPainel = document.getElementById("conteudoPainel");
  const senhaInput = document.getElementById("senhaInput");
  const btnLogin = document.getElementById("btnLogin");
  const loginErro = document.getElementById("loginErro");

  function liberarPainel() {
    if (loginBox) loginBox.style.display = "none";
    if (conteudoPainel) conteudoPainel.style.display = "flex";
    carregarcentralpainel();
  }

  function bloquearPainel() {
    if (loginBox) loginBox.style.display = "flex";
    if (conteudoPainel) conteudoPainel.style.display = "none";
  }

  function validarLogin() {
    const senha = senhaInput ? senhaInput.value.trim() : "";

    if (senha !== SENHA_PAINEL) {
      if (loginErro) loginErro.textContent = "Código inválido";
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

  if (btnLogin) {
    btnLogin.onclick = validarLogin;
  }

  if (senhaInput) {
    senhaInput.addEventListener("keydown", event => {
      if (event.key === "Enter") validarLogin();
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

    let clientes = [];
    let playlists = [];

    const respostaClientes = await supabaseClient
      .from("dadosclientes")
      .select("*");

    if (respostaClientes.error) {
      console.warn("Clientes não carregaram:", respostaClientes.error);
    } else {
      clientes = respostaClientes.data || [];
    }

    const respostaPlaylists = await supabaseClient
      .from("playlists")
      .select("codigo_cliente,data_fim,status,created_at");

    if (respostaPlaylists.error) {
      console.warn("Playlists não carregaram:", respostaPlaylists.error);
    } else {
      playlists = respostaPlaylists.data || [];
    }

    const dados = {
      pontos: pontos || [],
      status: status || [],
      clientes,
      playlists
    };

    salvarCacheCentral(dados);
    aplicarDadosCentral(dados);
  } catch (erro) {
    console.error("Erro ao carregar central painel:", erro);
  }
}

function aplicarDadosCentral(dados) {
  const pontos = dados?.pontos || [];
  const status = dados?.status || [];
  const clientes = dados?.clientes || [];
  const playlists = dados?.playlists || [];

  const clientesComStatusReal = calcularStatusRealClientes(clientes, playlists);
  const contratos = clientesComStatusReal.filter(cliente => clienteTemContrato(cliente));

  todosOsPontos = combinarPontosComStatus(pontos, status);
  atualizarPainel(todosOsPontos);
  atualizarGraficoComercial(clientesComStatusReal, contratos);
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

    console.warn(`Status não carregou usando ${consulta.ordem}:`, error);
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
    const codigoPonto = normalizarCodigo(ponto.codigo || ponto.codigo_ponto || ponto.ponto_codigo || "");
    const statusEncontrado = statusPorCodigo[codigoPonto];

    const pontoIndisponivel =
      ponto.disponivel === false ||
      ponto.indisponivel === true ||
      String(ponto.disponivel || "").toLowerCase().trim() === "false" ||
      String(ponto.status_disponibilidade || "").toLowerCase().includes("indispon");

    const statusCadastro = normalizarStatus(ponto.status || "");
    const statusAtual = normalizarStatus(statusEncontrado?.status || statusEncontrado?.evento || "");

    return {
      ...ponto,
      codigo_final: codigoPonto,
      status_final: pontoIndisponivel || statusCadastro === "desativado" ? "desativado" : statusAtual,
      ultimo_ping_final: statusEncontrado?.ultimo_ping || statusEncontrado?.data_hora || ponto.ultimo_ping || ponto.updated_at || null
    };
  });
}

function atualizarMetricas(pontos) {
  const total = pontos.length;
  const ativos = pontos.filter(p => p.status_final === "ativo").length;
  const uptime = calcularUptimeMedio(pontos);

  setTexto("totalReproducoes", "2041");
  setTexto("totalQrCode", "16");
  setHtml("pontosAtivos", `${ativos} <small>+0</small>`);
  setTexto("totalPontosTexto", `De um total de ${total} pontos`);
  setTexto("uptimeMedio", `${uptime}%`);
}

function atualizarPainel(pontos) {
  atualizarMetricas(pontos);
  atualizarDonut(pontos);

  const ordem = {
    "ativo": 1,
    "inativo": 2,
    "desativado": 3
  };

  const pontosOrdenados = [...pontos].sort((a, b) => {
    const ordemA = ordem[a.status_final] || 99;
    const ordemB = ordem[b.status_final] || 99;

    if (ordemA !== ordemB) return ordemA - ordemB;

    return new Date(b.ultimo_ping_final || 0) - new Date(a.ultimo_ping_final || 0);
  });

  renderizarPontos(pontosOrdenados);
}

function atualizarDonut(pontos) {
  const total = pontos.length;
  const ativos = pontos.filter(p => p.status_final === "ativo").length;
  const inativos = pontos.filter(p => p.status_final === "inativo").length;
  const desativados = pontos.filter(p => p.status_final === "desativado").length;

  setTexto("donutTotal", total);
  setHtml("legendaAtivos", `${ativos} (${percentual(ativos, total)})`);
  setHtml("legendaInativos", `${inativos} (${percentual(inativos, total)})`);
  setHtml("legendaDesativados", `${desativados} (${percentual(desativados, total)})`);

  const donut = document.querySelector(".donut");
  if (!donut) return;

  if (!total) {
    donut.style.background = "#1e293b";
    return;
  }

  const pAtivos = (ativos / total) * 100;
  const pInativos = pAtivos + (inativos / total) * 100;

  donut.style.background = `conic-gradient(
    #22c55e 0% ${pAtivos}%,
    #ef4444 ${pAtivos}% ${pInativos}%,
    #6b7280 ${pInativos}% 100%
  )`;
}

function renderizarPontos(pontos) {
  const lista = document.getElementById("listaPontos");
  if (!lista) return;

  lista.innerHTML = "";

  if (!pontos.length) {
    lista.innerHTML = `<div class="empty-state">Nenhum ponto encontrado.</div>`;
    return;
  }

  pontos.forEach(ponto => {
    const nome = ponto.nome || ponto.nome_ponto || ponto.nome_local || ponto.titulo || ponto.codigo_final || "Ponto sem nome";
    const status = ponto.status_final;
    const imagem = ponto.imagem_url || ponto.foto_url || ponto.imagem || ponto.banner_url || "https://placehold.co/600x300/020617/ffffff?text=Indoor+Midia";

    lista.innerHTML += `
      <article class="point-card ${classeStatus(status)}" data-codigo="${escaparHtml(ponto.codigo_final)}" title="${escaparHtml(nome)}">
        <img src="${escaparHtml(imagem)}" alt="${escaparHtml(nome)}" loading="lazy">

        <div class="point-overlay">
          <strong>${escaparHtml(nome)}</strong>
          <span class="${classeStatus(status)}">● ${textoStatus(status)}</span>
        </div>
      </article>
    `;
  });
}

function atualizarGraficoComercial(clientes, contratos) {
  const clientesAtivos = clientes.filter(cliente => {
    return normalizarStatusCliente(cliente) === "ativo";
  }).length;

  const clientesInativos = clientes.filter(cliente => {
    return normalizarStatusCliente(cliente) !== "ativo";
  }).length;

  const contratosTotal = contratos.length;
  const ganhos = clientesAtivos + contratosTotal;
  const quedas = clientesInativos;
  const saldo = ganhos - quedas;

  setTexto("novosContratos", saldo);
  atualizarTextoComercial(saldo, ganhos, quedas);

  const dados = [
    { label: "Clientes ativos", valor: clientesAtivos },
    { label: "Contratos", valor: contratosTotal },
    { label: "Quedas", valor: -quedas },
    { label: "Saldo", valor: saldo }
  ];

  desenharGraficoResumoComercial(dados);
}

function atualizarTextoComercial(saldo, ganhos, quedas) {
  const texto = document.querySelector(".contract-number p");
  const comparativo = document.querySelector(".contract-number strong");

  if (texto) texto.textContent = "saldo comercial";
  if (comparativo) comparativo.textContent = `Ganhos ${ganhos} | Quedas ${quedas}`;
}

function desenharGraficoResumoComercial(dados) {
  const svg = document.querySelector(".contracts .chart svg");
  const linha = document.querySelector(".contracts .chart svg .line");
  const area = document.querySelector(".contracts .chart svg .area");
  const labels = document.querySelectorAll(".contracts .chart-labels span");

  if (!svg || !linha || !area || !dados.length) return;

  const largura = 545;
  const inicioX = 30;
  const baseY = 210;
  const topoY = 70;

  const valores = dados.map(item => item.valor);
  const max = Math.max(...valores, 1);
  const min = Math.min(...valores, 0);
  const faixa = Math.max(max - min, 1);

  const pontos = dados.map((item, index) => {
    const x = inicioX + (index * largura) / (dados.length - 1);
    const y = baseY - ((item.valor - min) / faixa) * (baseY - topoY);
    return { x, y };
  });

  const pathLinha = pontos.map((ponto, index) => {
    return `${index === 0 ? "M" : "L"}${ponto.x.toFixed(1)} ${ponto.y.toFixed(1)}`;
  }).join(" ");

  const pathArea = `${pathLinha} L${pontos[pontos.length - 1].x.toFixed(1)} 240 L${pontos[0].x.toFixed(1)} 240 Z`;

  linha.setAttribute("d", pathLinha);
  area.setAttribute("d", pathArea);

  svg.querySelectorAll("circle").forEach(circle => circle.remove());

  pontos.forEach(ponto => {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", ponto.x);
    circle.setAttribute("cy", ponto.y);
    circle.setAttribute("r", "7");
    svg.appendChild(circle);
  });

  labels.forEach((label, index) => {
    label.textContent = dados[index] ? dados[index].label : "";
  });
}

function calcularStatusRealClientes(clientes, playlists) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const clientesAtivosPorPlaylist = new Set();

  playlists.forEach(item => {
    const codigo = normalizarCodigo(item.codigo_cliente || "");
    if (!codigo) return;

    const dataFimValor = item.data_fim;

    if (!dataFimValor) {
      clientesAtivosPorPlaylist.add(codigo);
      return;
    }

    const dataFim = new Date(dataFimValor);
    if (!Number.isNaN(dataFim.getTime()) && dataFim >= hoje) {
      clientesAtivosPorPlaylist.add(codigo);
    }
  });

  return clientes.map(cliente => {
    const codigo = normalizarCodigo(cliente.codigo || "");
    const statusBanco = String(cliente.statuscliente || cliente.status || "").toLowerCase().trim();
    const supervisor = String(cliente.tipo_acesso || "").toLowerCase().trim() === "supervisor";

    return {
      ...cliente,
      status_real: supervisor || clientesAtivosPorPlaylist.has(codigo) || statusBanco === "ativo" ? "ativo" : "inativo"
    };
  });
}

function clienteTemContrato(cliente) {
  return Boolean(
    String(cliente.contrato || "").trim() ||
    String(cliente.contrato_texto || "").trim() ||
    String(cliente.contrato_modelo_nome || "").trim() ||
    String(cliente.contrato_status || "").trim() ||
    String(cliente.contrato_enviado_em || "").trim()
  );
}

function calcularUptimeMedio(pontos) {
  if (!pontos.length) return "0,0";

  const ativos = pontos.filter(ponto => ponto.status_final === "ativo").length;
  return ((ativos / pontos.length) * 100).toFixed(1).replace(".", ",");
}

function calcularUptimeIndividual(ultimoPing, status) {
  if (status === "ativo") return 100;
  return 0;
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

  if (
    s === "inativo" ||
    s === "parado" ||
    s === "offline" ||
    s === "desconectado" ||
    s === "desconectou" ||
    s === "sem material" ||
    s === "sem_material" ||
    s === "sem-material"
  ) {
    return "inativo";
  }

  return "inativo";
}

function normalizarStatusCliente(cliente) {
  const status = String(cliente?.status_real || cliente?.statuscliente || cliente?.status || "")
    .toLowerCase()
    .trim();

  return status === "ativo" ? "ativo" : "inativo";
}

function textoStatus(status) {
  if (status === "ativo") return "ATIVO";
  if (status === "inativo") return "INATIVO";
  return "DESATIVADO";
}

function classeStatus(status) {
  if (status === "ativo") return "active";
  if (status === "inativo") return "inactive";
  return "offline";
}

function barraStatus(status) {
  if (status === "inativo" || status === "desativado") return "inactive-bar";
  return "";
}

function percentual(valor, total) {
  if (!total) return "0%";
  return ((valor / total) * 100).toFixed(1).replace(".", ",") + "%";
}

function formatarPing(data) {
  if (!data) return "--:--:--";

  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return "--:--:--";

  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function setTexto(id, texto) {
  const el = document.getElementById(id);
  if (el) el.textContent = texto;
}

function setHtml(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function escaparHtml(valor) {
  return String(valor || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
