# CampusHere

CampusHere is a Vite React campus notes app with a separate Node.js/Express API for note uploads. Uploaded files are stored in Firebase Cloud Storage and note metadata is stored in Firestore.

## Project Structure

- `src/` contains the existing React/TypeScript frontend.
- `server/` contains the Express API, Firebase Admin setup, routes, controllers, middleware, and storage/database services.
- `public/favicon.svg` is used by `index.html`.
- `.env.example` documents the backend configuration.
