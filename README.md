# Il Mio Garage — Frontend Mobile & Sistema Integrato

Applicazione mobile sviluppata in **React Native** con **Expo** (SDK 58) e **TypeScript**, progettata per la gestione completa e intuitiva di un garage personale o aziendale (veicoli, tagliandi, manutenzioni, scadenze, fatture/ricevute ed esportazione PDF certificata).

---

## 📱 Funzionalità Principali

### 🔐 1. Autenticazione & Profilo Utente
- **Registrazione con Benvenuto Dedicato:** Nuovo flusso di registrazione che invia un'email di benvenuto personalizzata tramite **Brevo** e mostra una modale di benvenuto una tantum al primo accesso.
- **Login Sicuro:** Autenticazione JWT con access token (15 minuti) e refresh token (7 giorni) memorizzati in modo cifrato via `expo-secure-store`.
- **Recupero Password Tramite Deep Link:**
  - Invio sicuro dell'email di recupero password tramite il backend;
  - Generazione dinamica del link compatibile con **Expo Go** in sviluppo (`exp://<IP>:8081/--/reset-password?token=...`) e con schema nativo in produzione (`mygarage://reset-password?token=...`);
  - Schermata `ResetPassword` per la reimpostazione della password con validazione in tempo reale e token monouso (validità 30 min).
- **Gestione Sessione:** Logout esplicito e cancellazione sicura delle credenziali.

---

### 🚗 2. Gestione Veicoli
- **Parco Veicoli:** Visualizzazione elenco auto, moto e altri mezzi con icone dedicate e colori personalizzati.
- **Dati Completi:** Marca, modello, anno di immatricolazione, targa e chilometraggio attuale.
- **Aggiornamento Rapido:** Possibilità di aggiornare rapidamente il chilometraggio del veicolo direttamente dalla scheda di dettaglio.
- **Cancellazione Sicura:** Rimozione del veicolo con dialogo di conferma per evitare cancellazioni accidentali.

---

### 🔧 3. Storico & Gestione Manutenzioni
- **Tipi di Intervento Flessibili:** Tagliando, revisione, cambio gomme, freni, distribuzione, carrozzeria, diagnosi e altro.
- **Tracciamento Preciso:** Data dell'intervento, chilometraggio al momento del lavoro, costo totale, officina/note libere.
- **Visualizzazione Cronologica:** Storico ordinato per data decrescente con indicazione chiara dei costi e dei chilometri trascorsi.
- **Modifica & Cancellazione:** Modifica completa dei campi e dell'allegato in una schermata dedicata e pulita.

---

### 📎 4. Gestione Ricevute & Allegati
- **Un allegato per intervento:** Possibilità di associare una fattura, ricevuta o foto per ciascuna manutenzione.
- **Scelta flessibile della sorgente:**
  - 📸 Scatto foto tramite fotocamera nativa;
  - 🖼️ Selezione immagine dalla galleria dello smartphone;
  - 📄 Selezione documento PDF da file system locale (gestione permessi nativi Android/iOS e normalizzazione multipart).
- **Anteprima & Condivisione:** Visualizzazione sicura dell'allegato scaricato in cache privata e condivisione tramite intent nativo (es. WhatsApp, Drive, PDF viewer).
- **Gestione in modifica:** Possibilità di eliminare l'allegato esistente e caricarne uno nuovo in sostituzione.

---

### 📊 5. Statistiche & Spese
- **Home Dashboard:**
  - Contatore della spesa complessiva registrata su tutti i veicoli;
  - Schede veloci degli ultimi veicoli utilizzati;
  - Lista degli ultimi 3 interventi svolti con accesso rapido.
- **Sezione Costi:** Schermata analitica dedicata al riepilogo economico del garage.

---

### 📄 6. Esportazione Storico PDF con Allegati
- **Esportazione Completa per Veicolo:** Generazione di un unico documento PDF formattato professionalmente per il veicolo selezionato.
- **Grafica & Leggibilità A4:**
  - Tipografia potenziata ad alta leggibilità (date, chilometraggio, tipologie di intervento e costi in grande evidenza con badge dedicati);
  - Schede manutenzione ampie con bordi marcati e chiara gerarchia visiva;
  - Intestazione ufficiale con logo/titolo *Il Mio Garage*, targa, modello e riepilogo totale spese sostenute;
  - Storico ordinato cronologicamente dal più recente al meno recente.
