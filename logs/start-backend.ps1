Set-Location "C:\Users\lion_\projetos\leiloes-pt-v4"
$env:PYTHONPATH = "C:\Users\lion_\projetos\leiloes-pt-v4\vendor\leiloes-pt-data;C:\Users\lion_\projetos\leiloes-pt-v4"
py -3.13 -m uvicorn app.api.main:app --host 127.0.0.1 --port 8001
