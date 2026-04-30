# Runbook Pipeline GitLab - c0-lab0-nextjs

## 1) Objectif
Ce document explique toute la pipeline GitLab CI/CD du front `c0-lab0-nextjs`:
- quand elle se lance,
- ce que fait chaque etape,
- quelles variables GitLab CI/CD doivent etre configurees,
- comment verifier et depanner un deploiement.

Fichiers source de reference:
- `workflow/.gitlab-ci.yml`
- `workflow/ci/install.yml`
- `workflow/ci/lint.yml`
- `workflow/ci/test.yml`
- `workflow/cd/build.yml`
- `workflow/cd/deploy.yml`
- `workflow/cd/health.yml`
- `workflow/cd/notify.yml`

---

## 2) Vue d'ensemble de la pipeline
### Stages executes (ordre)
1. `install`
2. `lint`
3. `test`
4. `build`
5. `deploy`
6. `notify`

### Regles de declenchement (`workflow.rules`)
#### Cas A - Push sur branche `next`
- Condition: `CI_PIPELINE_SOURCE == push` et `CI_COMMIT_BRANCH == next`
- Variables injectees:
  - `TARGET_ENV=dev`
  - `ENABLE_NOTIFY=false`
- Effet attendu: pipeline DEV avec deploiement DEV et healthcheck.

#### Cas B - Push sur branche `main` (apres merge)
- Condition: `CI_PIPELINE_SOURCE == push` et `CI_COMMIT_BRANCH == main`
- Variables injectees:
  - `TARGET_ENV=prod`
  - `ENABLE_NOTIFY=true`
- Effet attendu: pipeline PROD avec build, deploiement PROD, healthcheck et notification.

#### Cas C - Tout le reste
- `when: never` -> aucune pipeline.

---

## 3) Detail de chaque etape

## 3.1 Stage `install`
### Job `install`
- Fichier: `workflow/ci/install.yml`
- Actions:
  - `npm ci`
  - met en cache `node_modules/` (cache key basee sur `package-lock.json`, policy `push`)
  - publie un artifact `node_modules/` (expire dans 1h)
- Role: preparer un environnement deterministic pour les jobs suivants.

## 3.2 Stage `lint`
### Job `lint:eslint`
- Fichier: `workflow/ci/lint.yml`
- Dependance: `needs: ["install"]`
- Action: `npm run lint`
- Cache: recupere le cache `node_modules/` (`policy: pull`)
- Role: verifier la qualite statique du code.

## 3.3 Stage `test`
### Job `test:unit`
- Fichier: `workflow/ci/test.yml`
- Dependance: `needs: ["install"]`
- Action actuelle: `echo "No tests configured yet"`
- `allow_failure: true`
- Role: placeholder pour tests unitaires a venir.

### Job `test:security:audit`
- Fichier: `workflow/ci/test.yml`
- Dependance: `needs: ["install"]`
- Actions:
  - `npm audit --json > npm-audit-report.json || true`
  - `npm audit --audit-level=critical`
- Artifact: `npm-audit-report.json` (toujours publie, expire en 1 semaine)
- Role: bloquer en cas de vulnerabilite critique npm.

### Security templates GitLab inclus
- `Security/Secret-Detection.gitlab-ci.yml`
- `Security/Dependency-Scanning.gitlab-ci.yml`
- Role: scans de secrets et dependances via templates officiels GitLab.

## 3.4 Stage `build`
### Job `build:docker`
- Fichier: `workflow/cd/build.yml`
- Runtime: `docker:24.0.5` + service `docker:24.0.5-dind`
- Actions:
  1. login registre GitLab (`CI_REGISTRY_*`)
  2. build image avec tag `$CI_COMMIT_REF_SLUG`
  3. push image vers `$CI_REGISTRY_IMAGE:$CI_COMMIT_REF_SLUG`
- Rule: execute si `TARGET_ENV == dev` ou `TARGET_ENV == prod`
- Role: produire et publier l'image de l'application.

## 3.5 Stage `deploy`
### Template `.deploy_template`
- Fichier: `workflow/cd/deploy.yml`
- Prepare SSH (`openssh-client`, `ssh-agent`, `SSH_PRIVATE_KEY`)
- Ouvre une session SSH sur le VPS puis execute:
  1. login docker registry
  2. pull image
  3. stop/rm ancien conteneur
  4. run nouveau conteneur (`-p ${PORT}:3000`, `-e DATABASE_URL=...`)

### Job `deploy_dev`
- Environment GitLab: `dev`
- Rule: `TARGET_ENV == dev`

### Job `deploy_prod`
- Environment GitLab: `prod`
- Rule: `TARGET_ENV == prod && CI_PIPELINE_SOURCE == push`

