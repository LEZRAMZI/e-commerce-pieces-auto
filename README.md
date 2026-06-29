# E-Commerce Pièces Automobiles

Application e-commerce full-stack pour la vente de pièces automobiles.
- **Frontend** : React 19 + Vite + TailwindCSS
- **Backend** : Node.js + Express + TypeScript
- **Base de données** : MariaDB / MySQL

---

## Prérequis

- [Node.js](https://nodejs.org/) v18+
- [MariaDB](https://mariadb.org/) ou MySQL 8+ (serveur local ou distant)

---

## Installation

### 1. Cloner et installer les dépendances

```bash
npm install
```

### 2. Configurer les variables d'environnement

Copier `.env.example` en `.env.local` et renseigner les valeurs :

```bash
cp .env.example .env.local
```

Éditer `.env.local` :

```env
# Clé API Gemini (obligatoire si l'IA est utilisée)
GEMINI_API_KEY="votre-clé-gemini"

# URL publique de l'application (utilisée en production)
APP_URL="https://votre-domaine.com"

# Sécurité — utiliser des valeurs fortes en production !
JWT_SECRET="générer-avec-openssl-rand-hex-32"
ADMIN_EMAIL="admin@votre-domaine.com"
ADMIN_PASSWORD="mot-de-passe-fort"

# (Optionnel) Hash bcrypt du mot de passe admin pour la production
# Générer avec : node -e "require('bcrypt').hash('votre-mdp', 12).then(console.log)"
# ADMIN_PASSWORD_HASH="$2b$12$..."

# Base de données
DB_HOST="localhost"
DB_USER="votre-utilisateur-db"
DB_PASSWORD="votre-mot-de-passe-db"
DB_NAME="auto_parts_db"
```

### 3. Initialiser la base de données

```bash
mysql -u root -p < backend/init.sql
```

---

## Lancement en développement

```bash
npm run dev
```

Le serveur démarre sur [http://localhost:3000](http://localhost:3000).

---

## Déploiement en production

### 1. Générer un JWT_SECRET fort

```bash
openssl rand -hex 32
```

### 2. (Recommandé) Générer un hash bcrypt du mot de passe admin

```bash
node -e "require('bcrypt').hash('votre-mot-de-passe', 12).then(console.log)"
```

Placer le résultat dans `ADMIN_PASSWORD_HASH` (variable d'environnement du serveur).

### 3. Builder l'application

```bash
npm run build
```

### 4. Démarrer le serveur

```bash
NODE_ENV=production npm start
```

### Variables d'environnement obligatoires en production

| Variable | Description |
|---|---|
| `JWT_SECRET` | Secret JWT fort (32+ caractères) |
| `ADMIN_EMAIL` | Email de l'administrateur |
| `ADMIN_PASSWORD` ou `ADMIN_PASSWORD_HASH` | Mot de passe ou hash bcrypt |
| `DB_HOST` | Hôte de la base de données |
| `DB_USER` | Utilisateur de la base de données |
| `DB_PASSWORD` | Mot de passe de la base de données |
| `DB_NAME` | Nom de la base de données |

> ⚠️ Le serveur refusera de démarrer en production si `JWT_SECRET` ou `ADMIN_PASSWORD` sont faibles ou non définis.

---

## Endpoints API principaux

| Méthode | Endpoint | Accès |
|---|---|---|
| GET | `/api/health` | Public |
| POST | `/api/auth/login` | Public (rate limited) |
| GET | `/api/products` | Public |
| POST | `/api/products` | Admin |
| GET | `/api/orders` | Admin |
| POST | `/api/orders` | Public |
| GET | `/api/admin/stats` | Admin |

### Pagination (optionnelle)

Les endpoints `/api/products` et `/api/orders` supportent la pagination :

```
GET /api/products?page=1&limit=20
GET /api/orders?page=1&limit=50
```
