# sqlpp-model-generator

Features:

- [x] Common sqlpp types support
- [x] Auto increment columns support
- [x] Nullable fields support

Requirements:

- NodeJS 18+;
- Linux/Windows/Mac;
- Yarn or NPM.

### Usage

1. Clone repository

```bash
git clone https://github.com/mayerdev/sqlpp-model-generator
```

2. Create `config.json` and fill them:

```json
{
    "host": "<HOST or IP>",
    "user": "<USER>",
    "password": "<PASSWORD>",
    "database": "<DATABASE NAME>"
}
```

3. Install packages

```bash
npm install
```

or

```bash
yarn
```

4. Generate model from table.

**Method 1:**

```bash
node generator.js <table> > out.hpp
```

**Method 2:**

```bash
node generator.js <table> out.hpp
```