# Prompt: backend REST per Il Mio Garage

Agisci come un senior Java backend engineer e software architect. Realizza da zero il backend REST di **Il Mio Garage**, un’app mobile React Native/Expo che gestisce account, veicoli e interventi di manutenzione gia svolti. Il risultato deve essere eseguibile, testato, documentato e pronto per essere collegato al frontend esistente.

Non realizzare un frontend. Non collegarti da codice applicativo a database diversi da PostgreSQL. Non introdurre scadenze, promemoria, regole di manutenzione o manutenzione predittiva: appartengono a una fase futura.

## 1. Obiettivo e perimetro

Il backend deve supportare i flussi attuali del frontend:

- registrazione, login, logout e autenticazione JWT;
- lettura e modifica dei dati del profilo;
- creazione, lettura, modifica ed eliminazione dei veicoli;
- scelta e restituzione dell’icona del veicolo;
- registrazione, lettura, modifica ed eliminazione delle manutenzioni gia effettuate;
- aggiornamento esplicito del chilometraggio del veicolo;
- aggiornamento automatico del chilometraggio corrente quando una manutenzione registrata ha un chilometraggio maggiore;
- riepilogo Home con veicoli, spesa e manutenzioni recenti;
- riepilogo costi complessivi e per anno/tipologia;
- paginazione e filtro dello storico per veicolo;
- errori API leggibili e stabili per il frontend.

Il frontend conserva localmente la preferenza tema chiaro/scuro: non aggiungere un endpoint o una tabella per questa impostazione.

## 2. Tecnologie obbligatorie

Usa:

- Java 21;
- Spring Boot 3.x, scegliendo una release stabile e compatibile disponibile al momento dell’implementazione;
- Maven;
- Spring Web;
- Spring Security;
- Spring Data JPA;
- Bean Validation;
- PostgreSQL, compatibile con Neon;
- Flyway per le migrazioni;
- JWT firmati e validati con una libreria mantenuta e configurazione Spring Security appropriata;
- springdoc-openapi per OpenAPI/Swagger;
- JUnit 5 e Mockito per i test unitari;
- Testcontainers PostgreSQL per i test d’integrazione, se l’ambiente lo consente.

Usa DTO distinti dalle entity JPA. Organizza il codice per moduli o feature, mantenendo separati controller, service, repository, DTO, entity, mapper, security, validation e gestione errori. Non inserire logica di business nei controller.

## 3. API e convenzioni

- Prefisso API: `/api/v1`.
- JSON UTF-8.
- ID: UUID.
- Date di manutenzione: `LocalDate`, formato ISO `YYYY-MM-DD`, senza conversioni di fuso orario.
- Timestamp tecnici: ISO 8601 UTC, per esempio `2026-10-20T14:30:00Z`.
- Prezzi: `BigDecimal`, JSON number, massimo due decimali, valuta EUR; mai usare `float`/`double` per importi.
- Chilometraggio: intero non negativo in km.
- Risorse private accessibili solo dal proprietario autenticato.
- Tutte le risposte di errore devono avere uno schema stabile, descritto nella sezione Errori.
- Non restituire password, hash, token interni o dati di altri utenti.

### Paginazione

Gli endpoint di lista manutenzioni accettano:

- `page`, default `0`;
- `size`, default `20`, massimo `100`;
- `sort`, default `date,desc`.

Formato suggerito:

```json
{
  "items": [],
  "page": 0,
  "size": 20,
  "totalItems": 0,
  "totalPages": 0
}
```

## 4. Modello dati

### User

Campi:

- `id: UUID`;
- `name: string`, obbligatorio, 1-100 caratteri;
- `email: string`, obbligatoria, validata, normalizzata in lowercase e univoca senza distinzione maiuscole/minuscole;
- `passwordHash: string`, mai esposto via API;
- `createdAt`, `updatedAt`.

Salvare le password con BCrypt o Argon2. La password deve avere almeno 8 caratteri: il frontend applica questa regola quando `EXPO_PUBLIC_API_URL` e configurato. La regola deve essere applicata anche dal backend e documentata negli errori di validazione.

