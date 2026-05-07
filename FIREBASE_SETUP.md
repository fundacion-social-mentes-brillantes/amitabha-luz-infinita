# Configuración exacta de Firebase

## 1. Authentication

En Firebase Console:

- Authentication > Sign-in method.
- Activa Email/Password.

## 2. Firestore

- Firestore Database > Create database.
- Empieza en modo production.
- Usa una región cercana. Para Colombia, una opción común es `nam5` si aparece disponible.

## 3. Reglas

Copia el contenido de `firestore.rules` en Firestore Rules.

## 4. Variables para Vercel

En Vercel > Project > Settings > Environment Variables agrega:

- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID

## 5. Verificación

Después de configurar Firebase:

- Crea una cuenta desde la pantalla de login.
- Registra un insumo.
- Recarga la página.
- Si el dato permanece, Firestore está sincronizando.
