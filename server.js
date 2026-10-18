
const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const PORT = 3000;


app.use(express.static("public"));


io.on("connection", (socket) => {
    console.log("Um jogador entrou!");

    
    socket.on("disconnect", () => {
        console.log("Um jogador saiu!");
    });
});

//Inicia o servidor
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
});