### Vehicle

Campi:

- `id: UUID`;
- `ownerId: UUID`, relazione con User;
- `icon: VehicleIcon`;
- `brand: string`, obbligatoria, 1-80 caratteri;
- `model: string`, obbligatorio, 1-100 caratteri;
- `year: integer`, obbligatorio, intervallo ragionevole e messaggio di validazione esplicito;
- `plate: string`, obbligatoria, normalizzata in maiuscolo e senza spazi esterni;
- `mileage: integer`, obbligatorio, >= 0;
- `createdAt`, `updatedAt`.

I valori ammessi di `VehicleIcon` devono corrispondere esattamente a quelli del frontend:

```text
carFront, car, motorbike, scooter, truck, van
```

La targa deve essere univoca per proprietario, non globalmente. Non assumere che tutte le targhe del mondo abbiano lo stesso formato nazionale: normalizzare gli spazi e il case, ma mantenere il controllo formato ragionevole e configurabile.

### MaintenanceRecord

Campi:

- `id: UUID`;
- `ownerId: UUID`;
- `vehicleId: UUID`;
- `type: MaintenanceType`;
- `customDescription: string | null`;
- `date: LocalDate`;
- `mileage: integer`, >= 0;
- `cost: BigDecimal`, >= 0, massimo due cifre decimali;
- `notes: string | null`, massimo 2000 caratteri;
- `createdAt`, `updatedAt`.

Valori ammessi di `MaintenanceType` nell’API:

| Codice API | Etichetta italiana frontend |
|---|---|
| `OIL_CHANGE` | Cambio olio |
| `SERVICE` | Tagliando |
| `BRAKES` | Freni / pastiglie |
| `TIRE_CHANGE` | Cambio gomme |
| `WIPER_CHANGE` | Cambio tergicristalli |
| `INSPECTION` | Revisione |
| `BATTERY` | Batteria |
| `TIMING_BELT` | Distribuzione |
| `OTHER` | Altro |

Per `OTHER`, `customDescription` e obbligatoria, non vuota, massimo 100 caratteri. Per gli altri tipi deve essere `null` o assente. Le risposte includono sia `type` (codice stabile) sia `typeLabel` (etichetta pronta da mostrare; per OTHER restituisce la descrizione personalizzata). Il frontend dovra mappare le etichette del menu sui codici API.

## 5. Contratto endpoint

### Autenticazione

#### `POST /api/v1/auth/register`

Request:

```json
{
  "name": "Marco Rossi",
  "email": "marco@example.com",
  "password": "PasswordSicura123"
}
```

Risposta `201 Created`: oggetto `AuthResponse` con `accessToken`, `refreshToken`, `tokenType: "Bearer"`, `expiresInSeconds` e `user`. Il refresh token viene ruotato a ogni refresh. Email duplicata: `409 Conflict` con codice `EMAIL_ALREADY_EXISTS`.

#### `POST /api/v1/auth/login`

Request:

```json
{
  "email": "marco@example.com",
  "password": "PasswordSicura123"
}
```

Risposta `200 OK`: stesso schema di registrazione. Credenziali non valide: `401` con messaggio generico, senza rivelare se esiste l’email.

#### `POST /api/v1/auth/refresh`

Request:

```json
{ "refreshToken": "<refresh-token-corrente>" }
```

Ruotare/revocare il refresh token corrente e rispondere `200 OK` con `{ "accessToken": "...", "refreshToken": "...", "tokenType": "Bearer", "expiresInSeconds": 900 }`. Questa risposta non include `user`; il frontend aggiorna solo i token e ritenta una volta la richiesta che ha ricevuto `401`.

#### `POST /api/v1/auth/logout`

JWT richiesto. Request:

```json
{ "refreshToken": "<refresh-token-corrente>" }
```

Revoca il refresh token indicato e la sessione associata; risposta `204 No Content`. L’endpoint deve essere idempotente. Il frontend invia il refresh token nel body e cancella sempre i token locali dopo il tentativo di logout.