## 3.6 Stage `deploy` (healthcheck)
### Job `healthcheck`
- Fichier: `workflow/cd/health.yml`
- Dependances optionnelles: `deploy_dev`, `deploy_prod`
- Action: tente 10 fois `curl http://$VPS_IP:$PORT/health` (5s d'intervalle)
- Reussite: HTTP 2xx -> `Application en ligne`
- Echec: timeout -> job failed

## 3.7 Stage `notify`
### Job `notify:success`
- Fichier: `workflow/cd/notify.yml`
- Rule: execute uniquement si `ENABLE_NOTIFY == true`
- Action: POST webhook Discord (`DISCORD_WEBHOOK_URL`) avec infos projet/branche/auteur.

---

## 4) Variables GitLab CI/CD a configurer

## 4.1 Variables obligatoires (a creer dans GitLab)
Configurer dans **GitLab > Project > Settings > CI/CD > Variables**.

| Variable | Obligatoire | Exemple | Usage pipeline | Scope recommande | Masked | Protected |
|---|---|---|---|---|---|---|
| `SSH_PRIVATE_KEY` | Oui | cle privee OpenSSH | Auth SSH vers VPS dans `deploy.yml` | `*` ou scope env (`dev`/`prod`) | Oui | Oui (prod) |
| `VPS_USER` | Oui | `deploy` | User SSH du serveur distant | par environnement | Non | Oui (prod) |
| `VPS_IP` | Oui | `203.0.113.10` | Host cible deploy + healthcheck | par environnement | Non | Oui (prod) |
| `CONTAINER_NAME` | Oui | `c0-front-dev` | Nom du conteneur a restart | par environnement | Non | Non/Oui selon politique |
| `PORT` | Oui | `3000` (dev), `3001` (prod) | Mapping `-p ${PORT}:3000` + healthcheck | par environnement | Non | Non/Oui selon politique |
| `DATABASE_URL` | Oui (si utilise par app) | `postgresql://...` | Injectee dans le conteneur | par environnement | Oui | Oui |
| `DISCORD_WEBHOOK_URL` | Oui si notifications activees | URL webhook Discord | Job `notify:success` | `*` ou prod | Oui | Oui |

## 4.2 Variables GitLab fournies automatiquement (ne pas creer manuellement)
- `CI_REGISTRY`
- `CI_REGISTRY_USER`
- `CI_REGISTRY_PASSWORD`
- `CI_REGISTRY_IMAGE`
- `CI_COMMIT_REF_SLUG`
- `CI_PIPELINE_SOURCE`
- `CI_COMMIT_BRANCH`
- `CI_PROJECT_NAME`
- `GITLAB_USER_NAME`

Elles sont utilisees dans les jobs `build:docker`, `deploy_*`, `notify:success`.

## 4.3 Variables controlees par le workflow (ne pas definir dans UI sauf cas special)
- `TARGET_ENV`
- `ENABLE_NOTIFY`

Ces variables sont injectees dynamiquement par `workflow.rules` dans `workflow/.gitlab-ci.yml`.

---

## 5) Comportement par type de pipeline

| Evenement | Variables injectees | Jobs principaux attendus |
|---|---|---|
| Push sur `next` | `TARGET_ENV=dev`, `ENABLE_NOTIFY=false` | install -> lint -> test -> build:docker -> deploy_dev -> healthcheck |
| Push sur `main` (post-merge) | `TARGET_ENV=prod`, `ENABLE_NOTIFY=true` | install -> lint -> test -> build:docker -> deploy_prod -> healthcheck -> notify:success |

Note:
- Le deploiement PROD est execute sur `push` vers `main`.
- Si votre equipe interdit les pushes directs sur `main`, ce `push` correspond concretement a un merge valide.

---

## 6) Procedure de verification apres deploiement
1. Ouvrir la pipeline GitLab et verifier les jobs `build:docker`, `deploy_*`, `healthcheck`.
2. Verifier endpoint health:
   - `http://<VPS_IP>:<PORT>/health`
   - reponse attendue: `OK` (HTTP 200)
3. Verifier conteneur sur VPS:
   - `docker ps`
   - `docker logs <CONTAINER_NAME> --tail 100`
4. Verifier que l'image correspond au commit (`$CI_COMMIT_REF_SLUG`) dans le Container Registry GitLab.

---

## 7) Checklist de mise en place GitLab
- [ ] Runner GitLab disponible avec support Docker-in-Docker pour `build:docker`.
- [ ] Container Registry GitLab active sur le projet.
- [ ] Toutes les variables de section 4.1 creees.
- [ ] Variables sensibles marquees `Masked` + `Protected` en production.
- [ ] Environnements GitLab `dev` et `prod` visibles dans **Operate > Environments** apres premier deploy.
- [ ] Port cible ouvert sur le VPS (firewall/security group).
- [ ] Docker installe sur le VPS et user `VPS_USER` autorise a executer docker.

---

## 8) Depannage rapide
- Echec `docker login` en build/deploy:
  - verifier accès Container Registry et credentials GitLab (`CI_REGISTRY_*`).
- Echec SSH:
  - verifier format de `SSH_PRIVATE_KEY`, droits du user, reachability reseau vers `VPS_IP`.
- Echec healthcheck:
  - verifier mapping `PORT`, etat du conteneur (`docker ps`), logs applicatifs.
- Job `notify:success` en echec:
  - verifier `DISCORD_WEBHOOK_URL` (URL valide, secret non expire).

---

## 9) Evolution recommandee (prod)
Pour renforcer la securite et la maitrise des releases PROD:
- proteger la branche `main` pour imposer merge request + approvals,
- rendre `deploy_prod` manuel (`when: manual`) si vous voulez un gate operateur,
- separer les variables `dev` et `prod` via environment scope strict,
- ajouter un rollback explicite (job qui redeploie le tag precedent stable).
