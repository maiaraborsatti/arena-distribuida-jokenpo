//Cria uma conexão com o servidor Socket.IO
const socket = io();

console.log("Script carregado!");


const tipoJogador = document.getElementById("tipoJogador");
const log = document.getElementById("log");


function adicionarLog(mensagem) {
    log.innerHTML += `<p>${mensagem}</p>`;
}//Essa função cria um pequeno log das ações que estão sendo realizadas

socket.on("tipoJogador", (tipo) => {
    tipoJogador.textContent = tipo;
});

socket.on("login", (mensagem) => {
    adicionarLog(mensagem);
});

socket.on("logout", (mensagem) => {
    adicionarLog(mensagem);
});