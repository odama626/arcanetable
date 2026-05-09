# Arcanetable

A Magic: The Gathering playtesting simulator designed for the MTG community.

Check it out at https://arcanetable.app/

![splash image](./public/splash-logo.png)

## 🌟 Features

- 🃏 **3D Card Simulation**: Test your Magic: The Gathering decks in a fully interactive 3D environment.
- 🤝 **Local Multiplayer Playtesting**: Playtest with friends using local connections or peer-to-peer networking.
- 🔍 **Deck Management**: Import, export, and manage your decks seamlessly.
- 🔧 **Customizable Settings**: Tailor the app to fit your playstyle and preferences.

> Arcanetable is designed in a generic way that could support other trading card games, but is currently hardcoded to point at scryfall

## 🚀 Getting Started

### Prerequisites

- **Browser**: A modern browser (Chrome, Firefox, or Edge recommended).
- **Node.js**: Version 16+.
- **pnpm**: Installed globally for package management:
  ```bash
  npm install -g pnpm
  ```
- **Git**: Installed for version control.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/odama626/arcanetable.git
   cd arcanetable
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start the development server:
   ```bash
   pnpm dev
   ```

Visit `http://localhost:3000` to start playtesting!

### Deployment

1. Build the app:
   ```bash
   pnpm build
   ```
2. Serve the app (e.g., using Vercel, Netlify, or a Node.js server, or the supplied dockerfile).

## 🛠️ Contributing

Contributions are what make this project thrive! Here’s how you can help:

1. Fork the repository.
2. Create your feature branch:
   ```bash
   git checkout -b feature/YourFeatureName
   ```
3. Commit your changes:
   ```bash
   git commit -m "Add Your Feature"
   ```
4. Push to the branch:
   ```bash
   git push origin feature/YourFeatureName
   ```
5. Open a Pull Request.

## 💖 Support the Project

This app is free to use and relies on your generosity. You can support us by:

