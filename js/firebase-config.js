// Rellena estos valores tras crear tu proyecto Firebase gratuito (ver README.md).
// Mientras estén así (placeholders), la app funciona en "modo local":
// cada móvil guarda sus propios datos y NO se comparte con el resto del equipo.
export const firebaseConfig = {
  apiKey: "AIzaSyDdqJjK3ZOEarwFrYEZ1yiMBr1sZP2tiRY",
  authDomain: "vipasa-puerta-a-puerta.firebaseapp.com",
  projectId: "vipasa-puerta-a-puerta",
  storageBucket: "vipasa-puerta-a-puerta.firebasestorage.app",
  messagingSenderId: "398589147584",
  appId: "1:398589147584:web:ca502b8d742c5942f43025",
};

export const firebaseConfigured =
  firebaseConfig.apiKey !== "TU_API_KEY" && !!firebaseConfig.apiKey;

// Nombre de la colección en Firestore donde se guarda el estado de cada edificio.
export const COLLECTION_NAME = "vipasa_gijon_oviedo";
