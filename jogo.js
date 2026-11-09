function determinarResultado(jogada1, jogada2) {
    const jogadasValidas = ["pedra", "papel", "tesoura"];

    if (!jogadasValidas.includes(jogada1) || 
        !jogadasValidas.includes(jogada2)){
        return "jogada_invalida";
    }

    if (jogada1 === jogada2){
        return "empate";
    }

    if (
        (jogada1 === "pedra" && jogada2 === "tesoura") || 
        (jogada1 === "tesoura" && jogada2 === "papel") || 
        (jogada1 === "papel" && jogada2 === "pedra")
    ){
        return "jogador1";
    }

    return "jogador2";
}

module.exports = { determinarResultado };