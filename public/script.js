//Cria uma conexão com o servidor Socket.IO
const socket = io();

console.log("Script carregado!");


const tipoJogador = document.getElementById("tipoJogador");
const log = document.getElementById("log");
const botaoPedra = document.getElementById("pedra");
const botaoPapel = document.getElementById("papel");
const botaoTesoura = document.getElementById("tesoura");
const loglobby = document.getElementById("loglobby");
const lobby = document.getElementById("lobby");
const sala = document.getElementById("sala");
const statusPartida = document.getElementById("statusPartida");


// Envia a jogada escolhida pelo jogador ao servidor por meio do Socket.IO.
botaoPedra.addEventListener("click", () => {
    socket.emit("jogada", "pedra");
});

botaoPapel.addEventListener("click", () => {
    socket.emit("jogada", "papel");
});

botaoTesoura.addEventListener("click", () => {
    socket.emit("jogada", "tesoura");
});

function adicionarLog(mensagem) {
    log.innerHTML += `<p>${mensagem}</p>`;
}//Essa função cria um pequeno log das ações que estão sendo realizadas e mostra na pagina web, dentro da partida


function adicionarLoglobby(mensagem) {
    loglobby.innerHTML += `<p>${mensagem}</p>`;
}//Essa função cria um pequeno log das ações que estão sendo realizadas e mostra na pagina web, dentro do lobby

socket.on("tipoJogador", (tipo) => {
    tipoJogador.textContent = tipo;
});

socket.on("erro", (dados) => {
    if (sala.style.display === "flex") {
        adicionarLog(dados.mensagem);
    } else {
        adicionarLoglobby(dados.mensagem);
    }
});

socket.on("login", (mensagem) => {
    adicionarLog(mensagem);
});

socket.on("logout", (mensagem) => {
    adicionarLog(mensagem);
});

socket.on("status_partida", ({ status }) => {
    statusPartida.textContent = status;
});

document.getElementById("criarSala").addEventListener("click", () => {
    socket.emit("criar_sala");
});

document.getElementById("entrarSala").addEventListener("click", () => {
    const codigo = document.getElementById("codigoSala").value.trim().toUpperCase();
    socket.emit("entrar_sala", { codigo });
});

socket.on("sala_entrada", ({ codigo, papel }) => {
    lobby.style.display = "none";
    sala.style.display = "flex";
    tipoJogador.textContent = `Sala ${codigo} — você é: ${papel}`;
});

