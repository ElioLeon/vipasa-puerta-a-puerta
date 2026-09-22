// Store: abstrae dónde vive el "estado" de cada vivienda (contactado, vive alguien, notas).
// - Si Firebase está configurado -> Firestore, sincronizado en tiempo real entre todo el equipo.
// - Si no -> localStorage, solo en este móvil (útil para probar la app sin configurar nada).

import { firebaseConfig, firebaseConfigured, COLLECTION_NAME } from "./firebase-config.js";

const LOCAL_KEY = "vipasa_status_v1";

class LocalStore {
  constructor() {
    this.mode = "local";
    this.data = this._load();
    this.listeners = [];
  }
  _load() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }
  _save() {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(this.data));
    } catch {
      // almacenamiento lleno o bloqueado: seguimos en memoria
    }
  }
  onChange(cb) {
    this.listeners.push(cb);
    cb(this.data);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }
  _emit() {
    for (const l of this.listeners) l(this.data);
  }
  async setUnitStatus(buildingId, unitIndex, patch) {
    if (!this.data[buildingId]) this.data[buildingId] = {};
    this.data[buildingId][unitIndex] = {
      ...(this.data[buildingId][unitIndex] || {}),
      ...patch,
      updatedAt: Date.now(),
    };
    this._save();
    this._emit();
  }
}

class FirestoreStore {
  constructor(db, collection, onSnapshot, doc, setDoc, mergeFn) {
    this.mode = "firestore";
    this.db = db;
    this.collectionRef = collection(db, COLLECTION_NAME);
    this.onSnapshot = onSnapshot;
    this.doc = doc;
    this.setDoc = setDoc;
    this.merge = mergeFn;
    this.data = {};
  }
  onChange(cb) {
    return this.onSnapshot(this.collectionRef, (snap) => {
      snap.forEach((docSnap) => {
        this.data[docSnap.id] = docSnap.data().units || {};
      });
      cb(this.data);
    }, (err) => {
      console.error("Firestore sync error:", err);
    });
  }
  async setUnitStatus(buildingId, unitIndex, patch) {
    const ref = this.doc(this.db, COLLECTION_NAME, buildingId);
    const prevUnits = (this.data[buildingId] || {});
    const prevUnit = prevUnits[unitIndex] || {};
    const nextUnit = { ...prevUnit, ...patch, updatedAt: Date.now() };
    await this.setDoc(
      ref,
      { units: { [unitIndex]: nextUnit } },
      { merge: true }
    );
  }
}

export async function createStore() {
  if (!firebaseConfigured) {
    return new LocalStore();
  }
  try {
    const [{ initializeApp }, authMod, fsMod] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js"),
    ]);
    const app = initializeApp(firebaseConfig);
    const auth = authMod.getAuth(app);
    await authMod.signInAnonymously(auth);
    const db = fsMod.getFirestore(app);
    return new FirestoreStore(
      db,
      fsMod.collection,
      fsMod.onSnapshot,
      fsMod.doc,
      fsMod.setDoc
    );
  } catch (e) {
    console.error("No se pudo conectar a Firebase, usando modo local.", e);
    return new LocalStore();
  }
}
