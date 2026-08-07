import fs from "node:fs";
import { parse } from "csv-parse/sync";

function escreverJson(caminhoArquivo) {
    try {
        const arq = fs.readFileSync(caminhoArquivo, "utf8");

        const dados = parse(arq, {
            columns: true,
            skip_empty_lines: true
        });

         fs.writeFileSync(
            "consulta.json", 
            JSON.stringify(dados, null ,2), 
            "utf8"
        );

        const jsonData = fs.readFileSync("consulta.json", "utf8");

        return JSON.parse(jsonData);

    } catch (err) {
        console.error("Não foi possível escrever o arquivo JSON:", err.message);
    }
}

async function buscarRegistroPorCep(cepBuscado) {
    try {
        
        let data = escreverJson("consulta.csv");

        let cep = data.find(
            item => item.cep.trim() == String(cepBuscado).trim()
        );
        
        if (!cep) {
            console.error("CEP não encontrado.");
            return;
        }

        let url = `https://viacep.com.br/ws/${cepBuscado}/json/`;

        return await fetch(url).then(resp => resp.json());

    } catch (err) {
        console.error("Não foi possível buscar o registro por CEP:", err.message);
    }
}

async function main() {
    let cep = "49010-390";
    console.log(await criarJsonFinal(cep));
}

main();