- [Donating on Patreon](https://patreon.com/arcanetable)
- Contributing to the codebase or documentation.

## 📝 License

This project is licensed under the **GNU Affero General Public License (AGPL)**. See [LICENSE](./LICENSE) for details.  
Contributors should ensure that all additions comply with AGPL requirements.

## 📫 Contact

For questions, suggestions, or just to say hi:

- ![bluesky logo](./public/Bluesky_Logox32.png) [@sparkstonepdx.com](https://bsky.app/profile/sparkstonepdx.com)
- Discord: Join our [Community Server](https://discord.gg/wzdj2W9vvf)

---

**Play. Contribute. Evolve.**  
Together, we can build the ultimate playtesting experience.
Here's the updated README with the card system documentation added:

````markdown
# Arcanetable

A Magic: The Gathering playtesting simulator designed for the MTG community.
Check it out at https://arcanetable.app/
![splash image](./public/splash-logo.png)

## 🌟 Features

- 🃏 **3D Card Simulation**: Test your Magic: The Gathering decks in a fully interactive 3D environment.
- 🤝 **Local Multiplayer Playtesting**: Playtest with friends using local connections or peer-to-peer networking.
- 🔍 **Deck Management**: Import, export, and manage your decks seamlessly.
- 🔧 **Customizable Settings**: Tailor the app to fit your playstyle and preferences.
- 🧩 **Custom Card Systems**: Bring your own card data source — perfect for proxies, custom cubes, or entirely different TCGs.

## 🚀 Getting Started

### Prerequisites

- **Browser**: A modern browser (Chrome, Firefox, or Edge recommended).
- **Node.js**: Version 16+.
- **pnpm**: Installed globally for package management:
  ```bash
  npm install -g pnpm
  ```
````

- **Git**: Installed for version control.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/odama626/arcanetable.git
   cd arcanetable
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start the development server:
   ```bash
   pnpm dev
   ```

Visit `http://localhost:3000` to start playtesting!

### Deployment

1. Build the app:
   ```bash
   pnpm build
   ```
2. Serve the app (e.g., using Vercel, Netlify, or a Node.js server, or the supplied dockerfile).

## 🧩 Custom Card Systems

Arcanetable supports custom card systems, so you can bring your own card data source. This is useful for:

- **Proxies** — point at your own server serving proxy card data
- **Custom cubes** — build and serve a curated card pool
- **Other TCGs** — use Arcanetable as a playtesting tool for entirely different card games

To use a custom card system, add a `system` query parameter to the URL pointing at a JSON endpoint that describes your card system:

```
https://arcanetable.app/?system=https://your-server.com/card-system.json
```

### Card System Schema

Your endpoint should return a JSON object with the following fields:

| Field                | Type     | Description                                                                                                             |
| -------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| `name`               | `string` | An identifier for your card system (e.g. `"mtg"`, `"my-cube"`)                                                          |
| `cardDetailEndpoint` | `string` | URL of an API endpoint that accepts `?exact=<card name>` and optionally `?set=<set code>` to return card detail objects |
| `cardBack`           | `string` | URL of the card back image to use                                                                                       |
| `popularity`         | `string` | The field name in your card detail response to use for sorting by popularity                                            |
| `searchField`        | `object` | Configuration for how cards are indexed for local search (see below)                                                    |

### Search Field Configuration

The `searchField` object controls how card data is indexed for searching within the app:

```json
{
  "filterEmpty": false,
  "searchFields": [
    { "field": "name" },
    { "field": "type_line" },
    { "field": "oracle_text" },
    { "field": "mana_cost", "transform": "stripBraces" },
    { "field": "card_faces", "recurse": true }
  ]
}
```

| Property                   | Type      | Description                                                                                                |
| -------------------------- | --------- | ---------------------------------------------------------------------------------------------------------- |
| `filterEmpty`              | `boolean` | Whether to omit empty/null fields from the search index                                                    |
| `searchFields`             | `array`   | List of fields to include in the search index                                                              |
| `searchFields[].field`     | `string`  | The field name from your card detail object                                                                |
| `searchFields[].transform` | `string`  | Optional transform to apply. Currently supported: `stripBraces` (removes `{` and `}` characters)           |
| `searchFields[].recurse`   | `boolean` | If the field is an array of objects (e.g. card faces), recurse into each item using the same search config |

### Card Detail Endpoint

Your `cardDetailEndpoint` will be called with:

- `?exact=<card name>` — the exact card name to look up
- `?set=<set code>` _(optional)_ — a set/edition filter; the app will retry without it if the card isn't found

The endpoint should return a JSON object representing the card. Any fields you configure in `searchField` and `popularity` should be present in this response.

### Example

```json
{
  "name": "my-cube",
  "cardDetailEndpoint": "https://my-server.com/api/cards/named",
  "cardBack": "https://my-server.com/card-back.webp",
  "popularity": "pick_rate",
  "searchField": {
    "filterEmpty": true,
    "searchFields": [{ "field": "name" }, { "field": "type" }, { "field": "text" }]
  }
}
```

> 💡 **Know a popular TCG that should have built-in support?** Open an issue or drop by the Discord and let us know!

## 🛠️ Contributing

Contributions are what make this project thrive! Here's how you can help:

1. Fork the repository.
2. Create your feature branch:
   ```bash
   git checkout -b feature/YourFeatureName
   ```
3. Commit your changes:
   ```bash
   git commit -m "Add Your Feature"
   ```
4. Push to the branch:
   ```bash
   git push origin feature/YourFeatureName
   ```
5. Open a Pull Request.

## 💖 Support the Project

This app is free to use and relies on your generosity. You can support us by:

- [Donating on Patreon](https://patreon.com/arcanetable)
- Contributing to the codebase or documentation.

## 📝 License

This project is licensed under the **GNU Affero General Public License (AGPL)**. See [LICENSE](./LICENSE) for details.  
Contributors should ensure that all additions comply with AGPL requirements.

## 📫 Contact

For questions, suggestions, or just to say hi:

- ![bluesky logo](./public/Bluesky_Logox32.png) [@sparkstonepdx.com](https://bsky.app/profile/sparkstonepdx.com)
- Discord: Join our [Community Server](https://discord.gg/wzdj2W9vvf)

---

**Play. Contribute. Evolve.**  
Together, we can build the ultimate playtesting experience.

````

Main changes:
- Added 🧩 custom card systems to the features list and removed the old note saying it was "hardcoded to Scryfall"
- Added a full **Custom Card Systems** section with schema reference, search config docs, and an example
- Kept everything else intactHere's the updated README with the card system documentation added:

```markdown
# Arcanetable
A Magic: The Gathering playtesting simulator designed for the MTG community.
Check it out at https://arcanetable.app/
![splash image](./public/splash-logo.png)

## 🌟 Features
- 🃏 **3D Card Simulation**: Test your Magic: The Gathering decks in a fully interactive 3D environment.
- 🤝 **Local Multiplayer Playtesting**: Playtest with friends using local connections or peer-to-peer networking.
- 🔍 **Deck Management**: Import, export, and manage your decks seamlessly.
- 🔧 **Customizable Settings**: Tailor the app to fit your playstyle and preferences.
- 🧩 **Custom Card Systems**: Bring your own card data source — perfect for proxies, custom cubes, or entirely different TCGs.

## 🚀 Getting Started

### Prerequisites
- **Browser**: A modern browser (Chrome, Firefox, or Edge recommended).
- **Node.js**: Version 16+.
- **pnpm**: Installed globally for package management:
  ```bash
  npm install -g pnpm
````

- **Git**: Installed for version control.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/odama626/arcanetable.git
   cd arcanetable
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start the development server:
   ```bash
   pnpm dev
   ```

Visit `http://localhost:3000` to start playtesting!

### Deployment

1. Build the app:
   ```bash
   pnpm build
   ```
2. Serve the app (e.g., using Vercel, Netlify, or a Node.js server, or the supplied dockerfile).

## 🧩 Custom Card Systems

Arcanetable supports custom card systems, so you can bring your own card data source. This is useful for:

- **Proxies** — point at your own server serving proxy card data
- **Custom cubes** — build and serve a curated card pool
- **Other TCGs** — use Arcanetable as a playtesting tool for entirely different card games

To use a custom card system, add a `system` query parameter to the URL pointing at a JSON endpoint that describes your card system:

```
https://arcanetable.app/?system=https://your-server.com/card-system.json
```

### Card System Schema

Your endpoint should return a JSON object with the following fields:

| Field                | Type     | Description                                                                                                                 |
| -------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| `name`               | `string` | An identifier for your card system (e.g. `"my-cube"`)                                                                       |
| `cardDetailEndpoint` | `string` | URL of an API endpoint that accepts `?exact=<card name>` and optionally `?set=<set code>` to return card detail objects     |
| `cardBack`           | `string` | URL of the card back image to use                                                                                           |
| `popularity`         | `string` | The field name in your card detail response to use for sorting by popularity                                                |
| `imageUriFormat`     | `string` | Either `"standard"` (default) or `"scryfall"` — controls how image URLs are structured in card detail responses (see below) |
| `searchField`        | `object` | Configuration for how cards are indexed for local search (see below)                                                        |

### Card Detail Endpoint

Your `cardDetailEndpoint` will be called with:

- `?exact=<card name>` — the exact card name to look up
- `?set=<set code>` _(optional)_ — a set/edition filter; the app will retry without it if the card isn't found

The response should be a JSON object with the following fields:

| Field                | Type     | Description                                                                       |
| -------------------- | -------- | --------------------------------------------------------------------------------- |
| `name`               | `string` | The card's display name                                                           |
| `type_line`          | `string` | The card's type (e.g. `"Creature — Human Wizard"`)                                |
| `image_uris`         | `object` | Image URLs for this card (see Image URIs below)                                   |
| `card_faces`         | `array`  | For double-faced cards, an array of face objects each with their own `image_uris` |
| `all_parts`          | `array`  | _(optional)_ Related cards or tokens associated with this card                    |
| `[popularity field]` | `number` | Whatever field you configured as `popularity` in your card system                 |

> `search` is generated internally by the app from your `searchField` config — you do not need to return it.

### Image URIs

The structure of `image_uris` depends on the `imageUriFormat` set in your card system config.

#### `standard` (default)

For card systems with multiple printings or variants per card. `image_uris` has two keys — `full` and `art` — each a map of arbitrary printing identifiers to URLs. Arcanetable will pick a printing at random for display.

| Key    | Usage                                        |
| ------ | -------------------------------------------- |
| `full` | Map of printing keys to full card image URLs |
| `art`  | Map of printing keys to art crop URLs        |

```json
{
  "image_uris": {
    "full": {
      "1": "https://my-server.com/images/my-card-1.jpg",
      "2": "https://my-server.com/images/my-card-2.jpg"
    },
    "art": {
      "1": "https://my-server.com/images/my-card-1-art.jpg",
      "2": "https://my-server.com/images/my-card-2-art.jpg"
    }
  }
}
```

Keys can be anything — they just need to match between `full` and `art` so the same printing is used for both.

#### `scryfall`

Mirrors the Scryfall API format, used automatically for the built-in MTG card system. Each card has a flat `image_uris` object with these keys:

| Key        | Usage                                                         |
| ---------- | ------------------------------------------------------------- |
| `large`    | The primary card image shown in the game                      |
| `art_crop` | A cropped art-only version, used for thumbnails and deck view |

```json
{
  "image_uris": {
    "large": "https://my-server.com/images/my-card.jpg",
    "art_crop": "https://my-server.com/images/my-card-art.jpg"
  }
}
```

### Double-Faced Cards

For double-faced cards, include a `card_faces` array with at least two entries. Each face should have its own `image_uris` following whichever format your card system uses. The app will use `card_faces[0]` for the front face and `card_faces[1]` for the back.

```json
{
  "name": "My Double-Faced Card",
  "card_faces": [
    {
      "name": "Front Face",
      "image_uris": {
        "full": { "1": "https://my-server.com/images/front-1.jpg" },
        "art": { "1": "https://my-server.com/images/front-1-art.jpg" }
      }
    },
    {
      "name": "Back Face",
      "image_uris": {
        "full": { "1": "https://my-server.com/images/back-1.jpg" },
        "art": { "1": "https://my-server.com/images/back-1-art.jpg" }
      }
    }
  ]
}
```

### Search Field Configuration

The `searchField` object controls how card data is indexed for searching within the app:

```json
{
  "filterEmpty": false,
  "searchFields": [
    { "field": "name" },
    { "field": "type_line" },
    { "field": "oracle_text" },
    { "field": "mana_cost", "transform": "stripBraces" },
    { "field": "card_faces", "recurse": true }
  ]
}
```

| Property                   | Type      | Description                                                                                                |
| -------------------------- | --------- | ---------------------------------------------------------------------------------------------------------- |
| `filterEmpty`              | `boolean` | Whether to omit empty/null fields from the search index                                                    |
| `searchFields`             | `array`   | List of fields to include in the search index                                                              |
| `searchFields[].field`     | `string`  | The field name from your card detail object                                                                |
| `searchFields[].transform` | `string`  | Optional transform to apply. Currently supported: `stripBraces` (removes `{` and `}` characters)           |
| `searchFields[].recurse`   | `boolean` | If the field is an array of objects (e.g. card faces), recurse into each item using the same search config |

### Example Card System

```json
{
  "name": "my-cube",
  "cardDetailEndpoint": "https://my-server.com/api/cards/named",
  "cardBack": "https://my-server.com/card-back.webp",
  "popularity": "pick_rate",
  "imageUriFormat": "standard",
  "searchField": {
    "filterEmpty": true,
    "searchFields": [{ "field": "name" }, { "field": "type" }, { "field": "text" }]
  }
}
```

> 💡 **Know a popular TCG that should have built-in support?** Open an issue or drop by the Discord and let us know!

## 🛠️ Contributing

Contributions are what make this project thrive! Here's how you can help:

1. Fork the repository.
2. Create your feature branch:
   ```bash
   git checkout -b feature/YourFeatureName
   ```
3. Commit your changes:
   ```bash
   git commit -m "Add Your Feature"
   ```
4. Push to the branch:
   ```bash
   git push origin feature/YourFeatureName
   ```
5. Open a Pull Request.

## 💖 Support the Project

This app is free to use and relies on your generosity. You can support us by:

- [Donating on Patreon](https://patreon.com/arcanetable)
- Contributing to the codebase or documentation.

## 📝 License

This project is licensed under the **GNU Affero General Public License (AGPL)**. See [LICENSE](./LICENSE) for details.  
Contributors should ensure that all additions comply with AGPL requirements.

## 📫 Contact

For questions, suggestions, or just to say hi:

- ![bluesky logo](./public/Bluesky_Logox32.png) [@sparkstonepdx.com](https://bsky.app/profile/sparkstonepdx.com)
- Discord: Join our [Community Server](https://discord.gg/wzdj2W9vvf)

---

**Play. Contribute. Evolve.**  
Together, we can build the ultimate playtesting experience.

```

Main changes:
- Added 🧩 custom card systems to the features list and removed the old note saying it was "hardcoded to Scryfall"
- Added a full **Custom Card Systems** section with schema reference, search config docs, and an example
- Kept everything else intact
```