#### `GET /api/v1/users/me`

JWT richiesto. Risposta:

```json
{
  "id": "UUID",
  "name": "Marco Rossi",
  "email": "marco@example.com",
  "createdAt": "2026-10-20T14:30:00Z"
}
```

#### `PATCH /api/v1/users/me`

JWT richiesto. Permette la modifica simulata/effettiva di `name` e `email`; non accettare `id`, `passwordHash` o `ownerId`. Se si consente il cambio password, creare un endpoint separato che richieda la password attuale.

### Dashboard Home

#### `GET /api/v1/dashboard`

JWT richiesto. Ritorna dati derivati dalle risorse dell’utente, senza duplicare valori inseriti manualmente:

```json
{
  "vehicleCount": 2,
  "maintenanceCount": 8,
  "totalSpent": 1249.50,
  "vehicles": [
    {
      "id": "UUID",
      "icon": "carFront",
      "brand": "BMW",
      "model": "Serie 1",
      "year": 2021,
      "plate": "AB123CD",
      "mileage": 68420,
      "lastMaintenance": {
        "id": "UUID",
        "type": "OIL_CHANGE",
        "typeLabel": "Cambio olio",
        "date": "2026-05-18",
        "mileage": 67200,
        "cost": 89.00
      }
    }
  ],
  "recentMaintenances": []
}
```

Veicoli ordinati per `updatedAt desc`; manutenzioni recenti per `date desc`, poi `createdAt desc`. Se non ci sono interventi, `lastMaintenance` e `recentMaintenances` sono `null`/array vuoto. Nessun campo relativo a scadenze o manutenzioni future.

### Veicoli

#### `GET /api/v1/vehicles`

JWT richiesto. Restituisce i veicoli del proprietario autenticato, con `lastMaintenance` sintetica inclusa per evitare richieste una per card.

#### `POST /api/v1/vehicles`

JWT richiesto. Request:

```json
{
  "icon": "motorbike",
  "brand": "Honda",
  "model": "CB500F",
  "year": 2022,
  "plate": "AB123CD",
  "mileage": 18400
}
```

Risposta `201 Created`: VehicleResponse con `id`, tutti i campi, timestamp e `lastMaintenance: null`.

#### `GET /api/v1/vehicles/{vehicleId}`

JWT richiesto. Restituisce un veicolo posseduto dall’utente, più `lastMaintenance` e `maintenanceCount`. Per ID inesistente o appartenente ad altro utente rispondere `404`, non rivelare l’esistenza della risorsa.

#### `PATCH /api/v1/vehicles/{vehicleId}`

JWT richiesto. Consente aggiornamento parziale di `icon`, `brand`, `model`, `year`, `plate`, `mileage`. Non accettare campi di ownership o ID. La modifica esplicita del chilometraggio deve validare `>= 0`.

#### `DELETE /api/v1/vehicles/{vehicleId}`

JWT richiesto. Risposta `204`. Per l’MVP cancellare in modo transazionale veicolo e interventi associati, coerentemente con il comportamento frontend. Non cancellare dati di un altro utente.

### Manutenzioni svolte

#### `GET /api/v1/vehicles/{vehicleId}/maintenances`

JWT richiesto. Storico del veicolo con paginazione, ordinamento predefinito `date desc`.

#### `POST /api/v1/vehicles/{vehicleId}/maintenances`

JWT richiesto. Request esempio:

```json
{
  "type": "OIL_CHANGE",
  "date": "2026-10-20",
  "mileage": 68420,
  "cost": 89.90,
  "notes": "Olio e filtro sostituiti",
  "customDescription": null
}
```

Per tipo personalizzato:

```json
{
  "type": "OTHER",
  "customDescription": "Sostituzione lampadina anteriore",
  "date": "2026-10-20",
  "mileage": 68420,
  "cost": 14.50,
  "notes": null
}
```

