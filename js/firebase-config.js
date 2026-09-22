// Rellena estos valores tras crear tu proyecto Firebase gratuito (ver README.md).
// Mientras estén así (placeholders), la app funciona en "modo local":
// cada móvil guarda sus propios datos y NO se comparte con el resto del equipo.
export const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:xxxxxxxxxxxxxxxxxxxxxx",
};

export const firebaseConfigured =
  firebaseConfig.apiKey !== "TU_API_KEY" && !!firebaseConfig.apiKey;

// Nombre de la colección en Firestore donde se guarda el estado de cada edificio.
export const COLLECTION_NAME = "vipasa_gijon_oviedo";
