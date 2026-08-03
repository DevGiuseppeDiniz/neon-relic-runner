# Neon Dash Touch

Jogo web estilo Geometry Dash em HTML, CSS e JavaScript para rodar em navegador, GitHub Pages e dentro do componente **WebViewer** do MIT App Inventor.

## Como jogar

- Toque em qualquer lugar da tela para iniciar.
- Toque para pular.
- Segure o toque por um instante para um salto mais alto.
- Colete moedas e desvie dos espinhos.
- Atravesse portais para inverter a gravidade.

## Publicar no GitHub Pages

1. Crie um repositorio no GitHub.
2. Envie estes arquivos para o repositorio.
3. No GitHub, abra **Settings > Pages**.
4. Em **Build and deployment**, selecione **Deploy from a branch**.
5. Escolha a branch `master` ou `main` e a pasta `/root`.
6. Salve e aguarde o link ficar disponivel.

O link normalmente fica assim:

```text
https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/
```

## Usar no MIT App Inventor

1. Abra seu projeto no MIT App Inventor.
2. Adicione o componente **WebViewer** na tela.
3. No painel de propriedades, cole a URL do GitHub Pages em **UrlInicial**.
4. Marque **Visible** e deixe **Width** e **Height** como **Fill parent**.
5. Compile ou teste pelo Companion.

Se a tela carregar em branco, confirme se o GitHub Pages terminou a publicacao e se a URL termina com `/`.
