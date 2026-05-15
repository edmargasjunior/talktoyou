# Build Android com Apache Cordova

Este projeto agora tem uma camada Cordova para gerar APK Android sem mover os arquivos web originais da raiz.

## Requisitos

- Node.js e npm
- JDK 17
- Android SDK instalado em `~/Android/Sdk` ou `ANDROID_HOME` configurado
- Gradle instalado no sistema, no Android Studio ou em `~/.local/gradle/gradle-8.13`

## Primeiro uso

```bash
npm install
npm run android:add
```

## Gerar APK de teste

```bash
npm run android:debug
```

Os scripts npm configuram automaticamente `ANDROID_HOME`, `ANDROID_SDK_ROOT` e o `PATH` quando o SDK esta em `~/Android/Sdk`.

O APK de debug fica em:

```text
platforms/android/app/build/outputs/apk/debug/app-debug.apk
```

## Gerar APK/AAB de release

```bash
npm run android:release
```

Para publicar na Play Store, assine o build de release com uma chave própria. A assinatura pode ser configurada depois com `build.json` ou pelo Android Studio.

## Como funciona

Antes de preparar ou compilar, o script `scripts/prepare-cordova-www.js` recria a pasta `www/` copiando `index.html`, `ajuda.html`, `privacidade.html`, `manifest.json`, `sw.js`, `assets/`, `css/` e `js/`. No `www/index.html`, ele injeta `cordova.js` e `js/cordova-bootstrap.js` para ativar permissões Android.

Edite o app normalmente nos arquivos da raiz. Use `npm run cordova:sync` quando quiser atualizar manualmente a pasta `www/`.