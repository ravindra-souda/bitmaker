# bitmaker

_my simple music api_

## Stack

Les projets open source suivants donnent vie à bitmaker:

- [node.js]
- [express]
- [mongoDB]
- [jest]

#### Modules node

- [mongoose] - ODM pour mongoDB
- [supertest] - librairie d'assertions HTTP
- [husky] - gestion des hooks git
- [dotenv] - variables d'environnement
- [eslint] - analyse de code
- [prettier] - formattage de code

## Documentation OpenAPI

https://app.swaggerhub.com/apis-docs/bitmaker/bitmaker-my_simple_music_api/1.0.0

## Installation

```sh
npm i
```

## Scripts

#### Serveur de dev

Lance l'application avec nodemon

```sh
npm run dev
```

#### Tests

```sh
npm test
```

#### Lint

Execute eslint et prettier

```sh
npm run lint
```

#### Hooks git

Le hook pre-commit est configuré pour lancer les tests et linter le code (si l'un des tests ne passe pas ou si le linter retourne une erreur, le commit ne sera pas validé). Pour lancer manuellement ce script du hook :

```sh
npm run husky
```

Pour bypasser le hook :

```sh
git commit -m 'message' --no-verify
```

[node.js]: https://nodejs.org/en/
[express]: http://expressjs.com/
[mongodb]: https://www.mongodb.com/
[jest]: https://jestjs.io/
[mongoose]: https://mongoosejs.com/
[supertest]: https://www.npmjs.com/package/supertest
[husky]: https://typicode.github.io/husky
[dotenv]: https://www.npmjs.com/package/dotenv
[eslint]: https://eslint.org/
[prettier]: https://prettier.io/

_RAVINDRA Soudakar - 2021_
