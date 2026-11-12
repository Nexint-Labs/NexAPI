# NexAPI

**Nexint API — Licensed under Nexint TOS**

Backend API that Prism, MikuBot, and OpenBot rely on.

> **⚠️ Work in Progress**
>
> NexAPI is primarily developed for Nexint's own projects. It is not designed to be plug-and-play, and some features may require additional configuration.

## Requirements

- Node.js
- npm
- A `.env` file
- SQLite databases (created or initialized by the relevant modules)
- Redis / Upstash (for features that require it)

## Installation

**1. Clone the repository**

```bash
git clone <repository-url>
cd <repository-folder>
```

**2. Install dependencies**

```bash
npm install
```

**3. Configure environment variables**

Create a `.env` file in the project root:

```env
SERVER_TOKEN=your_secure_random_token
REDIS_TOKEN=your_redis_token
```

`SERVER_TOKEN` is required. `REDIS_TOKEN` is needed for Redis-dependent functionality.

**4. Configure the server**

Edit `config.js` to configure the server port and other settings.

By default, NexAPI exposes its routes under:

```text
http://localhost:3000/api/v1
```

The actual port depends on your `PORT` configuration.

**5. Start NexAPI**

```bash
node index.js
```

The server will automatically load API routers from the `plugins` directory.

## Notes

- API endpoints generally require authentication using `SERVER_TOKEN`.
- Some features depend on external services or other Nexint projects.
- Database schemas and endpoints may change without notice.
- Production deployment is not officially supported.
- Documentation is incomplete. Good luck. 💀

## License

Licensed under **Nexint TOS**. Refer to the applicable license terms for usage and redistribution permissions.