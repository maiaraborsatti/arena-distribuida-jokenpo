//Cria uma conexão com o servidor Socket.IO
const socket = io();

console.log("Script carregado!");


const tipoJogador = document.getElementById("tipoJogador");
const log = document.getElementById("log");
const enviar = document.getElementById("enviar");


//Aqui é um teste usando o botão de enviar com um input na pagina web, apenas para validar as permissoes de jogadores e espectadores
enviar.addEventListener("click", () => {
    socket.emit("clique");
    
});

function adicionarLog(mensagem) {
    log.innerHTML += `<p>${mensagem}</p>`;
}//Essa função cria um pequeno log das ações que estão sendo realizadas e mostra na pagina web

socket.on("tipoJogador", (tipo) => {
    tipoJogador.textContent = tipo;
});

socket.on("login", (mensagem) => {
    adicionarLog(mensagem);
});

socket.on("logout", (mensagem) => {
    adicionarLog(mensagem);
});