Risposta `201 Created`: MaintenanceResponse completa. Creazione e aggiornamento del chilometraggio del veicolo devono avvenire nella stessa transazione. Se `mileage` dell’intervento e maggiore del chilometraggio corrente, impostare il chilometraggio veicolo al valore dell’intervento; se e minore, non diminuirlo.

#### `GET /api/v1/maintenances/{maintenanceId}`

JWT richiesto. Restituisce il dettaglio dell’intervento e un riepilogo veicolo minimo: `vehicleId`, `brand`, `model`, `plate`, `icon`.

#### `GET /api/v1/maintenances?vehicleId={uuid}&page=0&size=20&sort=date,desc`

JWT richiesto. Lista generale filtrabile per veicolo, tipo e intervallo date (`from`, `to`). Tutti i filtri devono essere applicati dentro il perimetro dell’utente autenticato.

#### `PATCH /api/v1/maintenances/{maintenanceId}`

JWT richiesto. Consente modifica di `type`, `customDescription`, `date`, `mileage`, `cost`, `notes`. Non consentire lo spostamento dell’intervento su un altro veicolo tramite patch. Se il nuovo chilometraggio supera quello corrente, aggiornare il veicolo; non diminuirlo in caso di intervento storico.

#### `DELETE /api/v1/maintenances/{maintenanceId}`

JWT richiesto. Risposta `204`. L’eliminazione aggiorna automaticamente tutti i riepiloghi di costo. Non diminuire automaticamente il chilometraggio del veicolo: il chilometraggio corrente rappresenta l’ultimo valore noto, anche se si elimina una registrazione storica.

### Costi

#### `GET /api/v1/costs/summary?year=2026`

JWT richiesto. Tutti i valori devono essere aggregati dalle manutenzioni dell’utente, mai salvati come totali indipendenti:

```json
{
  "currency": "EUR",
  "totalSpent": 1249.50,
  "year": 2026,
  "yearSpent": 239.90,
  "byType": [
    {
      "type": "OIL_CHANGE",
      "typeLabel": "Cambio olio",
      "count": 3,
      "total": 267.00
    }
  ],
  "recentMaintenances": []
}
```

Includere fino a sei manutenzioni recenti per la schermata Costi. Se `year` non e presente, usare l’anno corrente del server in UTC oppure documentare e testare esplicitamente il criterio adottato.

## 6. DTO risposta

`VehicleResponse` deve includere almeno:

```text
id, icon, brand, model, year, plate, mileage, createdAt, updatedAt, lastMaintenance
```

`MaintenanceResponse` deve includere almeno:

```text
id, vehicleId, type, typeLabel, customDescription, date, mileage, cost, notes, createdAt, updatedAt
```

Non esporre entity JPA direttamente. `typeLabel` e calcolata dal backend e non e una sorgente dati canonica. Serializzare importi come numeri JSON con due cifre decimali quando possibile.

## 7. Sicurezza

- Tutti gli endpoint tranne register, login e refresh richiedono `Authorization: Bearer <accessToken>`.
- JWT con `sub = userId UUID`, `iss`, `iat`, `exp` e chiave proveniente da variabile ambiente/secret manager; mai hardcoded o committata.
- Access token breve, per esempio 15 minuti. Refresh token a durata maggiore, rotazione e revoca documentate.
- Validare ownership in ogni service prima di leggere/modificare/cancellare veicolo o manutenzione.
- Impedire IDOR: non fidarsi di `ownerId` nel body o query string; ricavare l’utente solo dal JWT.
- Configurare CORS per origini frontend in development e production tramite proprietà d’ambiente; non usare `*` con credenziali.
- Aggiungere rate limiting o protezioni equivalenti a login/registrazione e loggare tentativi senza registrare password o token.
- HTTPS in deployment; il backend non deve restituire segreti o stack trace al client.

## 8. Errori API

Usare RFC 7807 / `ProblemDetail` con un formato stabile, esteso con codice applicativo e dettagli dei campi:

