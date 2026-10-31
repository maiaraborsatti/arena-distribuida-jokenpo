//Cria uma conexão com o servidor Socket.IO
const socket = io();

console.log("Script carregado!");


const tipoJogador = document.getElementById("tipoJogador");
const log = document.getElementById("log");
const loglobby = document.getElementById("loglobby");
const enviar = document.getElementById("enviar");
const lobby = document.getElementById("lobby");
const sala = document.getElementById("sala");


//Aqui é um teste usando o botão de enviar com um input na pagina web, apenas para validar as permissoes de jogadores e espectadores
enviar.addEventListener("click", () => {
    socket.emit("clique");
    
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

socket.on("login", (mensagem) => {
    adicionarLog(mensagem);
});

socket.on("logout", (mensagem) => {
    adicionarLog(mensagem);
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
    sala.style.display = "block";
    tipoJogador.textContent = `Sala ${codigo} — você é: ${papel}`;
});

socket.on("erro", ({ mensagem }) => adicionarLoglobby(mensagem));