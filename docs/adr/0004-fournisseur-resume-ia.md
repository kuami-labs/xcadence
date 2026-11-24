# 0004. Fournisseur du résumé IA : API gratuite compatible OpenAI, puis Claude

- Statut : acceptée
- Date : 2026-11-24
- Décideurs : Kuami (mainteneur)

## Contexte

Le résumé hebdomadaire (F5) est rédigé par un modèle à partir des métriques de l'organisation. docs/02-STACK.md prévoit une interface `SummaryProvider` : Ollama en local, API Claude en option. Le projet n'a pas encore d'hébergement ni de budget pour un modèle payant.

## Options

1. **API Claude dès maintenant** : meilleure qualité en français, payante à l'usage.
2. **Ollama auto-hébergé** : gratuit à l'usage ; demande une machine plus puissante, qualité moindre avec un petit modèle.
3. **API gratuite compatible OpenAI** (Groq, OpenRouter, Gemini…) ou Ollama, par le même code : gratuit, rien à héberger ; quotas et conditions propres à chaque service.

## Décision

Option 3 pour l'instant, l'API Claude ensuite. Le fournisseur se choisit par configuration :

- `SUMMARY_PROVIDER=fake` : résumé fixe calculé à partir des faits (tests, CI, contributeurs) ;
- `SUMMARY_PROVIDER=openai` : toute API compatible OpenAI, avec `AI_BASE_URL`, `AI_MODEL` et `AI_API_KEY` (vide pour Ollama) ;
- `SUMMARY_PROVIDER=anthropic` : à ajouter quand l'API Claude sera retenue.

Quel que soit le fournisseur (docs/08-SECURITE.md) : le modèle ne reçoit que des **métriques agrégées** de l'organisation, dans un bloc présenté comme des données ; il n'a **aucun outil** ; sa réponse est **vérifiée** (5 lignes au plus, chaque ligne cite un chiffre, chaque chiffre existe dans les métriques). Après deux réponses refusées, ou si le fournisseur est indisponible, un **résumé de repli sans IA** est enregistré (modèle `repli`).

## Conséquences

- Positives : coût nul ; changer de fournisseur ne touche pas au code ; les tests n'appellent jamais de modèle.
- Négatives, à accepter : les services gratuits peuvent limiter le débit ou changer leurs conditions ; vérifier celles du service choisi, même si seules des métriques agrégées lui sont envoyées.
- À revoir : au passage à l'API Claude (fournisseur `anthropic`).