```json
{
  "type": "about:blank",
  "title": "Validation failed",
  "status": 400,
  "detail": "Uno o più campi non sono validi.",
  "code": "VALIDATION_ERROR",
  "instance": "/api/v1/vehicles",
  "fieldErrors": [
    { "field": "mileage", "code": "Min", "message": "Il chilometraggio deve essere maggiore o uguale a zero." }
  ],
  "traceId": "..."
}
```

Codici minimi da documentare: `VALIDATION_ERROR`, `UNAUTHORIZED`, `EMAIL_ALREADY_EXISTS`, `RESOURCE_NOT_FOUND`, `PLATE_ALREADY_EXISTS`, `INVALID_MAINTENANCE_TYPE`, `INVALID_DATE`, `INTERNAL_ERROR`. Non restituire mai `500` per normali errori di validazione o risorse non possedute.

## 9. PostgreSQL, Neon e configurazione

- Aggiungere migrazioni Flyway versionate per schema e indici.
- Indici almeno su `users(lower(email))` (o colonna email normalizzata), `vehicles(owner_id)`, `vehicles(owner_id, normalized_plate)`, `maintenance_records(owner_id, vehicle_id, date desc)` e `maintenance_records(owner_id, date desc)`.
- Usare foreign key, `NOT NULL`, vincoli univoci e check constraint coerenti con le validazioni applicative.
- Configurare Neon tramite environment variables, mai mettere credenziali nel repository. Separare configurazione locale e produzione.
- Documentare SSL richiesto, pool connessioni, URL JDBC e come configurare `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`.
- Non eseguire `ddl-auto=update` in produzione; usare Flyway e `ddl-auto=validate`.
- Non aggiungere seed demo all’avvio di produzione. Se utile, creare un profilo `dev` o fixture di test separate.

## 10. Qualità, test e consegna

Consegnare un progetto completo che includa:

- `pom.xml`, configurazioni `application.yml` e profili;
- package structure documentata;
- entity, repository, DTO, mapper, service, controller e security;
- migrazioni Flyway;
- validazione e gestione centralizzata degli errori;
- documentazione OpenAPI accessibile in development;
- README con prerequisiti, variabili ambiente, avvio locale, database Neon, test e URL Swagger;
- `.env.example` senza segreti;
- test unitari per validazioni e regole di chilometraggio/costi;
- test d’integrazione per registrazione/login, ownership, CRUD, aggregati, paginazione e migrazioni.

Casi obbligatori da testare:

1. un utente non può leggere o modificare veicoli/manutenzioni di un altro;
2. registrazione con email duplicata fallisce in modo prevedibile;
3. manutenzione nuova con km superiore aggiorna il veicolo;
4. manutenzione storica con km inferiore non riduce il km corrente;
5. modifica o cancellazione manutenzione non riduce il km corrente;
6. costo totale e aggregazioni per anno/tipo sono calcolati dai record;
7. `OTHER` senza descrizione non e accettato;
8. date impossibili e valori negativi non sono accettati;
9. la cancellazione di un veicolo elimina i suoi interventi in modo transazionale;
10. sort, filtri e paginazione non consentono accesso cross-user.

Fornire esempi `curl` completi per registrazione, login, creazione veicolo, creazione manutenzione, modifica, riepilogo costi e logout. Al termine eseguire i test e riportare l’esito reale: non dichiarare completato un test che non e stato eseguito.

## 11. Vincoli espliciti

- Non implementare manutenzioni future, promemoria, scadenze, stato normale/in scadenza/scaduto, regole ricorrenti, notifiche o documenti.
- Non collegare React Native direttamente a PostgreSQL.
- Non inserire credenziali nel frontend o nel repository.
- Non fidarsi di ID proprietario inviati dal client.
- Non memorizzare totali costi che possano divergere dai record sorgente.
- Evitare architetture distribuite, microservizi, code o complessita non necessarie: un backend modulare monolitico e sufficiente per l’MVP.
- Se una scelta non e specificata, preferire la soluzione piu semplice, sicura e compatibile con gli endpoint sopra; documentare la decisione.
