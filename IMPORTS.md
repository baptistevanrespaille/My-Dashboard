# MyDashboard — Guide d'import CSV

## Import Yazio (Calories)

### 1. Exporter depuis Yazio
1. Ouvre l'app **Yazio** sur ton iPhone
2. Profil → Paramètres → **Exporter les données**
3. Sélectionne la période souhaitée
4. Choisis le format **CSV**
5. Envoie le fichier sur ton Mac (AirDrop ou iCloud)

### 2. Format CSV attendu
```csv
Date,Calories,Protéines,Glucides,Lipides
15/01/2024,2150,155.5,235.0,72.3
16/01/2024,1980,142.0,210.5,68.1
```

Colonnes reconnues (insensible à la casse, FR et EN) :
- **Date** : `Date` → formats supportés `DD/MM/YYYY`, `DD-MM-YYYY`, `YYYY-MM-DD`
- **Calories** : `Calories`, `Kcal`
- **Protéines** : `Protéines`, `Protein`, `Prot`
- **Glucides** : `Glucides`, `Carbs`, `Glucid`
- **Lipides** : `Lipides`, `Fat`, `Gras`

Séparateur : `,` ou `;` (détecté automatiquement)

### 3. Importer dans MyDashboard
1. Va sur **Santé → onglet Calories**
2. Clique sur **"Importer Yazio"** (en haut à droite du formulaire)
3. Sélectionne le fichier CSV exporté
4. Un toast confirme le nombre de lignes importées

> Les entrées existantes pour les mêmes dates sont écrasées (upsert).

---

## Import relevé BNP (Finance)

### 1. Exporter depuis BNP Paribas
1. Connecte-toi sur **mabanque.bnpparibas.net**
2. Compte → **Télécharger mes relevés** ou **Exporter mes opérations**
3. Sélectionne la période (jusqu'à 1 an)
4. Format : **CSV** (séparateur point-virgule)

### 2. Format CSV attendu
```csv
Date;Libellé;Débit;Crédit;Solde
15/01/2024;VIREMENT SALAIRE;;2850,00;8234,50
16/01/2024;LOYER;-1100,00;;7134,50
```

Colonnes reconnues :
- **Date** : `Date` → formats `DD/MM/YYYY`, `DD-MM-YYYY`
- **Solde** : `Solde`, `Balance`, `Sold` — **obligatoire** pour créer les snapshots
- **Libellé** : ignoré (utilisé uniquement pour le débogage)
- **Débit / Crédit** : ignorés (le solde suffit)

> ⚠️ Si ton export BNP ne contient pas de colonne "Solde", l'import échouera.
> Dans ce cas, utilise plutôt le formulaire manuel "Mise à jour du jour".

### 3. Importer dans MyDashboard
1. Va sur **Finance**
2. Clique sur **"Relevé BNP"** (à côté du formulaire Mise à jour)
3. Sélectionne le fichier CSV exporté
4. Le solde bancaire de chaque date est créé/mis à jour dans les snapshots

> Un snapshot par date est créé. Si un snapshot existe déjà pour cette date,
> seul le `bankBalance` est mis à jour (totalInvested et totalValue inchangés).

---

## Notes générales

- Tous les imports sont idempotents : relancer deux fois le même fichier ne crée pas de doublons
- Les montants avec virgule décimale sont supportés (format français)
- En cas d'erreur, un message précis est affiché dans le toast
