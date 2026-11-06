curl http://127.0.0.1:1234/v1/embeddings \
 -H "Content-Type: application/json" \
 -d '{
"model": "text-embedding-nomic-embed-text-v1.5",
"input": "Some text to embed"
}'
