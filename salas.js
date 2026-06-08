const SENHA_PAINEL = "@helena";

const loginBox = document.getElementById("loginBox");
const conteudoPainel = document.getElementById("conteudoPainel");
const senhaInput = document.getElementById("senhaInput");
const btnLogin = document.getElementById("btnLogin");
const loginErro = document.getElementById("loginErro");
const listaPontos = document.getElementById("listaPontos");

const pontosDemo = [
  { nome: "Nova sala", endereco: "Predio nao informado", codigo: "UCLCFGG", imagem: "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=900&q=70" },
  { nome: "Nova sala", endereco: "Predio nao informado", codigo: "RR3DCPG", imagem: "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=900&q=70" },
  { nome: "Nova sala", endereco: "Prof Julio Cesar", codigo: "J7QUGJM", imagem: "https://images.unsplash.com/photo-1606761568499-6d2451b23c66?auto=format&fit=crop&w=900&q=70" },
  { nome: "Sala A", endereco: "Prof Max de Menezes", codigo: "C68X5ZQ", imagem: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=70" }
];

function liberarPainel() {
  if (loginBox) loginBox.style.display = "none";
  if (conteudoPainel) conteudoPainel.style.display = "grid";
  renderizarPontos();
}

function bloquearPainel() {
  if (loginBox) loginBox.style.display = "grid";
  if (conteudoPainel) conteudoPainel.style.display = "none";
}

function validarLogin() {
  const senha = senhaInput ? senhaInput.value.trim() : "";
  if (senha !== SENHA_PAINEL) {
    if (loginErro) loginErro.textContent = "CÃ³digo invÃ¡lido";
    return;
  }
  sessionStorage.setItem("painelLiberado", "1");
  if (loginErro) loginErro.textContent = "";
  liberarPainel();
}

function renderizarPontos() {
  if (!listaPontos || listaPontos.dataset.renderizado === "1") return;
  listaPontos.dataset.renderizado = "1";
  listaPontos.innerHTML = pontosDemo.map((ponto) => `
    <article class="point-card">
      <div class="card-topo"><span class="status-pill">Inativo</span><span class="telas-topo">0 telas</span></div>
      <img src="${ponto.imagem}" alt="${ponto.nome}" loading="lazy">
      <h3>${ponto.nome}</h3>
      <div class="card-info"><p>${ponto.endereco}</p><span class="codigo-pill">${ponto.codigo}</span></div>
      <button class="btn-detalhes" type="button">Entrar na sala <span>â†’</span></button>
    </article>
  `).join("");
}

function trocarView(view) {
  document.querySelectorAll(".painel-view").forEach((secao) => {
    secao.classList.toggle("ativo", secao.id === `view${view[0].toUpperCase()}${view.slice(1)}`);
  });

  document.querySelectorAll(".menu-item[data-view]").forEach((item) => {
    item.classList.toggle("ativo", item.dataset.view === view);
  });
}

if (sessionStorage.getItem("painelLiberado") === "1") liberarPainel();
else bloquearPainel();

if (btnLogin) btnLogin.addEventListener("click", validarLogin);
if (senhaInput) senhaInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") validarLogin();
});

document.querySelectorAll(".menu-item[data-view]").forEach((item) => {
  item.addEventListener("click", () => trocarView(item.dataset.view));
});

const btnLogout = document.getElementById("btnLogout");
if (btnLogout) btnLogout.addEventListener("click", () => {
  sessionStorage.removeItem("painelLiberado");
  window.location.reload();
});
