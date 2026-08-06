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

function lerJson(caminhoArquivo) {
    try {
        const jsonData = fs.readFileSync(caminhoArquivo, "utf8");

        const json = JSON.parse(jsonData);

        let url = "https://viacep.com.br/ws/{json.cep}/json/"
    } catch (err) {
        console.error("Não foi possível ler o arquivo JSON:", err.message);
    }
}

function main() {
    escreverJson("consulta.csv");
}

main();