@echo off
REM ============================================================
REM  backup.bat — backup manual para GitHub (release estavel)
REM
REM  O QUE FAZ:
REM    1. Corre os 105 testes
REM    2. Se passarem:
REM         a) pede nome da versao (ex: v3.1-match-detalhes)
REM         b) git add + commit + tag + push
REM    3. Se algum teste falhar:
REM         AVISA e NAO faz backup (preserva o ultimo estado bom)
REM
REM  COMO USAR:
REM    backup.bat
REM    (responde ao prompt com o nome da versao)
REM
REM  COMO REVERTER PARA UMA VERSAO ANTERIOR:
REM    cd C:\Users\lion_\projetos\leiloes-pt
REM    git tag                          <- ver tags disponiveis
REM    git reset --hard v3.0-real-data  <- voltar para essa tag
REM
REM  NOTA: usa `py -3.13` porque o Python 3.14 nao tem pandas
REM        instalado. PYTHONPATH="" evita conflito com outros
REM        virtualenvs.
REM ============================================================

setlocal

cd /d "%~dp0"

echo.
echo ============================================================
echo   BACKUP MANUAL — LEILOES-PT
echo ============================================================
echo.

REM 1. Verificar que ha alteracoes
git status --short > "%TEMP%\backup_status.txt" 2>nul
if errorlevel 1 (
    echo [ERRO] Nao consigo correr git status. Repo inicializado?
    exit /b 1
)

for /f %%i in ("%TEMP%\backup_status.txt") do set SIZE=%%~zi
if "%SIZE%"=="0" (
    echo [INFO] Nenhuma alteracao desde o ultimo commit.
    echo [INFO] Nada para fazer backup. Saindo.
    del "%TEMP%\backup_status.txt" 2>nul
    exit /b 0
)

echo [INFO] Alteracoes detetadas:
type "%TEMP%\backup_status.txt"
echo.
del "%TEMP%\backup_status.txt" 2>nul

REM 2. Correr testes
echo ============================================================
echo   A CORRER TESTES (105 testes)...
echo ============================================================
echo.

set PYTHONPATH=
py -3.13 -m pytest data/ -q --tb=short
if errorlevel 1 (
    echo.
    echo ============================================================
    echo   [FALHOU] TESTES FALHARAM. BACKUP NAO FEITO.
    echo ============================================================
    echo.
    echo Os testes passaram a vermelho. Nenhum backup foi criado.
    echo Para reverter as alteracoes que quebraram os testes:
    echo     git checkout .
    echo     git clean -fd
    echo.
    exit /b 1
)

echo.
echo ============================================================
echo   [OK] TODOS OS TESTES PASSAM.
echo ============================================================
echo.

REM 3. Pedir nome da versao
set /p VERSION="Nome da versao (ex: v3.1-match-detalhes): "
if "%VERSION%"=="" (
    echo [ERRO] Nome de versao vazio. Abortando.
    exit /b 1
)

REM 4. git add + commit + tag + push
echo.
echo [INFO] A fazer commit, tag e push...

git add -A
git commit -m "release: %VERSION%" >nul
if errorlevel 1 (
    echo [ERRO] git commit falhou.
    exit /b 1
)

git tag -a %VERSION% -m "Release estavel %VERSION%"
git push origin main
if errorlevel 1 (
    echo [ERRO] git push falhou. Verifica a conexao.
    exit /b 1
)

git push origin %VERSION%
if errorlevel 1 (
    echo [AVISO] Push da tag falhou. O commit foi feito mas a tag nao.
    echo [AVISO] Podes tentar manualmente:
    echo     git push origin %VERSION%
    exit /b 1
)

echo.
echo ============================================================
echo   [OK] BACKUP FEITO COM SUCESSO!
echo ============================================================
echo.
echo   Versao:  %VERSION%
echo   Repo:    https://github.com/LegendaryLionMan/leiloes-pt
echo   Tags:    https://github.com/LegendaryLionMan/leiloes-pt/tags
echo.
echo   Para reverter para esta versao no futuro:
echo       git reset --hard %VERSION%
echo.

endlocal
