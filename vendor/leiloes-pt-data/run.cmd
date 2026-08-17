@echo off
REM run.cmd — atalho Windows para arrancar o painel (com suporte NordVPN Meshnet)
cd /d %~dp0
echo === Painel de Leiloes Portugal ===
echo.
echo A instalar dependencias (se necessario)...
pip install -q -r requirements.txt
echo.
echo A arrancar Streamlit em http://localhost:8501
echo Para acesso no telemovel via NordVPN Mesh: ver URL na sidebar do painel.
echo.
echo Feche esta janela ou Ctrl+C para parar.
echo.
REM --server.address 0.0.0.0 permite conexoes de outros dispositivos (Meshnet)
REM --server.enableCORS=false e --server.enableXsrfProtection=false sao necessarios
REM para o Streamlit aceitar requests cross-origin vindos do browser do telemovel.
streamlit run app.py --server.address 0.0.0.0 --server.enableCORS false --server.enableXsrfProtection false
pause