- **Incorporamento Intelligente degli Allegati:**
  - 📸 **Immagini JPEG/PNG:** Riquadro dedicato con intestazione specifica dell'intervento (`FOTOGRAFIA ALLEGATA — Tipo del Data`), proporzioni originali preservate senza deformazioni o ritagli.
  - 📄 **Pagine Introduttive Separatore PDF:** Prima di ogni documento PDF allegato viene inserita una pagina formale con dicitura in evidenza **«ALLEGATO DELL'INTERVENTO»**, data, tipo di intervento, km, costo registrato, targa e nome originale del file.
  - 📑 **Integrazione Vettoriale Pagine Originali:** Tutte le pagine originali del PDF allegato sono inserite integralmente subito dopo il separatore, preservando orientamento, testo vettoriale e risoluzione di stampa originale al 100%.
  - Segnalazione chiara di eventuali allegati mancanti senza bloccare la generazione del report.
- **Salvataggio Diretto & Condivisione:**
  - 💾 **Salvataggio Diretto su Dispositivo (Android SAF):** Possibilità di selezionare direttamente la cartella di destinazione (es. *Download*, *Documenti*) tramite *Storage Access Framework*, con nome file standardizzato `storico-manutenzioni-TARGA.pdf` e gestione pulita dell'eventuale annullamento.
  - 📤 **Condivisione Nativa:** Disponibile per inviare rapidamente il file via WhatsApp, Email, Google Drive o stamparlo.

---

## 🏗️ Architettura & Tecnologie

| Ambito | Tecnologia | Dettagli |
|---|---|---|
| **Piattaforma** | React Native + Expo | Expo SDK 58, React 19, TypeScript |
| **Navigazione** | React Navigation v6 | Native Stack + Bottom Tabs + Deep Linking (`LinkingOptions`) |
| **UI & Styling** | React Native Paper & Lucide | Material Design 3, Lucide React Native Icons, Font Manrope |
| **Storage Sicuro** | `expo-secure-store` | Persistenza cifrata di JWT e Refresh Token |
| **Media & Files** | Expo Camera/Picker/FS | `expo-image-picker`, `expo-document-picker`, `expo-file-system`, `expo-sharing` |
| **PDF Engine** | `expo-print` + `pdf-lib` | Generazione layout A4 da HTML/CSS e manipolazione/fusione binaria di pagine PDF e JPEG |
| **Backend** | Spring Boot 3.3 (Java) | REST API, Spring Security 6 (JWT stateless), Flyway, PostgreSQL |
| **Email Service** | Brevo API | Email transazionali per benvenuto e recupero password |

---

## 🚀 Guida all'Avvio (Sviluppo Locale)

### 1. Prerequisiti
- Node.js (v18+ raccomandato);
- Smartphone fisico con app **Expo Go** installata;
- Smartphone e computer collegati alla **stessa rete Wi-Fi**.

### 2. Configurazione Ambiente Frontend
Nel file `.env.local` alla radice di questo progetto, imposta l'indirizzo IP locale del tuo PC sulla porta del backend (`8080`):

```properties
EXPO_PUBLIC_API_URL=http://<TUO_IP_LOCALE>:8080
```
*(Esempio: `EXPO_PUBLIC_API_URL=http://192.168.0.172:8080`)*

### 3. Installazione e Avvio
```bash
# Installa le dipendenze
npm install

# Avvia il bundler Expo con cache pulita
npx expo start -c
```

Inquadra il QR code con l'app **Expo Go** (su Android tramite Expo Go, su iOS con Fotocamera).

---

## 🔗 Schemi di Deep Linking Supportati

- **Sviluppo (Expo Go):**  
  `exp://<IP_LOCALE>:8081/--/reset-password?token=<TOKEN>`
- **Produzione / APK Android:**  
  `mygarage://reset-password?token=<TOKEN>`
