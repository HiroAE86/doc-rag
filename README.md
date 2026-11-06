# Doc RAG

Aplicação local para enviar documentos, indexar seus trechos como embeddings e encontrar trechos semelhantes a uma consulta. A interface usa React; o servidor, os workers e o SQLite usam Bun.

## Requisitos

- [Bun](https://bun.sh/) instalado.
- LM Studio com servidor compatível com OpenAI em `http://localhost:1234/v1` e o modelo de embeddings `text-embedding-nomic-embed-text-v1.5` carregado.

## Executar

```bash
bun install
bun run dev
```

Abra a URL exibida pelo servidor. Para executar em produção, use `bun start`; para gerar os arquivos da interface, use `bun run build`.

## Como usar

1. Envie até 20 arquivos por vez na seção de documentos.
2. Crie um job de indexação e aguarde a conclusão.
3. Digite uma consulta em **Search documents** para ver os trechos ordenados por similaridade.

Arquivos TXT e Markdown são divididos em trechos de até 1.000 caracteres Unicode e salvos no SQLite. O tamanho é definido atualmente em `src/lib/documentProcessing.ts`. PDFs e imagens são aceitos no envio, mas ficam com status `pending`: ainda não são extraídos, armazenados ou indexados.

Para detectar duplicatas, o conteúdo textual é normalizado removendo acentos, diferenças entre maiúsculas e minúsculas e caracteres que não sejam letras ou números. Um hash SHA-256 do resultado é comparado com os documentos salvos. Se um texto do lote já existir, o lote de textos não é salvo.

O banco local `documents.sqlite` é criado automaticamente na pasta de execução e é ignorado pelo Git. Ele guarda documentos, trechos, jobs e embeddings. Cada job indexa apenas trechos que ainda não têm embedding para o modelo; somente um job pode estar ativo por vez.

A busca calcula a similaridade de cosseno na aplicação sobre os vetores armazenados no SQLite e retorna até 10 resultados do mesmo modelo. Ela percorre todos esses vetores a cada consulta.

## API

### Enviar documentos

```bash
curl -X POST http://localhost:3000/api/docs \
  -F 'documents=@documento.txt' \
  -F 'documents=@notas.md'
```

Use a porta exibida pelo servidor se ela for diferente de `3000`. A resposta contém os documentos processados ou pendentes. Um conteúdo duplicado retorna HTTP 409.

### Indexar e acompanhar jobs

```bash
curl -X POST http://localhost:3000/api/index
curl http://localhost:3000/api/index
curl http://localhost:3000/api/index/1
```

`POST /api/index` cria um job e retorna HTTP 202; se já houver um job ativo, retorna HTTP 409 com seus dados. `GET /api/index` lista os jobs e `GET /api/index/:id` consulta um job específico.

### Buscar trechos

```bash
curl -X POST http://localhost:3000/api/embed \
  -H 'Content-Type: text/plain' \
  --data 'texto da consulta'
```

A resposta inclui o embedding gerado e `matches`, uma lista de trechos com título, conteúdo, índice, metadados, ID do job e score de similaridade.

## Verificação

```bash
bun test
bunx tsc --noEmit
bun run build
```
